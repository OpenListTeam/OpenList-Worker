// Cloudflare R2 存储驱动。
//
// 与 OpenList Go 版 drivers/r2 的差异：
//   - Go 版只有 S3 兼容 API（endpoint + key/secret）；
//   - 本驱动额外支持 **Workers R2 bucket binding 直连**（无需 API Token），
//     这是 Workers 平台上的首选接入方式：
//       wrangler.jsonc → "r2_buckets": [{ "binding": "R2", "bucket_name": "..." }]
//       admin 表单 → 存储 addition.bucket_binding = "R2"
//     未配置 binding（或运行在非 Workers 运行时）时自动回退 S3 兼容 API，
//     两条路径共用同一套目录语义（占位对象、root_folder_path、目录递归）。
//
// 直链策略（重要，决定了下载走哪条链路）：
//   - 配了 custom_host（R2 公开域名 / 自定义域名）→ 直接拼公开直链，浏览器直连；
//   - api 模式 → 复用 S3 的预签名直链（HttpOnly 服务端代理不需要，浏览器直接 GET）；
//   - binding 模式 → **返回空 raw_url 触发服务端流式下载**（raw.ts 的
//     createReadStream 分支）。原因：Workers 的 R2 *binding* 不提供
//     createPresignedUrl（预签名 URL 是 S3 接口的能力），binding 唯一能拿到
//     字节的官方途径就是 get()。绑定公开域名可让直链回归 302 路径。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { getEnvCtx } from "../../internal/model/db"
import { S3Driver, normalizeS3Addition } from "../s3/driver"
import {
  getBaseName,
  getDirName,
  getKey,
  getPlaceholderName,
  isSubPath,
  joinPath,
} from "../s3/util"
import { R2Addition, R2BucketLike, R2ObjectLike } from "./types"

/** binding 缺省绑定名的探测顺序（admin 未显式填写时） */
export const R2_DEFAULT_BINDING_NAMES = [
  "R2",
  "R2_BUCKET",
  "CF_R2",
  "OPENLIST_R2",
] as const

/** 判断对象是否符合 R2 bucket binding 的方法形态 */
function isR2BucketLike(value: any): boolean {
  if (!value || typeof value !== "object") return false
  try {
    return (
      typeof value.list === "function" &&
      typeof value.get === "function" &&
      typeof value.put === "function" &&
      typeof value.head === "function" &&
      typeof value.delete === "function"
    )
  } catch {
    return false
  }
}

/**
 * 解析 R2 bucket binding。
 *
 * env 与 globalThis 必须分别探测（与 KV 驱动同理）：部分平台会把 binding
 * 注入为全局标识符，而 CF Workers 只在 env 上。两者都不能命中时回退到请求级
 * env 上下文（getEnvCtx，由 index.ts 中间件写入）—— 驱动层 list/get/put
 * 拿不到当前请求的 env 参数，这是 binding 能被解析到的关键兜底。
 */
export function resolveR2Bucket(
  bindingName?: string,
  env?: any,
): { bucket: R2BucketLike | null; tried: string[] } {
  const g = globalThis as any
  const ctxEnv = (() => {
    try {
      return getEnvCtx()
    } catch {
      return null
    }
  })()
  const sources: any[] = [env, ctxEnv, g]
  const names = bindingName?.trim()
    ? [bindingName.trim()]
    : [...R2_DEFAULT_BINDING_NAMES]

  const tried: string[] = []
  for (const name of names) {
    tried.push(name)
    for (const source of sources) {
      if (!source) continue
      try {
        const value = source[name]
        if (isR2BucketLike(value)) return { bucket: value, tried }
      } catch {
        // 异常 getter：视为未绑定，继续探测
      }
    }
  }
  return { bucket: null, tried }
}

export function normalizeR2Addition(a: any): R2Addition {
  const norm = { ...(a || {}) } as any
  norm.bucket_binding = (norm.bucket_binding || "").trim()
  norm.mode = (norm.mode || "auto").toString().trim().toLowerCase()
  norm.account_id = (norm.account_id || "").trim()
  norm.bucket = (norm.bucket || "").trim()
  norm.endpoint = (norm.endpoint || "").trim()
  norm.region = (norm.region || "").trim() || "auto"
  norm.access_key_id = (norm.access_key_id || "").trim()
  norm.secret_access_key = (norm.secret_access_key || "").trim()
  norm.session_token = (norm.session_token || "").trim()
  norm.root_folder_path = (norm.root_folder_path || "/").trim()
  if (!norm.root_folder_path.startsWith("/")) {
    norm.root_folder_path = "/" + norm.root_folder_path
  }
  norm.placeholder = (norm.placeholder || "").trim()
  norm.sign_url_expire = Number(norm.sign_url_expire) || 4
  norm.order_by = norm.order_by || "name"
  norm.order_direction = norm.order_direction || "asc"
  return norm as R2Addition
}

