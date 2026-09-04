import { Hono } from "hono"
import { sign } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { getJwtSecret, getUserFromContext } from "./middlewares"

/**
 * WebAuthn / Passkey 登录。
 *
 * 契约对齐 Go（go-webauthn）：
 *  - begin_login / finish_login（discoverable login 支持 username 可选）
 *  - begin_registration / finish_registration（需已登录）
 *  - delete_authn / getcredentials
 * session 数据 JSON 序列化 + base64 后经 `session` header 回传（无状态，Worker 友好）。
 *
 * 纯 Web Crypto 手写：CBOR 解码（attestationObject + COSE key）、ES256/RS256
 * 签名验证、rpIdHash 与 challenge 校验。无外部依赖。
 */

export const webauthnRouter = new Hono()

// ---------- base64url ----------
function b64urlEncode(buf: Uint8Array): string {
  let s = ""
  for (const b of buf) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function b64urlDecode(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/")
  const b64 = pad.padEnd(Math.ceil(pad.length / 4) * 4, "=")
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function b64Encode(buf: Uint8Array): string {
  let s = ""
  for (const b of buf) s += String.fromCharCode(b)
  return btoa(s)
}
function b64Decode(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ---------- CBOR 解码（最小实现，支持主要类型 0-6 与不定长数组/map）----------
interface CborReader {
  u8: Uint8Array
  i: number
}
function cborDecode(r: CborReader): any {
  const b = r.u8[r.i++]
  const major = b >> 5
  const minor = b & 0x1f
  let value = minor
  if (minor === 24) value = r.u8[r.i++]
  else if (minor === 25) {
    value = (r.u8[r.i] << 8) | r.u8[r.i + 1]
    r.i += 2
  } else if (minor === 26) {
    value = (r.u8[r.i] << 24) | (r.u8[r.i + 1] << 16) | (r.u8[r.i + 2] << 8) | r.u8[r.i + 3]
    r.i += 4
  } else if (minor === 27) {
    let v = 0n
    for (let k = 0; k < 8; k++) v = (v << 8n) | BigInt(r.u8[r.i++])
    value = Number(v)
  } else if (minor === 31) {
    // indefinite length
    if (major === 4) {
      const arr: any[] = []
      while (r.u8[r.i] !== 0xff) arr.push(cborDecode(r))
      r.i++ // skip break
      return arr
    } else if (major === 5) {
      const obj: Record<string, any> = {}
      while (r.u8[r.i] !== 0xff) {
        const k = cborDecode(r)
        const v = cborDecode(r)
        obj[String(k)] = v
      }
      r.i++ // skip break
      return obj
    }
  }
  switch (major) {
    case 0: return value // uint
    case 1: return -1 - value // nint
    case 2: { // bytes
      const out = r.u8.slice(r.i, r.i + value)
      r.i += value
      return out
    }
    case 3: { // string
      const out = new TextDecoder().decode(r.u8.slice(r.i, r.i + value))
      r.i += value
      return out
    }
    case 4: { // array
      const arr: any[] = []
      for (let k = 0; k < value; k++) arr.push(cborDecode(r))
      return arr
    }
    case 5: { // map
      const obj: Record<string, any> = {}
      for (let k = 0; k < value; k++) {
        const key = cborDecode(r)
        const val = cborDecode(r)
        obj[String(key)] = val
      }
      return obj
    }
    default:
      throw new Error(`unsupported CBOR major type ${major}`)
  }
}

// ---------- COSE key → CryptoKey ----------
async function coseToCryptoKey(cose: Record<string, any>): Promise<CryptoKey> {
  const kty = cose[1]
  const alg = cose[3]
  if (kty === 2) {
    // EC2
    const crv = cose[-1]
    const x = cose[-2] // Uint8Array
    const y = cose[-3]
    if (crv !== 1) throw new Error("unsupported EC curve (only P-256)")
    const jwk: JsonWebKey = {
      kty: "EC",
      crv: "P-256",
      x: b64urlEncode(new Uint8Array(x)),
      y: b64urlEncode(new Uint8Array(y)),
    }
    const name = alg === -7 ? "ECDSA" : "ECDSA"
    return await crypto.subtle.importKey("jwk", jwk, { name, namedCurve: "P-256" }, false, ["verify"])
  }
  if (kty === 3) {
    // RSA
    const n = cose[-1]
    const e = cose[-2]
    const jwk: JsonWebKey = {
      kty: "RSA",
      n: b64urlEncode(new Uint8Array(n)),
      e: b64urlEncode(new Uint8Array(e)),
    }
    const name = alg === -257 ? "RSASSA-PKCS1-v1_5" : "RSASSA-PKCS1-v1_5"
    return await crypto.subtle.importKey("jwk", jwk, { name, hash: "SHA-256" }, false, ["verify"])
  }
  throw new Error(`unsupported COSE kty ${kty}`)
}

/** 解析 attestationObject（CBOR），返回 { authData, publicKey, aaguid, credentialId } */
async function parseAttestation(attObj: Uint8Array): Promise<{
  authData: Uint8Array
  publicKey: CryptoKey
  aaguid: Uint8Array
  credentialId: Uint8Array
  signCount: number
  flags: number
}> {
  const reader: CborReader = { u8: attObj, i: 0 }
  const root = cborDecode(reader)
  const authData: Uint8Array = root.authData
  const attStmt = root.attStmt || {}

  const rpIdHash = authData.slice(0, 32)
  const flags = authData[32]
  const signCount = (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36]

  if (!(flags & 0x40)) throw new Error("attestedCredentialData not present")
  let offset = 37
  const aaguid = authData.slice(offset, offset + 16)
  offset += 16
  const credIdLen = (authData[offset] << 8) | authData[offset + 1]
  offset += 2
  const credentialId = authData.slice(offset, offset + credIdLen)
  offset += credIdLen

  // credentialPublicKey 是 CBOR COSE key，单独解码
  const keyReader: CborReader = { u8: authData.slice(offset), i: 0 }
  const cose = cborDecode(keyReader)
  const publicKey = await coseToCryptoKey(cose)

  return { authData, publicKey, aaguid, credentialId, signCount, flags }
}

// ---------- 设置 / 工具 ----------
function getBoolSetting(db: any, key: string): boolean {
  const item = (db.settings || []).find((s: any) => s.key === key)
  const v = item?.value
  return v === "true" || v === "1"
}
function getStrSetting(db: any, key: string, def = ""): string {
  const item = (db.settings || []).find((s: any) => s.key === key)
  return item?.value ? String(item.value) : def
}

function rpIdOf(c: any, db: any): string {
  const explicit = getStrSetting(db, "webauthn_rp_id")
  if (explicit) return explicit
  try {
    return new URL(c.req.url).hostname
  } catch {
    return "localhost"
  }
}

function newChallenge(): Uint8Array {
  const c = new Uint8Array(32)
  crypto.getRandomValues(c)
  return c
}

interface SessionData {
  challenge: string
  userId?: string
  username?: string
  allowedCredentials?: { id: string; type: string }[]
  userVerification: string
}

function sessionToB64(sd: SessionData): string {
  return b64Encode(new TextEncoder().encode(JSON.stringify(sd)))
}
function sessionFromB64(s: string): SessionData {
  return JSON.parse(new TextDecoder().decode(b64Decode(s)))
}

async function generateToken(user: any, c: any): Promise<string> {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    jti: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : b64urlEncode(newChallenge()),
  }
  const secret = await getJwtSecret(c)
  return await sign(payload, secret)
}

function getUserCredentials(user: any): any[] {
  return user.webauthn_credentials || []
}

// ---------- 端点 ----------

// POST /api/authn/webauthn_begin_login?username=xx
webauthnRouter.post("/webauthn_begin_login", async (c) => {
  const db = await getDb(c.env)
  if (!getBoolSetting(db, "webauthn_login_enabled")) {
    return c.json({ code: 403, message: "WebAuthn is not enabled", data: null }, 403)
  }
  const username = c.req.query("username") || ""
  const rpId = rpIdOf(c, db)
  const challenge = newChallenge()
  const sd: SessionData = { challenge: b64urlEncode(challenge), userVerification: "preferred" }

  let allowCredentials: { id: string; type: string }[] | undefined
  if (username) {
    const user = (db.users || []).find((u: any) => u.username === username)
    if (!user) {
      return c.json({ code: 400, message: "user not found", data: null }, 400)
    }
    sd.userId = String(user.id)
    sd.username = username
    allowCredentials = getUserCredentials(user).map((cred: any) => ({
      id: typeof cred.id === "string" ? cred.id : b64urlEncode(new Uint8Array(cred.id)),
      type: "public-key",
    }))
    sd.allowedCredentials = allowCredentials
  }

  const options: any = {
    challenge: sd.challenge,
    rpId,
    userVerification: sd.userVerification,
  }
  if (allowCredentials && allowCredentials.length > 0) {
    options.allowCredentials = allowCredentials
  }

  return c.json({
    code: 200,
    message: "success",
    data: { options, session: sessionToB64(sd) },
  })
})

// POST /api/authn/webauthn_finish_login?username=xx  (header: session)
webauthnRouter.post("/webauthn_finish_login", async (c) => {
  const db = await getDb(c.env)
  if (!getBoolSetting(db, "webauthn_login_enabled")) {
    return c.json({ code: 403, message: "WebAuthn is not enabled", data: null }, 403)
  }
  const sessionHeader = c.req.header("session") || c.req.header("Session") || ""
  let sd: SessionData
  try {
    sd = sessionFromB64(sessionHeader)
  } catch {
    return c.json({ code: 400, message: "invalid session", data: null }, 400)
  }
  const body = await c.req.json().catch(() => ({}))
  const rpId = rpIdOf(c, db)

  try {
    // 1. 解析 clientDataJSON，校验 challenge
    const rawId = b64urlDecode(body.id || "")
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body.response?.clientDataJSON || "")),
    )
    if (clientDataJSON.challenge !== sd.challenge) {
      return c.json({ code: 400, message: "challenge mismatch", data: null }, 400)
    }
    if (clientDataJSON.type !== "webauthn.get") {
      return c.json({ code: 400, message: "invalid ceremony type", data: null }, 400)
    }

    // 2. 解析 authenticatorData
    const authData = b64urlDecode(body.response?.authenticatorData || "")
    if (authData.length < 37) throw new Error("invalid authenticatorData")
    const rpIdHash = authData.slice(0, 32)
    const expectedRpHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)))
    if (b64urlEncode(rpIdHash) !== b64urlEncode(expectedRpHash)) {
      return c.json({ code:400, message: "rpId hash mismatch", data: null }, 400)
    }

    // 3. 找到对应用户与 credential
    const username = c.req.query("username") || sd.username || ""
    let user = username
      ? (db.users || []).find((u: any) => u.username === username)
      : null
    let credential: any
    if (user) {
      credential = getUserCredentials(user).find((cred: any) => {
        const cid = typeof cred.id === "string" ? cred.id : b64urlEncode(new Uint8Array(cred.id))
        return cid === body.id
      })
    } else {
      // discoverable login：通过 userHandle 找到用户
      const userHandle = b64urlDecode(body.response?.userHandle || "")
      if (userHandle.length) {
        const userId = new TextDecoder().decode(userHandle)
        user = (db.users || []).find((u: any) => String(u.id) === userId)
        if (user) {
          credential = getUserCredentials(user).find((cred: any) => {
            const cid = typeof cred.id === "string" ? cred.id : b64urlEncode(new Uint8Array(cred.id))
            return cid === body.id
          })
        }
      }
    }
    if (!user || !credential) {
      return c.json({ code: 400, message: "credential not found", data: null }, 400)
    }

    // 4. 验证签名（credential 存储 JWK 公钥）
    const jwk = credential.publicKey
    if (!jwk) {
      return c.json({ code: 400, message: "credential missing public key", data: null }, 400)
    }
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      jwk.kty === "RSA"
        ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
        : { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    )
    const sig = b64urlDecode(body.response?.signature || "")
    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", b64urlDecode(body.response?.clientDataJSON || "")),
    )
    const signedData = new Uint8Array(authData.length + clientDataHash.length)
    signedData.set(authData, 0)
    signedData.set(clientDataHash, authData.length)

    const verifyAlg =
      jwk.kty === "RSA"
        ? { name: "RSASSA-PKCS1-v1_5" }
        : { name: "ECDSA", hash: "SHA-256" }
    const valid = await crypto.subtle
      .verify(verifyAlg as any, publicKey, sig, signedData)
      .catch(() => false)
    if (!valid) {
      return c.json({ code: 400, message: "signature verification failed", data: null }, 400)
    }

    // 5. 更新 signCount（防重放，可选）
    const signCount = (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36]
    if (credential.sign_count !== undefined && signCount !== 0 && signCount <= credential.sign_count) {
      return c.json({ code: 400, message: "stale signCount (possible replay)", data: null }, 400)
    }
    credential.sign_count = signCount
    await saveDb(db, c.env)

    const token = await generateToken(user, c)
    return c.json({ code: 200, message: "success", data: { token } })
  } catch (e: any) {
    return c.json({ code: 400, message: e.message || "WebAuthn login failed", data: null }, 400)
  }
})

