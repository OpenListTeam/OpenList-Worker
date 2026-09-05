// 189PC driver - China Telecom Cloud PC Protocol
// Ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/189pc
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  Cloud189PCAddition,
  Cloud189PCFile,
  Cloud189PCListResp,
  Cloud189PCLoginResp,
  Cloud189PCInitMultiUploadResp,
  Cloud189PCUploadUrlResp,
} from "./types"
import { Cloud189PCClient, calcMD5, calcSHA1 } from "./util"
import { encryptPassword, generateDeviceId } from "./crypto"
import {
  LoginURL,
  ListFilesURL,
  CreateFolderURL,
  RenameFileURL,
  DeleteFileURL,
  GetDownloadURLURL,
  InitUploadURL,
  GetUploadURLsURL,
  CommitUploadURL,
  DefaultChunkSize,
} from "./consts"

function parse189PCDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return new Date().toISOString()
}

function cloud189PCFileToFileItem(file: Cloud189PCFile): FileItem {
  return {
    name: file.name,
    size: file.size || 0,
    is_dir: file.isFolder,
    modified: parse189PCDate(file.lastOpTime || file.createDate),
    sign: file.id.toString(),
    type: calcFileType(file.name, file.isFolder),
    thumb: file.icon?.smallUrl || file.icon?.largeUrl || "",
    raw_url: file.downloadUrl || "",
    hash: file.md5 || undefined,
  }
}

export function normalizeCloud189PCAddition(a: any): Cloud189PCAddition {
  const norm = { ...(a || {}) } as any
  norm.username = (norm.username || "").trim()
  norm.password = (norm.password || "").trim()
  norm.root_folder_id = norm.root_folder_id || "-11"
  norm.captcha_mode = norm.captcha_mode || ""
  norm.device_id = norm.device_id || ""
  norm.session_key = norm.session_key || ""
  norm.session_secret = norm.session_secret || ""
  norm.login_type = norm.login_type || "1"
  return norm as Cloud189PCAddition
}

export class Cloud189PCDriver implements StorageDriver {
  private client: Cloud189PCClient
  private addition: Cloud189PCAddition
  private rootFolderId: string = "-11"
  private onTokenUpdate?: (tokens: {
    session_key: string
    session_secret: string
    device_id: string
  }) => Promise<void>

  get config() {
    return {
      name: "189PC",
      localSort: false,
      onlyLocal: false,
      onlyProxy: false,
      noCache: false,
      noUpload: false,
      defaultRoot: "-11",
    }
  }

  constructor(
    addition: any,
    onTokenUpdate?: (tokens: {
      session_key: string
      session_secret: string
      device_id: string
    }) => Promise<void>
  ) {
    this.addition = normalizeCloud189PCAddition(addition)
    this.client = new Cloud189PCClient(this.addition)
    this.rootFolderId = this.addition.root_folder_id || "-11"
    this.onTokenUpdate = onTokenUpdate
  }

  async init(): Promise<void> {
    // Check if we have valid session
    if (this.addition.session_key && this.addition.session_secret) {
      // Try to use existing session
      try {
        await this.testSession()
        return
      } catch (e) {
        // Session expired, need to login again
      }
    }

    // Generate device ID if not provided
    if (!this.client.getDeviceId()) {
      this.client.setDeviceId(generateDeviceId())
    }

    // Login
    await this.login()
  }

  private async testSession(): Promise<void> {
    // Test session by listing root folder
    await this.client.requestAPI(ListFilesURL, {
      folderId: this.rootFolderId,
      pageNum: 1,
      pageSize: 1,
    })
  }

  private async login(): Promise<void> {
    // Get RSA public key
    const params = {
      appId: "600002434",
      accountType: this.addition.login_type || "1",
      userName: this.addition.username,
      password: encryptPassword(this.addition.password, await this.getRSAPublicKey()),
      clientType: "10020",
      returnUrl: "https://m.cloud.189.cn/zhuanti/2020/loginSuccess/index.html",
      mailSuffix: "@189.cn",
    }

    const resp = await this.client.request(LoginURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    })

    if (!resp || resp.result !== 0) {
      throw new Error(`Login failed: ${resp?.msg || "Unknown error"}`)
    }

    const loginResp = resp as Cloud189PCLoginResp
    this.client.setTokens(
      loginResp.accessToken,
      loginResp.sessionKey,
      loginResp.sessionSecret
    )

