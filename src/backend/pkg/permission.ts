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
 * 计算用户请求路径对应的实际存储路径（结合用户的根目录 base_path）：
 * 1. 忽略以 /@s 开头的分享虚拟路径
 * 2. 若用户 base_path 为空或 "/"，直接返回规范化后的 reqPath
 * 3. 若用户 base_path 为非空路径（如 "/photos"），将 reqPath 拼接到 base_path 之后：
 *    - reqPath = "/" 或 "" -> "/photos"
 *    - reqPath = "/sub" -> "/photos/sub"
 *    - reqPath = "sub" -> "/photos/sub"
 */
export function getActualPath(
  user?: UserPermissionObj | null,
  reqPath: string = "/",
): string {
  const p = reqPath || "/"
  if (p.startsWith("/@s")) {
    return p
  }

  let basePath = (user?.base_path || "/").trim()
  if (!basePath || basePath === "/") {
    return p.startsWith("/") ? p : `/${p}`
  }

  if (!basePath.startsWith("/")) {
    basePath = `/${basePath}`
  }
  if (basePath.endsWith("/") && basePath.length > 1) {
    basePath = basePath.replace(/\/+$/, "")
  }

  const cleanReq = p.startsWith("/") ? p : `/${p}`
  if (cleanReq === "/") {
    return basePath
  }

  return `${basePath}${cleanReq}`
}
