export enum UserRole {
  GENERAL = 0,
  GUEST = 1,
  ADMIN = 2,
}

export const PermissionBit = {
  SEE_HIDES: 0, // 1 << 0 = 1
  ACCESS_WITHOUT_PASSWORD: 1, // 1 << 1 = 2
  OFFLINE_DOWNLOAD: 2, // 1 << 2 = 4
  WRITE_CONTENT: 3, // 1 << 3 = 8 (mkdir / upload)
  RENAME: 4, // 1 << 4 = 16
  MOVE: 5, // 1 << 5 = 32
  COPY: 6, // 1 << 6 = 64
  DELETE: 7, // 1 << 7 = 128
  WEBDAV_READ: 8, // 1 << 8 = 256
  WEBDAV_MANAGE: 9, // 1 << 9 = 512
  FTP_READ: 10, // 1 << 10 = 1024
  FTP_MANAGE: 11, // 1 << 11 = 2048
  READ_ARCHIVES: 12, // 1 << 12 = 4096
  DECOMPRESS: 13, // 1 << 13 = 8192
  SHARE: 14, // 1 << 14 = 16384
  CUSTOMIZE_SHARE_ID: 15, // 1 << 15 = 32768
} as const

export interface UserPermissionObj {
  id?: number
  username?: string
  role: number
  permission: number
  disabled?: boolean
  base_path?: string
}

export function isGuest(user?: UserPermissionObj | null): boolean {
  return !user || user.role === UserRole.GUEST
}

export function isAdmin(user?: UserPermissionObj | null): boolean {
  return !!user && user.role === UserRole.ADMIN
}

export function isGeneral(user?: UserPermissionObj | null): boolean {
  return !!user && user.role === UserRole.GENERAL
}

export function can(
  user: UserPermissionObj | null | undefined,
  bitIndex: number,
): boolean {
  if (!user) return false
  if (user.disabled) return false
  if (isAdmin(user)) return true
  if (isGuest(user)) return false
  return ((user.permission >> bitIndex) & 1) === 1
}

export function canSeeHides(user?: UserPermissionObj | null): boolean {
  return can(user, PermissionBit.SEE_HIDES)
}

export function canWrite(user?: UserPermissionObj | null): boolean {
  return can(user, PermissionBit.WRITE_CONTENT)
}

export function canRename(user?: UserPermissionObj | null): boolean {
  return can(user, PermissionBit.RENAME)
}

export function canMove(user?: UserPermissionObj | null): boolean {
  return can(user, PermissionBit.MOVE)
}

export function canCopy(user?: UserPermissionObj | null): boolean {
  return can(user, PermissionBit.COPY)
}

export function canRemove(user?: UserPermissionObj | null): boolean {
  return can(user, PermissionBit.DELETE)
}

/**
 * 规范化路径段：合并重复斜杠、丢弃 "."，并用栈折叠 ".."。
 *
 * 关键点：栈为空时的 ".." 会被**钳制在根**（`stack.pop()` 作用于空数组是
 * 空操作），因此结果永远以 "/" 开头且不含 ".." 段，无法向上逃逸。
 */
export function normalizeSegments(p: string): string {
  const stack: string[] = []
  for (const seg of String(p || "").split("/")) {
    if (!seg || seg === ".") continue
    if (seg === "..") {
      stack.pop()
      continue
    }
    stack.push(seg)
  }
  return "/" + stack.join("/")
}

/**
 * 计算用户请求路径对应的实际存储路径（结合用户的根目录 base_path）：
 * 1. 忽略以 /@s 开头的分享虚拟路径
 * 2. 若用户 base_path 为空或 "/"，直接返回规范化后的 reqPath
 * 3. 若用户 base_path 为非空路径（如 "/photos"），将 reqPath 拼接到 base_path 之后：
 *    - reqPath = "/" 或 "" -> "/photos"
 *    - reqPath = "/sub" -> "/photos/sub"
 *    - reqPath = "sub" -> "/photos/sub"
 *
 * 安全不变量（必须长期保持）：**返回值只可能等于 base_path 或位于其下**。
 * 历史缺陷：本函数只做字符串拼接，`..` 段留给下游 resolvePath() 折叠。于是
 * `/photos/alice` + `/../bob/x` 会解析成 `/photos/bob/x` —— 用户根目录被越过。
 * 因为拼接后才规范化，下游只保证「不逃出存储物理根」，并不保证「不逃出用户
 * 根」，两者不是同一约束。这里先把 reqPath 折叠到根再拼接，从源头保证隔离。
 *
 * 注意：不额外增加 decodeURIComponent 次数。上游按约定只解码一次，多次解码会
 * 改变合法 `%2f`/百分号字面量的含义（与 Go 的 EncodePath 契约冲突）。
 */
export function getActualPath(
  user?: UserPermissionObj | null,
  reqPath: string = "/",
): string {
  const p = reqPath || "/"
  if (p.startsWith("/@s")) {
    return p
  }

  const basePath = normalizeSegments((user?.base_path || "/").trim() || "/")
  if (basePath === "/") {
    return normalizeSegments(p)
  }

  const cleanReq = normalizeSegments(p)
  if (cleanReq === "/") {
    return basePath
  }

  return `${basePath}${cleanReq}`
}

/**
 * 判断某个实际路径是否位于用户根目录之内（含等于根目录本身）。
 *
 * 供网关类入口（S3 / WebDAV）在把请求路径交给存储层之前做二次确认使用：
 * 这些入口直接操作「全局虚拟路径」，不走 getActualPath 的拼接语义，因此需要
 * 一个显式的范围检查，避免受限用户越出 base_path。
 */
export function isWithinUserRoot(
  user: UserPermissionObj | null | undefined,
  actualPath: string,
): boolean {
  const root = getActualPath(user, "/")
  const target = normalizeSegments(actualPath)
  if (root === "/") return true
  return target === root || target.startsWith(root + "/")
}
