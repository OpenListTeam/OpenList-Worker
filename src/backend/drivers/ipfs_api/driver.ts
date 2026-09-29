import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { DriverIpfsAddition } from "./types"
import { ClientIpfs } from "./util"

export class DriverIpfs implements StorageDriver {
  private client: ClientIpfs
  private addition: DriverIpfsAddition

  constructor(addition: DriverIpfsAddition) {
    this.addition = addition
    this.client = new ClientIpfs(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private isMfs(): boolean {
    return this.addition.mode === "mfs"
  }

  private fullPath(physicalPath: string): string {
    const root = (this.addition.root_path || "").replace(/^\/+|\/+$/g, "")
    const p = physicalPath.replace(/^\/+/, "")
    if (!root) return "/" + p
    return "/" + (p ? `${root}/${p}` : root)
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const rawPath = this.fullPath(physicalPath)
    const ipfsPath = await this.client.resolveIpfsPath(rawPath)
    const cid = ipfsPath.replace(/^\/ipfs\//, "")
    const resp = await this.client.ls(cid)
    const links = resp.Objects?.[0]?.Links || []
    return links.map((l) => ({
      name: l.Name,
      size: l.Size || 0,
      is_dir: l.Type === 1,
      modified: new Date().toISOString(),
      sign: l.Hash,
      type: calcFileType(l.Name, l.Type === 1),
      raw_url: "",
    }))
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const rawPath = this.fullPath(physicalPath)
    const parts = rawPath.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "root"

    if (this.isMfs()) {
      try {
        const stat = await this.client.filesStat(rawPath)
        const isDir = stat.Type === "directory"
        const item: FileItem = {
          name,
          size: stat.Size || 0,
          is_dir: isDir,
          modified: new Date().toISOString(),
          sign: stat.Hash,
          type: calcFileType(name, isDir),
          raw_url: "",
        }
        if (!isDir) item.raw_url = this.client.downloadUrl(stat.Hash, name)
        return item
      } catch {}
    }

    // ipfs/ipns 模式：通过父目录 list 找到
    const parentPath = "/" + parts.slice(0, -1).join("/")
    try {
      const files = await this.list(_virtualPath, parentPath)
      const entry = files.find((f) => f.name === name)
      if (entry) {
        if (!entry.is_dir) {
          entry.raw_url = this.client.downloadUrl(entry.sign, name)
        }
        return entry
      }
    } catch {}

    // Fallback: 目录
    try {
      await this.client.resolveIpfsPath(rawPath)
      return {
        name,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    } catch {
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
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    if (!this.isMfs()) throw new Error("[IPFS] only write in mfs mode")
    await this.client.filesMkdir(this.fullPath(physicalPath))
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    if (!this.isMfs()) throw new Error("[IPFS] only write in mfs mode")
    const full = this.fullPath(physicalPath)
    const parts = full.split("/").filter(Boolean)
    const dst = "/" + parts.slice(0, -1).join("/") + "/" + newName
    await this.client.filesMv(full, dst)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    if (!this.isMfs()) throw new Error("[IPFS] only write in mfs mode")
    await this.client.filesRm(this.fullPath(physicalPath))
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    if (!this.isMfs()) throw new Error("[IPFS] only write in mfs mode")
    const src = this.fullPath(srcPhysical)
    const dst = this.fullPath(dstDir)
    await this.client.filesMv(src, dst)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    if (!this.isMfs()) throw new Error("[IPFS] only write in mfs mode")
    const srcFull = this.fullPath(srcPhysical)
    const stat = await this.client.filesStat(srcFull)
    const srcIpfs = `/ipfs/${stat.Hash}`
    const dst = this.fullPath(dstDir)
    await this.client.filesCp(srcIpfs, dst)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    if (!this.isMfs()) throw new Error("[IPFS] only write in mfs mode")
    const full = this.fullPath(physicalPath)
    const parts = full.split("/").filter(Boolean)
    const name = parts[parts.length - 1] || "file"
    const hash = await this.client.add(content, name)
    await this.client.filesCp(`/ipfs/${hash}`, full)
  }
}
