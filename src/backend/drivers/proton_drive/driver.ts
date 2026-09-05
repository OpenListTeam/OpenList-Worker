// ProtonDrive driver - Proton Drive (International Service)
// Ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/proton_drive
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  ProtonDriveAddition,
  ProtonLink,
  ProtonShare,
  ProtonListResp,
  ProtonShareResp,
  ProtonDownloadResp,
  ProtonLinkResp,
  ProtonUploadResp,
} from "./types"
import { ProtonDriveClient, calcMD5 } from "./util"
import {
  ProtonSharesURL,
  ProtonLinkTypeFile,
  ProtonLinkTypeFolder,
  ProtonShareTypeMain,
  DefaultChunkSize,
} from "./consts"

function parseProtonDate(timestamp: number): string {
  if (!timestamp) return new Date().toISOString()
  return new Date(timestamp * 1000).toISOString()
}

function protonLinkToFileItem(link: ProtonLink): FileItem {
  const isDir = link.Type === ProtonLinkTypeFolder

  return {
    name: link.Name,
    size: link.Size || 0,
    is_dir: isDir,
    modified: parseProtonDate(link.ModifyTime || link.CreateTime),
    sign: link.LinkID,
    type: calcFileType(link.Name, isDir),
    thumb: "",
    raw_url: "",
    hash: link.Hash || undefined,
  }
}

export function normalizeProtonDriveAddition(a: any): ProtonDriveAddition {
  const norm = { ...(a || {}) } as any
  norm.email = (norm.email || "").trim()
  norm.password = (norm.password || "").trim()
  norm.two_fa_code = (norm.two_fa_code || "").trim()
  norm.root_folder_id = norm.root_folder_id || ""
  norm.use_reusable_login = norm.use_reusable_login || false
  norm.chunk_size = norm.chunk_size || DefaultChunkSize.toString()
  return norm as ProtonDriveAddition
}

export class ProtonDriveDriver implements StorageDriver {
  private client: ProtonDriveClient
  private addition: ProtonDriveAddition
  private mainShare: ProtonShare | null = null
  private chunkSize: number = DefaultChunkSize

  get config() {
    return {
      name: "ProtonDrive",
      localSort: false,
      onlyLocal: false,
      onlyProxy: false,
      noCache: false,
      noUpload: false,
      defaultRoot: "",
    }
  }

  constructor(addition: any) {
    this.addition = normalizeProtonDriveAddition(addition)
    this.client = new ProtonDriveClient(this.addition)
    this.chunkSize = parseInt(this.addition.chunk_size || DefaultChunkSize.toString())
  }

  async init(): Promise<void> {
    // Login
    await this.client.login()

    // Get user info
    await this.client.getUserInfo()

    // Get main share
    const sharesResp = await this.client.requestAPI("/drive/shares") as ProtonShareResp

    if (!sharesResp.Shares || sharesResp.Shares.length === 0) {
      throw new Error("No shares found")
    }

    // Find main share
    this.mainShare = sharesResp.Shares.find(
      (s) => s.Type === ProtonShareTypeMain
    ) || sharesResp.Shares[0]

    if (!this.mainShare) {
      throw new Error("Failed to get main share")
    }
  }

  async drop(): Promise<void> {
    // No cleanup needed
  }

  private getShareID(): string {
    if (!this.mainShare) {
      throw new Error("Not initialized")
    }
    return this.mainShare.ShareID
  }

  private getRootLinkID(): string {
    if (!this.mainShare) {
      throw new Error("Not initialized")
    }
    return this.addition.root_folder_id || this.mainShare.RootLinkID
  }

  async list(dir: string): Promise<FileItem[]> {
    const shareID = this.getShareID()
    const parentID = dir || this.getRootLinkID()

    const resp = await this.client.requestAPI(
      `/drive/shares/${shareID}/folders/${parentID}/children`,
      {
        params: {
          Page: "0",
          PageSize: "150",
        },
      }
    ) as ProtonListResp

    if (!resp.Links) {
      return []
    }

    const items = resp.Links.map((link) => protonLinkToFileItem(link))

    return sortFileItems(items, {
      orderBy: "name",
      orderDirection: "asc",
    })
  }