/**
 * 该存储当前能否签发预签名「直传」URL（供 server 层计算 `direct_upload_tools`）。
 *
 * 只有 api 模式可以：Workers 的 R2 绑定不提供预签名能力，binding 模式下
 * `getDirectUploadInfo()` 会明确报错。判定必须与 `R2Driver.resolveMode()`
 * 一致（能解析到绑定 → binding；否则显式 mode=binding 仍算 binding；其余 → api），
 * 否则前端会拿到一个必然失败的直传入口。
 */
export function r2CanSignDirectUpload(addition: any, env?: any): boolean {
  const norm = normalizeR2Addition(addition)
  if (resolveR2Bucket(norm.bucket_binding || "", env).bucket) return false
  return String(norm.mode || "auto").toLowerCase() !== "binding"
}

export class R2Driver implements StorageDriver {
  private addition: R2Addition
  /** binding 不可用时的 S3 兼容回退实现 */
  private apiFallback: S3Driver | null = null

  constructor(addition: R2Addition) {
    this.addition = normalizeR2Addition(addition)
  }

  /**
   * 解析绑定：请求级上下文（getEnvCtx，由 index.ts 中间件按请求注入）
   * → globalThis（部分平台注入为全局标识符）。
   *
   * 驱动实例是跨请求缓存的，因此**不能**把某个请求的 env / 绑定对象存进实例
   * （会随 isolate 生命周期滞留）；每次操作都从当前请求上下文重新解析。
   */
  private resolveBucket(): { bucket: R2BucketLike | null; tried: string[] } {
    return resolveR2Bucket(this.bindingName())
  }

  private bindingName(): string {
    return this.addition.bucket_binding || ""
  }

  private bindingError(tried: string[]): Error {
    return new Error(
      `[R2] R2 bucket binding not found (tried: ${tried.join(", ")}). ` +
        `Declare it in wrangler.jsonc as ` +
        `"r2_buckets": [{ "binding": "R2", "bucket_name": "your-bucket" }], ` +
        `then set the storage's "bucket_binding" to the same name. ` +
        `Alternatively clear "bucket_binding" to use the S3-compatible API (key/secret).`,
    )
  }

  private bucket(): R2BucketLike {
    const { bucket, tried } = this.resolveBucket()
    if (bucket) return bucket
    throw this.bindingError(tried)
  }

  /**
   * 当前走哪条路径。
   *
   * - 能解析到 binding → binding（binding 优先，零密钥）
   * - 显式 mode=binding 但解析不到 → 仍走 binding，由 bucket() 抛出带指引的错误
   *   （不静默回退，避免用户以为在用 binding，实际走了别的凭据）
   * - mode=api / auto 且无法解析 binding → S3 兼容 API
   */
  private resolveMode(): "binding" | "api" {
    const { bucket } = this.resolveBucket()
    if (bucket) return "binding"
    if (this.addition.mode === "binding") return "binding"
    return "api"
  }

  /** S3 兼容 API 回退（endpoint 可由 account_id 推导） */
  private api(): S3Driver {
    if (!this.apiFallback) {
      const a = this.addition
      let endpoint = a.endpoint || ""
      if (!endpoint && a.account_id) {
        endpoint = `https://${a.account_id}.r2.cloudflarestorage.com`
      }
      this.apiFallback = new S3Driver(
        normalizeS3Addition({
          ...a,
          endpoint,
          region: a.region || "auto",
          // R2 的 ListObjectsV2 覆盖完整（v1 亦可用，v2 更省一轮 marker）
          list_object_version: "v2",
          // 目录占位与 root_folder_path 语义与 S3 完全一致
        }),
        "Cloudflare R2",
      )
    }
    return this.apiFallback
  }

  private requireApiConfig(): void {
    const a = this.addition
    if (!a.bucket) {
      throw new Error(
        "[R2] api 模式缺少 bucket（绑定 bucket_binding 后可用 binding 直连，无需 bucket 名）",
      )
    }
    if (!a.endpoint && !a.account_id) {
      throw new Error(
        "[R2] api 模式缺少 endpoint：填写 account_id（自动推导 endpoint）或显式 endpoint",
      )
    }
    if (!a.access_key_id || !a.secret_access_key) {
      throw new Error(
        "[R2] api 模式缺少 access_key_id / secret_access_key（R2 控制台 → Manage R2 API Tokens 创建）",
      )
    }
  }

