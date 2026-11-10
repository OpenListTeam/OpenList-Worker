import CryptoJS from "crypto-js"
import {
  aesCbcDecrypt,
  aesCbcEncrypt,
  aesEcbDecrypt,
  aesEcbEncrypt,
  b64ToBytes,
  bytesToB64Url,
  decodeMegaPrivateKey,
  decryptSessionId,
  nodeCipherKey,
  prepareKey,
  prepareKeyV2,
  stringhash,
  utf8ToBytes,
} from "./crypto"
import { MegaAddition, MegaNodeItem } from "./types"

export function b64ToWords(s: string): CryptoJS.lib.WordArray {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/")
  while (b64.length % 4 !== 0) {
    b64 += "="
  }
  return CryptoJS.enc.Base64.parse(b64)
}

export function wordsToB64(words: CryptoJS.lib.WordArray): string {
  return CryptoJS.enc.Base64.stringify(words)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function strToWords(s: string): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Utf8.parse(s)
}

const HASHCASH_TOKEN_BYTES = 48
const HASHCASH_TOKEN_BLOCKS = 262_144
const HASHCASH_BUFFER_BYTES = 4 + HASHCASH_TOKEN_BYTES * HASHCASH_TOKEN_BLOCKS
const HASHCASH_MAX_ATTEMPTS = 4096
const HASHCASH_MAX_DURATION_MS = 10_000
/**
 * 预算 = 期望尝试数 × 该倍数。取 4：命中率 1-(1-1/E)^(4E) ≈ 98.2%，
 * 而 easiness=192（E=256）时 1024 次 × 7.5 ms ≈ 7.7 s，仍在 10 s 墙钟内。
 * 2 倍只有 86.5%，为省尾部开销把失败率抬到 13.5% 不划算。
 */
const HASHCASH_BUDGET_MULTIPLIER = 4

export interface MegaHashcashOptions {
  /** Test seam; production uses the Worker-compatible WebCrypto SHA-256 API. */
  digest?: (data: Uint8Array) => Promise<ArrayBuffer | Uint8Array>
  maxAttempts?: number
  maxDurationMs?: number
  now?: () => number
}

function decodeHashcashToken(token: string): Uint8Array {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(token)) {
    throw new Error(
      "MEGA Hashcash challenge contains an invalid token encoding",
    )
  }
  const words = b64ToWords(token)
  if (words.sigBytes !== HASHCASH_TOKEN_BYTES) {
    throw new Error(
      `MEGA Hashcash token must decode to ${HASHCASH_TOKEN_BYTES} bytes`,
    )
  }
  const bytes = new Uint8Array(words.sigBytes)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (words.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return bytes
}

/**
 * Solve the MEGA 402 Hashcash challenge used by the official web client.
 * The work factor is deliberately bounded for serverless runtimes; a challenge
 * that exceeds the budget is reported instead of consuming unbounded CPU.
 *
 * 成本提示：每次尝试都要对 ~12 MiB 缓冲做一次完整 SHA-256。本地 Node
 * （WebCrypto）实测 easiness=192（期望 ~256 次）约需 0.4–2 s。真正的 CPU
 * 开销发生在原生 crypto.subtle 里（Workers 的 cpuTime 基本不增长，参考
 * wallTime 53 s / cpuTime 61 ms 的日志），免费版 10 ms CPU 仍然不可用，
 * 付费版 30 s 内可以完成。这里的预算按「期望尝试数 × 4」收敛，并保留
 * 10 s 墙钟上限：预算耗尽时报错退出，不会把请求拖到平台超时。
 */