  async link(file: FileItem): Promise<{ url: string; headers?: Record<string, string> }> {
    if (file.is_dir) {
      throw new Error("Cannot get link for directory")
    }

    const shareID = this.getShareID()
    const linkID = file.sign

    const resp = await this.client.requestAPI(
      `/drive/shares/${shareID}/files/${linkID}/download`,
      { method: "GET" }
    ) as ProtonDownloadResp

    if (!resp.URL || !resp.Token) {
      throw new Error("Failed to get download URL")
    }

    return {
      url: resp.URL,
      headers: {
        "Authorization": `Bearer ${resp.Token}`,
      },
    }
  }

  async get(path: string): Promise<FileItem | null> {
    const shareID = this.getShareID()

    const resp = await this.client.requestAPI(
      `/drive/shares/${shareID}/links/${path}`
    ) as ProtonLinkResp

    if (!resp.Link) return null

    return protonLinkToFileItem(resp.Link)
  }

  async makeDir(parentDir: string, dirName: string): Promise<void> {
    const shareID = this.getShareID()
    const parentID = parentDir || this.getRootLinkID()

    await this.client.requestAPI(`/drive/shares/${shareID}/folders`, {
      method: "POST",
      body: {
        Name: dirName,
        ParentLinkID: parentID,
        Hash: calcMD5(Buffer.from(dirName)),
        // In production, you'd encrypt the name with share key
        NodeKey: "",
        NodePassphrase: "",
        SignatureAddress: "",
      },
    })
  }

  async move(srcPath: string, dstDirPath: string): Promise<void> {
    const shareID = this.getShareID()
    const parentID = dstDirPath || this.getRootLinkID()

    await this.client.requestAPI(`/drive/shares/${shareID}/folders/${parentID}/move`, {
      method: "PUT",
      body: {
        LinkIDs: [srcPath],
      },
    })
  }

  async rename(srcPath: string, newName: string): Promise<void> {
    const shareID = this.getShareID()

    await this.client.requestAPI(`/drive/shares/${shareID}/links/${srcPath}`, {
      method: "PUT",
      body: {
        Name: newName,
        Hash: calcMD5(Buffer.from(newName)),
        // In production, encrypt the name
      },
    })
  }

  async copy(_srcPath: string, _dstDirPath: string): Promise<void> {
    throw new Error("Copy operation not supported by ProtonDrive API")
  }

  async remove(path: string): Promise<void> {
    const shareID = this.getShareID()

    await this.client.requestAPI(`/drive/shares/${shareID}/folders/trash`, {
      method: "POST",
      body: {
        LinkIDs: [path],
      },
    })
  }

  async put(
    dstDirPath: string,
    content: ReadableStream,
    fileName: string
  ): Promise<void> {
    const shareID = this.getShareID()
    const parentID = dstDirPath || this.getRootLinkID()

    // Read stream
    const reader = content.getReader()
    const chunks: Uint8Array[] = []
    let totalSize = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalSize += value.length
    }

    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)))

    // Create file
    const createResp = await this.client.requestAPI(
      `/drive/shares/${shareID}/files`,
      {
        method: "POST",
        body: {
          Name: fileName,
          Hash: calcMD5(buffer),
          ParentLinkID: parentID,
          MIMEType: "application/octet-stream",
          Size: totalSize,
          // In production, encrypt content and provide proper keys
          NodeKey: "",
          NodePassphrase: "",
          SignatureAddress: "",
          ContentKeyPacket: "",
        },
      }
    ) as ProtonUploadResp

    if (!createResp.Link) {
      throw new Error("Failed to create file")
    }

    // Upload content
    const linkID = createResp.Link.LinkID

    // Get upload URL
    const uploadURLResp = await this.client.requestAPI(
      `/drive/shares/${shareID}/files/${linkID}/upload`,
      { method: "GET" }
    )

    // Upload blocks
    const blockData = new Blob([buffer])
    await this.client.request(uploadURLResp.URL, {
      method: "POST",
      body: blockData,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    })
  }

  async other(_method: string, _data: Record<string, any>): Promise<any> {
    throw new Error(`Unsupported operation: ${_method}`)
  }
}
