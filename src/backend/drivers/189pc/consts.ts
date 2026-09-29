// 189PC constants

export const LoginURL = "https://api.cloud.189.cn/open/oauth2/loginSubmit.action"
export const AppID = "600002434"
export const ClientType = "10020"
export const ReturnURL = "https://m.cloud.189.cn/zhuanti/2020/loginSuccess/index.html"

// API URLs
export const APIPrefix = "https://api.cloud.189.cn"
export const ListFilesURL = APIPrefix + "/open/file/listFiles.action"
export const GetFileInfoURL = APIPrefix + "/open/file/getFileInfo.action"
export const CreateFolderURL = APIPrefix + "/open/file/createFolder.action"
export const RenameFileURL = APIPrefix + "/open/file/renameFile.action"
export const DeleteFileURL = APIPrefix + "/open/file/deleteFile.action"
export const GetDownloadURLURL = APIPrefix + "/open/file/getFileDownloadUrl.action"

// Upload URLs
export const UploadURL = "https://upload.cloud.189.cn"
export const InitUploadURL = UploadURL + "/v1/file/initMultiUpload"
export const UploadChunkURL = UploadURL + "/v1/file/uploadFile"
export const GetUploadURLsURL = UploadURL + "/v1/file/getUploadUrls"
export const CommitUploadURL = UploadURL + "/v1/file/commitUploadFile"

export const DefaultChunkSize = 10 * 1024 * 1024 // 10MB
