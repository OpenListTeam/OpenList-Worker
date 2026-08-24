import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  MediatrackAddition,
  MediatrackFile,
  MediatrackUploadResp,
} from "./types"
import { MediatrackApiClient } from "./util"

export class MediatrackDriver implements StorageDriver {
  private addition: MediatrackAddition
  private client: MediatrackApiClient
  private rootId: string = ""
  private idCache: Map<string, string> = new Map()

  constructor(addition: MediatrackAddition) {
    this.addition = addition
    this.rootId = addition.root_folder_id || ""
    this.client = new MediatrackApiClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "" : s
  }

  private async resolveParentId(physicalPath: string): Promise<string> {
    const clean = this.cleanPath(physicalPath)
    if (!clean) return this.rootId

    if (this.idCache.has(clean)) {
      return this.idCache.get(clean)!
    }

    const parts = clean.split("/").filter(Boolean)
    let currentId = this.rootId
    let currentPath = ""

    for (const part of parts) {
      currentPath += "/" + part
      if (this.idCache.has(currentPath)) {
        currentId = this.idCache.get(currentPath)!
        continue
      }

      const files = await this.client.getFiles(currentId)
      const found = files.find((f) => f.title === part)
      if (!found) {
        throw new Error(`Path not found: ${currentPath}`)
      }
      currentId = found.id
      this.idCache.set(currentPath, currentId)
    }

    return currentId
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const parentId = await this.resolveParentId(physicalPath)
    const files = await this.client.getFiles(parentId)
    const cleanParent = this.cleanPath(physicalPath)

    const items: FileItem[] = files.map((f) => {
      const isDir = !f.file
      const filePath = cleanParent ? `${cleanParent}/${f.title}` : `/${f.title}`
      this.idCache.set(filePath, f.id)

      let thumb = ""
      if (f.file && f.file.cover) {
        thumb = "https://nano.mtres.cn/" + f.file.cover
      }

      return {
        name: f.title,
        size: parseInt(f.size || "0", 10) || 0,
        is_dir: isDir,
        created: f.created_at,
        modified: f.updated_at || new Date().toISOString(),
        sign: f.id,
        type: calcFileType(f.title, isDir),
        thumb,
        raw_url: "",
      }
    })

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_desc ? "desc" : "asc",
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").pop() || "root"

    if (!clean) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.rootId,
        type: 1,
        raw_url: "",
      }
    }

    const parentPath = clean.split("/").slice(0, -1).join("/")
    const parentId = await this.resolveParentId(parentPath)
    const files = await this.client.getFiles(parentId)
    const found = files.find((f) => f.title === name)

    if (!found) {
      return {
        name,
        size: 0,
        is_dir: false,
        modified: new Date().toISOString(),
        sign: "",
        type: 0,
        raw_url: "",
      }
    }

    const isDir = !found.file
    let rawUrl = ""
    if (!isDir) {
      try {
        rawUrl = await this.client.getDownloadUrl(found.id)
      } catch (e) {
        console.warn("[MediaTrack] get download URL failed:", e)
      }
    }

    let thumb = ""
    if (found.file && found.file.cover) {
      thumb = "https://nano.mtres.cn/" + found.file.cover
    }

    return {
      name: found.title,
      size: parseInt(found.size || "0", 10) || 0,
      is_dir: isDir,
      created: found.created_at,
      modified: found.updated_at || new Date().toISOString(),
      sign: found.id,
      type: calcFileType(found.title, isDir),
      thumb,
      raw_url: rawUrl,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/")
    const dirName = clean.split("/").pop() || ""
    const parentId = await this.resolveParentId(parentPath)

    await this.client.request(
      `https://jayce.api.mediatrack.cn/v3/assets/${encodeURIComponent(parentId)}/children`,
      {
        method: "POST",
        body: {
          type: 1,
          title: dirName,
        },
      },
    )
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const assetId = await this.resolveParentId(physicalPath)
    await this.client.request(
      `https://jayce.api.mediatrack.cn/v3/assets/${encodeURIComponent(assetId)}`,
      {
        method: "PUT",
        body: {
          title: newName,
        },
      },
    )

    const clean = this.cleanPath(physicalPath)
    this.idCache.delete(clean)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const parentId = await this.resolveParentId(physicalPath)
    const files = await this.client.getFiles(parentId)
    const ids: string[] = []

    for (const name of names) {
      const match = files.find((f) => f.title === name)
      if (match) {
        ids.push(match.id)
      }
    }

    if (ids.length === 0) return

    await this.client.request(
      "https://jayce.api.mediatrack.cn/v4/assets/batch/delete",
      {
        method: "DELETE",
        body: {
          origin_id: parentId,
          ids,
        },
      },
    )

    const clean = this.cleanPath(physicalPath)
    for (const name of names) {
      this.idCache.delete(clean ? `${clean}/${name}` : `/${name}`)
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcParentId = await this.resolveParentId(srcPhys)
    const dstParentId = await this.resolveParentId(dstPhys)
    const srcFiles = await this.client.getFiles(srcParentId)
    const ids: string[] = []

    for (const name of names) {
      const match = srcFiles.find((f) => f.title === name)
      if (match) {
        ids.push(match.id)
      }
    }

    if (ids.length === 0) return

    await this.client.request(
      "https://jayce.api.mediatrack.cn/v4/assets/batch/move",
      {
        method: "POST",
        body: {
          parent_id: dstParentId,
          ids,
        },
      },
    )
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcParentId = await this.resolveParentId(srcPhys)
    const dstParentId = await this.resolveParentId(dstPhys)
    const srcFiles = await this.client.getFiles(srcParentId)
    const ids: string[] = []

    for (const name of names) {
      const match = srcFiles.find((f) => f.title === name)
      if (match) {
        ids.push(match.id)
      }
    }

    if (ids.length === 0) return

    await this.client.request(
      "https://jayce.api.mediatrack.cn/v4/assets/batch/clone",
      {
        method: "POST",
        body: {
          parent_id: dstParentId,
          ids,
        },
      },
    )
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/")
    const fileName = clean.split("/").pop() || "upload"
    const parentId = await this.resolveParentId(parentPath)

    const randomId = Math.random().toString(36).slice(2)
    const srcKey = `assets/${randomId}`

    const tokenResp: MediatrackUploadResp = await this.client.request(
      "https://jayce.api.mediatrack.cn/v3/storage/tokens/asset",
      {
        method: "GET",
        params: { src: srcKey },
      },
    )

    const cosUrl = tokenResp.data?.url
    if (cosUrl) {
      await fetch(cosUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(content.length),
        },
        body: new Uint8Array(content),
      })
    }

    await this.client.request(
      `https://jayce.api.mediatrack.cn/v3/assets/${encodeURIComponent(parentId)}/children`,
      {
        method: "POST",
        body: {
          category: 0,
          description: fileName,
          mime: "application/octet-stream",
          size: String(content.length),
          src: srcKey,
          title: fileName,
          type: 0,
        },
      },
    )
  }
}
