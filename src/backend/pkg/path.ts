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

export function normalizePathSegments(input: string): string {
  const stack: string[] = []
  for (const seg of String(input || "")
    .replace(/\\/g, "/")
    .split("/")) {
    if (!seg || seg === ".") continue
    if (seg === ".." || /^\.{3,}$/.test(seg)) {
      stack.pop()
      continue
    }
    stack.push(seg)
  }
  return "/" + stack.join("/")
}

export function normalizeVirtualPath(input: string): string {
  return normalizePathSegments(decodePathForMatching(input))
}
