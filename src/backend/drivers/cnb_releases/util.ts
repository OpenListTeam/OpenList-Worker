// CNB Releases API 客户端
import { DriverCnbReleasesAddition, CNBRelease, CNBAsset } from "./types"

const API_BASE = "https://api.cnb.cool"
const WEB_BASE = "https://cnb.cool"

export class ClientCnbReleases {
  private repo: string
  private token: string
  private useTagName: boolean

  constructor(addition: DriverCnbReleasesAddition) {
    this.repo = addition.repo || ""
    this.token = addition.token || ""
    this.useTagName = !!addition.use_tag_name
  }

  async init(): Promise<void> {
    if (!this.repo) throw new Error("[CNB Releases] repo is required")
    if (!this.token) throw new Error("[CNB Releases] token is required")
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    isForm = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
    }
    const options: RequestInit = { method, headers }
    if (body !== undefined) {
      if (isForm) {
        options.body = new URLSearchParams(body).toString()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
      } else {
        options.body = JSON.stringify(body)
        headers["Content-Type"] = "application/json"
      }
    }
    const resp = await fetch(`${API_BASE}${path}`, options)
    if (resp.status !== 200 && resp.status !== 201 && resp.status !== 204) {
      throw new Error(
        `[CNB Releases] ${resp.status} ${await resp.text().catch(() => "")}`,
      )
    }
    if (resp.status === 204) return {} as T
    return (await resp.json().catch(() => ({}))) as T
  }

  /** 根目录：所有 releases */
  async listReleases(): Promise<CNBRelease[]> {
    return this.request<CNBRelease[]>("GET", `/${this.repo}/-/releases`)
  }

  async getRelease(id: string): Promise<CNBRelease> {
    return this.request<CNBRelease>("GET", `/${this.repo}/-/releases/${id}`)
  }

  /** 路径里是 release 名称（TS 链路不传 Go 对象 ID），需先解析出 ID 再调 API */
  async findRelease(idOrName: string): Promise<CNBRelease | null> {
    const releases = await this.listReleases().catch(() => [] as CNBRelease[])
    if (!Array.isArray(releases)) return null
    return (
      releases.find((r) => r.id === idOrName) ||
      releases.find((r) => this.releaseName(r) === idOrName) ||
      releases.find((r) => r.tag_name === idOrName) ||
      null
    )
  }

  /** 兼容按资产名称或 ID 查找 */
  findAsset(release: CNBRelease, idOrName: string): CNBAsset | null {
    return (
      release.assets.find((a) => a.id === idOrName) ||
      release.assets.find((a) => a.name === idOrName) ||
      null
    )
  }

  releaseName(r: CNBRelease): string {
    return this.useTagName ? r.tag_name : r.name
  }

  createRelease(name: string, branch: string): Promise<void> {
    return this.request("POST", `/${this.repo}/-/releases`, {
      name,
      tag_name: name,
      target_commitish: branch || "main",
    })
  }

  renameRelease(id: string, newName: string): Promise<void> {
    return this.request(
      "PATCH",
      `/${this.repo}/-/releases/${id}`,
      { name: newName },
      true,
    )
  }

  deleteRelease(id: string): Promise<void> {
    return this.request("DELETE", `/${this.repo}/-/releases/${id}`)
  }

  deleteAsset(releaseId: string, assetId: string): Promise<void> {
    return this.request(
      "DELETE",
      `/${this.repo}/-/releases/${releaseId}/assets/${assetId}`,
    )
  }

  assetDownloadUrl(asset: CNBAsset): string {
    return `${WEB_BASE}${asset.path}`
  }
}
