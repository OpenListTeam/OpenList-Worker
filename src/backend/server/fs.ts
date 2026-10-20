import { Hono } from "hono"
import {
  flushPendingDriverState,
  listItems,
  getItem,
  makeDirectory,
  renameItem,
  removeItems,
  moveItems,
  copyItems,
  putItem,
  getDriver,
} from "../internal/op/storage"
import { resolveShare } from "../internal/op/share"
import { resolvePath } from "../internal/model/db"
import { getUserFromContext } from "./middlewares"
import {
  can,
  canCopy,
  canMove,
  canRemove,
  canRename,
  canWrite,
  getActualPath,
  isAdmin,
  isWithinUserRoot,
  PermissionBit,
} from "../pkg/permission"
import {
  getNearestMeta,
  canAccess,
  getReadme,
  getHeader,
  canWriteContentBypassUserPerms,
  isHidden,
  canWrite as canWriteMeta,
} from "../pkg/meta"
import type { Meta } from "../pkg/meta"
import {
  getSignPolicy,
  signDownloadPath,
  isEncryptPath,
  getSignExpiresIn,
} from "../pkg/sign"
import { safeErrorMessage } from "../pkg/errs"
import { encodeDownloadPath } from "../pkg/path"
import { search } from "../internal/op/search"
import {
  getDisableIndex,
  resolveCacheExpiration,
} from "../internal/driver/storageopts"
import { parseZip, extractZipEntry, ZipArchive } from "../internal/archive/zip"
import { assertSafeUrl, getTrustedHosts } from "../pkg/http"
import { invalidatePaths } from "../internal/cache"
import { seedRouter } from "./seed"
import { r2CanSignDirectUpload } from "../drivers/r2/driver"

/**
 * 该路径所属存储是否禁止目录列表（对齐 Go handles.FsList 的 DisableIndex 判断）。
 * 存储无法解析时返回 false，避免误伤虚拟目录。
 */
async function isStorageIndexDisabled(reqPath: string): Promise<boolean> {
  try {
    const resolved = await resolvePath(reqPath)
    if (!resolved?.storage) return false
    return getDisableIndex(resolved.storage)
  } catch {
    return false
  }
}
import {
  clampChunkSize,
  deleteSession,
  findReceivingSession,
  getSession,
  MultipartSession,
  newUploadId,
  pruneSessions,
  putSession,
  snapshot as mpSnapshot,
} from "../internal/upload/multipart"

export const fsRouter = new Hono()
fsRouter.route("/seed", seedRouter)

/**
 * 请求级存储上下文（`env` + `waitUntil`）。
 *
 * 关键约定：**`env` 必须始终传递**，与 executionCtx 是否可用无关。
 *
 * 缓存（`CACHE_DRIVER=db`）与 singleflight（`SINGLEFLIGHT=db`）都依赖它来解析
 * 后端：拿不到 `env` 时 `getStorageBackend(undefined)` 会解析成**内存驱动**，
 * 而业务数据仍走全局 env ctx 的持久化后端 —— 缓存与数据库被静默拆到两个后端，
 * 表现为「列表看似命中缓存（内容陈旧），但持久层里一条缓存键都没有、
 * `/cache/status` 计数恒为 0、`/cache/clear` 永远 removed=0」。
 *
 * 真正依赖 executionCtx 的只有 `waitUntil`；缺失时降级为同步等待
 * （见 `scheduleStoragePersistence`），业务语义不变。
 */
let warnedMissingExecutionCtx = false
const getStorageRequestContext = (c: any) => {
  const env = c?.env
  let waitUntil: ((promise: Promise<unknown>) => void) | undefined
  try {
    const executionCtx = c?.executionCtx
    if (executionCtx && typeof executionCtx.waitUntil === "function") {
      waitUntil = (promise: Promise<unknown>) => executionCtx.waitUntil(promise)
    }
  } catch {
    // executionCtx 可能是访问即抛错的对象：按「不可用」处理，但 env 照常传递
    waitUntil = undefined
  }
  if (!waitUntil && !warnedMissingExecutionCtx) {
    warnedMissingExecutionCtx = true
    console.warn(
      "[fs] executionCtx.waitUntil is unavailable in this runtime; deferred " +
        "storage persistence will be awaited inline instead of being scheduled " +
        "in the background.",
    )
  }
  if (!env && !waitUntil) return undefined
  return { ...(waitUntil ? { waitUntil } : {}), env }
}

// ---- 写操作权限校验 ----
// 游客（未登录 / 无凭证 / token 无效）一律 403，普通用户需具备
// WRITE_CONTENT 权限位，管理员放行。修复「任何人可匿名上传/删除文件」
// 的安全漏洞，同时让 /fs/list 的 write 字段如实反映请求者身份。
const permissionDenied = (c: any) =>
  c.json({ code: 403, message: "Permission denied", data: null }, 403)

/**
 * 目录级写权限（meta.write_users）的**执行点**。
 *
 * 安全不变量：`meta.write_users` 是「该目录只允许这些用户写入」的白名单，
 * 它必须在**真正写入时**校验，而非只在 `/fs/list` 的响应里回填 `write` 字段。
 *
 * 历史缺陷：该白名单只影响界面提示（列表返回 write=false），写接口从不复查，
 * 因此「界面显示禁止写入」与「实际能写入」不一致——用户看到只读提示，但上传
 * 依然成功（实测：write_users=[其他用户] 时 /fs/put 仍返回 200 并创建文件）。
 *
 * 返回 true 表示应当拒绝。管理员放行（与 pkg/meta 的约定一致）。
 */
async function deniedByMetaWriteAcl(
  c: any,
  user: any,
  targetPaths: string[],
): Promise<boolean> {
  if (isAdmin(user)) return false
  for (const p of targetPaths) {
    let meta: Meta | null = null
    try {
      meta = await getNearestMeta(p, c.env)
    } catch {
      meta = null
    }
    if (!meta) continue
    if (!canWriteMeta(user, meta, p)) return true
  }
  return false
}

/**
 * 归档读取的 meta 访问校验：与 `/fs/list`、`/fs/get` 共用同一套判定
 * （密码保护 + read_users 白名单）。
 *
 * 安全不变量：归档接口读的是**同一份文件内容**，必须与直连下载受同样的
 * 访问控制。历史缺陷：归档列表直接 `driver.get() → fetch()`，完全跳过 meta
 * 判定——实测「直连被密码保护而 401」的文件，归档列表却能读出其条目。
 */
async function deniedByMetaReadAcl(
  c: any,
  user: any,
  targetPath: string,
  password: string,
): Promise<boolean> {
  if (isAdmin(user)) return false
  let meta: Meta | null = null
  try {
    meta = await getNearestMeta(targetPath, c.env)
  } catch {
    meta = null
  }
  if (!meta) return false
  return !canAccess(user, meta, targetPath, password || "")
}

/**
 * 归档条目相对路径的安全化。
 *
 * 安全不变量：ZIP 条目名是**不可信输入**，只能被当作「只能向下展开的相对路径」。
 * 历史缺陷：条目名只做了反斜杠转换，`../bob/x` 与目标目录拼接后会被
 * resolvePath 归一化，从而把文件写到解压目录（乃至用户根）之外。
 *
 * 返回 null 表示该条目应被跳过（绝对路径 / 盘符 / 含 `..` / 空）。
 */
