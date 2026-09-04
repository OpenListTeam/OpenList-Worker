// Chunk driver — 分片打包存储
// 将大文件按 part_size 切成多个分片，存入底层存储的 `[chunk_prefix]name/` 目录；
// 读取时合并分片为一个虚拟文件。remote_path 指向另一个挂载的存储。
// 移植自 OpenList Go 版 drivers/chunk。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { ChunkAddition, ChunkPart } from "./types"

function joinPath(a: string, b: string): string {
  const left = String(a || "").replace(/\/+$/, "")
  const right = String(b || "").replace(/^\/+/, "")
  if (!left) return "/" + right
  if (!right) return left
  return left + "/" + right
}

function dirname(p: string): string {
  const idx = p.lastIndexOf("/")
  return idx > 0 ? p.slice(0, idx) : "/"
}

function basename(p: string): string {
  return p.split("/").filter(Boolean).pop() || ""
}

export class ChunkDriver implements StorageDriver {
  private addition: ChunkAddition
  private remoteDriver: StorageDriver | null = null
  private remoteRoot = "/"
  private chunkPrefix: string
  private customExt: string
  private partSize: number

  constructor(addition: ChunkAddition) {
    this.addition = addition || {}
    this.chunkPrefix = this.addition.chunk_prefix || "[openlist_chunk]"
    this.customExt = this.addition.custom_ext || ""
    this.partSize = Number(this.addition.part_size) || 0
  }

  async init(): Promise<void> {
    if (this.partSize <= 0) {
      throw new Error("[Chunk] part_size must be positive")
    }
    if (!this.chunkPrefix) {
      throw new Error("[Chunk] chunk_prefix must not be empty")
    }
    // 动态 import 避免循环依赖
    const { resolvePath } = await import("../../internal/model/db")
    const { getDriver } = await import("../../internal/op/storage")
    const resolved = await resolvePath(this.addition.remote_path || "/")
    if (resolved.isVirtual || !resolved.storage) {
      throw new Error(
        `[Chunk] remote_path 未匹配到有效存储: ${this.addition.remote_path}`,
      )
    }
    this.remoteRoot = resolved.physical || "/"
    this.remoteDriver = await getDriver(
      resolved.storage.driver,
      resolved.storage,
    )
  }

  private ensureReady(): void {
    if (!this.remoteDriver) {
      throw new Error("[Chunk] driver not initialized")
    }
  }

  /** chunk 物理路径 → 底层物理路径 */
  private joinRemote(physicalPath: string): string {
    const p = String(physicalPath || "/")
    const base = this.remoteRoot === "/" ? "" : this.remoteRoot
    return (base + p).replace(/\/{2,}/g, "/") || "/"
  }

  private getPartName(part: number): string {
    return `${part}${this.customExt}`
  }

  /** 分片目录底层路径（虚拟文件 → 分片目录） */
  private chunkDirRemote(physicalPath: string): string {
    const dir = dirname(this.joinRemote(physicalPath))
    const name = basename(physicalPath)
    return joinPath(dir, this.chunkPrefix + name)
  }

  /** 列出分片目录，返回有序分片列表（按分片序号） */
  private async listParts(physicalPath: string): Promise<ChunkPart[]> {
    this.ensureReady()
    const chunkDir = this.chunkDirRemote(physicalPath)
    const items = await this.remoteDriver!.list("", chunkDir)
    const parts: ChunkPart[] = []
    for (const item of items) {
      if (item.is_dir) continue
      const idx = parseInt(
        item.name.replace(new RegExp(`${this.customExt}$`), ""),
        10,
      )
      if (Number.isNaN(idx)) continue
      parts[idx] = {
        name: item.name,
        size: item.size,
        modified: item.modified,
        raw_url: item.raw_url || "",
        raw_url_headers: item.raw_url_headers,
      }
    }
    return parts.filter((p) => !!p)
  }

