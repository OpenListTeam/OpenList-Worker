// 189 Cloud Drive (天翼云盘) driver
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/189
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { Cloud189Addition, FileItem189, FolderItem189 } from "./types"
import { Pan189Client } from "./util"

const SUBREQUEST_LIMIT = 45

function parse189Date(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return new Date().toISOString()
}

function pan189FolderToFileItem(folder: FolderItem189): FileItem {
  return {
    name: folder.name,
    size: 0,
    is_dir: true,
    modified: parse189Date(folder.lastOpTime),
    sign: String(folder.id),
    type: 1,
    thumb: "",
    raw_url: "",
  }
}

function pan189FileToFileItem(file: FileItem189): FileItem {
  return {
    name: file.name,
    size: file.size || 0,
    is_dir: false,
    modified: parse189Date(file.lastOpTime),
    sign: String(file.id),
    type: calcFileType(file.name, false),
    thumb: file.icon?.smallUrl || file.icon?.largeUrl || "",
    raw_url: "",
  }
}

export function normalizeCloud189Addition(a: any): Cloud189Addition {
  const norm = { ...(a || {}) } as any
  norm.username = norm.username || ""
  norm.password = norm.password || ""
  norm.cookie = (norm.cookie || "").trim()
  norm.root_folder_id = norm.root_folder_id || "-11"
  norm.order_by = norm.order_by || "lastOpTime"
  norm.order_direction = norm.order_direction || "desc"
  return norm as Cloud189Addition
}

export class Cloud189Driver implements StorageDriver {
  private client: Pan189Client
  private addition: Cloud189Addition
  /** cache: physical path -> folderId (string) */
  private pathIdCache = new Map<string, string>()
  /** CF Workers subrequest budget */
  private budget = { used: 0, limit: SUBREQUEST_LIMIT }

  constructor(
    addition: Cloud189Addition,
    onCookieUpdate?: (cookie: string) => void,
  ) {
    this.addition = normalizeCloud189Addition(addition)
    this.client = new Pan189Client(this.addition, onCookieUpdate)
  }

  async init(): Promise<void> {
    await this.client.login()
    await this.client.validateRoot(this.client.getRootId())
  }

  /**
   * 将 physicalPath 解析为对应的 folderId。
   * 逐级向下解析并缓存路径 ID 映射。
   */
  private async resolveFolderId(physicalPath: string): Promise<string> {
    const rootId = this.client.getRootId()
    const clean =
      "/" +
      String(physicalPath || "")
        .split("/")
        .filter(Boolean)
        .join("/")

    if (clean === "/" || clean === `/${rootId}`) {
      return rootId
    }

    const segs = clean.split("/").filter(Boolean)
    let cachedLen = 0
    let parentId = rootId
    let prefix = ""

    for (let i = 0; i < segs.length; i++) {
      const p = "/" + segs.slice(0, i + 1).join("/")
      const id = this.pathIdCache.get(p)
      if (id !== undefined) {
        parentId = id
        cachedLen = i + 1
        prefix = p
      } else {
        break
      }
    }

    for (let i = cachedLen; i < segs.length; i++) {
      const rawName = segs[i]
      const decodedName = (() => {
        try {
          return decodeURIComponent(rawName)
        } catch {
          return rawName
        }
      })()

      const { folders } = await this.client.getFiles(parentId, {
        findName: decodedName,
        findIsDir: true,
        budget: this.budget,
      })

      const folder = folders.find(
        (f) =>
          f.name === rawName ||
          f.name === decodedName ||
          String(f.id) === rawName ||
          String(f.id) === decodedName,
      )
      if (!folder) {
        throw new Error(`[189Cloud] 目录未找到: ${rawName}`)
      }

      parentId = String(folder.id)
      prefix = "/" + segs.slice(0, i + 1).join("/")
      this.pathIdCache.set(prefix, parentId)
    }

    return parentId
  }

  /**
   * 将 physicalPath 解析为对应的文件对象及其父目录 ID
   */
  private async resolveFile(physicalPath: string): Promise<{
    file: FileItem189 | FolderItem189
    parentId: string
    isDir: boolean
  }> {
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    if (segs.length === 0) throw new Error("[189Cloud] 路径无效")

    const rawName = segs[segs.length - 1]
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName)
      } catch {
        return rawName
      }
    })()
    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parentId = await this.resolveFolderId(parentPath)

    const { files, folders } = await this.client.getFiles(parentId, {
      findName: decodedName,
      budget: this.budget,
    })

    const file = files.find(
      (f) =>
        f.name === rawName ||
        f.name === decodedName ||
        String(f.id) === rawName ||
        String(f.id) === decodedName,
    )
    if (file) {
      return { file, parentId, isDir: false }
    }

    const folder = folders.find(
      (f) =>
        f.name === rawName ||
        f.name === decodedName ||
        String(f.id) === rawName ||
        String(f.id) === decodedName,
    )
    if (folder) {
      return { file: folder, parentId, isDir: true }
    }

    throw new Error(`[189Cloud] 文件或目录未找到: ${rawName}`)
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    this.budget.used = 0
    const folderId = await this.resolveFolderId(physicalPath)
    const { files, folders } = await this.client.getFiles(folderId, {
      budget: this.budget,
    })

    const items: FileItem[] = [
      ...folders.map(pan189FolderToFileItem),
      ...files.map(pan189FileToFileItem),
    ]

    return sortFileItems(
      items,
      this.addition.order_by === "filename"
        ? "file_name"
        : this.addition.order_by === "fileSize"
          ? "size"
          : "updated_at",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)

    if (
      segs.length === 0 ||
      segs[segs.length - 1] === this.client.getRootId()
    ) {
      const rootId = this.client.getRootId()
      return {
        name: rootId,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: rootId,
        type: 1,
        raw_url: "",
      }
    }

    const { file, isDir } = await this.resolveFile(physicalPath)
    if (isDir) {
      return pan189FolderToFileItem(file as FolderItem189)
    }

    const item = pan189FileToFileItem(file as FileItem189)
    try {
      item.raw_url = await this.client.getDownloadUrl(String(file.id))
    } catch (e: any) {
      console.warn(`[189Cloud] 获取 ${file.name} 下载地址失败:`, e.message)
    }
    return item
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    const dirName = segs.pop() || "新文件夹"
    const parentPath = "/" + segs.join("/")
    const parentId = await this.resolveFolderId(parentPath)
    await this.client.mkdir(parentId, dirName)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(physicalPath)
    await this.client.rename(String(file.id), isDir, newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(physicalPath)
    await this.client.remove(String(file.id), isDir, file.name)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(srcPhysical)
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.move(String(file.id), isDir, file.name, targetParentId)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file, isDir } = await this.resolveFile(srcPhysical)
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.copy(String(file.id), isDir, file.name, targetParentId)
  }

  async put(): Promise<void> {
    throw new Error(
      "[189Cloud] Cloudflare Worker 环境暂不支持直接流式写入，请使用客户端或网页端进行大文件上传",
    )
  }
}