    // Notify token update
    if (this.onTokenUpdate) {
      await this.onTokenUpdate({
        session_key: loginResp.sessionKey,
        session_secret: loginResp.sessionSecret,
        device_id: this.client.getDeviceId(),
      })
    }
  }

  private async getRSAPublicKey(): Promise<string> {
    // Cloud189 uses a fixed RSA public key for PC protocol
    return "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDY7mpaUysvgQkIiL9M6PxYcKGOXe0elNAk" +
           "kkh/v0fzfx6cGrJnLlh5G0H8qPUvhLHh+U4xqRMN8C7KKKHmCQ1Xq5KLJCBM6pq9W2KU2R1q" +
           "g5SrCAqHq5KXJHM7TpjD/yH0u8KpY2H5U3WwR5N9LCdTw2XP6YqOvAx8kKqM3N8mKQIDAQAB"
  }

  async drop(): Promise<void> {
    // No cleanup needed
  }

  async list(dir: string): Promise<FileItem[]> {
    const folderId = dir || this.rootFolderId
    const allFiles: FileItem[] = []
    let pageNum = 1
    const pageSize = 100

    while (true) {
      const resp = await this.client.requestAPI(ListFilesURL, {
        folderId,
        pageNum,
        pageSize,
      })

      const listResp = resp as Cloud189PCListResp

      // Add folders
      if (listResp.folderList) {
        for (const folder of listResp.folderList) {
          allFiles.push(cloud189PCFileToFileItem(folder))
        }
      }

      // Add files
      if (listResp.fileList) {
        for (const file of listResp.fileList) {
          allFiles.push(cloud189PCFileToFileItem(file))
        }
      }

      // Check if we have more pages
      if (allFiles.length >= listResp.recordCount) {
        break
      }
      pageNum++
    }

    return sortFileItems(allFiles, {
      orderBy: "name",
      orderDirection: "asc",
    })
  }

  async link(file: FileItem): Promise<{ url: string; headers?: Record<string, string> }> {
    if (file.is_dir) {
      throw new Error("Cannot get link for directory")
    }

    const resp = await this.client.requestAPI(GetDownloadURLURL, {
      fileId: file.sign,
    })

    if (!resp || !resp.fileDownloadUrl) {
      throw new Error("Failed to get download URL")
    }

    return {
      url: resp.fileDownloadUrl,
    }
  }

  async get(path: string): Promise<FileItem | null> {
    const resp = await this.client.requestAPI("/open/file/getFileInfo.action", {
      fileId: path,
    })

    if (!resp) return null

    return cloud189PCFileToFileItem(resp as Cloud189PCFile)
  }

  async makeDir(parentDir: string, dirName: string): Promise<void> {
    const resp = await this.client.requestAPI(CreateFolderURL, {
      parentFolderId: parentDir || this.rootFolderId,
      folderName: dirName,
    })

    if (!resp || resp.id === undefined) {
      throw new Error("Failed to create folder")
    }
  }

  async move(srcPath: string, dstDirPath: string): Promise<void> {
    // 189PC doesn't have a direct move API, use copy + delete
    await this.copy(srcPath, dstDirPath)
    await this.remove(srcPath)
  }

  async rename(srcPath: string, newName: string): Promise<void> {
    await this.client.requestAPI(RenameFileURL, {
      fileId: srcPath,
      fileName: newName,
    })
  }

  async copy(srcPath: string, dstDirPath: string): Promise<void> {
    // Use internal copy API
    await this.client.requestAPI("/open/file/copyFile.action", {
      fileId: srcPath,
      destFolderId: dstDirPath || this.rootFolderId,
    })
  }

  async remove(path: string): Promise<void> {
    await this.client.requestAPI(DeleteFileURL, {
      fileId: path,
    })
  }

  async put(
    dstDirPath: string,
    content: ReadableStream,
    fileName: string
  ): Promise<void> {
    const reader = content.getReader()
    const chunks: Uint8Array[] = []
    let totalSize = 0

    // Read all chunks
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalSize += value.length
    }

    // Combine chunks
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)))
    const md5 = calcMD5(buffer)
    const sha1 = calcSHA1(buffer)

    // Init upload
    const initResp = await this.client.requestUploadAPI(InitUploadURL, {
      parentFolderId: dstDirPath || this.rootFolderId,
      fileName: fileName,
      fileSize: totalSize,
      fileMd5: md5,
      sliceSize: DefaultChunkSize,
      lazyCheck: 1,
    })

    const uploadResp = initResp as Cloud189PCInitMultiUploadResp

    // Check if file already exists (quick upload)
    if (uploadResp.fileDataExists === 1) {
      return
    }

    // Get upload URLs
    const urlResp = await this.client.requestUploadAPI(GetUploadURLsURL, {
      uploadFileId: uploadResp.uploadFileId,
      partInfo: JSON.stringify([{ partNumber: 1 }]),
    })

    const uploadUrlResp = urlResp as Cloud189PCUploadUrlResp

    if (!uploadUrlResp.uploadUrls || uploadUrlResp.uploadUrls.length === 0) {
      throw new Error("Failed to get upload URLs")
    }

    // Upload file
    const formData = new FormData()
    formData.append("file", new Blob([buffer]), fileName)

    await this.client.request(uploadUrlResp.uploadUrls[0], {
      method: "POST",
      body: formData,
    })

    // Commit upload
    await this.client.requestUploadAPI(CommitUploadURL, {
      uploadFileId: uploadResp.uploadFileId,
    })
  }

  async other(_method: string, _data: Record<string, any>): Promise<any> {
    throw new Error(`Unsupported operation: ${_method}`)
  }
}
