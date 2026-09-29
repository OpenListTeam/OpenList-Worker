// Misskey drive API 客户端
import { DriverMisskeyAddition, MisskeyFile, MisskeyFolder } from "./types"

export class ClientMisskey {
  private endpoint: string
  private token: string

  constructor(addition: DriverMisskeyAddition) {
    this.endpoint = (addition.endpoint || "").replace(/\/+$/, "")
    this.token = addition.access_token || ""
  }

  async init(): Promise<void> {
    if (!this.endpoint) throw new Error("[Misskey] endpoint is required")
    if (!this.token) throw new Error("[Misskey] access_token is required")
  }

  private async post<T = any>(path: string, body: any): Promise<T> {
    const resp = await fetch(`${this.endpoint}/api/drive${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body || {}),
    })
    if (resp.status >= 400) {
      throw new Error(`[Misskey] ${resp.status} ${await resp.text().catch(() => "")}`)
    }
    return (await resp.json().catch(() => ({}))) as T
  }

  async getFiles(folderId?: string): Promise<MisskeyFile[]> {
    return this.post<MisskeyFile[]>("/files", folderId ? { folderId } : {})
  }

  async getFolders(folderId?: string): Promise<MisskeyFolder[]> {
    return this.post<MisskeyFolder[]>("/folders", folderId ? { folderId } : {})
  }

  async showFile(fileId: string): Promise<MisskeyFile> {
    return this.post<MisskeyFile>("/files/show", { fileId })
  }

  async createFolder(name: string, parentId?: string): Promise<MisskeyFolder> {
    return this.post<MisskeyFolder>("/folders/create", { name, ...(parentId ? { parentId } : {}) })
  }

  async updateFolder(folderId: string, data: { name?: string; parentId?: string | null }): Promise<MisskeyFolder> {
    return this.post<MisskeyFolder>("/folders/update", { folderId, ...data })
  }

  async updateFile(fileId: string, data: { name?: string; folderId?: string | null }): Promise<MisskeyFile> {
    return this.post<MisskeyFile>("/files/update", { fileId, ...data })
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.post("/folders/delete", { folderId })
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.post("/files/delete", { fileId })
  }

  async uploadFromUrl(url: string, folderId?: string): Promise<MisskeyFile> {
    return this.post<MisskeyFile>("/files/upload-from-url", {
      url,
      ...(folderId ? { folderId } : {}),
    })
  }
}
