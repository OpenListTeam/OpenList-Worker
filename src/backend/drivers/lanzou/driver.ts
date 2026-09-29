// Lanzou (蓝奏云) driver
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/lanzou
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { LanzouAddition, LanzouFileOrFolder } from "./types"
import { LanzouClient } from "./util"
import { mustParseTime, sizeStrToInt64 } from "./help"

export function normalizeLanzouAddition(a: any): LanzouAddition {
  const norm = { ...(a || {}) } as any
  norm.type = norm.type || "cookie"
  norm.account = norm.account || ""
  norm.password = norm.password || ""
  norm.cookie = (norm.cookie || "").trim()
  norm.root_folder_id = norm.root_folder_id || (norm.type === "url" ? "" : "-1")
  norm.share_password = norm.share_password || ""
  norm.baseUrl = norm.baseUrl || "https://pc.woozooo.com"
  norm.shareUrl = norm.shareUrl || "https://pan.lanzoui.com"
  norm.user_agent =
    norm.user_agent ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  norm.repair_file_info = !!norm.repair_file_info
  norm.order_by = norm.order_by || "name"
  norm.order_direction = norm.order_direction || "asc"
  return norm as LanzouAddition
}

function lanzouItemToFileItem(
  item: LanzouFileOrFolder,
  repair?: { size?: number; time?: string },
): FileItem {
  const isDir = !!item.is_folder || !!item.fol_id
  const name = item.name_all || item.name || ""
  const size =
    repair?.size !== undefined ? repair.size : sizeStrToInt64(item.size || "0")
  const modified = repair?.time ? repair.time : mustParseTime(item.time || "")
  const id = item.fol_id || item.id || ""

  return {
    name,
    size,
    is_dir: isDir,
    modified,
    sign: id,
    type: calcFileType(name, isDir),
    thumb: "",
    raw_url: item.url || "",
  }
}

export class LanzouDriver implements StorageDriver {
  private client: LanzouClient
  private addition: LanzouAddition
  /** cache: physical path -> folderId (string) */
  private pathIdCache = new Map<string, string>()

