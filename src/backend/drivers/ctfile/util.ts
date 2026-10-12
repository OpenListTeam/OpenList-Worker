// CtFile (城通网盘) OpenAPI 客户端
// 文档: https://openapi.ctfile.com/ (CTFile REST API v1, 统一 POST JSON + session 鉴权)
import { md5 } from "../../pkg/crypto"
import {
  CtFileAddition,
  CtFileDownloadUrl,
  CtFileFile,
  CtFileFileMeta,
  CtFileFolder,
  CtFileFolderCreateResult,
  CtFileFolderMeta,
  CtFileProfile,
  CtFileResp,
  CtFileUploadResult,
  CtFileUploadTicket,
} from "./types"

/** 根目录 ID（官方 OpenAPI 示例使用 "d0"；部分接口也接受 "0"） */
export const ROOT_FOLDER_ID = "d0"

const DEFAULT_BASE_URL = "https://rest.ctfile.com/v1"
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"

/** Session 失效统一提示 */
const SESSION_EXPIRED_MSG =
  "[CtFile] Session 已失效（未登录），请在城通网盘管理后台「开放接口登录密钥管理」重新生成 Session 并更新存储配置"

/** file/list 单轮分页上限（防止服务端异常导致无限翻页） */
const MAX_LIST_PAGES = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 去掉 ID 的 d/f 前缀（如 "d123"→"123"、"f456"→"456"）。
 * 仅当前缀后紧跟数字时才剥离，避免误伤纯字母 ID。
 */
function stripIdPrefix(id: string): string {
  return String(id || "").replace(/^([df])(?=\d)/, "")
}

interface CallOptions {
  /**
   * ID 首选形态：
   * - raw：按原样传（带前缀），失败再去前缀重试。folder/list、delete、move 等按社区实现验证的接口使用。
   * - stripped：按文档「不带 d/f 前缀」优先，失败再带前缀重试。meta、fetch_url、modify_meta 等文档明确要求去前缀的接口使用。
   */
  prefer?: "raw" | "stripped"
}

export class CtFileClient {
  private addition: CtFileAddition

  constructor(addition: CtFileAddition) {
    this.addition = addition
  }

  public getSession(): string {
    return String(this.addition.session || "").trim()
  }

  public getBaseUrl(): string {
    return (
      this.addition.base_url ||
      (this.addition as any).baseUrl ||
      DEFAULT_BASE_URL
    ).replace(/\/+$/, "")
  }

  public getUserAgent(): string {
    return this.addition.user_agent || DEFAULT_USER_AGENT
  }

  /** 公有云 / 私有云命名空间 */
  private ns(): string {
    return this.addition.cloud_type === "private" ? "private" : "public"
  }

  /**
   * 传输层 POST：JSON 请求体 + session 字段。
   * 网络错误 / 429 / 5xx 自动退避重试；401 直接抛 Session 失效提示。
   * 业务错误码（code !== 200）不在此处抛出，交由 call() 处理（便于 ID 形态回退）。
   */
  private async post(
    path: string,
    body: Record<string, any>,
  ): Promise<CtFileResp> {
    const session = this.getSession()
    if (!session) {
      throw new Error(
        "[CtFile] 未配置 Session，请在城通网盘管理后台「开放接口登录密钥管理」生成后填入存储配置",
      )
    }

    const url = `${this.getBaseUrl()}${path}`
    const payload = JSON.stringify({ ...body, session })
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": this.getUserAgent(),
    }

