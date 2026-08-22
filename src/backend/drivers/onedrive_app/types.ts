export interface Host {
  oauth: string
  api: string
}

export interface TokenErr {
  error: string
  error_description: string
}

export interface RespErr {
  error: {
    code: string
    message: string
  }
}

export interface FileSystemInfoFacet {
  createdDateTime?: string
  lastModifiedDateTime?: string
}

export interface File {
  id: string
  name: string
  size: number
  lastModifiedDateTime?: string
  fileSystemInfo?: FileSystemInfoFacet
  folder?: any
  "@microsoft.graph.downloadUrl"?: string
  file?: {
    mimeType: string
  }
  thumbnails?: {
    medium?: {
      url: string
    }
  }[]
  parentReference?: {
    driveId?: string
    id?: string
    path?: string
  }
}

export interface ObjectItem {
  id: string
  name: string
  size: number
  modified: string
  isFolder: boolean
  thumbnail: string
  parentID: string
  path?: string
  url?: string
}

export function fileToObj(f: File, parentID: string): ObjectItem {
  let thumb = ""
  if (f.thumbnails && f.thumbnails.length > 0) {
    thumb = f.thumbnails[0].medium?.url || ""
  }
  return {
    id: f.id,
    name: f.name,
    size: f.size,
    modified:
      f.lastModifiedDateTime || f.fileSystemInfo?.lastModifiedDateTime || "",
    isFolder: !!f.folder || !f.file,
    thumbnail: thumb,
    parentID,
    url: f["@microsoft.graph.downloadUrl"] || "",
  }
}

export interface Files {
  value: File[]
  "@odata.nextLink"?: string
}

export interface DriveResp {
  id: string
  driveType: string
  quota: {
    deleted: number
    remaining: number
    state: string
    total: number
    used: number
  }
}