  /**
   * 初始化只做「配置侧检查」，一律不抛错：
   *
   * 1. binding 可能在「尚未注入请求级 env」的时机才可用（后台 load_all、
   *    存储保存流程），此处误判会让存储被标成 error / 直接禁用；
   * 2. api 配置缺失同理——新建存储时管理员往往是先保存再补密钥。
   *
   * 真正的失败在 list/get/put 时抛出（错误消息带可操作的修复指引）。
   */
  async init(): Promise<void> {
    if (this.resolveMode() === "binding") {
      const { bucket, tried } = this.resolveBucket()
      if (!bucket) console.warn(this.bindingError(tried).message)
      return
    }
    try {
      this.requireApiConfig()
    } catch (e: any) {
      console.warn(e?.message || String(e))
    }
  }

  private rootPath(): string {
    return this.addition.root_folder_path || "/"
  }

  /** 虚拟物理路径 → 桶内 key（带根目录前缀） */
  private remoteKey(physicalPath: string): string {
    const root = this.rootPath()
    let combined = physicalPath || "/"
    if (root !== "/" && !isSubPath(root, combined)) {
      combined = joinPath(root, combined)
    }
    return getKey(combined, false)
  }

  private isPlaceholder(name: string): boolean {
    const placeholderName = getPlaceholderName(this.addition.placeholder)
    return (
      name === placeholderName ||
      (!!this.addition.placeholder && name === this.addition.placeholder)
    )
  }

  private modifiedOf(obj: R2ObjectLike): string {
    const uploaded = obj?.uploaded
    if (uploaded instanceof Date) return uploaded.toISOString()
    if (typeof uploaded === "string" && uploaded) return uploaded
    return new Date().toISOString()
  }

  /**
   * 列前缀下的全部对象与子目录（跟随 truncated/cursor 翻页）。
   *
   * ⚠️ 单页上限 1000 且「设置了 include 时可能少于 limit」，因此翻页与否
   * 只看 truncated，不能用返回条数推断（云flare 文档明确警告）。
   */
  private async listPrefix(prefixKey: string): Promise<{
    objects: R2ObjectLike[]
    dirs: string[]
  }> {
    const bucket = this.bucket()
    const prefix = prefixKey ? getKey(prefixKey, true) : ""
    const objects: R2ObjectLike[] = []
    const dirs: string[] = []
    let cursor: string | undefined

    for (;;) {
      const page: any = await bucket.list({
        prefix,
        delimiter: "/",
        ...(cursor ? { cursor } : {}),
      })
      for (const obj of page?.objects || []) {
        if (obj?.key) objects.push(obj)
      }
      for (const p of page?.delimitedPrefixes || []) {
        const name = p.replace(/\/+$/, "").split("/").filter(Boolean).pop()
        if (name && !dirs.includes(name)) dirs.push(name)
      }
      if (!page?.truncated) break
      if (!page?.cursor || page.cursor === cursor) break
      cursor = page.cursor
    }

    return { objects, dirs }
  }

  /** 该 key 下是否存在对象（判断「目录」是否存在） */
  private async probePrefix(key: string): Promise<boolean> {
    const bucket = this.bucket()
    const page: any = await bucket.list({
      prefix: key ? getKey(key, true) : "",
      limit: 1,
    })
    return (page?.objects?.length || 0) > 0
  }

  /** 自定义域名直链（R2 公开域名 / CNAME） */
  private customHostUrl(key: string): string {
    const a = this.addition
    const hostSplit = (a.custom_host || "").split("://")
    let scheme = "https"
    let host = a.custom_host
    if (
      hostSplit.length === 2 &&
      (hostSplit[0] === "http" || hostSplit[0] === "https")
    ) {
      scheme = hostSplit[0]
      host = hostSplit[1].replace(/\/+$/, "")
    }
    let pathPart = `/${getKey(key, false)}`
    if (a.remove_bucket && a.bucket && pathPart.startsWith(`/${a.bucket}`)) {
      pathPart = pathPart.substring(`/${a.bucket}`.length) || "/"
    }
    return `${scheme}://${host}${pathPart}`
  }

  /**
   * 生成直链。
   *
   * binding 模式返回空串 = 交给 raw.ts 走服务端流式下载（见文件头注释）；
   * 配了 custom_host 时优先返回公开直链。
   *
   * 注：api 模式不在这里换链——S3Driver 的 list()/get() 内部已经完成预签名，
   * R2 在 api 模式下整体委托给 S3Driver（见各方法开头的分支）。
   */
  private objectRawUrl(key: string): { url: string } {
    if (this.addition.custom_host) {
      return { url: this.customHostUrl(key) }
    }
    return { url: "" }
  }

