// Crypt driver — encrypted folder driver, 1:1 port of OpenList Go drivers/crypt
// (which wraps rclone backend/crypt v1.75.2 semantics).
//
// The underlying storage (remote_path) holds rclone-format ciphertexts; names
// follow filename_encryption (off: plaintext + encrypted_suffix, standard:
// EME-AES wide-block, obfuscate: deterministic rotation), contents follow the
// rclone secretbox block format. Files written by older OpenList-Worker
// versions (legacy AES-CTR format) stay readable via magic-based dispatch.
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { encodeDownloadPath } from "../../pkg/path"
import { CryptCipher } from "./cipher"
import type { FileNameEncoding, NameEncryptionMode } from "./names"
import { isRcloneFormat } from "./legacy"
import { calculateUnderlying } from "./data"
import { deobfuscatePassword } from "./obscure"

export interface CryptAddition {
  remote_path: string
  password: string
  salt?: string
  filename_encryption?: "off" | "standard" | "obfuscate"
  /** "true" | "false" (meta select), default "false" */
  directory_name_encryption?: string
  encrypted_suffix?: string
  filename_encoding?: string
  thumbnail?: boolean
  show_hidden?: boolean
  root_folder_path?: string
}

// Go Init: regexp ^[.][A-Za-z0-9-_]{2,}$
const SUFFIX_RE = /^[.][A-Za-z0-9-_]{2,}$/

export class CryptDriver implements StorageDriver {
  private addition: CryptAddition
  private cipher: CryptCipher | null = null
  private remoteDriver: StorageDriver | null = null
  private remoteRoot = "/"
  private showHidden = true

  constructor(addition: CryptAddition) {
    this.addition = addition || ({} as CryptAddition)
  }