  constructor(
    addition: LanzouAddition,
    onCookieUpdate?: (cookie: string) => void,
  ) {
    this.addition = normalizeLanzouAddition(addition)
    this.client = new LanzouClient(this.addition, onCookieUpdate)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  /**
   * 校验当前 Cookie 是否有效（供管理后台 /task/refresh 状态刷新调用）。
   * 有效返回 true；失效返回 false 并附过期提示。
   */
  async checkCookieValid(): Promise<{ valid: boolean; error?: string }> {
    return this.client.checkCookieValid()
  }

  private isUrlMode(): boolean {
    return this.addition.type === "url"
  }

  private getRootId(): string {
    return this.addition.root_folder_id || (this.isUrlMode() ? "" : "-1")
  }

  /**
   * 将 physicalPath 解析为对应的 folderId
   */
  private async resolveFolderId(physicalPath: string): Promise<string> {
    const rootId = this.getRootId()
    const clean =
      "/" +
      String(physicalPath || "")
        .split("/")
        .filter(Boolean)
        .join("/")

    if (clean === "/" || clean === `/${rootId}`) {
      return rootId
    }

    const segs = clean.split("/").filter(Boolean)
    let cachedLen = 0
    let parentId = rootId
    let prefix = ""

    for (let i = 0; i < segs.length; i++) {
      const p = "/" + segs.slice(0, i + 1).join("/")
      const id = this.pathIdCache.get(p)
      if (id !== undefined) {
        parentId = id
        cachedLen = i + 1
        prefix = p
      } else {
        break
      }
    }

    for (let i = cachedLen; i < segs.length; i++) {
      const rawName = segs[i]
      const decodedName = (() => {
        try {
          return decodeURIComponent(rawName)
        } catch {
          return rawName
        }
      })()

      const items = this.isUrlMode()
        ? await this.client.getFileOrFolderByShareUrl(
            parentId,
            this.addition.share_password,
          )
        : await this.client.getFolders(parentId)

      const folder = items.find((f) => {
        if (!f.is_folder && !f.fol_id) return false
        const fName = f.name || f.name_all || ""
        const fId = f.fol_id || f.id || ""
        return (
          fName === rawName ||
          fName === decodedName ||
          fId === rawName ||
          fId === decodedName
        )
      })

      if (!folder) {
        throw new Error(`[Lanzou] 目录未找到: ${rawName}`)
      }

      parentId = folder.fol_id || folder.id || ""
      prefix = "/" + segs.slice(0, i + 1).join("/")
      this.pathIdCache.set(prefix, parentId)
    }

    return parentId
  }

  /**
   * 解析具体文件或文件夹
   */
  private async resolveItem(physicalPath: string): Promise<{
    item: LanzouFileOrFolder
    parentId: string
    isDir: boolean
  }> {
    const clean =
      "/" +
      String(physicalPath || "")
        .split("/")
        .filter(Boolean)
        .join("/")

    const segs = clean.split("/").filter(Boolean)
    if (segs.length === 0) throw new Error("[Lanzou] 路径无效")

    const rawName = segs[segs.length - 1]
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName)
      } catch {
        return rawName
      }
    })()

    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parentId = await this.resolveFolderId(parentPath)

    const items = this.isUrlMode()
      ? await this.client.getFileOrFolderByShareUrl(
          parentId,
          this.addition.share_password,
        )
      : await this.client.getAllFiles(parentId)

    const found = items.find((f) => {
      const fName = f.name_all || f.name || ""
      const fId = f.fol_id || f.id || ""
      return (
        fName === rawName ||
        fName === decodedName ||
        fId === rawName ||
        fId === decodedName
      )
    })

    if (!found) {
      throw new Error(`[Lanzou] 文件或目录未找到: ${rawName}`)
    }

    const isDir = Boolean(found.is_folder || found.fol_id)
    if (isDir) {
      this.pathIdCache.set(clean, found.fol_id || found.id || "")
    }

    return {
      item: found,
      parentId,
      isDir,
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFolderId(physicalPath)
    const rawItems = this.isUrlMode()
      ? await this.client.getFileOrFolderByShareUrl(
          folderId,
          this.addition.share_password,
        )
      : await this.client.getAllFiles(folderId)

    const items = rawItems.map((item) => lanzouItemToFileItem(item))

    return sortFileItems(
      items,
      this.addition.order_by === "name"
        ? "file_name"
        : this.addition.order_by === "size"
          ? "size"
          : "updated_at",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)

    if (segs.length === 0 || segs[segs.length - 1] === this.getRootId()) {
      const rootId = this.getRootId()
      return {
        name: rootId || "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: rootId,
        type: 1,
        raw_url: "",
      }
    }

    const { item, isDir } = await this.resolveItem(physicalPath)
    if (isDir) {
      return lanzouItemToFileItem(item)
    }

    let downloadUrl = item.url
    if (!downloadUrl) {
      try {
        if (this.isUrlMode()) {
          const resolved = await this.client.getFilesByShareUrl(
            item.id || "",
            item.pwd || this.addition.share_password || "",
            undefined,
            // 分享页域名每个人不同（如 xxx.lanzn.com），
            // 先探测分享页真实域名再解析直链，避免一直用兜底域名请求
            await this.client.probeShareDomain(item.id || ""),
          )
          downloadUrl = resolved.url
          item.name_all = resolved.name_all || item.name_all
          item.size = resolved.size || item.size
        } else {
          const shareInfo = await this.client.getFileShareUrlById(item.id || "")
          const shareId = shareInfo?.f_id || (shareInfo as any)?.id
          // 注意：is_newd 是"上传域名"（如 https://upload.lanzouj.com），
          // 不是分享页域名，不能作为 customShareDomain 传入（会导致分享页
          // 请求随机失败）。getFilesByShareUrl 内部会 probeShareDomain 探测
          // 真实分享页域名。
          if (shareId) {
            const resolved = await this.client.getFilesByShareUrl(
              shareId,
              shareInfo.pwd || "",
              undefined,
            )
            downloadUrl = resolved.url
            if (resolved.name_all) item.name_all = resolved.name_all
            if (resolved.size) item.size = resolved.size
          }
        }
      } catch (err: any) {
        console.error(
          `[Lanzou] 解析下载链接失败 (${item.name_all || item.name}):`,
          err.message,
        )
        throw new Error(
          `[Lanzou] 获取下载直链失败 (${item.name_all || item.name}): ${err.message}`,
        )
      }
    }

    if (!downloadUrl) {
      throw new Error(
        `[Lanzou] 未能获取到下载直链 (${item.name_all || item.name || physicalPath})`,
      )
    }

    let repairInfo: { size?: number; time?: string } | undefined
    if (this.addition.repair_file_info && downloadUrl) {
      try {
        repairInfo = await this.client.getFileRealInfo(downloadUrl)
      } catch {}
    }

    const fileItem = lanzouItemToFileItem(item, repairInfo)
    fileItem.raw_url = downloadUrl || ""
    fileItem.raw_url_headers = {
      "User-Agent": this.client.getUserAgent(),
    }
    return fileItem
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    if (this.isUrlMode()) {
      throw new Error("[Lanzou] 分享链接模式不支持新建文件夹")
    }
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    const dirName = segs.pop() || "新文件夹"
    const parentPath = "/" + segs.join("/")
    const parentId = await this.resolveFolderId(parentPath)
    await this.client.mkdir(parentId, dirName)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    if (this.isUrlMode()) {
      throw new Error("[Lanzou] 分享链接模式不支持重命名")
    }
    const { item, isDir } = await this.resolveItem(physicalPath)
    if (isDir) {
      throw new Error("[Lanzou] 蓝奏云不支持重命名文件夹")
    }
    await this.client.rename(item.id || "", newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    if (this.isUrlMode()) {
      throw new Error("[Lanzou] 分享链接模式不支持删除")
    }
    const { item, isDir } = await this.resolveItem(physicalPath)
    await this.client.remove(item.fol_id || item.id || "", isDir)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    if (this.isUrlMode()) {
      throw new Error("[Lanzou] 分享链接模式不支持移动")
    }
    const { item, isDir } = await this.resolveItem(srcPhysical)
    if (isDir) {
      throw new Error("[Lanzou] 蓝奏云不支持移动文件夹")
    }
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.move(item.id || "", targetParentId)
  }

  async copy(): Promise<void> {
    throw new Error("[Lanzou] 蓝奏云不支持直接复制文件")
  }

  async put(): Promise<void> {
    throw new Error(
      "[Lanzou] Cloudflare Worker 环境暂不支持直接流式写入，请使用网页端进行文件上传",
    )
  }
}
