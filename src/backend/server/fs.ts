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
import { canWrite, getActualPath, isAdmin } from "../pkg/permission"
import { getSignPolicy, signDownloadPath } from "../pkg/sign"
import { safeErrorMessage } from "../pkg/errs"
import { search } from "../internal/op/search"

export const fsRouter = new Hono()

const getStorageRequestContext = (c: any) => {
  try {
    const executionCtx = c.executionCtx
    if (!executionCtx || typeof executionCtx.waitUntil !== "function") {
      return undefined
    }
    return {
      waitUntil: (promise: Promise<unknown>) => executionCtx.waitUntil(promise),
    }
  } catch {
    return undefined
  }
}

// ---- 写操作权限校验 ----
// 游客（未登录 / 无凭证 / token 无效）一律 403，普通用户需具备
// WRITE_CONTENT 权限位，管理员放行。修复「任何人可匿名上传/删除文件」
// 的安全漏洞，同时让 /fs/list 的 write 字段如实反映请求者身份。
const permissionDenied = (c: any) =>
  c.json({ code: 403, message: "Permission denied", data: null }, 403)

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
  let reqPath = rawPath
  if (!body.force_root || !isAdmin(user)) {
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
                size: 0,
                is_dir: true,
                modified: item.modified || new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 1,
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
          size: 0,
          is_dir: true,
          modified: item.modified || new Date().toISOString(),
          sign: item.sign || "",
          thumb: item.thumb || "",
          type: 1,
        }))
      return c.json({ code: 200, message: "success", data: dirs })
    }

    const { content } = await listItems(reqPath, requestContext)
    const dirs = content
      .filter((item: any) => item.is_dir)
      .map((item: any) => ({
        name: item.name,
        size: 0,
        is_dir: true,
        modified: item.modified || new Date().toISOString(),
        sign: item.sign || "",
        thumb: item.thumb || "",
        type: 1,
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

    const { content, provider, storage } = await listItems(
      reqPath,
      requestContext,
    )
    // write 按请求者身份如实返回：游客/无写权限用户为 false，
    // 前端据此隐藏上传、新建文件夹等写操作入口
    const writable = canWrite(user)
    // 下载签名策略（sign_all / link_expiration）：仅对文件项签发 HMAC 签名，
    // 前端拼到下载链接后由 /raw 校验。未启用时 sign 保持驱动原值。
    const signPolicy = await getSignPolicy(c)
    // Normalize each item to the full Obj shape expected by the frontend
    const normalized = await Promise.all(
      content.map(async (item: any) => {
        const fullPath = `${reqPath}/${item.name}`.replace(/\/{2,}/g, "/")
        const sign =
          !item.is_dir && signPolicy.enabled
            ? await signDownloadPath(c, fullPath, signPolicy.expiresIn)
            : item.sign || ""
        return {
          name: item.name,
          size: item.size,
          is_dir: item.is_dir,
          created: item.created || item.modified || new Date().toISOString(),
          modified: item.modified || new Date().toISOString(),
          sign,
          thumb: item.thumb || "",
          type: item.type ?? 0,
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

    const { content: pagedContent, total } = paginateStorageItems(normalized)
    return c.json({
      code: 200,
      message: "success",
      data: {
        content: pagedContent,
        total,
        readme: "",
        header: "",
        write: writable,
        write_content_bypass: false,
        provider,
        page_size: effectivePerPage > 0 ? effectivePerPage : undefined,
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

    const { item, provider, rawUrl } = await getItem(reqPath, requestContext)
    const signPolicy = await getSignPolicy(c)
    const sign =
      !item.is_dir && signPolicy.enabled
        ? await signDownloadPath(c, reqPath, signPolicy.expiresIn)
        : item.sign || ""
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
        raw_url: rawUrl,
        readme: "",
        header: "",
        provider,
        related: [],
        write: canWrite(user),
        write_content_bypass: false,
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
  if (!canWrite(user)) return permissionDenied(c)
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
    await renameItem(actualOldPath, cleanName, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/remove", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
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
    await removeItems(actualDir, cleanNames, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/move", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
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
    await moveItems(actualSrcDir, actualDstDir, cleanNames, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/copy", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
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
  const requestContext = getStorageRequestContext(c)
  try {
    const buffer = await c.req.arrayBuffer()
    await putItem(reqPath, Buffer.from(buffer), requestContext)
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
    await putItem(reqPath, buffer, requestContext)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

// ---- 分片会话上传：解决大文件整体缓冲导致的卡死/OOM ----
// 流程：POST /fs/upload/create 建会话 → PUT /fs/upload/part 逐片上传
//      → POST /fs/upload/complete 收尾。每片是独立 HTTP 请求，Worker
//      内存占用恒定，不受 CF Workers 请求体/内存上限约束。

fsRouter.post("/upload/create", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
  const {
    path: rawPath,
    file_name,
    size,
    md5,
  } = await c.req.json().catch(() => ({}))
  // 根目录上传时调用方可能传 ""，归一化为 "/"
  const dirPath = getActualPath(user, rawPath || "/")
  const requestContext = getStorageRequestContext(c)
  if (!file_name) {
    return c.json({
      code: 400,
      message: "path and file_name are required",
      data: null,
    })
  }
  try {
    const resolved = await resolvePath(dirPath)
    if (resolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    if (typeof (driver as any).createUploadSession !== "function") {
      // 当前存储不支持分片会话上传：返回 null，前端自动回退到流式上传
      return c.json({ code: 200, message: "success", data: null })
    }
    let info
    try {
      info = await (driver as any).createUploadSession(
        dirPath,
        resolved.physical!,
        file_name,
        Number(size) || 0,
        md5 || "",
      )
    } finally {
      await flushPendingDriverState(
        resolved.storage!.driver,
        resolved.storage,
        driver,
        requestContext,
      )
    }
    return c.json({ code: 200, message: "success", data: info })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.put("/upload/part", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
  const session = c.req.header("X-Upload-Session") || ""
  const partNumber = parseInt(c.req.header("X-Part-Number") || "0", 10)
  const rawDirPath = decodeURIComponent(c.req.header("Upload-Path") || "")
  const dirPath = getActualPath(user, rawDirPath)
  const requestContext = getStorageRequestContext(c)
  if (!session || !(partNumber >= 1) || !dirPath) {
    return c.json({
      code: 400,
      message: "missing X-Upload-Session / X-Part-Number / Upload-Path",
      data: null,
    })
  }
  try {
    const resolved = await resolvePath(dirPath)
    if (resolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    if (typeof (driver as any).uploadPart !== "function") {
      throw new Error("storage does not support chunked upload")
    }
    const buffer = Buffer.from(await c.req.arrayBuffer())
    let result
    try {
      result = await (driver as any).uploadPart(session, partNumber, buffer)
    } finally {
      await flushPendingDriverState(
        resolved.storage!.driver,
        resolved.storage,
        driver,
        requestContext,
      )
    }
    return c.json({ code: 200, message: "success", data: result ?? null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

fsRouter.post("/upload/complete", async (c) => {
  const user = await getUserFromContext(c)
  if (!canWrite(user)) return permissionDenied(c)
  const {
    path: rawPath,
    session,
    partMd5s,
  } = await c.req.json().catch(() => ({}))
  // 根目录上传时调用方可能传 ""，归一化为 "/"
  const dirPath = getActualPath(user, rawPath || "/")
  const requestContext = getStorageRequestContext(c)
  if (!session) {
    return c.json({
      code: 400,
      message: "path and session are required",
      data: null,
    })
  }
  try {
    const resolved = await resolvePath(dirPath)
    if (resolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    if (typeof (driver as any).completeUploadSession !== "function") {
      throw new Error("storage does not support chunked upload")
    }
    try {
      await (driver as any).completeUploadSession(session, partMd5s)
    } finally {
      await flushPendingDriverState(
        resolved.storage!.driver,
        resolved.storage,
        driver,
        requestContext,
      )
    }
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: safeErrorMessage(e), data: null })
  }
})

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

  /* 
  // Offline download is not supported in stateless Serverless environments 
  // as it requires a long-running background process or specialized task queue.
  downloadOfflineFile(urls, reqPath).catch((err) => {
    console.error("Async offline download background job failed:", err)
  })
  */
  return c.json({
    code: 200,
    message:
      "Offline download task received (Note: background processing limited in Serverless mode)",
    data: null,
  })
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
  if (!canWrite(user)) return permissionDenied(c)
  try {
    const resolved = await resolvePath(reqPath)
    if (resolved.isVirtual || !resolved.storage) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage.driver, resolved.storage)
    if (typeof (driver as any).other === "function") {
      const data = await (driver as any).other(method, resolved.relative, body)
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
