import { Hono } from "hono"
import { authUserFromReq } from "./auth"
import {
  listItems,
  getItem,
  putItem,
  removeItems,
} from "../internal/op/storage"
import { safeErrorMessage } from "../pkg/errs"
import { canRemove, canWrite, getActualPath, isWithinUserRoot } from "../pkg/permission"

/**
 * S3 网关（简化版，挂载于 /s3/*）。
 *
 * 协议：支持 ListBuckets / GetObject / HeadObject / PutObject / DeleteObject，
 * 认证采用 Bearer token（JWT，与全局令牌同一签发体系）；完整 AWS SigV4 签名
 * 验证作为后续增强。
 *
 * 说明：本网关**不识别** settings.token 形式的静态 API Token —— 静态令牌走
 * 管理后台的 admin 鉴权通道，不是「某个用户」，无法映射到 S3 的对象视图。
 * 需要静态令牌访问的自动化场景请使用 /api/fs/* 接口。
 *
 * URL 结构：/s3/{bucket}/{objectKey}，bucket 是**用户根目录之下**的一级目录。
 *
 * 安全不变量（必须长期保持）：
 *   1. 认证用户必须存在且未被禁用（authUserFromReq 已复检 disabled）；
 *   2. 所有对象路径都必须落在该用户的 base_path 之内；
 *   3. 写操作（PutObject）需要 WRITE_CONTENT 权限位，
 *      删除操作（DeleteObject）需要 DELETE 权限位，管理员放行。
 *
 * 历史缺陷：只判断「是否登录」，随后直接操作全局虚拟路径 `/${bucket}/${key}`。
 * 后果有两条：① 任何已登录用户（含 permission=0 的只读用户、已禁用用户）都能
 * 上传/删除；② 受限 base_path 的用户可以读写其他用户的目录。均已修复。
 */

export const s3Router = new Hono()

function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function s3Error(code: string, message: string, status: number) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Error><Code>${xmlEscape(code)}</Code><Message>${xmlEscape(message)}</Message></Error>`
  return new Response(xml, {
    status,
    headers: { "Content-Type": "application/xml", "x-amz-request-id": "-" },
  })
}

/** 从 pathname 剥离 /s3 前缀，解析 { bucket, key } */
function parseS3Path(c: any): { bucket: string; key: string } {
  const pathname = new URL(c.req.url).pathname
  const p = pathname.replace(/^\/s3\/?/, "")
  const parts = p.split("/").filter(Boolean)
  const bucket = parts[0] || ""
  const key = parts.slice(1).map(decodeURIComponent).join("/")
  return { bucket, key }
}

/**
 * bucket / key 的语法校验。
 *
 * 只做「形状」校验：bucket 必须是单层目录名，key 不得含空段。真正的越界防护
 * 由 isWithinUserRoot() 在拼装完成后统一收口，不依赖这里。
 */
function isValidS3Bucket(bucket: string): boolean {
  if (!bucket) return false
  if (bucket === "." || bucket === "..") return false
  return !bucket.includes("/") && !bucket.includes("\\") && !bucket.includes("\0")
}

/**
 * 把 S3 的 { bucket, key } 映射为**用户根目录之下**的虚拟路径。
 *
 * base_path 为 "/" 的（默认）用户：`bucket/key` -> `/bucket/key`，与历史行为
 * 完全一致（bucket 即存储挂载点首段），不产生兼容性变化。
 * base_path 受限的用户：`bucket/key` -> `<base_path>/bucket/key`，把 S3 的
 * 「bucket」解释为该用户自己的顶层目录，从而与 /api/fs 的视图保持一致。
 */
function s3VirtualPath(user: any, bucket: string, key: string): string {
  const root = getActualPath(user, "/")
  const segments = [root, bucket, key].filter(Boolean).join("/")
  const normalized = ("/" + segments).replace(/\/{2,}/g, "/")
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized
}

/** 统一的越界拒绝响应（403，避免暴露目标路径是否存在） */
function outOfScope(c: any) {
  return s3Error("AccessDenied", "Object is outside the user's root path", 403)
}

async function authUser(c: any): Promise<any | null> {
  const auth = await authUserFromReq(c)
  return auth ? auth.user : null
}

const getCtx = (c: any) => {
  try {
    const ec = c.executionCtx
    return ec && typeof ec.waitUntil === "function"
      ? { waitUntil: (p: Promise<unknown>) => ec.waitUntil(p), env: c.env }
      : { env: c.env }
  } catch {
    return { env: c?.env }
  }
}

// GET /s3/ → ListBuckets
s3Router.get("/", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  try {
    // 仅列出用户根目录之下的「bucket」——受限 base_path 的用户不应看到整站挂载点
    const res = await listItems(getActualPath(user, "/"), getCtx(c))
    const buckets = (res.content || [])
      .filter((it: any) => it.is_dir)
      .map(
        (it: any) =>
          `  <Bucket><Name>${xmlEscape(it.name)}</Name><CreationDate>${xmlEscape(it.modified || new Date().toISOString())}</CreationDate></Bucket>`,
      )
      .join("\n")
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Owner><ID>openlist</ID><DisplayName>openlist</DisplayName></Owner>
  <Buckets>
${buckets}
  </Buckets>
</ListAllMyBucketsResult>`
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    })
  } catch (e: any) {
    return s3Error("InternalError", safeErrorMessage(e), 500)
  }
})