function safeArchiveEntryPath(rel: string): string | null {
  const cleaned = String(rel || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
  if (!cleaned || cleaned.includes("\0")) return null
  if (/^[A-Za-z]:/.test(cleaned)) return null
  const parts = cleaned.split("/").filter(Boolean)
  if (parts.length === 0) return null
  if (parts.some((p) => p === "." || p === "..")) return null
  return parts.join("/")
}

// 上传大小限制统一实现在 pkg/upload-limit.ts（S3 网关复用同一份，
// 避免出现「/fs/put 有上限、S3 PutObject 无上限」的不对称）。
import {
  getUploadSizeLimit,
  readBodyWithinLimit,
  tooLargeResponse,
} from "../pkg/upload-limit"

// 分享请求错误统一出口：
// - 密码错误 → 403，前端据此弹出提取码输入框（State.NeedPassword）
// - 其他（不存在/禁用/过期/超次数/为空）→ 400，前端显示友好提示
const shareErrorResponse = (c: any, error?: string) => {
  const isWrongPassword = error === "wrong password"
  const msg = error || "share error"
  return c.json(
    {
      code: isWrongPassword ? 403 : 400,
      message: msg,
      data: null,
    },
    isWrongPassword ? 403 : 400,
  )
}

// GET sub-directories of a path (used by FolderTree in metas/storages editors)
fsRouter.post("/dirs", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const user = await getUserFromContext(c)
  const rawPath = body.path || "/"
  const isShare = rawPath.startsWith("/@s")
  if (!isShare && (!user || user.disabled)) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const requestContext = getStorageRequestContext(c)
  // 对齐 Go handles.FsDirs：force_root（以全局根为起点）只对管理员开放
  if (body.force_root && !isAdmin(user)) {
    return c.json({ code: 403, message: "Permission denied", data: null }, 403)
  }
  let reqPath = rawPath
  if (!body.force_root) {
    reqPath = getActualPath(user, reqPath)
  }
  try {
    // Share path support for completeness
    if (reqPath.startsWith("/@s")) {
      const shareRes = await resolveShare(reqPath, body.password || "", c.env)
      if (!shareRes.ok) {
        return shareErrorResponse(c, shareRes.error)
      }
      if (shareRes.virtualList) {
        const dirs = []
        for (const f of shareRes.share.files || []) {
          try {
            const { item } = await getItem(f, requestContext)
            if (item.is_dir) {
              const segs = String(f).split("/").filter(Boolean)
              dirs.push({
                name: segs[segs.length - 1] || f,
                modified: item.modified || new Date().toISOString(),
              })
            }
          } catch {
            // skip unlistable share items
          }
        }
        return c.json({ code: 200, message: "success", data: dirs })
      }
      const { content } = await listItems(shareRes.realPath!, requestContext)
      const dirs = content
        .filter((item: any) => item.is_dir)
        .map((item: any) => ({
          name: item.name,
          modified: item.modified || new Date().toISOString(),
        }))
      return c.json({ code: 200, message: "success", data: dirs })
    }

    // 对齐 Go handles.FsDirs：目录树接口必须与 /fs/list 受同一套 meta 判定
    // （密码保护 + read_users 白名单）。历史缺陷：只列目录不做任何校验，
    // 任何登录用户都能直接枚举出受保护目录的结构。
    const dirMeta = await getNearestMeta(reqPath, c.env)
    if (!canAccess(user, dirMeta, reqPath, body.password || "")) {
      return c.json(
        {
          code: 403,
          message: "password is incorrect or you have no permission",
          data: null,
        },
        403,
      )
    }
    const { content } = await listItems(reqPath, requestContext)
    const dirs = content
      .filter((item: any) => item.is_dir)
      .map((item: any) => ({
        name: item.name,
        modified: item.modified || new Date().toISOString(),
      }))
    return c.json({ code: 200, message: "success", data: dirs })
  } catch (err: any) {
    return c.json({ code: 500, message: safeErrorMessage(err), data: null })
  }
})

fsRouter.post("/list", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const user = await getUserFromContext(c)
  const isShare = (body.path || "/").startsWith("/@s")
  if (!isShare && (!user || user.disabled)) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const requestContext = getStorageRequestContext(c)
  const reqPath = getActualPath(user, body.path || "/")
  const page = parseInt(body.page, 10) || 1
  const perPage = parseInt(body.per_page, 10) || 0

  const paginateItems = <T>(items: T[]) => {
    const total = items.length
    if (perPage <= 0) {
      return { content: items, total }
    }
    const pageNum = Math.max(1, page)
    const start = (pageNum - 1) * perPage
    const end = start + perPage
    return {
      content: items.slice(start, end),
      total,
    }
  }

  try {
    // Share path: /@s/{shareId}/...
    if (reqPath.startsWith("/@s")) {
      const shareRes = await resolveShare(reqPath, body.password || "", c.env)
      if (!shareRes.ok) {
        return shareErrorResponse(c, shareRes.error)
      }

      // Multi-file share root → virtual list of the shared items
      if (shareRes.virtualList) {
        const items = []
        for (const f of shareRes.share.files || []) {
          const segs = String(f).split("/").filter(Boolean)
          const name = segs[segs.length - 1] || f
          try {
            const { item } = await getItem(f, requestContext)
            items.push({
              name,
              size: item.size || 0,
              is_dir: !!item.is_dir,
              modified: item.modified || new Date().toISOString(),
              sign: "",
              thumb: item.thumb || "",
              type: item.type ?? 0,
            })
          } catch {
            // If getItem failed, probe by listing — a listable path is a folder
            try {
              await listItems(f, requestContext)
              items.push({
                name,
                size: 0,
                is_dir: true,
                modified: new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 1,
              })
            } catch {
              items.push({
                name,
                size: 0,
                is_dir: false,
                modified: new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 0,
              })
            }
          }
        }
        const { content, total } = paginateItems(items)
        return c.json({
          code: 200,
          message: "success",
          data: {
            content,
            total,
            readme: shareRes.share.readme || "",
            header: shareRes.share.header || "",
            write: false,
            write_content_bypass: false,
            provider: "Share",
          },
        })
      }

      // Mapped to a real path — fall through to normal listing
      const { content, provider } = await listItems(
        shareRes.realPath!,
        requestContext,
      )
      const normalized = content.map((item: any) => ({
        name: item.name,
        size: item.size,
        is_dir: item.is_dir,
        created: item.created || item.modified || new Date().toISOString(),
        modified: item.modified || new Date().toISOString(),
        sign: item.sign || "",
        thumb: item.thumb || "",
        type: item.type ?? 0,
      }))
      const { content: pagedContent, total } = paginateItems(normalized)
      return c.json({
        code: 200,
        message: "success",
        data: {
          content: pagedContent,
          total,
          readme: shareRes.share.readme || "",
          header: shareRes.share.header || "",
          write: false,
          write_content_bypass: false,
          provider,
        },
      })
    }

    // 普通路径：应用 meta 权限（密码 + read_users + readme/header + hide 过滤）
    const meta = await getNearestMeta(reqPath, c.env)
    if (!canAccess(user, meta, reqPath, body.password || "")) {
      return c.json(
        { code: 403, message: "Access denied (wrong password or not in read_users)", data: null },
        403,
      )
    }

    // disable_index（对齐 Go handles.FsList）：该存储禁止目录列表时，
    // 即使有读权限也不返回内容，避免分享单文件后被逐级浏览整个存储。
    if (await isStorageIndexDisabled(reqPath)) {
      return c.json(
        { code: 403, message: "Index is disabled for this storage", data: null },
        403,
      )
    }

    const { content, provider, storage } = await listItems(
      reqPath,
      requestContext,
    )
    // write：用户写权限 + meta.write_users 白名单（对齐 Go common.CanWrite）
    const writable = canWrite(user) && canWriteMeta(user, meta, reqPath)
    const writeContentBypass = canWriteContentBypassUserPerms(meta, reqPath)
    // 下载签名（对齐 Go server/common.Sign + handles.isEncrypt）：
    //   目录不签名；sign_all（或 TS 扩展的 link_expiration）开启、
    //   或该目录被设了密码的 meta 覆盖时，为文件项签发 HMAC 签名。
    // 必须与 raw.ts 的 needDownloadSign 保持对称，否则直链会验签失败。
    // 注意：不能回退 item.sign —— sign 由本层统一签发，驱动不参与
    //（历史上 webdav/autoindex 驱动曾把远程路径/URL 塞进该字段）。
    const signPolicy = await getSignPolicy(c)
    const encrypt = await isEncryptPath(c, reqPath)
    const signNeeded = signPolicy.enabled || encrypt
    const signExpiresIn = signNeeded
      ? signPolicy.expiresIn || (await getSignExpiresIn(c))
      : 0
    // Normalize each item to the full Obj shape expected by the frontend
    const normalized = await Promise.all(
      content
        .filter((item: any) => !isHidden(meta, reqPath, item.name))
        .map(async (item: any) => {
          const fullPath = `${reqPath}/${item.name}`.replace(/\/{2,}/g, "/")
          const sign =
            !item.is_dir && signNeeded
              ? await signDownloadPath(c, fullPath, signExpiresIn)
              : ""
          // hashinfo / hash_info：从驱动透传哈希信息（Go ObjResp 字段）
          // 驱动不支持时为空字符串/空对象，保持与 Go 响应结构兼容
          const hashInfoStr: string = (item as any).hashinfo || (item as any).hash_info_str || ""
          const hashInfo: Record<string, string> = (item as any).hash_info || {}
          return {
            name: item.name,
            size: item.size,
            is_dir: item.is_dir,
            created: item.created || item.modified || new Date().toISOString(),
            modified: item.modified || new Date().toISOString(),
            sign,
            thumb: item.thumb || "",
            type: item.type ?? 0,
            hashinfo: hashInfoStr,
            hash_info: hashInfo,
          }
        }),
    )

    let storagePageSize = 0
    if (storage) {
      storagePageSize = parseInt(storage.page_size, 10) || 0
      if (!storagePageSize && storage.addition) {
        try {
          const addition =
            typeof storage.addition === "string"
              ? JSON.parse(storage.addition)
              : storage.addition
          storagePageSize = parseInt(addition?.page_size, 10) || 0
        } catch {}
      }
    }

    const effectivePerPage =
      perPage > 0 ? perPage : storagePageSize > 0 ? storagePageSize : 0
    const paginateStorageItems = <T>(items: T[]) => {
      const total = items.length
      if (effectivePerPage <= 0) {
        return { content: items, total }
      }
      const pageNum = Math.max(1, page)
      const start = (pageNum - 1) * effectivePerPage
      const end = start + effectivePerPage
      return {
        content: items.slice(start, end),
        total,
      }
    }

    // direct_upload_tools：从 storage 透传支持的直传工具列表（对齐 Go FsListResp）
    // storage 不支持时为空数组，保持与 Go 响应结构兼容
    const directUploadTools: string[] = (() => {
      if (!storage) return []
      const tools: string[] = []
      const driver = (storage as any)
      // S3 系列驱动支持 s3_presigned 直传。
      // 必须按「归一化后的驱动名」判断（小写 + 去非字母数字）：驱动名里可能含
      // 空格（如 "Cloudflare R2"），拿原始字符串做 `^` 锚定正则会漏判。
      const normDriverName = String(driver.driver || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
      if (
        /^(s3|minio|cos|oss|r2|b2|cfr2|cloudflarer2)/.test(normDriverName)
      ) {
        // Cloudflare R2 的例外：binding 模式没有预签名能力，直传必然失败，
        // 因此只在解析不到绑定（即实际会走 S3 兼容 API）时才宣告该工具。
        let canSignDirectUpload = true
        if (/^(r2|cfr2|cloudflarer2)$/.test(normDriverName)) {
          let addition: any = driver.addition
          try {
            if (typeof addition === "string") addition = JSON.parse(addition)
          } catch {
            addition = {}
          }
          canSignDirectUpload = r2CanSignDirectUpload(addition, c.env)
        }
        if (canSignDirectUpload) tools.push("s3_presigned")
      }
      // 驱动自声明的 direct_upload_tools 字段（驱动扩展点）
      if (Array.isArray(driver.direct_upload_tools)) {
        for (const t of driver.direct_upload_tools) {
          if (!tools.includes(t)) tools.push(t)
        }
      }
      return tools
    })()

    const { content: pagedContent, total } = paginateStorageItems(normalized)
    // cache_expiration：由 custom_cache_policies 按路径覆盖后得出（分钟）。
    // 对齐 Go 的路径级缓存策略；前端/上层可据此决定该目录的列表缓存时长。
    const cacheExpiration = storage
      ? resolveCacheExpiration(storage, reqPath)
      : 0 // Virtual directories must not be cached; a cached Virtual result
          // would persist after the real storage comes online, causing the
          // 'always shows root / Virtual provider' symptom for subsequent requests.
    return c.json({
      code: 200,
      message: "success",
      data: {
        content: pagedContent,
        total,
        readme: getReadme(meta, reqPath),
        header: getHeader(meta, reqPath),
        write: writable,
        write_content_bypass: writeContentBypass,
        provider,
        direct_upload_tools: directUploadTools,
        page_size: effectivePerPage > 0 ? effectivePerPage : undefined,
        cache_expiration: cacheExpiration,
      },
    })
  } catch (err: any) {
    return c.json({ code: 500, message: safeErrorMessage(err), data: null })
  }
})

