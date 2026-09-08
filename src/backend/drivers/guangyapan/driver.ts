// GuangYaPan (光亚盘) driver
// Ported from: OpenList-Backends/drivers/guangyapan
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { hmacSha1Base64 } from "../../pkg/crypto"
import { GuangYaPanAddition, GypFileItem } from "./types"
import {
  GuangYaPanClient,
  normalizeDeviceID,
  normalizePhoneE164,
  randomDeviceID,
  unixOrNow,
} from "./util"

export function normalizeGuangYaPanAddition(a: any): GuangYaPanAddition {
  const norm = { ...(a || {}) } as any
  norm.client_id = (norm.client_id || "").trim()
  norm.device_id = normalizeDeviceID(norm.device_id || "")
  if (!norm.device_id) norm.device_id = randomDeviceID()
  norm.device_sign = (norm.device_sign || "").trim() || "wdi10." + norm.device_id
  norm.page_size = Number(norm.page_size || 100)
  norm.order_by = Number(norm.order_by === undefined ? 3 : norm.order_by)
  norm.sort_type = Number(norm.sort_type === undefined ? 1 : norm.sort_type)
  norm.root_folder_path = (norm.root_folder_path || "").trim()
  norm.access_token = (norm.access_token || "").trim()
  norm.refresh_token = (norm.refresh_token || "").trim()
  norm.phone_number = normalizePhoneE164(norm.phone_number || "")
  return norm as GuangYaPanAddition
}

function gypFileToItem(f: GypFileItem): FileItem {
  const isDir = f.resType === 2
  return {
    name: f.fileName,
    size: isDir ? 0 : f.fileSize || 0,
    is_dir: isDir,
    modified: unixOrNow(f.utime),
    created: unixOrNow(f.ctime),
    sign: f.fileId,
    type: calcFileType(f.fileName, isDir),
  }
}

function normalizeOSSEndpoint(endpoint: string, bucket: string): string {
  let ep = (endpoint || "").trim()
  if (!ep) return ep
  if (!ep.startsWith("http://") && !ep.startsWith("https://")) ep = "https://" + ep
  let u: URL
  try {
    u = new URL(ep)
  } catch {
    return ep
  }
  let host = u.host
  if (bucket && host.startsWith(bucket + ".")) host = host.slice(bucket.length + 1)
  u.host = host
  return u.toString().replace(/\/+$/, "")
}

export class GuangYaPanDriver implements StorageDriver {
  private addition: GuangYaPanAddition
  private client: GuangYaPanClient
  private idCache = new Map<string, string>()

  constructor(addition: any, onTokensChanged?: (a: string, r: string) => Promise<void>) {
    this.addition = normalizeGuangYaPanAddition(addition)
    this.client = new GuangYaPanClient(this.addition)
    this.client.onTokensChanged = onTokensChanged
  }

