/**
 * XML generation utilities for OpenList protocols (WebDAV, S3).
 */

/** XML 文本转义：href/路径等动态值必须转义后再插入，否则含 & < > 的目录名会产生非法 XML */
function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function generateWebDavXml(
  path: string,
  items: Array<{
    name: string
    size: number
    isFolder: boolean
    modified: string
  }>,
): string {
  let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`
  xml += `<d:multistatus xmlns:d="DAV:">\n`

  // Current folder description
  xml += `  <d:response>\n`
  xml += `    <d:href>${xmlEscape(path)}</d:href>\n`
  xml += `    <d:propstat>\n`
  xml += `      <d:prop>\n`
  xml += `        <d:resourcetype><d:collection/></d:resourcetype>\n`
  xml += `        <d:getlastmodified>${new Date().toUTCString()}</d:getlastmodified>\n`
  xml += `      </d:prop>\n`
  xml += `      <d:status>HTTP/1.1 200 OK</d:status>\n`
  xml += `    </d:propstat>\n`
  xml += `  </d:response>\n`

  // Children
  for (const item of items) {
    const itemHref = `${path}${path.endsWith("/") ? "" : "/"}${encodeURIComponent(item.name)}`
    xml += `  <d:response>\n`
    xml += `    <d:href>${xmlEscape(itemHref)}</d:href>\n`
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
