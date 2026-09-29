import { Hono } from "hono"
import { authUserFromReq, getOrInitUsers, verifyUserPassword } from "./auth"
import {
  can,
  getActualPath,
  isWithinUserRoot,
  PermissionBit,
} from "../pkg/permission"
import {
  listItems,
  getItem,
  putItem,
  makeDirectory,
  removeItems,
  moveItems,
  copyItems,
} from "../internal/op/storage"
import { buildWebDavPropfindResponse } from "../internal/webdav/webdav"
import { safeErrorMessage } from "../pkg/errs"
import { encodeDownloadPath } from "../pkg/path"

/**
 * WebDAV 协议服务（挂载于 /dav/*）。
 *
 * 认证：Basic Auth（用户名/密码）或 Bearer token（全局 token）。
 * 权限：WEBDAV_READ（读/列目录）与 WEBDAV_MANAGE（写/删/移动/复制）按位校验。
 * 支持方法：OPTIONS / PROPFIND / GET / HEAD / PUT / MKCOL / DELETE / MOVE / COPY。
 */

export const webdavRouter = new Hono()

const getStorageRequestContext = (c: any) => {
  try {
    const executionCtx = c.executionCtx
    if (!executionCtx || typeof executionCtx.waitUntil !== "function") {
      return undefined
    }
    return {
      waitUntil: (p: Promise<unknown>) => executionCtx.waitUntil(p),
      env: c.env, // 传递 env 用于请求级 KV 缓存复用
    }
  } catch {
    return undefined
  }
}

/** Basic Auth 或 Bearer token 认证，返回用户对象（未认证返回 null） */
async function webdavAuth(c: any): Promise<any> {
  const authHeader = c.req.header("Authorization") || ""
  if (authHeader.startsWith("Basic ")) {
    try {
      const decoded = atob(authHeader.substring(6).trim())
      const idx = decoded.indexOf(":")
      if (idx < 0) return null
      const username = decoded.substring(0, idx)
      const password = decoded.substring(idx + 1)
      const { users } = await getOrInitUsers(c.env)
      const user = users.find(
        (u: any) => u.username === username && !u.disabled,
      )
      if (!user) return null
      // 空密码用户（guest）：Basic Auth 下若未提供密码则允许（与 AList 一致）
      if (!user.password) {
        return password === "" ? user : null
      }
      if (await verifyUserPassword(user, password)) return user
      return null
    } catch {
      return null
    }
  }
  if (authHeader.startsWith("Bearer ")) {
    const auth = await authUserFromReq(c)
    return auth ? auth.user : null
  }
  return null
}

/** 从 URL pathname 中剥离 /dav 前缀，得到虚拟文件路径 */
function davPathOf(c: any): string {
  const pathname = new URL(c.req.url).pathname
  let p = pathname.replace(/^\/dav/, "")
  if (!p) p = "/"
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}

/** 拆分虚拟路径为 { dir, name } */
function splitPath(p: string): { dir: string; name: string } {
  const clean = p.startsWith("/") ? p : "/" + p
  const parts = clean.split("/").filter(Boolean)
  const name = parts.pop() || ""
  const dir = "/" + parts.join("/")
  return { dir, name }
}

/**
 * 把客户端可见的 DAV 路径映射为**该用户根目录之下**的实际存储路径。
 *
 * 语义：`/dav/` 就是该用户的根，`/dav/sub/x` 即其根下的 `sub/x`。
 * - 管理员/默认用户（base_path="/"）：路径原样返回，与历史行为完全一致；
 * - 受限 base_path 的用户：`/dav/sub` -> `<base_path>/sub`。
 *
 * 安全不变量：DAV 的源路径与 Destination 都必须经此映射，并在映射后做
 * isWithinUserRoot 复核。历史缺陷：DAV 全程直接操作全局虚拟路径，既未套用
 * base_path，也未做用户范围校验——实测「只有 WEBDAV_READ 权限、base_path 受限」
 * 的用户可以 PROPFIND 其他用户的目录。
 */
function scopedDavPath(user: any, davPath: string): string {
  const root = getActualPath(user, "/")
  if (root === "/") return davPath
  const rel = davPath === "/" ? "" : davPath.replace(/^\/+/, "")
  return rel ? `${root}/${rel}` : root
}

/** 解析 MOVE / COPY 的 Destination 头并映射到用户根之下 */
function destinationPath(c: any, user: any): string | null {
  const destRaw = c.req.header("Destination") || ""
  if (!destRaw) return null
  let dest = destRaw
  try {
    dest = decodeURIComponent(new URL(destRaw, c.req.url).pathname).replace(
      /^\/dav/,
      "",
    )
  } catch {
    return null
  }
  if (!dest) dest = "/"
  return scopedDavPath(user, dest.startsWith("/") ? dest : `/${dest}`)
}

