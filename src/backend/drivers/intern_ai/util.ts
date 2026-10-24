// InternAI (书生云盘) cloud-disk API client.
//
// Platform: https://discovery.intern-ai.org.cn (API served from the same origin).
// Auth: every request carries `Authorization: Bearer <uaa-token>`.
// All endpoints live under /api/ml/v1/cloud-disk and answer the envelope
// {code, msg, data}; code !== 0 marks a business error.
//
// Path convention: `file_key` / `dir_path` values are absolute paths inside the
// drive with a leading slash (e.g. "/docs/readme.txt").
import type {
  InternAIAddition,
  InternAIResp,
  InternAIUrlItem,
} from "./types"

export const DEFAULT_API_BASE = "https://discovery.intern-ai.org.cn"

const EP = {
  list: "/api/ml/v1/cloud-disk/list",
  quota: "/api/ml/v1/cloud-disk/quota",
  mkdir: "/api/ml/v1/cloud-disk/mkdir",
  rename: "/api/ml/v1/cloud-disk/rename",
  move: "/api/ml/v1/cloud-disk/move",
  copy: "/api/ml/v1/cloud-disk/copy",
  remove: "/api/ml/v1/cloud-disk/delete",
  downloadUrl: "/api/ml/v1/cloud-disk/download-url",
  uploadUrl: "/api/ml/v1/cloud-disk/upload-url",
} as const

/** Normalize a drive path into the absolute file_key / dir_path form. */
export function cleanKey(p: string): string {
  const norm = String(p ?? "").replace(/\\/g, "/")
  const withSlash = norm.startsWith("/") ? norm : `/${norm}`
  const parts = withSlash.split("/").filter(Boolean)
  // resolve . / .. segments safely
  const out: string[] = []
  for (const seg of parts) {
    if (seg === ".") continue
    if (seg === "..") {
      out.pop()
      continue
    }
    out.push(seg)
  }
  return "/" + out.join("/")
}

/** Join a directory key and a name. */
export function joinKey(dir: string, name: string): string {
  return cleanKey(`${cleanKey(dir)}/${name}`)
}

/** file_type for upload-url: extension without the leading dot. */
export function fileExt(name: string): string {
  const base = String(name ?? "").split("/").pop() || ""
  const idx = base.lastIndexOf(".")
  if (idx < 0 || idx === base.length - 1) return ""
  return base.slice(idx + 1).toLowerCase()
}

export class InternAIClient {
  private addition: InternAIAddition
  private apiBase: string

