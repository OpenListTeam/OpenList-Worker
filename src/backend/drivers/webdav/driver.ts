import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { WebDavAddition, WebDavResource } from "./types"
import { WebDavClient, cleanPath, dirname, basename } from "./util"

function resourceToFileItem(r: WebDavResource): FileItem {
  const isDir = r.resourceType === "collection"
  const name = r.displayName || basename(decodeURIComponent(r.href))
  let modified = new Date().toISOString()
  if (r.lastModified) {
    try {
      modified = new Date(r.lastModified).toISOString()
    } catch {}
  }
  return {
    name,
    size: isDir ? 0 : r.contentLength,
    is_dir: isDir,
    modified,
    sign: r.etag || "",
    type: calcFileType(name, isDir),
    thumb: "",
    raw_url: "",
  }
}

export class WebDavDriver implements StorageDriver {
  private addition: WebDavAddition
  private client: WebDavClient

  constructor(addition: WebDavAddition) {
    this.addition = addition
    this.client = new WebDavClient(addition)
  }

  async init(): Promise<void> {
    // Test connectivity by listing root
    try {
      await this.client.propfind(this.client.resolvePath("/"), 0)
    } catch (e: any) {
      throw new Error(`WebDAV connection failed: ${e.message}`)
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const davPath = this.client.resolvePath(physicalPath)
    const resources = await this.client.propfind(davPath, 1)

    // The server returns the requested directory itself + its children.
    // Self entry href = addressPath + davPath (e.g. "/dav/Koofr/" + "" = "/dav/Koofr/")
    // Children hrefs have one more segment (e.g. "/dav/Koofr/ioir-nav/")
    // Strip the addressPath prefix from hrefs, then compare remaining path to davPath
    // to identify the self entry.
    const addressPath = this.client.addressPath
    const items: WebDavResource[] = []

    for (const r of resources) {
      const decodedHref = decodeURIComponent(r.href).replace(/\/+$/, "")
      // Get the path relative to the address
      const relativePath = decodedHref.startsWith(addressPath)
        ? decodedHref.slice(addressPath.length)
        : decodedHref
      const normalizedRelative = relativePath.replace(/^\/+|\/+$/g, "")
      const normalizedDav = davPath.replace(/^\/+|\/+$/g, "")

      // Skip the directory itself
      if (normalizedRelative === normalizedDav) continue

      items.push(r)
    }

    return sortFileItems(
      items.map((r) => resourceToFileItem(r)),
      "name",
      "asc",
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const davPath = this.client.resolvePath(physicalPath)
    const resources = await this.client.propfind(davPath, 0)

    if (resources.length === 0) {
      throw new Error(`Resource not found: ${physicalPath}`)
    }

    return resourceToFileItem(resources[0])
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const davPath = this.client.resolvePath(physicalPath)
    await this.client.mkdir(davPath)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const davPath = this.client.resolvePath(physicalPath)
    const parentDir = dirname(davPath)
    const destPath =
      parentDir === "/" ? `/${newName}` : `${parentDir}/${newName}`
    await this.client.move(davPath, destPath)
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const davPath = this.client.resolvePath(physicalPath)
    await this.client.remove(davPath)
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const srcDavPath = this.client.resolvePath(srcPhysical)
    const dstDavBase = this.client.resolvePath(dstDir)
    const name = basename(srcPhysical)
    const dstDavPath = dstDavBase === "/" ? `/${name}` : `${dstDavBase}/${name}`
    await this.client.move(srcDavPath, dstDavPath)
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhysical: string,
    _dstPhysical: string,
  ): Promise<void> {
    const srcDavPath = this.client.resolvePath(srcPhysical)
    const dstDavBase = this.client.resolvePath(dstDir)
    const name = basename(srcPhysical)
    const dstDavPath = dstDavBase === "/" ? `/${name}` : `${dstDavBase}/${name}`
    await this.client.copy(srcDavPath, dstDavPath)
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const davPath = this.client.resolvePath(physicalPath)
    // Ensure parent directory exists
    const parentDir = dirname(davPath)
    try {
      await this.client.mkdir(parentDir)
    } catch {}
    await this.client.put(davPath, content)
  }

  async getFileStream(
    _virtualPath: string,
    physicalPath: string,
  ): Promise<{ body: ReadableStream; headers: Record<string, string> } | null> {
    const davPath = this.client.resolvePath(physicalPath)
    return this.client.getStream(davPath)
  }
}

export { WebDavDriver as WebdavDriver }
