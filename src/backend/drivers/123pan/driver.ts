// 123 Cloud Drive (123Pan) driver
// Based on: https://github.com/OpenListTeam/OpenList/tree/main/drivers/123
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { Pan123Addition, Pan123File } from "./types"
import { Pan123Client } from "./util"

function pan123FileToFileItem(f: Pan123File): FileItem {
  const isDir = f.Type === 1
  return {
    name: f.FileName,
    size: f.Size || 0,
    is_dir: isDir,
    modified: f.UpdateAt
      ? new Date(f.UpdateAt).toISOString()
      : new Date().toISOString(),
    sign: String(f.FileId),
    type: calcFileType(f.FileName, isDir),
    thumb: "",
    raw_url: "",
  }
}

export class Pan123Driver implements StorageDriver {
  private client: Pan123Client
  private addition: Pan123Addition
  /** cache: physical path → folder FileId (string) */
  private pathIdCache = new Map<string, string>()
  /**
   * Cloudflare Workers subrequest 预算（免费版单次 invocation 最多 50 个子请求）。
   * 所有分页/路径解析调用共享该预算；超出时截断并告警，避免
   * "Too many subrequests by single Worker invocation" 错误。
   */
  private budget = { used: 0, limit: 45 }

  constructor(
    addition: Pan123Addition,
    onTokenUpdate?: (token: string) => void,
  ) {
    // 官方驱动方式：必填 123 网盘手机号 + 密码登录（无默认令牌）。
    // access_token 为登录后自动持久化的会话令牌（可选，用户无需手动填写）。
    this.addition = addition
    this.client = new Pan123Client(addition, onTokenUpdate)
  }

  async init(): Promise<void> {
    await this.client.login()
  }

  /**
   * Resolve a physical path ("0/a/b") to the FileId of its last folder.
   * Walks the tree from the root id, listing each level to find the
   * folder by name, caching results. Each level consumes at most one
   * page of subrequests (findName early-termination).
   */
  private async resolveFolderId(physicalPath: string): Promise<string> {
    const rootId = this.client.getRootId()
    const clean =
      "/" +
      String(physicalPath || "")
        .split("/")
        .filter(Boolean)
        .join("/")
    if (clean === "/" || clean === `/${rootId}`) {
      return rootId
    }

    // Find the longest cached prefix
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

      const files = await this.client.getFiles(parentId, {
        findName: decodedName,
        findIsDir: true,
        budget: this.budget,
      })
      const folder = files.find(
        (f) =>
          f.Type === 1 &&
          (f.FileName === rawName ||
            f.FileName === decodedName ||
            String(f.FileId) === rawName ||
            String(f.FileId) === decodedName),
      )
      if (!folder) {
        throw new Error(`folder not found: ${rawName}`)
      }
      parentId = String(folder.FileId)
      prefix = "/" + segs.slice(0, i + 1).join("/")
      this.pathIdCache.set(prefix, parentId)
    }
    return parentId
  }

  /**
   * Resolve a physical path to a file: parent folder id + matching file.
   * physicalPath segments: rootId/name1/name2/.../targetName
   */
  private async resolveFile(physicalPath: string): Promise<{
    file: Pan123File
    parentId: string
    name: string
  }> {
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    if (segs.length === 0) throw new Error("invalid path")
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
    const files = await this.client.getFiles(parentId, {
      findName: decodedName,
      budget: this.budget,
    })
    const file = files.find(
      (f) =>
        String(f.FileId) === rawName ||
        String(f.FileId) === decodedName ||
        f.FileName === rawName ||
        f.FileName === decodedName,
    )
    if (!file) throw new Error(`file not found: ${rawName}`)
    return { file, parentId, name: rawName }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    // 每次外部调用重置 subrequest 预算（45 页上限，低于 CF 50 次限制）
    this.budget.used = 0
    const folderId = await this.resolveFolderId(physicalPath)
    const files = await this.client.getFiles(folderId, { budget: this.budget })
    const items = files.map(pan123FileToFileItem)
    return sortFileItems(
      items,
      this.addition.order_by || "file_name",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    // 每次外部调用重置 subrequest 预算
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    // Storage root → folder
    if (
      segs.length === 0 ||
      segs[segs.length - 1] === this.client.getRootId()
    ) {
      const rootId = this.client.getRootId()
      return {
        name: rootId,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: rootId,
        type: 1,
        raw_url: "",
      }
    }

    const { file } = await this.resolveFile(physicalPath)
    const item = pan123FileToFileItem(file)
    if (file.Type !== 1) {
      try {
        item.raw_url = await this.client.getDownloadLink(file)
      } catch (e: any) {
        console.warn(
          `[123Pan] getDownloadLink warning for ${file.FileName}:`,
          e.message,
        )
      }
    }
    return item
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    this.budget.used = 0
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
    this.budget.used = 0
    const { file } = await this.resolveFile(physicalPath)
    await this.client.rename(String(file.FileId), newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    this.budget.used = 0
    const { file } = await this.resolveFile(physicalPath)
    await this.client.remove(String(file.FileId), file)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    this.budget.used = 0
    const { file } = await this.resolveFile(srcPhysical)
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.move([String(file.FileId)], targetParentId)
  }

  async copy(): Promise<void> {
    throw new Error("[123Pan] Copy is not supported by 123 Cloud Drive API")
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    this.budget.used = 0
    const segs = String(physicalPath || "")
      .split("/")
      .filter(Boolean)
    if (segs.length === 0) throw new Error("invalid upload path")
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
    await this.client.uploadFile(parentId, decodedName, content)
  }
}
