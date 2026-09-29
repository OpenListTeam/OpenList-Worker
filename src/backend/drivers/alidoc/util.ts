// AliDoc (钉钉文档) HTTP client
import { AliDocApiResp, AliDocDentry, AliDocDownloadResp, AliDocListResp } from "./types"

export const aliDocApiBase = "https://alidocs.dingtalk.com"
export const aliDocUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

function errMessage(r: AliDocApiResp | null): string {
  if (!r) return "request failed"
  if (r.message) return r.message
  if (r.msg) return r.msg
  return "request failed"
}

export class AliDocClient {
  constructor(private cookie: string) {}

  private headers(): Record<string, string> {
    return {
      Cookie: this.cookie,
      Accept: "application/json, text/plain, */*",
      Referer: aliDocApiBase + "/",
      Origin: aliDocApiBase,
      "User-Agent": aliDocUserAgent,
    }
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: { ...this.headers(), ...(init?.headers || {}) },
    })
    const body = (await res.json().catch(() => ({}))) as T & AliDocApiResp
    if (!res.ok || (body as AliDocApiResp).isSuccess === false) {
      throw new Error(errMessage(body as unknown as AliDocApiResp))
    }
    return body
  }

  async checkCookie(): Promise<void> {
    await this.request(`${aliDocApiBase}/portal/api/v1/mine/info`)
  }

  async list(dentryUuid: string): Promise<AliDocDentry[]> {
    const q = new URLSearchParams({
      dentryUuid,
      withParentAncestors: "true",
      orderType: "SORT_KEY",
      sortType: "desc",
      listDentrySource: "2",
      pageSize: "1000",
    })
    const resp = await this.request<AliDocListResp>(
      `${aliDocApiBase}/box/api/v2/dentry/list?${q.toString()}`,
    )
    return resp.data?.children || []
  }

  async download(dentryUuid: string): Promise<string> {
    const q = new URLSearchParams({
      dentryUuid,
      version: "1",
      supportDownloadTypes: "URL_PRE_SIGNATURE,HTTP_TO_CENTER",
      downloadType: "URL_PRE_SIGNATURE",
    })
    const resp = await this.request<AliDocDownloadResp>(
      `${aliDocApiBase}/box/api/v2/file/download?${q.toString()}`,
    )
    const urls = resp.data?.ossUrlPreSignatureInfo?.preSignUrls || []
    if (urls.length === 0) throw new Error("empty download url")
    return urls[0]
  }

  async post(path: string, body: Record<string, unknown>): Promise<void> {
    await this.request(`${aliDocApiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }
}