  /** 分片文件总大小（通过分片目录合并计算） */
  private async totalChunkSize(physicalPath: string): Promise<number> {
    const parts = await this.listParts(physicalPath)
    return parts.reduce((sum, p) => sum + p.size, 0)
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    this.ensureReady()
    const remoteDir = this.joinRemote(physicalPath)
    const items = await this.remoteDriver!.list("", remoteDir)

    const result: FileItem[] = []
    const chunkTasks: Promise<void>[] = []
    for (const item of items) {
      if (item.is_dir) {
        if (item.name.startsWith(this.chunkPrefix)) {
          const name = item.name.slice(this.chunkPrefix.length)
          const idx = result.length
          result.push(null as unknown as FileItem)
          chunkTasks.push(
            (async () => {
              const virtualPath2 = joinPath(physicalPath, item.name)
              const size = await this.totalChunkSize(virtualPath2)
              result[idx] = {
                name,
                size,
                is_dir: false,
                modified: item.modified,
                sign: this.chunkPrefix + name,
                type: calcFileType(name, false),
                raw_url: "", // 触发 createReadStream 合并分片
              }
            })(),
          )
          continue
        }
      }
      if (!this.addition.show_hidden && item.name.startsWith(".")) continue
      result.push(item)
    }
    await Promise.all(chunkTasks)
    return result.filter((i) => !!i)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    this.ensureReady()
    const remotePath = this.joinRemote(physicalPath)
    // 先尝试普通文件
    try {
      const item = await this.remoteDriver!.get("", remotePath)
      if (item && !item.is_dir) return item
      if (item) return item
    } catch {
      // 可能是分片文件
    }

    // 分片文件
    const name = basename(physicalPath)
    const size = await this.totalChunkSize(physicalPath)
    const parts = await this.listParts(physicalPath)
    return {
      name,
      size,
      is_dir: false,
      modified: parts[0]?.modified || new Date().toISOString(),
      sign: this.chunkPrefix + name,
      type: calcFileType(name, false),
      raw_url: "",
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    this.ensureReady()
    await this.remoteDriver!.mkdir("", this.joinRemote(physicalPath))
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    this.ensureReady()
    const remotePath = this.joinRemote(physicalPath)
    try {
      await this.remoteDriver!.get("", remotePath)
      await this.remoteDriver!.rename("", remotePath, newName)
    } catch {
      // 分片文件：rename 分片目录
      const dir = dirname(remotePath)
      const chunkDir = joinPath(dir, this.chunkPrefix + basename(physicalPath))
      await this.remoteDriver!.rename("", chunkDir, this.chunkPrefix + newName)
    }
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    this.ensureReady()
    const remotePath = this.joinRemote(physicalPath)
    try {
      await this.remoteDriver!.get("", remotePath)
      await this.remoteDriver!.remove("", remotePath, names)
    } catch {
      await this.remoteDriver!.remove(
        "",
        this.chunkDirRemote(physicalPath),
        names,
      )
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhysical: string,
    dstPhysical: string,
  ): Promise<void> {
    this.ensureReady()
    const srcRemote = this.joinRemote(srcPhysical)
    const dstRemote = this.joinRemote(dstPhysical)
    try {
      await this.remoteDriver!.get("", srcRemote)
      await this.remoteDriver!.move(srcDir, dstDir, names, srcRemote, dstRemote)
    } catch {
      await this.remoteDriver!.move(
        srcDir,
        dstDir,
        names,
        this.chunkDirRemote(srcPhysical),
        joinPath(dstRemote, this.chunkPrefix + basename(srcPhysical)),
      )
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhysical: string,
    dstPhysical: string,
  ): Promise<void> {
    this.ensureReady()
    const srcRemote = this.joinRemote(srcPhysical)
    const dstRemote = this.joinRemote(dstPhysical)
    try {
      await this.remoteDriver!.get("", srcRemote)
      await this.remoteDriver!.copy(srcDir, dstDir, names, srcRemote, dstRemote)
    } catch {
      await this.remoteDriver!.copy(
        srcDir,
        dstDir,
        names,
        this.chunkDirRemote(srcPhysical),
        joinPath(dstRemote, this.chunkPrefix + basename(srcPhysical)),
      )
    }
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    this.ensureReady()
    const size = content.length
    const remotePath = this.joinRemote(physicalPath)

    // 小文件直接透传（不分片）
    if (this.addition.chunk_large_file_only && size <= this.partSize) {
      await this.remoteDriver!.put("", remotePath, content)
      return
    }
    // 空文件或小于分片大小，直接透传
    if (size <= this.partSize) {
      await this.remoteDriver!.put("", remotePath, content)
      return
    }

    // 分片存储
    const chunkDir = this.chunkDirRemote(physicalPath)
    // 创建分片目录（忽略已存在错误）
    try {
      await this.remoteDriver!.mkdir("", chunkDir)
    } catch {
      // 目录可能已存在
    }

    let offset = 0
    let partIndex = 0
    while (offset < size) {
      const end = Math.min(offset + this.partSize, size)
      const partContent = content.subarray(offset, end)
      const partPath = joinPath(chunkDir, this.getPartName(partIndex))
      await this.remoteDriver!.put("", partPath, Buffer.from(partContent))
      offset = end
      partIndex++
    }
  }

  /** 合并分片下载，支持 Range */
  async createReadStream(
    physicalPath: string,
    range?: { start: number; end: number },
  ): Promise<ReadableStream<Uint8Array>> {
    this.ensureReady()
    const parts = await this.listParts(physicalPath)
    const totalSize = parts.reduce((sum, p) => sum + p.size, 0)
    const remoteDriver = this.remoteDriver
    const chunkPrefix = this.chunkPrefix

    let skip = range?.start ?? 0
    let remaining = range ? range.end - range.start + 1 : totalSize

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        for (const part of parts) {
          const partSize = part.size
          if (skip >= partSize) {
            skip -= partSize
            continue
          }
          let url = part.raw_url
          if (!url) {
            // 尝试重新获取该分片的下载链接
            const dir = dirname(physicalPath)
            const partPath = joinPath(
              joinPath(dir, chunkPrefix + basename(physicalPath)),
              part.name,
            )
            try {
              const item = await remoteDriver!.get("", partPath)
              url = item.raw_url || ""
            } catch {
              url = ""
            }
          }
          if (!url) {
            controller.error(
              new Error(
                `[Chunk] failed to resolve download url for ${part.name}`,
              ),
            )
            return
          }
          const resp = await fetch(url, {
            headers: part.raw_url_headers || {},
          })
          if (!resp.ok) {
            controller.error(
              new Error(
                `[Chunk] download part ${part.name} failed: HTTP ${resp.status}`,
              ),
            )
            return
          }
          const buf = new Uint8Array(await resp.arrayBuffer())
          let slice = buf
          if (skip > 0) {
            slice = slice.subarray(skip)
            skip = 0
          }
          if (remaining >= 0 && slice.length > remaining) {
            slice = slice.subarray(0, remaining)
          }
          if (slice.length > 0) controller.enqueue(slice)
          if (remaining >= 0) {
            remaining -= slice.length
            if (remaining <= 0) break
          }
        }
        controller.close()
      },
    })
    return stream
  }
}
