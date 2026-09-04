// KodBox API 客户端
import { DriverKodboxAddition, KodboxCommonResp, KodboxListData, KodboxFolderOrFile } from "./types"

export class ClientKodbox {
  private address: string
  private addition: DriverKodboxAddition
  private authorization = ""

  constructor(addition: DriverKodboxAddition) {
    this.addition = addition
    this.address = (addition.address || "").replace(/\/+$/, "")
  }

  async init(): Promise<void> {
    if (!this.address) throw new Error("[KodBox] address is required")
    await this.getToken()
  }

  private async getToken(): Promise<void> {
    const form = new URLSearchParams({
      name: this.addition.username || "",
      password: this.addition.password || "",
    })
    const resp = await fetch(`${this.address}/?user/index/loginSubmit`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
    const data: KodboxCommonResp = await resp.json().catch(() => ({ code: false }))
    if (data.code === false) {
      throw new Error(`[KodBox] login failed: ${JSON.stringify(data.data || data)}`)
    }
    this.authorization = String(data.info || "")
  }

  private async request(
    endpoint: string,
    formData: Record<string, string>,
  ): Promise<KodboxCommonResp> {
    const form = new URLSearchParams({ accessToken: this.authorization, ...formData })
    const resp = await fetch(`${this.address}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      redirect: "follow",
    })
    const data: KodboxCommonResp = await resp.json().catch(() => ({ code: false }))
    // token 过期：code === "10001" 时重新登录重试一次
    if (data.code === "10001") {
      await this.getToken()
      return this.request(endpoint, formData)
    }
    if (data.code === false) {
      throw new Error(`[KodBox] ${data.data || "request failed"}`)
    }
    return data
  }

  async list(path: string): Promise<KodboxFolderOrFile[]> {
    const resp = await this.request("/?explorer/list/path", { path })
    const listData = resp.data as KodboxListData | undefined
    if (!listData) return []
    return [...(listData.folderList || []), ...(listData.fileList || [])]
  }

  downloadUrl(path: string): string {
    return `${this.address}/?explorer/index/fileOut&path=${encodeURIComponent(path)}&download=1&accessToken=${encodeURIComponent(this.authorization)}`
  }

  async mkdir(path: string): Promise<void> {
    await this.request("/?explorer/index/mkdir", { path })
  }

  async rename(path: string, newName: string): Promise<void> {
    await this.request("/?explorer/index/pathRename", { path, newName })
  }

  async move(path: string, name: string, dstDir: string): Promise<void> {
    await this.request("/?explorer/index/pathCuteTo", {
      dataArr: JSON.stringify([{ path, name }]),
      path: dstDir,
    })
  }

  async copy(path: string, name: string, dstDir: string): Promise<void> {
    await this.request("/?explorer/index/pathCopyTo", {
      dataArr: JSON.stringify([{ path, name }]),
      path: dstDir,
    })
  }

  async remove(path: string, name: string): Promise<void> {
    await this.request("/?explorer/index/pathDelete", {
      dataArr: JSON.stringify([{ path, name }]),
      shiftDelete: "1",
    })
  }

  async put(dirPath: string, fileName: string, content: Buffer): Promise<void> {
    const form = new FormData()
    form.append("accessToken", this.authorization)
    form.append("path", dirPath)
    form.append("file", new Blob([content]), fileName)
    const resp = await fetch(`${this.address}/?explorer/upload/fileUpload`, {
      method: "POST",
      body: form,
    })
    const data: KodboxCommonResp = await resp.json().catch(() => ({ code: false }))
    if (data.code === false) {
      throw new Error(`[KodBox] ${data.data || "upload failed"}`)
    }
  }
}
