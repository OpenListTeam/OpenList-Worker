// ChaoXing (超星小组网盘) API 客户端
import {
  DriverChaoXingAddition,
  ChaoXingFile,
  ChaoXingListResp,
  ChaoXingDownResp,
  ChaoXingUploadConfigResp,
  ChaoXingUploadFileResp,
} from "./types"
import { aesCbcEncryptBase64 } from "../../pkg/crypto"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch"
const REFERER = "https://chaoxing.com/"
const API = "https://groupweb.chaoxing.com"
const DOWNLOAD_API = "https://noteyd.chaoxing.com"
const LOGIN_KEY = "u2oh6Vu^HWe4_AES"

export class ClientChaoXing {
  private addition: DriverChaoXingAddition
  private cookie: string
  private persistCookie?: (cookie: string) => void | Promise<void>

  constructor(
    addition: DriverChaoXingAddition,
    persistCookie?: (cookie: string) => void | Promise<void>,
  ) {
    this.addition = addition
    this.cookie = addition.cookie || ""
    this.persistCookie = persistCookie
  }

  async init(): Promise<void> {
    if (!this.addition.bbsid) {
      throw new Error("[ChaoXing] bbsid is required")
    }
    if (!this.cookie) {
      this.cookie = await this.login()
      if (this.persistCookie) await this.persistCookie(this.cookie)
    }
  }

  getCookie(): string {
    return this.cookie
  }

  downloadHeaders(): Record<string, string> {
    return {
      Cookie: this.cookie,
      Referer: REFERER,
      "User-Agent": UA,
    }
  }

  async login(): Promise<string> {
    const uname = await aesCbcEncryptBase64(this.addition.user_name, LOGIN_KEY)
    const password = await aesCbcEncryptBase64(
      this.addition.password,
      LOGIN_KEY,
    )
    const fd = new FormData()
    fd.append("uname", uname)
    fd.append("password", password)
    fd.append("t", "true")
    const resp = await fetch("https://passport2.chaoxing.com/fanyalogin", {
      method: "POST",
      body: fd,
    })
    const cookies: string[] = []
    const setCookies =
      typeof (resp.headers as any).getSetCookie === "function"
        ? (resp.headers as any).getSetCookie()
        : []
    if (Array.isArray(setCookies) && setCookies.length > 0) {
      for (const sc of setCookies) {
        if (sc) cookies.push(sc.split(";")[0])
      }
    } else {
      const sc = resp.headers.get("set-cookie")
      if (sc) cookies.push(sc.split(";")[0])
    }
    if (cookies.length === 0) {
      throw new Error("[ChaoXing] login failed: no cookie returned")
    }
    return cookies.join("; ")
  }

  private async request<T = any>(
    pathname: string,
    method: string,
    query?: Record<string, string>,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const qs = query ? "?" + new URLSearchParams(query).toString() : ""
    const headers: Record<string, string> = {
      Cookie: this.cookie,
      Accept: "application/json, text/plain, */*",
      Referer: REFERER,
      ...extraHeaders,
    }
    const resp = await fetch(`${API}${pathname}${qs}`, { method, headers })
    if (resp.status >= 400) {
      throw new Error(`[ChaoXing] request failed: HTTP ${resp.status}`)
    }
    return (await resp.json()) as T
  }

