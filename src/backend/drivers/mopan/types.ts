export interface MoPanAddition {
  phone: string
  password: string
  sms_code?: string
  root_folder_id?: string
  cloud_id?: string
  order_by?: "filename" | "filesize" | "lastOpTime"
  order_direction?: "asc" | "desc"
  device_info?: string
  upload_thread?: string
}

export interface DeviceInfo {
  appVersion: string
  brand: string
  deviceId: string
  deviceName: string
  imei: string
  imsi: string
  mac: string
  mno: string
  model: string
  mpVersion: string
  networkType: string
  osVersion: string
  platform: string
}

export interface LoginResp {
  token: string
  userCloudStorageRelations: Array<{
    folderID: string
    path: string
  }>
}

export interface UserInfo {
  userID: string
  phone?: string
  nickname?: string
}

export interface MoPanFolder {
  id: string
  name: string
  createDate: string
  lastOpTime: string
  parentID?: string
  size?: number
}

export interface MoPanFile {
  id: string
  name: string
  size: number
  md5: string
  createDate: string
  lastOpTime: string
  parentID?: string
  icon?: {
    smallURL?: string
    largeURL?: string
  }
  mediaType?: number
}

export interface FileListAO {
  folderList: MoPanFolder[]
  fileList: MoPanFile[]
}

export interface QueryFilesResp {
  fileListAO: FileListAO
}

export interface DownloadUrlResp {
  downloadUrl: string
}

export interface CreateFolderResp {
  id: string
  name: string
  createDate: string
  lastOpTime: string
}

export interface TaskParam {
  userOrCloudID: string
  source: number
  taskType: number
  targetSource: number
  targetUserOrCloudID: string
  targetType: number
  targetFolderID: string
  taskStatusDetailDTOList: TaskFileParam[]
}

export interface TaskFileParam {
  fileID: string
  isFolder: boolean
  fileName: string
}

export interface AddBatchTaskResp {
  taskIDList: string[]
  taskType: number
  targetFolderID: string
}

export interface CheckBatchTaskResp {
  taskID: string
  taskStatus: number
  successedFileIDList: string[]
}

export interface InitMultiUploadData {
  uploadFileID: string
  partInfos: string[]
  fileDataExists: boolean
  partSize: number
  lastPartSize: number
}

export interface UploadPartData {
  fileMd5: string
  partTotal: number
  parentFolderId: string
  fileName: string
  fileSize: number
}

export interface MultiUploadPart {
  partNumber: number
  uploadUrl: string
}

export interface CommitUploadResp {
  userFileID: string
  fileName: string
  fileSize: number
  createDate: string
}

export interface UsedSpaceResp {
  capacity: number
  used: number
}
