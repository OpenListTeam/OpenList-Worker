import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { sha1 } from "../../pkg/crypto"
import {
  PikPakAboutResp,
  PikPakAddition,
  PikPakFile,
  PikPakFileListResp,
} from "./types"
import { PikPakApiClient } from "./util"

export class PikPakDriver implements StorageDriver {
  private addition: PikPakAddition
  private client: PikPakApiClient
  private rootId: string = ""
  // Map of physical path to file ID
  private idCache: Map<string, string> = new Map()

  constructor(
    addition: PikPakAddition,
    onTokenRefreshed?: (tokens: {
      accessToken: string
      refreshToken: string
      captchaToken?: string
    }) => Promise<void>,
  ) {
    this.addition = addition
    this.rootId = addition.root_folder_id || ""
    this.client = new PikPakApiClient(addition, onTokenRefreshed)
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

    // Traverse from root to find id
    const parts = clean.split("/").filter(Boolean)
    let currentId = this.rootId
    let currentPath = ""

    for (const part of parts) {
      currentPath += "/" + part
      if (this.idCache.has(currentPath)) {
        currentId = this.idCache.get(currentPath)!
        continue
      }

      const files = await this.getFiles(currentId)
      const found = files.find((f) => f.name === part)
      if (!found) {
        throw new Error(`Path not found: ${currentPath}`)
      }
      currentId = found.id
      this.idCache.set(currentPath, currentId)
    }

    return currentId
  }

