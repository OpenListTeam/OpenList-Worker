import { Hono } from "hono"
import { authUserFromReq } from "./auth"
import {
  listItems,
  getItem,
  putItem,
  removeItems,
} from "../internal/op/storage"
import { safeErrorMessage } from "../pkg/errs"

/**
 * S3 网关（简化版，挂载于 /s3/*）。
 *
 * 协议：支持 ListBuckets / GetObject / HeadObject / PutObject / DeleteObject，
 * 认证采用 Bearer token（与全局 token 一致）；完整 AWS SigV4 签名验证作为
 * 后续增强（Worker 环境 S3 网关性能受限，优先保证 API 契约一致）。
 *
 * URL 结构：/s3/{bucket}/{objectKey}，bucket 映射到存储挂载路径。
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

/** bucket 名 → 挂载路径（bucket 即存储挂载点的首段） */
function bucketToPath(bucket: string): string {
  if (!bucket) return "/"
  return "/" + bucket
}

async function authUser(c: any): Promise<any | null> {
  const auth = await authUserFromReq(c)
  return auth ? auth.user : null
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

// GET /s3/ → ListBuckets
s3Router.get("/", async (c) => {
  const user = await authUser(c)
  if (!user) return s3Error("AccessDenied", "Authentication required", 403)
  try {
    const res = await listItems("/", getCtx(c))
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
  if (!bucket || !key) return s3Error("NoSuchKey", "NoSuchKey", 404)
  const virtualPath = `/${bucket}/${key}`
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
    const { item } = await getItem(`/${bucket}/${key}`, getCtx(c))
    if (!item || item.is_dir) return s3Error("NoSuchKey", "NoSuchKey", 404)
    const headers: Record<string, string> = {
      "Content-Length": String(item.size || 0),
      "Content-Type": item.type || "application/octet-stream",
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
  const { bucket, key } = parseS3Path(c)
  if (!bucket || !key) return s3Error("InvalidArgument", "Invalid bucket/key", 400)
  try {
    const buffer = Buffer.from(await c.req.arrayBuffer())
    await putItem(`/${bucket}/${key}`, buffer, getCtx(c))
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
  const { bucket, key } = parseS3Path(c)
  if (!bucket || !key) return s3Error("InvalidArgument", "Invalid bucket/key", 400)
  const idx = key.lastIndexOf("/")
  const dir = idx >= 0 ? `/${bucket}/${key.slice(0, idx)}` : `/${bucket}`
  const name = idx >= 0 ? key.slice(idx + 1) : key
  try {
    await removeItems(dir, [name], getCtx(c))
    return new Response(null, { status: 204 })
  } catch (e: any) {
    return s3Error("NoSuchKey", safeErrorMessage(e), 404)
  }
})
