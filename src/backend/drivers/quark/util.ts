// Quark/UC drive HTTP client utilities
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/quark_uc
import {
  QuarkAddition,
  QuarkConf,
  QuarkFile,
  QuarkSortResp,
  QuarkDownResp,
  QuarkMkdirResp,
  QuarkRenameResp,
  QuarkUploadPreHashResp,
  QuarkUploadCommitResp,
  QuarkVariant,
} from "./types"

// ================================================================
// Variant configurations (Quark vs UC)
// ================================================================

const QUARK_CONF: QuarkConf = {
  ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch",
  referer: "https://pan.quark.cn",
  api: "https://drive-m.quark.cn/1/clouddrive",
  pr: "ucpro",
}

const UC_CONF: QuarkConf = {
  ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) uc-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch",
  referer: "https://drive.uc.cn",
  api: "https://pc-api.uc.cn/1/clouddrive",
  pr: "UCBrowser",
}

function getConf(variant: QuarkVariant = "Quark"): QuarkConf {
  return variant === "UC" ? UC_CONF : QUARK_CONF
}

// ================================================================
// Cookie helpers
// ================================================================

function getCookieValue(cookieStr: string, key: string): string | null {
  const parts = cookieStr.split(";").map((p) => p.trim())
  for (const part of parts) {
    const idx = part.indexOf("=")
    if (idx !== -1 && part.substring(0, idx).trim() === key) {
      return part.substring(idx + 1).trim()
    }
  }
  return null
}

function setCookieValue(cookieStr: string, key: string, value: string): string {
  const parts = cookieStr
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
  const existing = parts.findIndex((p) => {
    const idx = p.indexOf("=")
    return idx !== -1 && p.substring(0, idx).trim() === key
  })
  const newPart = `${key}=${value}`
  if (existing !== -1) {
    parts[existing] = newPart
  } else {
    parts.push(newPart)
  }
  return parts.join("; ")
}

// ================================================================
// QuarkClient
// ================================================================

export class QuarkClient {
  private addition: QuarkAddition
  private conf: QuarkConf
  private cookie: string

  // Persisted-cookie callback (optional, used to save updated cookies)
  private onCookieUpdate?: (newCookie: string) => void

  constructor(
    addition: QuarkAddition,
    onCookieUpdate?: (newCookie: string) => void,
  ) {
    this.addition = addition
    this.conf = getConf(addition.variant || "Quark")
    this.cookie = addition.cookie || ""
    this.onCookieUpdate = onCookieUpdate
  }

  public getRootFolderId(): string {
    const id = (this.addition.root_folder_id || "").trim()
    return id || "0"
  }

  public getVariant(): QuarkVariant {
    return this.addition.variant || "Quark"
  }

  public getConf(): QuarkConf {
    return this.conf
  }

  public getCookie(): string {
    return this.cookie
  }

  // ---- Core request method ----

