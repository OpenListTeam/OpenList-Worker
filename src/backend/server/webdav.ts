import { Hono } from "hono"
import {
  authUserFromReq,
  clearLoginFailures,
  getOrInitUsers,
  isLoginLocked,
  recordLoginFailure,
  verifyUserPassword,
} from "./auth"
import {
  can,
  canCopy,
  canMove,
  canRename,
  canWrite,
  getActualPath,
  isAdmin,
  isGuest,
  isWithinUserRoot,
  PermissionBit,
} from "../pkg/permission"
import {
  canAccess,
  canRead as canReadMeta,
  canWrite as canWriteMeta,
  canWriteContentBypassUserPerms,
  getNearestMeta,
} from "../pkg/meta"
import type { Meta } from "../pkg/meta"
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

/**
 * Basic Auth 或 Bearer token 认证。
 *
 * 返回 `{ user, metaPassword }`；未认证返回 null。
 *
 * `metaPassword` 对齐 Go WebDAVAuth：只有 guest 账号才会把 Basic 密码继续
 * 当作 meta 访问密码（Go: `if user.IsGuest() { MetaPassKey = password }`），
 * 普通用户一律为空 —— 目录级密码不能靠账号密码顺带绕过。
 */
async function webdavAuth(
  c: any,
): Promise<{ user: any; metaPassword: string } | null> {
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
        if (password !== "") return null
        return { user, metaPassword: isGuest(user) ? password : "" }
      }
      if (await verifyUserPassword(user, password)) {
        return { user, metaPassword: isGuest(user) ? password : "" }
      }
      return null
    } catch {
      return null
    }
  }
  if (authHeader.startsWith("Bearer ")) {
    const auth = await authUserFromReq(c)
    return auth ? { user: auth.user, metaPassword: "" } : null
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
    dest = decodeURIComponent(new URL(destRaw, c.req.url).pathname)
    // 与 davPathOf 同样的前缀守卫：Destination 未挂在 DAV_MOUNT 下时原样保留，
    // 不做无意义的前缀改写（否则挂在子路径下的部署会被截错）
    if (dest === DAV_MOUNT || dest.startsWith(DAV_MOUNT + "/")) {
      dest = dest.slice(DAV_MOUNT.length) || "/"
    }
  } catch {
    return null
  }
  if (!dest) dest = "/"
  return scopedDavPath(user, dest.startsWith("/") ? dest : `/${dest}`)
}

/**
 * 读操作的 meta 判定（对齐 Go webdav.go 各 handler 的 CanAccess 调用）：
 * 密码保护 + read_users 白名单。返回 true 表示拒绝。
 *
 * 安全不变量：WebDAV 与 /api/fs/* 必须共享同一套目录级访问控制，否则
 * 「站内被密码保护」的目录可以经 /dav 直接读走（跨协议权限旁路）。
 */
async function deniedByMetaRead(
  c: any,
  user: any,
  path: string,
  metaPassword: string,
): Promise<boolean> {
  let meta: Meta | null = null
  try {
    meta = await getNearestMeta(path, c.env)
  } catch {
    meta = null
  }
  if (!meta) return false
  return !canAccess(user, meta, path, metaPassword || "")
}

/**
 * 写操作的 meta 判定（对齐 Go webdav.go / file.go 的 CanWrite 调用）：
 *  - meta.write_users 白名单；
 *  - requireContentPerm 时还要求 WRITE_CONTENT 权限位，除非目标目录通过
 *    meta.write 强制开放（CanWriteContentBypassUserPerms）。
 * 返回 true 表示拒绝。
 */
async function deniedByMetaWrite(
  c: any,
  user: any,
  path: string,
  requireContentPerm: boolean,
): Promise<boolean> {
  let meta: Meta | null = null
  try {
    meta = await getNearestMeta(path, c.env)
  } catch {
    meta = null
  }
  if (!meta) return false
  if (isAdmin(user)) return false
  if (
    requireContentPerm &&
    !canWrite(user) &&
    !canWriteContentBypassUserPerms(meta, path)
  ) {
    return true
  }
  return !canWriteMeta(user, meta, path)
}

/**
 * meta 判定失败时的统一响应（403 + 一句指引）。
 *
 * WebDAV 没有传递「目录密码」的标准位置：与 Go 一致，只有 guest 账号会把
 * Basic 密码透传为 meta 密码，普通用户一律为空。因此普通用户访问密码保护的
 * 目录只会得到裸 403，容易被误判成账号权限问题而反复重试；这里补一句说明。
 *
 * 措辞刻意不区分「密码错误 / read_users / write_users」——不向调用方泄露
 * 具体是哪一类限制。
 */
const metaForbidden = (c: any) =>
  c.text(
    "Forbidden: directory-level access control denied this request " +
      "(meta password, read_users or write_users). WebDAV cannot carry a meta " +
      "password — open the path in the web UI, or use /api/fs/* with a password.",
    403,
  )

/**
 * 推导本次请求实际使用的挂载前缀（正规挂载为 `/dav`）。
 *
 * 不能直接硬编码 `/dav`：index.ts 会把**任意路径上**的 WebDAV 方法都交给本 router
 * （为兼容把用户填写的地址当 WebDAV 根、对 `/` 发 PROPFIND 的客户端），此时前缀为空。
 * PROPFIND 返回的 href 必须与本请求的 URL 结构一致，客户端才能匹配上。
 */
