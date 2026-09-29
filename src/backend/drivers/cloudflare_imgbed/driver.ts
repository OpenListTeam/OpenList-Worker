// cloudflare_imgbed driver
// Ported from: OpenList-Backends/drivers/cloudflare_imgbed
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  CFImgBedAddition,
  CFImgBedListResp,
  CFImgBedUploadRespItem,
} from "./types"
import {
  CFImgBedClient,
  encodePath,
  parseMetadataSize,
  parseMetadataTimestamp,
} from "./util"

const listPageSize = 1000

export function normalizeCFImgBedAddition(a: any): CFImgBedAddition {
  const norm = { ...(a || {}) } as any
  norm.address = (norm.address || "").trim().replace(/\/+$/, "")
  norm.token = (norm.token || "").trim()
  norm.small_channel_name = (norm.small_channel_name || "").trim()
  norm.large_channel_name = (norm.large_channel_name || "").trim()
  norm.large_channel_type = (norm.large_channel_type || "").trim()
  norm.upload_thread = Math.min(Number(norm.upload_thread || 3), 32)
  norm.root_folder_path = norm.root_folder_path || "/"
  return norm as CFImgBedAddition
}

export class CFImgBedDriver implements StorageDriver {
  private addition: CFImgBedAddition
  private client: CFImgBedClient
  private publicUrlPrefix = ""

  constructor(addition: any) {
    this.addition = normalizeCFImgBedAddition(addition)
    this.client = new CFImgBedClient(this.addition.address, this.addition.token)
  }

  async init(): Promise<void> {
    if (!this.addition.address) throw new Error("address is required")
    if (!this.addition.token) throw new Error("token is required")
    await this.client.list("/", 0, 1)
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const dir = this.cleanPath(physicalPath)
    const dirSeen = new Set<string>()
    const fileSeen = new Set<string>()
    const items: FileItem[] = []

    let start = 0
    for (;;) {
      const resp: CFImgBedListResp = await this.client.list(
        dir,
        start,
        listPageSize,
      )
      if (!resp.files?.length && !resp.directories?.length) break

      for (const rawDir of resp.directories || []) {
        const cleanDir = "/" + (rawDir || "").replace(/^\/+|\/+$/g, "")
        if (!dirSeen.has(cleanDir)) {
          dirSeen.add(cleanDir)
          items.push({
            name: cleanDir.split("/").filter(Boolean).pop() || "",
            size: 0,
            is_dir: true,
            modified: new Date().toISOString(),
            sign: cleanDir,
            type: 1,
          })
        }
      }

      for (const f of resp.files || []) {
        if (!fileSeen.has(f.name)) {
          fileSeen.add(f.name)
          const name = f.name.split("/").filter(Boolean).pop() || f.name
          const size = parseMetadataSize(f.metadata)
          const ts = parseMetadataTimestamp(f.metadata)
          items.push({
            name,
            size,
            is_dir: false,
            modified: ts
              ? new Date(ts).toISOString()
              : new Date().toISOString(),
            sign: "/" + (f.name || "").replace(/^\/+/, ""),
            type: calcFileType(name, false),
          })
        }
      }

      if (
        (resp.files?.length || 0) + (resp.directories?.length || 0) <
        listPageSize
      ) {
        break
      }
      start += listPageSize
    }

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
        sign: "",
        type: 1,
      }
    }
    const rawUrl = this.publicUrlPrefix
      ? this.publicUrlPrefix + encodePath(clean)
      : this.addition.address + "/file" + encodePath(clean)
    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: clean,
      type: calcFileType(name, false),
      raw_url: rawUrl,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    // 图床目录通常是虚拟的，无需真实创建
    return
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("cloudflare_imgbed does not support rename")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("cloudflare_imgbed does not support move")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("cloudflare_imgbed does not support copy")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    // 无法确定是文件还是目录，默认按文件删除；目录删除后端会忽略
    await this.client.remove(clean, false)
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const fileName = clean.split("/").pop() || "upload"

    const channelName = this.addition.small_channel_name
    if (!channelName) {
      throw new Error("channel name not configured")
    }

    const q = new URLSearchParams({
      returnFormat: "default",
      channelName,
      uploadFolder: parentPath,
      autoRetry: "true",
    })

    const formData = new FormData()
    formData.append(
      "file",
      new Blob([new Uint8Array(content)], { type: "application/octet-stream" }),
      fileName,
    )

    const res = await fetch(
      `${this.addition.address}/upload?${q.toString()}`,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + this.addition.token },
        body: formData,
      },
    )
    if (!res.ok) {
      throw new Error(`upload failed ${res.status}: ${await res.text()}`)
    }
    const resp = (await res.json()) as CFImgBedUploadRespItem[]
    if (!resp?.length || !resp[0].src) {
      throw new Error("no src returned")
    }
    if (resp[0].publicUrl) {
      try {
        const u = new URL(resp[0].publicUrl)
        this.publicUrlPrefix = u.protocol + "//" + u.host
      } catch {
        // ignore
      }
    }
  }
}
