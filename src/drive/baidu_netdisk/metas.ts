// 百度网盘 配置与响应接口定义

//====== 百度网盘配置信息接口 ======
export interface BaiduNetdiskConfig {
    // 基础配置
    root_path: string;

    // 认证配置
    client_id?: string;
    client_secret?: string;
    refresh_token: string;

    // 下载配置
    download_api: "official" | "crack" | "crack_video";
    custom_crack_ua?: string;

    // 上传配置
    upload_thread: string;
    upload_api: string;
    custom_upload_part_size: number;
    low_bandwith_upload_mode: boolean;

    // API配置
    use_online_api: boolean;
    api_address: string;

    // 排序配置
    order_by: "name" | "time" | "size";
    order_direction: "asc" | "desc";
    only_list_video_file: boolean;
}

//====== 百度网盘保存信息接口 ======
export interface BaiduNetdiskSaving {
    access_token?: string;
    refresh_token?: string;
    vip_type?: number;
}

//====== Token响应 ======
export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
}

//====== Token错误响应 ======
export interface TokenErrorResponse {
    error: string;
    error_description: string;
}

//====== 在线API响应 ======
export interface OnlineAPIResponse {
    refresh_token: string;
    access_token: string;
    text?: string;
}

//====== 用户信息响应 ======
export interface UserInfoResponse {
    errno: number;
    vip_type: number;
}

//====== 百度API通用响应 ======
export interface BaiduAPIResponse {
    errno: number;
    request_id?: number;
    [key: string]: any;
}

//====== 百度文件信息 ======
export interface BaiduFile {
    fs_id: number;
    path: string;
    server_filename: string;
    size: number;
    isdir: number;
    category: number;
    md5?: string;

    // 时间戳
    server_ctime: number;
    server_mtime: number;
    local_ctime?: number;
    local_mtime?: number;
    ctime?: number;
    mtime?: number;

    // 缩略图
    thumbs?: {
        url3?: string;
    };
}

//====== 文件列表响应 ======
export interface BaiduFileListResponse extends BaiduAPIResponse {
    list: BaiduFile[];
}

//====== 下载链接响应（官方） ======
export interface DownloadLinkResponse {
    errno: number;
    list: Array<{
        dlink: string;
    }>;
    request_id?: string;
}

//====== 下载链接响应（破解） ======
export interface DownloadLinkCrackResponse {
    errno: number;
    info: Array<{
        dlink: string;
    }>;
    request_id?: number;
}

//====== 预创建上传响应 ======
export interface PrecreateResponse {
    errno: number;
    return_type: number;
    request_id: number;

    // return_type=1: 需要上传
    path?: string;
    uploadid?: string;
    block_list?: number[];

    // return_type=2: 秒传成功
    info?: BaiduFile;
}

//====== 文件管理操作响应 ======
export interface ManageResponse {
    errno: number;
    request_id?: number;
}

//====== 存储空间响应 ======
export interface QuotaResponse {
    errno: number;
    total: number;
    used: number;
    request_id?: number;
}