  private async getFiles(parentId: string): Promise<PikPakFile[]> {
    const allFiles: PikPakFile[] = []
    let pageToken = ""

    while (true) {
      const params: Record<string, string> = {
        parent_id: parentId,
        thumbnail_size: "SIZE_LARGE",
        with_audit: "true",
        limit: "100",
        filters: JSON.stringify({
          phase: { eq: "PHASE_TYPE_COMPLETE" },
          trashed: { eq: false },
        }),
      }
      if (pageToken) {
        params.page_token = pageToken
      }

      const data: PikPakFileListResp = await this.client.request(
        "https://api-drive.mypikpak.net/drive/v1/files",
        {
          method: "GET",
          params,
        },
      )

      if (data.files && data.files.length > 0) {
        allFiles.push(...data.files)
      }

      if (!data.next_page_token || data.next_page_token === pageToken) {
        break
      }
      pageToken = data.next_page_token
    }

    return allFiles
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const parentId = await this.resolveParentId(physicalPath)
    const files = await this.getFiles(parentId)
    const cleanParent = this.cleanPath(physicalPath)

    const items: FileItem[] = files.map((f) => {
      const isDir = f.kind === "drive#folder"
      const filePath = cleanParent ? `${cleanParent}/${f.name}` : `/${f.name}`
      this.idCache.set(filePath, f.id)

      let rawUrl = f.web_content_link || ""
      if (
        !this.addition.disable_media_link &&
        f.medias &&
        f.medias.length > 0 &&
        f.medias[0].link?.url
      ) {
        rawUrl = f.medias[0].link.url
      }

      return {
        name: f.name,
        size: parseInt(f.size || "0", 10) || 0,
        is_dir: isDir,
        created: f.created_time,
        modified: f.modified_time || new Date().toISOString(),
        sign: f.id,
        type: calcFileType(f.name, isDir),
        thumb: f.thumbnail_link,
        raw_url: rawUrl,
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

    const fileId = await this.resolveParentId(physicalPath)
    const queryParams: Record<string, string> = {
      _magic: "2021",
      usage: this.addition.disable_media_link ? "FETCH" : "CACHE",
      thumbnail_size: "SIZE_LARGE",
    }

    const f: PikPakFile = await this.client.request(
      `https://api-drive.mypikpak.net/drive/v1/files/${encodeURIComponent(fileId)}`,
      {
        method: "GET",
        params: queryParams,
      },
    )

    const isDir = f.kind === "drive#folder"
    let rawUrl = f.web_content_link || ""
    if (
      !this.addition.disable_media_link &&
      f.medias &&
      f.medias.length > 0 &&
      f.medias[0].link?.url
    ) {
      rawUrl = f.medias[0].link.url
    }

    return {
      name: f.name || name,
      size: parseInt(f.size || "0", 10) || 0,
      is_dir: isDir,
      created: f.created_time,
      modified: f.modified_time || new Date().toISOString(),
      sign: f.id,
      type: calcFileType(f.name || name, isDir),
      thumb: f.thumbnail_link,
      raw_url: rawUrl,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/")
    const dirName = clean.split("/").pop() || ""
    const parentId = await this.resolveParentId(parentPath)

    const resp = await this.client.request(
      "https://api-drive.mypikpak.net/drive/v1/files",
      {
        method: "POST",
        body: {
          kind: "drive#folder",
          parent_id: parentId,
          name: dirName,
        },
      },
    )

    if (resp?.file?.id) {
      this.idCache.set(clean, resp.file.id)
    }
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const fileId = await this.resolveParentId(physicalPath)
    await this.client.request(
      `https://api-drive.mypikpak.net/drive/v1/files/${encodeURIComponent(fileId)}`,
      {
        method: "PATCH",
        body: {
          name: newName,
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
    // physicalPath 是目标项自身的物理路径（参数即目标项路径，不得再拼 name，
    // 否则指向 <item>/<name>）；父目录取 physicalPath 去掉末段后的部分，
    // 目标名取其末段，在父目录子项中按名查找对应 id。
    const clean = this.cleanPath(physicalPath)
    const targetName = clean.split("/").pop() || ""
    const parentPath = clean.split("/").slice(0, -1).join("/")
    const parentId = await this.resolveParentId(parentPath)
    const files = await this.getFiles(parentId)
    const match = files.find((f) => f.name === targetName)
    if (!match) return

    await this.client.request(
      "https://api-drive.mypikpak.net/drive/v1/files:batchTrash",
      {
        method: "POST",
        body: {
          ids: [match.id],
        },
      },
    )

    this.idCache.delete(clean)
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // srcPhys/dstPhys 是源/目标项自身的物理路径（参数即目标项路径，不得再拼 name）：
    // 直接当父目录解析会指到项本身——源侧会去 <srcItem> 的子项里找 name（永远落空），
    // 目标侧解析一个尚不存在的目标项必然报错。
    // 故两侧父目录均去掉末段，源名取 srcPhys 末段，在源父目录子项中按名查 id。
    const srcClean = this.cleanPath(srcPhys)
    const dstClean = this.cleanPath(dstPhys)
    const srcName = srcClean.split("/").pop() || ""
    const srcParentPath = srcClean.split("/").slice(0, -1).join("/")
    const dstParentPath = dstClean.split("/").slice(0, -1).join("/")

    const srcParentId = await this.resolveParentId(srcParentPath)
    const dstParentId = await this.resolveParentId(dstParentPath)
    const srcFiles = await this.getFiles(srcParentId)
    const match = srcFiles.find((f) => f.name === srcName)
    if (!match) return

    await this.client.request(
      "https://api-drive.mypikpak.net/drive/v1/files:batchMove",
      {
        method: "POST",
        body: {
          ids: [match.id],
          to: {
            parent_id: dstParentId,
          },
        },
      },
    )

    this.idCache.delete(srcClean)
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // 与 move 同理：参数是源/目标项自身路径，不得再拼 name；
    // 两侧父目录均去掉末段，源名取 srcPhys 末段，在源父目录子项中按名查 id。
    const srcClean = this.cleanPath(srcPhys)
    const dstClean = this.cleanPath(dstPhys)
    const srcName = srcClean.split("/").pop() || ""
    const srcParentPath = srcClean.split("/").slice(0, -1).join("/")
    const dstParentPath = dstClean.split("/").slice(0, -1).join("/")

    const srcParentId = await this.resolveParentId(srcParentPath)
    const dstParentId = await this.resolveParentId(dstParentPath)
    const srcFiles = await this.getFiles(srcParentId)
    const match = srcFiles.find((f) => f.name === srcName)
    if (!match) return

    await this.client.request(
      "https://api-drive.mypikpak.net/drive/v1/files:batchCopy",
      {
        method: "POST",
        body: {
          ids: [match.id],
          to: {
            parent_id: dstParentId,
          },
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

    const sha1Hex = (await sha1(new Uint8Array(content))).toUpperCase()

    const taskResp: any = await this.client.request(
      "https://api-drive.mypikpak.net/drive/v1/files",
      {
        method: "POST",
        body: {
          kind: "drive#file",
          name: fileName,
          size: String(content.length),
          hash: sha1Hex,
          upload_type: "UPLOAD_TYPE_RESUMABLE",
          objProvider: { provider: "UPLOAD_TYPE_UNKNOWN" },
          parent_id: parentId,
          folder_type: "NORMAL",
        },
      },
    )

    // Rapid upload / already complete
    if (!taskResp.resumable) {
      return
    }

    const params = taskResp.resumable.params
    let endpoint = params.endpoint
    if (this.addition.platform === "android") {
      endpoint = "mypikpak.net"
    }

    const uploadUrl = `https://${params.bucket}.${endpoint}/${params.key}`
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(content.length),
        "x-oss-security-token": params.security_token,
      },
      body: new Uint8Array(content),
    })

    if (!uploadRes.ok) {
      throw new Error(`PikPak OSS upload failed: ${uploadRes.statusText}`)
    }
  }

  async getDetails(): Promise<{
    totalSpace: number
    usedSpace: number
  }> {
    const about: PikPakAboutResp = await this.client.request(
      "https://api-drive.mypikpak.net/drive/v1/about",
      {
        method: "GET",
      },
    )
    return {
      totalSpace: parseInt(about.quota.limit || "0", 10) || 0,
      usedSpace: parseInt(about.quota.usage || "0", 10) || 0,
    }
  }
}
