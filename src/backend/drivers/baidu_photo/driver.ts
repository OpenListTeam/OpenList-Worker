import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import {
  DriverBaiduPhotoAddition,
  BaiduPhotoFile,
  BaiduPhotoAlbum,
  BaiduPhotoAlbumFile,
} from "./types"
import { ClientBaiduPhoto } from "./util"

function unixToIso(sec: number): string {
  return sec ? new Date(sec * 1000).toISOString() : new Date().toISOString()
}

function getFileName(path: string): string {
  return path.split("/").pop() || ""
}

function albumToItem(a: BaiduPhotoAlbum): FileItem {
  return {
    name: a.title,
    size: 0,
    is_dir: true,
    modified: unixToIso(a.mtime),
    sign: `album:${a.album_id}|${a.tid}`,
    type: 1,
  }
}

function fileToItem(f: BaiduPhotoFile): FileItem {
  return {
    name: getFileName(f.path),
    size: f.size,
    is_dir: false,
    modified: unixToIso(f.mtime),
    sign: `file:${f.fsid}`,
    type: calcFileType(getFileName(f.path), false),
    thumb: f.thumburl && f.thumburl.length > 0 ? f.thumburl[0] : "",
    raw_url: "",
  }
}

function albumFileToItem(f: BaiduPhotoAlbumFile): FileItem {
  return {
    name: getFileName(f.path),
    size: f.size,
    is_dir: false,
    modified: unixToIso(f.mtime),
    sign: `albumfile:${f.fsid}|${f.album_id}|${f.tid}|${f.uk}`,
    type: calcFileType(getFileName(f.path), false),
    thumb: f.thumburl && f.thumburl.length > 0 ? f.thumburl[0] : "",
    raw_url: "",
  }
}

/** 解析 sign 得到类型与字段 */
function parseSign(sign: string): {
  kind: "album" | "file" | "albumfile"
  fsid: number
  albumId: string
  tid: number
  uk: number
} {
  if (sign.startsWith("albumfile:")) {
    const [fsid, albumId, tid, uk] = sign.slice("albumfile:".length).split("|")
    return {
      kind: "albumfile",
      fsid: Number(fsid),
      albumId,
      tid: Number(tid),
      uk: Number(uk),
    }
  }
  if (sign.startsWith("album:")) {
    const [albumId, tid] = sign.slice("album:".length).split("|")
    return { kind: "album", fsid: 0, albumId, tid: Number(tid), uk: 0 }
  }
  return {
    kind: "file",
    fsid: Number(sign.slice("file:".length)),
    albumId: "",
    tid: 0,
    uk: 0,
  }
}

export class DriverBaiduPhoto implements StorageDriver {
  private client: ClientBaiduPhoto
  private showType: string
  private albumCache = new Map<string, BaiduPhotoAlbum>()

