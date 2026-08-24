import { StorageDriver, FileItem } from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { onedriveHostMap, Addition } from "./meta"
import { fileToObj } from "./types"

import { refreshToken, requestApi, getFiles, getFile, getDrive } from "./util"

export class Onedrive implements StorageDriver {
  // Properties mapped from Addition
  root_folder_path: string = "/"
  region: string = "global"
  is_sharepoint: boolean = false
  use_online_api: boolean = true
  api_url_address: string = "https://api.oplist.org/onedrive/renewapi"
  client_id: string = ""
  client_secret: string = ""
  redirect_uri: string = "https://api.oplist.org/onedrive/callback"
  refresh_token: string = ""
  site_id: string = ""
  chunk_size: number = 5
  custom_host: string = ""
  disable_disk_usage: boolean = false
  enable_direct_upload: boolean = false
  order_by: string = "filename"
  order_direction: string = "asc"

  accessToken: string = ""
  onTokenUpdate?: (token: string) => void

  constructor(
    addition?: Partial<Addition>,
    onTokenUpdate?: (token: string) => void,
  ) {
    if (addition) {
      if (addition.root_folder_path !== undefined)
        this.root_folder_path = String(addition.root_folder_path)
      if (addition.region !== undefined) this.region = String(addition.region)
      if (addition.is_sharepoint !== undefined)
        this.is_sharepoint = !!addition.is_sharepoint
      if (addition.use_online_api !== undefined)
        this.use_online_api = !!addition.use_online_api
      if (addition.api_url_address !== undefined)
        this.api_url_address = String(addition.api_url_address)
      if (addition.client_id !== undefined)
        this.client_id = String(addition.client_id)
      if (addition.client_secret !== undefined)
        this.client_secret = String(addition.client_secret)
      if (addition.redirect_uri !== undefined)
        this.redirect_uri = String(addition.redirect_uri)
      if (addition.refresh_token !== undefined)
        this.refresh_token = String(addition.refresh_token)
      if (addition.site_id !== undefined)
        this.site_id = String(addition.site_id)
      if (addition.chunk_size !== undefined)
        this.chunk_size = Number(addition.chunk_size) || 5
      if (addition.custom_host !== undefined)
        this.custom_host = String(addition.custom_host)
      if (addition.disable_disk_usage !== undefined)
        this.disable_disk_usage = !!addition.disable_disk_usage
      if (addition.enable_direct_upload !== undefined)
        this.enable_direct_upload = !!addition.enable_direct_upload
      if (addition.order_by !== undefined)
        this.order_by = String(addition.order_by)
      if (addition.order_direction !== undefined)
        this.order_direction = String(addition.order_direction)
    }
    this.onTokenUpdate = onTokenUpdate
  }

  async init(): Promise<void> {
    // Normalize types from DB addition which might be strings
    if (typeof this.is_sharepoint === "string") {
      this.is_sharepoint =
        (this.is_sharepoint as string).toLowerCase() === "true"
    }
    if (typeof this.use_online_api === "string") {
      this.use_online_api =
        (this.use_online_api as string).toLowerCase() === "true"
    }
    if (typeof this.chunk_size === "string") {
      this.chunk_size = parseInt(this.chunk_size as string) || 5
    }
    if (typeof this.disable_disk_usage === "string") {
      this.disable_disk_usage =
        (this.disable_disk_usage as string).toLowerCase() === "true"
    }
    if (typeof this.enable_direct_upload === "string") {
      this.enable_direct_upload =
        (this.enable_direct_upload as string).toLowerCase() === "true"
    }

    if (this.chunk_size < 1) {
      this.chunk_size = 5
    }
    if (this.refresh_token) {
      await refreshToken(this)
    }
  }

