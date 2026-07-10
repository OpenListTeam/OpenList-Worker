import { Context } from "hono"
import { getDb } from "../internal/model/db"

/**
 * Common utilities for OpenList backend services.
 */

// Format byte sizes to human-readable strings
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Generate WebDAV XML properties response helper
export function generateWebDavXml(path: string, items: Array<{ name: string; size: number; isFolder: boolean; modified: string }>): string {
  let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`
  xml += `<d:multistatus xmlns:d="DAV:">\n`

  // Current folder description
  xml += `  <d:response>\n`
  xml += `    <d:href>${path}</d:href>\n`
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
    const dateStr = item.modified ? new Date(item.modified).toUTCString() : new Date().toUTCString()
    xml += `        <d:getlastmodified>${dateStr}</d:getlastmodified>\n`
    xml += `      </d:prop>\n`
    xml += `      <d:status>HTTP/1.1 200 OK</d:status>\n`
    xml += `    </d:propstat>\n`
    xml += `  </d:response>\n`
  }

  xml += `</d:multistatus>`
  return xml
}

// Generate S3 Bucket Listing XML helper
export function generateS3BucketListingXml(bucketName: string, items: Array<{ name: string; size: number; isFolder: boolean; modified: string }>): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">\n`
  xml += `  <Name>${bucketName}</Name>\n`
  xml += `  <Prefix></Prefix>\n`
  xml += `  <Marker></Marker>\n`
  xml += `  <MaxKeys>1000</MaxKeys>\n`
  xml += `  <IsTruncated>false</IsTruncated>\n`

  for (const item of items) {
    if (item.isFolder) {
      xml += `  <CommonPrefixes>\n`
      xml += `    <Prefix>${item.name}/</Prefix>\n`
      xml += `  </CommonPrefixes>\n`
    } else {
      xml += `  <Contents>\n`
      xml += `    <Key>${item.name}</Key>\n`
      xml += `    <LastModified>${new Date(item.modified).toISOString()}</LastModified>\n`
      xml += `    <ETag>"${Buffer.from(item.name).toString("hex").substring(0, 32)}"</ETag>\n`
      xml += `    <Size>${item.size}</Size>\n`
      xml += `    <StorageClass>STANDARD</StorageClass>\n`
      xml += `  </Contents>\n`
    }
  }

  xml += `</ListBucketResult>`
  return xml
}

// Check administrator authorization from context
export async function checkAdminAuth(c: Context): Promise<boolean> {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) return false
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader
  const db = await getDb()
  const tokenSetting = db.settings.find((s: any) => s.key === "token")
  if (tokenSetting && tokenSetting.value && token === tokenSetting.value) {
    return true
  }
  return false
}
