// ProtonDrive constants (aligned with Go drivers/proton_drive/meta.go)

export const ProtonAPIBase = "https://drive.proton.me/api"
export const ProtonAuthInfoURL = "https://account.proton.me/api/auth/info"
export const ProtonAuthURL = "https://account.proton.me/api/auth/v4"
export const ProtonAuth2FAURL = "https://account.proton.me/api/auth/v4/2fa"
export const ProtonRefreshURL = "https://account.proton.me/api/auth/v4/refresh"
export const ProtonSaltsURL = ProtonAPIBase + "/core/v4/keys/salts"
export const ProtonUserURL = ProtonAPIBase + "/core/v4/users"
export const ProtonAddressesURL = ProtonAPIBase + "/core/v4/addresses"
export const ProtonSharesURL = ProtonAPIBase + "/drive/shares"
export const ProtonVolumesURL = ProtonAPIBase + "/drive/volumes"

// 与 Go 侧对齐的客户端指纹（用于 API 请求头）
export const ProtonAppVersion = "windows-drive@1.11.3+rclone+proton"
export const ProtonJsonMime = "application/vnd.protonmail.v1+json"
export const ProtonSDKVersion = "js@0.3.0"
export const ProtonUserAgent =
  "ProtonDrive/v1.70.0 (Windows NT 10.0.22000; Win64; x64)"
export const ProtonWebDriveAV = "web-drive@5.2.0+0f69f7a8"

export const DefaultChunkSize = 4 * 1024 * 1024 // 4MB

export const ProtonLinkTypeFile = 1
export const ProtonLinkTypeFolder = 2

export const ProtonShareTypeMain = 1
export const ProtonShareTypeStandard = 2
export const ProtonShareTypeDevice = 3
export const ProtonShareTypePhotos = 4

export const ProtonSRPGroupG = 2n
