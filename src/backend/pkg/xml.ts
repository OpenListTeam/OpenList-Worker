/**
 * XML generation utilities for OpenList protocols (WebDAV, S3).
 */

/**
 * XML 文本内容转义。
 *
 * RFC 4918 §8.3.1 的提醒：「a legal URI may still contain characters that
 * need to be escaped within XML character data, such as the ampersand
 * character.」—— 也就是说 URI 本身合法（`&` 是 path 的合法字符）并不代表能
 * 直接写进 XML 文本，裸 `&` 会让 <d:href> 变成非法 XML。
 *
 * 自身 href 来自 URL.pathname（已百分号编码），再对它做百分号编码会造成双重
 * 编码（%20 -> %2520），因此这一路只能做 XML 转义；子项名是解码后的原文，
 * 走另一条路（逐段百分号编码）。两路不可混用。
 */
function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * 逐段百分号编码单个 WebDAV 路径段。
 *
 * 为什么不能用 encodeDownloadPath：它按 Go 的 EncodePath 保留 `$&+,:;=@`，
 * 其中 `&` 放进 XML 文本必须转义。这里用 encodeURIComponent，它会把
 * `& < > " ? # %` 空格与非 ASCII 全部编码。
 *
 * 为什么必须逐段而不是整条 encodeURIComponent：整条会把分隔符 `/` 编码成
 * %2F，路径层级就没了。
 *
 * 非法 UTF-16（孤立代理项）会让 encodeURIComponent 抛 URIError，因此 try
 * 兜底，绝不因编码失败把整个 PROPFIND 打成 500。
 */
function encodeDavPathSegment(segment: string): string {
  try {
    return encodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * 集合 href 必须以 / 结尾（RFC 4918 §8.3：Identifiers for collections
 * SHOULD end in a '/' character）。
 */
function asCollectionHref(requestPath: string): string {
  return requestPath.endsWith("/") ? requestPath : requestPath + "/"
}

/**
 * 构造子项 href：<自身 collection href> + 逐段编码的名称，目录再补一个 /。
 */
export function buildDavChildHref(
  collectionHref: string,
  name: string,
  isCollection: boolean,
): string {
  return (
    asCollectionHref(collectionHref) +
    encodeDavPathSegment(name) +
    (isCollection ? "/" : "")
  )
}

export interface WebDavItem {
  name: string
  size: number
  isFolder: boolean
  modified: string
}

/**
 * 生成 PROPFIND 的 207 Multi-Status 响应体。
 *
 * @param requestPath 被请求资源的**请求路径**（`URL.pathname`，已百分号编码）。
 *   RFC 4918 §8.3 允许两种形态二选一：相对引用（path-absolute，客户端按
 *   Request-URI 解析）或完整 absolute-URI；§8.3.1 的示例里 `'/sample/'` 与
 *   `'http://example.com/sample/'` 都合法。本实现选**相对引用**，理由：
 *     1. 与请求路径天然一致，满足 §8.3「MUST NOT have prefixes that do not
 *        match the Request-URI」；
 *     2. 挂载在子路径（如 /list/dav）时自动正确，不必硬编码挂载点；
 *     3. 不回显 Host 头，避免 Host 注入把攻击者域名写进客户端的解析结果。
 *   §8.3 要求「同一个 Multi-Status 响应内所有 href 格式必须一致」，因此这里
 *   自身与子项统一用相对引用。
 * @param items 直接子项
 */
export function generateWebDavXml(
  requestPath: string,
  items: WebDavItem[],
): string {
  const selfHref = escapeXml(asCollectionHref(requestPath))

  let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`
  xml += `<d:multistatus xmlns:d="DAV:">\n`

  // 被请求的资源本身：PROPFIND 在本实现中总是列目录，故按集合输出
  xml += `  <d:response>\n`
  xml += `    <d:href>${selfHref}</d:href>\n`
  xml += `    <d:propstat>\n`
  xml += `      <d:prop>\n`
  xml += `        <d:resourcetype><d:collection/></d:resourcetype>\n`
  xml += `        <d:getlastmodified>${new Date().toUTCString()}</d:getlastmodified>\n`
  xml += `      </d:prop>\n`
  xml += `      <d:status>HTTP/1.1 200 OK</d:status>\n`
  xml += `    </d:propstat>\n`
  xml += `  </d:response>\n`

  // 直接子项
  for (const item of items) {
    const itemHref = escapeXml(
      buildDavChildHref(requestPath, item.name, item.isFolder),
    )
    xml += `  <d:response>\n`
    xml += `    <d:href>${itemHref}</d:href>\n`
    xml += `    <d:propstat>\n`
    xml += `      <d:prop>\n`
    if (item.isFolder) {
      xml += `        <d:resourcetype><d:collection/></d:resourcetype>\n`
    } else {
      xml += `        <d:resourcetype/>\n`
      xml += `        <d:getcontentlength>${item.size}</d:getcontentlength>\n`
      xml += `        <d:getcontenttype>application/octet-stream</d:getcontenttype>\n`
    }
    const dateStr = item.modified
      ? new Date(item.modified).toUTCString()
      : new Date().toUTCString()
    xml += `        <d:getlastmodified>${dateStr}</d:getlastmodified>\n`
    xml += `      </d:prop>\n`
    xml += `      <d:status>HTTP/1.1 200 OK</d:status>\n`
    xml += `    </d:propstat>\n`
    xml += `  </d:response>\n`
  }

  xml += `</d:multistatus>`
  return xml
}