import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { SpaceTypeFamily, SpaceTypePersonal, SortRules } from "./consts"
import { WoPanAddition, WoPanFile } from "./types"
import { WoPanClient } from "./util"

function parseWoPanDate(str: string): string {
  if (!str) return new Date().toISOString()
  if (str.length >= 14) {
    const y = str.slice(0, 4)
    const m = str.slice(4, 6)
    const d = str.slice(6, 8)
    const h = str.slice(8, 10)
    const min = str.slice(10, 12)
    const s = str.slice(12, 14)
    const iso = `${y}-${m}-${d}T${h}:${min}:${s}+08:00`
    const parsed = new Date(iso)
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  }
  try {
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  } catch {}
  return new Date().toISOString()
}

function wopanFileToFileItem(f: WoPanFile): FileItem {
  const isDir = f.type === 0
  return {
    name: f.name,
    size: f.size || 0,
    is_dir: isDir,
    modified: parseWoPanDate(f.createTime),
    sign: f.fid || f.id,
    type: calcFileType(f.name, isDir),
    thumb: f.thumbUrl || "",
    raw_url: "",
  }
}

export function normalizeWoPanAddition(a: any): WoPanAddition {
  const norm = { ...(a || {}) } as any
  norm.root_folder_id = norm.root_folder_id || "0"
  norm.refresh_token = (norm.refresh_token || "").trim()
  norm.family_id = (norm.family_id || "").trim()
  norm.sort_rule = norm.sort_rule || "name_asc"
  norm.access_token = (norm.access_token || "").trim()
  return norm as WoPanAddition
}

export class WoPanDriver implements StorageDriver {
  private client: WoPanClient
  private addition: WoPanAddition
  private defaultFamilyId: string = ""
  private pathFileMapCache = new Map<string, WoPanFile>()
  private pathFolderIdCache = new Map<string, string>()

  constructor(
    addition: WoPanAddition,
    onTokenUpdate?: (accessToken: string, refreshToken: string) => void,
  ) {
    this.addition = normalizeWoPanAddition(addition)
    this.client = new WoPanClient(this.addition, (acc, ref) => {
      this.addition.access_token = acc
      this.addition.refresh_token = ref
      onTokenUpdate?.(acc, ref)
    })
  }

  private getSpaceType(): string {
    return this.addition.family_id ? SpaceTypeFamily : SpaceTypePersonal
  }

  private getFamilyId(): string {
    return this.addition.family_id || this.defaultFamilyId
  }

  private getSortRuleNum(): number {
    const rule = (this.addition.sort_rule ||
      "name_asc") as keyof typeof SortRules
    return SortRules[rule] || SortRules.name_asc
  }

  private getRootId(): string {
    return this.addition.root_folder_id || "0"
  }

  async init(): Promise<void> {
    await this.client.initData()
    const fml = await this.client.familyUserCurrentEncode().catch(() => null)
    if (fml?.defaultHomeId !== undefined && fml.defaultHomeId !== null) {
      this.defaultFamilyId = String(fml.defaultHomeId)
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFolderId(physicalPath)
    const files = await this.fetchFolderFiles(folderId)

    // Update path caches for children
    const cleanDir = physicalPath.split("/").filter(Boolean).join("/")
    for (const f of files) {
      const childPath = cleanDir ? `${cleanDir}/${f.name}` : f.name
      this.pathFileMapCache.set(childPath, f)
      if (f.type === 0) {
        this.pathFolderIdCache.set(childPath, f.id)
      }
    }

    const items = files.map(wopanFileToFileItem)
    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) {
      // Root folder
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.getRootId(),
        type: 1,
        raw_url: "",
      }
    }

    const file = await this.resolveWoPanFile(physicalPath)
    if (!file) {
      // Try resolving as folder
      const folderId = await this.resolveFolderId(physicalPath).catch(
        () => null,
      )
      if (folderId) {
        const parts = clean.split("/")
        const name = parts[parts.length - 1] || "root"
        return {
          name,
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          sign: folderId,
          type: 1,
          raw_url: "",
        }
      }
      throw new Error(`[WoPan] File not found: ${physicalPath}`)
    }