export async function generateHashcashToken(
  challenge: string,
  options: MegaHashcashOptions = {},
): Promise<string> {
  if (!challenge || challenge.length > 512) {
    throw new Error("MEGA Hashcash challenge is missing or too large")
  }
  const parts = challenge.split(":")
  const version = Number(parts[0])
  const easiness = Number(parts[1])
  const tokenText = parts[3] || ""
  if (
    parts.length !== 4 ||
    version !== 1 ||
    !Number.isInteger(easiness) ||
    easiness < 0 ||
    easiness > 255
  ) {
    throw new Error("MEGA returned an unsupported Hashcash challenge")
  }

  const token = decodeHashcashToken(tokenText)
  const base = ((easiness & 63) << 1) + 1
  const shifts = (easiness >> 6) * 7 + 3
  const threshold = base * 2 ** shifts
  const buffer = new Uint8Array(HASHCASH_BUFFER_BYTES)
  for (let i = 0; i < HASHCASH_TOKEN_BLOCKS; i++) {
    buffer.set(token, 4 + i * HASHCASH_TOKEN_BYTES)
  }

  const subtle = globalThis.crypto?.subtle
  if (!options.digest && !subtle) {
    throw new Error("WebCrypto SHA-256 is unavailable for MEGA Hashcash")
  }
  const digest =
    options.digest ||
    (async (data: Uint8Array) => subtle.digest("SHA-256", data as BufferSource))
  // 命中概率 ≈ (threshold + 1) / 2^32，故期望尝试次数 = 2^32 / (threshold + 1)。
  // 固定 4096 次在 easiness=192 时（期望 256 次）意味着 16 倍的无效哈希；
  // 改成按期望值放大 4 倍：成功率约 98.2%，仍落在 10 s 墙钟内。
  const expectedAttempts = Math.ceil(2 ** 32 / (threshold + 1))
  const budgetAttempts = Math.min(
    HASHCASH_MAX_ATTEMPTS,
    Math.max(1, expectedAttempts * HASHCASH_BUDGET_MULTIPLIER),
  )
  const maxAttempts = Math.min(
    Math.max(1, Math.floor(options.maxAttempts ?? budgetAttempts)),
    HASHCASH_MAX_ATTEMPTS,
  )
  const maxDurationMs = Math.max(
    1,
    Math.floor(options.maxDurationMs ?? HASHCASH_MAX_DURATION_MS),
  )
  const now = options.now || Date.now
  const startedAt = now()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (now() - startedAt > maxDurationMs) break

    // The official client increments the 4-byte prefix little-endian before
    // hashing, then reads the first digest word as big-endian DataView does.
    for (let byte = 0; byte < 4; byte++) {
      buffer[byte] = (buffer[byte] + 1) & 0xff
      if (buffer[byte] !== 0) break
    }

    const result = await digest(buffer)
    const hash = result instanceof Uint8Array ? result : new Uint8Array(result)
    if (hash.length < 4) {
      throw new Error("SHA-256 digest returned fewer than four bytes")
    }
    const firstWord =
      hash[0] * 0x1000000 + (hash[1] << 16) + (hash[2] << 8) + hash[3]
    if (firstWord <= threshold) {
      const prefix = CryptoJS.lib.WordArray.create(
        [(buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3]],
        4,
      )
      return `1:${tokenText}:${wordsToB64(prefix)}`
    }
  }

  throw new Error(
    `MEGA Hashcash proof exceeded the serverless work budget (${maxAttempts} attempts or ${maxDurationMs} ms)`,
  )
}

const MAX_HASHCASH_RETRIES = 1
const MAX_TRANSIENT_RETRIES = 4
const TRANSIENT_RETRY_BASE_MS = 400
const TRANSIENT_RETRY_MAX_MS = 8_000
/** MEGA 的网关过载/限流状态码；402（Hashcash）由上面的分支单独处理。 */
const TRANSIENT_HTTP_STATUS = new Set([429, 500, 502, 503, 504])

const MEGA_ERROR_NAMES: Record<number, string> = {
  [-1]: "EINTERNAL",
  [-2]: "EARGS",
  [-3]: "EAGAIN",
  [-4]: "ERATELIMIT",
  [-6]: "ETOOMANY",
  [-9]: "ENOENT",
  [-11]: "EACCESS",
  [-15]: "ESID",
  [-16]: "EBLOCKED",
  [-17]: "EOVERQUOTA",
  [-18]: "ETEMPUNAVAIL",
  [-26]: "EMFAREQUIRED",
}