  async init(): Promise<void> {
    const password = deobfuscatePassword(this.addition.password || "")
    const salt = deobfuscatePassword(this.addition.salt || "")
    if (!password) {
      throw new Error("password not set in config file")
    }
    const suffix = this.addition.encrypted_suffix ?? ".bin"
    if (!SUFFIX_RE.test(suffix)) {
      throw new Error("EncryptedSuffix is Illegal")
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
    this.showHidden = String(this.addition.show_hidden ?? "true") !== "false"
    this.cipher = new CryptCipher(password, salt, {
      mode: (this.addition.filename_encryption || "off") as NameEncryptionMode,
      dirNameEncrypt: this.addition.directory_name_encryption === "true",
      filenameEncoding: (this.addition.filename_encoding ||
        "base64") as FileNameEncoding,
      encryptedSuffix: suffix,
    })
  }

  private ensureReady(): void {
    if (!this.cipher || !this.remoteDriver) {
      throw new Error("[Crypt] driver not initialized")
    }
  }

  /** 加密后的物理路径 → 底层存储物理路径 */
  private joinRemote(encPath: string): string {
    const base = this.remoteRoot === "/" ? "" : this.remoteRoot
    return (base + encPath).replace(/\/{2,}/g, "/") || "/"
  }

  // util.go guessPath: order the file/dir form tries
  private guessPath(p: string): { firstIsFolder: boolean; secondTry: boolean } {
    if (p.endsWith("/")) return { firstIsFolder: true, secondTry: false }
    const lastSlash = p.lastIndexOf("/")
    if (!p.slice(lastSlash).includes(".")) {
      return { firstIsFolder: true, secondTry: true }
    }
    return { firstIsFolder: false, secondTry: true }
  }

  // util.go encryptPath: dir part via EncryptDirName, file via EncryptFileName
  private encryptPath(p: string, isFolder: boolean): string {
    const names = this.cipher!.names
    if (isFolder) return names.encryptDirName(p)
    const lastSlash = p.lastIndexOf("/")
    const dir = lastSlash === -1 ? "" : p.slice(0, lastSlash + 1)
    const fileName = p.slice(lastSlash + 1)
    const encDir = names.encryptDirName(dir)
    const prefix = encDir === "" || encDir.endsWith("/") ? encDir : encDir + "/"
    return prefix + names.encryptFileName(fileName)
  }

  /**
   * Resolve a plaintext item path to its underlying path (Go Get's two-try
   * guessPath: file form first or folder form first, then the opposite, then
   * the plain path for the virtual-path fallback case).
   */
  private async getRemoteItem(
    physicalPath: string,
  ): Promise<{ item: FileItem; remotePath: string }> {
    const { firstIsFolder, secondTry } = this.guessPath(physicalPath)
    const tryGet = async (isFolder: boolean) => {
      const remotePath = this.joinRemote(
        this.encryptPath(physicalPath, isFolder),
      )
      return { item: await this.remoteDriver!.get("", remotePath), remotePath }
    }
    let firstErr: unknown
    try {
      return await tryGet(firstIsFolder)
    } catch (e) {
      firstErr = e
    }
    if (secondTry) {
      try {
        return await tryGet(!firstIsFolder)
      } catch {
        // fall through to the plain-path attempt below
      }
    }
    try {
      const remotePath = this.joinRemote(physicalPath)
      return { item: await this.remoteDriver!.get("", remotePath), remotePath }
    } catch {
      throw firstErr
    }
  }

  private decryptedItem(item: FileItem, strict: boolean): FileItem | null {
    const names = this.cipher!.names
    let name = item.name
    let size = item.size
    if (item.is_dir) {
      try {
        name = names.decryptDirName(item.name)
      } catch {
        if (strict) return null // List filters illegal entries
      }
    } else {
      try {
        size = this.cipher!.decryptedSize(item.size)
      } catch {
        if (strict) return null
      }
      try {
        name = names.decryptFileName(item.name)
      } catch {
        if (strict) return null
      }
    }
    // hashes/signs of the ciphertext are meaningless; never leak the raw URL
    return {
      ...item,
      name,
      size,
      type: calcFileType(name, item.is_dir),
      sign: "",
      raw_url: "",
      raw_url_headers: undefined,
      hash: undefined,
      hashes: undefined,
      thumb: item.thumb,
    }
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    this.ensureReady()
    const remotePhysical = this.joinRemote(this.encryptPath(physicalPath, true))
    const items = await this.remoteDriver!.list("", remotePhysical)
    const out: FileItem[] = []
    for (const item of items) {
      const dec = this.decryptedItem(item, true)
      if (!dec) continue // filter illegal files
      if (!this.showHidden && dec.name.startsWith(".")) continue
      if (this.addition.thumbnail && virtualPath.startsWith("/")) {
        dec.thumb = await this.thumbnailUrl(virtualPath, dec.name)
      }
      out.push(dec)
    }
    return out
  }

  // Go List: link the pre-generated .thumbnails/<name>.webp for the frontend
  private async thumbnailUrl(
    virtualPath: string,
    name: string,
  ): Promise<string> {
    const base = virtualPath.replace(/\/+$/, "")
    const thumbPath = `${base}/.thumbnails/${name}.webp`
    const raw = `/d${encodeDownloadPath(thumbPath)}`
    try {
      const { appendDownloadSignToRawUrl } = await import("../../pkg/sign")
      // c 为 undefined：list() 无请求上下文，签名模块自行回退进程级密钥
      return await appendDownloadSignToRawUrl(undefined, raw, thumbPath)
    } catch {
      return raw
    }
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    this.ensureReady()
    const { item } = await this.getRemoteItem(physicalPath)
    // Go Get: keep the original name/size if decryption fails
    return this.decryptedItem(item, false)!
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    this.ensureReady()
    await this.remoteDriver!.mkdir(
      "",
      this.joinRemote(this.encryptPath(physicalPath, true)),
    )
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    this.ensureReady()
    const { item, remotePath } = await this.getRemoteItem(physicalPath)
    const names = this.cipher!.names
    const encNew = item.is_dir
      ? names.encryptDirName(newName)
      : names.encryptFileName(newName)
    await this.remoteDriver!.rename("", remotePath, encNew)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    this.ensureReady()
    const { remotePath } = await this.getRemoteItem(physicalPath)
    await this.remoteDriver!.remove("", remotePath, _names)
  }

  async move(
    _srcDir: string,
    _dstDir: string,
    _names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    this.ensureReady()
    const { item, remotePath } = await this.getRemoteItem(srcPhys)
    const encDst = this.joinRemote(this.encryptPath(dstPhys, item.is_dir))
    await this.remoteDriver!.move("", "", [], remotePath, encDst)
  }

  async copy(
    _srcDir: string,
    _dstDir: string,
    _names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    this.ensureReady()
    const { item, remotePath } = await this.getRemoteItem(srcPhys)
    const encDst = this.joinRemote(this.encryptPath(dstPhys, item.is_dir))
    await this.remoteDriver!.copy("", "", [], remotePath, encDst)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Uint8Array,
  ): Promise<void> {
    this.ensureReady()
    const encPath = this.joinRemote(this.encryptPath(physicalPath, false))
    const encrypted = this.cipher!.encryptData(content)
    await this.remoteDriver!.put("", encPath, encrypted)
  }

  /**
   * 解密下载。rclone 格式按 HTTP Range 只拉取命中的密文块（calculateUnderlying
   * 块对齐换算 + decryptBlockSlice），底层不支持区间时回退整文件；
   * legacy AES-CTR 格式整体解密后切片（兼容旧数据）。
   */
  async createReadStream(
    physicalPath: string,
    range?: { start: number; end: number },
  ): Promise<ReadableStream<Uint8Array>> {
    this.ensureReady()
    const encPath = this.joinRemote(this.encryptPath(physicalPath, false))
    const item = await this.remoteDriver!.get("", encPath)

    const head = await this.readUnderlying(encPath, item, 0, 32)
    if (!isRcloneFormat(head)) {
      const all = await this.readUnderlying(
        encPath,
        item,
        0,
        Math.max(item.size, 32),
      )
      const plain = this.cipher!.decryptData(all)
      const start = range?.start ?? 0
      const end = Math.min(range?.end ?? plain.length - 1, plain.length - 1)
      return streamOf(plain.subarray(start, end + 1))
    }

    const start = range?.start ?? 0
    const limit = range ? range.end - range.start + 1 : -1
    const spec = calculateUnderlying(start, limit)
    const uEnd =
      spec.underlyingLimit < 0
        ? item.size
        : Math.min(spec.underlyingOffset + spec.underlyingLimit, item.size)
    const slice = await this.readUnderlying(
      encPath,
      item,
      spec.underlyingOffset,
      Math.max(uEnd - spec.underlyingOffset, 0),
    )
    const initialNonce = head.slice(8, 32)
    const plain = this.cipher!.decryptBlockSlice(
      initialNonce,
      spec.blocks,
      spec.discard,
      limit,
      slice,
    )
    return streamOf(plain)
  }

  /** 底层字节读取：优先底层 createReadStream，回退 raw_url HTTP Range 拉取 */
  private async readUnderlying(
    encPath: string,
    item: FileItem,
    offset: number,
    length: number,
  ): Promise<Uint8Array> {
    const remote = this.remoteDriver! as StorageDriver & {
      createReadStream?: (
        physicalPath: string,
        range?: { start: number; end: number },
      ) => Promise<ReadableStream<Uint8Array>>
    }
    const end = offset + length - 1
    if (typeof remote.createReadStream === "function") {
      return readAll(
        await remote.createReadStream(encPath, { start: offset, end }),
      )
    }
    if (!item.raw_url) {
      throw new Error("[Crypt] 底层驱动未返回下载链接，无法解密下载")
    }
    const res = await fetch(item.raw_url, {
      headers: {
        ...(item.raw_url_headers || {}),
        Range: `bytes=${offset}-${end}`,
      },
    })
    if (!res.ok && res.status !== 206) {
      throw new Error(`[Crypt] 底层下载失败: HTTP ${res.status}`)
    }
    return new Uint8Array(await res.arrayBuffer())
  }
}

function streamOf(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (data.length > 0) controller.enqueue(data)
      controller.close()
    },
  })
}

async function readAll(s: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  const reader = s.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) parts.push(value)
  }
  let n = 0
  for (const p of parts) n += p.length
  const out = new Uint8Array(n)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}
