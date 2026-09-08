// AliDoc (钉钉文档) driver
// Ported from: OpenList-Backends/drivers/alidoc
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { AliDocAddition, AliDocDentry } from "./types"
import { AliDocClient, aliDocApiBase, aliDocUserAgent } from "./util"

export function normalizeAliDocAddition(a: any): AliDocAddition {
  const norm = { ...(a || {}) } as any
  norm.cookie = (norm.cookie || "").trim()
  norm.root_folder_id = (norm.root_folder_id || "").trim()
  return norm as AliDocAddition
}

function dentryToFileItem(d: AliDocDentry): FileItem {
  const isDir = d.dentryType === "folder"
  return {
    name: d.name,
    size: isDir ? 0 : d.fileSize || 0,
    is_dir: isDir,
    modified: d.updatedTime
      ? new Date(d.updatedTime).toISOString()
      : new Date().toISOString(),
    created: d.createdTime ? new Date(d.createdTime).toISOString() : undefined,
    sign: d.dentryUuid,
    type: calcFileType(d.name, isDir),
  }
}

export class AliDocDriver implements StorageDriver {
  private addition: AliDocAddition
  private client: AliDocClient
  // 路径 → dentryUuid 缓存（ID 型网盘驱动需要把名称路径解析成 ID）
  private idCache = new Map<string, string>()

  constructor(addition: any) {
    this.addition = normalizeAliDocAddition(addition)
    this.client = new AliDocClient(this.addition.cookie)
  }

  async init(): Promise<void> {
    if (!this.addition.cookie) throw new Error("cookie is empty")
    if (!this.addition.root_folder_id)
      throw new Error("root folder id is empty")
    await this.client.checkCookie()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private joinPath(parent: string, name: string): string {
    return parent === "/" ? `/${name}` : `${parent}/${name}`
  }

  private async resolveId(path: string): Promise<string> {
    const clean = this.cleanPath(path)
    if (clean === "/") return this.addition.root_folder_id
    const cached = this.idCache.get(clean)
    if (cached) return cached

    const segs = clean.split("/").filter(Boolean)
    let curId = this.addition.root_folder_id
    let curPath = "/"
    for (const seg of segs) {
      const children = await this.client.list(curId)
      const found = children.find(
        (c) => c.name === seg && c.dentryType === "folder",
      )
      if (!found) throw new Error(`folder not found: ${seg}`)
      curId = found.dentryUuid
      curPath = this.joinPath(curPath, seg)
      this.idCache.set(curPath, curId)
    }
    return curId
  }

  /** 解析任意条目（文件或文件夹）的 dentryUuid，末段不限定为文件夹 */
  private async resolveItemId(path: string): Promise<string> {
    const clean = this.cleanPath(path)
    if (clean === "/") return this.addition.root_folder_id
    const cached = this.idCache.get(clean)
    if (cached) return cached

    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const name = clean.split("/").pop() || ""
    const parentId = await this.resolveId(parentPath)
    const children = await this.client.list(parentId)
    const found = children.find((c) => c.name === name)
    if (!found) throw new Error(`item not found: ${name}`)
    this.idCache.set(clean, found.dentryUuid)
    return found.dentryUuid
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const id = await this.resolveId(physicalPath)
    const children = await this.client.list(id)
    const clean = this.cleanPath(physicalPath)

    const items: FileItem[] = children
      .filter((c) => c.dentryUuid && c.name)
      .map((c) => {
        this.idCache.set(this.joinPath(clean, c.name), c.dentryUuid)
        return dentryToFileItem(c)
      })

    return sortFileItems(items, "name", "asc")
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"

    if (clean === "/") {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.addition.root_folder_id,
        type: 1,
      }
    }

    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const parentId = await this.resolveId(parentPath)
    const children = await this.client.list(parentId)
    const found = children.find((c) => c.name === name)
    if (!found) throw new Error("file not found")

    const isDir = found.dentryType === "folder"
    let rawUrl = ""
    if (!isDir) {
      rawUrl = await this.client.download(found.dentryUuid)
    }
    this.idCache.set(clean, found.dentryUuid)

    return {
      ...dentryToFileItem(found),
      raw_url: rawUrl,
      raw_url_headers: {
        "User-Agent": aliDocUserAgent,
        Referer: aliDocApiBase + "/",
        Origin: aliDocApiBase,
      },
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const dirName = clean.split("/").pop() || ""
    const parentId = await this.resolveId(parentPath)
    await this.client.post("/box/api/v2/dentry/createfolder", {
      dentryType: "folder",
      name: dirName,
      parentDentryUuid: parentId,
      conflictHandleStrategy: "auto_rename",
    })
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const id = await this.resolveItemId(physicalPath)
    await this.client.post("/box/api/v2/dentry/rename", {
      dentryUuid: id,
      name: newName,
    })
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcId = await this.resolveItemId(srcPhys)
    const dstParent =
      this.cleanPath(dstPhys).split("/").slice(0, -1).join("/") || "/"
    const dstId = await this.resolveId(dstParent)
    await this.client.post("/box/api/v2/dentry/move", {
      targetParentDentryUuid: dstId,
      sourceDentryUuid: srcId,
      operateFrom: 1,
    })
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcId = await this.resolveItemId(srcPhys)
    const dstParent =
      this.cleanPath(dstPhys).split("/").slice(0, -1).join("/") || "/"
    const dstId = await this.resolveId(dstParent)
    await this.client.post("/box/api/v2/dentry/copy", {
      sourceDentryUuid: srcId,
      targetParentDentryUuid: dstId,
      operateFrom: 1,
      onlyCopyMeta: false,
    })
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const id = await this.resolveItemId(physicalPath)
    await this.client.post("/box/api/v1/dentry/recycle", { dentryUuid: id })
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    throw new Error("AliDoc does not support upload")
  }
}
