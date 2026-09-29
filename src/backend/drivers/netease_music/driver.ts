import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverNeteaseMusicAddition, NeteaseSongItem } from "./types"
import { ClientNeteaseMusic } from "./util"

function songToItem(f: NeteaseSongItem): FileItem {
  return {
    name: f.fileName,
    size: f.fileSize,
    is_dir: false,
    modified: f.addTime
      ? new Date(f.addTime).toISOString()
      : new Date().toISOString(),
    sign: String(f.songId),
    type: calcFileType(f.fileName, false),
    thumb: f.simpleSong?.al?.picUrl || "",
    raw_url: "",
  }
}

export class DriverNeteaseMusic implements StorageDriver {
  private client: ClientNeteaseMusic
  private songLimit: number

  constructor(addition: DriverNeteaseMusicAddition) {
    this.client = new ClientNeteaseMusic(addition)
    this.songLimit = addition.song_limit || 200
  }

  async init(): Promise<void> {
    this.client.init()
  }

  async list(): Promise<FileItem[]> {
    const songs = await this.client.getSongObjs(this.songLimit)
    return songs.map((f) => songToItem(f))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || ""
    if (!name) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    }

    const songs = await this.client.getSongObjs(this.songLimit)
    const target = songs.find((f) => f.fileName === name)
    if (target) {
      const item = songToItem(target)
      try {
        item.raw_url = await this.client.getSongLink(item.sign)
      } catch {
        item.raw_url_error = "[NeteaseMusic] failed to resolve song url"
      }
      return item
    }

    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: "",
      type: 0,
      raw_url: "",
    }
  }

  async mkdir(): Promise<void> {
    throw new Error("[NeteaseMusic] mkdir not supported")
  }

  async rename(): Promise<void> {
    throw new Error("[NeteaseMusic] rename not supported")
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1]
    const songs = await this.client.getSongObjs(this.songLimit)
    const target = songs.find((f) => f.fileName === name)
    if (!target) throw new Error(`[NeteaseMusic] '${name}' not found`)
    await this.client.removeSong(String(target.songId))
  }

  async move(): Promise<void> {
    throw new Error("[NeteaseMusic] move not supported")
  }

  async copy(): Promise<void> {
    throw new Error("[NeteaseMusic] copy not supported")
  }

  async put(): Promise<void> {
    throw new Error(
      "[NeteaseMusic] upload not supported in stateless environment",
    )
  }
}
