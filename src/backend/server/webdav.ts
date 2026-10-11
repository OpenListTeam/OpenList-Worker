import { Hono } from "hono"
import { authUserFromReq, getOrInitUsers, verifyUserPassword } from "./auth"
import { can, PermissionBit } from "../pkg/permission"
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

/** WebDAV 挂载前缀。必须与 index.ts 里 `app.route("/dav", webdavRouter)` 一致。 */
const DAV_MOUNT = "/dav"

/**
 * 取请求路径（已百分号编码），作为 href 的基准。
 *
 * RFC 4918 §8.3：href 要么是相对引用（客户端按 Request-URI 解析），要么是完整
 * URI；§8.3.1 的示例里两者都合法。用相对引用时 href 必须与 Request-URI 前缀
 * 一致，因此基准取真实请求路径而非硬编码的挂载前缀 —— 挂在子路径下
 * （/list/dav）时也自动正确，且不回显 Host 头。
 */
function davRequestPath(c: any): string {
  return new URL(c.req.url).pathname
}

/** 从 URL pathname 中剥离挂载前缀，得到虚拟文件路径（仅用于存储层寻址） */
function davPathOf(c: any): string {
  const pathname = davRequestPath(c)
  let p = pathname
  // 只在前缀真正匹配时才剥离：不能像 slice(DAV_MOUNT.length) 那样无条件截断，
  // 否则挂在子路径下会把 /list/dav/x 截成 /t/dav/x。
  if (p === DAV_MOUNT || p.startsWith(DAV_MOUNT + "/")) {
    p = p.slice(DAV_MOUNT.length)
  }
  if (!p) p = "/"
  if (!p.startsWith("/")) p = "/" + p
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
  const davPath = davPathOf(c)
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
        const res = await listItems(davPath, ctx)
        const items = (res.content || []).map((it: any) => ({
          name: it.name,
          size: it.size || 0,
          isFolder: !!it.is_dir,
          modified: it.modified || new Date().toISOString(),
        }))
        // davPathOf 已剥掉挂载前缀，那是给存储层寻址用的；href 必须反映真实请求
        // 路径。少了挂载前缀，rclone / Windows 资源管理器会因「返回的 href 与请求
        // 路径对不上」丢弃全部记录（能下载但列不出目录）。见 Issue #104。
        const xml = buildWebDavPropfindResponse(davRequestPath(c), items)
        return c.body(xml, depth === "0" ? 207 : 207, {
          "Content-Type": "application/xml; charset=utf-8",
        })
      }

      case "GET":
      case "HEAD": {
        if (!canRead) return c.text("Forbidden", 403)
        const { item, rawUrl } = await getItem(davPath, ctx)
        if (!item) return c.text("Not found", 404)
        if (item.is_dir) return c.text("Is a directory", 400)
        // 重定向到 rawRouter 实际下载；rawRouter 已处理所有驱动的下载协议
        // （proxy/redirect/stream + Range + SSRF 防护）。
        //
        // 端点前缀（/p 还是 /d）与路径编码都由 getItem 决定（见
        // op/storage.ts resolveRawUrlPrefix）：/p 受 Go canProxy() 限制，未开启
        // 代理的存储会 403 proxy not allowed，因此不能在这里硬编码 /p。
        return c.redirect(
          rawUrl || `/api/d${encodeDownloadPath(davPath)}`,
          302,
        )
      }

      case "PUT": {
        if (!canManage) return c.text("Forbidden", 403)
        const buffer = Buffer.from(await c.req.arrayBuffer())
        await putItem(davPath, buffer, ctx)
        return c.body(null, 201)
      }

      case "MKCOL": {
        if (!canManage) return c.text("Forbidden", 403)
        await makeDirectory(davPath, ctx)
        return c.body(null, 201)
      }

      case "DELETE": {
        if (!canManage) return c.text("Forbidden", 403)
        const { dir, name } = splitPath(davPath)
        await removeItems(dir, [name], ctx)
        return c.body(null, 204)
      }

      case "MOVE": {
        if (!canManage) return c.text("Forbidden", 403)
        const destRaw = c.req.header("Destination") || ""
        let dest = destRaw
        try {
          // 与 davPathOf 同样的前缀守卫：Destination 未挂载在 DAV_MOUNT 下时
          // 原样保留，不做无意义的前缀改写
          dest = decodeURIComponent(new URL(destRaw, c.req.url).pathname)
          if (dest === DAV_MOUNT || dest.startsWith(DAV_MOUNT + "/")) {
            dest = dest.slice(DAV_MOUNT.length) || "/"
          }
          if (!dest.startsWith("/")) dest = "/" + dest
        } catch {}
        const src = splitPath(davPath)
        const dst = splitPath(dest)
        await moveItems(src.dir, dst.dir, [src.name], ctx)
        return c.body(null, 201)
      }

      case "COPY": {
        if (!canManage) return c.text("Forbidden", 403)
        const destRaw = c.req.header("Destination") || ""
        let dest = destRaw
        try {
          // 与 davPathOf 同样的前缀守卫：Destination 未挂载在 DAV_MOUNT 下时
          // 原样保留，不做无意义的前缀改写
          dest = decodeURIComponent(new URL(destRaw, c.req.url).pathname)
          if (dest === DAV_MOUNT || dest.startsWith(DAV_MOUNT + "/")) {
            dest = dest.slice(DAV_MOUNT.length) || "/"
          }
          if (!dest.startsWith("/")) dest = "/" + dest
        } catch {}
        const src = splitPath(davPath)
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
