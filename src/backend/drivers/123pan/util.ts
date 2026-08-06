// 123 Cloud Drive API client
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/123
import {
  Pan123Addition,
  Pan123DownloadResp,
  Pan123File,
  Pan123FilesResp,
  Pan123LoginResp,
  Pan123BaseResp,
  Pan123UserInfoResp,
} from "./types"

const MAIN_API = "https://yun.123pan.com/b/api"
const LOGIN_API = "https://login.123pan.com/api"
const SignIn = LOGIN_API + "/user/sign_in"
const UserInfo = MAIN_API + "/user/info"
const FileList = MAIN_API + "/file/list/new"
const DownloadInfo = MAIN_API + "/file/download_info"
const Mkdir = MAIN_API + "/file/upload_request"
const Move = MAIN_API + "/file/mod_pid"
const Rename = MAIN_API + "/file/rename"
const Trash = MAIN_API + "/file/trash"

// --- CRC32-based API path signing (Go signPath equivalent) ---

const CRC32_TABLE: number[] = (() => {
  const table = new Array<number>(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
})()

function crc32(str: string): number {
  let crc = 0xffffffff
  for (let i = 0; i < str.length; i++) {
    crc = CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const TABLE = [
  "a",
  "d",
  "e",
  "f",
  "g",
  "h",
  "l",
  "m",
  "y",
  "i",
  "j",
  "n",
  "o",
  "p",
  "k",
  "q",
  "r",
  "s",
  "t",
  "u",
  "b",
  "c",
  "v",
  "w",
  "s",
  "z",
]

function signPath(path: string): string {
  const random = Math.round(1e7 * Math.random()).toString()
  const now = new Date()
  // UTC+8 (CST)
  const ts = Math.round((now.getTime() + 8 * 3600000) / 1000)
  const timestamp = ts.toString()

  // Format YYYYMMDDhhmm in CST, then map each digit through TABLE
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, "0")
  const d = String(now.getUTCDate()).padStart(2, "0")
  const h = String(now.getUTCHours() + 8).padStart(2, "0") // CST hours
  const mi = String(now.getUTCMinutes()).padStart(2, "0")
  const dateStr = `${y}${mo}${d}${h}${mi}`
  const mapped = dateStr
    .split("")
    .map((ch) => TABLE[parseInt(ch)])
    .join("")

  const timeSign = (crc32(mapped) >>> 0).toString()
  const data = [timestamp, random, path, "web", "3", timeSign].join("|")
  const dataSign = (crc32(data) >>> 0).toString()

  return `${timeSign}=${timestamp}-${random}-${dataSign}`
}

function getApi(rawUrl: string): string {
  const idx = rawUrl.indexOf("?")
  const base = idx >= 0 ? rawUrl.substring(0, idx) : rawUrl
  const existing = idx >= 0 ? rawUrl.substring(idx + 1) : ""
  // Extract path from URL
  const u = new URL(rawUrl)
  const sig = signPath(u.pathname)
  const sep = existing ? "&" : ""
  return `${base}?${existing}${sep}${sig}`
}

// --- Client ---

export class Pan123Client {
  private addition: Pan123Addition
  private accessToken = ""

  constructor(addition: Pan123Addition) {
    this.addition = addition
  }

  public getRootId(): string {
    return (this.addition.root_id || "0").trim() || "0"
  }

  // ---- Login ----

  public async login(): Promise<void> {
    const isEmail = /@/.test(this.addition.username)
    const body = isEmail
      ? {
          mail: this.addition.username,
          password: this.addition.password,
          type: 2,
        }
      : {
          passport: this.addition.username,
          password: this.addition.password,
          remember: true,
        }

    const res = await fetch(SignIn, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://yun.123pan.com",
        referer: "https://yun.123pan.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
        platform: "web",
        "app-version": "3",
      },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as Pan123LoginResp
    if (data.code !== 200) {
      throw new Error(data.message || `login failed: code ${data.code}`)
    }
    this.accessToken = data.data?.token || ""
    if (!this.accessToken) throw new Error("login returned empty token")
  }

  // ---- Core request ----

  public async request(
    url: string,
    method: "GET" | "POST",
    body?: any,
    respType?: any,
  ): Promise<any> {
    const doReq = async (): Promise<any> => {
      const signed = getApi(url)
      const headers: Record<string, string> = {
        origin: "https://yun.123pan.com",
        referer: "https://yun.123pan.com/",
        authorization: this.accessToken ? `Bearer ${this.accessToken}` : "",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) openlist-client",
        platform: this.addition.platform || "web",
        "app-version": "3",
        Accept: "application/json",
      }
      const init: RequestInit = { method, headers }
      if (body !== undefined && method !== "GET") {
        headers["Content-Type"] = "application/json"
        init.body = JSON.stringify(body)
      }
      const res = await fetch(signed, init)
      return res.json()
    }

    let data = await doReq()
    const code = data?.code
    if (code !== 0 && code !== 200) {
      // 401 → token expired, retry login once
      if (code === 401) {
        await this.login()
        data = await doReq()
        const retryCode = data?.code
        if (retryCode !== 0 && retryCode !== 200) {
          throw new Error(data?.message || `api error: code ${retryCode}`)
        }
        return data
      }
      throw new Error(data?.message || `api error: code ${code}`)
    }
    return data
  }

  // ---- User info ----

  public async userInfo(): Promise<Pan123UserInfoResp["data"]> {
    const data = (await this.request(UserInfo, "GET")) as Pan123UserInfoResp
    return data.data
  }

  // ---- Files ----

  public async getFiles(parentId: string): Promise<Pan123File[]> {
    const files: Pan123File[] = []
    let page = 1
    for (;;) {
      const query = new URLSearchParams({
        driveId: "0",
        limit: "100",
        next: "0",
        orderBy: "file_id",
        orderDirection: "desc",
        parentFileId: parentId,
        trashed: "false",
        SearchData: "",
        Page: String(page),
        OnlyLookAbnormalFile: "0",
        event: "homeListFile",
        operateType: "4",
        inDirectSpace: "false",
      })
      const url = `${FileList}?${query.toString()}`
      const resp = (await this.request(url, "GET")) as Pan123FilesResp
      const list = resp.data?.InfoList || []
      files.push(...list)
      if (list.length === 0 || resp.data.Next === "-1") break
      page++
    }
    return files
  }

  // ---- Download ----

  public async getDownloadLink(file: Pan123File): Promise<string> {
    const body = {
      driveId: 0,
      etag: file.Etag,
      fileId: file.FileId,
      fileName: file.FileName,
      s3keyFlag: file.S3KeyFlag,
      size: file.Size,
      type: file.Type,
    }
    const resp = (await this.request(
      DownloadInfo,
      "POST",
      body,
    )) as Pan123DownloadResp
    let downloadUrl = resp.data?.DownloadUrl || ""
    if (!downloadUrl) throw new Error("no download url")

    // Some download URLs contain a base64-encoded "params" query parameter
    // that encodes the real redirect URL
    try {
      const u = new URL(downloadUrl)
      const params = u.searchParams.get("params")
      if (params) {
        const decoded = atob(params)
        const decodedUrl = new URL(decoded)
        downloadUrl = decodedUrl.toString()
      }
    } catch {
      // if parsing fails, use original URL
    }

    // Follow the redirect to get the real download URL
    const res = await fetch(downloadUrl, {
      method: "GET",
      redirect: "manual",
      headers: { Referer: "https://yun.123pan.com/" },
    })
    if (res.status === 302) {
      return res.headers.get("location") || downloadUrl
    }
    if (res.status < 300) {
      const body = await res.json().catch(() => ({}))
      return body.data?.redirect_url || downloadUrl
    }
    return downloadUrl
  }

  // ---- File operations ----

  public async mkdir(parentId: string, dirName: string): Promise<void> {
    await this.request(Mkdir, "POST", {
      driveId: 0,
      etag: "",
      fileName: dirName,
      parentFileId: parseInt(parentId, 10) || 0,
      size: 0,
      type: 1,
    })
  }

  public async rename(fileId: string, newName: string): Promise<void> {
    await this.request(Rename, "POST", {
      driveId: 0,
      fileId: parseInt(fileId, 10),
      fileName: newName,
    })
  }

  public async move(fileIds: string[], targetParentId: string): Promise<void> {
    await this.request(Move, "POST", {
      fileIdList: fileIds.map((id) => ({ FileId: parseInt(id, 10) })),
      parentFileId: parseInt(targetParentId, 10),
    })
  }

  public async remove(fileId: string, file: Pan123File): Promise<void> {
    await this.request(Trash, "POST", {
      driveId: 0,
      operation: true,
      fileTrashInfoList: [file],
    })
  }
}