  private toFileItem(obj: R2ObjectLike, name: string): FileItem {
    return {
      name,
      size: Number(obj.size) || 0,
      is_dir: false,
      modified: this.modifiedOf(obj),
      sign: obj.etag || obj.key,
      type: calcFileType(name, false),
      thumb: "",
      raw_url: "",
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().list(_virtualPath, physicalPath)
    }

    const prefixKey = this.remoteKey(physicalPath)
    const { objects, dirs } = await this.listPrefix(prefixKey)
    const dirSet = new Set(dirs)
    const items: FileItem[] = []

    for (const dirName of dirs) {
      items.push({
        name: dirName,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: joinPath(prefixKey, dirName),
        type: 1,
      })
    }

    const prefix = prefixKey ? getKey(prefixKey, true) : ""
    for (const obj of objects) {
      const rel = prefix
        ? obj.key.startsWith(prefix)
          ? obj.key.substring(prefix.length)
          : getBaseName(obj.key)
        : obj.key
      if (!rel || rel.includes("/")) continue
      if (this.isPlaceholder(rel)) continue
      if (dirSet.has(rel)) continue
      items.push(this.withRawUrl(this.toFileItem(obj, rel), obj.key))
    }

    return sortFileItems(
      items,
      this.addition.order_by || "name",
      this.addition.order_direction || "asc",
    )
  }

  /** 补直链（无 custom_host 时为空 → raw.ts 触发服务端流式下载） */
  private withRawUrl(item: FileItem, key: string): FileItem {
    const link = this.objectRawUrl(key)
    if (link.url) item.raw_url = link.url
    return item
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().get(_virtualPath, physicalPath)
    }

