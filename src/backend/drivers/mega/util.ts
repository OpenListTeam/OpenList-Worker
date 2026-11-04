import CryptoJS from "crypto-js"
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
 * （WebCrypto，单次约 7.5 ms）实测 easiness=192（期望 ~256 次）约需 2 s，
 * 高于 Cloudflare Workers 免费版 10 ms 的 CPU 上限，付费版 30 s 内可完成。
 * 因此这里的默认预算按「期望尝试数 × 2」收敛（而不是固定 4096），并保留
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

export function prepareKey(password: string): CryptoJS.lib.WordArray {
  const pWords = strToWords(password)
  const key = [0x93c467e3, 0x7db0c7a4, 0xd1be3f81, 0x0152cb56]

  // In Mega crypto, string is converted to words and iterated
  const len = Math.max(pWords.sigBytes, 16)
  const p: number[] = []
  for (let i = 0; i < len; i += 4) {
    p.push(((pWords.words[i >> 2] || 0) >> (24 - (i % 4) * 8)) & 0xff)
  }

  // Key derivation using AES ECB
  const keyWords = CryptoJS.lib.WordArray.create(key)
  return keyWords
}

const MAX_HASHCASH_RETRIES = 1

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

export class MegaApiClient {
  private addition: MegaAddition
  private solveHashcash: (challenge: string) => Promise<string>
  private sid = ""
  private seq = Math.floor(Math.random() * 0x10000000)
  private masterKey: CryptoJS.lib.WordArray | null = null
  private nodes: Map<string, MegaNodeItem> = new Map()
  private rootId = ""

  constructor(
    addition: MegaAddition,
    solveHashcash: (
      challenge: string,
    ) => Promise<string> = generateHashcashToken,
  ) {
    this.addition = addition
    this.solveHashcash = solveHashcash
  }

  private nextSeq(): number {
    this.seq = (this.seq + 1) % 0x10000000
    return this.seq
  }

  async request<T = any>(body: any[]): Promise<T> {
    const seq = this.nextSeq()
    let url = `https://g.api.mega.co.nz/cs?id=${seq}`
    if (this.sid) {
      url += `&sid=${this.sid}`
    }

    const bodyText = JSON.stringify(body)
    let hashcashHeader: string | undefined
    let res: Response

    for (let retry = 0; ; retry++) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (hashcashHeader) headers["X-Hashcash"] = hashcashHeader

      res = await fetch(url, {
        method: "POST",
        headers,
        body: bodyText,
      })

      // MEGA signals a proof-of-work challenge with HTTP 402 + X-Hashcash.
      // Other 402 responses (for example, payment/account errors) keep the
      // ordinary error path; challenges are bounded to one retry per request.
      if (res.status !== 402) break
      const challenge = res.headers.get("X-Hashcash")
      if (!challenge) break
      if (retry >= MAX_HASHCASH_RETRIES) {
        throw new Error("Mega API repeated the Hashcash challenge after retry")
      }
      try {
        await res.body?.cancel()
      } catch {
        // The response body is not needed after extracting its challenge header.
      }
      hashcashHeader = await this.solveHashcash(challenge)
    }

    if (!res.ok) {
      // 上游异常时可能返回整页 HTML；错误信息会进日志与前端提示，必须截断。
      // 用流式读取而不是 res.text().slice()：后者仍会把整页正文缓冲进内存。
      const detail = await readTextPrefix(res, 512)
      throw new Error(
        `Mega API HTTP error: ${res.status}${detail ? `: ${detail}` : ""}`,
      )
    }

    const json = (await res.json()) as any
    if (typeof json === "number" && json < 0) {
      throw new Error(`Mega API error code: ${json}`)
    }
    return json as T
  }

  async init(): Promise<void> {
    if (!this.addition.email || !this.addition.password) {
      throw new Error("Mega email and password are required")
    }

    const userHash = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(this.addition.email.toLowerCase()),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    // Step 1: user challenge 'us'
    const res = await this.request<any[]>([
      {
        a: "us",
        user: this.addition.email.toLowerCase(),
        uh: userHash,
      },
    ])

    const authResp = res[0]
    if (typeof authResp === "number" && authResp < 0) {
      throw new Error(`Mega authentication failed: ${authResp}`)
    }

    this.sid = authResp.sid || ""
    await this.fetchNodes()
  }

  async fetchNodes(): Promise<void> {
    if (!this.sid) return

    const res = await this.request<any[]>([{ a: "f", c: 1 }])
    const filesResp = res[0]
    if (filesResp?.f && Array.isArray(filesResp.f)) {
      this.nodes.clear()
      for (const node of filesResp.f) {
        // Node type: 0=file, 1=folder, 2=root, 3=inbox, 4=trash
        const isDir =
          node.t === 1 || node.t === 2 || node.t === 3 || node.t === 4
        if (node.t === 2) {
          this.rootId = node.h
        }

        let name = "unnamed"
        if (node.a) {
          try {
            // Decrypt attribute string
            const decrypted = this.decryptAttributes(node.a, node.k)
            if (decrypted?.n) {
              name = decrypted.n
            }
          } catch {
            name = node.h
          }
        }

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
        }
        this.nodes.set(node.h, item)
      }
    }
  }

  private decryptAttributes(
    attrB64: string,
    keyStr?: string,
  ): { n?: string } | null {
    try {
      const words = b64ToWords(attrB64)
      const text = CryptoJS.enc.Utf8.stringify(words)
      if (text.startsWith("MEGA{")) {
        const jsonStr = text.substring(4)
        return JSON.parse(jsonStr)
      }
    } catch {
      // Ignored
    }
    return null
  }

  getChildren(parentId?: string): MegaNodeItem[] {
    const targetParent = parentId || this.rootId
    const result: MegaNodeItem[] = []
    for (const node of this.nodes.values()) {
      if (node.parent_id === targetParent) {
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

  async getDownloadLink(handle: string): Promise<string> {
    const res = await this.request<any[]>([{ a: "g", g: 1, n: handle }])
    const data = res[0]
    if (data?.g) {
      return data.g
    }
    throw new Error(`Failed to get download URL for node ${handle}`)
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const pid = parentId || this.rootId
    const attrJson = JSON.stringify({ n: name })
    const attrB64 = wordsToB64(strToWords(`MEGA${attrJson}`))

    const res = await this.request<any[]>([
      {
        a: "p",
        t: pid,
        n: [
          {
            h: "xxxxxxxx",
            t: 1,
            a: attrB64,
            k: "dummy_key",
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