  private getMetaUrl(
    isAuth: boolean,
    reqPath: string,
    suffix?: string,
  ): string {
    const hostMap = onedriveHostMap[this.region] || onedriveHostMap["global"]
    if (isAuth) {
      return hostMap.oauth
    }
    const apiBase = this.is_sharepoint
      ? `${hostMap.api}/v1.0/sites/${this.site_id}`
      : `${hostMap.api}/v1.0/me`

    const normalized = reqPath.replace(/\\/g, "/")
    if (!normalized || normalized === "/") {
      if (suffix) {
        return `${apiBase}/drive/root/${suffix}`
      }
      return `${apiBase}/drive/root`
    }
    let trimmed = normalized.startsWith("/") ? normalized.slice(1) : normalized
    if (trimmed.endsWith("/")) {
      trimmed = trimmed.slice(0, -1)
    }
    if (!trimmed || trimmed === "") {
      if (suffix) {
        return `${apiBase}/drive/root/${suffix}`
      }
      return `${apiBase}/drive/root`
    }
    const encoded = trimmed
      .split("/")
      .map((p) => {
        try {
          return encodeURIComponent(decodeURIComponent(p))
        } catch {
          return encodeURIComponent(p)
        }
      })
      .join("/")
    if (suffix) {
      return `${apiBase}/drive/root:/${encoded}:/${suffix}`
    }
    return `${apiBase}/drive/root:/${encoded}:`
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const files = await getFiles(this, physicalPath)
    const items = files.map((f) => {
      const obj = fileToObj(f, "")
      let rawUrl = f["@microsoft.graph.downloadUrl"] || obj.url || ""
      if (this.custom_host && rawUrl) {
        try {
          const u = new URL(rawUrl)
          u.host = this.custom_host
          rawUrl = u.toString()
        } catch {}
      }
      return {
        name: obj.name,
        size: obj.size,
        is_dir: obj.isFolder,
        modified: obj.modified,
        sign: "",
        type: obj.isFolder ? 1 : 0,
        thumb: obj.thumbnail || "",
        raw_url: rawUrl,
      }
    })
    return sortFileItems(items, this.order_by, this.order_direction)
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const f = await getFile(this, physicalPath)
    const obj = fileToObj(f, "")
    let rawUrl = f["@microsoft.graph.downloadUrl"] || obj.url || ""
    if (this.custom_host && rawUrl) {
      try {
        const u = new URL(rawUrl)
        u.host = this.custom_host
        rawUrl = u.toString()
      } catch {}
    }
    return {
      name: obj.name,
      size: obj.size,
      is_dir: obj.isFolder,
      modified: obj.modified,
      sign: "",
      type: obj.isFolder ? 1 : 0,
      thumb: obj.thumbnail || "",
      raw_url: rawUrl,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const parentPath = physicalPath.split("/").slice(0, -1).join("/") || "/"
    const dirName = physicalPath.split("/").filter(Boolean).pop() || ""

    const url = this.getMetaUrl(false, parentPath, "children")
    const data = {
      name: dirName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    }
    await requestApi(this, url, "POST", data)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const data = {
      name: newName,
    }
    const url = this.getMetaUrl(false, physicalPath)
    await requestApi(this, url, "PATCH", data)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    for (const name of names) {
      const itemPath =
        physicalPath === "/" ? `/${name}` : `${physicalPath}/${name}`
      const url = this.getMetaUrl(false, itemPath)
      await requestApi(this, url, "DELETE")
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // Determine the destination parent reference
    // Fetch dstPhys details to get its ID, or construct parentReference path
    const dstUrl = this.getMetaUrl(false, dstPhys)
    const dstRes = await requestApi<any>(this, dstUrl, "GET")
    const dstId = dstRes.id
    const driveId = dstRes.parentReference?.driveId

    for (const name of names) {
      const srcItemPath = srcPhys === "/" ? `/${name}` : `${srcPhys}/${name}`
      const data = {
        parentReference: {
          id: dstId,
          ...(driveId ? { driveId } : {}),
        },
        name,
      }
      const url = this.getMetaUrl(false, srcItemPath)
      await requestApi(this, url, "PATCH", data)
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const dstUrl = this.getMetaUrl(false, dstPhys)
    const dstRes = await requestApi<any>(this, dstUrl, "GET")
    const dstId = dstRes.id
    const driveId = dstRes.parentReference?.driveId

    for (const name of names) {
      const srcItemPath = srcPhys === "/" ? `/${name}` : `${srcPhys}/${name}`
      const data = {
        parentReference: {
          id: dstId,
          ...(driveId ? { driveId } : {}),
        },
        name,
      }
      const url = this.getMetaUrl(false, srcItemPath, "copy")
      await requestApi(this, url, "POST", data)
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    if (content.length <= 4 * 1024 * 1024) {
      // upSmall
      const url = this.getMetaUrl(false, physicalPath, "content")
      await requestApi(this, url, "PUT", content)
    } else {
      // upBig
      const url = this.getMetaUrl(false, physicalPath, "createUploadSession")
      const metadata = {
        item: { "@microsoft.graph.conflictBehavior": "rename" },
      }
      const res: any = await requestApi(this, url, "POST", metadata)
      const uploadUrl = res.uploadUrl

      const DEFAULT = this.chunk_size * 1024 * 1024
      let finish = 0
      const size = content.length

      while (finish < size) {
        const left = size - finish
        const byteSize = Math.min(left, DEFAULT)
        const chunk = content.slice(finish, finish + byteSize)

        await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": String(byteSize),
            "Content-Range": `bytes ${finish}-${finish + byteSize - 1}/${size}`,
          },
          body: chunk,
        })
        finish += byteSize
      }
    }
  }
}