  constructor(addition: DriverBaiduPhotoAddition) {
    this.client = new ClientBaiduPhoto(addition)
    this.showType = addition.show_type || "root"
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (!clean) {
      // root
      const items: FileItem[] = []
      if (this.showType !== "root_only_file") {
        const albums = await this.client.getAllAlbum()
        for (const a of albums) {
          this.albumCache.set(a.title, a)
          items.push(albumToItem(a))
        }
      }
      if (this.showType !== "root_only_album") {
        const files = await this.client.getAllFile()
        items.push(...files.map(fileToItem))
      }
      return items
    }

    // 相册内
    const album = await this.findAlbum(clean)
    if (!album) throw new Error(`[BaiduPhoto] 相册 '${clean}' 未找到`)
    const files = await this.client.getAllAlbumFile(album.album_id, album.tid)
    return files.map(albumFileToItem)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"
    const parentPath = parts.slice(0, -1).join("/")

    if (!parentPath) {
      // root 层：相册或根文件
      if (this.showType !== "root_only_file") {
        const albums = await this.client.getAllAlbum()
        const album = albums.find((a) => a.title === name)
        if (album) return albumToItem(album)
      }
      if (this.showType !== "root_only_album") {
        const files = await this.client.getAllFile()
        const file = files.find((f) => getFileName(f.path) === name)
        if (file) {
          const item = fileToItem(file)
          try {
            item.raw_url = await this.client.linkFile(file.fsid)
            item.raw_url_headers = this.client.downloadHeaders()
          } catch {
            item.raw_url_error = "[BaiduPhoto] failed to resolve download url"
          }
          return item
        }
      }
    } else {
      // 相册内
      const album = await this.findAlbum(parentPath)
      if (album) {
        const files = await this.client.getAllAlbumFile(
          album.album_id,
          album.tid,
        )
        const file = files.find((f) => getFileName(f.path) === name)
        if (file) {
          const item = albumFileToItem(file)
          try {
            item.raw_url = await this.client.linkAlbumFile(
              file.fsid,
              file.album_id,
              file.tid,
              file.uk,
            )
            item.raw_url_headers = this.client.downloadHeaders()
          } catch {
            item.raw_url_error = "[BaiduPhoto] failed to resolve download url"
          }
          return item
        }
      }
    }

    return {
      name,
      size: 0,
      is_dir: true,
      modified: new Date().toISOString(),
      sign: "",
      type: 1,
      raw_url: "",
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const clean = physicalPath.split("/").filter(Boolean).join("/")
    if (clean) throw new Error("[BaiduPhoto] 相册不支持创建子目录")
    const name = "new_album"
    // 简单处理：mkdir 在 root 创建相册（名字由上层传入时用 name，这里用路径最后一段）
    const album = await this.client.createAlbum(name)
    this.albumCache.clear()
    void album
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    if (entry.kind !== "album") {
      throw new Error("[BaiduPhoto] 仅支持重命名相册")
    }
    await this.client.setAlbumName(entry.albumId, entry.tid, newName)
    this.albumCache.clear()
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const entry = await this.resolveEntry(physicalPath)
    if (entry.kind === "album") {
      await this.client.deleteAlbum(entry.albumId, entry.tid, false)
    } else if (entry.kind === "file") {
      await this.client.deleteFile(entry.fsid)
    } else {
      await this.client.deleteAlbumFile(
        entry.fsid,
        entry.albumId,
        entry.tid,
        entry.uk,
        false,
      )
    }
    this.albumCache.clear()
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(srcPhysical)
    const dstClean = dstDir.split("/").filter(Boolean).join("/")

    // 移动 = copy 到目标 + 删除源（仅相册文件支持）
    if (entry.kind === "albumfile") {
      if (!dstClean) {
        // albumfile -> root
        await this.client.copyAlbumFile(
          entry.fsid,
          entry.albumId,
          entry.tid,
          entry.uk,
        )
      } else {
        // albumfile -> album
        const dstAlbum = await this.findAlbum(dstClean)
        if (!dstAlbum) throw new Error(`[BaiduPhoto] 相册 '${dstClean}' 未找到`)
        const newFsid = await this.client.copyAlbumFile(
          entry.fsid,
          entry.albumId,
          entry.tid,
          entry.uk,
        )
        await this.client.addAlbumFile(dstAlbum.album_id, dstAlbum.tid, newFsid)
      }
      await this.client.deleteAlbumFile(
        entry.fsid,
        entry.albumId,
        entry.tid,
        entry.uk,
        false,
      )
      return
    }
    throw new Error("[BaiduPhoto] 仅相册文件支持移动")
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const entry = await this.resolveEntry(srcPhysical)
    const dstClean = dstDir.split("/").filter(Boolean).join("/")

    if (entry.kind === "file" && dstClean) {
      // root file -> album
      const dstAlbum = await this.findAlbum(dstClean)
      if (!dstAlbum) throw new Error(`[BaiduPhoto] 相册 '${dstClean}' 未找到`)
      await this.client.addAlbumFile(
        dstAlbum.album_id,
        dstAlbum.tid,
        entry.fsid,
      )
      return
    }
    if (entry.kind === "albumfile") {
      const newFsid = await this.client.copyAlbumFile(
        entry.fsid,
        entry.albumId,
        entry.tid,
        entry.uk,
      )
      if (dstClean) {
        const dstAlbum = await this.findAlbum(dstClean)
        if (!dstAlbum) throw new Error(`[BaiduPhoto] 相册 '${dstClean}' 未找到`)
        await this.client.addAlbumFile(dstAlbum.album_id, dstAlbum.tid, newFsid)
      }
      return
    }
    throw new Error("[BaiduPhoto] 不支持该复制操作")
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "file"
    const parentPath = parts.join("/")

    let album: BaiduPhotoAlbum | null = null
    if (parentPath) {
      album = await this.findAlbum(parentPath)
      if (!album) throw new Error(`[BaiduPhoto] 相册 '${parentPath}' 未找到`)
    }
    await this.client.upload(album, name, new Uint8Array(content))
    this.albumCache.clear()
  }

  private async resolveEntry(
    physicalPath: string,
  ): Promise<ReturnType<typeof parseSign>> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1).join("/")

    if (!parentPath) {
      // root 层
      if (this.showType !== "root_only_file") {
        const albums = await this.client.getAllAlbum()
        const album = albums.find((a) => a.title === name)
        if (album) return parseSign(`album:${album.album_id}|${album.tid}`)
      }
      if (this.showType !== "root_only_album") {
        const files = await this.client.getAllFile()
        const file = files.find((f) => getFileName(f.path) === name)
        if (file) return parseSign(`file:${file.fsid}`)
      }
    } else {
      const album = await this.findAlbum(parentPath)
      if (album) {
        const files = await this.client.getAllAlbumFile(
          album.album_id,
          album.tid,
        )
        const file = files.find((f) => getFileName(f.path) === name)
        if (file) {
          return parseSign(
            `albumfile:${file.fsid}|${file.album_id}|${file.tid}|${file.uk}`,
          )
        }
      }
    }
    throw new Error(`[BaiduPhoto] '${name}' not found`)
  }

  /** 通过相册名查找相册（带缓存） */
  private async findAlbum(name: string): Promise<BaiduPhotoAlbum | null> {
    if (this.albumCache.has(name)) return this.albumCache.get(name)!
    const albums = await this.client.getAllAlbum()
    for (const a of albums) this.albumCache.set(a.title, a)
    return this.albumCache.get(name) || null
  }
}
