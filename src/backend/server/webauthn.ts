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

/**
 * 服务端挑战（challenge）存储。
 *
 * 安全不变量：WebAuthn 的 challenge 必须由**服务端签发**、**一次性消费**、
 * 且带**有效期**。这是对抗重放的核心——没有它，任何一份曾经合法的 assertion
 * 都能被无限次重复使用。
 *
 * 历史实现把整个会话（含 challenge）base64 后经 `session` 头在客户端往返：
 * 既没有服务端签发、也没有有效期、更没有消费状态，因此
 *   ① 客户端可以自行编造 challenge（服务端只比对「自己收到的那份」，等于没校验来源）；
 *   ② 同一份 assertion 可反复换取新 JWT（实测连续两次都返回 token）；
 *   ③ clientDataJSON.origin 与 UP/UV 标志完全不校验。
 *
 * 现在改为：`begin_*` 生成随机 id，把会话内容写入持久化后端（TTL 5 分钟），
 * 仅把 id 回给客户端；`finish_*` 读取后**立即作废**该 id，实现单次使用。
 * 对客户端而言 `session` 仍是不透明字符串，接口形状不变。
 */
const CHALLENGE_PREFIX = "openlist_wa_chal_"
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const UP_FLAG = 0x01
const UV_FLAG = 0x04

/**
 * 无持久化后端时的兜底挑战表（进程内，单实例语义）。
 *
 * 边界：内存模式部署本就无法跨实例协作，挑战也只在该实例内有效——这与
 * 「凭据本身也存在内存里」是同一级别的一致性，不会额外削弱安全性。
 * 必须带 TTL 与容量上限，避免被扫描式请求撑爆内存。
 */
const localChallenges = new Map<string, { data: SessionData; exp: number }>()
const LOCAL_CHALLENGE_MAX = 1000

function pruneLocalChallenges(): void {
  const now = Date.now()
  for (const [k, v] of localChallenges) {
    if (v.exp < now) localChallenges.delete(k)
  }
  // 仍然超限时按插入顺序淘汰最旧条目
  while (localChallenges.size > LOCAL_CHALLENGE_MAX) {
    const oldest = localChallenges.keys().next().value
    if (oldest === undefined) break
    localChallenges.delete(oldest)
  }
}

async function issueChallenge(c: any, sd: SessionData): Promise<string> {
  const id = b64urlEncode(newChallenge())
  const exp = Date.now() + CHALLENGE_TTL_MS

  // 先写进程内兜底表：**无论持久化是否可用都要写**。
  //
  // 为什么不能「持久化成功就 return」：writePersistedSecret 在驱动不可用时会
  // 记录日志后仍然返回真值，无法作为「确实写进去了」的依据。实测按返回值提前
  // return 会导致挑战哪儿都没存，所有 passkey 登录恒定报「invalid or expired」。
  // 兜底表保证单实例内始终可用；持久化成功则额外获得跨实例能力。
  pruneLocalChallenges()
  localChallenges.set(id, { data: sd, exp })

  try {
    const { writePersistedSecret } = await import("../internal/model/db")
    await writePersistedSecret(
      c.env,
      CHALLENGE_PREFIX + id,
      JSON.stringify({ ...sd, exp }),
    )
  } catch {
    // 无持久化后端：仅依赖上面的进程内兜底表
  }
  return id
}

async function consumeChallenge(
  c: any,
  id: string,
): Promise<SessionData | null> {
  if (!id) return null

  // 1) 进程内兜底表（读取即删除 = 单次使用）
  const local = localChallenges.get(id)
  if (local) {
    localChallenges.delete(id)
    return local.exp < Date.now() ? null : local.data
  }

  // 2) 持久化后端
  const { readPersistedSecret, writePersistedSecret } = await import(
    "../internal/model/db"
  )
  const key = CHALLENGE_PREFIX + id
  let raw: string | null = null
  try {
    raw = await readPersistedSecret(c.env, key)
  } catch {
    return null
  }
  // 一次性消费：无论后续校验是否通过，都先把该挑战作废
  try {
    await writePersistedSecret(c.env, key, "")
  } catch {}
  if (!raw) return null
  try {
    const data = JSON.parse(String(raw))
    if (!data || typeof data.exp !== "number" || data.exp < Date.now()) {
      return null
    }
    return data as SessionData
  } catch {
    return null
  }
}

/**
 * 校验 clientDataJSON.origin：必须是本站源或与 rpId 一致。
 * WebAuthn 规范要求 RP 校验 origin，防止同 rpId 下的跨源钓鱼。
 */
function originAllowed(origin: string, rpId: string, c: any): boolean {
  if (!origin) return false
  try {
    const o = new URL(origin)
    if (o.hostname === rpId) return true
    // 覆盖自定义端口/域名：与当前请求同源也放行
    return o.host === new URL(c.req.url).host
  } catch {
    return false
  }
}

