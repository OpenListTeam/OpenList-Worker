// USS (又拍云) driver — 通过 UPYUN REST API 访问又拍云对象存储
// 移植自 OpenList Go 版 drivers/uss。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { md5 } from "../../pkg/crypto"
import { UssAddition } from "./types"

function joinPath(a: string, b: string): string {
  const left = String(a || "").replace(/\/+$/, "")
  const right = String(b || "").replace(/^\/+/, "")
  if (!left) return right
  if (!right) return left
  return left + "/" + right
}

export class UssDriver implements StorageDriver {
  private addition: UssAddition
  private authHeader: string
  private apiBase: string

  constructor(addition: UssAddition) {
    this.addition = addition || {}
    const operator = this.addition.operator_name || ""
    const password = this.addition.operator_password || ""
    this.authHeader = `Basic ${btoa(`${operator}:${password}`)}`
    this.apiBase = `https://v0.api.upyun.com/${this.addition.bucket || ""}`
  }

  async init(): Promise<void> {
    if (
      !this.addition.bucket ||
      !this.addition.operator_name ||
      !this.addition.operator_password
    ) {
      throw new Error(
        "[USS] bucket / operator_name / operator_password are required",
      )
    }
  }

  private getKey(physicalPath: string, isDir = false): string {
    let key = String(physicalPath || "/").replace(/^\/+/, "")
    if (isDir && key && !key.endsWith("/")) key += "/"
    return key
  }

  private getDownloadHost(): string {
    let host = this.addition.endpoint || ""
    if (!/^https?:\/\//.test(host)) host = "https://" + host
    return host.replace(/\/+$/, "")
  }

  async list(_v: string, physicalPath: string): Promise<FileItem[]> {
    const prefix = this.getKey(physicalPath, true)
    const url = `${this.apiBase}/${prefix}`
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
      },
    })
    if (!res.ok) throw new Error(`[USS] list failed: HTTP ${res.status}`)
    const text = await res.text()
    const items: FileItem[] = []
    try {
      const arr = JSON.parse(text)
      if (Array.isArray(arr)) {
        for (const f of arr) {
          const name = f.name || f.file_name || ""
          const isDir =
            f.type === "F" || f.is_dir === true || name.endsWith("/")
          items.push({
            name: name.replace(/\/+$/, ""),
            size: f.length || f.size || 0,
            is_dir: isDir,
            modified: f.last_modified
              ? new Date(f.last_modified * 1000).toISOString()
              : new Date().toISOString(),
            sign: "",
            type: calcFileType(name, isDir),
            raw_url: "",
          })
        }
        return sortFileItems(items, "name", "asc")
      }
    } catch {
      // fall through to text line parsing
    }
    // 文本行解析：name<TAB>type<TAB>size<TAB>time
    for (const line of text.split("\n")) {
      const l = line.trim()
      if (!l) continue
      const parts = l.split("\t")
      const name = (parts[0] || "").trim()
      const type = (parts[1] || "").trim()
      const isDir = type === "F" || name.endsWith("/")
      items.push({
        name: name.replace(/\/+$/, ""),
        size: parseInt(parts[2] || "0", 10) || 0,
        is_dir: isDir,
        modified: parts[3]
          ? new Date(parseInt(parts[3], 10) * 1000).toISOString()
          : new Date().toISOString(),
        sign: "",
        type: calcFileType(name, isDir),
        raw_url: "",
      })
    }
    return sortFileItems(items, "name", "asc")
  }

  async get(_v: string, physicalPath: string): Promise<FileItem> {
    const key = this.getKey(physicalPath)
    const name = key.split("/").filter(Boolean).pop() || key
    // 又拍云 Token 防盗链：_upt = MD5(token&expire&/key)[12:20] + expire
    const expireAt =
      Math.floor(Date.now() / 1000) +
      (this.addition.sign_url_expire || 4) * 3600
    const token =
      this.addition.anti_theft_chain_token || this.addition.operator_password
    const signStr = `${token}&${expireAt}&/${key}`
    const upt = md5(signStr).slice(12, 20) + expireAt
    const upd = encodeURIComponent(name)
    const rawUrl = `${this.getDownloadHost()}/${key}?_upd=${upd}&_upt=${upt}`
    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: key,
      type: calcFileType(name, false),
      raw_url: rawUrl,
    }
  }

  async mkdir(_v: string, physicalPath: string): Promise<void> {
    const key = this.getKey(physicalPath, true)
    const res = await fetch(`${this.apiBase}/${key}`, {
      method: "POST",
      headers: { Authorization: this.authHeader, Folder: "true" },
    })
    if (!res.ok) throw new Error(`[USS] mkdir failed: HTTP ${res.status}`)
  }

  async rename(
    _v: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const srcKey = this.getKey(physicalPath)
    const dstKey = joinPath(
      physicalPath.split("/").slice(0, -1).join("/"),
      newName,
    ).replace(/^\/+/, "")
    await this.moveOrCopy(srcKey, dstKey, "move")
  }

  async remove(
    _v: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const key = this.getKey(physicalPath)
    const res = await fetch(`${this.apiBase}/${key}`, {
      method: "DELETE",
      headers: { Authorization: this.authHeader },
    })
    if (!res.ok) throw new Error(`[USS] remove failed: HTTP ${res.status}`)
  }

  async move(
    _s: string,
    _d: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    for (const name of names) {
      const srcKey = joinPath(this.getKey(srcPhys), name)
      const dstKey = joinPath(this.getKey(dstPhys), name)
      await this.moveOrCopy(srcKey, dstKey, "move")
    }
  }

  async copy(
    _s: string,
    _d: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    for (const name of names) {
      const srcKey = joinPath(this.getKey(srcPhys), name)
      const dstKey = joinPath(this.getKey(dstPhys), name)
      await this.moveOrCopy(srcKey, dstKey, "copy")
    }
  }

  async put(_v: string, physicalPath: string, content: Buffer): Promise<void> {
    const key = this.getKey(physicalPath)
    const res = await fetch(`${this.apiBase}/${key}`, {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/octet-stream",
      },
      body: content as any,
    })
    if (!res.ok) throw new Error(`[USS] put failed: HTTP ${res.status}`)
  }

  private async moveOrCopy(
    srcKey: string,
    dstKey: string,
    op: "move" | "copy",
  ): Promise<void> {
    const header = op === "move" ? "X-Upyun-Move-Source" : "X-Upyun-Copy-Source"
    const res = await fetch(`${this.apiBase}/${dstKey}`, {
      method: "PUT",
      headers: { Authorization: this.authHeader, [header]: `/${srcKey}` },
    })
    if (!res.ok) throw new Error(`[USS] ${op} failed: HTTP ${res.status}`)
  }
}
