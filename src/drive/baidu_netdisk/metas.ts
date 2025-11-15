// Baidu Netdisk driver configuration interface
export interface BaiduNetdiskConfig {
    // Root path configuration
    root_path: string

    // Authentication
    client_id?: string
    client_secret?: string
    refresh_token: string

    // Download options
    download_api: "official" | "crack" | "crack_video"
    custom_crack_ua?: string

    // Upload options
    upload_thread: string
    upload_api: string
    custom_upload_part_size: number
    low_bandwith_upload_mode: boolean

    // API options
    use_online_api: boolean
    api_url_address: string

    // File listing options
    order_by: "name" | "time" | "size"
    order_direction: "asc" | "desc"
    only_list_video_file: boolean
}

// Baidu Netdisk saved data interface
export interface BaiduNetdiskSaving {
    access_token?: string
    refresh_token?: string
    vip_type?: number
}

// Token response from Baidu API
export interface TokenResponse {
    access_token: string
    refresh_token: string
    expires_in?: number
}

// Token error response
export interface TokenErrorResponse {
    error: string
    error_description: string
}

// Online API response
export interface OnlineAPIResponse {
    refresh_token: string
    access_token: string
    text?: string
}

// User info response
export interface UserInfoResponse {
    errno: number
    vip_type: number
}

// File item from Baidu API
export interface BaiduFile {
    fs_id: number
    path: string
    server_filename: string
    size: number
    isdir: number
    category: number
    md5?: string
    
    // Timestamps
    server_ctime: number
    server_mtime: number
    local_ctime?: number
    local_mtime?: number
    ctime?: number
    mtime?: number
    
    // Thumbnail
    thumbs?: {
        url3?: string
    }
}

// List files response
export interface ListFilesResponse {
    errno: number
    list: BaiduFile[]
    guid_info?: string
    request_id?: number
}

// Download link response
export interface DownloadLinkResponse {
    errno: number
    list: Array<{
        dlink: string
    }>
    request_id?: string
}

// Download link response (crack method)
export interface DownloadLinkCrackResponse {
    errno: number
    info: Array<{
        dlink: string
    }>
    request_id?: number
}

// Precreate upload response
export interface PrecreateResponse {
    errno: number
    return_type: number
    request_id: number
    
    // return_type=1: need upload
    path?: string
    uploadid?: string
    block_list?: number[]
    
    // return_type=2: rapid upload success
    info?: BaiduFile
}

// Manage operation response
export interface ManageResponse {
    errno: number
    request_id?: number
}

// Quota response
export interface QuotaResponse {
    errno: number
    total: number
    used: number
    request_id?: number
}
