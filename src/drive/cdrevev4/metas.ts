/** =========== Cloudreve V4 类型定义 ================
 * @author "OpenList Team"
 * @version 25.01.01
 * =======================================================*/

export interface CONFIG_INFO {
    address: string
    username: string
    password: string
    access_token: string
    refresh_token: string
    custom_ua: string
    enable_folder_size: boolean
    enable_thumb: boolean
    enable_version_upload: boolean
    hide_uploading: boolean
    order_by: string
    order_direction: string
}

export interface SAVING_INFO {
    access_token?: string
    refresh_token?: string
}

export interface CloudreveFile {
    id: string
    path: string
    name: string
    size: number
    type: number       // 0=文件, 1=目录
    created_at: string
    updated_at: string
    metadata?: Record<string, any>
}

export interface FileListResp {
    files: CloudreveFile[]
    pagination: { next_token: string }
    storage_policy: any
}

export interface FileUrlResp {
    urls: { url: string }[]
    expires: string
}
