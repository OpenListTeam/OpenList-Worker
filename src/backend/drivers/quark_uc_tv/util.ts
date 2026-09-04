// 夸克/UC TV 版网盘 API 客户端（只读）
import { md5, sha256 } from "../../pkg/crypto"
import {
  DriverQuarkUcTvAddition,
  QuarkTvFile,
  QuarkTvCommonResp,
  QuarkTvFilesData,
  QuarkTvDownloadData,
  QuarkTvStreamingData,
} from "./types"

const UA =
  "Mozilla/5.0 (Linux; U; Android 13; zh-cn; M2004J7AC Build/UKQ1.231108.001) AppleWebKit/533.1 (KHTML, like Gecko) Mobile Safari/533.1"
const DeviceBrand = "Xiaomi"
const Platform = "tv"
const DeviceName = "M2004J7AC"
const DeviceModel = "M2004J7AC"
const BuildDevice = "M2004J7AC"
const BuildProduct = "M2004J7AC"
const DeviceGpu = "Adreno (TM) 550"
const ActivityRect = "{}"

interface Conf {
  api: string
  clientID: string
  signKey: string
  appVer: string
  channel: string
  codeApi: string
}

const CONFS: Record<"quark" | "uc", Conf> = {
  quark: {
    api: "https://open-api-drive.quark.cn",
    clientID: "d3194e61504e493eb6222857bccfed94",
    signKey: "kw2dvtd7p4t3pjl2d9ed9yc8yej8kw2d",
    appVer: "1.8.2.2",
    channel: "GENERAL",
    codeApi: "http://api.extscreen.com/quarkdrive",
  },
  uc: {
    api: "https://open-api-drive.uc.cn",
    clientID: "5acf882d27b74502b7040b0c65519aa7",
    signKey: "l3srvtd7p42l0d0x1u8d7yc8ye9kki4d",
    appVer: "1.7.2.2",
    channel: "UCTVOFFICIALWEB",
    codeApi: "http://api.extscreen.com/ucdrive",
  },
}

export class ClientQuarkUcTv {
  private conf: Conf
  private addition: DriverQuarkUcTvAddition
  private accessToken = ""
  private deviceId: string

  constructor(addition: DriverQuarkUcTvAddition) {
    this.addition = addition
    this.conf = CONFS[addition.variant || "quark"]
    this.deviceId = addition.device_id || md5(String(Date.now()))
    this.addition.device_id = this.deviceId
  }

  async init(): Promise<void> {
    if (!this.addition.refresh_token) {
      throw new Error("[QuarkTV] refresh_token is required")
    }
    await this.refreshToken()
  }

  private async generateSign(method: string, pathname: string): Promise<{ tm: string; token: string; reqId: string }> {
    const tm = String(Date.now())
    const reqId = md5(this.deviceId + tm)
    const token = await sha256(`${method}&${pathname}&${tm}&${this.conf.signKey}`)
    return { tm, token, reqId }
  }

  private deviceQuery(): Record<string, string> {
    return {
      app_ver: this.conf.appVer,
      device_id: this.deviceId,
      device_brand: DeviceBrand,
      platform: Platform,
      device_name: DeviceName,
      device_model: DeviceModel,
      build_device: BuildDevice,
      build_product: BuildProduct,
      device_gpu: DeviceGpu,
      activity_rect: ActivityRect,
      channel: this.conf.channel,
    }
  }

  private async request<T = any>(pathname: string, method: string, extraQuery: Record<string, string> = {}): Promise<T> {
    const { tm, token, reqId } = await this.generateSign(method, pathname)
    const qs = new URLSearchParams({
      req_id: reqId,
      access_token: this.accessToken,
      ...this.deviceQuery(),
      ...extraQuery,
    })
    const resp = await fetch(`${this.conf.api}${pathname}?${qs.toString()}`, {
      method,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": UA,
        "x-pan-tm": tm,
        "x-pan-token": token,
        "x-pan-client-id": this.conf.clientID,
      },
    })
    const data: QuarkTvCommonResp = await resp.json().catch(() => ({ status: -1, errno: -1 } as any))
    const errInfo = (data.error_info || "").toLowerCase()
    const tokenInvalid =
      (data.status === -1 && (data.errno === 10001 || data.errno === 11001)) ||
      errInfo.includes("access token") ||
      errInfo.includes("access_token") ||
      errInfo.includes("token无效") ||
      errInfo.includes("token 无效")
    if (tokenInvalid) {
      await this.refreshToken()
      return this.request<T>(pathname, method, extraQuery)
    }
    if (data.status >= 400 || data.errno !== 0) {
      throw new Error(`[QuarkTV] ${data.error_info || `errno ${data.errno}`}`)
    }
    return data as T
  }

  private async refreshToken(): Promise<void> {
    const pathname = "/token"
    const { reqId } = await this.generateSign("POST", pathname)
    const body: Record<string, string> = {
      req_id: reqId,
      ...this.deviceQuery(),
    }
    if (this.accessToken) {
      body.refresh_token = this.addition.refresh_token
    } else {
      body.refresh_token = this.addition.refresh_token
    }
    const resp = await fetch(`${this.conf.codeApi}${pathname}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data: any = await resp.json().catch(() => ({}))
    if (data?.code !== 200) throw new Error(`[QuarkTV] ${data?.message || "token refresh failed"}`)
    const d = data.data || {}
    if (!d.access_token) throw new Error("[QuarkTV] refresh token empty")
    this.accessToken = d.access_token
    if (d.refresh_token) this.addition.refresh_token = d.refresh_token
  }

  async getFiles(parentFid: string): Promise<QuarkTvFile[]> {
    const all: QuarkTvFile[] = []
    let pageIndex = 0
    const pageSize = 100
    const desc = this.addition.order_direction === "asc" ? "0" : "1"
    const orderBy = this.addition.order_by === "file_name" ? "1" : "3"
    while (true) {
      const resp = await this.request<QuarkTvCommonResp>("/file", "GET", {
        method: "list",
        parent_fid: parentFid,
        order_by: orderBy,
        desc,
        category: "",
        source: "",
        ex_source: "",
        list_all: "0",
        page_size: String(pageSize),
        page_index: String(pageIndex),
      })
      const data = resp.data as QuarkTvFilesData | undefined
      if (data?.files) all.push(...data.files)
      const total = data?.total_count || 0
      if (pageIndex * pageSize >= total) break
      pageIndex++
    }
    return all
  }

  async getDownloadUrl(fid: string): Promise<string> {
    if (this.addition.link_method === "streaming") {
      const resp = await this.request<QuarkTvCommonResp>("/file", "GET", {
        method: "streaming",
        group_by: "source",
        fid,
        resolution: "low,normal,high,super,2k,4k",
        support: "dolby_vision",
      })
      const data = resp.data as QuarkTvStreamingData | undefined
      const url = data?.video_info?.find((v) => v.url)?.url || ""
      if (!url) throw new Error("[QuarkTV] no streaming link found")
      return url
    }
    const resp = await this.request<QuarkTvCommonResp>("/file", "GET", {
      method: "download",
      group_by: "source",
      fid,
      resolution: "low,normal,high,super,2k,4k",
      support: "dolby_vision",
    })
    const data = resp.data as QuarkTvDownloadData | undefined
    if (!data?.download_url) throw new Error("[QuarkTV] empty download url")
    return data.download_url
  }
}
