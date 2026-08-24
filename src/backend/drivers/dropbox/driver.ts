import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { DropboxAddition } from "./types"
import { DropboxApiClient } from "./util"

export class DropboxDriver implements StorageDriver {
  private addition: DropboxAddition
  private client: DropboxApiClient

  constructor(
    addition: DropboxAddition,
    onTokenRefreshed?: (tokens: {
      accessToken: string
      refreshToken: string
    }) => Promise<void>,
  ) {
    this.addition = addition
    this.client = new DropboxApiClient(addition, onTokenRefreshed)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "" : s
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const files = await this.client.getFiles(clean)

    const items: FileItem[] = files.map((f) => {
      const isDir = f[".tag"] === "folder"
      const pathDisplay = f.path_display || f.path_lower || `/${f.name}`
      return {
        name: f.name,
        size: f.size || 0,
        is_dir: isDir,
        modified:
          f.server_modified || f.client_modified || new Date().toISOString(),
        sign: f.id || pathDisplay,
        type: calcFileType(f.name, isDir),
        raw_url: "",
      }
    })

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"

    if (!clean) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "/",
        type: 1,
        raw_url: "",
      }
    }

    try {
      const url = await this.client.getTemporaryLink(clean)
      return {
        name,
        size: 0,
        is_dir: false,
        modified: new Date().toISOString(),
        sign: clean,
        type: calcFileType(name, false),
        raw_url: url,
      }
    } catch {
      return {
        name,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: clean,
        type: 1,
        raw_url: "",
      }
    }
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const clean = this.cleanPath(physicalPath)
    const url = await this.client.getTemporaryLink(clean)
    return { url }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    await this.client.createFolder(clean)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const from = this.cleanPath(physicalPath)
    const parent = from.substring(0, from.lastIndexOf("/"))
    const to = parent ? `${parent}/${newName}` : `/${newName}`
    await this.client.move(from, to)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const cleanDir = this.cleanPath(physicalPath)
    for (const name of names) {
      const target = cleanDir === "" ? `/${name}` : `${cleanDir}/${name}`
      await this.client.delete(target)
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const cleanSrc = this.cleanPath(srcPhys)
    const cleanDst = this.cleanPath(dstPhys)
    for (const name of names) {
      const from = cleanSrc === "" ? `/${name}` : `${cleanSrc}/${name}`
      const to = cleanDst === "" ? `/${name}` : `${cleanDst}/${name}`
      await this.client.move(from, to)
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const cleanSrc = this.cleanPath(srcPhys)
    const cleanDst = this.cleanPath(dstPhys)
    for (const name of names) {
      const from = cleanSrc === "" ? `/${name}` : `${cleanSrc}/${name}`
      const to = cleanDst === "" ? `/${name}` : `${cleanDst}/${name}`
      await this.client.copy(from, to)
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    await this.client.request("/2/files/upload", {
      method: "POST",
      isContentApi: true,
      customHeaders: {
        "Dropbox-API-Arg": JSON.stringify({
          path: clean,
          mode: "overwrite",
          autorename: false,
          mute: false,
          strict_conflict: false,
        }),
        "Content-Type": "application/octet-stream",
      },
      body: content,
    })
  }

  async getDetails(): Promise<{ total_space?: number; used_space?: number }> {
    try {
      const usage = await this.client.getSpaceUsage()
      return {
        total_space: usage.allocation?.allocated || 0,
        used_space: usage.used || 0,
      }
    } catch {
      return {}
    }
  }
}
