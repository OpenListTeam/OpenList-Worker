// Baidu Netdisk driver
// Re-ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/baidu_netdisk
// (driver.go — StorageDriver interface implementation)
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { md5 } from "../../pkg/crypto"
import { BaiduAddition, BaiduFile } from "./types"
import {
  BaiduClient,
  ErrUploadIDExpired,
  UPLOAD_FALLBACK_API,
  UPLOAD_RETRY_COUNT,
  UPLOAD_RETRY_MAX_WAIT_MS,
  UPLOAD_RETRY_WAIT_MS,
  normalizeBaiduAddition,
} from "./util"

export { normalizeBaiduAddition } from "./util"

export const ErrBaiduEmptyFilesNotAllowed = new Error(
  "empty files are not allowed by baidu netdisk",
)

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Go fileToObj → FileItem */
function baiduFileToFileItem(f: BaiduFile): FileItem {
  const serverFilename = f.server_filename || basename(f.path)
  const serverCtime = f.server_ctime || f.ctime || 0
  const serverMtime = f.server_mtime || f.mtime || 0
  const isDir = f.isdir === 1
  return {
    name: serverFilename,
    size: f.size || 0,
    is_dir: isDir,
    created: serverCtime
      ? new Date(serverCtime * 1000).toISOString()
      : undefined,
    modified: serverMtime
      ? new Date(serverMtime * 1000).toISOString()
      : new Date().toISOString(),
    sign: String(f.fs_id),
    type: calcFileType(serverFilename, isDir),
    thumb: f.thumbs?.url3 || "",
    raw_url: "",
  }
}

function basename(p: string): string {
  const segs = String(p || "").split("/")
  return segs[segs.length - 1] || ""
}

export class BaiduDriver implements StorageDriver {
  private client: BaiduClient
  private addition: BaiduAddition
  private uploadThread = 3
  private vipType = 0
  /** cache: physical path → { fsId, parentPath, name } for move/copy/rename */
  private pathCache = new Map<string, { fsId: number; parent: string }>()

  constructor(
    addition: BaiduAddition,
    onTokenUpdate?: (tokens: {
      access_token: string
      refresh_token: string
    }) => void,
  ) {
    this.addition = normalizeBaiduAddition(addition)
    this.client = new BaiduClient(this.addition, onTokenUpdate)
  }

  async init(): Promise<void> {
    const a = this.addition
    // upload_thread clamp 1..32 (Go Init)
    let thread = parseInt(a.upload_thread || "3", 10)
    if (thread < 1) thread = 1
    if (thread > 32) thread = 32
    this.uploadThread = thread

    // access_token 是必填项（对齐前端表单 required）
    if (!this.client.accessToken) {
      throw new Error(
        "百度网盘缺少访问令牌 access_token（必填）：请通过 https://api.oplist.org/ 获取后填写。",
      )
    }

    // Validate the token and cache vip type.
    // 对齐 Go 原版 Init：uinfo 失败（token 无效 / 风控）→ 挂载失败并给出明确错误，
    // 而不是静默继续导致后续 list 全部 500。若 token 已失效（errno 20016/-6/111），
    // request() 会自动用 refresh_token 换新后重试。
    this.vipType = await this.client.uinfo()
  }

