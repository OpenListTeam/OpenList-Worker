import { Hono } from "hono"
import { sign } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { getJwtSecret } from "./middlewares"
import { generateRandomPassword } from "./auth"

/**
 * LDAP 登录（Node 容器模式）。
 *
 * Cloudflare Workers 等 Edge 环境无原始 TCP socket，与 SFTP/FTP 一致，
 * 仅在 Node.js 容器运行时（dist-server）可用；其他环境返回明确错误。
 *
 * 手写最小 BER 编码实现 LDAP Simple Bind（无外部依赖），避免新增 ldapts 包。
 */

export const ldapRouter = new Hono()

// ---------- BER 编码 ----------
function berLength(len: number): number[] {
  if (len < 0x80) return [len]
  const bytes: number[] = []
  let l = len
  while (l > 0) {
    bytes.unshift(l & 0xff)
    l >>= 8
  }
  return [0x80 | bytes.length, ...bytes]
}

function berTlv(tag: number, content: number[]): number[] {
  return [tag, ...berLength(content.length), ...content]
}

function berInteger(v: number): number[] {
  const bytes: number[] = []
  let n = v
  do {
    bytes.unshift(n & 0xff)
    n = Math.floor(n / 256)
  } while (n > 0)
  if (bytes[0] & 0x80) bytes.unshift(0)
  return berTlv(0x02, bytes)
}

function berOctetString(s: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i))
  return berTlv(0x04, bytes)
}

function berSequence(children: number[][]): number[] {
  const content: number[] = []
  for (const c of children) content.push(...c)
  return berTlv(0x30, content)
}

/** LDAP BindRequest（application 0）：SEQUENCE { version=3, name, simple auth } */
function buildBindRequest(messageId: number, dn: string, password: string): Buffer {
  const version = berInteger(3)
  const name = berOctetString(dn)
  const auth = berTlv(0x80, Array.from(Buffer.from(password, "utf-8"))) // [0] simple
  const protocolOp = berTlv(0x60, [...berSequence([version, name, auth])]) // [APPLICATION 0]
  const message = berSequence([berInteger(messageId), protocolOp])
  return Buffer.from(message)
}

/** 解析 LDAP BindResponse（application 1）的 resultCode（0 = success） */
function parseBindResponse(buf: Buffer): number {
  // 简化解析：找到 resultCode ENUMERATED（tag 0x0a）后的第一个值
  // BindResponse = [APPLICATION 1] SEQUENCE { resultCode ENUMERATED, ... }
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0x0a) {
      const len = buf[i + 1]
      if (len === 1) return buf[i + 2]
      if (len > 1) return buf.readIntBE(i + 2, len)
    }
  }
  return -1
}

/** 读取 LDAP 消息（BER TLV），返回 { messageId, protocolOp } */
function readMessage(socket: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let expected = 0
    let got = 0
    const onData = (chunk: Buffer) => {
      chunks.push(chunk)
      got += chunk.length
      if (expected === 0 && got >= 2) {
        const buf = Buffer.concat(chunks)
        const first = buf[0]
        if ((buf[1] & 0x80) === 0) {
          expected = 2 + buf[1]
        } else {
          const n = buf[1] & 0x7f
          let len = 0
          for (let i = 0; i < n; i++) len = (len << 8) | buf[2 + i]
          expected = 2 + n + len
        }
      }
      if (expected > 0 && got >= expected) {
        socket.removeListener("data", onData)
        resolve(Buffer.concat(chunks).slice(0, expected))
      }
    }
    socket.on("data", onData)
    socket.on("error", reject)
    socket.on("close", () => reject(new Error("LDAP connection closed")))
  })
}

function ldapSimpleBind(
  host: string,
  port: number,
  dn: string,
  password: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let net: any
    try {
      net = require("node:net")
    } catch {
      return reject(new Error("LDAP requires Node.js runtime"))
    }
    const socket = net.connect({ host, port }, async () => {
      try {
        socket.write(buildBindRequest(1, dn, password))
        const resp = await readMessage(socket)
        const code = parseBindResponse(resp)
        socket.end()
        resolve(code === 0)
      } catch (e) {
        socket.end()
        reject(e)
      }
    })
    socket.on("error", reject)
    socket.setTimeout(10000, () => {
      socket.destroy()
      reject(new Error("LDAP bind timeout"))
    })
  })
}

function isNodeRuntime(): boolean {
  return (
    typeof process !== "undefined" &&
    process.release?.name === "node"
  )
}

function getSetting(db: any, key: string, def = ""): string {
  const item = (db.settings || []).find((s: any) => s.key === key)
  return item?.value !== undefined && item?.value !== null ? String(item.value) : def
}
function getBool(db: any, key: string): boolean {
  const v = getSetting(db, key, "false")
  return v === "true" || v === "1"
}

async function generateToken(user: any, c: any): Promise<string> {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    jti: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : generateRandomPassword(),
  }
  const secret = await getJwtSecret(c)
  return await sign(payload, secret)
}

// POST /api/auth/login/ldap
ldapRouter.post("/login/ldap", async (c) => {
  const db = await getDb(c.env)
  if (!getBool(db, "ldap_login_enabled")) {
    return c.json({ code: 403, message: "LDAP login is not enabled", data: null }, 403)
  }
  if (!isNodeRuntime()) {
    return c.json(
      {
        code: 501,
        message:
          "LDAP requires Node.js container runtime (raw TCP sockets not available in Edge isolates)",
        data: null,
      },
      501,
    )
  }
  const body = await c.req.json().catch(() => ({}))
  const username = String(body.username || "").trim()
  const password = String(body.password || "")
  if (!username || !password) {
    return c.json({ code: 400, message: "username and password are required", data: null }, 400)
  }

  const host = getSetting(db, "ldap_host")
  const port = parseInt(getSetting(db, "ldap_port", "389"), 10) || 389
  const baseDn = getSetting(db, "ldap_base_dn")
  if (!host) {
    return c.json({ code: 500, message: "LDAP host is not configured", data: null }, 500)
  }

  // 尝试多种 DN 形式：uid=username,base_dn / cn=username,base_dn / username 直接作为 DN
  const dnCandidates = [
    baseDn && !username.includes("=") ? `uid=${username},${baseDn}` : username,
    baseDn && !username.includes("=") ? `cn=${username},${baseDn}` : username,
    username,
  ]
  const seen = new Set<string>()
  let authed = false
  for (const dn of dnCandidates) {
    if (seen.has(dn)) continue
    seen.add(dn)
    try {
      if (await ldapSimpleBind(host, port, dn, password)) {
        authed = true
        break
      }
    } catch {
      // 尝试下一个 DN 形式
    }
  }
  if (!authed) {
    return c.json({ code: 401, message: "Invalid credentials", data: null }, 401)
  }

  // 查找或自动注册用户
  const { users } = db
  let user = users.find((u: any) => u.username === username && !u.disabled)
  if (!user) {
    if (!getBool(db, "ldap_auto_register")) {
      return c.json(
        { code: 400, message: "user not found and auto register is disabled", data: null },
        400,
      )
    }
    const id = users.length
      ? Math.max(...users.map((u: any) => Number(u.id) || 0)) + 1
      : 1
    user = {
      id,
      username,
      password: generateRandomPassword(),
      role: 0,
      permission: 0,
      base_path: "/",
      disabled: false,
      sso_id: "",
      allow_ldap: true,
      pwd_update_at: new Date().toISOString(),
    }
    users.push(user)
    await saveDb(db, c.env)
  }

  const token = await generateToken(user, c)
  return c.json({ code: 200, message: "success", data: { token } })
})
