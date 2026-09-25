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
 * Normalize a virtual path exactly the way resolvePath() does
 * (decode loop, separator / dot-run collapsing) and then collapse
 * "." / ".." segments with the same stack rules (a leading ".." that
 * pops an empty stack is clamped to the root instead of escaping
 * upward).
 *
 * Keeping both implementations in lockstep is essential: resolvePath
 * decodes the path *after* base_path concatenation happened here, so
 * any encoded traversal ("%2e%2e", "%2f", "....", ...) must already be
 * folded away at this layer — otherwise it would only surface (and
 * escape) inside resolvePath.
 */
function normalizeAndCollapse(path: string): string {
  let p = String(path || "")

  // Mirror resolvePath step 1+2: decode until stable (initial decode +
  // up to 3 more rounds) to defeat single/double-encoded traversal.
  try {
    p = decodeURIComponent(p)
  } catch {
    // keep raw value on malformed input
  }
  let prev = ""
  let attempts = 0
  while (p !== prev && attempts < 3) {
    prev = p
    try {
      const decoded = decodeURIComponent(p)
      if (decoded === p) break
      p = decoded
      attempts++
    } catch {
      break
    }
  }

  // Mirror resolvePath step 3: separator and dot-run normalization.
  p = p
    .replace(/\\/g, "/")
    .replace(/%5c/gi, "/")
    .replace(/%2f/gi, "/")
    .replace(/\.{3,}/g, "..")
    .replace(/\/+/g, "/")

  // Mirror resolvePath step "Normalize .. / .": stack folding.
  const stack: string[] = []
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue
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
 * 4. 拼接后折叠 "." / ".." 段（安全加固）：任何逃出 base_path 边界的请求
 *    （如 base_path="/x" 时的 "/../secret"）都被钳制回用户根目录，
 *    防止用户通过 .. 段越权访问其他存储挂载点。
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
  // Guard against a misconfigured base_path that itself contains "..".
  basePath = normalizeAndCollapse(basePath) || "/"

  const cleanReq = p.startsWith("/") ? p : `/${p}`
  if (cleanReq === "/") {
    return basePath
  }

  // FIX(P0): 拼接后按 resolvePath 同样的规则（解码 + 规范化 + 折叠）收敛。
  // 此前仅做字符串拼接，"/x/../secret"、"/%2e%2e/secret"、"sub%2f..%2f.." 等
  // 会在 resolvePath 的解码/折叠中把 base_path 前缀"弹掉"，导致 base_path
  // 监禁被完全绕过（跨存储越权读/写/删）。
  const joined = normalizeAndCollapse(`${basePath}${cleanReq}`)
  if (joined === basePath || joined.startsWith(`${basePath}/`)) {
    return joined
  }
  // Escaped the user base path (e.g. "/x/../secret" -> "/secret"):
  // clamp back to the user root instead of leaking outside storage.
  return basePath
}