  async request<T = any>(
    pathname: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    queryParams?: Record<string, string>,
    body?: any,
  ): Promise<T> {
    const url = new URL(this.conf.api + pathname)
    url.searchParams.set("pr", this.conf.pr)
    url.searchParams.set("fr", "pc")
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        url.searchParams.set(k, v)
      }
    }

    const headers: Record<string, string> = {
      Cookie: this.cookie,
      Accept: "application/json, text/plain, */*",
      Referer: this.conf.referer,
      "Content-Type": "application/json",
      "User-Agent": this.conf.ua,
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }
    if (body !== undefined && method !== "GET") {
      fetchOptions.body = JSON.stringify(body)
    }

    const res = await fetch(url.toString(), fetchOptions)

    // Update __puus cookie if server refreshes it
    const setCookieHeader = res.headers.get("set-cookie")
    if (setCookieHeader) {
      const puus = extractCookieFromSetCookie(setCookieHeader, "__puus")
      if (puus) {
        this.cookie = setCookieValue(this.cookie, "__puus", puus)
        this.onCookieUpdate?.(this.cookie)
      }
      // Quark transcoding also refreshes __pus
      if (this.addition.variant === "Quark") {
        const pus = extractCookieFromSetCookie(setCookieHeader, "__pus")
        if (pus) {
          this.cookie = setCookieValue(this.cookie, "__pus", pus)
          this.onCookieUpdate?.(this.cookie)
        }
      }
    }

    const data = (await res.json()) as any
    if (
      !res.ok ||
      (data.status !== undefined && data.status >= 400) ||
      (data.code !== undefined && data.code !== 0)
    ) {
      const msg = data.message || data.msg || `HTTP ${res.status}`
      throw new Error(
        `[Quark/UC] API error [${res.status}] ${pathname}: ${msg}`,
      )
    }
    return data as T
  }

  // ---- File listing ----

  async getFiles(parentId: string): Promise<QuarkFile[]> {
    const files: QuarkFile[] = []
    let page = 1
    const size = 100

    const query: Record<string, string> = {
      pdir_fid: parentId,
      _size: String(size),
      _fetch_total: "1",
      fetch_all_file: "1",
      fetch_risk_file_name: "1",
    }

    if (this.addition.order_by && this.addition.order_by !== "none") {
      const dir = this.addition.order_direction || "asc"
      query._sort = `file_type:asc,${this.addition.order_by}:${dir}`
    }

    while (true) {
      query._page = String(page)
      const resp = await this.request<QuarkSortResp>("/file/sort", "GET", query)
      const list = resp?.data?.list || []
      if (list.length === 0) break

      for (const file of list) {
        // HTML-unescape file names (the Go source does html.UnescapeString)
        file.file_name = unescapeHtml(file.file_name)

        if (this.addition.only_list_video_file) {
          // Only include videos (category === 1) and folders
          if (!file.file || file.category === 1) {
            files.push(file)
          }
        } else {
          files.push(file)
        }
      }

      const total = resp.metadata?.total ?? 0
      if (total > 0 && page * size >= total) break
      if (list.length < size) break
      page++
    }

    return files
  }

  // ---- Download link ----

  async getDownloadUrl(
    fileId: string,
    fileName: string,
  ): Promise<{ url: string; headers: Record<string, string> }> {
    const resp = await this.request<QuarkDownResp>(
      "/file/download",
      "POST",
      undefined,
      {
        fids: [fileId],
      },
    )

    const item = resp.data?.[0]
    if (!item?.download_url) {
      throw new Error(`[Quark/UC] No download_url for file: ${fileName}`)
    }

    return {
      url: item.download_url,
      headers: {
        Cookie: this.cookie,
        Referer: this.conf.referer,
        "User-Agent": this.conf.ua,
      },
    }
  }

  // ---- Mkdir ----

  async mkdir(parentId: string, dirName: string): Promise<string> {
    const resp = await this.request<QuarkMkdirResp>(
      "/file",
      "POST",
      undefined,
      {
        dir_init_lock: false,
        dir_path: "",
        file_name: dirName,
        pdir_fid: parentId,
      },
    )
    return resp.data?.[0]?.fid || ""
  }

  // ---- Rename ----

  async rename(fileId: string, newName: string): Promise<void> {
    await this.request<QuarkRenameResp>("/file/rename", "POST", undefined, {
      fid: fileId,
      file_name: newName,
    })
  }

  // ---- Delete ----

  async remove(fileIds: string[]): Promise<void> {
    await this.request("/file/delete", "POST", undefined, {
      action_type: 2,
      filelist: fileIds,
      exclude_fids: [],
    })
  }

  // ---- Move ----

  async move(fileIds: string[], toDirId: string): Promise<void> {
    await this.request("/file/move", "POST", undefined, {
      filelist: fileIds,
      to_pdir_fid: toDirId,
    })
  }

  // ---- Copy ----

  async copy(fileIds: string[], toDirId: string): Promise<void> {
    await this.request("/file/copy", "POST", undefined, {
      filelist: fileIds,
      to_pdir_fid: toDirId,
    })
  }

  // ---- Upload: pre-hash check ----

  async uploadPreHash(
    parentId: string,
    fileName: string,
    fileSize: number,
    preHash: string,
  ): Promise<QuarkUploadPreHashResp["data"]> {
    const resp = await this.request<QuarkUploadPreHashResp>(
      "/file/uploadpre",
      "POST",
      undefined,
      {
        ccp_hash_update: true,
        dir_name: "",
        file_name: fileName,
        pdir_fid: parentId,
        size: fileSize,
        pre_hash: preHash,
        format_type: guessFormatType(fileName),
      },
    )
    return resp.data
  }

  // ---- Upload: commit after S3 upload ----

  async uploadCommit(
    taskId: string,
    md5: string,
    objKey: string,
  ): Promise<QuarkUploadCommitResp["data"]> {
    const resp = await this.request<QuarkUploadCommitResp>(
      "/file/upload/commit",
      "POST",
      undefined,
      { task_id: taskId, md5: md5, obj_key: objKey },
    )
    return resp.data
  }

  // ---- Init (validates cookie by calling /config) ----

  async init(): Promise<void> {
    if (!this.cookie?.trim()) {
      console.warn("[Quark/UC] Cookie is empty, skipping init.")
      return
    }
    try {
      await this.request("/config", "GET")
      console.log(`[Quark/UC] (${this.addition.variant || "Quark"}) init OK`)
    } catch (e: any) {
      console.warn(`[Quark/UC] init warning:`, e.message)
    }
  }
}

// ================================================================
// Helpers
// ================================================================

function extractCookieFromSetCookie(
  header: string,
  name: string,
): string | null {
  // Multiple Set-Cookie headers may be joined by comma or newline
  const segments = header.split(/,(?=[^;]+=[^;]+)/)
  for (const seg of segments) {
    const parts = seg.split(";")
    const kv = parts[0].trim()
    const eqIdx = kv.indexOf("=")
    if (eqIdx !== -1) {
      const k = kv.substring(0, eqIdx).trim()
      if (k === name) {
        return kv.substring(eqIdx + 1).trim()
      }
    }
  }
  return null
}

/** Simple HTML entity unescaping (matching Go's html.UnescapeString for common cases) */
function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/** Guess the format_type from file extension for upload */
function guessFormatType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""
  const videoExts = [
    "mp4",
    "mkv",
    "avi",
    "mov",
    "flv",
    "wmv",
    "ts",
    "m2ts",
    "m4v",
    "rmvb",
    "webm",
  ]
  const audioExts = ["mp3", "flac", "aac", "wav", "ogg", "m4a", "opus"]
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "tiff"]
  const docExts = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "md",
  ]
  if (videoExts.includes(ext)) return "video"
  if (audioExts.includes(ext)) return "audio"
  if (imageExts.includes(ext)) return "image"
  if (docExts.includes(ext)) return "doc"
  return "others"
}