/** MEGA 在 HTTP 200 里用负数返回 API 错误，单独建类型便于上层按 code 处理。 */
export class MegaApiError extends Error {
  readonly code: number

  constructor(code: number) {
    const name = MEGA_ERROR_NAMES[code]
    super(`Mega API error code: ${code}${name ? ` (${name})` : ""}`)
    this.name = "MegaApiError"
    this.code = code
  }
}

/**
 * 只读响应体的前 limit 字节，读完立刻 cancel。
 *
 * 错误信息只用于日志与前端提示，但 res.text() 会把整页 HTML 完整缓冲进内存
 * 再截断——截断输出并不等于截断读取。这里按流读取到上限就放弃剩余字节。
 */
async function readTextPrefix(res: Response, limit: number): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ""
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (total < limit) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value || value.length === 0) continue
      const rest = limit - total
      const part = value.length > rest ? value.subarray(0, rest) : value
      chunks.push(part)
      total += part.length
    }
  } catch {
    // 读取中断时使用已读到的部分
  } finally {
    try {
      await reader.cancel()
    } catch {
      // 已关闭的流 cancel 会抛错，忽略
    }
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(merged)
}

/** MEGA 的节点属性结构是 "MEGA" + JSON，末尾用 NUL 补齐到 16 字节。 */
function packAttributes(attributes: Record<string, unknown>): Uint8Array {
  const text = `MEGA${JSON.stringify(attributes)}`
  const bytes = utf8ToBytes(text)
  const length = Math.max(16, Math.ceil(bytes.length / 16) * 16)
  const padded = new Uint8Array(length)
  padded.set(bytes)
  return padded
}

