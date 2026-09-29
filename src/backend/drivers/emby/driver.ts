// Emby driver
// Ported from: OpenList-Backends/drivers/emby
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { EmbyAddition, EmbyItem } from "./types"
import { EmbyClient } from "./util"

export function normalizeEmbyAddition(a: any): EmbyAddition {
  const norm = { ...(a || {}) } as any
  norm.url = (norm.url || "").trim().replace(/\/+$/, "")
  norm.api_key = (norm.api_key || "").trim()
  norm.user_id = (norm.user_id || "").trim()
  norm.username = (norm.username || "").trim()
  norm.password = (norm.password || "").trim()
  norm.link_method = (norm.link_method || "stream").toLowerCase()
  norm.root_folder_id = (norm.root_folder_id || "").trim() || "1"
  return norm as EmbyAddition
}

function embyItemToFileItem(item: EmbyItem): FileItem {
  return {
    name: item.Name,
    size: item.IsFolder ? 0 : item.Size || 0,
    is_dir: item.IsFolder,
    modified: item.DateCreated
      ? new Date(item.DateCreated).toISOString()
      : new Date().toISOString(),
    sign: item.Id,
    type: calcFileType(item.Name, item.IsFolder),
  }
}

export class EmbyDriver implements StorageDriver {
  private addition: EmbyAddition
  private client: EmbyClient
  private idCache = new Map<string, string>()

  constructor(addition: any) {
    this.addition = normalizeEmbyAddition(addition)
    this.client = new EmbyClient(
      this.addition.url,
      this.addition.api_key,
      this.addition.user_id,
    )
  }

  async init(): Promise<void> {
    if (!this.addition.url) throw new Error("url is required")

    if (this.addition.api_key) {
      if (!this.addition.user_id) {
        throw new Error("user_id is required when api_key is set")
      }
      return
    }

    if (!this.addition.username) {
      throw new Error("please provide api_key+user_id or username(+password)")
    }
    await this.client.login(this.addition.username, this.addition.password)
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
      const resp = await this.client.getItems(curId)
      const found = resp.Items.find((i) => i.Name === seg && i.IsFolder)
      if (!found) throw new Error(`folder not found: ${seg}`)
      curId = found.Id
      curPath = this.joinPath(curPath, seg)
      this.idCache.set(curPath, curId)
    }
    return curId
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const id = await this.resolveId(physicalPath)
    const resp = await this.client.getItems(id)
    const clean = this.cleanPath(physicalPath)

    const items: FileItem[] = resp.Items.map((item) => {
      this.idCache.set(this.joinPath(clean, item.Name), item.Id)
      return embyItemToFileItem(item)
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
    const resp = await this.client.getItems(parentId)
    const found = resp.Items.find((i) => i.Name === name)
    if (!found) throw new Error("file not found")

    const isDir = found.IsFolder
    let rawUrl = ""
    if (!isDir) {
      rawUrl = await this.buildLink(found.Id)
    }
    this.idCache.set(clean, found.Id)

    return {
      ...embyItemToFileItem(found),
      raw_url: rawUrl,
      raw_url_headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    }
  }

  private async buildLink(fileID: string): Promise<string> {
    const useDownload = this.addition.link_method === "download"

    let mediaSourceID = ""
    let mediaContainer = ""
    if (!useDownload) {
      const detail = await this.client.getItemDetail(fileID)
      if (detail && detail.MediaSources?.length) {
        const preferred =
          detail.MediaSources.find((m) => m.Id && m.SupportsDirectStream) ||
          detail.MediaSources.find((m) => m.Id)
        if (preferred) {
          mediaSourceID = preferred.Id
          mediaContainer = preferred.Container
        }
      }
    }

    const u = new URL(this.addition.url)
    if (useDownload) {
      u.pathname = `${u.pathname.replace(/\/+$/, "")}/Items/${encodeURIComponent(fileID)}/Download`
    } else if (mediaContainer) {
      u.pathname = `${u.pathname.replace(/\/+$/, "")}/Videos/${encodeURIComponent(fileID)}/stream.${mediaContainer}`
    } else {
      u.pathname = `${u.pathname.replace(/\/+$/, "")}/Videos/${encodeURIComponent(fileID)}/stream`
    }
    u.searchParams.set("api_key", this.client.token)
    if (mediaSourceID) u.searchParams.set("MediaSourceId", mediaSourceID)
    if (!useDownload) u.searchParams.set("Static", "true")
    return u.toString()
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    throw new Error("Emby is read-only")
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("Emby is read-only")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("Emby is read-only")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("Emby is read-only")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    throw new Error("Emby is read-only")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    throw new Error("Emby is read-only")
  }
}
