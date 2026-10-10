// Telegram 网盘驱动
//
// 模型：一个 Telegram 聊天（group / supergroup / channel）就是一个平铺的消息池，
// 每条文件消息对应一个文件。Telegram Bot API **无法列举消息**（无 getMessage，
// getUpdates 只留 24h 且不含 bot 自己发的消息），因此目录结构完全由 OpenList
// 侧维护的索引记录 —— 见 index.ts 的说明。
//
// 下载：不返回 raw_url。Telegram 的文件直链有效期至少 1 小时且不可控，
// 缓存进索引必然过期，因此实现 createReadStream，在请求发生时才调用 getFile
// 换取新鲜直链，并透传 Range（raw.ts 已负责 206/Content-Range 头）。
//
// Bot API 硬限制（无法绕过，写在错误信息里告知用户）：
//   上传 ≤ 50MB（sendDocument）
//   下载 ≤ 20MB（getFile 只对 ≤20MB 的文件返回 file_path）

import type { FileItem, StorageDriver } from "../../internal/driver/base"
import { calcFileType } from "../../internal/driver/base"
import type { DriverTelegramAddition } from "./types"
import {
  ClientTelegram,
  MAX_DOWNLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  TelegramApiError,
} from "./util"
import type {
  FileEntry,
  IndexEntry,
  IndexShape,
} from "./index"
import {
  childrenOf,
  collectDirPaths,
  indexKey,
  normalizeDirPath,
  setChildren,
} from "./index"
import { loadIndex, saveIndex } from "./store"

/** 索引存储抽象：默认落 DB；测试可注入内存实现（构造注入，非测试专用全局钩子） */
export interface IndexStore {
  load(key: string): Promise<IndexShape>
  save(key: string, idx: IndexShape): Promise<void>
}

const defaultStore: IndexStore = {
  load: (key) => loadIndex(key),
  save: (key, idx) => saveIndex(key, idx),
}

export class DriverTelegram implements StorageDriver {
  private client: ClientTelegram
  private store: IndexStore
  /** 索引在 DB 中的 key，由 bot_token + chat_id 派生 */
  private key: string
  /** root_path 前缀（视图层），"" 表示直接使用聊天根 */
  private prefix: string

  constructor(addition: DriverTelegramAddition, store: IndexStore = defaultStore) {
    this.client = new ClientTelegram(addition)
    this.store = store
    this.key = indexKey(addition.bot_token || "", String(addition.chat_id || ""))
    this.prefix = normalizeDirPath(addition.root_path || "")
  }

  async init(): Promise<void> {
    this.client.init()
    // 校验 token/chat 确实可用，并确保索引行存在。
    // verifyChatAccess 用 getChat 明确「chat not found」，把配置错误挡在绑定阶段。
    await this.client.getMe()
    await this.client.verifyChatAccess()
    const idx = await this.store.load(this.key)
    await this.store.save(this.key, idx)
  }

  // ---------- 路径 ----------

  /** physicalPath → 索引内的逻辑路径（剥掉 root_path 前缀） */
  private logical(physicalPath: string): string {
    const p = normalizeDirPath(physicalPath)
    if (!this.prefix) return p
    if (p === this.prefix) return ""
    if (p.startsWith(this.prefix + "/")) return p.slice(this.prefix.length)
    // 不在 root_path 前缀内：这是配置错误，必须显式报错而不是静默返回空目录
    throw new Error(
      `[Telegram] 路径 ${physicalPath} 不在 root_path ${this.prefix} 范围内`,
    )
  }

  /** 逻辑路径 → physicalPath（拼回 root_path 前缀） */
  private physical(logicalPath: string): string {
    const l = normalizeDirPath(logicalPath)
    if (!this.prefix) return l || "/"
    return normalizeDirPath(this.prefix + "/" + l) || this.prefix
  }

  private logicalDirOf(physicalPath: string): string {
    const l = this.logical(physicalPath)
    const i = l.lastIndexOf("/")
    return i <= 0 ? "" : l.slice(0, i)
  }

  private nameOf(physicalPath: string): string {
    const l = normalizeDirPath(this.logical(physicalPath))
    const i = l.lastIndexOf("/")
    return l.slice(i + 1)
  }

  // ---------- 索引 ----------

  /** 每次写操作前重载，避免用陈旧快照覆盖他人写入 */
  private async fresh(): Promise<IndexShape> {
    return this.store.load(this.key)
  }

  private async persist(idx: IndexShape): Promise<void> {
    await this.store.save(this.key, idx)
  }

  private async findEntry(
    idx: IndexShape,
    logicalDir: string,
    name: string,
  ): Promise<IndexEntry | undefined> {
    return childrenOf(idx, logicalDir).find((e) => e.n === name)
  }