const ZERO_IV = new Uint8Array(16)

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export class MegaApiClient {
  private addition: MegaAddition
  private solveHashcash: (challenge: string) => Promise<string>
  private sleep: (ms: number) => Promise<void>
  private sid = ""
  private seq = Math.floor(Math.random() * 0x10000000)
  private masterKey: Uint8Array | null = null
  private nodes: Map<string, MegaNodeItem> = new Map()
  private rootId = ""

  constructor(
    addition: MegaAddition,
    solveHashcash: (
      challenge: string,
    ) => Promise<string> = generateHashcashToken,
    sleep: (ms: number) => Promise<void> = defaultSleep,
  ) {
    this.addition = addition
    this.solveHashcash = solveHashcash
    this.sleep = sleep
  }

  private nextSeq(): number {
    this.seq = (this.seq + 1) % 0x10000000
    return this.seq
  }

  /**
   * 指数退避。MEGA 的 "Server Too Busy"（503）通常几秒内恢复；Retry-After
   * 存在时取两者较大值（上限 15 s），并加少量抖动避免同一时刻重试撞车。
   */
  private async retryDelay(attempt: number, retryAfter?: string | null) {
    let delay = Math.min(
      TRANSIENT_RETRY_MAX_MS,
      TRANSIENT_RETRY_BASE_MS * 2 ** attempt,
    )
    const header = Number(retryAfter)
    if (Number.isFinite(header) && header > 0) {
      delay = Math.max(delay, Math.min(header * 1000, 15_000))
    }
    await this.sleep(delay + Math.floor(Math.random() * 250))
  }

  async request<T = any>(body: any[]): Promise<T> {
    const seq = this.nextSeq()
    let url = `https://g.api.mega.co.nz/cs?id=${seq}`
    if (this.sid) {
      url += `&sid=${this.sid}`
    }

    const bodyText = JSON.stringify(body)
    let hashcashHeader: string | undefined
    let hashcashRetries = 0
    let transientRetries = 0

    for (;;) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (hashcashHeader) headers["X-Hashcash"] = hashcashHeader

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: bodyText,
      })

      // MEGA signals a proof-of-work challenge with HTTP 402 + X-Hashcash.
      // Other 402 responses (for example, payment/account errors) keep the
      // ordinary error path; challenges are bounded to one retry per request.
      // 注意：挑战绑定本次请求的 id，重试必须复用同一个 url/seq，不能重新生成。
      if (res.status === 402) {
        const challenge = res.headers.get("X-Hashcash")
        if (challenge) {
          if (hashcashRetries >= MAX_HASHCASH_RETRIES) {
            throw new Error(
              "Mega API repeated the Hashcash challenge after retry",
            )
          }
          hashcashRetries++
          try {
            await res.body?.cancel()
          } catch {
            // The response body is not needed after extracting its challenge header.
          }
          hashcashHeader = await this.solveHashcash(challenge)
          continue
        }
      }

      // 503 "Server Too Busy" / 429 / 502 等是网关过载或限流，和 PoW 无关，
      // 官方客户端与 megajs 都是退避后重试；这里做同样的有界重试。
      if (
        TRANSIENT_HTTP_STATUS.has(res.status) &&
        transientRetries < MAX_TRANSIENT_RETRIES
      ) {
        const retryAfter = res.headers.get("Retry-After")
        try {
          await res.body?.cancel()
        } catch {
          // 丢弃响应体，避免连接被占用
        }
        await this.retryDelay(transientRetries++, retryAfter)
        continue
      }

      if (!res.ok) {
        // 上游异常时可能返回整页 HTML；错误信息会进日志与前端提示，必须截断。
        // 用流式读取而不是 res.text().slice()：后者仍会把整页正文缓冲进内存。
        const detail = await readTextPrefix(res, 512)
        const statusText = res.statusText ? ` ${res.statusText}` : ""
        throw new Error(
          `Mega API HTTP error: ${res.status}${statusText}${detail ? `: ${detail}` : ""}`,
        )
      }

      const json = (await res.json()) as any
      // MEGA 的 API 错误既可能是裸数字，也可能是单元素数组（如 [-9]）。
      const code =
        typeof json === "number"
          ? json
          : Array.isArray(json) &&
              json.length === 1 &&
              typeof json[0] === "number"
            ? json[0]
            : undefined
      if (code !== undefined && code < 0) {
        // -3 EAGAIN（临时拥塞）与 -4 ERATELIMIT（命令配额）同样值得重试。
        if (
          (code === -3 || code === -4) &&
          transientRetries < MAX_TRANSIENT_RETRIES
        ) {
          await this.retryDelay(transientRetries++)
          continue
        }
        throw new MegaApiError(code)
      }
      return json as T
    }
  }

  /**
   * 完整登录流程（与官方客户端 / megajs 一致）：
   *   us0 预登录拿到账号版本（v1/v2）→ 派生用户密钥与 uh → us 登录 →
   *   用用户密钥解出 master key → 解 privk → RSA 解 csid 得到 sid。
   *
   * 旧实现只发 `us` 且把 uh 写成 base64url(email)，402 消失后服务端就会
   * 回 -9（ENOENT / 用户不存在），这就是 issue #150 里 PR #166 之后的报错。
   */
  async init(): Promise<void> {
    if (!this.addition.email || !this.addition.password) {
      throw new Error("Mega email and password are required")
    }

    const email = this.addition.email.trim().toLowerCase()
    const password = this.addition.password

    this.clearSession()

    const prelogin = await this.request<any[]>([{ a: "us0", user: email }])
    const preloginResp = prelogin[0]
    if (typeof preloginResp === "number" && preloginResp < 0) {
      throw new Error(`Mega prelogin failed: ${preloginResp}`)
    }

    const version = preloginResp?.v
    let userKey: Uint8Array
    let userHandle: string
    if (version === 1) {
      userKey = prepareKey(password)
      userHandle = bytesToB64Url(stringhash(email, userKey))
    } else if (version === 2) {
      if (!preloginResp?.s) {
        throw new Error("Mega prelogin did not return an account salt")
      }
      const derived = await prepareKeyV2(password, b64ToBytes(preloginResp.s))
      userKey = derived.subarray(0, 16)
      userHandle = bytesToB64Url(derived.subarray(16, 32))
    } else {
      throw new Error(`Mega account version not supported: ${version}`)
    }

    const loginBody: Record<string, unknown> = {
      a: "us",
      user: email,
      uh: userHandle,
    }
    const twoFa = this.addition.two_fa_code?.trim()
    if (twoFa) loginBody.mfa = twoFa

    const login = await this.request<any[]>([loginBody]).catch((err) => {
      if (err instanceof MegaApiError) {
        throw new Error(this.authErrorMessage(err.code))
      }
      throw err
    })
    const authResp = login[0]
    if (typeof authResp === "number" && authResp < 0) {
      throw new Error(this.authErrorMessage(authResp))
    }
    if (!authResp?.k || !authResp?.privk || !authResp?.csid) {
      throw new Error("Mega login response is missing session keys")
    }

    // k: 账号 master key，用用户密钥 AES-ECB 解出；privk/csid 再用 master key
    // 解出 RSA 私钥与密文，最终 sid 只能通过 RSA 解密得到，响应里没有现成 sid。
    this.masterKey = aesEcbDecrypt(userKey, b64ToBytes(String(authResp.k)))
    if (this.masterKey.length !== 16) {
      throw new Error("Mega login returned an invalid master key")
    }
    const privateKey = decodeMegaPrivateKey(
      aesEcbDecrypt(this.masterKey, b64ToBytes(String(authResp.privk))),
    )
    this.sid = decryptSessionId(privateKey, b64ToBytes(String(authResp.csid)))
    await this.fetchNodes()
  }

  private authErrorMessage(code: number): string {
    switch (code) {
      case -9:
        return "Mega authentication failed: -9 (wrong email or password)"
      case -16:
        return "Mega authentication failed: -16 (account blocked)"
      case -26:
        return "Mega authentication failed: -26 (2FA code required or invalid)"
      default:
        return `Mega authentication failed: ${code}`
    }
  }

  async fetchNodes(): Promise<void> {
    if (!this.sid) return

    const res = await this.request<any[]>([{ a: "f", c: 1 }])
    const filesResp = res[0]
    this.nodes.clear()
    this.rootId = ""
    if (!Array.isArray(filesResp?.f)) return

    for (const node of filesResp.f) {
      // Node type: 0=file, 1=folder, 2=root, 3=inbox, 4=trash
      const isDir = node.t === 1 || node.t === 2 || node.t === 3 || node.t === 4
      if (node.t === 2) {
        this.rootId = node.h
      }

      const nodeKey = this.decryptNodeKey(node.k)
      let name = node.h
      const attributes = this.decryptAttributes(node.a, nodeKey)
      if (attributes?.n) name = attributes.n

      const item: MegaNodeItem = {
        id: node.h,
        parent_id: node.p,
        name,
        size: node.s || 0,
        is_dir: isDir,
        modified: node.ts
          ? new Date(node.ts * 1000).toISOString()
          : new Date().toISOString(),
        type: node.t,
        key: node.k,
        file_key: nodeKey ? bytesToB64Url(nodeKey) : undefined,
      }
      this.nodes.set(node.h, item)
    }
  }

  /** 节点 k 可能是 "handle:key"；共享节点是 RSA 密钥（>32 字节），这里跳过。 */
  private decryptNodeKey(keyText?: string): Uint8Array | null {
    if (!keyText || !this.masterKey) return null
    try {
      const parts = keyText.split(":")
      const key = b64ToBytes(parts[parts.length - 1])
      if (key.length !== 16 && key.length !== 32) return null
      return aesEcbDecrypt(this.masterKey, key)
    } catch {
      return null
    }
  }

  private decryptAttributes(
    attrB64?: string,
    nodeKey?: Uint8Array | null,
  ): { n?: string } | null {
    if (!attrB64 || !nodeKey) return null
    try {
      const plain = aesCbcDecrypt(
        nodeCipherKey(nodeKey),
        ZERO_IV,
        b64ToBytes(attrB64),
      )
      let end = 0
      while (end < plain.length && plain[end] !== 0) end++
      const text = new TextDecoder().decode(plain.subarray(0, end))
      if (!text.startsWith("MEGA{")) return null
      const parsed = JSON.parse(text.substring(4))
      return typeof parsed?.n === "string" ? parsed : null
    } catch {
      return null
    }
  }

  getChildren(parentId?: string): MegaNodeItem[] {
    const targetParent = parentId || this.rootId
    const result: MegaNodeItem[] = []
    for (const node of this.nodes.values()) {
      // 根节点的 parent 指向自身，列目录时必须排除它，否则根目录会把自己列出来。
      if (node.id !== targetParent && node.parent_id === targetParent) {
        result.push(node)
      }
    }
    return result
  }

  getNode(handle: string): MegaNodeItem | undefined {
    return this.nodes.get(handle)
  }

  getRootId(): string {
    return this.rootId
  }

  /** 持久化用的会话材料；master key 是解密节点密钥/属性所必需的。 */
  getSession(): { sid: string; masterKey: string } | null {
    if (!this.sid || !this.masterKey) return null
    return { sid: this.sid, masterKey: bytesToB64Url(this.masterKey) }
  }

  /** 复用已持久化的会话，跳过 us0/us 登录（也就跳过了 Hashcash）。 */
  restoreSession(sid: string, masterKey: string): void {
    const key = b64ToBytes(masterKey)
    if (key.length !== 16) {
      throw new Error("Mega persisted session has an invalid master key")
    }
    this.sid = sid
    this.masterKey = key
  }

  clearSession(): void {
    this.sid = ""
    this.masterKey = null
    this.nodes.clear()
    this.rootId = ""
  }

  async getDownloadLink(handle: string): Promise<string> {
    const res = await this.request<any[]>([{ a: "g", g: 1, n: handle }])
    const data = res[0]
    if (data?.g) {
      return data.g
    }
    throw new Error(`Failed to get download URL for node ${handle}`)
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    if (!this.masterKey) throw new Error("Mega client is not logged in")
    const pid = parentId || this.rootId
    // 新目录需要一把随机 16 字节密钥，属性用它加密，密钥本身再用账号
    // master key 加密后随节点一起提交，服务端不参与明文。
    const folderKey = globalThis.crypto.getRandomValues(new Uint8Array(16))
    const encryptedKey = aesEcbEncrypt(this.masterKey, folderKey)
    const encryptedAttrs = aesCbcEncrypt(
      nodeCipherKey(folderKey),
      ZERO_IV,
      packAttributes({ n: name }),
    )

    const res = await this.request<any[]>([
      {
        a: "p",
        t: pid,
        n: [
          {
            h: "xxxxxxxx",
            t: 1,
            a: bytesToB64Url(encryptedAttrs),
            k: bytesToB64Url(encryptedKey),
          },
        ],
      },
    ])
    await this.fetchNodes()
    return res[0]?.f?.[0]?.h || ""
  }

  async deleteNode(handle: string): Promise<void> {
    await this.request<any[]>([{ a: "d", n: handle }])
    this.nodes.delete(handle)
  }

  async moveNode(handle: string, targetParentId: string): Promise<void> {
    await this.request<any[]>([{ a: "m", n: handle, t: targetParentId }])
    const node = this.nodes.get(handle)
    if (node) {
      node.parent_id = targetParentId
    }
  }

  async getQuota(): Promise<{ total: number; used: number }> {
    const res = await this.request<any[]>([{ a: "uq", strg: 1 }])
    const data = res[0]
    return {
      total: data?.mstrg || 0,
      used: data?.cstrg || 0,
    }
  }
}
