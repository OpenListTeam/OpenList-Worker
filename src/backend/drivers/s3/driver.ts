import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { S3Addition } from "./types"
import { S3Client } from "./util"

function s3KeyToName(key: string, prefix: string): string {
  // Remove trailing slash for directories
  let name = key
  if (prefix) {
    name = key.slice(prefix.length)
  }
  name = name.replace(/^\/+|\/+$/g, "")
  // Get last segment
  const parts = name.split("/")
  return parts[parts.length - 1] || name
}

function isDirectoryKey(key: string): boolean {
  return key.endsWith("/")
}

export function normalizeS3Addition(addition: any): S3Addition {
  if (!addition || typeof addition !== "object") {
    return {} as S3Addition
  }
  return {
    ...addition,
    endpoint: String(addition.endpoint || ""),
    region: String(addition.region || ""),
    bucket: String(addition.bucket || ""),
    access_key_id: String(addition.access_key_id || ""),
    secret_access_key: String(addition.secret_access_key || ""),
    session_token: addition.session_token
      ? String(addition.session_token)
      : undefined,
    root_folder_path: String(addition.root_folder_path || "/"),
    custom_host: addition.custom_host
      ? String(addition.custom_host)
      : undefined,
    sign_url_expire: Number(addition.sign_url_expire) || 4,
  }
}

export class S3Driver implements StorageDriver {
  private addition: S3Addition
  private client: S3Client
  private driverType: string

  constructor(addition: S3Addition, driverType: string = "S3") {
    this.addition = addition
    this.driverType = driverType
    this.client = new S3Client(addition)
  }

  async init(): Promise<void> {
    // Verify bucket access by attempting to list root.
    // Non-fatal: log warning but allow mount even if check fails (e.g. SSL issues).
    try {
      const useV2 = this.addition.list_object_version !== "v1"
      if (useV2) {
        await this.client.listObjects("/", undefined, 1)
      } else {
        await this.client.listObjectsV1("/", undefined, 1)
      }
    } catch (e: any) {
      console.warn("[S3] init warning (non-fatal):", e.message)
    }
  }

  private get rootPrefix(): string {
    const root = (this.addition.root_folder_path || "/").replace(
      /^\/+|\/+$/g,
      "",
    )
    return root ? `${root}/` : ""
  }

  private resolveS3Path(physicalPath: string): string {
    const rel = physicalPath.replace(/^\/+|\/+$/g, "")
    return rel ? `${this.rootPrefix}${rel}` : this.rootPrefix
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const s3Prefix = this.resolveS3Path(physicalPath)
    const useV2 = this.addition.list_object_version !== "v1"

    console.log(
      "[S3] list virtualPath:",
      _virtualPath,
      "physicalPath:",
      physicalPath,
      "s3Prefix:",
      s3Prefix,
      "rootPrefix:",
      this.rootPrefix,
    )

    const allItems: FileItem[] = []
    let continuationToken: string | undefined
    let isTruncated = true

    while (isTruncated) {
      let result
      if (useV2) {
        result = await this.client.listObjects(s3Prefix, continuationToken)
      } else {
        result = await this.client.listObjectsV1(s3Prefix, continuationToken)
      }

      // Process CommonPrefixes (directories)
      for (const cp of result.CommonPrefixes) {
        const name = s3KeyToName(cp.Prefix, this.rootPrefix)
        if (!name) continue
        allItems.push({
          name,
          size: 0,
          is_dir: true,
          modified: new Date().toISOString(),
          sign: "",
          type: 1,
          thumb: "",
          raw_url: "",
        })
      }

      // Process Contents (files)
      for (const obj of result.Contents) {
        if (obj.Key.endsWith("/")) continue // Skip directory markers
        const name = s3KeyToName(obj.Key, this.rootPrefix)
        if (!name) continue
        // Hide placeholder files (e.g. ".openlist") that mark empty directories
        const placeholder = (this.addition.placeholder || "").trim()
        if (name === ".openlist" || (placeholder && name === placeholder)) {
          continue
        }
        const isDir = isDirectoryKey(obj.Key)
        allItems.push({
          name,
          size: isDir ? 0 : obj.Size || 0,
          is_dir: isDir,
          modified: obj.LastModified
            ? new Date(obj.LastModified).toISOString()
            : new Date().toISOString(),
          sign: obj.ETag || "",
          type: calcFileType(name, isDir),
          thumb: "",
          raw_url: "",
        })
      }

      isTruncated = result.IsTruncated
      continuationToken = useV2
        ? result.NextContinuationToken
        : result.NextContinuationToken
    }

    return sortFileItems(allItems, "name", "asc")
  }