/** 认证器 data 标志位校验：必须证明「用户在场」；策略要求时还需「用户已验证」 */
function flagsAllowed(flags: number, userVerification: string): boolean {
  if ((flags & UP_FLAG) === 0) return false
  if (userVerification === "required" && (flags & UV_FLAG) === 0) return false
  return true
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

  // session 现在只是服务端挑战的**不透明 id**（内容存在持久化后端，单次使用）
  const session = await issueChallenge(c, sd)

  return c.json({
    code: 200,
    message: "success",
    data: { options, session },
  })
})

// POST /api/authn/webauthn_finish_login?username=xx  (header: session)
webauthnRouter.post("/webauthn_finish_login", async (c) => {
  const db = await getDb(c.env)
  if (!getBoolSetting(db, "webauthn_login_enabled")) {
    return c.json({ code: 403, message: "WebAuthn is not enabled", data: null }, 403)
  }
  const sessionHeader = c.req.header("session") || c.req.header("Session") || ""
  // 服务端签发的挑战，读取即作废（单次使用）
  const sd = await consumeChallenge(c, sessionHeader)
  if (!sd) {
    return c.json(
      { code: 400, message: "invalid or expired session", data: null },
      400,
    )
  }
  const body = await c.req.json().catch(() => ({}))
  const rpId = rpIdOf(c, db)

  try {
    // 1. 解析 clientDataJSON，校验 challenge 与 origin
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
    // origin 必须属于本站（防止同 rpId 下的跨源钓鱼）
    if (!originAllowed(String(clientDataJSON.origin || ""), rpId, c)) {
      return c.json({ code: 400, message: "origin not allowed", data: null }, 400)
    }

    // 2. 解析 authenticatorData
    const authData = b64urlDecode(body.response?.authenticatorData || "")
    if (authData.length < 37) throw new Error("invalid authenticatorData")
    const rpIdHash = authData.slice(0, 32)
    const expectedRpHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)))
    if (b64urlEncode(rpIdHash) !== b64urlEncode(expectedRpHash)) {
      return c.json({ code:400, message: "rpId hash mismatch", data: null }, 400)
    }
    // 标志位：必须证明用户在场；策略为 required 时还需用户验证
    if (!flagsAllowed(authData[32], sd.userVerification === "required" ? "required" : "preferred")) {
      return c.json(
        { code: 400, message: "user presence/verification check failed", data: null },
        400,
      )
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
    // 账号状态复核：与其它身份解析入口一致，禁用用户不得换取新令牌。
    // 历史缺陷：finish_login 签发 JWT 前不检查 disabled，被禁用的账号仍能用
    // 已有凭证登录（实测：置 disabled=true 后仍返回 token）。
    if (user.disabled) {
      return c.json({ code: 403, message: "account is disabled", data: null }, 403)
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
      await crypto.subtle.digest(
        "SHA-256",
        b64urlDecode(body.response?.clientDataJSON || "") as unknown as BufferSource,
      ),
    )
    const signedData = new Uint8Array(authData.length + clientDataHash.length)
    signedData.set(authData, 0)
    signedData.set(clientDataHash, authData.length)

    const verifyAlg =
      jwk.kty === "RSA"
        ? { name: "RSASSA-PKCS1-v1_5" }
        : { name: "ECDSA", hash: "SHA-256" }
    const valid = await crypto.subtle
      .verify(
        verifyAlg as any,
        publicKey,
        sig as unknown as BufferSource,
        signedData as unknown as BufferSource,
      )
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

  const session = await issueChallenge(c, sd)

  return c.json({
    code: 200,
    message: "success",
    data: { options, session },
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
  // 服务端签发的挑战，读取即作废（单次使用）
  const sd = await consumeChallenge(c, sessionHeader)
  if (!sd) {
    return c.json(
      { code: 400, message: "invalid or expired session", data: null },
      400,
    )
  }
  const body = await c.req.json().catch(() => ({}))
  const rpId = rpIdOf(c, db)

  try {
    // 1. 校验 clientDataJSON challenge 与 origin
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body.response?.clientDataJSON || "")),
    )
    if (clientDataJSON.challenge !== sd.challenge) {
      return c.json({ code: 400, message: "challenge mismatch", data: null }, 400)
    }
    if (clientDataJSON.type !== "webauthn.create") {
      return c.json({ code: 400, message: "invalid ceremony type", data: null }, 400)
    }
    if (!originAllowed(String(clientDataJSON.origin || ""), rpId, c)) {
      return c.json({ code: 400, message: "origin not allowed", data: null }, 400)
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
    const webauthnUser = user as any
    if (!webauthnUser.webauthn_credentials) webauthnUser.webauthn_credentials = []
    webauthnUser.webauthn_credentials.push(credRecord)
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
