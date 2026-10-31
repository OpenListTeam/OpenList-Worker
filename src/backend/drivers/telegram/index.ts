// Telegram 驱动：目录索引（index）的**纯逻辑**部分（编解码 / 路径工具 / 哈希）。
// DB 读写在 store.ts —— 拆开是为了让本文件可以在不加载整个 DB 模块的前提下单测。
//
// 为什么索引必须存在 OpenList 自己的 DB 里，而不能存在 Telegram 里：
//
//   Bot API **没有 getMessage**，无法按 message_id 回读任意消息。
//   可用的读取通道只有 getUpdates，而它（a）只保留最近 24 小时，
//   （b）不包含 bot 自己发出的消息。因此把 manifest 写进聊天就再也读不回来，
//   等于数据不可访问。
//
//   K-Vault 之所以能用 Telegram 存储，是因为它把映射关系存在自己的数据库里
//   （functions/utils/telegram.js 的 shouldWriteTelegramMetadata）。
//   本驱动同理：Telegram 只负责存字节，目录结构由本索引负责。
//
// 这样也顺带绕开了聊天消息 4096 字符的文本上限。
//
// 纯逻辑 + DB 读写，不含 Telegram 网络调用，便于单测。

/** 索引结构版本 */
export const INDEX_VERSION = 1

/** 目录条目：目录（无对应 Telegram 消息，纯索引） */
export interface DirEntry {
  /** 条目名 */
  n: string
  /** true = 目录 */
  d: true
  /** Unix 秒 */
  t: number
}

/** 文件条目：真实存在于 Telegram 中的一条消息 */
export interface FileEntry {
  n: string
  d: false
  /** Unix 秒 */
  t: number
  /** 字节数 */
  s: number
  /** 承载文件的消息 id（deleteMessage 用） */
  m: number
  /** Bot API file_id（getFile 用） */
  f: string
}

export type IndexEntry = DirEntry | FileEntry

/** 磁盘上的索引形态：目录路径 → 该目录的直接子项 */
export interface IndexShape {
  v: number
  dirs: Record<string, IndexEntry[]>
}

/** 索引的 settings key 前缀 */
export const INDEX_KEY_PREFIX = "telegram_index_"

/**
 * 由 bot_token + chat_id 派生稳定的存储 key。
 *
 * 同一 chat 被两个 storage 指向时视为同一份数据（索引自然合一）—— 这与
 * Telegram 的实际语义一致，因为消息只存在于那一个聊天里。
 * 只用 token+chat_id，不含 root_path：root_path 是视图，不该分裂索引。
 */
export function indexKey(botToken: string, chatId: string): string {
  return INDEX_KEY_PREFIX + sha256HexSync(`${botToken}|${chatId}`).slice(0, 32)
}

/**
 * 纯 JS SHA-256（同步）。返回小写 hex。
 *
 * 不用 WebCrypto.subtle：它是**异步**的，而 indexKey 需要同步值；也不引入
 * node:crypto —— 本仓库同时跑在 Cloudflare Workers 上。
 */
export function sha256HexSync(input: string): string {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]
  const utf8 = new TextEncoder().encode(input)
  const bitLen = utf8.length * 8
  const withPad = new Uint8Array((((utf8.length + 8) >> 6) + 1) << 6)
  withPad.set(utf8)
  withPad[utf8.length] = 0x80
  const dv = new DataView(withPad.buffer)
  dv.setUint32(withPad.length - 4, bitLen >>> 0, false)
  dv.setUint32(withPad.length - 8, Math.floor(bitLen / 0x100000000), false)

  const w = new Uint32Array(64)
  for (let i = 0; i < withPad.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false)
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j-15],7) ^ rotr(w[j-15],18) ^ (w[j-15] >>> 3)
      const s1 = rotr(w[j-2],17) ^ rotr(w[j-2],19) ^ (w[j-2] >>> 10)
      w[j] = (w[j-16] + s0 + w[j-7] + s1) >>> 0
    }
    let [a,b,c,d,e,f,g,h] = H
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0
    }
    H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0
    H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("")
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

/** 校验条目结构，防止损坏的索引把脏数据带进驱动逻辑 */
export function isValidIndexEntry(e: unknown): e is IndexEntry {
  if (!e || typeof e !== "object") return false
  const o = e as any
  if (typeof o.n !== "string" || o.n.length === 0) return false
  if (typeof o.t !== "number" || !Number.isFinite(o.t)) return false
  if (o.d === true) return true
  if (o.d === false) {
    return (
      typeof o.m === "number" && Number.isSafeInteger(o.m) && o.m > 0 &&
      typeof o.f === "string" && o.f.length > 0 &&
      typeof o.s === "number" && Number.isFinite(o.s) && o.s >= 0
    )
  }
  return false
}

/** 反序列化：容忍损坏 / 旧版本，返回一个可用（可能为空）的索引 */
export function parseIndex(raw: string | undefined | null): IndexShape {
  const empty: IndexShape = { v: INDEX_VERSION, dirs: {} }
  if (!raw) return empty
  let obj: any
  try {
    obj = JSON.parse(raw)
  } catch {
    return empty
  }
  if (!obj || typeof obj !== "object" || obj.v !== INDEX_VERSION) return empty
  const dirs: Record<string, IndexEntry[]> = {}
  const src = obj.dirs
  if (src && typeof src === "object") {
    for (const p of Object.keys(src)) {
      const list = src[p]
      if (!Array.isArray(list)) continue
      dirs[normalizeDirPath(p)] = list.filter(isValidIndexEntry)
    }
  }
  return { v: INDEX_VERSION, dirs }
}

/** 目录路径归一：始终以 / 开头、去掉尾斜杠（根为 ""） */
export function normalizeDirPath(p: string): string {
  const clean = (p || "").split("/").filter(Boolean).join("/")
  return clean ? "/" + clean : ""
}

/** 序列化 */
export function serializeIndex(idx: IndexShape): string {
  return JSON.stringify({ v: INDEX_VERSION, dirs: idx.dirs })
}

/** 读取某目录的直接子项（不存在返回空数组） */
export function childrenOf(idx: IndexShape, dir: string): IndexEntry[] {
  return idx.dirs[normalizeDirPath(dir)] || []
}

/** 覆盖某目录的直接子项 */
export function setChildren(
  idx: IndexShape,
  dir: string,
  entries: IndexEntry[],
): void {
  const p = normalizeDirPath(dir)
  if (entries.length === 0) delete idx.dirs[p]
  else idx.dirs[p] = entries
}

/** 递归收集一个目录及其全部后代的路径 */
export function collectDirPaths(idx: IndexShape, dir: string): string[] {
  const out: string[] = []
  const walk = (p: string) => {
    for (const e of childrenOf(idx, p)) {
      if (!e.d) continue
      const sub = normalizeDirPath(p + "/" + e.n)
      out.push(sub)
      walk(sub)
    }
  }
  walk(normalizeDirPath(dir))
  return out
}