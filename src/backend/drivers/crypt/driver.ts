// Crypt driver — 加密目录驱动
// 移植自 OpenList Go 版 drivers/crypt。
// 将文件内容用 AES-256-CTR 加密后写入底层存储（remote_path 指向另一个挂载的存储）。
// 当前支持 filename_encryption=off（默认）：文件名不加密、仅加 encrypted_suffix 后缀，
// 内容加密（rclone crypt v1 兼容）。standard / obfuscate 文件名加密为后续增强。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { CryptCipher } from "./cipher"

export interface CryptAddition {
  remote_path: string
  password: string
  salt?: string
  filename_encryption?: "off" | "standard" | "obfuscate"
  directory_name_encryption?: string
  encrypted_suffix?: string
  filename_encoding?: string
  thumbnail?: boolean
  show_hidden?: boolean
  root_folder_path?: string
}

export class CryptDriver implements StorageDriver {
  private addition: CryptAddition
  private cipher: CryptCipher | null = null
  private remoteDriver: StorageDriver | null = null
  private remoteRoot = "/"
  private suffix: string

  constructor(addition: CryptAddition) {
    this.addition = addition || {}
    this.suffix = this.addition.encrypted_suffix ?? ".bin"
  }

  async init(): Promise<void> {
    const mode = this.addition.filename_encryption || "off"
    if (mode !== "off") {
      throw new Error(
        `[Crypt] filename_encryption='${mode}' 尚未实现，当前仅支持 off 模式（内容加密、文件名仅加后缀）`,
      )
    }
    // 动态 import，避免与 internal/op/storage.ts 的循环依赖
    const { resolvePath } = await import("../../internal/model/db")
    const { getDriver } = await import("../../internal/op/storage")
    const resolved = await resolvePath(this.addition.remote_path || "/")
    if (resolved.isVirtual || !resolved.storage) {
      throw new Error(
        `[Crypt] remote_path 未匹配到有效存储: ${this.addition.remote_path}`,
      )
    }
    this.remoteRoot = resolved.physical || "/"
    this.remoteDriver = await getDriver(
      resolved.storage.driver,
      resolved.storage,
    )
    this.cipher = await CryptCipher.create(
      this.addition.password,
      this.addition.salt || "",
    )
  }

  private ensureReady(): void {
    if (!this.cipher || !this.remoteDriver) {
      throw new Error("[Crypt] driver not initialized")
    }
  }

  /** crypt 物理路径 → 底层物理路径 */
  private joinRemote(physicalPath: string): string {
    const p = String(physicalPath || "/")
    const base = this.remoteRoot === "/" ? "" : this.remoteRoot
    return (base + p).replace(/\/{2,}/g, "/") || "/"
  }

  private decryptName(name: string): string {
    if (!this.suffix) return name
    return name.endsWith(this.suffix)
      ? name.slice(0, -this.suffix.length)
      : name
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    this.ensureReady()
    const remotePhysical = this.joinRemote(physicalPath)
    const items = await this.remoteDriver!.list("", remotePhysical)
    return items.map((item) => {
      if (item.is_dir) return item
      const name = this.decryptName(item.name)
      return {
        ...item,
        name,
        size: this.cipher!.decryptedSize(item.size),
        type: calcFileType(name, false),
      }
    })
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    this.ensureReady()
    const remotePhysical = this.joinRemote(physicalPath)
    const item = await this.remoteDriver!.get("", remotePhysical)
    if (item.is_dir) return item
    const name = this.decryptName(item.name)
    return {
      ...item,
      name,
      size: this.cipher!.decryptedSize(item.size),
      type: calcFileType(name, false),
      raw_url: "", // 不返回直链，强制 raw.ts 走 createReadStream 解密下载
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    this.ensureReady()
    await this.remoteDriver!.mkdir("", this.joinRemote(physicalPath))
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    this.ensureReady()
    const remotePhysical = this.joinRemote(physicalPath)
    if (await this.isFile(remotePhysical)) {
      await this.remoteDriver!.rename(
        "",
        remotePhysical + this.suffix,
        newName + this.suffix,
      )
    } else {
      await this.remoteDriver!.rename("", remotePhysical, newName)
    }
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    this.ensureReady()
    const remotePhysical = this.joinRemote(physicalPath)
    if (await this.isFile(remotePhysical)) {
      await this.remoteDriver!.remove("", remotePhysical + this.suffix, _names)
    } else {
      await this.remoteDriver!.remove("", remotePhysical, _names)
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhysical: string,
    dstPhysical: string,
  ): Promise<void> {
    this.ensureReady()
    const srcRemote = this.joinRemote(srcPhysical)
    const dstRemote = this.joinRemote(dstPhysical)
    if (await this.isFile(srcRemote)) {
      await this.remoteDriver!.move(
        srcDir,
        dstDir,
        names,
        srcRemote + this.suffix,
        dstRemote + this.suffix,
      )
    } else {
      await this.remoteDriver!.move(srcDir, dstDir, names, srcRemote, dstRemote)
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhysical: string,
    dstPhysical: string,
  ): Promise<void> {
    this.ensureReady()
    const srcRemote = this.joinRemote(srcPhysical)
    const dstRemote = this.joinRemote(dstPhysical)
    if (await this.isFile(srcRemote)) {
      await this.remoteDriver!.copy(
        srcDir,
        dstDir,
        names,
        srcRemote + this.suffix,
        dstRemote + this.suffix,
      )
    } else {
      await this.remoteDriver!.copy(srcDir, dstDir, names, srcRemote, dstRemote)
    }
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    this.ensureReady()
    const remotePhysical = this.joinRemote(physicalPath) + this.suffix
    const encrypted = await this.cipher!.encrypt(new Uint8Array(content))
    await this.remoteDriver!.put("", remotePhysical, Buffer.from(encrypted))
  }

  /**
   * 解密下载：拉取底层密文 → 解密 → 按 range 切片返回。
   * TODO(流式)：当前整体读入内存后一次性解密，超大文件会占用较多内存，
   * 后续可改为 TransformStream 流式 AES-CTR 解密（counter 按 16 字节块递增）。
   */
  async createReadStream(
    physicalPath: string,
    range?: { start: number; end: number },
  ): Promise<ReadableStream<Uint8Array>> {
    this.ensureReady()
    const remotePhysical = this.joinRemote(physicalPath) + this.suffix
    const item = await this.remoteDriver!.get("", remotePhysical)
    if (!item.raw_url) {
      throw new Error("[Crypt] 底层驱动未返回下载链接，无法解密下载")
    }
    const resp = await fetch(item.raw_url)
    if (!resp.ok) {
      throw new Error(`[Crypt] 底层下载失败: HTTP ${resp.status}`)
    }
    const buf = new Uint8Array(await resp.arrayBuffer())
    const plain = await this.cipher!.decrypt(buf)
    const start = range?.start ?? 0
    const end = range?.end ?? plain.length - 1
    const sliced = plain.slice(start, end + 1)
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(sliced)
        controller.close()
      },
    })
  }

  /** 判断底层路径是文件还是目录：文件带 suffix */
  private async isFile(remotePhysical: string): Promise<boolean> {
    if (!this.suffix) return false
    try {
      const item = await this.remoteDriver!.get(
        "",
        remotePhysical + this.suffix,
      )
      return !!item && !item.is_dir
    } catch {
      return false
    }
  }
}
