import { Hono } from "hono"
import { authUserFromReq } from "./auth"
import {
  listItems,
  getItem,
  putItem,
  removeItems,
} from "../internal/op/storage"
import { safeErrorMessage } from "../pkg/errs"
import {
  canWrite,
  canRemove,
  getActualPath,
  isGuest,
} from "../pkg/permission"

/**
 * S3 网关（简化版，挂载于 /s3/*）。
 *
 * 协议：支持 ListBuckets / GetObject / HeadObject / PutObject / DeleteObject，
 * 认证采用 Bearer token（与全局 token 一致）；完整 AWS SigV4 签名验证作为
 * 后续增强（Worker 环境 S3 网关性能受限，优先保证 API 契约一致）。
 *
 * URL 结构：/s3/{bucket}/{objectKey}，bucket 映射到存储挂载路径。
 *
 * FIX(P0)：所有操作统一经过与 /api/fs/* 一致的授权链：
 * 1. 仅非 guest 的已认证用户可用；
 * 2. 写操作要求 WRITE_CONTENT / DELETE 权限位；
 * 3. 虚拟路径必须经 getActualPath() 收敛到用户 base_path 内，
 *    防止任意用户读/写/删整个虚拟文件系统。
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
  // 畸形 % 序列不得让网关 500：退回原始段。
  const safeDecode = (s: string) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  }
  const key = parts.slice(1).map(safeDecode).join("/")
  return { bucket, key }
}

/** bucket 名 → 挂载路径（bucket 即存储挂载点的首段） */
function bucketToPath(bucket: string): string {
  if (!bucket) return "/"
  return "/" + bucket
}

async function authUser(c: any): Promise<any | null> {
  const auth = await authUserFromReq(c)
  if (!auth) return null
  const user = auth.user
  // S3 网关仅面向实体用户（guest 无 token，防御性双保险）。
  if (isGuest(user)) return null
  return user
}

/** 将请求的虚拟路径收敛到用户 base_path 内 */
function resolveS3VirtualPath(user: any, virtualPath: string): string {
  return getActualPath(user, virtualPath)
}

const getCtx = (c: any) => {
  try {
    const ec = c.executionCtx
    return ec && typeof ec.waitUntil === "function"
      ? { waitUntil: (p: Promise<unknown>) => ec.waitUntil(p) }
      : undefined
  } catch {
    return undefined
  }
}

// ListBuckets：仅列出用户 base_path 内的一级目录。
// 注：Hono route 挂载后 GET /s3/（带尾斜杠）不会命中 get("/") 路由，
// 而是落到 get("/*")，因此抽成函数供两个路由共用。
async function listBuckets(c: any, user: any) {
  try {
    // FIX(P0)：bucket 列表收敛到用户 base_path 内。
    const res = await listItems(resolveS3VirtualPath(user, "/"), getCtx(c))
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
}

// GET /s3 → ListBuckets
s3Router.get("/", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  return listBuckets(c, user)
})

// GET /s3/{bucket}/{key} → GetObject
s3Router.get("/*", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  const { bucket, key } = parseS3Path(c)
  // GET /s3/（带尾斜杠）：无 bucket，视为 ListBuckets 请求。
  if (!bucket) return listBuckets(c, user)
  if (!key) return s3Error("NoSuchKey", "NoSuchKey", 404)
  // FIX(P0)：路径收敛到用户 base_path，禁止跨存储越权读取。
  const virtualPath = resolveS3VirtualPath(user, `/${bucket}/${key}`)
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
  if (!bucket || !key) return s3Error("NoSuchKey", "NoSuchKey", 404)
  try {
    const { item } = await getItem(
      resolveS3VirtualPath(user, `/${bucket}/${key}`),
      getCtx(c),
    )
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
  // FIX(P0)：上传需 WRITE_CONTENT 权限位，与 /api/fs/put 一致。
  if (!canWrite(user))
    return s3Error("AccessDenied", "Write permission required", 403)
  const { bucket, key } = parseS3Path(c)
  if (!bucket || !key) return s3Error("InvalidArgument", "Invalid bucket/key", 400)
  try {
    const buffer = Buffer.from(await c.req.arrayBuffer())
    await putItem(resolveS3VirtualPath(user, `/${bucket}/${key}`), buffer, getCtx(c))
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
  // FIX(P0)：删除需 DELETE 权限位，与 /api/fs/remove 一致。
  if (!canRemove(user))
    return s3Error("AccessDenied", "Delete permission required", 403)
  const { bucket, key } = parseS3Path(c)
  if (!bucket || !key) return s3Error("InvalidArgument", "Invalid bucket/key", 400)
  const idx = key.lastIndexOf("/")
  const resolvedDir = resolveS3VirtualPath(user, idx >= 0 ? `/${bucket}/${key.slice(0, idx)}` : `/${bucket}`)
  const dir = resolvedDir
  const name = idx >= 0 ? key.slice(idx + 1) : key
  try {
    await removeItems(dir, [name], getCtx(c))
    return new Response(null, { status: 204 })
  } catch (e: any) {
    return s3Error("NoSuchKey", safeErrorMessage(e), 404)
  }
})
