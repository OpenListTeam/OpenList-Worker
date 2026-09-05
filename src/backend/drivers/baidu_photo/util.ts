// 百度相册 API 客户端（photo.baidu.com）
import {
  DriverBaiduPhotoAddition,
  BaiduPhotoFile,
  BaiduPhotoAlbum,
  BaiduPhotoAlbumFile,
  BaiduPhotoFileListResp,
  BaiduPhotoAlbumListResp,
  BaiduPhotoAlbumFileListResp,
  BaiduPhotoDownloadResp,
  BaiduPhotoPrecreateResp,
} from "./types"
import { md5 } from "../../pkg/crypto"

const API_URL = "https://photo.baidu.com/youai"
const ALBUM_API_URL = API_URL + "/album/v1"
const FILE_API_URL_V1 = API_URL + "/file/v1"
const FILE_API_URL_V2 = API_URL + "/file/v2"
const USER_API_URL = API_URL + "/user/v1"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const DEFAULT = 4 * 1024 * 1024 // 4MB 分块
const SLICE_SIZE = 256 * 1024 // 256KB slice-md5

export function getTid(): string {
  const sec = Math.floor(Date.now() / 1000)
  const rand = Math.floor(9000000 * Math.random() + 1000000)
  return `3${sec}${rand}`
}

function getFileName(path: string): string {
  return path.split("/").pop() || ""
}

function fsidsFormatNotUk(ids: number[]): string {
  return "[" + ids.map((id) => `{"fsid":${id}}`).join(",") + "]"
}

export class ClientBaiduPhoto {
  private cookie: string
  private uk = ""
  private bdstoken = ""
  private showType: string

  constructor(addition: DriverBaiduPhotoAddition) {
    this.cookie = addition.cookie || ""
    this.showType = addition.show_type || "root"
  }

  async init(): Promise<void> {
    if (!this.cookie) {
      throw new Error("[BaiduPhoto] cookie is required")
    }
    const info = await this.uInfo()
    this.uk = info.youa_id || ""
    this.bdstoken = await this.getBDStoken()
  }