fsRouter.post("/get", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const user = await getUserFromContext(c)
  const isShare = (body.path || "/").startsWith("/@s")
  if (!isShare && (!user || user.disabled)) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const requestContext = getStorageRequestContext(c)
  const reqPath = getActualPath(user, body.path || "/")
  try {
    // Share path: /@s/{shareId}/...
    if (reqPath.startsWith("/@s")) {
      const shareRes = await resolveShare(reqPath, body.password || "", c.env)
      if (!shareRes.ok) {
        return shareErrorResponse(c, shareRes.error)
      }

      // Multi-file share root: report as a virtual folder so the frontend lists it
      if (shareRes.virtualList) {
        const shareId = reqPath.split("/").filter(Boolean)[1] || "share"
        return c.json({
          code: 200,
          message: "success",
          data: {
            name: shareId,
            size: 0,
            is_dir: true,
            modified: new Date().toISOString(),
            sign: "",
            thumb: "",
            type: 1,
            raw_url: "",
            readme: shareRes.share.readme || "",
            header: shareRes.share.header || "",
            provider: "Share",
            related: [],
            write: false,
            write_content_bypass: false,
          },
        })
      }

      // Mapped to a real path — get with share-aware raw_url (/sd/{shareId}...)
      const shareId = reqPath.split("/").filter(Boolean)[1] || ""
      const { item, provider } = await getItem(
        shareRes.realPath!,
        requestContext,
      )
      const subPath = reqPath.replace(/^\/@s\/[^/]+/, "")
      return c.json({
        code: 200,
        message: "success",
        data: {
          name: item.name,
          size: item.size,
          is_dir: item.is_dir,
          created:
            (item as any).created || item.modified || new Date().toISOString(),
          modified: item.modified,
          sign: item.sign || "",
          thumb: (item as any).thumb || "",
          type: item.type ?? 0,
          raw_url: `/api/sd/${shareId}${subPath}`,
          readme: shareRes.share.readme || "",
          header: shareRes.share.header || "",
          provider,
          related: [],
          write: false,
          write_content_bypass: false,
        },
      })
    }

    // 普通路径：应用 meta 权限（密码 + read_users + readme/header）
    const meta = await getNearestMeta(reqPath, c.env)
    if (!canAccess(user, meta, reqPath, body.password || "")) {
      return c.json(
        { code: 403, message: "Access denied (wrong password or not in read_users)", data: null },
        403,
      )
    }

    const { item, provider, rawUrl } = await getItem(reqPath, requestContext)
    // 与 /fs/list 同源逻辑，见上方注释
    const signPolicy = await getSignPolicy(c)
    const signNeeded = signPolicy.enabled || (await isEncryptPath(c, reqPath))
    const sign =
      !item.is_dir && signNeeded
        ? await signDownloadPath(
            c,
            reqPath,
            signPolicy.expiresIn || (await getSignExpiresIn(c)),
          )
        : ""
    // raw_url 必须自带签名（Issue #66）。
    //
    // 前端把本接口的 raw_url 直接当下载地址使用：预览页的「下载」按钮就是
    // <a href={raw_url}>（pages/home/previews/download.tsx），图片/视频预览也
    // 直接把它塞进 <img>/<video> 的 src，都不会再自己拼 ?sign=。而 raw_url
    // 指向的是需要验签的 /p 或 /d 端点（前缀由 getItem 按 canProxy() 选定）：
    // sign_all、存储级 enable_sign、密码 meta 覆盖任一命中时，缺签名一律
    // 401 "sign verify failed"——外部表现就是「预览页能正常打开，一点下载就 401」。
    //
    // 对齐 Go server/handles/fsread.go FsGet：
    //   if isEncrypt(meta, reqPath) || setting.GetBool(conf.SignAll) {
    //       query = "?sign=" + sign.Sign(reqPath)
    //   }
    //   rawURL = fmt.Sprintf("%s/p%s%s", common.GetApiUrl(c), ..., query)
    const rawUrlWithSign =
      sign && rawUrl && !/[?&]sign=/.test(rawUrl)
        ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}sign=${sign}`
        : rawUrl
    const writable = canWrite(user) && canWriteMeta(user, meta, reqPath)
    const writeContentBypass = canWriteContentBypassUserPerms(meta, reqPath)

    // Related：查找同目录中文件名前缀相同的文件（字幕 .srt/.ass/.vtt、NFO 等）
    // 对齐 Go server/handles/fsread.go getRelated 逻辑：
    //   stem = 去掉最后一个扩展名的文件名；related = 同目录中 stem 相同的其他文件
    let related: any[] = []
    if (!item.is_dir) {
      try {
        const parentPath = reqPath.includes("/")
          ? reqPath.slice(0, reqPath.lastIndexOf("/")) || "/"
          : "/"
        const stem = item.name.includes(".")
          ? item.name.slice(0, item.name.lastIndexOf("."))
          : item.name
        const { content: siblings } = await listItems(parentPath, requestContext)
        related = siblings
          .filter((s: any) => {
            if (s.name === item.name || s.is_dir) return false
            const sStem = s.name.includes(".")
              ? s.name.slice(0, s.name.lastIndexOf("."))
              : s.name
            return sStem === stem
          })
          .map((s: any) => ({
            name: s.name,
            size: s.size,
            is_dir: false,
            modified: s.modified || new Date().toISOString(),
            sign: "",
            thumb: (s as any).thumb || "",
            type: s.type ?? 0,
          }))
      } catch {
        // 获取关联文件失败不影响主文件响应
        related = []
      }
    }

    return c.json({
      code: 200,
      message: "success",
      data: {
        name: item.name,
        size: item.size,
        is_dir: item.is_dir,
        created:
          (item as any).created || item.modified || new Date().toISOString(),
        modified: item.modified,
        sign,
        thumb: (item as any).thumb || "",
        type: item.type ?? 0,
        raw_url: rawUrlWithSign,
        readme: getReadme(meta, reqPath),
        header: getHeader(meta, reqPath),
        provider,
        related,
        write: writable,
        write_content_bypass: writeContentBypass,
      },
    })
  } catch (err: any) {
    return c.json({ code: 500, message: safeErrorMessage(err), data: null })
  }
})

function validateFileName(name: any): string {
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Invalid or empty file name")
  }
  const clean = name.trim()
  if (
    clean === "." ||
    clean === ".." ||
    clean.includes("/") ||
    clean.includes("\\") ||
    clean.includes("\0")
  ) {
    throw new Error(`Illegal file name '${clean}'`)
  }
  return clean
}

function validateDirPath(p: any): string {
  if (typeof p !== "string") {
    throw new Error("Path must be a string")
  }
  if (p.includes("\0")) {
    throw new Error("Path contains illegal null byte")
  }
  return p
}

fsRouter.post("/mkdir", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
  const body = await c.req.json().catch(() => ({}))
  const rawPath = body.path || "/"
  try {
    validateDirPath(rawPath)
  } catch (e: any) {
    return c.json({ code: 400, message: e.message, data: null }, 400)
  }
  const reqPath = getActualPath(user, rawPath)
  if (await deniedByMetaWriteAcl(c, user, [reqPath])) return permissionDenied(c)
  const requestContext = getStorageRequestContext(c)
  try {
    await makeDirectory(reqPath, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/rename", async (c) => {
  const user = await getUserFromContext(c)
  // 重命名使用独立的 RENAME 权限位（此前误用 WRITE_CONTENT，导致「只有上传
  // 权限的用户也能改名」而「只授予 RENAME 的用户反被拒绝」）。
  if (!canRename(user)) return permissionDenied(c)
  const { path: oldPath, name: newName } = await c.req.json().catch(() => ({}))
  let cleanName = ""
  try {
    validateDirPath(oldPath || "/")
    cleanName = validateFileName(newName)
  } catch (e: any) {
    return c.json({ code: 400, message: e.message, data: null }, 400)
  }
  const requestContext = getStorageRequestContext(c)
  try {
    const actualOldPath = getActualPath(user, oldPath || "/")
    if (await deniedByMetaWriteAcl(c, user, [actualOldPath]))
      return permissionDenied(c)
    await renameItem(actualOldPath, cleanName, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/remove", async (c) => {
  const user = await getUserFromContext(c)
  // 删除使用独立的 DELETE 权限位（此前误用 WRITE_CONTENT）。
  if (!canRemove(user)) return permissionDenied(c)
  const { dir, names } = await c.req.json().catch(() => ({}))
  if (!Array.isArray(names) || names.length === 0) {
    return c.json(
      {
        code: 400,
        message: "Parameter 'names' must be a non-empty array",
        data: null,
      },
      400,
    )
  }
  let cleanNames: string[] = []
  try {
    validateDirPath(dir || "/")
    cleanNames = names.map((n: string) => validateFileName(n))
  } catch (e: any) {
    return c.json({ code: 400, message: e.message, data: null }, 400)
  }
  const requestContext = getStorageRequestContext(c)
  try {
    const actualDir = getActualPath(user, dir || "/")
    const aclPaths = cleanNames.map((n) =>
      `${actualDir}/${n}`.replace(/\/{2,}/g, "/"),
    )
    if (await deniedByMetaWriteAcl(c, user, aclPaths))
      return permissionDenied(c)
    await removeItems(actualDir, cleanNames, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/move", async (c) => {
  const user = await getUserFromContext(c)
  // 移动使用独立的 MOVE 权限位（此前误用 WRITE_CONTENT）。
  if (!canMove(user)) return permissionDenied(c)
  const { src_dir, dst_dir, names } = await c.req.json().catch(() => ({}))
  if (!Array.isArray(names) || names.length === 0) {
    return c.json(
      {
        code: 400,
        message: "Parameter 'names' must be a non-empty array",
        data: null,
      },
      400,
    )
  }
  let cleanNames: string[] = []
  try {
    validateDirPath(src_dir || "/")
    validateDirPath(dst_dir || "/")
    cleanNames = names.map((n: string) => validateFileName(n))
  } catch (e: any) {
    return c.json({ code: 400, message: e.message, data: null }, 400)
  }
  const requestContext = getStorageRequestContext(c)
  try {
    const actualSrcDir = getActualPath(user, src_dir || "/")
    const actualDstDir = getActualPath(user, dst_dir || "/")
    const aclPaths = [
      actualDstDir,
      ...cleanNames.map((n) =>
        `${actualSrcDir}/${n}`.replace(/\/{2,}/g, "/"),
      ),
    ]
    if (await deniedByMetaWriteAcl(c, user, aclPaths))
      return permissionDenied(c)
    await moveItems(actualSrcDir, actualDstDir, cleanNames, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/copy", async (c) => {
  const user = await getUserFromContext(c)
  // 复制使用独立的 COPY 权限位（此前误用 WRITE_CONTENT）。
  if (!canCopy(user)) return permissionDenied(c)
  const { src_dir, dst_dir, names } = await c.req.json().catch(() => ({}))
  if (!Array.isArray(names) || names.length === 0) {
    return c.json(
      {
        code: 400,
        message: "Parameter 'names' must be a non-empty array",
        data: null,
      },
      400,
    )
  }
  let cleanNames: string[] = []
  try {
    validateDirPath(src_dir || "/")
    validateDirPath(dst_dir || "/")
    cleanNames = names.map((n: string) => validateFileName(n))
  } catch (e: any) {
    return c.json({ code: 400, message: e.message, data: null }, 400)
  }
  const requestContext = getStorageRequestContext(c)
  try {
    const actualSrcDir = getActualPath(user, src_dir || "/")
    const actualDstDir = getActualPath(user, dst_dir || "/")
    const aclPaths = [
      actualDstDir,
      ...cleanNames.map((n) =>
        `${actualDstDir}/${n}`.replace(/\/{2,}/g, "/"),
      ),
    ]
    if (await deniedByMetaWriteAcl(c, user, aclPaths))
      return permissionDenied(c)
    await copyItems(actualSrcDir, actualDstDir, cleanNames, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.put("/put", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
  const rawPath = decodeURIComponent(c.req.header("File-Path") || "")
  if (!rawPath.trim()) {
    return c.json(
      { code: 400, message: "Missing File-Path header", data: null },
      400,
    )
  }
  try {
    validateDirPath(rawPath)
  } catch (e: any) {
    return c.json({ code: 400, message: e.message, data: null }, 400)
  }
  const reqPath = getActualPath(user, rawPath)
  if (await deniedByMetaWriteAcl(c, user, [reqPath])) return permissionDenied(c)
  const requestContext = getStorageRequestContext(c)
  try {
    const body = await readBodyWithinLimit(c)
    if (!body.ok) return tooLargeResponse(c, body.limit)
    await putItem(reqPath, body.buffer, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.put("/form", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
  const rawPath = decodeURIComponent(c.req.header("File-Path") || "")
  if (!rawPath.trim()) {
    return c.json(
      { code: 400, message: "Missing File-Path header", data: null },
      400,
    )
  }
  try {
    validateDirPath(rawPath)
  } catch (e: any) {
    return c.json({ code: 400, message: e.message, data: null }, 400)
  }
  const reqPath = getActualPath(user, rawPath)
  if (await deniedByMetaWriteAcl(c, user, [reqPath])) return permissionDenied(c)
  const requestContext = getStorageRequestContext(c)
  try {
    const form = await c.req.formData()
    const file = form.get("file")
    if (!file || typeof file === "string") {
      return c.json({
        code: 400,
        message: "missing file in form data",
        data: null,
      })
    }
    const buffer = Buffer.from(await (file as File).arrayBuffer())
    // multipart 的 Content-Length 只覆盖整个表单，仍需按文件实际字节复核
    const max = getUploadSizeLimit(c, false)
    if (buffer.length > max) return tooLargeResponse(c, max)
    await putItem(reqPath, buffer, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

// 说明：TS 专有的 /fs/upload/{create,part,complete} 会话式上传端点已移除，
// 分片上传对齐 Go 只保留官方的 /fs/multipart/* 系列。

fsRouter.post("/add_offline_download", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const { path: rawPath, urls } = await c.req.json().catch(() => ({}))
  const reqPath = getActualPath(user, rawPath || "/")
  if (!urls || urls.length === 0) {
    return c.json({ code: 400, message: "No URLs provided" })
  }

  return c.json(
    {
      code: 501,
      message:
        "capability unavailable: this runtime has no durable offline-download adapter; use /fs/seed/offline_download with an approved source and a streaming-capable target driver",
      data: { path: reqPath, accepted: 0 },
    },
    501,
  )
})

fsRouter.post("/search", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const body = await c.req.json().catch(() => ({}))
  const parentPath = getActualPath(user, body.parent || "/")
  try {
    const result = await search(
      {
        parent: parentPath,
        keywords: body.keywords || "",
        scope: body.scope !== undefined ? parseInt(body.scope, 10) : 0,
        page: body.page ? parseInt(body.page, 10) : 1,
        per_page: body.per_page ? parseInt(body.per_page, 10) : 30,
        // 与 /fs/list 同一套 meta 判定（密码 + read_users），
        // 对齐 Go handles.Search 里 SearchFiltered 的 filter 闭包
        user,
        password: body.password || "",
      },
      c.env,
    )
    return c.json({ code: 200, message: "success", data: result })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

fsRouter.post("/other", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const body = await c.req.json().catch(() => ({}))
  const reqPath = getActualPath(user, body.path || "/")
  const method = body.method
  if (!method) {
    return c.json(
      { code: 400, message: "Missing required parameter 'method'", data: null },
      400,
    )
  }
  // FIX(H-8): `other` is a driver-specific privileged entry point. S3 uses it
  // to mint presigned direct-upload URLs (s3/driver.ts:371-378), which is a
  // write — it must obey the same gate as /fs/put. Without this, a guest could
  // obtain a direct-upload URL and bypass the upload permission check.
  //
  // 体积边界说明：这里签发的直传 URL 由客户端直接写对象存储，数据不经过本站，
  // 因此 MAX_UPLOAD / MAX_UPPART 覆盖不到该路径——上限由下游存储自行约束。
  if (!canWrite(user)) return permissionDenied(c)
  try {
    const resolved = await resolvePath(reqPath)
    if (resolved.isVirtual || !resolved.storage) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage.driver, resolved.storage)
    if (typeof (driver as any).other === "function") {
      const data = await (driver as any).other(method, resolved.relative, body)
      // other() 可能触发落盘（如 S3 直传 URL 的签发流程）：按已知路径失效缓存。
      // 直传的实际写入发生在客户端，无法精确感知完成时机，这里失效目标目录
      // 及（若给定）文件路径，将陈旧窗口压到最小；失效失败不影响响应。
      const targets = [reqPath]
      if (typeof body?.file_name === "string" && body.file_name) {
        targets.push(`${reqPath === "/" ? "" : reqPath}/${body.file_name}`)
      }
      await invalidatePaths(targets, c.env)
      return c.json({ code: 200, message: "success", data })
    }
    return c.json(
      {
        code: 500,
        message: `Driver '${resolved.storage.driver}' does not support other method '${method}'`,
        data: null,
      },
      500,
    )
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

// ---- batch_rename / regex_rename（与 Go server/handles/fsbatch.go 对齐）----

fsRouter.post("/batch_rename", async (c) => {
  const user = await getUserFromContext(c)
  if (!canRename(user)) return permissionDenied(c)
  const { src_dir, rename_objects } = await c.req.json().catch(() => ({}))
  if (!Array.isArray(rename_objects) || rename_objects.length === 0) {
    return c.json(
      { code: 400, message: "rename_objects is required", data: null },
      400,
    )
  }
  const dirPath = getActualPath(user, src_dir || "/")
  const requestContext = getStorageRequestContext(c)
  try {
    const aclPaths = rename_objects
      .map((obj: any) => obj?.src_name)
      .filter((n: any) => typeof n === "string" && n)
      .map((n: string) => `${dirPath}/${n}`.replace(/\/{2,}/g, "/"))
    if (await deniedByMetaWriteAcl(c, user, aclPaths))
      return permissionDenied(c)
    for (const obj of rename_objects) {
      const srcName = obj?.src_name
      const newName = obj?.new_name
      if (!srcName || !newName) continue
      validateFileName(newName)
      const fullPath = `${dirPath}/${srcName}`.replace(/\/{2,}/g, "/")
      await renameItem(fullPath, newName, requestContext)
    }
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

fsRouter.post("/regex_rename", async (c) => {
  const user = await getUserFromContext(c)
  if (!canRename(user)) return permissionDenied(c)
  const { src_dir, src_name_regex, new_name_regex } = await c.req
    .json()
    .catch(() => ({}))
  if (!src_name_regex) {
    return c.json(
      { code: 400, message: "src_name_regex is required", data: null },
      400,
    )
  }
  const dirPath = getActualPath(user, src_dir || "/")
  const requestContext = getStorageRequestContext(c)
  try {
    const srcRegex = new RegExp(src_name_regex)
    const { content } = await listItems(dirPath, requestContext)
    for (const item of content) {
      if (!item.is_dir && srcRegex.test(item.name)) {
        const newName = item.name.replace(srcRegex, new_name_regex || "")
        validateFileName(newName)
        const fullPath = `${dirPath}/${item.name}`.replace(/\/{2,}/g, "/")
        if (await deniedByMetaWriteAcl(c, user, [fullPath]))
          return permissionDenied(c)
        await renameItem(fullPath, newName, requestContext)
      }
    }
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

// ---- recursive_move（与 Go FsRecursiveMove 对齐：递归枚举文件后扁平移动到 dst_dir）----

fsRouter.post("/recursive_move", async (c) => {
  const user = await getUserFromContext(c)
  if (!canMove(user)) return permissionDenied(c)
  const { src_dir, dst_dir, conflict_policy } = await c.req
    .json()
    .catch(() => ({}))
  const srcPath = getActualPath(user, src_dir || "/")
  const dstPath = getActualPath(user, dst_dir || "/")
  const policy = conflict_policy || "overwrite"
  const requestContext = getStorageRequestContext(c)
  try {
    // 预取目标目录现有文件名（用于 cancel/skip 冲突策略）
    let existing = new Set<string>()
    if (policy !== "overwrite") {
      const dst = await listItems(dstPath, requestContext)
      existing = new Set(dst.content.map((f) => f.name))
    }
    const queue: string[] = [srcPath]
    let count = 0
    while (queue.length > 0) {
      const dir = queue.shift()!
      const { content } = await listItems(dir, requestContext)
      for (const item of content) {
        if (item.is_dir) {
          queue.push(`${dir}/${item.name}`.replace(/\/{2,}/g, "/"))
        } else {
          if (existing.has(item.name)) {
            if (policy === "cancel") {
              return c.json(
                {
                  code: 403,
                  message: `file [${item.name}] exists`,
                  data: null,
                },
                403,
              )
            }
            if (policy === "skip") continue
          }
          if (policy !== "overwrite") existing.add(item.name)
          if (
            await deniedByMetaWriteAcl(c, user, [
              dstPath,
              `${dir}/${item.name}`.replace(/\/{2,}/g, "/"),
            ])
          )
            return permissionDenied(c)
          await moveItems(dir, dstPath, [item.name], requestContext)
          count++
        }
      }
    }
    return c.json({
      code: 200,
      message: `Successfully moved ${count} files`,
      data: null,
    })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

// ---- remove_empty_directory（与 Go FsRemoveEmptyDirectory 对齐）----

fsRouter.post("/remove_empty_directory", async (c) => {
  const user = await getUserFromContext(c)
  if (!canRemove(user)) return permissionDenied(c)
  const { src_dir } = await c.req.json().catch(() => ({}))
  const srcPath = getActualPath(user, src_dir || "/")
  if (await deniedByMetaWriteAcl(c, user, [srcPath])) return permissionDenied(c)
  const requestContext = getStorageRequestContext(c)
  try {
    const removeEmptyDirs = async (dir: string): Promise<void> => {
      const { content } = await listItems(dir, requestContext)
      for (const item of content) {
        if (item.is_dir) {
          await removeEmptyDirs(`${dir}/${item.name}`.replace(/\/{2,}/g, "/"))
        }
      }
      if (dir === srcPath) return // 不删除根目录本身
      const after = await listItems(dir, requestContext)
      if (after.content.length === 0) {
        const parent = dir.split("/").slice(0, -1).join("/") || "/"
        const name = dir.split("/").pop()!
        await removeItems(parent, [name], requestContext)
      }
    }
    await removeEmptyDirs(srcPath)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

// ---- link（与 Go Link 对齐，admin 权限，返回真实直链）----

fsRouter.post("/link", async (c) => {
  const user = await getUserFromContext(c)
  if (!isAdmin(user)) return permissionDenied(c)
  const { path } = await c.req.json().catch(() => ({}))
  const reqPath = getActualPath(user, path || "/")
  const requestContext = getStorageRequestContext(c)
  try {
    const resolved = await resolvePath(reqPath)
    if (resolved.isVirtual || !resolved.storage) {
      return c.json(
        { code: 500, message: "storage not found", data: null },
        500,
      )
    }
    const driver = await getDriver(resolved.storage.driver, resolved.storage)
    try {
      const item = await driver.get(reqPath, resolved.physical ?? "/")
      if (item && item.raw_url) {
        return c.json({
          code: 200,
          message: "success",
          data: { url: item.raw_url },
        })
      }
    } finally {
      await flushPendingDriverState(
        resolved.storage.driver,
        resolved.storage,
        driver,
        requestContext,
      )
    }
    // 无直链（如本地/加密驱动）：返回代理下载地址。
    //
    // 对齐 Go server/handles/fsmanage.go Link：
    //   fmt.Sprintf("%s/p%s?d&sign=%s", GetApiUrl(c), EncodePath(rawPath, true), sign.Sign(rawPath))
    // 即路径逐段编码 + **无条件**带签名（Go 不看 needSign；这里同样补齐，
    // 否则在 sign_all / enable_sign / 密码 meta 生效时复制出来的链接必然 401）。
    // 「?d」（强制 attachment 下载）TS 侧无对应语义，故不追加。
    const sign = await signDownloadPath(c, reqPath, await getSignExpiresIn(c))
    return c.json({
      code: 200,
      message: "success",
      data: {
        url: `/api/p${encodeDownloadPath(reqPath)}?sign=${encodeURIComponent(sign)}`,
      },
    })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

// ---- get_direct_upload_info（与 Go FsGetDirectUploadInfo 对齐）----

fsRouter.post("/get_direct_upload_info", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
  const { path, file_name, file_size } = await c.req.json().catch(() => ({}))
  // 对齐 Go FsGetDirectUploadInfo 的四重校验：
  //  1) file_name 必须是单层相对文件名（拒绝 / \ .. 与空值），否则可能签发
  //     指向目标目录之外的直传凭证；
  //  2) 目标目录需通过用户权限位，或 meta.write 强制开放（write_content_bypass）；
  //  3) 目标目录需通过 meta.write_users 白名单；
  //  4) 目标不得跨越存储挂载边界（单段文件名也可能命中嵌套挂载点）。
  let cleanName: string
  try {
    cleanName = validateFileName(file_name)
  } catch (e: any) {
    return c.json({ code: 403, message: safeErrorMessage(e), data: null }, 403)
  }
  const dirPath = getActualPath(user, path || "/")
  const dstPath = dirPath === "/" ? `/${cleanName}` : `${dirPath}/${cleanName}`
  const parentMeta = await getNearestMeta(dirPath, c.env)
  if (!canWrite(user) && !canWriteContentBypassUserPerms(parentMeta, dirPath)) {
    return permissionDenied(c)
  }
  if (await deniedByMetaWriteAcl(c, user, [dirPath])) return permissionDenied(c)
  // 挂载边界：目标文件与所在目录必须落在同一个存储挂载点内
  const normMount = (s: any) =>
    "/" + String(s?.mount_path || "").split("/").filter(Boolean).join("/")
  try {
    const [parentResolved, targetResolved] = await Promise.all([
      resolvePath(dirPath),
      resolvePath(dstPath),
    ])
    if (
      normMount(parentResolved.storage) !== normMount(targetResolved.storage)
    ) {
      return permissionDenied(c)
    }
  } catch {
    return permissionDenied(c)
  }
  // Overwrite:false 时目标已存在则拒绝签发（对齐 Go）
  if (c.req.header("Overwrite") === "false") {
    try {
      const { item } = await getItem(dstPath, getStorageRequestContext(c))
      if (item) {
        return c.json({ code: 403, message: "file exists", data: null }, 403)
      }
    } catch {
      // 目标不存在 / 无法读取：继续签发流程
    }
  }
  try {
    const resolved = await resolvePath(dirPath)
    if (resolved.isVirtual || !resolved.storage) {
      return c.json({ code: 200, message: "success", data: null })
    }
    const driver = await getDriver(resolved.storage.driver, resolved.storage)
    const d = driver as any
    // 优先使用驱动的直传能力
    if (typeof d.getDirectUploadInfo === "function") {
      const info = await d.getDirectUploadInfo(
        resolved.relative,
        cleanName,
        file_size,
      )
      // 直传 URL 签发后客户端会向该路径写入新文件：预失效目录与目标路径
      // （本分支已把校验后的目录/文件名归一化为 dirPath / dstPath）
      await invalidatePaths([dirPath, dstPath], c.env)
      return c.json({ code: 200, message: "success", data: info })
    }
    // 回退到 other("direct_upload") / other("get_direct_upload_info")
    if (typeof d.other === "function") {
      for (const m of ["direct_upload", "get_direct_upload_info"]) {
        try {
          const info = await d.other(m, resolved.relative, {
            file_name: cleanName,
            file_size,
          })
          if (info) {
            // 同上：直传 URL 签发后预失效目录与目标路径
            await invalidatePaths([dirPath, dstPath], c.env)
            return c.json({ code: 200, message: "success", data: info })
          }
        } catch {
          // 尝试下一个 method
        }
      }
    }
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

// ---- Multipart 分片上传（与官方前端 multipart.ts API 契约对齐）----
// 服务层会话管理器：/fs/multipart/init | chunk | complete | status
// 内部桥接到驱动层 createUploadSession / uploadPart / completeUploadSession。

function splitUploadPath(uploadPath: string): { dir: string; name: string } {
  const clean = uploadPath.startsWith("/") ? uploadPath : "/" + uploadPath
  const parts = clean.split("/").filter(Boolean)
  const name = parts.pop() || ""
  const dir = "/" + parts.join("/")
  return { dir, name }
}

/**
 * 分片会话的所有者校验。
 *
 * 安全不变量：分片会话（含 driver_session token、已收分片与目标路径）是
 * **用户私有状态**，只有创建者可续传/完成/查询。非本人会话一律按「不存在」
 * 处理，既不泄露其存在，也不允许跨用户续传。
 */
function sessionOwnedBy(session: any, user: any): boolean {
  return Boolean(session) && session.owner_id !== undefined && session.owner_id === user?.id
}

fsRouter.post("/multipart/init", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || !canWrite(user)) return permissionDenied(c)

  const rawPath = decodeURIComponent(c.req.header("File-Path") || "")
  const size = parseInt(c.req.header("X-File-Size") || "0", 10)
  const rawChunk = parseInt(c.req.header("X-Chunk-Size") || "0", 10)
  const md5 = c.req.header("X-File-Md5") || ""

  if (!rawPath.trim() || size <= 0) {
    return c.json(
      { code: 400, message: "Missing File-Path / X-File-Size header", data: null },
      400,
    )
  }

  const { dir, name } = splitUploadPath(rawPath)
  const actualDir = getActualPath(user, dir)
  if (await deniedByMetaWriteAcl(c, user, [actualDir, `${actualDir}/${name}`.replace(/\/{2,}/g, "/")]))
    return permissionDenied(c)
  const requestContext = getStorageRequestContext(c)

  try {
    const resolved = await resolvePath(actualDir)
    if (resolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    if (typeof (driver as any).createUploadSession !== "function") {
      // 存储不支持分片：返回 data:null，前端自动回退到流式上传
      return c.json({ code: 200, message: "success", data: null })
    }

    const chunkSize = clampChunkSize(rawChunk)
    const totalChunks = Math.max(1, Math.ceil(size / chunkSize))

    // 断点续传：同 owner + path+size 的未完成会话直接复用（按用户隔离）
    let session: MultipartSession
    let resumed = false
    const existing = findReceivingSession(rawPath, size, user.id)
    if (existing) {
      session = existing
      resumed = true
    } else {
      const info = await (driver as any).createUploadSession(
        actualDir,
        resolved.physical!,
        name,
        size,
        md5,
      )
      session = {
        upload_id: newUploadId(),
        state: "receiving",
        attempt: 0,
        path: rawPath,
        size,
        chunk_size: chunkSize,
        total_chunks: totalChunks,
        received: new Set<number>(),
        driver_session: info?.session || "",
        partMd5s: new Array(totalChunks).fill(undefined),
        storage_driver: resolved.storage!.driver,
        owner_id: user.id,
        owner_root: getActualPath(user, "/"),
        created_at: Date.now(),
      }
      // 秒传：驱动返回 reuse 标记
      if (info?.reuse) {
        session.state = "completed"
        session.received = new Set(
          Array.from({ length: totalChunks }, (_, i) => i),
        )
      }
      putSession(session)
    }
    await flushPendingDriverState(
      resolved.storage!.driver,
      resolved.storage,
      driver,
      requestContext,
    )
    return c.json({
      code: 200,
      message: "success",
      data: { ...mpSnapshot(session), resumed },
    })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

fsRouter.put("/multipart/chunk", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)

  const uploadId = c.req.header("X-Upload-Id") || ""
  const chunkIndex = parseInt(c.req.header("X-Chunk-Index") || "-1", 10)
  const session = uploadId ? getSession(uploadId) : undefined

  // 会话所有者校验：非本人会话按「不存在」处理（不泄露会话是否存在）
  if (!session || !sessionOwnedBy(session, user)) {
    return c.json(
      { code: 404, message: "upload session not found", data: null },
      404,
    )
  }
  if (chunkIndex < 0 || chunkIndex >= session.total_chunks) {
    return c.json({ code: 400, message: "invalid X-Chunk-Index", data: null }, 400)
  }

  // 幂等：已收分片直接返回当前快照
  if (session.received.has(chunkIndex)) {
    return c.json({ code: 200, message: "success", data: mpSnapshot(session) })
  }

  const requestContext = getStorageRequestContext(c)
  try {
    const resolved = await resolvePath(
      getActualPath(user, splitUploadPath(session.path).dir),
    )
    if (resolved.isVirtual) throw new Error("failed get storage: storage not found")
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    if (typeof (driver as any).uploadPart !== "function") {
      throw new Error("storage does not support chunked upload")
    }
    // 单片上限必须按**实际收到的字节数**判定：Content-Length 可被省略或伪造。
    // 历史缺陷：此处只做 Content-Length 预检，省略该头即可绕过单片上限并把
    // 整片内容读入内存。
    const body = await readBodyWithinLimit(c, true)
    if (!body.ok) return tooLargeResponse(c, body.limit, "Part")
    const buffer = body.buffer
    let result
    try {
      result = await (driver as any).uploadPart(
        session.driver_session,
        chunkIndex + 1,
        buffer,
      )
    } finally {
      await flushPendingDriverState(
        resolved.storage!.driver,
        resolved.storage,
        driver,
        requestContext,
      )
    }
    session.received.add(chunkIndex)
    if (result?.partMd5) session.partMd5s[chunkIndex] = result.partMd5
    putSession(session)
    return c.json({ code: 200, message: "success", data: mpSnapshot(session) })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

fsRouter.post("/multipart/complete", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)

  const uploadId = c.req.header("X-Upload-Id") || ""
  const session = uploadId ? getSession(uploadId) : undefined
  if (!session || !sessionOwnedBy(session, user)) {
    return c.json(
      { code: 404, message: "upload session not found", data: null },
      404,
    )
  }
  if (session.state === "completed") {
    return c.json({ code: 200, message: "success", data: mpSnapshot(session) })
  }

  const requestContext = getStorageRequestContext(c)
  try {
    const resolved = await resolvePath(
      getActualPath(user, splitUploadPath(session.path).dir),
    )
    if (resolved.isVirtual) throw new Error("failed get storage: storage not found")
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    if (typeof (driver as any).completeUploadSession !== "function") {
      throw new Error("storage does not support chunked upload")
    }
    try {
      await (driver as any).completeUploadSession(
        session.driver_session,
        session.partMd5s.filter((x) => x !== undefined),
      )
    } finally {
      await flushPendingDriverState(
        resolved.storage!.driver,
        resolved.storage,
        driver,
        requestContext,
      )
    }
    session.state = "completed"
    putSession(session)
    deleteSession(session.upload_id)
    // 分片收尾：失效上传文件及其目录的缓存（对齐 op 层 put 的失效范围）
    {
      const { dir, name } = splitUploadPath(session.path)
      const actualDir = getActualPath(user, dir)
      await invalidatePaths(
        [actualDir, `${actualDir === "/" ? "" : actualDir}/${name}`],
        c.env,
      )
    }
    return c.json({ code: 200, message: "success", data: mpSnapshot(session) })
  } catch (e: any) {
    session.state = "failed_permanent"
    session.error = safeErrorMessage(e)
    putSession(session)
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

fsRouter.get("/multipart/status", async (c) => {
  // 状态接口返回目标路径、大小与进度，属于用户私有数据：必须鉴权 + 校验所有者
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const uploadId = c.req.query("upload_id") || ""
  const session = uploadId ? getSession(uploadId) : undefined
  if (!session || !sessionOwnedBy(session, user)) {
    return c.json(
      { code: 404, message: "upload session not found", data: null },
      404,
    )
  }
  return c.json({ code: 200, message: "success", data: mpSnapshot(session) })
})

// ---- 归档（Archive）----
// ZIP（Store/Deflate）：Worker 内置 DecompressionStream，完整支持。
// tar/tar.gz/tgz/tar.bz2/tar.xz：需要对应解压实现，当前运行时若无
//   原生支持则返回 501（能力不足，非请求错误），前端可据此提示用户。
// 7z/rar：Worker 运行时无原生解析库，明确返回 501。
// 归档内容在内存中解析，受 Worker 内存限制，适合中小型归档。

type ArchiveFormat = "zip" | "tar" | "tar.gz" | "tar.bz2" | "tar.xz" | "7z" | "rar"

function detectArchiveFormat(name: string): ArchiveFormat | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".zip")) return "zip"
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "tar.gz"
  if (lower.endsWith(".tar.bz2") || lower.endsWith(".tbz2")) return "tar.bz2"
  if (lower.endsWith(".tar.xz") || lower.endsWith(".txz")) return "tar.xz"
  if (lower.endsWith(".tar")) return "tar"
  if (lower.endsWith(".7z")) return "7z"
  if (lower.endsWith(".rar")) return "rar"
  return null
}

/** 当前运行时实际可解析的格式（ZIP 始终可用；其他格式按需扩展） */
function isNativelySupported(fmt: ArchiveFormat): boolean {
  return fmt === "zip"
}

/** 下载归档文件字节（复用驱动 get() 的 raw_url + SSRF 防护） */
async function fetchArchiveBytes(
  c: any,
  user: any,
  virtualPath: string,
): Promise<ArrayBuffer> {
  const actual = getActualPath(user, virtualPath)
  const resolved = await resolvePath(actual)
  if (resolved.isVirtual) throw new Error("failed get storage: storage not found")
  const driver = await getDriver(resolved.storage!.driver, resolved.storage)
  let item: any
  try {
    item = await driver.get(virtualPath, resolved.physical!)
  } finally {
    await flushPendingDriverState(
      resolved.storage!.driver,
      resolved.storage,
      driver,
      getStorageRequestContext(c),
    )
  }
  if (!item || !item.raw_url) {
    throw new Error("archive driver did not return download link")
  }
  // 管理员配置的受信存储 endpoint host（内网自建 S3/WebDAV/MinIO）+ 全局
  // 环境变量 SSRF_ALLOWED_HOSTS 加入白名单
  const trustedHosts = getTrustedHosts(resolved.storage?.addition, c.env)
  assertSafeUrl(item.raw_url, "Archive download", trustedHosts)
  // 使用与 /d、/p 代理相同的**逐跳**校验：默认 fetch 会自动跟随 3xx，攻击者
  // 可以先让 raw_url 指向通过 isSafeUrl 的公网域名，再 302 跳到内网/云元数据。
  // 历史缺陷：这里只校验初始 URL 后直接 fetch，绕过逐跳防护（raw.ts 已做）。
  const { safeProxyFetch } = await import("./raw")
  const resp = await safeProxyFetch(
    item.raw_url,
    item.raw_url_headers || {},
    trustedHosts,
  )
  if (!resp.ok) throw new Error(`archive download failed: HTTP ${resp.status}`)
  return await resp.arrayBuffer()
}

/** 将扁平条目构建为树形结构（对齐 Go ArchiveContentResp） */
function buildArchiveTree(archive: ZipArchive): any[] {
  const root: any[] = []
  const dirMap = new Map<string, any>()

  for (const e of archive.entries) {
    const parts = e.name.split("/").filter(Boolean)
    if (parts.length === 0) continue

    let current = root
    let currentPath = ""
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`

      if (isLast) {
        current.push({
          name: part,
          size: e.size,
          is_dir: false,
          modified: e.modified || new Date().toISOString(),
          type: calcFileTypeSafe(part, false),
          children: [] as any[],
        })
      } else {
        let dir = dirMap.get(currentPath)
        if (!dir) {
          dir = {
            name: part,
            size: 0,
            is_dir: true,
            modified: e.modified || new Date().toISOString(),
            type: 1,
            children: [] as any[],
          }
          dirMap.set(currentPath, dir)
          current.push(dir)
        }
        current = dir.children
      }
    }
  }
  return root
}