  async getFileStream(
    _virtualPath: string,
    physicalPath: string,
    range?: string,
  ): Promise<{ body: ReadableStream; headers: Record<string, string> } | null> {
    const s3Key = this.resolveS3Path(physicalPath).replace(/\/$/, "")
    return this.client.getObjectStream(s3Key, range)
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const s3Key = this.resolveS3Path(physicalPath)
    const name = s3KeyToName(s3Key, this.rootPrefix)

    // Check if it's a directory (try listing)
    if (!s3Key.endsWith("/")) {
      try {
        const dirResult = await this.client.listObjects(
          `${s3Key}/`,
          undefined,
          1,
        )
        if (
          dirResult.Contents.length > 0 ||
          dirResult.CommonPrefixes.length > 0
        ) {
          return {
            name,
            size: 0,
            is_dir: true,
            modified: new Date().toISOString(),
            sign: "",
            type: 1,
            thumb: "",
            raw_url: "",
          }
        }
      } catch {}
    }

    // Try as file
    try {
      const head = await this.client.headObject(s3Key.replace(/\/$/, ""))
      // Generate a presigned download URL so the client can fetch directly
      const { url } = await this.client.getDownloadUrl(
        s3Key.replace(/\/$/, ""),
        name,
      )
      return {
        name,
        size: head.contentLength,
        is_dir: false,
        modified: new Date(head.lastModified).toISOString(),
        sign: head.etag,
        type: calcFileType(name, false),
        thumb: "",
        raw_url: url,
      }
    } catch (e: any) {
      console.error(`[S3] get() failed for key=${s3Key}:`, e?.message || e)
      throw new Error(`Object not found: ${physicalPath} (${e?.message || e})`)
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const s3Key = this.resolveS3Path(physicalPath)
    // S3 doesn't have real directories; create a 0-byte object with trailing /
    await this.client.putObject(
      s3Key.endsWith("/") ? s3Key : `${s3Key}/`,
      new Uint8Array(0),
      "application/x-directory",
    )
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const srcKey = this.resolveS3Path(physicalPath)
    const parentDir = srcKey.split("/").slice(0, -1).join("/")
    const dstKey = parentDir ? `${parentDir}/${newName}` : newName

    // Check if source is directory
    if (srcKey.endsWith("/") || (await this.isDir(srcKey))) {
      // Copy all objects with new prefix
      await this.copyDirRecursive(srcKey, dstKey)
      await this.deleteDirRecursive(srcKey)
    } else {
      await this.client.copyObject(srcKey, dstKey)
      await this.client.deleteObject(srcKey)
    }
  }

  private async isDir(key: string): Promise<boolean> {
    try {
      const result = await this.client.listObjects(`${key}/`, undefined, 1)
      return result.Contents.length > 0 || result.CommonPrefixes.length > 0
    } catch {
      return false
    }
  }

  private async copyDirRecursive(
    srcPrefix: string,
    dstPrefix: string,
  ): Promise<void> {
    const src = srcPrefix.endsWith("/") ? srcPrefix : `${srcPrefix}/`
    const dst = dstPrefix.endsWith("/") ? dstPrefix : `${dstPrefix}/`

    let continuationToken: string | undefined
    let isTruncated = true

    while (isTruncated) {
      const result = await this.client.listObjects(src, continuationToken)

      for (const obj of result.Contents) {
        const relativeKey = obj.Key.slice(src.length)
        await this.client.copyObject(obj.Key, `${dst}${relativeKey}`)
      }

      isTruncated = result.IsTruncated
      continuationToken = result.NextContinuationToken
    }
  }

  private async deleteDirRecursive(key: string): Promise<void> {
    const prefix = key.endsWith("/") ? key : `${key}/`
    let continuationToken: string | undefined
    let isTruncated = true
    const keysToDelete: string[] = []

    while (isTruncated) {
      const result = await this.client.listObjects(prefix, continuationToken)

      for (const obj of result.Contents) {
        keysToDelete.push(obj.Key)
        if (keysToDelete.length >= 1000) {
          await this.client.deleteObjects(keysToDelete)
          keysToDelete.length = 0
        }
      }

      isTruncated = result.IsTruncated
      continuationToken = result.NextContinuationToken
    }

    if (keysToDelete.length > 0) {
      await this.client.deleteObjects(keysToDelete)
    }

    // Also delete the directory marker
    await this.client.deleteObject(prefix)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const s3Key = this.resolveS3Path(physicalPath)

    // Check if it's a directory
    if (s3Key.endsWith("/") || (await this.isDir(s3Key))) {
      await this.deleteDirRecursive(s3Key)
    } else {
      await this.client.deleteObject(s3Key)
    }
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const srcKey = this.resolveS3Path(srcPhysical)
    const name = srcPhysical.split("/").filter(Boolean).pop() || ""
    const dstBase = this.resolveS3Path(dstDir)
    const dstKey = dstBase.endsWith("/")
      ? `${dstBase}${name}`
      : `${dstBase}/${name}`

    // Check if source is directory
    if (srcKey.endsWith("/") || (await this.isDir(srcKey))) {
      await this.copyDirRecursive(srcKey, dstKey)
      await this.deleteDirRecursive(srcKey)
    } else {
      await this.client.copyObject(srcKey, dstKey)
      await this.client.deleteObject(srcKey)
    }
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const srcKey = this.resolveS3Path(srcPhysical)
    const name = srcPhysical.split("/").filter(Boolean).pop() || ""
    const dstBase = this.resolveS3Path(dstDir)
    const dstKey = dstBase.endsWith("/")
      ? `${dstBase}${name}`
      : `${dstBase}/${name}`

    // Check if source is directory
    if (srcKey.endsWith("/") || (await this.isDir(srcKey))) {
      await this.copyDirRecursive(srcKey, dstKey)
    } else {
      await this.client.copyObject(srcKey, dstKey)
    }
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const s3Key = this.resolveS3Path(physicalPath)
    // Ensure parent directory marker exists
    const parentDir = s3Key.split("/").slice(0, -1).join("/")
    if (parentDir) {
      try {
        await this.client.putObject(
          `${parentDir}/`,
          new Uint8Array(0),
          "application/x-directory",
        )
      } catch {}
    }
    await this.client.putObject(s3Key, content)
  }
}
