// Teambition API 客户端
import {
  DriverTeambitionAddition,
  TbCollection,
  TbWork,
  TbErrResp,
} from "./types"

export class ClientTeambition {
  private addition: DriverTeambitionAddition
  private baseUrl: string

  constructor(addition: DriverTeambitionAddition) {
    this.addition = addition
    this.baseUrl =
      addition.region === "international"
        ? "https://us.teambition.com"
        : "https://www.teambition.com"
  }

  async init(): Promise<void> {
    if (!this.addition.cookie) throw new Error("[Teambition] cookie is required")
    if (!this.addition.project_id) throw new Error("[Teambition] project_id is required")
    // 验证 cookie 有效
    const resp = await fetch(`${this.baseUrl}/api/v2/roles`, {
      headers: { Cookie: this.addition.cookie },
    })
    if (resp.status >= 400) throw new Error(`[Teambition] init failed: HTTP ${resp.status}`)
  }

  private async request<T = any>(pathname: string, method: string, body?: any, query?: Record<string, string>): Promise<T> {
    const qs = query ? "?" + new URLSearchParams(query).toString() : ""
    const headers: Record<string, string> = { Cookie: this.addition.cookie }
    const options: RequestInit = { method, headers }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
      headers["Content-Type"] = "application/json"
    }
    const resp = await fetch(`${this.baseUrl}${pathname}${qs}`, options)
    if (resp.status === 204 || resp.status === 201) return {} as T
    const data = await resp.json().catch(() => ({}))
    if ((data as TbErrResp).name || (data as TbErrResp).message) {
      throw new Error(`[Teambition] ${(data as TbErrResp).message || (data as TbErrResp).name}`)
    }
    return data as T
  }

  async getFiles(parentId: string): Promise<{ folders: TbCollection[]; works: TbWork[] }> {
    const order = `${this.addition.order_by || "fileName"}${this.addition.order_direction || "Asc"}`
    const baseQuery: Record<string, string> = {
      _parentId: parentId,
      _projectId: this.addition.project_id,
      order,
      count: "50",
    }

    // 文件夹
    const folders: TbCollection[] = []
    let page = 1
    while (true) {
      const list = await this.request<TbCollection[]>("/api/collections", "GET", undefined, {
        ...baseQuery,
        page: String(page),
      })
      if (!Array.isArray(list) || list.length === 0) break
      folders.push(...list.filter((c) => c.title))
      page++
      if (list.length < 50) break
    }

    // 文件
    const works: TbWork[] = []
    page = 1
    while (true) {
      const list = await this.request<TbWork[]>("/api/works", "GET", undefined, {
        ...baseQuery,
        page: String(page),
      })
      if (!Array.isArray(list) || list.length === 0) break
      works.push(...list)
      page++
      if (list.length < 50) break
    }

    return { folders, works }
  }

  /** 下载链接：先请求一次拿 302 最终地址 */
  async resolveDownloadUrl(url: string): Promise<string> {
    const resp = await fetch(url, {
      headers: { Cookie: this.addition.cookie },
      redirect: "manual",
    })
    if (resp.status === 302) {
      const loc = resp.headers.get("location")
      if (loc) return loc
    }
    return url
  }

  async mkdir(parentId: string, name: string): Promise<void> {
    await this.request("/api/collections", "POST", {
      objectType: "collection",
      _projectId: this.addition.project_id,
      _creatorId: "",
      created: "",
      updated: "",
      title: name,
      color: "blue",
      description: "",
      workCount: 0,
      collectionType: "",
      recentWorks: [],
      _parentId: parentId,
      subCount: null,
    })
  }

  async move(id: string, dstId: string, isDir: boolean): Promise<void> {
    const pre = isDir ? "/api/collections/" : "/api/works/"
    await this.request(`${pre}${id}/move`, "PUT", { _parentId: dstId })
  }

  async rename(id: string, newName: string, isDir: boolean): Promise<void> {
    if (isDir) {
      await this.request(`/api/collections/${id}`, "PUT", { title: newName })
    } else {
      await this.request(`/api/works/${id}`, "PUT", { fileName: newName })
    }
  }

  async copy(id: string, dstId: string, isDir: boolean): Promise<void> {
    const pre = isDir ? "/api/collections/" : "/api/works/"
    await this.request(`${pre}${id}/fork`, "PUT", { _parentId: dstId })
  }

  async remove(id: string, isDir: boolean): Promise<void> {
    const pre = isDir ? "/api/collections/" : "/api/works/"
    await this.request(`${pre}${id}/archive`, "POST")
  }
}
