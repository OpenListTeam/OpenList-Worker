/**
 * 路径编码工具（对齐 Go pkg/utils/path.go）。
 *
 * 独立成文件是为了让 internal/op/storage.ts 这类底层模块能直接引用，
 * 而不必把 pkg/utils 的整条依赖链（hono / model/db / 其他子模块）拉进来，
 * 避免 storage → utils → db → storage 的循环导入。
 */

/**
 * 逐段百分号编码下载路径（对齐 Go pkg/utils.EncodePath(path, true)）。
 *
 * Go 用的是 url.PathEscape 的 encodePath 模式：非保留字符 A-Za-z0-9-._~
 * 与子分隔符 $&+,:;=@ 原样保留，其余（`%`、`?`、`#`、空格、非 ASCII 等）
 * 逐字节百分号编码；路径分隔符 `/` 保留（Go 先按段切分再编码，结果相同）。
 *
 * 为什么下载链接必须编码：raw_url 会被前端原样当 href/src 使用
 *   - 路径里未编码的 `?` / `#` 会被浏览器当成 query / fragment 截断；
 *   - 路径里出现裸 `%`（如 "100%.txt"）会让服务端 decodeURIComponent 抛
 *     URIError（raw.ts 的路径解析），而 Go 因编码了 `%` 不会遇到。
 */
export function encodeDownloadPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return p.replace(/[^A-Za-z0-9\-_.~$&+,:;=@/]/gu, (ch) => {
    try {
      return encodeURIComponent(ch)
    } catch {
      // 孤立代理项等非法 UTF-16：原样保留，绝不因编码失败抛错
      return ch
    }
  })
}

export function decodePathForMatching(input: string): string {
  let path = String(input || "")
  for (let i = 0; i < 3; i++) {
    let decoded: string
    try {
      decoded = decodeURIComponent(path)
    } catch {
      break
    }
    if (decoded === path) break
    path = decoded
  }
  return path
}

export interface CanonicalizePathOptions {
  /** 遇到 `.` / `..` / `...` 段直接抛错，而不是折叠（分享路径等不允许相对段） */
  rejectTraversal?: boolean
  /** 拒绝 NUL / CR / LF / TAB 等控制字符 */
  rejectIllegalChars?: boolean
  /** 拒绝 Windows 盘符与 UNC 前缀（`C:` / `//server`） */
  rejectAbsolute?: boolean
  /** 规范化后的最大段数（超出则抛错） */
  maxDepth?: number
}

/** 统一的路径折叠实现（输入已解码且反斜杠已归一）。 */
function foldPathSegments(
  input: string,
  opts: CanonicalizePathOptions = {},
): string {
  if (opts.rejectIllegalChars) {
    for (const ch of ["\0", "\r", "\n", "\t"]) {
      if (input.includes(ch)) {
        throw new Error(
          `invalid path: illegal character detected (0x${ch.charCodeAt(0).toString(16)})`,
        )
      }
    }
  }
  if (opts.rejectAbsolute) {
    if (/^[A-Za-z]:/.test(input)) {
      throw new Error("invalid path: absolute Windows path not allowed")
    }
    if (input.startsWith("//")) {
      throw new Error("invalid path: UNC path not allowed")
    }
  }

  const stack: string[] = []
  for (const seg of input.split("/")) {
    if (!seg) continue
    if (seg === "." || seg === ".." || /^\.{3,}$/.test(seg)) {
      if (opts.rejectTraversal) {
        throw new Error("invalid path: traversal segment not allowed")
      }
      if (seg !== ".") stack.pop()
      continue
    }
    stack.push(seg)
  }
  if (opts.maxDepth !== undefined && stack.length > opts.maxDepth) {
    throw new Error("invalid path: exceeds maximum depth")
  }
  return "/" + stack.join("/")
}

/**
 * 向后兼容：只折叠段，不做 URL 解码（调用方已解码时使用）。
 * 空段与 `.` 被丢弃，`..` 向上弹栈但不会逃出根。
 */
export function normalizePathSegments(input: string): string {
  return foldPathSegments(String(input || "").replace(/\\/g, "/"))
}

/**
 * 统一路径规范化入口：URL 解码（最多 3 次）→ 反斜杠归一 → 段折叠。
 *
 * 默认行为与旧 normalizeVirtualPath 一致（宽松折叠，不抛错）；需要
 * 「解析即拒绝」的调用方（resolvePath / share）显式打开 reject* 选项，
 * 避免各模块各写一套解码与校验逻辑而产生绕过差异。
 */
export function canonicalizeVirtualPath(
  input: string,
  opts: CanonicalizePathOptions = {},
): string {
  return foldPathSegments(
    decodePathForMatching(String(input || "")).replace(/\\/g, "/"),
    opts,
  )
}

export const DEFAULT_MAX_PATH_DEPTH = 128

/**
 * 虚拟路径最大段数（环境变量 MAX_PATH_DEPTH，非法值回退默认 128）。
 * 在 resolvePath / 分享路径等请求边界启用，防止构造超深路径消耗栈/内存。
 */
export function getMaxPathDepth(env?: any): number {
  const e = env && typeof env === "object" ? env : {}
  const raw =
    e.MAX_PATH_DEPTH !== undefined &&
    e.MAX_PATH_DEPTH !== null &&
    String(e.MAX_PATH_DEPTH) !== ""
      ? e.MAX_PATH_DEPTH
      : typeof process !== "undefined"
        ? process.env?.MAX_PATH_DEPTH
        : undefined
  if (raw === undefined || raw === null || String(raw).trim() === "")
    return DEFAULT_MAX_PATH_DEPTH
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MAX_PATH_DEPTH
  return n
}

export function normalizeVirtualPath(input: string): string {
  return canonicalizeVirtualPath(input)
}