  private async requestDownload<T = any>(
    pathname: string,
    method: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Cookie: this.cookie,
      Accept: "application/json, text/plain, */*",
      Referer: REFERER,
      "User-Agent": UA,
    }
    const resp = await fetch(`${DOWNLOAD_API}${pathname}`, { method, headers })
    if (resp.status >= 400) {
      throw new Error(`[ChaoXing] download request failed: HTTP ${resp.status}`)
    }
    return (await resp.json()) as T
  }

  async getFiles(parent: string): Promise<ChaoXingFile[]> {
    const files: ChaoXingFile[] = []

    const resp = await this.request<ChaoXingListResp>(
      "/pc/resource/getResourceList",
      "GET",
      { bbsid: this.addition.bbsid, folderId: parent, recType: "1" },
    )
    if (resp.result !== 1) {
      throw new Error(`[ChaoXing] list failed: result=${resp.result}`)
    }
    if (resp.list && resp.list.length > 0) {
      files.push(...resp.list)
    }

    const resps = await this.request<ChaoXingListResp>(
      "/pc/resource/getResourceList",
      "GET",
      { bbsid: this.addition.bbsid, folderId: parent, recType: "2" },
    )
    for (const file of resps.list || []) {
      // 手机端超星上传的文件没有 fileId 字段，但 objectId 与 fileId 相同，可代替
      if (!file.content.fileId) {
        file.content.fileId = file.content.objectId || ""
      }
      files.push(file)
    }
    return files
  }

  async link(fileId: string): Promise<ChaoXingDownResp> {
    const resp = await this.requestDownload<ChaoXingDownResp>(
      "/screen/note_note/files/status/" + fileId,
      "POST",
    )
    if (!resp.download) {
      throw new Error(
        `[ChaoXing] link failed: ${resp.msg || "no download url"}`,
      )
    }
    return resp
  }

  async mkdir(parentId: string, name: string): Promise<void> {
    const resp = await this.request<ChaoXingListResp>(
      "/pc/resource/addResourceFolder",
      "GET",
      { bbsid: this.addition.bbsid, name, pid: parentId },
    )
    if (resp.result !== 1) {
      throw new Error(`[ChaoXing] mkdir failed: ${resp.msg}`)
    }
  }

  async move(id: string, dstId: string, isDir: boolean): Promise<void> {
    const query: Record<string, string> = isDir
      ? { bbsid: this.addition.bbsid, folderIds: id, targetId: dstId }
      : { bbsid: this.addition.bbsid, recIds: id, targetId: dstId }
    const resp = await this.request<ChaoXingListResp>(
      "/pc/resource/moveResource",
      "GET",
      query,
    )
    if (!resp.status) {
      throw new Error(`[ChaoXing] move failed: ${resp.msg}`)
    }
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    const resp = await this.request<ChaoXingListResp>(
      "/pc/resource/updateResourceFolderName",
      "GET",
      { bbsid: this.addition.bbsid, folderId, name: newName },
    )
    if (resp.result !== 1) {
      throw new Error(`[ChaoXing] rename failed: ${resp.msg}`)
    }
  }

  async remove(id: string, isDir: boolean): Promise<void> {
    const path = isDir
      ? "/pc/resource/deleteResourceFolder"
      : "/pc/resource/deleteResourceFile"
    const query: Record<string, string> = isDir
      ? { bbsid: this.addition.bbsid, folderIds: id }
      : { bbsid: this.addition.bbsid, recIds: id }
    const resp = await this.request<ChaoXingListResp>(path, "GET", query)
    if (resp.result !== 1) {
      throw new Error(`[ChaoXing] remove failed: ${resp.msg}`)
    }
  }

  async upload(
    parentId: string,
    name: string,
    content: Uint8Array,
  ): Promise<void> {
    // 1. 获取上传配置（token / puid）
    const cfgResp = await fetch(`${DOWNLOAD_API}/pc/files/getUploadConfig`, {
      method: "GET",
    })
    const cfg = (await cfgResp.json()) as ChaoXingUploadConfigResp
    if (cfg.result !== 1 || !cfg.msg?.token) {
      throw new Error("[ChaoXing] get upload config failed")
    }

    // 2. multipart 上传文件
    const fd = new FormData()
    const buf = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength,
    ) as ArrayBuffer
    fd.append("file", new Blob([buf]), name)
    fd.append("_token", cfg.msg.token)
    fd.append("puid", String(cfg.msg.puid || ""))
    const upResp = await fetch("https://pan-yz.chaoxing.com/upload", {
      method: "POST",
      body: fd,
    })
    const fileRsp = (await upResp.json()) as ChaoXingUploadFileResp
    if (fileRsp.msg !== "success" || !fileRsp.objectId) {
      throw new Error(`[ChaoXing] upload failed: ${fileRsp.msg}`)
    }

    // 3. 登记文件到小组网盘
    const param = {
      cataid: "100000019",
      key: fileRsp.objectId,
      param: fileRsp.data || {},
    }
    const params = JSON.stringify(param)
    const resp = await this.request<ChaoXingListResp>(
      "/pc/resource/addResource",
      "GET",
      {
        bbsid: this.addition.bbsid,
        pid: parentId,
        type: "yunpan",
        params: encodeURIComponent("[" + params + "]"),
      },
    )
    if (resp.result !== 1) {
      throw new Error(`[ChaoXing] add resource failed: ${resp.msg}`)
    }
  }
}
