import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { YandexAddition, YandexFilesResp } from "./types"
import { YandexApiClient } from "./util"

export class YandexDriver implements StorageDriver {
  private addition: YandexAddition
  private client: YandexApiClient

  constructor(
    addition: YandexAddition,
    onTokenRefreshed?: (tokens: {
      accessToken: string
      refreshToken: string
    }) => Promise<void>,
  ) {
    this.addition = addition
    this.client = new YandexApiClient(addition, onTokenRefreshed)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const files = await this.client.getFiles(
      clean,
      this.addition.order_by,
      this.addition.order_direction,
    )

    const items: FileItem[] = files.map((f) => {
      const isDir = f.type === "dir"
      return {
        name: f.name,
        size: f.size || 0,
        is_dir: isDir,
        created: f.created,
        modified: f.modified || new Date().toISOString(),
        sign: f.path || f.name,
        type: calcFileType(f.name, isDir),
        thumb: f.preview,
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

    if (clean === "/") {
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

    const res: YandexFilesResp = await this.client.request("", {
      method: "GET",
      params: { path: clean },
    })

    const isDir = res.type === "dir"
    let rawUrl = ""
    if (!isDir) {
      try {
        rawUrl = await this.client.getDownloadLink(clean)
      } catch (e) {
        console.warn("[Yandex] get download link failed:", e)
      }
    }

    return {
      name: res.name || name,
      size: (res as any).size || 0,
      is_dir: isDir,
      created: res.created,
      modified: res.modified || new Date().toISOString(),
      sign: res.path || clean,
      type: calcFileType(res.name || name, isDir),
      raw_url: rawUrl,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    await this.client.request("", {
      method: "PUT",
      params: { path: clean },
    })
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parent = clean.split("/").slice(0, -1).join("/") || "/"
    const dstPath = parent === "/" ? `/${newName}` : `${parent}/${newName}`

    await this.client.request("/move", {
      method: "POST",
      params: {
        from: clean,
        path: dstPath,
        overwrite: "true",
      },
    })
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    for (const name of names) {
      const targetPath = clean === "/" ? `/${name}` : `${clean}/${name}`
      await this.client.request("", {
        method: "DELETE",
        params: { path: targetPath },
      })
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcClean = this.cleanPath(srcPhys)
    const dstClean = this.cleanPath(dstPhys)

    for (const name of names) {
      const fromPath = srcClean === "/" ? `/${name}` : `${srcClean}/${name}`
      const toPath = dstClean === "/" ? `/${name}` : `${dstClean}/${name}`
      await this.client.request("/move", {
        method: "POST",
        params: {
          from: fromPath,
          path: toPath,
          overwrite: "true",
        },
      })
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcClean = this.cleanPath(srcPhys)
    const dstClean = this.cleanPath(dstPhys)

    for (const name of names) {
      const fromPath = srcClean === "/" ? `/${name}` : `${srcClean}/${name}`
      const toPath = dstClean === "/" ? `/${name}` : `${dstClean}/${name}`
      await this.client.request("/copy", {
        method: "POST",
        params: {
          from: fromPath,
          path: toPath,
          overwrite: "true",
        },
      })
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const uploadUrl = await this.client.getUploadLink(clean)

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(content.length),
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(content),
    })

    if (!res.ok) {
      throw new Error(`Yandex upload failed: ${res.statusText}`)
    }
  }
}