  private async request(
    method: string,
    url: string,
    options: {
      query?: Record<string, string>
      form?: Record<string, string>
      redirect?: RequestRedirect
    } = {},
  ): Promise<Response> {
    const urlObj = new URL(url)
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) urlObj.searchParams.set(k, v)
      }
    }
    const headers: Record<string, string> = {
      Cookie: this.cookie,
      "User-Agent": UA,
      Referer: "https://photo.baidu.com/",
    }
    let body: string | undefined
    if (options.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded"
      body = new URLSearchParams(options.form).toString()
    }
    const resp = await fetch(urlObj.toString(), {
      method,
      headers,
      body,
      redirect: options.redirect ?? "follow",
    })
    return resp
  }

  private async requestJson<T = any>(
    method: string,
    url: string,
    options: {
      query?: Record<string, string>
      form?: Record<string, string>
    } = {},
  ): Promise<T> {
    const resp = await this.request(method, url, options)
    const data = (await resp.json().catch(() => ({}))) as T & { errno?: number }
    const errno = (data as any).errno
    if (errno !== undefined && errno !== 0) {
      throw new Error(
        `[BaiduPhoto] errno: ${errno}, refer to https://photo.baidu.com/union/doc`,
      )
    }
    return data
  }

  async uInfo(): Promise<{ youa_id?: string }> {
    return this.requestJson(USER_API_URL + "/getuinfo", "GET")
  }

  private async getBDStoken(): Promise<string> {
    const data = await this.requestJson<any>(
      "GET",
      "https://pan.baidu.com/api/gettemplatevariable",
      { query: { fields: '["bdstoken","token","uk"]' } },
    )
    return data?.result?.bdstoken || ""
  }

  async getAllFile(): Promise<BaiduPhotoFile[]> {
    const files: BaiduPhotoFile[] = []
    let cursor = ""
    for (;;) {
      const resp = await this.requestJson<BaiduPhotoFileListResp>(
        "GET",
        FILE_API_URL_V1 + "/list",
        {
          query: {
            need_thumbnail: "1",
            need_filter_hidden: "0",
            cursor,
          },
        },
      )
      files.push(...(resp.list || []))
      if (resp.has_more !== 1) break
      cursor = resp.cursor || ""
    }
    return files
  }

  async getAllAlbum(): Promise<BaiduPhotoAlbum[]> {
    const albums: BaiduPhotoAlbum[] = []
    let cursor = ""
    for (;;) {
      const resp = await this.requestJson<BaiduPhotoAlbumListResp>(
        "GET",
        ALBUM_API_URL + "/list",
        { query: { need_amount: "1", limit: "100", cursor } },
      )
      albums.push(...(resp.list || []))
      if (resp.has_more !== 1) break
      cursor = resp.cursor || ""
    }
    return albums
  }

  async getAllAlbumFile(
    albumId: string,
    tid: number,
  ): Promise<BaiduPhotoAlbumFile[]> {
    const files: BaiduPhotoAlbumFile[] = []
    let cursor = ""
    for (;;) {
      const resp = await this.requestJson<BaiduPhotoAlbumFileListResp>(
        "GET",
        ALBUM_API_URL + "/listfile",
        {
          query: {
            album_id: albumId,
            need_amount: "1",
            limit: "1000",
            passwd: "",
            cursor,
          },
        },
      )
      files.push(...(resp.list || []))
      if (resp.has_more !== 1) break
      cursor = resp.cursor || ""
    }
    return files
  }

  async getAlbumDetail(albumId: string): Promise<BaiduPhotoAlbum> {
    return this.requestJson<BaiduPhotoAlbum>("GET", ALBUM_API_URL + "/detail", {
      query: { album_id: albumId },
    })
  }

  async linkFile(fsid: number): Promise<string> {
    const resp = await this.requestJson<BaiduPhotoDownloadResp>(
      "GET",
      FILE_API_URL_V2 + "/download",
      { query: { fsid: String(fsid) } },
    )
    if (!resp.dlink) throw new Error("[BaiduPhoto] 获取下载地址失败")
    return resp.dlink
  }

  async linkAlbumFile(
    fsid: number,
    albumId: string,
    tid: number,
    uk: number,
  ): Promise<string> {
    const resp = await this.request("HEAD", ALBUM_API_URL + "/download", {
      query: {
        fsid: String(fsid),
        album_id: albumId,
        tid: String(tid),
        uk: String(uk),
      },
      redirect: "manual",
    })
    const location = resp.headers.get("location")
    if (!location) throw new Error("[BaiduPhoto] 相册文件未返回 302 跳转")
    return location
  }

  downloadHeaders(): Record<string, string> {
    return { Referer: "https://photo.baidu.com/", "User-Agent": UA }
  }

  async createAlbum(name: string): Promise<BaiduPhotoAlbum> {
    const resp = await this.requestJson<{ album_id?: string }>(
      "POST",
      ALBUM_API_URL + "/create",
      { query: { title: name, tid: getTid(), source: "0" } },
    )
    if (!resp.album_id) throw new Error("[BaiduPhoto] 创建相册失败")
    return this.getAlbumDetail(resp.album_id)
  }

  async joinAlbum(code: string): Promise<BaiduPhotoAlbum> {
    const resp = await this.requestJson<{
      pdata?: { invite_code?: string }
    }>("GET", ALBUM_API_URL + "/querypcode", {
      query: { pcode: code, web: "1" },
    })
    if (!resp.pdata?.invite_code) {
      throw new Error("[BaiduPhoto] 邀请码无效")
    }
    const resp2 = await this.requestJson<{ album_id?: string }>(
      "GET",
      ALBUM_API_URL + "/join",
      { query: { invite_code: resp.pdata.invite_code } },
    )
    if (!resp2.album_id) throw new Error("[BaiduPhoto] 加入相册失败")
    return this.getAlbumDetail(resp2.album_id)
  }

  async setAlbumName(
    albumId: string,
    tid: number,
    name: string,
  ): Promise<void> {
    await this.requestJson("POST", ALBUM_API_URL + "/settitle", {
      form: { title: name, album_id: albumId, tid: String(tid) },
    })
  }

  async deleteAlbum(
    albumId: string,
    tid: number,
    deleteOrigin: boolean,
  ): Promise<void> {
    await this.requestJson("POST", ALBUM_API_URL + "/delete", {
      form: {
        album_id: albumId,
        tid: String(tid),
        delete_origin_image: deleteOrigin ? "1" : "0",
      },
    })
  }

  async deleteFile(fsid: number): Promise<void> {
    await this.requestJson("GET", FILE_API_URL_V1 + "/delete", {
      query: { fsid_list: `[${fsid}]` },
    })
  }

  async deleteAlbumFile(
    fsid: number,
    albumId: string,
    tid: number,
    uk: number,
    deleteOrigin: boolean,
  ): Promise<void> {
    await this.requestJson("POST", ALBUM_API_URL + "/delfile", {
      form: {
        album_id: albumId,
        tid: String(tid),
        list: `[{"fsid":${fsid},"uk":${uk}}]`,
        del_origin: deleteOrigin ? "1" : "0",
      },
    })
  }

  async addAlbumFile(
    albumId: string,
    tid: number,
    fsid: number,
  ): Promise<void> {
    await this.requestJson("GET", ALBUM_API_URL + "/addfile", {
      query: {
        album_id: albumId,
        tid: String(tid),
        list: fsidsFormatNotUk([fsid]),
      },
    })
  }

  async copyAlbumFile(
    fsid: number,
    albumId: string,
    tid: number,
    uk: number,
  ): Promise<number> {
    const resp = await this.requestJson<{
      list?: { fsid: number }[]
    }>("POST", ALBUM_API_URL + "/copyfile", {
      form: {
        album_id: albumId,
        tid: String(tid),
        uk: String(uk),
        list: fsidsFormatNotUk([fsid]),
      },
    })
    if (!resp.list || resp.list.length === 0) {
      throw new Error("[BaiduPhoto] 复制相册文件失败")
    }
    return resp.list[0].fsid
  }

  /** 分片上传（Worker 单线程版） */
  async upload(
    parentAlbum: BaiduPhotoAlbum | null,
    fileName: string,
    content: Uint8Array,
  ): Promise<void> {
    if (content.length === 0) {
      throw new Error("[BaiduPhoto] file size cannot be zero")
    }

    const contentMd5 = md5(content)
    const sliceMd5 = md5(
      content.subarray(0, Math.min(SLICE_SIZE, content.length)),
    )
    const blockList: string[] = []
    for (let i = 0; i < content.length; i += DEFAULT) {
      blockList.push(
        md5(content.subarray(i, Math.min(i + DEFAULT, content.length))),
      )
    }
    const blockListStr = JSON.stringify(blockList)

    const params: Record<string, string> = {
      autoinit: "1",
      isdir: "0",
      rtype: "1",
      ctype: "11",
      path: `/${fileName}`,
      size: String(content.length),
      "slice-md5": sliceMd5,
      "content-md5": contentMd5,
      block_list: blockListStr,
    }

    // step.1 precreate
    const precreate = await this.requestJson<BaiduPhotoPrecreateResp>(
      "POST",
      FILE_API_URL_V1 + "/precreate",
      { query: { bdstoken: this.bdstoken }, form: params },
    )

    let newFsid: number | undefined

    switch (precreate.return_type) {
      case 1: {
        // step.2 上传切片
        const uploadid = precreate.uploadid
        const count = Math.ceil(content.length / DEFAULT)
        for (const partseq of precreate.block_list || []) {
          const offset = partseq * DEFAULT
          const byteSize =
            partseq + 1 === count ? content.length - offset : DEFAULT
          const partContent = content.subarray(offset, offset + byteSize)

          const fd = new FormData()
          fd.append(
            "file",
            new Blob([
              partContent.buffer.slice(
                partContent.byteOffset,
                partContent.byteOffset + partContent.byteLength,
              ) as ArrayBuffer,
            ]),
            fileName,
          )

          const upUrl = new URL(
            "https://c3.pcs.baidu.com/rest/2.0/pcs/superfile2",
          )
          upUrl.searchParams.set("method", "upload")
          upUrl.searchParams.set("path", params.path)
          upUrl.searchParams.set("partseq", String(partseq))
          upUrl.searchParams.set("uploadid", uploadid || "")
          upUrl.searchParams.set("app_id", "16051585")
          const upResp = await fetch(upUrl.toString(), {
            method: "POST",
            headers: { Cookie: this.cookie, "User-Agent": UA },
            body: fd,
          })
          if (!upResp.ok) {
            throw new Error(`[BaiduPhoto] 上传切片失败: HTTP ${upResp.status}`)
          }
        }
        // step.3 create
        params.uploadid = uploadid || ""
        const createResp = await this.requestJson<BaiduPhotoPrecreateResp>(
          "POST",
          FILE_API_URL_V1 + "/create",
          { query: { bdstoken: this.bdstoken }, form: params },
        )
        newFsid = createResp.data?.fs_id
        break
      }
      case 2: {
        // 秒传（已存在）
        newFsid = precreate.data?.fs_id
        break
      }
      case 3: {
        // 已保存
        newFsid = precreate.data?.fs_id
        break
      }
      default:
        throw new Error("[BaiduPhoto] precreate 返回未知 return_type")
    }

    // step.4 若上传到相册，则加入相册
    if (parentAlbum && newFsid) {
      await this.addAlbumFile(parentAlbum.album_id, parentAlbum.tid, newFsid)
    }
  }
}
