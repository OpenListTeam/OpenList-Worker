import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { MegaAddition, MegaNodeItem } from "./types"
import { MegaApiClient, MegaApiError } from "./util"

export interface MegaSession {
  sid: string
  masterKey: string
}

export type PersistMegaSession = (session: MegaSession) => Promise<void> | void

export class MegaDriver implements StorageDriver {
  private addition: MegaAddition
  private client: MegaApiClient
  private persistSession?: PersistMegaSession

  constructor(addition: MegaAddition, persistSession?: PersistMegaSession) {
    this.addition = addition
    this.client = new MegaApiClient(addition)
    this.persistSession = persistSession
  }

  async init(): Promise<void> {
    // 复用上次持久化的会话；sid/master key 任缺其一都只能重新登录（缺
    // master key 时虽然能列目录，但节点名和下载密钥都解不开）。
    const cachedSid = this.addition.sid?.trim()
    const cachedKey = this.addition.master_key?.trim()
    let resumed = false
    if (cachedSid && cachedKey) {
      try {
        this.client.restoreSession(cachedSid, cachedKey)
        resumed = true
      } catch (e) {
        // 存储里的会话被截断/格式不对时按未登录处理，不能因此让挂载失败。
        console.warn("[Mega] invalid persisted session, logging in again:", e)
        this.client.clearSession()
      }
    }

    if (resumed) {
      try {
        await this.client.fetchNodes()
        return
      } catch (e) {
        if (!(e instanceof MegaApiError) || e.code !== -15) throw e
        console.warn("[Mega] persisted session expired, logging in again")
        this.client.clearSession()
      }
    }

    await this.client.init()
    const session = this.client.getSession()
    if (!session) return

    this.addition.sid = session.sid
    this.addition.master_key = session.masterKey
    if (!this.persistSession) return
    try {
      await this.persistSession(session)
    } catch (e) {
      // 持久化失败只影响下次冷启动要重新登录，不能因此让本次挂载失败。
      console.warn("[Mega] failed to persist session:", e)
    }
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private resolveNodeByPath(p: string): MegaNodeItem | null {
    const clean = this.cleanPath(p)
    if (clean === "/") {
      return {
        id: this.client.getRootId(),
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        type: 2,
      }
    }

    const parts = clean.split("/").filter(Boolean)
    let currentId = this.client.getRootId()
    let currentNode: MegaNodeItem | null = null

    for (const part of parts) {
      const children = this.client.getChildren(currentId)
      const found = children.find((c) => c.name === part)
      if (!found) return null
      currentNode = found
      currentId = found.id
    }

    return currentNode
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const node = this.resolveNodeByPath(clean)
    if (!node || !node.is_dir) {
      return []
    }

    const children = this.client.getChildren(node.id)
    const items: FileItem[] = children.map((c) => ({
      name: c.name,
      size: c.size || 0,
      is_dir: c.is_dir,
      modified: c.modified || new Date().toISOString(),
      sign: c.id,
      type: calcFileType(c.name, c.is_dir),
      raw_url: "",
    }))

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const node = this.resolveNodeByPath(clean)
    if (!node) {
      throw new Error(`Node not found: ${clean}`)
    }

    let rawUrl = ""
    if (!node.is_dir) {
      try {
        rawUrl = await this.client.getDownloadLink(node.id)
      } catch (e) {
        console.warn("[Mega] failed to get download link in get():", e)
      }
    }

    return {
      name: node.name,
      size: node.size,
      is_dir: node.is_dir,
      modified: node.modified,
      sign: node.id,
      type: calcFileType(node.name, node.is_dir),
      raw_url: rawUrl,
    }
  }

  async link(
    virtualPath: string,
    physicalPath: string,
  ): Promise<{ url: string; headers?: Record<string, string> }> {
    const clean = this.cleanPath(physicalPath)
    const node = this.resolveNodeByPath(clean)
    if (!node || node.is_dir) {
      throw new Error(`Cannot get link for non-file: ${clean}`)
    }

    const url = await this.client.getDownloadLink(node.id)
    return { url }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.substring(0, clean.lastIndexOf("/")) || "/"
    const dirName = clean.substring(clean.lastIndexOf("/") + 1)

    const parentNode = this.resolveNodeByPath(parentPath)
    if (!parentNode || !parentNode.is_dir) {
      throw new Error(`Parent folder not found: ${parentPath}`)
    }

    await this.client.createFolder(dirName, parentNode.id)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const node = this.resolveNodeByPath(this.cleanPath(physicalPath))
    if (!node) {
      throw new Error("Node not found")
    }
    // Rename via attr update
    console.warn(`[Mega] rename ${physicalPath} to ${newName}`)
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // srcPhys/dstPhys 是源/目标项自身的物理路径（op/storage.ts moveItems 逐项调用），
    // 参数即目标项路径，不得再拼 name，否则指向 `<item>/<name>` 导致静默失败。
    const srcPath = this.cleanPath(srcPhys)
    const dstPath = this.cleanPath(dstPhys)
    const dstParentPath = dstPath.substring(0, dstPath.lastIndexOf("/")) || "/"
    const dstNode = this.resolveNodeByPath(dstParentPath)
    if (!dstNode || !dstNode.is_dir) {
      throw new Error("Destination folder not found")
    }
    const srcNode = this.resolveNodeByPath(srcPath)
    if (srcNode) {
      await this.client.moveNode(srcNode.id, dstNode.id)
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    console.warn(
      `[Mega] copy not supported natively from ${srcPhys} to ${dstPhys}`,
    )
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    // physicalPath 是目标项自身的物理路径（op/storage.ts removeItems 逐项调用），
    // 参数即目标项路径，不得再拼 name，否则指向 `<item>/<name>`，resolveNodeByPath
    // 返回 null 后被静默跳过，接口成功但节点仍在。
    const node = this.resolveNodeByPath(this.cleanPath(physicalPath))
    if (node) {
      await this.client.deleteNode(node.id)
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Uint8Array,
  ): Promise<void> {
    console.warn(`[Mega] put for ${physicalPath}`)
  }

  async getDetails(): Promise<{ total_space?: number; used_space?: number }> {
    try {
      const quota = await this.client.getQuota()
      return {
        total_space: quota.total,
        used_space: quota.used,
      }
    } catch {
      return {}
    }
  }
}
