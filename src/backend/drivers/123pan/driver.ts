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

  constructor(
    addition: Pan123Addition,
    onTokenUpdate?: (token: string) => void,
  ) {
    this.addition = addition
    this.client = new Pan123Client(addition, onTokenUpdate)
  }

  async init(): Promise<void> {
    await this.client.login()
  }

  /**
   * Resolve a physical path ("0/a/b") to the FileId of its last folder.
   * Walks the tree from the root id, listing each level to find the
   * folder by name, caching results.
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
      const name = segs[i]
      const files = await this.client.getFiles(parentId)
      const folder = files.find((f) => f.Type === 1 && f.FileName === name)
      if (!folder) {
        throw new Error(`folder not found: ${name}`)
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
    const name = segs[segs.length - 1]
    const parentPath = "/" + segs.slice(0, segs.length - 1).join("/")
    const parentId = await this.resolveFolderId(parentPath)
    const files = await this.client.getFiles(parentId)
    const file = files.find(
      (f) => String(f.FileId) === name || f.FileName === name,
    )
    if (!file) throw new Error(`file not found: ${name}`)
    return { file, parentId, name }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFolderId(physicalPath)
    const files = await this.client.getFiles(folderId)
    const items = files.map(pan123FileToFileItem)
    return sortFileItems(
      items,
      this.addition.order_by || "file_name",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
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

    try {
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
    } catch (e) {
      // Fallback: path may be a folder not resolvable via parent listing
      // (e.g. cached elsewhere). Probe it as a folder id.
      const lastSeg = segs[segs.length - 1]
      try {
        await this.client.getFiles(lastSeg)
        return {
          name: lastSeg,
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          sign: lastSeg,
          type: 1,
          raw_url: "",
        }
      } catch {
        throw e
      }
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
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
    const { file } = await this.resolveFile(physicalPath)
    await this.client.rename(String(file.FileId), newName)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
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
    const { file } = await this.resolveFile(srcPhysical)
    const dstParts = String(dstDir).split("/").filter(Boolean)
    const targetParentId = await this.resolveFolderId("/" + dstParts.join("/"))
    await this.client.move([String(file.FileId)], targetParentId)
  }

  async copy(): Promise<void> {
    throw new Error("[123Pan] Copy is not supported by 123 Cloud Drive API")
  }

  async put(): Promise<void> {
    throw new Error(
      "[123Pan] Direct put not supported in stateless environment (requires S3 upload session)",
    )
  }
}