    let lastError = ""
    for (let retry = 0; retry < 3; retry++) {
      if (retry > 0) await sleep(300 * retry)

      let res: Response
      try {
        res = await fetch(url, { method: "POST", headers, body: payload })
      } catch (e: any) {
        lastError = e?.message || String(e)
        continue
      }

      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`
        continue
      }

      const text = await res.text()
      let data: CtFileResp
      try {
        data = JSON.parse(text) as CtFileResp
      } catch {
        throw new Error(
          `[CtFile] ${path} 返回非 JSON 响应 (HTTP ${res.status}): ${text.slice(0, 200)}`,
        )
      }

      const code = Number(data?.code)
      if (code === 401) throw new Error(SESSION_EXPIRED_MSG)
      if (code === 429) {
        lastError = data?.message || "429"
        continue
      }
      return data
    }

    throw new Error(`[CtFile] ${path} 请求失败（已重试）: ${lastError}`)
  }

  /** 业务层调用：HTTP/JSON 层成功后校验 code === 200，否则抛带 code 的错误 */
  private async call(
    path: string,
    body: Record<string, any>,
  ): Promise<CtFileResp> {
    const data = await this.post(path, body)
    const code = Number(data?.code)
    if (code === 200 || data?.code === undefined) return data
    const err: any = new Error(
      `[CtFile] ${path} 失败 (code=${code}): ${data?.message || "未知错误"}`,
    )
    err.code = code
    err.original = data
    throw err
  }

  /**
   * 带 ID 形态回退的调用。
   * 城通 OpenAPI 对 folder_id / file_id 是否携带 d/f 前缀的要求在文档与社区实现间不一致，
   * 先按 prefer 形态请求，遇到 400/404（参数错误/资源不存在）时自动换另一种形态重试一次。
   */
  private async callWithId(
    path: string,
    idKey: string,
    idValue: string,
    body: Record<string, any>,
    options: CallOptions = {},
  ): Promise<CtFileResp> {
    const stripped = stripIdPrefix(idValue)
    const primary = options.prefer === "stripped" ? stripped : idValue
    const secondary = options.prefer === "stripped" ? idValue : stripped
    const attempts = primary === secondary ? [primary] : [primary, secondary]

    let lastErr: any
    for (const value of attempts) {
      try {
        return await this.call(path, { ...body, [idKey]: value })
      } catch (e: any) {
        if (e?.code === 400 || e?.code === 404) {
          lastErr = e
          continue
        }
        throw e
      }
    }
    throw lastErr
  }

  /**
   * ids 参数（批量文件/文件夹 ID）形态回退：
   * 文档写逗号分隔字符串，社区实现传 JSON 数组，两者皆尝试。
   */
  private async callWithIds(
    path: string,
    ids: string[],
    body: Record<string, any>,
  ): Promise<CtFileResp> {
    let lastErr: any
    for (const value of [ids.join(","), ids]) {
      try {
        return await this.call(path, { ...body, ids: value })
      } catch (e: any) {
        if (e?.code === 400 || e?.code === 404 || e?.code === 405) {
          lastErr = e
          continue
        }
        throw e
      }
    }
    throw lastErr
  }

  /** 校验 Session 并返回用户资料（init / 健康检查使用） */
  async profile(): Promise<CtFileProfile> {
    const data = await this.call("/user/info/profile", {})
    return data as CtFileProfile
  }

  /** 主动校验 Session 是否有效（供 /task/refresh 巡检调用） */
  async checkValid(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.profile()
      return { valid: true }
    } catch (err: any) {
      const msg = err?.message || String(err)
      return {
        valid: false,
        error: /未登录|401|Session 已失效/.test(msg)
          ? SESSION_EXPIRED_MSG
          : msg,
      }
    }
  }

  /** 列出文件夹下的子文件夹 */
  async listFolders(folderId: string): Promise<CtFileFolder[]> {
    const data = await this.call(
      `/${this.ns()}/folder/list`,
      this.withOrder({ folder_id: folderId || ROOT_FOLDER_ID }),
    )
    const list = Array.isArray(data?.results) ? data.results : []
    return list.map((item: any) => ({
      ...item,
      key: String(item?.key ?? item?.folder_id ?? ""),
      name: String(item?.name ?? ""),
    }))
  }

  /**
   * 列出文件夹下的所有文件（自动翻页）。
   * 分页参数：start 为偏移量；空页 / 重复页 / 达到上限即停止。
   */
  async listFiles(folderId: string): Promise<CtFileFile[]> {
    const all: CtFileFile[] = []
    let start = 0
    let prevFirstKey = ""

    for (let page = 0; page < MAX_LIST_PAGES; page++) {
      const data = await this.call(
        `/${this.ns()}/file/list`,
        this.withOrder({
          folder_id: folderId || ROOT_FOLDER_ID,
          start,
        }),
      )
      const results: any[] = Array.isArray(data?.results) ? data.results : []
      if (results.length === 0) break

      // 服务端忽略 start 时会反复返回同一页：检测首项重复防止死循环
      const firstKey = String(results[0]?.key ?? "")
      if (page > 0 && firstKey === prevFirstKey) break
      prevFirstKey = firstKey

      all.push(
        ...results.map((item: any) => ({
          ...item,
          key: String(item?.key ?? item?.file_id ?? ""),
          name: String(item?.name ?? ""),
          size: Number(item?.size || 0),
        })),
      )
      start += results.length
    }

    return all
  }

  /** folder/list + file/list 合并（目录内全部条目） */
  async listAll(folderId: string): Promise<Array<CtFileFolder | CtFileFile>> {
    const [folders, files] = await Promise.all([
      this.listFolders(folderId),
      this.listFiles(folderId),
    ])
    return [...folders, ...files]
  }

  /** 文件夹元数据 */
  async folderMeta(folderId: string): Promise<CtFileFolderMeta> {
    const data = await this.callWithId(
      `/${this.ns()}/folder/meta`,
      "folder_id",
      folderId,
      {},
      { prefer: "raw" },
    )
    return data as CtFileFolderMeta
  }

  /** 文件元数据 */
  async fileMeta(fileId: string): Promise<CtFileFileMeta> {
    const data = await this.callWithId(
      `/${this.ns()}/file/meta`,
      "file_id",
      fileId,
      {},
      { prefer: "stripped" },
    )
    return data as CtFileFileMeta
  }

  /** 新建文件夹，返回新文件夹 ID（形如 "d123"） */
  async mkdir(parentId: string, name: string): Promise<string> {
    try {
      const data = await this.call(`/${this.ns()}/folder/create`, {
        name,
        folder_id: parentId || ROOT_FOLDER_ID,
        description: "",
        is_hidden: false,
      })
      return String(
        (data as CtFileFolderCreateResult).folder_id ||
          (data as CtFileFolderCreateResult).folder_path ||
          "",
      )
    } catch (err: any) {
      // 重名时服务端返回 403，但附带已存在的 folder_id：视为成功
      if (err?.code === 403) {
        const existing = err?.original?.folder_id
        if (existing) return String(existing)
      }
      throw err
    }
  }

  /** 重命名文件 */
  async renameFile(fileId: string, newName: string): Promise<void> {
    await this.callWithId(
      `/${this.ns()}/file/modify_meta`,
      "file_id",
      fileId,
      { name: newName },
      { prefer: "stripped" },
    )
  }

  /** 重命名文件夹 */
  async renameFolder(folderId: string, newName: string): Promise<void> {
    await this.callWithId(
      `/${this.ns()}/folder/modify_meta`,
      "folder_id",
      folderId,
      { name: newName, is_rename: true },
      { prefer: "raw" },
    )
  }

  /** 删除文件/文件夹（移入回收站） */
  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.callWithIds(`/${this.ns()}/file/delete`, ids, {})
  }

  /** 移动文件/文件夹到目标文件夹 */
  async move(ids: string[], targetFolderId: string): Promise<void> {
    if (ids.length === 0) return
    await this.callWithIds(`/${this.ns()}/file/move`, ids, {
      folder_id: targetFolderId || ROOT_FOLDER_ID,
    })
  }

  /** 获取文件下载直链 */
  async fetchDownloadUrl(fileId: string): Promise<string> {
    const data = await this.callWithId(
      `/${this.ns()}/file/fetch_url`,
      "file_id",
      fileId,
      {},
      { prefer: "stripped" },
    )
    const url = String((data as CtFileDownloadUrl).download_url || "")
    if (!url) {
      throw new Error(
        `[CtFile] 获取下载直链失败: ${data?.message || "返回为空"}`,
      )
    }
    return url
  }

  /**
   * 获取上传凭据（预签名 URL）。
   * checksum 格式为 `md5-大小`，用于服务端秒传比对。
   */
  async uploadTicket(
    folderId: string,
    fileName: string,
    content: Uint8Array,
  ): Promise<CtFileUploadTicket> {
    const checksum = `${md5(content)}-${content.byteLength}`
    const data = await this.call(`/${this.ns()}/file/upload`, {
      folder_id: folderId || ROOT_FOLDER_ID,
      checksum,
      size: content.byteLength,
      name: fileName,
    })
    return data as CtFileUploadTicket
  }

  /** 将文件内容 POST 到预签名上传地址（multipart/form-data） */
  async upload(
    uploadUrl: string,
    fileName: string,
    content: Uint8Array,
  ): Promise<CtFileUploadResult> {
    const form = new FormData()
    form.append("name", fileName)
    form.append("filesize", String(content.byteLength))
    form.append("file", new Blob([content as BlobPart]), fileName)

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "User-Agent": this.getUserAgent() },
      body: form,
    })

    const text = await res.text()
    let data: CtFileUploadResult
    try {
      data = JSON.parse(text) as CtFileUploadResult
    } catch {
      throw new Error(
        `[CtFile] 上传响应异常 (HTTP ${res.status}): ${text.slice(0, 200)}`,
      )
    }
    if (Number(data?.code) !== 200) {
      throw new Error(
        `[CtFile] 上传失败 (code=${data?.code}): ${data?.message || text.slice(0, 200)}`,
      )
    }
    return data
  }

  /** 附加服务端排序参数（new/old/az/za/big/small） */
  private withOrder(body: Record<string, any>): Record<string, any> {
    const map: Record<string, string> = {
      name: "az",
      size: "big",
      time: "new",
    }
    const base = map[this.addition.order_by || "name"] || "az"
    const direction = this.addition.order_direction === "desc"
    const order: Record<string, string> = {
      az: "za",
      za: "az",
      big: "small",
      small: "big",
      new: "old",
      old: "new",
    }
    return { ...body, orderby: direction ? order[base] || base : base }
  }
}