  async init(): Promise<void> {
    if (!this.addition.client_id) throw new Error("client_id is required")

    if (this.addition.access_token) {
      try {
        await this.client.validateToken()
        return
      } catch {
        this.addition.access_token = ""
      }
    }
    if (this.addition.refresh_token) {
      await this.client.refresh()
      await this.client.validateToken()
      return
    }
    throw new Error(
      "login failed: provide a valid access_token, or refresh_token, or phone_number + verify_code",
    )
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private joinPath(parent: string, name: string): string {
    return parent === "/" ? `/${name}` : `${parent}/${name}`
  }

  private async resolveId(path: string): Promise<string> {
    const clean = this.cleanPath(path)
    if (clean === "/") return "" // 光亚盘根目录 ID 为空串
    const cached = this.idCache.get(clean)
    if (cached) return cached

    const segs = clean.split("/").filter(Boolean)
    let curId = ""
    let curPath = "/"
    for (const seg of segs) {
      const resp = await this.client.getFileList(
        curId,
        this.addition.page_size,
        this.addition.order_by,
        this.addition.sort_type,
      )
      const found = resp.data?.list?.find(
        (i) => i.fileName === seg && i.resType === 2,
      )
      if (!found) throw new Error(`folder not found: ${seg}`)
      curId = found.fileId
      curPath = this.joinPath(curPath, seg)
      this.idCache.set(curPath, curId)
    }
    return curId
  }

  /** 解析任意条目（文件或文件夹）的 ID，末段不限定为文件夹 */
  private async resolveItemId(path: string): Promise<string> {
    const clean = this.cleanPath(path)
    if (clean === "/") return ""
    const cached = this.idCache.get(clean)
    if (cached) return cached

    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const name = clean.split("/").pop() || ""
    const parentId = await this.resolveId(parentPath)
    const resp = await this.client.getFileList(
      parentId,
      this.addition.page_size,
      this.addition.order_by,
      this.addition.sort_type,
    )
    const found = resp.data?.list?.find((i) => i.fileName === name)
    if (!found) throw new Error(`item not found: ${name}`)
    this.idCache.set(clean, found.fileId)
    return found.fileId
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const id = await this.resolveId(physicalPath)
    const clean = this.cleanPath(physicalPath)
    const result: FileItem[] = []

    for (let page = 0; page < 10000; page++) {
      const resp = await this.client.getFileList(
        id,
        this.addition.page_size,
        this.addition.order_by,
        this.addition.sort_type,
      )
      const list = resp.data?.list || []
      for (const f of list) {
        this.idCache.set(this.joinPath(clean, f.fileName), f.fileId)
        result.push(gypFileToItem(f))
      }
      if (list.length < this.addition.page_size) break
      if (resp.data?.total > 0 && result.length >= resp.data.total) break
    }

    return sortFileItems(result, "name", "asc")
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"
    if (clean === "/") {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
      }
    }

    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const parentId = await this.resolveId(parentPath)
    const resp = await this.client.getFileList(
      parentId,
      this.addition.page_size,
      this.addition.order_by,
      this.addition.sort_type,
    )
    const found = resp.data?.list?.find((i) => i.fileName === name)
    if (!found) throw new Error("file not found")

    const isDir = found.resType === 2
    let rawUrl = ""
    if (!isDir) {
      rawUrl = await this.client.getDownloadURL(found.fileId)
    }
    this.idCache.set(clean, found.fileId)

    return {
      ...gypFileToItem(found),
      raw_url: rawUrl,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const dirName = clean.split("/").pop() || ""
    const parentId = await this.resolveId(parentPath)
    await this.client.postAPI("/nd.bizuserres.s/v1/file/create_dir", {
      parentId,
      dirName,
    })
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const id = await this.resolveItemId(physicalPath)
    await this.client.postAPI("/nd.bizuserres.s/v1/file/rename", {
      fileId: id,
      newName,
    })
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcId = await this.resolveItemId(srcPhys)
    const dstParent =
      this.cleanPath(dstPhys).split("/").slice(0, -1).join("/") || "/"
    const dstId = await this.resolveId(dstParent)
    const out = await this.client.postAPI<{ data?: { taskId?: string } }>(
      "/nd.bizuserres.s/v1/file/move_file",
      { fileIds: [srcId], parentId: dstId },
    )
    if (out?.data?.taskId) await this.client.waitTaskDone(out.data.taskId)
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcId = await this.resolveItemId(srcPhys)
    const dstParent =
      this.cleanPath(dstPhys).split("/").slice(0, -1).join("/") || "/"
    const dstId = await this.resolveId(dstParent)
    const out = await this.client.postAPI<{ data?: { taskId?: string } }>(
      "/nd.bizuserres.s/v1/file/copy_file",
      { fileIds: [srcId], parentId: dstId },
    )
    if (out?.data?.taskId) await this.client.waitTaskDone(out.data.taskId)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const id = await this.resolveItemId(physicalPath)
    const out = await this.client.postAPI<{ data?: { taskId?: string } }>(
      "/nd.bizuserres.s/v1/file/delete_file",
      { fileIds: [id] },
    )
    if (out?.data?.taskId) await this.client.waitTaskDone(out.data.taskId)
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const fileName = clean.split("/").pop() || "upload"
    const parentId = await this.resolveId(parentPath)

    const bytes = new Uint8Array(content)
    const md5sum = GuangYaPanClient.md5(bytes)

    const { data: token, alreadyDone } = await this.client.getUploadToken(
      parentId,
      fileName,
      bytes.length,
      md5sum,
    )
    const taskId = token?.taskId || ""

    // 秒传命中：无需真实上传，直接等待后端完成登记
    if (alreadyDone) {
      if (!taskId) throw new Error("instant upload returns empty task id")
      await this.client.waitUploadTaskInfo(taskId)
      return
    }

    if (
      !token.objectPath ||
      !token.bucketName ||
      !token.endPoint ||
      !token.accessKeyID ||
      !token.secretAccessKey
    ) {
      throw new Error("upload token is incomplete")
    }

    // 单次 PUT 上传（<5GB）；大文件分片上传未在本移植版本中实现
    const endpoint = normalizeOSSEndpoint(token.endPoint, token.bucketName)
    const uploadURL = `https://${token.bucketName}.${new URL(endpoint).host}/${token.objectPath.replace(/^\/+/, "")}`

    const dateStr = new Date().toUTCString()
    const contentType = "application/octet-stream"
    const ossHeaders = token.sessionToken
      ? `x-oss-security-token:${token.sessionToken}\n`
      : ""
    const canonicalizedResource = `/${token.bucketName}/${token.objectPath.replace(/^\/+/, "")}`
    const stringToSign =
      `PUT\n\n${contentType}\n${dateStr}\n${ossHeaders}${canonicalizedResource}`
    const signature = await hmacSha1Base64(stringToSign, token.secretAccessKey)
    const authorization = `OSS ${token.accessKeyID}:${signature}`

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      Date: dateStr,
      Authorization: authorization,
    }
    if (token.sessionToken) {
      headers["x-oss-security-token"] = token.sessionToken
    }

    const res = await fetch(uploadURL, {
      method: "PUT",
      headers,
      body: bytes,
    })
    if (!res.ok) {
      throw new Error(`OSS upload failed: ${res.status} ${await res.text()}`)
    }

    if (taskId) await this.client.waitUploadTaskInfo(taskId)
  }
}
