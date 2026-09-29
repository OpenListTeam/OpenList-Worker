// Tencent Weiyun API client implementation
// Optimized for Cloudflare Workers, EdgeOne, and Node.js.
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/weiyun
// and https://github.com/foxxorcat/weiyun-sdk-go

import {
  WeiyunAddition,
  WeiyunAccountType,
  WeiyunFile,
  WeiyunFolder,
  WeiyunFolderPath,
  DiskListData,
  DiskUserInfoGetData,
  DiskFileDownloadData,
  PreUploadData,
  AddChannelData,
  UploadPieceData,
  FolderParam,
  FileParam,
  UploadAuthData,
  UploadChannelData,
} from "./types"
import { IncrementalSha1, getHash33, uint8ArrayToBase64 } from "./crypto"

export function parseCookieStr(str: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!str) return map

  const parts = str.split(";")
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (key && val) {
        map.set(key, val)
      }
    }
  }
  return map
}

export function cookieToString(cookies: Map<string, string>): string {
  const pairs: string[] = []
  for (const [key, val] of cookies.entries()) {
    if (key && val) {
      pairs.push(`${key}=${val}`)
    }
  }
  return pairs.join("; ")
}

export class WeiyunClient {
  private cookies = new Map<string, string>()
  private onCookieUpdate?: (cookie: string) => void
  private pendingCookie: string | null = null
  private addition: WeiyunAddition

  constructor(
    addition: WeiyunAddition,
    onCookieUpdate?: (cookie: string) => void,
  ) {
    this.addition = addition
    this.cookies = parseCookieStr(addition.cookies || "")
    this.onCookieUpdate = onCookieUpdate
  }

  getCookies(): Map<string, string> {
    return this.cookies
  }

  getCookieStr(): string {
    return cookieToString(this.cookies)
  }

  setCookiesStr(cookieStr: string): void {
    this.cookies = parseCookieStr(cookieStr)
    this.pendingCookie = cookieToString(this.cookies)
    this.addition.cookies = this.pendingCookie
    if (this.onCookieUpdate) {
      this.onCookieUpdate(this.pendingCookie)
    }
  }

  updateCookiesFromHeaders(headers: Headers): void {
    const getSetCookie = (headers as any).getSetCookie
    let rawSetCookies: string[] = []
    if (typeof getSetCookie === "function") {
      rawSetCookies = getSetCookie.call(headers)
    } else {
      const single = headers.get("set-cookie")
      if (single) rawSetCookies = [single]
    }

    let changed = false
    for (const sc of rawSetCookies) {
      const firstPart = sc.split(";")[0] || ""
      const eqIdx = firstPart.indexOf("=")
      if (eqIdx > 0) {
        const key = firstPart.slice(0, eqIdx).trim()
        const val = firstPart.slice(eqIdx + 1).trim()
        if (key && val && this.cookies.get(key) !== val) {
          this.cookies.set(key, val)
          changed = true
        }
      }
    }

    if (changed) {
      this.pendingCookie = cookieToString(this.cookies)
      this.addition.cookies = this.pendingCookie
      if (this.onCookieUpdate) {
        this.onCookieUpdate(this.pendingCookie)
      }
    }
  }

  consumePendingCookie(): string | null {
    const cookie = this.pendingCookie
    this.pendingCookie = null
    return cookie
  }

  loginType(): WeiyunAccountType {
    const wyUf = this.cookies.get("wy_uf") || ""
    const wxOpenId = this.cookies.get("weiyun_wx_openid") || ""
    const qqOpenId = this.cookies.get("weiyun_qq_openid") || ""

    if (wyUf === "2" && wxOpenId) return "weixin_openid"
    if (wyUf === "2" && qqOpenId) return "qq_openid"
    if (wyUf === "1") return "weixin"
    if (wyUf === "0" || !wyUf) return "qq"
    return "unknown"
  }