    const item = wopanFileToFileItem(file)
    if (!item.is_dir && file.fid) {
      const dl = await this.client
        .getDownloadUrlV2([file.fid])
        .catch(() => null)
      if (dl?.list?.[0]?.downloadUrl) {
        item.raw_url = dl.list[0].downloadUrl
      }
    }
    return item
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "新文件夹"
    const parentPath = parts.join("/")
    const parentId = await this.resolveFolderId(parentPath)
    await this.client.createDirectory(
      this.getSpaceType(),
      parentId,
      name,
      this.getFamilyId(),
    )
    this.clearCache()
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const file = await this.resolveWoPanFile(physicalPath)
    if (!file) {
      throw new Error(`[WoPan] Item not found for rename: ${physicalPath}`)
    }
    await this.client.renameFileOrDirectory(
      this.getSpaceType(),
      file.type,
      file.id,
      newName,
      this.getFamilyId(),
    )
    this.clearCache()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const file = await this.resolveWoPanFile(physicalPath)
    if (!file) {
      throw new Error(`[WoPan] Item not found for deletion: ${physicalPath}`)
    }
    const dirList: string[] = []
    const fileList: string[] = []
    if (file.type === 0) {
      dirList.push(file.id)
    } else {
      fileList.push(file.id)
    }
    await this.client.deleteFile(this.getSpaceType(), dirList, fileList)
    this.clearCache()
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const file = await this.resolveWoPanFile(srcPhysical)
    if (!file) {
      throw new Error(`[WoPan] Source item not found for move: ${srcPhysical}`)
    }
    const dstFolderId = await this.resolveFolderId(dstDir)
    const dirList: string[] = []
    const fileList: string[] = []
    if (file.type === 0) {
      dirList.push(file.id)
    } else {
      fileList.push(file.id)
    }
    await this.client.moveFile(
      dirList,
      fileList,
      dstFolderId,
      this.getSpaceType(),
      this.getSpaceType(),
      this.getFamilyId(),
      this.getFamilyId(),
    )
    this.clearCache()
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const file = await this.resolveWoPanFile(srcPhysical)
    if (!file) {
      throw new Error(`[WoPan] Source item not found for copy: ${srcPhysical}`)
    }
    const dstFolderId = await this.resolveFolderId(dstDir)
    const dirList: string[] = []
    const fileList: string[] = []
    if (file.type === 0) {
      dirList.push(file.id)
    } else {
      fileList.push(file.id)
    }
    await this.client.copyFile(
      dirList,
      fileList,
      dstFolderId,
      this.getSpaceType(),
      this.getSpaceType(),
      this.getFamilyId(),
      this.getFamilyId(),
    )
    this.clearCache()
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "upload"
    const parentPath = parts.join("/")
    const parentId = await this.resolveFolderId(parentPath)
    await this.client.upload2C(
      this.getSpaceType(),
      name,
      content,
      parentId,
      this.getFamilyId(),
    )
    this.clearCache()
  }

  private clearCache(): void {
    this.pathFileMapCache.clear()
    this.pathFolderIdCache.clear()
  }

  private async fetchFolderFiles(folderId: string): Promise<WoPanFile[]> {
    const allFiles: WoPanFile[] = []
    let pageNum = 0
    const pageSize = 100
    while (true) {
      const data = await this.client.queryAllFiles(
        this.getSpaceType(),
        folderId,
        pageNum,
        pageSize,
        this.getSortRuleNum(),
        this.getFamilyId(),
      )
      const files = data?.files || []
      allFiles.push(...files)
      if (files.length < pageSize) {
        break
      }
      pageNum++
    }
    return allFiles
  }

  private async resolveFolderId(physicalPath: string): Promise<string> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return this.getRootId()
    if (this.pathFolderIdCache.has(clean)) {
      return this.pathFolderIdCache.get(clean)!
    }

    const parts = clean.split("/")
    let currentFolderId = this.getRootId()

    for (let i = 0; i < parts.length; i++) {
      const rawPart = parts[i]
      const decodedPart = (() => {
        try {
          return decodeURIComponent(rawPart)
        } catch {
          return rawPart
        }
      })()
      const subPath = parts.slice(0, i + 1).join("/")

      if (this.pathFolderIdCache.has(subPath)) {
        currentFolderId = this.pathFolderIdCache.get(subPath)!
        continue
      }

      const files = await this.fetchFolderFiles(currentFolderId)
      for (const f of files) {
        const childPath = parts.slice(0, i).concat(f.name).join("/")
        this.pathFileMapCache.set(childPath, f)
        if (f.type === 0) {
          this.pathFolderIdCache.set(childPath, f.id)
        }
      }

      const target = files.find(
        (f) =>
          f.type === 0 &&
          (f.name === rawPart || f.name === decodedPart || f.id === rawPart),
      )
      if (!target) {
        throw new Error(
          `[WoPan] Directory '${rawPart}' not found in path '${physicalPath}'`,
        )
      }
      currentFolderId = target.id
      this.pathFolderIdCache.set(subPath, currentFolderId)
    }

    return currentFolderId
  }

  private async resolveWoPanFile(
    physicalPath: string,
  ): Promise<WoPanFile | null> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) return null
    if (this.pathFileMapCache.has(clean)) {
      return this.pathFileMapCache.get(clean)!
    }

    const parts = clean.split("/")
    const fileName = parts.pop()!
    const decodedFileName = (() => {
      try {
        return decodeURIComponent(fileName)
      } catch {
        return fileName
      }
    })()
    const parentPath = parts.join("/")
    const parentFolderId = await this.resolveFolderId(parentPath)

    const files = await this.fetchFolderFiles(parentFolderId)
    for (const f of files) {
      const childPath = parts.concat(f.name).join("/")
      this.pathFileMapCache.set(childPath, f)
      if (f.type === 0) {
        this.pathFolderIdCache.set(childPath, f.id)
      }
    }

    const target =
      files.find(
        (f) =>
          f.name === fileName ||
          f.name === decodedFileName ||
          f.id === fileName ||
          f.fid === fileName,
      ) || null

    return target
  }
}