// GET /s3/{bucket}/{key} → GetObject
s3Router.get("/*", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  const { bucket, key } = parseS3Path(c)
  if (!isValidS3Bucket(bucket) || !key) {
    return s3Error("NoSuchKey", "NoSuchKey", 404)
  }
  const virtualPath = s3VirtualPath(user, bucket, key)
  if (!isWithinUserRoot(user, virtualPath)) return outOfScope(c)
  try {
    const { item, rawUrl } = await getItem(virtualPath, getCtx(c))
    if (!item) return s3Error("NoSuchKey", "NoSuchKey", 404)
    if (item.is_dir) return s3Error("NoSuchKey", "NoSuchKey", 404)
    if (rawUrl) {
      return c.redirect(rawUrl, 302)
    }
    return s3Error("NoSuchKey", "NoSuchKey", 404)
  } catch (e: any) {
    return s3Error("NoSuchKey", safeErrorMessage(e), 404)
  }
})

// HEAD /s3/{bucket}/{key} → HeadObject
s3Router.on("HEAD", "/*", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  const { bucket, key } = parseS3Path(c)
  if (!isValidS3Bucket(bucket) || !key) {
    return s3Error("NoSuchKey", "NoSuchKey", 404)
  }
  const virtualPath = s3VirtualPath(user, bucket, key)
  if (!isWithinUserRoot(user, virtualPath)) return outOfScope(c)
  try {
    const { item } = await getItem(virtualPath, getCtx(c))
    if (!item || item.is_dir) return s3Error("NoSuchKey", "NoSuchKey", 404)
    const headers: Record<string, string> = {
      "Content-Length": String(item.size || 0),
      "Content-Type": String(item.type || "application/octet-stream"),
      "Last-Modified": item.modified || new Date().toISOString(),
    }
    return new Response(null, { status: 200, headers })
  } catch {
    return s3Error("NoSuchKey", "NoSuchKey", 404)
  }
})

// PUT /s3/{bucket}/{key} → PutObject
s3Router.put("/*", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  // 写操作必须持有 WRITE_CONTENT 权限位（管理员放行）。
  // 历史缺陷：只判断「是否登录」，任何已认证用户（含只读用户）都能上传。
  if (!canWrite(user)) {
    return s3Error("AccessDenied", "Write permission required", 403)
  }
  const { bucket, key } = parseS3Path(c)
  if (!isValidS3Bucket(bucket) || !key) {
    return s3Error("InvalidArgument", "Invalid bucket/key", 400)
  }
  const virtualPath = s3VirtualPath(user, bucket, key)
  if (!isWithinUserRoot(user, virtualPath)) return outOfScope(c)
  try {
    const buffer = Buffer.from(await c.req.arrayBuffer())
    await putItem(virtualPath, buffer, getCtx(c))
    return new Response(null, {
      status: 200,
      headers: { ETag: `"${Date.now().toString(16)}"` },
    })
  } catch (e: any) {
    return s3Error("InternalError", safeErrorMessage(e), 500)
  }
})

// DELETE /s3/{bucket}/{key} → DeleteObject
s3Router.delete("/*", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  // 删除操作必须持有 DELETE 权限位（管理员放行）。
  if (!canRemove(user)) {
    return s3Error("AccessDenied", "Delete permission required", 403)
  }
  const { bucket, key } = parseS3Path(c)
  if (!isValidS3Bucket(bucket) || !key) {
    return s3Error("InvalidArgument", "Invalid bucket/key", 400)
  }
  const virtualPath = s3VirtualPath(user, bucket, key)
  if (!isWithinUserRoot(user, virtualPath)) return outOfScope(c)
  // 以目标对象自身的虚拟路径为基准拆出父目录与文件名，避免 bucket 边界下的错位
  const slash = virtualPath.lastIndexOf("/")
  const dir = slash > 0 ? virtualPath.slice(0, slash) : "/"
  const name = virtualPath.slice(slash + 1)
  try {
    await removeItems(dir, [name], getCtx(c))
    return new Response(null, { status: 204 })
  } catch (e: any) {
    return s3Error("NoSuchKey", safeErrorMessage(e), 404)
  }
})
