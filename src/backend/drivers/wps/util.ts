import {
  WpsAddition,
  WpsFileInfo,
  WpsGroup,
  WpsLoginState,
  WpsFilesResp,
  WpsDownloadResp,
  WpsSpacesResp,
  WpsServiceSpaceResp,
} from "./types"

export const ENDPOINT_BUSINESS = "https://365.kdocs.cn"
export const ENDPOINT_PERSONAL = "https://drive.wps.cn"

export class WpsApiClient {
  private addition: WpsAddition
  public loginState?: WpsLoginState

  constructor(addition: WpsAddition) {
    this.addition = addition
  }

  isPersonal(): boolean {
    if (this.loginState?.is_company_account !== undefined) {
      return !this.loginState.is_company_account
    }
    return (this.addition.mode || "Personal") === "Personal"
  }

  driveHost(): string {
    return this.isPersonal() ? ENDPOINT_PERSONAL : ENDPOINT_BUSINESS
  }

  drivePrefix(): string {
    return this.isPersonal() ? "" : "/3rd/drive"
  }

  driveUrl(path: string): string {
    return `${this.driveHost()}${this.drivePrefix()}${path}`
  }

  getUA(): string {
    return (
      this.addition.custom_ua ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
  }

  async request<T = any>(
    url: string,
    options: {
      method?: string
      body?: any
      headers?: Record<string, string>
      params?: Record<string, string>
    } = {},
  ): Promise<T> {
    const fullUrl = new URL(url)
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        fullUrl.searchParams.set(k, v)
      }
    }

    const headers: Record<string, string> = {
      Cookie: this.addition.cookie,
      Accept: "application/json",
      "User-Agent": this.getUA(),
      Origin: this.driveHost(),
      ...options.headers,
    }

    let body: any = undefined
    if (options.body !== undefined) {
      if (typeof options.body === "object") {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(options.body)
      } else {
        body = options.body
      }
    }

    const res = await fetch(fullUrl.toString(), {
      method: options.method || "GET",
      headers,
      body,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`WPS API error (${res.status}): ${text}`)
    }

    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as any
      if (json.result && json.result !== "ok" && json.result !== "success") {
        throw new Error(`WPS API error: ${json.result} - ${json.msg || ""}`)
      }
      return json as T
    }
    return (await res.text()) as any
  }

  async init(): Promise<void> {
    if (!this.addition.cookie) {
      throw new Error("WPS cookie is required")
    }

    const res = await this.request<WpsLoginState>(
      "https://account.kdocs.cn/api/v3/islogin",
      { method: "GET" },
    )
    this.loginState = res
  }

  async getGroups(): Promise<WpsGroup[]> {
    if (this.isPersonal()) {
      const res = await this.request<{
        groups: Array<{ id: number; name: string }>
      }>(this.driveUrl("/api/v3/groups"))
      return (res.groups || []).map((g) => ({
        group_id: g.id,
        id: g.id,
        name: g.name,
      }))
    }

    const companyId = this.loginState?.companyid || 0
    const url = `${ENDPOINT_BUSINESS}/3rd/plus/groups/v1/companies/${companyId}/users/self/groups/private`
    const res = await this.request<{ groups: WpsGroup[] }>(url)
    return res.groups || []
  }

  async getFiles(groupId: number, parentId: number): Promise<WpsFileInfo[]> {
    const files: WpsFileInfo[] = []
    let nextOffset = 0

    for (let i = 0; i < 50; i++) {
      const url = this.driveUrl(`/api/v5/groups/${groupId}/files`)
      const res = await this.request<WpsFilesResp>(url, {
        params: {
          parentid: String(parentId),
          offset: String(nextOffset),
        },
      })

      if (res.files && res.files.length > 0) {
        files.push(...res.files)
      }

      if (res.next_offset === -1 || res.next_offset === undefined) {
        break
      }
      nextOffset = res.next_offset
    }

    return files
  }

  async getDownloadUrl(groupId: number, fileId: number): Promise<string> {
    const url = this.driveUrl(
      `/api/v5/groups/${groupId}/files/${fileId}/download?support_checksums=sha1`,
    )
    const res = await this.request<WpsDownloadResp>(url)
    if (!res.url) {
      throw new Error("Empty download url received from WPS")
    }
    return res.url
  }

  async createFolder(
    groupId: number,
    parentId: number,
    name: string,
  ): Promise<void> {
    await this.request(this.driveUrl("/api/v5/files/folder"), {
      method: "POST",
      body: {
        groupid: groupId,
        parentid: parentId,
        name,
      },
    })
  }

  async rename(
    groupId: number,
    fileId: number,
    newName: string,
  ): Promise<void> {
    await this.request(
      this.driveUrl(`/api/v3/groups/${groupId}/files/${fileId}`),
      {
        method: "PUT",
        body: { fname: newName },
      },
    )
  }

  async move(
    groupId: number,
    fileId: number,
    targetGroupId: number,
    targetParentId: number,
  ): Promise<void> {
    await this.request(
      this.driveUrl(`/api/v3/groups/${groupId}/files/batch/move`),
      {
        method: "POST",
        body: {
          fileids: [fileId],
          target_groupid: targetGroupId,
          target_parentid: targetParentId,
        },
      },
    )
  }

  async copy(
    groupId: number,
    fileId: number,
    targetGroupId: number,
    targetParentId: number,
  ): Promise<void> {
    await this.request(
      this.driveUrl(`/api/v3/groups/${groupId}/files/batch/copy`),
      {
        method: "POST",
        body: {
          fileids: [fileId],
          groupid: groupId,
          target_groupid: targetGroupId,
          target_parentid: targetParentId,
          duplicated_name_model: 1,
        },
      },
    )
  }

  async delete(groupId: number, fileId: number): Promise<void> {
    await this.request(
      this.driveUrl(`/api/v3/groups/${groupId}/files/batch/delete`),
      {
        method: "POST",
        body: {
          fileids: [fileId],
        },
      },
    )
  }

  async getStorageDetails(): Promise<{ total?: number; used?: number }> {
    if (this.isPersonal()) {
      const url = `${ENDPOINT_PERSONAL}/api/v3/spaces`
      const res = await this.request<WpsSpacesResp>(url)
      return { total: res.total, used: res.used }
    }

    const companyId = this.loginState?.companyid || 0
    const url = `${ENDPOINT_BUSINESS}/3rd/plussvr/compose/v1/u/companies/batch/service-space?comp_ids=${companyId}`
    const res = await this.request<WpsServiceSpaceResp>(url)
    const info = (res.info || []).find((i) => i.id === companyId)
    if (info) {
      return { total: info.space_total, used: info.space_used }
    }
    return {}
  }
}
