// AList V3 driver — 通过 HTTP API 访问另一个 OpenList / AList 实例
// 移植自 OpenList Go 版 drivers/alist_v3。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { AListV3Addition, AListObj, AListResp } from "./types"

export class AListV3Driver implements StorageDriver {
  private addition: AListV3Addition
  private token: string
  private onTokenUpdate?: (token: string) => void

  constructor(
    addition: AListV3Addition,
    onTokenUpdate?: (token: string) => void,
  ) {
    this.addition = addition || {}
    this.token = this.addition.token || ""
    this.onTokenUpdate = onTokenUpdate
  }

  private get baseUrl(): string {
    return (this.addition.url || "").replace(/\/+$/, "")
  }

  async init(): Promise<void> {
    if (!this.baseUrl) {
      throw new Error("[AListV3] url is required")
    }
    // 验证 token；username 不匹配时重新登录
    try {
      const me = await this.request<{ username: string }>("/me", "GET")
      if (this.addition.username && me.username !== this.addition.username) {
        await this.login()
      }
    } catch {
      if (this.addition.username) {
        await this.login()
      }
    }
  }

  private async login(): Promise<void> {
    if (!this.addition.username) return
    const data = await this.request<{ token: string }>(
      "/auth/login",
      "POST",
      {
        username: this.addition.username,
        password: this.addition.password,
      },
      false,
    )
    this.token = data.token
    if (this.onTokenUpdate) {
      try {
        await this.onTokenUpdate(this.token)
      } catch {}
    }
  }

  private async request<T>(
    api: string,
    method: string,
    body?: any,
    retry = true,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api${api}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: this.token } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const data: AListResp<T> = await res.json().catch(() => ({
      code: res.status,
      message: "invalid response",
      data: null,
    }))
    if (data.code !== 200) {
      if ((data.code === 401 || data.code === 403) && retry) {
        await this.login()
        return this.request<T>(api, method, body, false)
      }
      throw new Error(
        `[AListV3] request failed: code=${data.code}, message=${data.message}`,
      )
    }
    return data.data as T
  }

  private toFileItem(obj: AListObj): FileItem {
    return {
      name: obj.name,
      size: obj.size || 0,
      is_dir: !!obj.is_dir,
      modified: obj.modified || new Date().toISOString(),
      sign: obj.sign || "",
      thumb: obj.thumb || "",
      type: obj.type ?? calcFileType(obj.name, !!obj.is_dir),
      raw_url: "",
    }
  }

  async list(_v: string, physicalPath: string): Promise<FileItem[]> {
    const data = await this.request<{ content: AListObj[] }>(
      "/fs/list",
      "POST",
      {
        path: physicalPath,
        password: this.addition.meta_password || "",
        page: 1,
        per_page: 0,
        refresh: false,
      },
    )
    const items = (data.content || []).map((f) => this.toFileItem(f))
    return sortFileItems(items, "name", "asc")
  }

  async get(_v: string, physicalPath: string): Promise<FileItem> {
    const data = await this.request<AListObj & { raw_url: string }>(
      "/fs/get",
      "POST",
      {
        path: physicalPath,
        password: this.addition.meta_password || "",
      },
    )
    return {
      ...this.toFileItem(data),
      raw_url: data.raw_url || "",
    }
  }

  async mkdir(_v: string, physicalPath: string): Promise<void> {
    await this.request("/fs/mkdir", "POST", { path: physicalPath })
  }

  async rename(
    _v: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    await this.request("/fs/rename", "POST", {
      path: physicalPath,
      name: newName,
    })
  }

  async remove(
    _v: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const parent = physicalPath.split("/").slice(0, -1).join("/") || "/"
    await this.request("/fs/remove", "POST", { dir: parent, names })
  }

  async move(
    _srcDir: string,
    _dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcParent = srcPhys.split("/").slice(0, -1).join("/") || "/"
    const dstParent = dstPhys.split("/").slice(0, -1).join("/") || "/"
    await this.request("/fs/move", "POST", {
      src_dir: srcParent,
      dst_dir: dstParent,
      names,
    })
  }

  async copy(
    _srcDir: string,
    _dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcParent = srcPhys.split("/").slice(0, -1).join("/") || "/"
    const dstParent = dstPhys.split("/").slice(0, -1).join("/") || "/"
    await this.request("/fs/copy", "POST", {
      src_dir: srcParent,
      dst_dir: dstParent,
      names,
    })
  }

  async put(_v: string, physicalPath: string, content: Buffer): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/fs/put`, {
      method: "PUT",
      headers: {
        Authorization: this.token,
        "File-Path": encodeURIComponent(physicalPath),
        "Content-Type": "application/octet-stream",
      },
      body: content as any,
    })
    const data: AListResp<any> = await res.json().catch(() => ({
      code: res.status,
      message: "invalid response",
      data: null,
    }))
    if (data.code !== 200) {
      throw new Error(
        `[AListV3] put failed: code=${data.code}, message=${data.message}`,
      )
    }
  }
}