  // ---------- StorageDriver ----------

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const dir = this.logical(physicalPath)
    const idx = await this.fresh()
    const children = childrenOf(idx, dir)
    return children
      .map((e) => this.toFileItem(e, dir))
      .sort((a, b) => {
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const dir = this.logicalDirOf(physicalPath)
    const name = this.nameOf(physicalPath)
    const idx = await this.fresh()

    // 根目录本身
    if (!name || dir === "/" && !name) {
      return {
        name: name || "/",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    }
    // 目录：存在即返回
    const asDir = await this.findEntry(idx, dir, name)
    if (asDir?.d) {
      return {
        name,
        size: 0,
        is_dir: true,
        modified: new Date(asDir.t * 1000).toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    }
    const e = await this.findEntry(idx, dir, name)
    if (e && !e.d) return this.toFileItem(e, dir)

    throw new Error(`[Telegram] 条目不存在: ${physicalPath}`)
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const dir = this.logicalDirOf(physicalPath)
    const name = this.nameOf(physicalPath)
    if (!name) throw new Error("[Telegram] 目录名不能为空")
    this.assertName(name)

    const idx = await this.fresh()
    if (await this.findEntry(idx, dir, name)) {
      throw new Error(`[Telegram] 已存在同名条目: ${name}`)
    }
    // 目录本身不占 Telegram 消息，仅存在于索引
    setChildren(idx, dir, [
      ...childrenOf(idx, dir),
      { n: name, d: true, t: unixNow() },
    ])
    await this.persist(idx)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    this.assertName(newName)
    const dir = this.logicalDirOf(physicalPath)
    const oldName = this.nameOf(physicalPath)
    const idx = await this.fresh()
    const entry = await this.findEntry(idx, dir, oldName)
    if (!entry) throw new Error(`[Telegram] 条目不存在: ${oldName}`)
    if (await this.findEntry(idx, dir, newName)) {
      throw new Error(`[Telegram] 目标已存在: ${newName}`)
    }

    const next = childrenOf(idx, dir).map((e) =>
      e.n === oldName ? ({ ...e, n: newName } as IndexEntry) : e,
    )
    setChildren(idx, dir, next)

    // 目录改名：所有后代路径都要跟着改
    if (entry.d) {
      const oldBase = normalizeDirPath(dir + "/" + oldName)
      const newBase = normalizeDirPath(dir + "/" + newName)
      // 先收集后代，再统一搬运：
      // 若先搬走 oldBase 自身的 children，collectDirPaths(idx, oldBase) 就找不到入口了。
      const descendants = collectDirPaths(idx, oldBase)
      // 目录自身的 children 键也要搬；否则 rename 后新名字下的内容会是空的。
      // 空目录在索引里不留痕，所以只有确实有子项时才存在这个键。
      if (idx.dirs[oldBase]) {
        idx.dirs[newBase] = idx.dirs[oldBase]
        delete idx.dirs[oldBase]
      }
      for (const p of descendants) {
        const moved = newBase + p.slice(oldBase.length)
        idx.dirs[moved] = idx.dirs[p]
        delete idx.dirs[p]
      }
    }
    await this.persist(idx)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    // physicalPath 是 names 的**父目录**（见 op/storage.ts removeItems 调用点）
    const dir = this.logical(physicalPath)
    const idx = await this.fresh()

    // 先收集要删的 Telegram 消息 id，再统一改索引 —— 避免边遍历边改
    const messageIds: number[] = []
    for (const name of names) {
      const entry = childrenOf(idx, dir).find((e) => e.n === name)
      if (!entry) continue
      if (entry.d) {
        const base = normalizeDirPath(dir + "/" + name)
        for (const p of [base, ...collectDirPaths(idx, base)]) {
          for (const e of childrenOf(idx, p)) {
            if (!e.d) messageIds.push((e as FileEntry).m)
          }
          delete idx.dirs[p]
        }
      } else {
        messageIds.push(entry.m)
      }
    }

    const removing = new Set(names)
    setChildren(
      idx,
      dir,
      childrenOf(idx, dir).filter((e) => !removing.has(e.n)),
    )
    await this.persist(idx)

    // 索引已落地（文件不再可见），Telegram 侧清理失败不应回滚
    await this.deleteMessages(messageIds)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    names: string[],
    srcPhysical: string,
    dstPhysical: string,
  ): Promise<void> {
    await this.copy(_srcDir, dstDir, names, srcPhysical, dstPhysical)
    await this.remove("", srcPhysical, names)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    // srcPhysical / dstPhysical 都是 names 的**父目录**（见 op/storage.ts copyItems 调用点）
    const sdir = this.logical(srcPhysical)
    const ddir = this.logical(dstDir)
    const idx = await this.fresh()

    // 先完成所有网络操作，再统一改索引：中途失败不会留下半截状态
    const copies: Array<{
      srcPath: string
      name: string
      size: number
      msgId: number
      fileId: string
    }> = []
    const newTop: IndexEntry[] = []

    for (const name of names) {
      const entry = childrenOf(idx, sdir).find((e) => e.n === name)
      if (!entry) throw new Error(`[Telegram] 条目不存在: ${name}`)
      const clash =
        childrenOf(idx, ddir).some((e) => e.n === name) ||
        newTop.some((e) => e.n === name)
      if (clash) throw new Error(`[Telegram] 目标已存在同名条目: ${name}`)

      if (entry.d) {
        newTop.push({ n: name, d: true, t: unixNow() })
        // 目录内的文件也必须真正复制字节，目录本身只是索引节点
        const srcBase = normalizeDirPath(sdir + "/" + name)
        for (const p of [srcBase, ...collectDirPaths(idx, srcBase)]) {
          for (const e of childrenOf(idx, p)) {
            if (e.d) continue
            const fe = e as FileEntry
            copies.push({
              srcPath: p,
              name: fe.n,
              size: fe.s,
              ...(await this.copyFile(fe.m)),
            })
          }
        }
      } else {
        const fe = entry as FileEntry
        copies.push({
          srcPath: sdir,
          name: fe.n,
          size: fe.s,
          ...(await this.copyFile(fe.m)),
        })
      }
    }

    // 重建子树结构（显式重建每个目录节点，空目录必须保留 —— setChildren([]) 会删键）
    const fresh = new Map<string, { m: number; f: string }>()
    for (const c of copies) {
      let targetDir: string
      if (c.srcPath === sdir) targetDir = ddir
      else {
        const top = names.find((n) =>
          c.srcPath === normalizeDirPath(sdir + "/" + n) ||
          c.srcPath.startsWith(normalizeDirPath(sdir + "/" + n) + "/"),
        )
        if (!top) continue
        const srcBase = normalizeDirPath(sdir + "/" + top)
        targetDir = normalizeDirPath(
          normalizeDirPath(ddir + "/" + top) + c.srcPath.slice(srcBase.length),
        )
      }
      fresh.set(targetDir + "/" + c.name, {
        m: c.msgId,
        f: c.fileId,
      })
    }
    for (const name of names) {
      const entry = childrenOf(idx, sdir).find((e) => e.n === name)
      if (!entry?.d) continue
      const srcBase = normalizeDirPath(sdir + "/" + name)
      const dstBase = normalizeDirPath(ddir + "/" + name)
      this.cloneSubtree(idx, srcBase, dstBase, fresh)
    }

    // 顶层被复制的文件：cloneSubtree 只处理目录子树，单文件必须在这里并入。
    const topFiles: IndexEntry[] = copies
      .filter((c) => c.srcPath === sdir)
      .map((c) => ({
        n: c.name,
        d: false,
        t: unixNow(),
        s: c.size,
        m: c.msgId,
        f: c.fileId,
      }))

    setChildren(idx, ddir, [...childrenOf(idx, ddir), ...newTop, ...topFiles])
    await this.persist(idx)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const dir = this.logicalDirOf(physicalPath)
    const name = this.nameOf(physicalPath)
    if (!name) throw new Error("[Telegram] 文件名不能为空")
    this.assertName(name)
    if (content.byteLength > MAX_UPLOAD_BYTES) {
      throw new TelegramApiError(
        "sendDocument",
        `文件 ${content.byteLength} 字节超过 Bot API 上传上限 ${MAX_UPLOAD_BYTES} 字节（50MB）`,
      )
    }

    const msg = await this.client.sendDocument(name, content)
    const file = ClientTelegram.pickFileId(msg)
    if (!file) {
      throw new TelegramApiError(
        "sendDocument",
        "Telegram 已接收消息但未返回可用的 file_id",
      )
    }

    const idx = await this.fresh()
    const existing = childrenOf(idx, dir).find((e) => e.n === name)
    if (existing && !existing.d) {
      // 同名覆盖：删掉旧消息，避免留下无主孤儿
      await this.deleteMessages([existing.m])
      setChildren(
        idx,
        dir,
        childrenOf(idx, dir).filter((e) => e.n !== name),
      )
    } else if (existing) {
      throw new TelegramApiError("sendDocument", `已存在同名目录: ${name}`)
    }

    setChildren(idx, dir, [
      ...childrenOf(idx, dir),
      {
        n: name,
        d: false,
        t: unixNow(),
        s: content.byteLength,
        m: msg.message_id,
        f: file.file_id,
      } as FileEntry,
    ])
    await this.persist(idx)
  }

  /**
   * 按需下载：请求时才换新鲜直链，并透传 Range。
   * raw.ts 会在拿到 stream 后自己设置 206 / Content-Range / Content-Length。
   */
  async createReadStream(
    physicalPath: string,
    options?: { start?: number; end?: number },
  ): Promise<any> {
    const dir = this.logicalDirOf(physicalPath)
    const name = this.nameOf(physicalPath)
    const idx = await this.fresh()
    const entry = await this.findEntry(idx, dir, name)
    if (!entry || entry.d) {
      throw new Error(`[Telegram] 文件不存在: ${physicalPath}`)
    }
    const f = entry as FileEntry
    if (f.s > MAX_DOWNLOAD_BYTES) {
      throw new TelegramApiError(
        "getFile",
        `文件 ${f.s} 字节超过 Bot API 下载上限 ${MAX_DOWNLOAD_BYTES} 字节（20MB）。` +
          `Telegram Bot API 无法下载该文件。`,
      )
    }

    const { url } = await this.client.resolveDownload(f.f)
    const headers: Record<string, string> = {}
    if (options?.start !== undefined || options?.end !== undefined) {
      const start = options.start ?? 0
      const end = options.end ?? f.s - 1
      headers.Range = `bytes=${start}-${end}`
    }
    const resp = await fetch(url, { headers })
    if (!resp.ok && resp.status !== 206) {
      throw new TelegramApiError(
        "download",
        `下载失败（HTTP ${resp.status}）。若为 404，通常是 Telegram 直链已过期，` +
          `请重试。`,
      )
    }
    return resp.body
  }

  // ---------- 内部工具 ----------

  private toFileItem(e: IndexEntry, _parentDir: string): FileItem {
    const modified = new Date(e.t * 1000).toISOString()
    if (e.d) {
      return {
        name: e.n,
        size: 0,
        is_dir: true,
        modified,
        sign: "",
        type: 1,
        raw_url: "",
      }
    }
    const f = e as FileEntry
    return {
      name: f.n,
      size: f.s,
      is_dir: false,
      modified,
      sign: String(f.m),
      type: calcFileType(f.n, false),
      // 不返回 raw_url：Telegram 直链会过期，改走 createReadStream 按需取
      raw_url: "",
      raw_url_error:
        f.s > MAX_DOWNLOAD_BYTES
          ? `文件 ${f.s} 字节超过 Telegram Bot API 下载上限 ${MAX_DOWNLOAD_BYTES} 字节（20MB），无法下载。`
          : undefined,
    }
  }

  /** 在 Telegram 侧复制一条文件消息，返回新的 message_id / file_id */
  private async copyFile(messageId: number): Promise<{
    msgId: number
    fileId: string
  }> {
    const copied = await this.client.copyMessage(messageId)
    const file = ClientTelegram.pickFileId(copied)
    if (!file) {
      throw new TelegramApiError("copyMessage", "复制失败：未取得 file_id")
    }
    return { msgId: copied.message_id, fileId: file.file_id }
  }

  /**
   * 把 srcDir 的整棵子树复制到 dstDir（含空目录），文件条目改用已复制出的
   * message_id / file_id。纯内存操作，调用方负责最后统一持久化。
   */
  private cloneSubtree(
    idx: IndexShape,
    srcDir: string,
    dstDir: string,
    fileMap: Map<string, { m: number; f: string }>,
  ): void {
    setChildren(
      idx,
      dstDir,
      childrenOf(idx, srcDir).map((e) => {
        if (e.d) return { ...e } as IndexEntry
        const fe = e as FileEntry
        const got = fileMap.get(dstDir + "/" + fe.n)
        if (!got) return { ...fe } as IndexEntry
        return {
          n: fe.n,
          d: false,
          t: unixNow(),
          s: fe.s,
          m: got.m,
          f: got.f,
        } as FileEntry
      }),
    )
    for (const e of childrenOf(idx, srcDir)) {
      if (!e.d) continue
      this.cloneSubtree(
        idx,
        normalizeDirPath(srcDir + "/" + e.n),
        normalizeDirPath(dstDir + "/" + e.n),
        fileMap,
      )
    }
  }

  /** 删除消息；单条失败不阻断整体删除（文件已从索引移除即视为删除成功） */
  private async deleteMessages(ids: number[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.client.deleteMessage(id)
      } catch (e) {
        // 消息可能已被人工删除；索引仍需保持干净
        if (e instanceof TelegramApiError) continue
        throw e
      }
    }
  }

  /** 拒绝会让路径语义混乱的名字 */
  private assertName(name: string): void {
    if (!name || name === "." || name === "..") {
      throw new Error(`[Telegram] 非法名称: ${JSON.stringify(name)}`)
    }
    if (name.includes("/") || name.includes("\0")) {
      throw new Error("[Telegram] 名称不能包含 / 或空字符")
    }
    if (name.length > 200) {
      throw new Error("[Telegram] 名称过长（上限 200 字符）")
    }
  }
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000)
}