  constructor(addition: InternAIAddition) {
    this.addition = addition || ({} as InternAIAddition)
    let base = String(this.addition.api_base || DEFAULT_API_BASE).trim()
    if (!base) base = DEFAULT_API_BASE
    if (!/^https?:\/\//.test(base)) base = `https://${base}`
    this.apiBase = base.replace(/\/+$/, "")
  }

  get token(): string {
    return String(this.addition.token || "").trim()
  }

  get pageSize(): number {
    const n = Math.floor(Number(this.addition.page_size))
    if (!Number.isFinite(n) || n <= 0) return 100
    return Math.min(200, n)
  }

  private async request<T>(
    ep: string,
    init: { method?: string; query?: Record<string, string>; body?: any } = {},
  ): Promise<T> {
    const method = (init.method || "GET").toUpperCase()
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
    }
    let url = `${this.apiBase}${ep}`
    if (init.query) {
      const qs = new URLSearchParams(init.query).toString()
      if (qs) url += `?${qs}`
    }
    if (init.body !== undefined) {
      headers["Content-Type"] = "application/json"
    }
    const resp = await fetch(url, {
      method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    if (resp.status === 401) {
      throw new Error(
        "[InternAI] invalid or expired token (HTTP 401); please refresh uaa-token",
      )
    }
    if (resp.status >= 400) {
      throw new Error(`[InternAI] ${ep} returned HTTP ${resp.status}`)
    }
    const json = (await resp.json().catch(() => null)) as
      | (InternAIResp<T> & Record<string, unknown>)
      | null
    if (!json) {
      throw new Error(`[InternAI] ${ep} returned a non-JSON response`)
    }
    // Some endpoints (observed on the production upload-url endpoint) answer
    // the payload directly at the top level instead of the {code,msg,data}
    // envelope. Tolerate both shapes.
    if (typeof json.code !== "number") {
      return json as unknown as T
    }
    if (json.code !== 0) {
      throw new Error(`[InternAI] ${ep} error: code=${json.code} msg=${json.msg ?? ""}`)
    }
    return json.data as T
  }

  /** Validate the token with a lightweight quota call (used by init). */
  async init(): Promise<void> {
    if (!this.token) {
      throw new Error(
        "[InternAI] token is required (the value of the uaa-token cookie on discovery.intern-ai.org.cn)",
      )
    }
    await this.request(EP.quota)
  }

  /** One page of a directory listing. */
  async listPage(
    dirPath: string,
    pageToken: string,
    pageSize: number,
  ): Promise<{ files: any[]; next_page_token: string }> {
    const data = await this.request<any>(EP.list, {
      query: {
        page_size: String(pageSize),
        page_token: pageToken || "",
        dir_path: cleanKey(dirPath),
        keyword: "",
        sort_by: "name",
        sort_order: "asc",
        dirs_only: "false",
        recursive: "false",
      },
    })
    return {
      files: Array.isArray(data?.files) ? data.files : [],
      next_page_token: String(data?.next_page_token || ""),
    }
  }

  /** All entries of a directory (auto pagination, bounded). */
  async listAll(dirPath: string): Promise<any[]> {
    const out: any[] = []
    let pageToken = ""
    for (let i = 0; i < 1000; i++) {
      const { files, next_page_token } = await this.listPage(
        dirPath,
        pageToken,
        this.pageSize,
      )
      out.push(...files)
      if (!next_page_token || next_page_token === pageToken) break
      pageToken = next_page_token
    }
    return out
  }

  /** Resolve the presigned download URL of a single file. */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const data = await this.request<{ urls?: InternAIUrlItem[] }>(
      EP.downloadUrl,
      { method: "POST", body: { file_keys: [cleanKey(fileKey)] } },
    )
    for (const u of data?.urls || []) {
      if (u.file_key && cleanKey(u.file_key) !== cleanKey(fileKey)) continue
      if (u.skipped || !u.download_url) continue
      return u.download_url
    }
    return ""
  }

  /** Resolve presigned download URLs of several files at once. */
  async getDownloadUrls(
    fileKeys: string[],
  ): Promise<Record<string, string>> {
    const keys = fileKeys.map(cleanKey)
    const data = await this.request<{ urls?: InternAIUrlItem[] }>(
      EP.downloadUrl,
      { method: "POST", body: { file_keys: keys } },
    )
    const map: Record<string, string> = {}
    for (const u of data?.urls || []) {
      if (u.skipped || !u.download_url || !u.file_key) continue
      map[cleanKey(u.file_key)] = u.download_url
    }
    return map
  }

  /** Request a presigned upload URL for one file. */
  async getUploadUrl(
    dirPath: string,
    fileName: string,
    fileSize: number,
    conflictStrategy = "overwrite",
  ): Promise<string> {
    const data = await this.request<{ urls?: InternAIUrlItem[] }>(EP.uploadUrl, {
      method: "POST",
      body: {
        dir_path: cleanKey(dirPath),
        files: [
          {
            file_name: fileName,
            file_size: Math.max(0, Math.floor(Number(fileSize) || 0)),
            file_type: fileExt(fileName),
            conflict_strategy: conflictStrategy,
          },
        ],
      },
    })
    for (const u of data?.urls || []) {
      if (u.skipped) continue
      if (u.upload_url) return u.upload_url
    }
    throw new Error(`[InternAI] no upload url granted for ${fileName}`)
  }

  /** PUT the raw bytes to a presigned upload URL. */
  async putRaw(
    uploadUrl: string,
    content: Uint8Array,
    contentType = "application/octet-stream",
  ): Promise<void> {
    const resp = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: content as unknown as BodyInit,
    })
    if (!resp.ok && resp.status !== 204) {
      throw new Error(`[InternAI] upload PUT returned HTTP ${resp.status}`)
    }
  }

  async mkdir(dirPath: string, dirName: string): Promise<void> {
    await this.request(EP.mkdir, {
      method: "POST",
      body: { dir_path: cleanKey(dirPath), dir_name: dirName },
    })
  }

  async rename(srcKey: string, newName: string): Promise<void> {
    await this.request(EP.rename, {
      method: "POST",
      body: {
        src_key: cleanKey(srcKey),
        new_name: newName,
        conflict_strategy: "overwrite",
      },
    })
  }

  async move(srcKeys: string[], dstDir: string): Promise<void> {
    await this.request(EP.move, {
      method: "POST",
      body: {
        src_keys: srcKeys.map(cleanKey),
        dst_dir: cleanKey(dstDir),
        conflict_strategy: "overwrite",
      },
    })
  }

  async copy(srcKeys: string[], dstDir: string): Promise<void> {
    await this.request(EP.copy, {
      method: "POST",
      body: {
        src_keys: srcKeys.map(cleanKey),
        dst_dir: cleanKey(dstDir),
        conflict_strategy: "overwrite",
      },
    })
  }

  async remove(fileKeys: string[]): Promise<void> {
    await this.request(EP.remove, {
      method: "POST",
      body: { file_keys: fileKeys.map(cleanKey) },
    })
  }

  /** Quota info (bytes when the deployment reports them, GB numbers otherwise). */
  async quota(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(EP.quota)
  }
}