  parseTokenInfo(): Record<string, any> {
    const type = this.loginType()
    switch (type) {
      case "weixin":
        return {
          token_type: 1,
          openid: this.cookies.get("openid") || "",
          open_appid: this.cookies.get("wy_appid") || "",
          access_token: this.cookies.get("access_token") || "",
          login_key_type: 192,
          login_key_value: this.cookies.get("access_token") || "",
        }
      case "qq":
        return {
          token_type: 0,
          login_key_type: 27,
          login_key_value:
            this.cookies.get("p_skey") || this.cookies.get("skey") || "",
          openid: "",
        }
      case "weixin_openid":
      case "qq_openid":
        return {
          token_type: 3,
          login_key_type: 1540,
        }
      default:
        return {}
    }
  }

  async refreshCtoken(): Promise<void> {
    const resp = await fetch("https://www.weiyun.com/disk", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: this.getCookieStr(),
      },
      redirect: "manual",
    })
    this.updateCookiesFromHeaders(resp.headers)
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location") || ""
      if (loc && !loc.includes("/disk")) {
        throw new Error(
          "[WeiYun] Login cookie expired or invalid, please login again",
        )
      }
    }
  }

  async weixinRefreshToken(): Promise<void> {
    const appid = this.cookies.get("wy_appid") || ""
    const refreshToken = this.cookies.get("refresh_token") || ""
    if (!appid || !refreshToken) return

    const url = `https://api.weixin.qq.com/sns/oauth2/refresh_token?grant_type=refresh_token&appid=${encodeURIComponent(appid)}&refresh_token=${encodeURIComponent(refreshToken)}`
    const res = await fetch(url)
    const data: any = await res.json().catch(() => ({}))
    if (data.errcode) {
      throw new Error(`[WeiYun] WeChat refresh token failed: ${data.errmsg}`)
    }
    if (data.openid) this.cookies.set("openid", data.openid)
    if (data.access_token) this.cookies.set("access_token", data.access_token)
    if (data.refresh_token)
      this.cookies.set("refresh_token", data.refresh_token)
    this.pendingCookie = cookieToString(this.cookies)
    this.addition.cookies = this.pendingCookie
    if (this.onCookieUpdate) {
      this.onCookieUpdate(this.pendingCookie)
    }
  }

  private newHeader(
    cmd: number,
    tokenInfo: Record<string, any>,
  ): Record<string, any> {
    const wx_openid = tokenInfo.openid || tokenInfo.minico_openid || ""
    return {
      seq: Math.floor(Date.now() / 1000),
      cmd,
      wx_openid,
      qq_openid: tokenInfo.qq_openid || "",
      user_flag: tokenInfo.token_type ?? 0,
      env_id: tokenInfo.env_id || "",
      type: 1,
      appid: 30013,
      version: 3,
      major_version: 3,
      minor_version: 3,
      fix_version: 3,
    }
  }

  private newBody(
    cmdName: string,
    data: any,
    tokenInfo: Record<string, any>,
  ): Record<string, any> {
    return {
      ReqMsg_body: {
        ext_req_head: {
          token_info: tokenInfo,
          language_info: {
            language_type: 2052,
          },
        },
        [`.weiyun.${cmdName}MsgReq_body`]: data,
      },
    }
  }

  private newUploadJson(
    cmdName: string,
    cmd: number,
    data: any,
  ): Record<string, any> {
    return {
      req_header: {
        cmd,
        appid: 30013,
        major_version: 3,
        minor_version: 0,
        fix_version: 0,
        version: 3,
        user_flag: 0,
      },
      req_body: {
        ReqMsg_body: {
          [`weiyun.${cmdName}MsgReq_body`]: data,
        },
      },
    }
  }

  async request(
    protocol:
      | "weiyunQdisk"
      | "weiyunQdiskClient"
      | "weiyunFileLibClient"
      | "preUpload"
      | "upload"
      | "weiyunSafeBox",
    cmdName: string,
    cmd: number,
    data: any,
    fileBuffer?: Uint8Array | Buffer,
  ): Promise<any> {
    const tokenInfo = this.parseTokenInfo()
    const wyctoken = this.cookies.get("wyctoken") || ""

    let url = ""
    let body: any
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.weiyun.com",
      Cookie: this.getCookieStr(),
    }

    if (protocol === "preUpload") {
      url = `https://www.weiyun.com/api/v3/ftn_pre_upload?g_tk=${encodeURIComponent(wyctoken)}&cmd=${cmd}`
      body = JSON.stringify(this.newUploadJson(cmdName, cmd, data))
      headers["Content-Type"] = "application/json; charset=UTF-8"
    } else if (protocol === "upload") {
      url = `https://upload.weiyun.com/ftnup_v2/weiyun?g_tk=${encodeURIComponent(wyctoken)}&cmd=${cmd}`
      // Manually build multipart/form-data with exact field order
      const boundary = "----WebKitFormBoundaryIifrOqiswelC8nfe"
      headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`

      const uploadJson = JSON.stringify(this.newUploadJson(cmdName, cmd, data))
      let part1 = `--${boundary}\r\nContent-Disposition: form-data; name="json"\r\n\r\n${uploadJson}\r\n`
      let part2 = ""
      if (fileBuffer && fileBuffer.length > 0) {
        part2 = `--${boundary}\r\nContent-Disposition: form-data; name="upload"; filename="blob"\r\nContent-Type: application/octet-stream\r\n\r\n`
      }
      const part3 = `\r\n--${boundary}--\r\n`

      const enc = new TextEncoder()
      const p1Bytes = enc.encode(part1)
      const p2Bytes = fileBuffer ? enc.encode(part2) : new Uint8Array(0)
      const p3Bytes = enc.encode(part3)
      const fbBytes = fileBuffer
        ? new Uint8Array(fileBuffer)
        : new Uint8Array(0)

      const fullLen =
        p1Bytes.length + p2Bytes.length + fbBytes.length + p3Bytes.length
      const fullBuffer = new Uint8Array(fullLen)
      let offset = 0
      fullBuffer.set(p1Bytes, offset)
      offset += p1Bytes.length
      if (p2Bytes.length > 0) {
        fullBuffer.set(p2Bytes, offset)
        offset += p2Bytes.length
        fullBuffer.set(fbBytes, offset)
        offset += fbBytes.length
      }
      fullBuffer.set(p3Bytes, offset)

      body = fullBuffer
    } else {
      url = `https://www.weiyun.com/webapp/json/${protocol}/${cmdName}?g_tk=${encodeURIComponent(wyctoken)}&cmd=${cmd}`
      body = JSON.stringify({
        req_header: JSON.stringify(this.newHeader(cmd, tokenInfo)),
        req_body: JSON.stringify(this.newBody(cmdName, data, tokenInfo)),
      })
      headers["Content-Type"] = "application/json; charset=UTF-8"
    }

    let resp = await fetch(url, {
      method: "POST",
      headers,
      body,
    })
    this.updateCookiesFromHeaders(resp.headers)

    // Handle 403 / auth error
    if (resp.status === 403) {
      try {
        await this.refreshCtoken()
        if (
          this.loginType() === "weixin" ||
          this.loginType() === "weixin_openid"
        ) {
          await this.weixinRefreshToken().catch(() => {})
          await this.refreshCtoken()
        }
        headers.Cookie = this.getCookieStr()
        headers["g_tk"] = this.cookies.get("wyctoken") || ""
        resp = await fetch(url, { method: "POST", headers, body })
        this.updateCookiesFromHeaders(resp.headers)
      } catch (err: any) {
        throw new Error(`[WeiYun] Request failed (403): ${err.message}`)
      }
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "")
      throw new Error(`[WeiYun] HTTP ${resp.status}: ${errText}`)
    }

    const rawJson: any = await resp.json().catch(() => ({}))
    const rawResult = rawJson.data || rawJson.result

    if (rawJson.ret !== undefined && rawJson.ret !== 0) {
      throw new Error(
        `[WeiYun] Error (${rawJson.ret}): ${rawJson.msg || "Unknown"}`,
      )
    }

    if (rawResult?.rsp_header && rawResult.rsp_header.retcode !== 0) {
      const h = rawResult.rsp_header
      throw new Error(
        `[WeiYun] Cmd ${h.cmd} (${h.cmdName || cmdName}) Error (${h.retcode}): ${h.retmsg || "Unknown error"}`,
      )
    }

    if (protocol === "preUpload") {
      return (
        rawResult?.rsp_body?.RspMsg_body?.weiyunPreUploadMsgRsp_body || rawJson
      )
    }
    if (protocol === "upload") {
      return (
        rawResult?.rsp_body?.RspMsg_body?.[`weiyun.${cmdName}MsgRsp_body`] ||
        rawJson
      )
    }

    const bodyMsg = rawResult?.rsp_body?.RspMsg_body
    if (typeof bodyMsg === "string") {
      try {
        return JSON.parse(bodyMsg)
      } catch {
        return bodyMsg
      }
    }
    return bodyMsg || rawResult || rawJson
  }

  async diskUserInfoGet(): Promise<DiskUserInfoGetData> {
    return this.request("weiyunQdiskClient", "DiskUserInfoGet", 2201, {
      is_get_upload_flow_flag: false,
      is_get_high_speed_flow_info: false,
      is_get_weiyun_flag: false,
      is_get_space_clean_info: false,
      is_get_user_reward_info: false,
    })
  }

  async libDirPathGet(dirKey: string): Promise<WeiyunFolderPath[]> {
    const res = await this.request(
      "weiyunFileLibClient",
      "LibDirPathGet",
      26150,
      {
        dir_key: dirKey,
      },
    )
    return res.items || []
  }

  async diskDirFileList(
    dirKey: string,
    opts: {
      start?: number
      count?: number
      sortField?: number // 1: FileName, 2: FileMtime, 3: FileSize
      reverseOrder?: boolean
      getType?: number // 0: FileAndDir, 1: OnlyDir, 2: OnlyFile
    } = {},
  ): Promise<DiskListData> {
    return this.request("weiyunQdisk", "DiskDirList", 2208, {
      dir_key: dirKey,
      start: opts.start || 0,
      count: opts.count || 500,
      sort_field: opts.sortField ?? 2,
      reverse_order: opts.reverseOrder ?? false,
      get_type: opts.getType ?? 0,
      get_abstract_url: false,
      get_dir_detail_info: false,
    })
  }

  async diskFileDownload(fParam: FileParam): Promise<DiskFileDownloadData> {
    const res = await this.request(
      "weiyunQdiskClient",
      "DiskFileBatchDownload",
      2402,
      {
        file_list: [fParam],
        download_type: 0,
      },
    )
    const list: DiskFileDownloadData[] = res.file_list || []
    if (!list || list.length === 0) {
      throw new Error("[WeiYun] No download link returned")
    }
    return list[0]
  }

  async diskDirCreate(dParam: FolderParam): Promise<WeiyunFolder> {
    return this.request("weiyunQdiskClient", "DiskDirCreate", 2614, {
      ppdir_key: dParam.ppdir_key,
      pdir_key: dParam.pdir_key,
      dir_name: dParam.dir_name,
      file_exist_option: 2,
      create_type: 1,
    })
  }

  async diskFileRename(fParam: FileParam, newName: string): Promise<void> {
    await this.request("weiyunQdiskClient", "DiskFileRename", 2605, {
      ppdir_key: fParam.ppdir_key,
      pdir_key: fParam.pdir_key,
      file_id: fParam.file_id,
      src_filename: fParam.filename,
      filename: newName,
    })
  }

  async diskDirAttrModify(dParam: FolderParam, newName: string): Promise<void> {
    await this.request("weiyunQdiskClient", "DiskDirAttrModify", 2615, {
      ppdir_key: dParam.ppdir_key,
      pdir_key: dParam.pdir_key,
      dir_key: dParam.dir_key,
      src_dir_name: dParam.dir_name,
      dst_dir_name: newName,
    })
  }

  async diskFileDelete(fParam: FileParam): Promise<void> {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchDeleteEx", 2509, {
      file_list: [fParam],
    })
  }

  async diskDirDelete(dParam: FolderParam): Promise<void> {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchDeleteEx", 2509, {
      dir_list: [dParam],
    })
  }

  async diskFileMove(
    srcParam: FileParam,
    dstParam: FolderParam,
  ): Promise<void> {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchMove", 2618, {
      src_ppdir_key: srcParam.ppdir_key,
      src_pdir_key: srcParam.pdir_key,
      file_list: [srcParam],
      dst_ppdir_key: dstParam.pdir_key,
      dst_pdir_key: dstParam.dir_key,
    })
  }

  async diskDirMove(
    srcParam: FolderParam,
    dstParam: FolderParam,
  ): Promise<void> {
    await this.request("weiyunQdiskClient", "DiskDirFileBatchMove", 2618, {
      src_ppdir_key: srcParam.ppdir_key,
      src_pdir_key: srcParam.pdir_key,
      dir_list: [srcParam],
      dst_ppdir_key: dstParam.pdir_key,
      dst_pdir_key: dstParam.dir_key,
    })
  }

  // ---- Upload APIs ----

  async preUpload(
    pdirKey: string,
    dirKey: string,
    fileName: string,
    fileSize: number,
    content: Uint8Array | Buffer,
    channelCount = 4,
    fileExistOption = 1,
  ): Promise<PreUploadData> {
    const blockSize = 1024 * 1024
    let beforeBlockSize = 0
    let lastBlockSize = fileSize
    let checkBlockSize = 0

    if (fileSize > 0) {
      lastBlockSize = fileSize % blockSize
      if (lastBlockSize === 0) lastBlockSize = blockSize
      checkBlockSize = lastBlockSize % 128
      if (checkBlockSize === 0) checkBlockSize = 128
      beforeBlockSize = fileSize - lastBlockSize
    }

    interface BlockInfo {
      sha: string
      offset: number
      size: number
    }

    const blockInfoList: BlockInfo[] = []
    const sha = new IncrementalSha1()

    for (let offset = 0; offset < beforeBlockSize; offset += blockSize) {
      const slice = content.subarray(offset, offset + blockSize)
      sha.update(slice)
      blockInfoList.push({
        sha: sha.getStateHex(),
        offset,
        size: blockSize,
      })
    }

    const checkPointSlice = content.subarray(
      beforeBlockSize,
      beforeBlockSize + lastBlockSize - checkBlockSize,
    )
    sha.update(checkPointSlice)
    const checkSha = sha.getStateHex()

    const checkDataSlice = content.subarray(
      beforeBlockSize + lastBlockSize - checkBlockSize,
      fileSize,
    )
    sha.update(checkDataSlice)
    const checkData = uint8ArrayToBase64(checkDataSlice)
    const fileHash = sha.digestHex()

    blockInfoList.push({
      sha: fileHash,
      offset: beforeBlockSize,
      size: lastBlockSize,
    })

    const reqData = {
      common_upload_req: {
        ppdir_key: pdirKey,
        pdir_key: dirKey,
        file_size: fileSize,
        filename: fileName,
        file_exist_option: fileExistOption,
        use_mutil_channel: true,
      },
      upload_scr: 0,
      channel_count: channelCount,
      block_size: blockSize,
      check_sha: checkSha,
      check_data: checkData,
      block_info_list: blockInfoList,
    }

    const res: PreUploadData = await this.request(
      "preUpload",
      "PreUpload",
      247120,
      reqData,
    )
    if (res.common_upload_rsp) {
      res.common_upload_rsp.file_sha = fileHash
      res.common_upload_rsp.file_size = fileSize
    }
    return res
  }

  async addUploadChannel(
    origCount: number,
    destCount: number,
    auth: UploadAuthData,
  ): Promise<AddChannelData> {
    return this.request("upload", "AddChannel", 247122, {
      upload_key: auth.upload_key,
      ex: auth.ex,
      orig_channel_count: origCount,
      dest_channel_count: destCount,
      speed: 4303,
    })
  }

  async uploadPiece(
    channel: UploadChannelData,
    auth: UploadAuthData,
    chunk: Uint8Array | Buffer,
  ): Promise<UploadPieceData> {
    const res: UploadPieceData = await this.request(
      "upload",
      "UploadPiece",
      247121,
      {
        upload_key: auth.upload_key,
        ex: auth.ex,
        channel,
      },
      chunk,
    )

    if (res.channel && res.channel.len === 0 && res.upload_state === 1) {
      res.channel.len = channel.len
    }
    return res
  }
}
