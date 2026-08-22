export const DefaultClientID = "1001000021"
export const DefaultClientSecret = "XFmi9GS2hzk98jGX"
export const DefaultAppID = "10000001"
export const DefaultBaseURL = "https://panservice.mail.wo.cn"
export const DefaultZoneURL = "https://tjupload.pan.wo.cn"
export const DefaultUA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.37"
export const DefaultPartSize = 8 * 1024 * 1024 // 8MB

export const ChannelAPIUser = "api-user"
export const ChannelWoHome = "wohome"
export const ChannelWoCloud = "wocloud"

export const SpaceTypePersonal = "0"
export const SpaceTypeFamily = "1"
export const SpaceTypePrivate = "4"

// api-user methods
export const KeyPcWebLogin = "PcWebLogin"
export const KeyPcLoginVerifyCode = "PcLoginVerifyCode"
export const KeyAppQueryUser = "AppQueryUser"
export const KeyAppRefreshToken = "AppRefreshToken"
export const KeyAppLogout = "AppLogout"

// wohome methods
export const KeyFCloudProductOrdListQry = "FCloudProductOrdListQry"
export const KeyQueryCloudUsageInfo = "QueryCloudUsageInfo"
export const KeyFCloudProductPackage = "FCloudProductPackage"
export const KeyClassifyRule = "ClassifyRule"
export const KeyGetZoneInfo = "GetZoneInfo"
export const KeyQuerySysConfig = "QuerySysConfig"
export const KeyFamilyUserCurrentEncode = "FamilyUserCurrentEncode"
export const KeyQueryAllFiles = "QueryAllFiles"
export const KeyGetSearchDirectory = "GetSearchDirectory"
export const KeyGetDownloadUrlV2 = "GetDownloadUrlV2"
export const KeyGetDownloadUrl = "GetDownloadUrl"
export const KeyCreateDirectory = "CreateDirectory"
export const KeyRenameFileOrDirectory = "RenameFileOrDirectory"
export const KeyMoveFile = "MoveFile"
export const KeyCopyFile = "CopyFile"
export const KeyDeleteFile = "DeleteFile"
export const KeyEmptyRecycleData = "EmptyRecycleData"
export const KeyUpload2C = "upload2C"
export const KeyPrivateSpaceLogin = "PrivateSpaceLogin"

export const SortRules = {
  name_asc: 1,
  name_desc: 2,
  size_asc: 3,
  size_desc: 4,
  time_asc: 5,
  time_desc: 6,
} as const