webdavRouter.all("/*", async (c) => {
  const user = await webdavAuth(c)
  if (!user) {
    return c.text("Unauthorized", 401, {
      "WWW-Authenticate": 'Basic realm="OpenList"',
    })
  }
  const canRead = can(user, PermissionBit.WEBDAV_READ)
  const canManage = can(user, PermissionBit.WEBDAV_MANAGE)
  if (!canRead && !canManage) {
    return c.text("Forbidden", 403)
  }

  const method = c.req.method.toUpperCase()
  // davPath 是**客户端可见**路径（用于 href，不能把实际存储路径回显给客户端）；
  // actualPath 才是交给存储层的路径（已套用该用户的根目录）。
  const davPath = davPathOf(c)
  const actualPath = scopedDavPath(user, davPath)
  if (!isWithinUserRoot(user, actualPath)) return c.text("Forbidden", 403)
  const ctx = getStorageRequestContext(c)

  try {
    switch (method) {
      case "OPTIONS": {
        c.header("DAV", "1, 2")
        c.header(
          "Allow",
          "OPTIONS, PROPFIND, GET, HEAD, PUT, MKCOL, DELETE, MOVE, COPY",
        )
        c.header("MS-Author-Via", "DAV")
        return c.body(null, 200)
      }

      case "PROPFIND": {
        if (!canRead) return c.text("Forbidden", 403)
        const depth = c.req.header("Depth") || "1"
        const res = await listItems(actualPath, ctx)
        const items = (res.content || []).map((it: any) => ({
          name: it.name,
          size: it.size || 0,
          isFolder: !!it.is_dir,
          modified: it.modified || new Date().toISOString(),
        }))
        const href =
          davPath === "/"
            ? "/"
            : davPath.endsWith("/")
              ? davPath
              : davPath + "/"
        const xml = buildWebDavPropfindResponse(href, items)
        return c.body(xml, depth === "0" ? 207 : 207, {
          "Content-Type": "application/xml; charset=utf-8",
        })
      }

      case "GET":
      case "HEAD": {
        if (!canRead) return c.text("Forbidden", 403)
        const { item, rawUrl } = await getItem(actualPath, ctx)
        if (!item) return c.text("Not found", 404)
        if (item.is_dir) return c.text("Is a directory", 400)
        // 重定向到 rawRouter 实际下载；rawRouter 已处理所有驱动的下载协议
        // （proxy/redirect/stream + Range + SSRF 防护）。
        //
        // 端点前缀（/p 还是 /d）与路径编码都由 getItem 决定（见
        // op/storage.ts resolveRawUrlPrefix）：/p 受 Go canProxy() 限制，未开启
        // 代理的存储会 403 proxy not allowed，因此不能在这里硬编码 /p。
        return c.redirect(
          rawUrl || `/api/d${encodeDownloadPath(actualPath)}`,
          302,
        )
      }

      case "PUT": {
        if (!canManage) return c.text("Forbidden", 403)
        const buffer = Buffer.from(await c.req.arrayBuffer())
        await putItem(actualPath, buffer, ctx)
        return c.body(null, 201)
      }

      case "MKCOL": {
        if (!canManage) return c.text("Forbidden", 403)
        await makeDirectory(actualPath, ctx)
        return c.body(null, 201)
      }

      case "DELETE": {
        if (!canManage) return c.text("Forbidden", 403)
        const { dir, name } = splitPath(actualPath)
        await removeItems(dir, [name], ctx)
        return c.body(null, 204)
      }

      case "MOVE": {
        if (!canManage) return c.text("Forbidden", 403)
        // Destination 同样必须落在调用者根目录之内，否则可以把文件移出/移入他人目录
        const dest = destinationPath(c, user)
        if (!dest || !isWithinUserRoot(user, dest)) {
          return c.text("Forbidden", 403)
        }
        const src = splitPath(actualPath)
        const dst = splitPath(dest)
        await moveItems(src.dir, dst.dir, [src.name], ctx)
        return c.body(null, 201)
      }

      case "COPY": {
        if (!canManage) return c.text("Forbidden", 403)
        const dest = destinationPath(c, user)
        if (!dest || !isWithinUserRoot(user, dest)) {
          return c.text("Forbidden", 403)
        }
        const src = splitPath(actualPath)
        const dst = splitPath(dest)
        await copyItems(src.dir, dst.dir, [src.name], ctx)
        return c.body(null, 201)
      }

      case "LOCK":
      case "UNLOCK":
        // 简化实现：声明不支持锁，客户端通常可继续无锁操作
        return c.text("Locking not supported", 405)

      default:
        return c.text("Method Not Allowed", 405)
    }
  } catch (e: any) {
    const msg = safeErrorMessage(e)
    if (msg.includes("not found") || msg.includes("storage not found")) {
      return c.text("Not Found", 404)
    }
    return c.text(msg, 500)
  }
})