// POST /api/authn/webauthn_begin_registration (需已登录)
webauthnRouter.post("/webauthn_begin_registration", async (c) => {
  const db = await getDb(c.env)
  if (!getBoolSetting(db, "webauthn_login_enabled")) {
    return c.json({ code: 403, message: "WebAuthn is not enabled", data: null }, 403)
  }
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const rpId = rpIdOf(c, db)
  const challenge = newChallenge()
  const userIdBytes = new TextEncoder().encode(String(user.id))
  const sd: SessionData = {
    challenge: b64urlEncode(challenge),
    userId: String(user.id),
    username: user.username,
    userVerification: "preferred",
  }

  const existing = getUserCredentials(user).map((cred: any) => ({
    id: typeof cred.id === "string" ? cred.id : b64urlEncode(new Uint8Array(cred.id)),
    type: "public-key",
  }))

  const options: any = {
    challenge: sd.challenge,
    rp: { name: getStrSetting(db, "site_title", "OpenList"), id: rpId },
    user: {
      id: b64urlEncode(userIdBytes),
      name: user.username,
      displayName: user.username,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    timeout: 60000,
    authenticatorSelection: {
      userVerification: sd.userVerification,
      residentKey: "preferred",
    },
    attestation: "none",
  }
  if (existing.length > 0) options.excludeCredentials = existing

  return c.json({
    code: 200,
    message: "success",
    data: { options, session: sessionToB64(sd) },
  })
})

// POST /api/authn/webauthn_finish_registration (需已登录，header: Session)
webauthnRouter.post("/webauthn_finish_registration", async (c) => {
  const db = await getDb(c.env)
  if (!getBoolSetting(db, "webauthn_login_enabled")) {
    return c.json({ code: 403, message: "WebAuthn is not enabled", data: null }, 403)
  }
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const sessionHeader = c.req.header("Session") || c.req.header("session") || ""
  let sd: SessionData
  try {
    sd = sessionFromB64(sessionHeader)
  } catch {
    return c.json({ code: 400, message: "invalid session", data: null }, 400)
  }
  const body = await c.req.json().catch(() => ({}))
  const rpId = rpIdOf(c, db)

  try {
    // 1. 校验 clientDataJSON challenge
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body.response?.clientDataJSON || "")),
    )
    if (clientDataJSON.challenge !== sd.challenge) {
      return c.json({ code: 400, message: "challenge mismatch", data: null }, 400)
    }
    if (clientDataJSON.type !== "webauthn.create") {
      return c.json({ code: 400, message: "invalid ceremony type", data: null }, 400)
    }

    // 2. 解析 attestationObject
    const attObj = b64urlDecode(body.response?.attestationObject || "")
    const { publicKey, aaguid, credentialId, signCount } = await parseAttestation(attObj)

    // 3. 保存 credential（JWK 公钥，便于 finish_login 时重建 CryptoKey）
    const rawId = body.id || b64urlEncode(credentialId)
    const credRecord = {
      id: rawId,
      publicKey: await crypto.subtle.exportKey("jwk", publicKey),
      aaguid: b64urlEncode(aaguid),
      sign_count: signCount,
      created_at: new Date().toISOString(),
    }
    if (!user.webauthn_credentials) user.webauthn_credentials = []
    user.webauthn_credentials.push(credRecord)
    await saveDb(db, c.env)

    return c.json({ code: 200, message: "Registered Successfully", data: null })
  } catch (e: any) {
    return c.json({ code: 400, message: e.message || "registration failed", data: null }, 400)
  }
})

// POST /api/authn/delete_authn (需已登录，body: {id})
webauthnRouter.post("/delete_authn", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const body = await c.req.json().catch(() => ({}))
  const id = body.id || ""
  const db = await getDb(c.env)
  const target = (db.users || []).find((u: any) => u.id === user.id)
  if (!target) return c.json({ code: 404, message: "user not found", data: null }, 404)
  const before = (target.webauthn_credentials || []).length
  target.webauthn_credentials = (target.webauthn_credentials || []).filter((cred: any) => cred.id !== id)
  if (target.webauthn_credentials.length === before) {
    return c.json({ code: 404, message: "credential not found", data: null }, 404)
  }
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "Deleted Successfully", data: null })
})

// GET /api/authn/getcredentials (需已登录)
webauthnRouter.get("/getcredentials", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const creds = getUserCredentials(user).map((cred: any) => ({
    id: cred.id,
    fingerprint: cred.aaguid || "",
  }))
  return c.json({ code: 200, message: "success", data: creds })
})
