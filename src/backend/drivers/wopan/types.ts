export interface WoPanAddition {
  root_folder_id?: string
  refresh_token: string
  family_id?: string
  sort_rule?:
    | "name_asc"
    | "name_desc"
    | "time_asc"
    | "time_desc"
    | "size_asc"
    | "size_desc"
    | string
  access_token?: string
  order_by?: string
  order_direction?: "asc" | "desc" | "ASC" | "DESC"
}

export interface WoPanFile {
  familyId?: number
  fid: string
  creator?: string
  size?: number
  createTime: string
  name: string
  shootingTime?: string
  id: string
  type: number // 0: Directory/Folder, 1: File
  thumbUrl?: string
  fileType?: string
}

export interface QueryAllFilesData {
  files: WoPanFile[]
}

export interface GetDownloadUrlV2Data {
  type?: number
  list: Array<{
    fid: string
    downloadUrl: string
  }>
}

export interface CreateDirectoryData {
  id: string
}

export interface AppQueryUserData {
  userId: string
  headUrl?: string
  userName?: string
  sex?: string
  birthday?: string
  isModify?: string
  isHeadModify?: string
  isSetPassword?: string
  registerTime?: string
}

export interface AppRefreshTokenData {
  access_token: string
  token_type?: string
  refresh_token: string
  expires_in?: number
  scope?: string
}

export interface FamilyUserCurrentEncodeData {
  count?: string
  defaultHomeId: number
  defaultHomeName?: string
  groupHeadUrl?: string
  groupName?: string
  id?: number
  memberRole?: string
  ownerId?: string
  unreadFlag?: string
}

export interface QueryCloudUsageInfoData {
  code?: string
  usageInfo?: {
    totalSize?: string
    usedSize?: number
    imageSize?: number
    videoSize?: number
    audioSize?: number
    textSize?: number
    otherSize?: number
    byteUsedSize?: number
    byteTotalSize?: string
  }
  vipLevel?: string
  expireTime?: string
  applyTime?: string
  payType?: string
  source?: string
  orderState?: string
  status?: string
}

export interface GetZoneInfoData {
  url: string
}

export interface ClassifyRuleData {
  fileTypes?: Record<
    string,
    {
      subType?: string
      ability?: string
      type: string
    }
  >
}

export interface Upload2CResp {
  code: string
  data?: {
    fid: string
  }
  msg?: string
}
