// Strm driver — 将底层网盘的视频文件以 .strm 文件形式暴露（.strm 内容为可播放直链 URL）
// 移植自 OpenList Go 版 drivers/strm。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { StrmAddition } from "./types"

interface RemoteTarget {
  driver: StorageDriver
  physical: string
}

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

function getPair(path: string): [string, string] {
  if (path.includes(":")) {
    const idx = path.indexOf(":")
    const k = path.slice(0, idx)
    const v = path.slice(idx + 1)
    if (!k.includes("/")) return [k, v]
  }
  const segs = path.split("/").filter(Boolean)
  return [segs[segs.length - 1] || path, path]
}

function getRootAndPath(path: string): [string, string] {
  const p = String(path || "/").replace(/^\//, "")
  const idx = p.indexOf("/")
  if (idx < 0) return [p, ""]
  return [p.slice(0, idx), p.slice(idx + 1)]
}

export class StrmDriver implements StorageDriver {
  private addition: StrmAddition
  private pathMap = new Map<string, string[]>()
  private remotes = new Map<string, RemoteTarget>()
  private supportSuffix = new Set<string>()
  private downloadSuffix = new Set<string>()
  private autoFlatten = false
  private oneKey = ""

  constructor(addition: StrmAddition) {
    this.addition = addition || {}
  }

  async init(): Promise<void> {
    const paths = this.addition.paths || ""
    if (!paths.trim()) throw new Error("[Strm] paths is required")

    for (const raw of paths.split("\n")) {
      const line = raw.trim()
      if (!line) continue
      const [k, v] = getPair(line)
      if (!this.pathMap.has(k)) this.pathMap.set(k, [])
      this.pathMap.get(k)!.push(v)
    }
    if (this.pathMap.size === 1) {
      this.autoFlatten = true
      this.oneKey = this.pathMap.keys().next().value
    }

    const supportTypes = (
      this.addition.filterFileTypes ||
      "mp4,mkv,flv,avi,wmv,ts,rmvb,webm,mp3,flac,aac,wav,ogg,m4a,wma,alac"
    )
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    this.supportSuffix = new Set(supportTypes)

    const downloadTypes = (
      this.addition.downloadFileTypes || "ass,srt,vtt,sub,strm"
    )
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    this.downloadSuffix = new Set(downloadTypes)

    // 预解析底层 storage（动态 import 避免循环依赖）
    const { resolvePath } = await import("../../internal/model/db")
    const { getDriver } = await import("../../internal/op/storage")
    for (const dsts of this.pathMap.values()) {
      for (const dst of dsts) {
        try {
          const resolved = await resolvePath(dst)
          if (!resolved.isVirtual && resolved.storage) {
            const driver = await getDriver(
              resolved.storage.driver,
              resolved.storage,
            )
            this.remotes.set(dst, {
              driver,
              physical: resolved.physical || "/",
            })
          }
        } catch (e) {
          console.warn(`[Strm] failed to resolve remote path '${dst}':`, e)
        }
      }
    }
  }

  private encodePath(path: string): string {
    return path
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/")
  }

  private getLink(path: string): string {
    let finalPath = path
    if (this.addition.encodePath) finalPath = this.encodePath(path)
    const prefix = this.addition.PathPrefix || "/d"
    finalPath = joinPath(prefix, finalPath)
    if (!finalPath.startsWith("/")) finalPath = "/" + finalPath
    if (this.addition.withoutUrl) return finalPath
    const apiUrl = (this.addition.siteUrl || "").replace(/\/+$/, "")
    return `${apiUrl}${finalPath}`
  }

  private ext(name: string): string {
    const idx = name.lastIndexOf(".")
    return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ""
  }

  private async listRemote(dst: string, sub: string): Promise<FileItem[]> {
    const remote = this.remotes.get(dst)
    if (!remote) return []
    const remotePath = joinPath(remote.physical, sub)
    try {
      return await remote.driver.list("", remotePath)
    } catch {
      return []
    }
  }

  private convert(reqPath: string, items: FileItem[]): FileItem[] {
    const result: FileItem[] = []
    for (const item of items) {
      if (item.is_dir) {
        result.push(item)
        continue
      }
      const e = this.ext(item.name)
      const originalPath = joinPath(reqPath, item.name)
      if (this.downloadSuffix.has(e)) {
        result.push({ ...item, size: item.size })
      } else if (this.supportSuffix.has(e)) {
        const strmName = item.name.replace(/\.[^.]+$/, "") + ".strm"
        result.push({
          name: strmName,
          size: new TextEncoder().encode(this.getLink(originalPath)).length,
          is_dir: false,
          modified: item.modified,
          sign: originalPath, // 保存原始路径，供 get/createReadStream 还原
          thumb: item.thumb || "",
          type: calcFileType(strmName, false),
          raw_url: "",
        })
      }
      // 其他类型跳过
    }
    return result
  }

  async list(_v: string, physicalPath: string): Promise<FileItem[]> {
    const path = physicalPath || "/"
    if (path === "/" && !this.autoFlatten) {
      // 根目录：返回所有映射名作为目录
      const items: FileItem[] = []
      for (const k of this.pathMap.keys()) {
        items.push({
          name: k,
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          sign: "",
          type: 1,
          raw_url: "",
        })
      }
      return items
    }

    const { root, sub } = this.autoFlatten
      ? { root: this.oneKey, sub: path.replace(/^\//, "") }
      : (() => {
          const [r, s] = getRootAndPath(path)
          return { root: r, sub: s }
        })()

    const dsts = this.pathMap.get(root)
    if (!dsts) throw new Error(`[Strm] path not found: ${path}`)

    const merged: FileItem[] = []
    const seen = new Set<string>()
    for (const dst of dsts) {
      const remote = this.remotes.get(dst)
      if (!remote) continue
      const reqPath = joinPath(dst, sub)
      const items = await this.listRemote(dst, sub)
      for (const converted of this.convert(reqPath, items)) {
        if (!seen.has(converted.name)) {
          seen.add(converted.name)
          merged.push(converted)
        }
      }
    }
    return sortFileItems(merged, "name", "asc")
  }

  async get(_v: string, physicalPath: string): Promise<FileItem> {
    const path = physicalPath || "/"
    if (path.endsWith(".strm")) {
      // 虚拟 .strm 文件：从父目录 list 查找原始路径
      const dir = dirname(path)
      const name = basename(path)
      const items = await this.list("", dir)
      const item = items.find((i) => i.name === name)
      if (!item) throw new Error(`[Strm] not found: ${path}`)
      return item
    }

    const { root, sub } = getRootAndPath(path)
    const dsts = this.pathMap.get(root)
    if (!dsts) throw new Error(`[Strm] path not found: ${path}`)
    for (const dst of dsts) {
      const remote = this.remotes.get(dst)
      if (!remote) continue
      const remotePath = joinPath(remote.physical, sub)
      try {
        const item = await remote.driver.get("", remotePath)
        if (item) return item
      } catch {
        // 尝试下一个映射
      }
    }
    throw new Error(`[Strm] not found: ${path}`)
  }

  async mkdir(): Promise<void> {
    throw new Error("[Strm] mkdir is not supported")
  }
  async rename(): Promise<void> {
    throw new Error("[Strm] rename is not supported")
  }
  async remove(): Promise<void> {
    throw new Error("[Strm] remove is not supported")
  }
  async move(): Promise<void> {
    throw new Error("[Strm] move is not supported")
  }
  async copy(): Promise<void> {
    throw new Error("[Strm] copy is not supported")
  }
  async put(): Promise<void> {
    throw new Error("[Strm] put is not supported")
  }

  /** .strm 文件内容：可播放直链 URL */
  async createReadStream(
    physicalPath: string,
  ): Promise<ReadableStream<Uint8Array>> {
    const path = physicalPath || "/"
    const dir = dirname(path)
    const name = basename(path)
    const items = await this.list("", dir)
    const item = items.find((i) => i.name === name)
    if (!item || !item.sign) throw new Error(`[Strm] not found: ${path}`)
    const link = this.getLink(item.sign)
    const bytes = new TextEncoder().encode(link)
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })
  }
}