  private baiduPath(physicalPath: string): string {
    const clean = "/" + String(physicalPath || "").replace(/\/+/g, "/")
    return clean === "/" ? "/" : clean.replace(/\/$/, "")
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await this.client.getFiles(this.baiduPath(physicalPath))
    const items = files.map(baiduFileToFileItem)
    // Cache fsId for file ops (move/copy/rename/remove)
    for (const f of files) {
      this.pathCache.set(f.path, { fsId: f.fs_id, parent: dirname(f.path) })
    }
    return sortFileItems(
      items,
      this.addition.order_by || "name",
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const bp = this.baiduPath(physicalPath)
    if (bp === "/") {
      return {
        name: "/",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    }
    // Find the file by listing its parent (Baidu has no path lookup API)
    const parent = dirname(bp)
    const rawName = basename(bp)
    const decodedName = (() => {
      try {
        return decodeURIComponent(rawName)
      } catch {
        return rawName
      }
    })()
    const files = await this.client.getFiles(parent)
    const file = files.find(
      (f) =>
        f.server_filename === rawName ||
        f.server_filename === decodedName ||
        f.path === bp ||
        String(f.fs_id) === rawName,
    )
    if (!file) {
      throw new Error(`file not found: ${rawName}`)
    }
    this.pathCache.set(file.path, { fsId: file.fs_id, parent })
    const item = baiduFileToFileItem(file)
    if (file.isdir !== 1) {
      try {
        const link = await this.getDownloadLink(file)
        item.raw_url = link.url
        item.raw_url_headers = link.headers
      } catch (e: any) {
        console.warn(
          `[baidu_netdisk] getDownloadLink warning for ${file.server_filename}:`,
          e.message,
        )
      }
    }
    return item
  }

  /** Go Link(): download_api dispatch */
  private async getDownloadLink(file: BaiduFile): Promise<{
    url: string
    headers: Record<string, string>
  }> {
    const api = this.addition.download_api || "official"
    if (api === "crack") {
      return this.client.getCrackLink(file.path)
    }
    if (api === "crack_video") {
      return this.client.getCrackVideoLink(file.path, file.fs_id)
    }
    return this.client.getOfficialLink(file.fs_id)
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    await this.client.create(this.baiduPath(physicalPath), 0, 1, "", "", 0, 0)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    await this.client.manage("rename", [
      { path: this.baiduPath(physicalPath), newname: newName },
    ])
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    await this.client.manage("delete", [this.baiduPath(physicalPath)])
  }

  async move(
    _srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const name = names[0] || basename(srcPhys)
    const dest = this.baiduPath(dstDir)
    await this.client.manage("move", [
      { path: this.baiduPath(srcPhys), dest, newname: name },
    ])
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const name = names[0] || basename(srcPhys)
    const dest = this.baiduPath(dstDir)
    await this.client.manage("copy", [
      { path: this.baiduPath(srcPhys), dest, newname: name },
    ])
  }

  // ---- Upload (Go Put / PutRapid / precreate / uploadSlice) ----

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    // 百度网盘不允许上传空文件
    if (content.length < 1) {
      throw ErrBaiduEmptyFilesNotAllowed
    }

    const streamSize = content.length
    const path = this.baiduPath(physicalPath)
    const name = basename(path)
    const now = Math.floor(Date.now() / 1000)
    const mtime = now
    const ctime = now

    // --- step 0: rapid upload (秒传) ---
    const contentMd5 = md5(content)
    const rapidBlockList = JSON.stringify([contentMd5])
    try {
      await this.client.create(
        path,
        streamSize,
        0,
        "",
        rapidBlockList,
        mtime,
        ctime,
      )
      return // rapid upload succeeded
    } catch {
      // fall through to chunked upload
    }

    // --- step 1: chunk the buffer, compute per-slice md5s ---
    const sliceSize = this.client.getSliceSize(streamSize, this.vipType)
    const count = Math.max(1, Math.ceil(streamSize / sliceSize))
    const lastBlockSize = streamSize % sliceSize || sliceSize
    const blockList: string[] = []
    for (let i = 0; i < count; i++) {
      const byteSize = i === count - 1 ? lastBlockSize : sliceSize
      const slice = content.subarray(i * sliceSize, i * sliceSize + byteSize)
      blockList.push(md5(slice))
    }
    const blockListStr = JSON.stringify(blockList)

    // --- step 2: precreate ---
    let pre = await this.client.precreate(
      path,
      streamSize,
      blockListStr,
      contentMd5,
      md5(content.subarray(0, 256 * 1024)),
      ctime,
      mtime,
    )
    if (pre.return_type === 2 && pre.info) {
      // instant success (md5 matched on server)
      return
    }

    // Upload retry loop (Go: for range 2 + ErrUploadIDExpired restart)
    for (let loop = 0; loop < 2; loop++) {
      // --- step 3: resolve upload domain ---
      let uploadUrl = this.addition.upload_api || UPLOAD_FALLBACK_API
      if (this.addition.use_dynamic_upload_api && pre.uploadid) {
        try {
          uploadUrl = await this.client.requestForUploadUrl(path, pre.uploadid)
        } catch {
          uploadUrl = this.addition.upload_api || UPLOAD_FALLBACK_API
        }
      }

      // --- step 4: upload all missing slices, honoring upload_thread ---
      const parts = pre.block_list || []
      let failed = false
      // Sequential queue with limited concurrency
      let cursor = 0
      const workers = Math.max(1, Math.min(this.uploadThread, parts.length))
      const worker = async () => {
        for (;;) {
          const idx = cursor++
          if (idx >= parts.length) return
          const partseq = parts[idx]
          if (partseq < 0) continue // already uploaded
          const offset = partseq * sliceSize
          const size = partseq + 1 === count ? lastBlockSize : sliceSize
          const slice = content.subarray(offset, offset + size)
          const params: Record<string, string> = {
            method: "upload",
            access_token: this.client.accessToken,
            type: "tmpfile",
            path,
            uploadid: pre.uploadid,
            partseq: String(partseq),
          }
          // retry per-slice (Go retry.Attempts(3), backoff)
          let ok = false
          for (let attempt = 0; attempt < UPLOAD_RETRY_COUNT; attempt++) {
            try {
              await this.client.uploadSlice(
                uploadUrl,
                params,
                name,
                slice,
                (this.addition.upload_timeout || 60) * 1000,
              )
              parts[idx] = -1
              ok = true
              break
            } catch (e) {
              if (e instanceof ErrUploadIDExpired) throw e
              if (attempt < UPLOAD_RETRY_COUNT - 1) {
                await sleep(
                  Math.min(
                    UPLOAD_RETRY_WAIT_MS * Math.pow(2, attempt),
                    UPLOAD_RETRY_MAX_WAIT_MS,
                  ),
                )
              }
            }
          }
          if (!ok) {
            failed = true
            throw new Error(`upload slice ${partseq} failed`)
          }
        }
      }
      try {
        await Promise.all(Array.from({ length: workers }, () => worker()))
        if (failed) throw new Error("upload slice failed")
      } catch (e) {
        if (e instanceof ErrUploadIDExpired) {
          // uploadid expired → restart precreate from scratch (no md5s)
          const newPre = await this.client.precreate(
            path,
            streamSize,
            blockListStr,
            "",
            "",
            ctime,
            mtime,
          )
          if (newPre.return_type === 2 && newPre.info) {
            return
          }
          pre = newPre
          continue
        }
        throw e
      }

      // --- step 5: create file ---
      await this.client.create(
        path,
        streamSize,
        0,
        pre.uploadid,
        blockListStr,
        mtime,
        ctime,
      )
      return
    }
    throw new Error("upload failed after retries")
  }
}

function dirname(p: string): string {
  const idx = p.lastIndexOf("/")
  if (idx <= 0) return "/"
  return p.slice(0, idx)
}