function davPrefixOf(c: any, davPath: string): string {
  const pathname = new URL(c.req.url).pathname
  const stripped = davPath === "/" ? "" : davPath
  return pathname.endsWith(stripped)
    ? pathname.slice(0, pathname.length - stripped.length)
    : ""
}

webdavRouter.all("/*", async (c) => {
  const method = c.req.method.toUpperCase()

  // OPTIONS 匿名放行（对齐 Go WebDAVAuth）：客户端需要先探测 DAV 能力，
  // 此时通常还没有可用凭据。
  if (method === "OPTIONS") {
    c.header("DAV", "1, 2")
    c.header(
      "Allow",
      "OPTIONS, PROPFIND, GET, HEAD, PUT, MKCOL, DELETE, MOVE, COPY",
    )
    c.header("MS-Author-Via", "DAV")
    return c.body(null, 200)
  }

  // 防爆破：与 /api/auth/login 共用同一套失败计数与锁定机制。
  // 对齐 Go：model.LoginCache 在 WebDAV 与登录接口之间共用（失败累加、
  // 达到阈值锁定）。历史缺陷：/dav 的 Basic Auth 可以无限次尝试密码。
  const authHeader = c.req.header("Authorization") || ""
  let basicUsername = ""
  if (authHeader.startsWith("Basic ")) {
    try {
      basicUsername = atob(authHeader.substring(6).trim()).split(":")[0] || ""
    } catch {
      basicUsername = ""
    }
    if (await isLoginLocked(c, basicUsername, c.env)) {
      return c.text("Too Many Requests", 429)
    }
  }

  const auth = await webdavAuth(c)
  if (!auth) {
    if (authHeader.startsWith("Basic ")) {
      await recordLoginFailure(c, basicUsername, c.env)
    }
    return c.text("Unauthorized", 401, {
      "WWW-Authenticate": 'Basic realm="OpenList"',
    })
  }
  if (authHeader.startsWith("Basic ")) {
    await clearLoginFailures(c, basicUsername, c.env)
  }
  const { user, metaPassword } = auth
  const canRead = can(user, PermissionBit.WEBDAV_READ)
  const canManage = can(user, PermissionBit.WEBDAV_MANAGE)
  if (!canRead && !canManage) {
    return c.text("Forbidden", 403)
  }

  // davPath 是**客户端可见**路径（用于 href，不能把实际存储路径回显给客户端）；
  // actualPath 才是交给存储层的路径（已套用该用户的根目录）。
  const davPath = davPathOf(c)
  const actualPath = scopedDavPath(user, davPath)
  if (!isWithinUserRoot(user, actualPath)) return c.text("Forbidden", 403)
  const ctx = getStorageRequestContext(c)

  try {
    switch (method) {
      case "PROPFIND": {
        if (!canRead) return c.text("Forbidden", 403)
        // 目录级访问控制（与 /api/fs/list 同一套判定）
        if (await deniedByMetaRead(c, user, actualPath, metaPassword)) {
          return metaForbidden(c)
        }
        const depth = c.req.header("Depth") || "1"
        const res = await listItems(actualPath, ctx)
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
        // 目录级访问控制（与 /api/fs/get 同一套判定）
        if (await deniedByMetaRead(c, user, actualPath, metaPassword)) {
          return metaForbidden(c)
        }
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
        // 对齐 Go webdav.go handlePut：目标所在目录需通过「写内容权限位或
        // meta.write 强制开放」+ meta.write_users 白名单
        if (await deniedByMetaWrite(c, user, splitPath(actualPath).dir, true)) {
          return metaForbidden(c)
        }
        const buffer = Buffer.from(await c.req.arrayBuffer())
        await putItem(actualPath, buffer, ctx)
        return c.body(null, 201)
      }

      case "MKCOL": {
        if (!canManage) return c.text("Forbidden", 403)
        // 对齐 Go webdav.go handleMkcol（与 PUT 同一套校验）
        if (await deniedByMetaWrite(c, user, splitPath(actualPath).dir, true)) {
          return metaForbidden(c)
        }
        await makeDirectory(actualPath, ctx)
        return c.body(null, 201)
      }

      case "DELETE": {
        if (!canManage) return c.text("Forbidden", 403)
        // 对齐 Go webdav.go handleDelete：目标自身的 meta.write_users 白名单
        if (await deniedByMetaWrite(c, user, actualPath, false)) {
          return metaForbidden(c)
        }
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
        // 对齐 Go webdav/file.go moveFiles：跨目录需要 MOVE 权限位、
        // 改名需要 RENAME 权限位；源/目标目录均需通过 meta 写判定
        if (src.dir !== dst.dir && !canMove(user)) {
          return c.text("Forbidden", 403)
        }
        if (src.name !== dst.name && !canRename(user)) {
          return c.text("Forbidden", 403)
        }
        if (
          (await deniedByMetaWrite(c, user, src.dir, false)) ||
          (await deniedByMetaWrite(c, user, dst.dir, false))
        ) {
          return metaForbidden(c)
        }
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
        // 对齐 Go webdav/file.go copyFiles：COPY 权限位 + 源目录可读
        // （read_users 白名单）+ 目标目录 meta 写判定
        if (!canCopy(user)) return c.text("Forbidden", 403)
        let srcMeta: Meta | null = null
        try {
          srcMeta = await getNearestMeta(src.dir, c.env)
        } catch {
          srcMeta = null
        }
        if (!canReadMeta(user, srcMeta, src.dir)) {
          return metaForbidden(c)
        }
        if (await deniedByMetaWrite(c, user, dst.dir, false)) {
          return metaForbidden(c)
        }
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
