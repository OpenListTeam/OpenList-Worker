// ProtonDrive constants

export const ProtonAPIBase = "https://drive.proton.me/api"
export const ProtonAuthURL = "https://account.proton.me/api/auth"
export const ProtonAuthInfoURL = ProtonAuthURL + "/info"
export const ProtonAuthURL2 = ProtonAuthURL + "/v4"
export const ProtonAuth2FAURL = ProtonAuthURL + "/2fa"
export const ProtonUserURL = ProtonAPIBase + "/core/v4/users"
export const ProtonSharesURL = ProtonAPIBase + "/drive/shares"
export const ProtonVolumesURL = ProtonAPIBase + "/drive/volumes"

export const DefaultChunkSize = 4 * 1024 * 1024 // 4MB

export const ProtonLinkTypeFile = 1
export const ProtonLinkTypeFolder = 2

export const ProtonShareTypeMain = 1
export const ProtonShareTypeStandard = 2
export const ProtonShareTypeDevice = 3
export const ProtonShareTypePhotos = 4