    const key = this.remoteKey(physicalPath)
    if (!key) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
      }
    }

    const head = await this.bucket().head(key)
    if (head) {
      const item = this.toFileItem(head, getBaseName(key))
      return await this.withRawUrl(item, key)
    }

    const isDir = await this.probePrefix(key)
    if (isDir) {
      return {
        name: getBaseName(key),
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: key,
        type: 1,
      }
    }
    throw new Error(`[R2] object not found: ${physicalPath}`)
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().mkdir(_virtualPath, physicalPath)
    }
    const key = this.remoteKey(physicalPath)
    const placeholderKey = joinPath(
      key,
      getPlaceholderName(this.addition.placeholder),
    )
    await this.bucket().put(placeholderKey, new Uint8Array(0))
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().rename(_virtualPath, physicalPath, newName)
    }
    const oldKey = this.remoteKey(physicalPath)
    const newKey = joinPath(getDirName(oldKey), newName)
    await this.moveKey(oldKey, newKey)
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().move(srcDir, dstDir, names, srcPhys, dstPhys)
    }
    // srcPhys/dstPhys 已是源/目标项自身的物理路径，不得再拼 name
    await this.moveKey(this.remoteKey(srcPhys), this.remoteKey(dstPhys))
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().copy(srcDir, dstDir, names, srcPhys, dstPhys)
    }
    const srcKey = this.remoteKey(srcPhys)
    const dstKey = this.remoteKey(dstPhys)
    const head = await this.bucket().head(srcKey)
    if (head) {
      await this.copyObject(srcKey, dstKey)
      return
    }
    await this.copyDirRecursive(srcKey, dstKey)
  }

  /** 文件 key 改名/移动（文件 → copy+delete；目录 → 递归） */
  private async moveKey(srcKey: string, dstKey: string): Promise<void> {
    if (!srcKey) throw new Error("[R2] cannot move the bucket root")
    const head = await this.bucket().head(srcKey)
    if (head) {
      await this.copyObject(srcKey, dstKey)
      await this.bucket().delete(srcKey)
      return
    }
    await this.copyDirRecursive(srcKey, dstKey)
    await this.removeDirRecursive(srcKey)
  }

  private async copyObject(srcKey: string, dstKey: string): Promise<void> {
    const bucket = this.bucket()
    const obj = await bucket.get(srcKey)
    if (!obj) throw new Error(`[R2] object not found: ${srcKey}`)
    const body = await obj.arrayBuffer()
    await bucket.put(dstKey, body, {
      httpMetadata: { contentType: obj.httpMetadata?.contentType || undefined },
    })
  }

  private async copyDirRecursive(
    srcKey: string,
    dstKey: string,
  ): Promise<void> {
    const bucket = this.bucket()
    const srcPrefix = getKey(srcKey, true)
    const dstPrefix = getKey(dstKey, true)
    const { objects } = await this.listPrefix(srcKey)
    for (const obj of objects) {
      const rel = obj.key.startsWith(srcPrefix)
        ? obj.key.substring(srcPrefix.length)
        : getBaseName(obj.key)
      if (!rel) continue
      const fresh = await bucket.get(obj.key)
      if (!fresh) continue
      const body = await fresh.arrayBuffer()
      await bucket.put(dstPrefix + rel, body, {
        httpMetadata: {
          contentType: fresh.httpMetadata?.contentType || undefined,
        },
      })
    }
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().remove(_virtualPath, physicalPath, names)
    }
    // physicalPath 已是目标项自身路径（op/storage.ts removeItems 逐个调用）
    const key = this.remoteKey(physicalPath)
    if (!key) return
    const head = await this.bucket().head(key)
    if (head) {
      await this.bucket().delete(key)
      return
    }
    await this.removeDirRecursive(key)
  }

  private async removeDirRecursive(dirKey: string): Promise<void> {
    const bucket = this.bucket()
    const { objects } = await this.listPrefix(dirKey)
    const keys = objects.map((o) => o.key)
    // R2 delete 支持批量数组（单次上限 1000）
    for (let i = 0; i < keys.length; i += 1000) {
      await bucket.delete(keys.slice(i, i + 1000))
    }
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer | Uint8Array,
  ): Promise<void> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().put(_virtualPath, physicalPath, content as any)
    }
    const key = this.remoteKey(physicalPath)
    // 拷贝到独立 ArrayBuffer：Node 的 Buffer 可能是池化视图（底层 slab 很大），
    // 直接交给 workerd 会连带整块内存，且部分运行时对 Buffer 类型不接受。
    const bytes = new Uint8Array(content)
    await this.bucket().put(key, bytes, {
      httpMetadata: { contentType: contentTypeOf(getBaseName(key)) },
    })
  }

  /**
   * 服务端流式读取（raw.ts 的 createReadStream 分支）：
   * binding 模式的下载主路径，支持 Range（offset/length 语义，与 S3 的
   * start/end 不同，必须转换）。
   */
  async createReadStream(
    physicalPath: string,
    range?: { start: number; end: number },
  ): Promise<ReadableStream<Uint8Array>> {
    if (this.resolveMode() === "api") {
      throw new Error(
        "[R2] api 模式请使用预签名直链下载（raw_url 已签发）；服务端流式下载仅 binding 模式支持",
      )
    }
    const key = this.remoteKey(physicalPath)
    const bucket = this.bucket()
    const obj = range
      ? await bucket.get(key, {
          range: {
            offset: range.start,
            length: range.end - range.start + 1,
          },
        })
      : await bucket.get(key)
    if (!obj) throw new Error(`[R2] object not found: ${physicalPath}`)
    if (obj.body) return obj.body
    // 极老运行时无 body 字段：整体读入内存后返回
    const buf = await obj.arrayBuffer()
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(buf))
        controller.close()
      },
    })
  }

  async other(method: string, path: string, body?: any): Promise<any> {
    if (method === "direct_upload" || method === "get_direct_upload_info") {
      const fileName = body?.name || body?.fileName || getBaseName(path)
      const dstDir = getDirName(path)
      return await this.getDirectUploadInfo(dstDir, fileName)
    }
    if (this.resolveMode() === "api") {
      return await this.api().other(method, path, body)
    }
    throw new Error(`Unsupported method ${method}`)
  }

  async getDirectUploadInfo(
    dstDir: string,
    fileName: string,
  ): Promise<{ upload_url: string; method: string }> {
    if (this.resolveMode() === "api") {
      this.requireApiConfig()
      return await this.api().getDirectUploadInfo(dstDir, fileName)
    }
    // binding 无法签发 PUT 预签名 URL（Workers 绑定不暴露 createPresignedUrl）
    throw new Error(
      "[R2] 直传需要在存储配置里填写 account_id + access_key_id / secret_access_key" +
        "（S3 兼容模式），binding 模式不提供预签名直传 URL",
    )
  }

  drop(): void {
    this.apiFallback?.drop?.()
  }
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
  bmp: "image/bmp",
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  json: "application/json",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  html: "text/html; charset=utf-8",
  xml: "application/xml",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  "7z": "application/x-7z-compressed",
  rar: "application/vnd.rar",
}

function contentTypeOf(fileName: string): string {
  const ext = (fileName.split(".").pop() || "").toLowerCase()
  return CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream"
}
