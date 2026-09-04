// MediaFire API 客户端
import { DriverMediafireAddition, MediafireContent, MediafireLinks, MediafireFolderCreate } from "./types"

const API_BASE = "https://www.mediafire.com/api/1.5"
const HOST_BASE = "https://www.mediafire.com"

export interface MFEntry {
  id: string
  name: string
  size: number
  isDir: boolean
  created: string
}

export class ClientMediafire {
  private cookie: string
  private sessionToken: string
  private chunkSize: number
  private orderBy: string
  private orderDirection: string

  constructor(addition: DriverMediafireAddition) {
    this.cookie = addition.cookie || ""
    this.sessionToken = addition.session_token || ""
    this.chunkSize = addition.chunk_size || 200
    this.orderBy = addition.order_by || "name"
    this.orderDirection = addition.order_direction || "asc"
  }

  async init(): Promise<void> {
    if (!this.cookie) throw new Error("[MediaFire] cookie is required")
    if (!this.sessionToken) {
      await this.getSessionToken()
    }
  }

  private async postForm<T = any>(endpoint: string, data: Record<string, string>): Promise<T> {
    const form = new URLSearchParams({
      session_token: this.sessionToken,
      response_format: "json",
      ...data,
    })
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: this.cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Origin: HOST_BASE,
        Referer: `${HOST_BASE}/`,
      },
      body: form.toString(),
    })
    return (await resp.json().catch(() => ({}))) as T
  }

  private async getSessionToken(): Promise<void> {
    const resp = await fetch(`${HOST_BASE}/application/get_session_token.php`, {
      method: "POST",
      headers: {
        Cookie: this.cookie,
        Origin: HOST_BASE,
        Referer: `${HOST_BASE}/`,
        "Content-Length": "0",
      },
    })
    const data: any = await resp.json().catch(() => ({}))
    const token = data?.response?.session_token
    if (!token) throw new Error("[MediaFire] failed to get session token from cookie")
    this.sessionToken = token
    this.addition_session_token = token
  }

  // 保存刷新后的 token 供上层持久化
  addition_session_token = ""

  private checkResult(result?: string): void {
    if (result && result !== "Success") {
      throw new Error(`[MediaFire] API error: ${result}`)
    }
  }

  async list(folderKey: string): Promise<MFEntry[]> {
    const entries: MFEntry[] = []
    let chunk = 1
    let more = true
    while (more) {
      const foldersResp = await this.postForm<MediafireApiResp<MediafireContent>>(
        "/folder/get_content.php",
        {
          folder_key: folderKey,
          content_type: "folders",
          chunk: String(chunk),
          chunk_size: String(this.chunkSize),
          details: "yes",
          order_direction: this.orderDirection,
          order_by: this.orderBy,
          filter: "",
        },
      )
      const filesResp = await this.postForm<MediafireApiResp<MediafireContent>>(
        "/folder/get_content.php",
        {
          folder_key: folderKey,
          content_type: "files",
          chunk: String(chunk),
          chunk_size: String(this.chunkSize),
          details: "yes",
          order_direction: this.orderDirection,
          order_by: this.orderBy,
          filter: "",
        },
      )
      const folders = foldersResp.response?.folder_content?.folders || []
      const files = filesResp.response?.folder_content?.files || []
      for (const f of folders) {
        entries.push({ id: f.folderkey, name: f.name, size: 0, isDir: true, created: f.created })
      }
      for (const f of files) {
        entries.push({
          id: f.quickkey,
          name: f.filename,
          size: parseInt(f.size, 10) || 0,
          isDir: false,
          created: f.created,
        })
      }
      more =
        foldersResp.response?.folder_content?.more_chunks === "yes" ||
        filesResp.response?.folder_content?.more_chunks === "yes"
      chunk++
    }
    return entries
  }

  async getDownloadUrl(quickKey: string): Promise<string> {
    const resp = await this.postForm<MediafireApiResp<MediafireLinks>>("/file/get_links.php", {
      quick_key: quickKey,
      link_type: "direct_download",
    })
    this.checkResult(resp.response?.result)
    const url = resp.response?.links?.[0]?.direct_download || resp.response?.links?.[0]?.normal_download
    if (!url) throw new Error("[MediaFire] no download link found")
    return url
  }

  async mkdir(parentKey: string, name: string): Promise<string> {
    const resp = await this.postForm<MediafireApiResp<MediafireFolderCreate>>(
      "/folder/create.php",
      { parent_key: parentKey, foldername: name },
    )
    this.checkResult(resp.response?.result)
    return resp.response?.folder_key || ""
  }

  async rename(id: string, name: string, isDir: boolean): Promise<void> {
    if (isDir) {
      const resp = await this.postForm<MediafireApiResp<any>>("/folder/update.php", {
        folder_key: id,
        foldername: name,
      })
      this.checkResult(resp.response?.result)
    } else {
      const resp = await this.postForm<MediafireApiResp<any>>("/file/update.php", {
        quick_key: id,
        filename: name,
      })
      this.checkResult(resp.response?.result)
    }
  }

  async move(id: string, dstKey: string, isDir: boolean): Promise<void> {
    if (isDir) {
      const resp = await this.postForm<MediafireApiResp<any>>("/folder/move.php", {
        folder_key_src: id,
        folder_key_dst: dstKey,
      })
      this.checkResult(resp.response?.result)
    } else {
      const resp = await this.postForm<MediafireApiResp<any>>("/file/move.php", {
        quick_key: id,
        folder_key: dstKey,
      })
      this.checkResult(resp.response?.result)
    }
  }

  async copy(id: string, dstKey: string, isDir: boolean): Promise<void> {
    if (isDir) {
      const resp = await this.postForm<MediafireApiResp<any>>("/folder/copy.php", {
        folder_key_src: id,
        folder_key_dst: dstKey,
      })
      this.checkResult(resp.response?.result)
    } else {
      const resp = await this.postForm<MediafireApiResp<any>>("/file/copy.php", {
        quick_key: id,
        folder_key: dstKey,
      })
      this.checkResult(resp.response?.result)
    }
  }

  async remove(id: string, isDir: boolean): Promise<void> {
    if (isDir) {
      const resp = await this.postForm<MediafireApiResp<any>>("/folder/delete.php", {
        folder_key: id,
      })
      this.checkResult(resp.response?.result)
    } else {
      const resp = await this.postForm<MediafireApiResp<any>>("/file/delete.php", {
        quick_key: id,
      })
      this.checkResult(resp.response?.result)
    }
  }
}