function calcFileTypeSafe(name: string, isDir: boolean): number {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (isDir) return 1
  const video = ["mp4", "mkv", "webm", "avi", "mov", "flv", "m3u8"]
  const audio = ["mp3", "flac", "wav", "aac", "ogg", "m4a"]
  const image = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"]
  const text = ["txt", "md", "json", "js", "ts", "css", "html", "xml", "yml", "log"]
  if (video.includes(ext)) return 2
  if (audio.includes(ext)) return 3
  if (image.includes(ext)) return 4
  if (text.includes(ext)) return 5
  return 6
}

fsRouter.post("/archive/meta", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  // 归档读取需要独立能力位：READ_ARCHIVES
  if (!can(user, PermissionBit.READ_ARCHIVES)) return permissionDenied(c)
  const body = await c.req.json().catch(() => ({}))
  const path = String(body.path || c.req.query("path") || "").trim()
  if (!path) return c.json({ code: 400, message: "path is required", data: null }, 400)
  const fmt = detectArchiveFormat(path)
  if (!fmt) {
    return c.json({ code: 400, message: "unrecognized archive format", data: null }, 400)
  }
  if (!isNativelySupported(fmt)) {
    return c.json({
      code: 501,
      message: `archive format '${fmt}' is recognized but not supported in this runtime (Worker supports ZIP only); use the Go backend for ${fmt} archives`,
      data: null,
    }, 501)
  }
  try {
    // 与 /fs/get 共用 meta 判定：密码保护的归档不能靠归档接口绕过密码
    if (
      await deniedByMetaReadAcl(
        c,
        user,
        getActualPath(user, path),
        String(body.password || ""),
      )
    ) {
      return permissionDenied(c)
    }
    const bytes = await fetchArchiveBytes(c, user, path)
    const archive = parseZip(bytes)
    const tree = buildArchiveTree(archive)
    return c.json({
      code: 200,
      message: "success",
      data: {
        comment: "",
        encrypted: false,
        content: tree,
        raw_url: "",
        sign: "",
      },
    })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

fsRouter.post("/archive/list", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  // 归档读取需要独立能力位：READ_ARCHIVES
  if (!can(user, PermissionBit.READ_ARCHIVES)) return permissionDenied(c)
  const body = await c.req.json().catch(() => ({}))
  const path = String(body.path || c.req.query("path") || "").trim()
  const innerPath = String(body.inner_path || "").trim().replace(/\/+/g, "/")
  if (!path) return c.json({ code: 400, message: "path is required", data: null }, 400)
  const fmtList = detectArchiveFormat(path)
  if (!fmtList) {
    return c.json({ code: 400, message: "unrecognized archive format", data: null }, 400)
  }
  if (!isNativelySupported(fmtList)) {
    return c.json({
      code: 501,
      message: `archive format '${fmtList}' is recognized but not supported in this runtime; use the Go backend for ${fmtList} archives`,
      data: null,
    }, 501)
  }
  try {
    // 与 /fs/get 共用 meta 判定：密码保护的归档不能靠归档接口绕过密码
    if (
      await deniedByMetaReadAcl(
        c,
        user,
        getActualPath(user, path),
        String(body.password || ""),
      )
    ) {
      return permissionDenied(c)
    }
    const bytes = await fetchArchiveBytes(c, user, path)
    const archive = parseZip(bytes)
    const prefix = innerPath ? innerPath.replace(/^\/+|\/+$/g, "") + "/" : ""
    const items = archive.entries
      .filter((e) => {
        if (!prefix) return !e.name.includes("/")
        return e.name.startsWith(prefix) && e.name !== prefix.slice(0, -1)
      })
      .map((e) => {
        const rel = prefix ? e.name.slice(prefix.length) : e.name
        return {
          name: rel.split("/")[0],
          size: e.size,
          is_dir: false,
          modified: e.modified || new Date().toISOString(),
          type: calcFileTypeSafe(rel.split("/")[0], false),
        }
      })
    // 去重（扁平列表）
    const seen = new Set<string>()
    const content = items.filter((it) => {
      if (seen.has(it.name)) return false
      seen.add(it.name)
      return true
    })
    return c.json({
      code: 200,
      message: "success",
      data: { content, total: content.length },
    })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})

fsRouter.post("/archive/decompress", async (c) => {
  const user = await getUserFromContext(c)
  // 解压写文件：需要 WRITE_CONTENT（写目标）+ DECOMPRESS（解压能力）
  if (!canWrite(user) || !can(user, PermissionBit.DECOMPRESS))
    return c.json({ code: 403, message: "Permission denied", data: null }, 403)
  const body = await c.req.json().catch(() => ({}))
  const srcDir = String(body.src_dir || "").trim()
  const dstDir = String(body.dst_dir || "").trim()
  const names: string[] = Array.isArray(body.name) ? body.name : body.name ? [String(body.name)] : []
  const innerPath = String(body.inner_path || "").trim().replace(/\/+/g, "/")
  if (!names.length || !dstDir) {
    return c.json({ code: 400, message: "src_dir/dst_dir/name are required", data: null }, 400)
  }
  try {
    let count = 0
    // 目标目录必须落在**调用者自己的根目录**之内。
    // 历史缺陷：dst_dir 被当作全局虚拟路径直接拼接，既未套用 base_path，
    // 也未做角色范围校验，受限用户可写到任意目录。
    const actualDstDir = getActualPath(user, dstDir)
    if (!isWithinUserRoot(user, actualDstDir)) return permissionDenied(c)
    if (await deniedByMetaWriteAcl(c, user, [actualDstDir]))
      return permissionDenied(c)
    for (const name of names) {
      const srcPath = srcDir ? `${srcDir}/${name}` : `/${name}`
      const fmtDecomp = detectArchiveFormat(name)
      if (!fmtDecomp || !isNativelySupported(fmtDecomp)) {
        return c.json({ code: 400, message: `unsupported archive format: ${name} (only ZIP is supported)`, data: null }, 400)
      }
      const bytes = await fetchArchiveBytes(c, user, srcPath)
      const archive = parseZip(bytes)
      const prefix = innerPath ? innerPath.replace(/^\/+|\/+$/g, "") + "/" : ""
      for (const entry of archive.entries) {
        if (prefix && !entry.name.startsWith(prefix)) continue
        const rel = prefix ? entry.name.slice(prefix.length) : entry.name
        if (!rel || rel.endsWith("/")) continue
        // zip-slip 防护：条目名视为「只能向下展开的相对路径」
        const safeRel = safeArchiveEntryPath(rel)
        if (!safeRel) {
          console.warn(
            `[Archive] skipping unsafe entry path: ${entry.name}`,
          )
          continue
        }
        const targetPath = `${actualDstDir.replace(/\/+$/, "")}/${safeRel}`
        if (!isWithinUserRoot(user, targetPath)) {
          console.warn(
            `[Archive] skipping entry escaping user root: ${entry.name}`,
          )
          continue
        }
        const content = await extractZipEntry(bytes, entry)
        await putItem(targetPath, Buffer.from(content), getStorageRequestContext(c))
        count++
      }
    }
    return c.json({ code: 200, message: "success", data: { task: null, count } })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null }, 500)
  }
})
