import * as cloud189 from "./cloud189/files"
import * as cloud139 from "./cloud139/files"
import * as cloud115 from "./cloud115/files"
import * as cloud123 from "./cloud123/files"
import * as goodrive from "./goodrive/files"
import * as onedrive from "./onedrive/files"
import * as baiduyun from "./baiduyun/files"
import * as alicloud from "./alicloud/files"
import * as webdavfs from "./webdavfs/files"

// 表单值类型定义，支持所有驱动配置字段
type FormValues = Record<string, any>;

export const driver_list: Record<string, any> = {
    cloud189: cloud189.HostDriver,
    cloud139: cloud139.HostDriver,
    cloud115: cloud115.HostDriver,
    cloud123: cloud123.HostDriver,
    goodrive: goodrive.HostDriver,
    onedrive: onedrive.HostDriver,
    baiduyun: baiduyun.HostDriver,
    alicloud: alicloud.HostDriver,
    webdavfs: webdavfs.HostDriver,
};

// 驱动配置信息映射
export const config_list: Record<string, any> = {
    cloud189: {
        name: "天翼云盘",
        description: "中国电信天翼云盘存储服务",
        fields: [
            { key: "authtype", label: "登录方式", type: "select", required: true, options: [
                    { value: "client", label: "客户端登录" },
                    { value: "qrcode", label: "二维码登录" },
                    { value: "cookie", label: "Cookie登录" }
                ], defaultValue: "password" },
            { key: "cookie", label: "Cookie", type: "textarea", required: false, placeholder: "请输入Cookie值", show: (values: FormValues) => values.auth_type === 'cookie' },
            { key: "username", label: "用户名", type: "text", required: true, placeholder: "请输入天翼云盘用户名" },
            { key: "password", label: "密码", type: "password", required: true, placeholder: "请输入天翼云盘密码" },
            { key: "validate_code", label: "验证码", type: "text", required: false, placeholder: "如需验证码请输入" },
            { key: "refresh_token", label: "刷新令牌", type: "textarea", required: false, placeholder: "切换账号请清空此字段" },
            { key: "root_folder_id", label: "根目录ID", type: "text", required: false, placeholder: "默认为-11（个人云根目录）" },
            { key: "order_by", label: "排序方式", type: "select", required: false, options: [
                    { value: "filename", label: "文件名" },
                    { value: "filesize", label: "文件大小" },
                    { value: "lastOpTime", label: "修改时间" }
                ], defaultValue: "filename" },
            { key: "order_direction", label: "排序方向", type: "select", required: false, options: [
                    { value: "asc", label: "升序" },
                    { value: "desc", label: "降序" }
                ], defaultValue: "asc" },
            { key: "type", label: "云盘类型", type: "select", required: true, options: [
                    { value: "personal", label: "个人云" },
                    { value: "family", label: "家庭云" }
                ], defaultValue: "personal" },
            { key: "family_id", label: "家庭云ID", type: "text", required: false, placeholder: "家庭云类型时需要填写，留空自动获取" },
            { key: "upload_method", label: "上传方式", type: "select", required: false, options: [
                    { value: "stream", label: "流式上传（推荐）" },
                    { value: "rapid", label: "快速上传" },
                    { value: "old", label: "旧版上传" }
                ], defaultValue: "stream" },
            { key: "upload_thread", label: "上传线程数", type: "text", required: false, placeholder: "默认3，范围1-32", defaultValue: "3" },
            { key: "family_transfer", label: "家庭云转存", type: "boolean", required: false, defaultValue: false, help: "个人云上传时通过家庭云中转" },
            { key: "rapid_upload", label: "秒传", type: "boolean", required: false, defaultValue: false, help: "启用秒传功能" },
            { key: "no_use_ocr", label: "禁用OCR", type: "boolean", required: false, defaultValue: false, help: "禁用验证码OCR识别" }
        ]
    },
    cloud139: {
        name: "移动云盘",
        description: "中国移动139云盘存储服务",
        fields: [
            { key: "authorization", label: "授权码", type: "textarea", required: true, placeholder: "请输入移动云盘授权码（Basic认证）" },
            { key: "type", label: "云盘类型", type: "select", required: true, options: [
                    { value: "personal_new", label: "个人云盘（新版）" },
                    { value: "personal", label: "个人云盘（旧版）" },
                    { value: "family", label: "家庭云" },
                    { value: "group", label: "群组云" }
                ], defaultValue: "personal_new" },
            { key: "cloud_id", label: "云盘ID", type: "text", required: false, placeholder: "家庭云/群组云需要填写云盘ID" },
            { key: "root_folder_id", label: "根目录ID", type: "text", required: false, placeholder: "可选：自定义根目录ID" }
        ]
    },
    goodrive: {
        name: "Google Drive",
        description: "Google Drive云存储服务",
        fields: [
            { key: "refresh_token", label: "刷新令牌", type: "textarea", required: true, placeholder: "请输入Google OAuth刷新令牌" },
            { key: "use_online_api", label: "使用在线API", type: "boolean", required: false, defaultValue: false },
            { key: "url_online_api", label: "在线API地址", type: "text", required: false, placeholder: "可选：自定义API地址" },
            { key: "client_id", label: "客户端ID", type: "text", required: true, placeholder: "请输入Google OAuth客户端ID" },
            { key: "client_secret", label: "客户端密钥", type: "password", required: true, placeholder: "请输入Google OAuth客户端密钥" }
        ]
    },
    onedrive: {
        name: "OneDrive",
        description: "Microsoft OneDrive云存储服务",
        fields: [
            { key: "region", label: "区域选择", type: "select", required: true, options: [
                    { value: "global", label: "全球版" },
                    { value: "cn", label: "中国版（世纪互联）" },
                    { value: "us", label: "美国政府版" },
                    { value: "de", label: "德国版" }
                ], defaultValue: "global" },
            { key: "refresh_token", label: "刷新令牌", type: "textarea", required: true, placeholder: "请输入Microsoft OAuth刷新令牌" },
            { key: "use_online_api", label: "使用在线API", type: "boolean", required: false, defaultValue: false, help: "使用在线API刷新Token" },
            { key: "api_address", label: "在线API地址", type: "text", required: false, placeholder: "可选：在线API地址", show: (values: FormValues) => values.use_online_api === true },
            { key: "client_id", label: "客户端ID", type: "text", required: false, placeholder: "使用本地客户端时需要填写" },
            { key: "client_secret", label: "客户端密钥", type: "password", required: false, placeholder: "使用本地客户端时需要填写" },
            { key: "redirect_uri", label: "重定向URI", type: "text", required: false, placeholder: "默认：http://localhost", defaultValue: "http://localhost" },
            { key: "is_sharepoint", label: "SharePoint模式", type: "boolean", required: false, defaultValue: false, help: "是否为SharePoint站点" },
            { key: "site_id", label: "SharePoint站点ID", type: "text", required: false, placeholder: "SharePoint模式时需要填写", show: (values: FormValues) => values.is_sharepoint === true },
            { key: "root_folder_path", label: "根文件夹路径", type: "text", required: false, placeholder: "默认为根目录 /", defaultValue: "/" },
            { key: "chunk_size", label: "分块大小（MB）", type: "text", required: false, placeholder: "默认5MB，范围1-60", defaultValue: "5" },
            { key: "custom_host", label: "自定义下载主机", type: "text", required: false, placeholder: "可选：自定义下载链接主机" },
            { key: "disable_disk_usage", label: "禁用磁盘统计", type: "boolean", required: false, defaultValue: false, help: "禁用磁盘使用统计" }
        ]
    },
    cloud115: {
        name: "115云盘",
        description: "115云盘存储服务",
        fields: [
            { key: "access_token", label: "访问令牌", type: "textarea", required: true, placeholder: "请输入115云盘访问令牌（UID）" },
            { key: "refresh_token", label: "刷新令牌", type: "textarea", required: true, placeholder: "请输入115云盘刷新令牌" },
            { key: "root_folder_id", label: "根文件夹ID", type: "text", required: false, placeholder: "默认为0（根目录）", defaultValue: "0" },
            { key: "order_by", label: "排序方式", type: "select", required: false, options: [
                    { value: "file_name", label: "文件名" },
                    { value: "file_size", label: "文件大小" },
                    { value: "user_utime", label: "修改时间" },
                    { value: "file_type", label: "文件类型" }
                ], defaultValue: "file_name" },
            { key: "order_direction", label: "排序方向", type: "select", required: false, options: [
                    { value: "asc", label: "升序" },
                    { value: "desc", label: "降序" }
                ], defaultValue: "asc" },
            { key: "limit_rate", label: "请求限流（请求/秒）", type: "text", required: false, placeholder: "默认1，范围0.1-10", defaultValue: "1" }
        ]
    },
    cloud123: {
        name: "123云盘",
        description: "123云盘开放平台存储服务",
        fields: [
            { key: "client_id", label: "客户端ID", type: "text", required: true, placeholder: "请输入123云盘客户端ID" },
            { key: "client_secret", label: "客户端密钥", type: "password", required: true, placeholder: "请输入123云盘客户端密钥" },
            { key: "refresh_token", label: "刷新令牌", type: "textarea", required: false, placeholder: "可选：刷新令牌（用于OAuth2认证）" },
            { key: "access_token", label: "访问令牌", type: "textarea", required: false, placeholder: "可选：直接提供访问令牌" },
            { key: "root_folder_id", label: "根文件夹ID", type: "text", required: false, placeholder: "默认为0（根目录）", defaultValue: "0" },
            { key: "upload_thread", label: "上传线程数", type: "text", required: false, placeholder: "默认3，范围1-32", defaultValue: "3" },
            { key: "direct_link", label: "使用直链", type: "boolean", required: false, defaultValue: false, help: "启用直链下载" },
            { key: "direct_link_private_key", label: "直链私钥", type: "password", required: false, placeholder: "启用URL鉴权时需要填写", show: (values: FormValues) => values.direct_link === true },
            { key: "direct_link_valid_duration", label: "直链有效期（分钟）", type: "text", required: false, placeholder: "默认30分钟", defaultValue: "30", show: (values: FormValues) => values.direct_link === true && values.direct_link_private_key }
        ]
    },
    baiduyun: {
        name: "百度网盘",
        description: "百度网盘存储服务",
        fields: [
            { key: "refresh_token", label: "刷新令牌", type: "textarea", required: true, placeholder: "请输入百度网盘刷新令牌" },
            { key: "root_path", label: "根目录路径", type: "text", required: false, placeholder: "默认为根目录 /", defaultValue: "/" },
            { key: "order_by", label: "排序方式", type: "select", required: false, options: [
                    { value: "name", label: "文件名" },
                    { value: "time", label: "修改时间" },
                    { value: "size", label: "文件大小" }
                ], defaultValue: "name" },
            { key: "order_direction", label: "排序方向", type: "select", required: false, options: [
                    { value: "asc", label: "升序" },
                    { value: "desc", label: "降序" }
                ], defaultValue: "asc" },
            { key: "download_api", label: "下载API", type: "select", required: false, options: [
                    { value: "official", label: "官方API" },
                    { value: "crack", label: "破解API" },
                    { value: "crack_video", label: "视频破解API" }
                ], defaultValue: "official" },
            { key: "custom_crack_ua", label: "自定义破解UA", type: "text", required: false, placeholder: "默认：netdisk", defaultValue: "netdisk" },
            { key: "use_online_api", label: "使用在线API", type: "boolean", required: false, defaultValue: true, help: "使用在线API刷新Token" },
            { key: "api_address", label: "在线API地址", type: "text", required: false, placeholder: "默认：https://api.oplist.org/baiduyun/renewapi", defaultValue: "https://api.oplist.org/baiduyun/renewapi", show: (values: FormValues) => values.use_online_api === true },
            { key: "client_id", label: "客户端ID", type: "text", required: false, placeholder: "使用本地客户端时需要填写", show: (values: FormValues) => values.use_online_api === false },
            { key: "client_secret", label: "客户端密钥", type: "password", required: false, placeholder: "使用本地客户端时需要填写", show: (values: FormValues) => values.use_online_api === false },
            { key: "upload_thread", label: "上传线程数", type: "text", required: false, placeholder: "默认3，范围1-32", defaultValue: "3" },
            { key: "upload_api", label: "上传API地址", type: "text", required: false, placeholder: "默认：https://d.pcs.baidu.com", defaultValue: "https://d.pcs.baidu.com" },
            { key: "custom_upload_part_size", label: "自定义上传分片大小（MB）", type: "text", required: false, placeholder: "默认0（自动），范围4-32", defaultValue: "0" },
            { key: "low_bandwith_upload_mode", label: "低带宽上传模式", type: "boolean", required: false, defaultValue: false, help: "启用低带宽上传模式" },
            { key: "only_list_video_file", label: "仅列出视频文件", type: "boolean", required: false, defaultValue: false, help: "仅显示视频文件和文件夹" }
        ]
    },
    alicloud: {
        name: "阿里云盘",
        description: "阿里云盘开放平台存储服务",
        proxy_only: true, // 强制使用代理模式
        fields: [
            { key: "drive_type", label: "驱动类型", type: "select", required: true, options: [
                    { value: "default", label: "默认" },
                    { value: "resource", label: "资源库" },
                    { value: "backup", label: "备份盘" }
                ], defaultValue: "resource" },
            { key: "refresh_token", label: "刷新令牌", type: "textarea", required: true, placeholder: "请输入阿里云盘刷新令牌" },
            { key: "root_folder_id", label: "根目录ID", type: "text", required: false, placeholder: "默认为root", defaultValue: "root" },
            { key: "order_by", label: "排序方式", type: "select", required: false, options: [
                    { value: "name", label: "文件名" },
                    { value: "size", label: "文件大小" },
                    { value: "updated_at", label: "修改时间" },
                    { value: "created_at", label: "创建时间" }
                ], defaultValue: "name" },
            { key: "order_direction", label: "排序方向", type: "select", required: false, options: [
                    { value: "ASC", label: "升序" },
                    { value: "DESC", label: "降序" }
                ], defaultValue: "ASC" },
            { key: "use_online_api", label: "使用在线API", type: "boolean", required: false, defaultValue: true, help: "使用在线API刷新Token" },
            { key: "alipan_type", label: "阿里云盘类型", type: "select", required: true, options: [
                    { value: "default", label: "默认" },
                    { value: "alipanTV", label: "阿里云盘TV" }
                ], defaultValue: "default" },
            { key: "api_address", label: "API地址", type: "text", required: false, placeholder: "默认：https://api.oplist.org/alicloud/renewapi", defaultValue: "https://api.oplist.org/alicloud/renewapi", show: (values: FormValues) => values.use_online_api === true },
            { key: "client_id", label: "客户端ID", type: "text", required: false, placeholder: "使用本地客户端时需要填写", show: (values: FormValues) => values.use_online_api === false },
            { key: "client_secret", label: "客户端密钥", type: "password", required: false, placeholder: "使用本地客户端时需要填写", show: (values: FormValues) => values.use_online_api === false },
            { key: "remove_way", label: "删除方式", type: "select", required: true, options: [
                    { value: "trash", label: "移到回收站" },
                    { value: "delete", label: "直接删除" }
                ], defaultValue: "trash" },
            { key: "rapid_upload", label: "秒传", type: "boolean", required: false, defaultValue: false, help: "启用秒传功能（文件会先上传到服务器，进度可能不准确）" },
            { key: "internal_upload", label: "内网上传", type: "boolean", required: false, defaultValue: false, help: "如果使用阿里云北京ECS，可以开启以提升上传速度" },
            { key: "livp_download_format", label: "LIVP下载格式", type: "select", required: false, options: [
                { value: "jpeg", label: "JPEG" },
                { value: "mov", label: "MOV" }
            ], defaultValue: "jpeg" }
        ]
    },
    webdavfs: {
        name: "WebDAV",
        description: "WebDAV协议云存储服务（支持坚果云、NextCloud等）",
        fields: [
            { key: "vendor", label: "服务商类型", type: "select", required: true, options: [
                { value: "other", label: "通用WebDAV" },
                { value: "sharepoint", label: "SharePoint" }
            ], defaultValue: "other" },
            { key: "address", label: "服务器地址", type: "text", required: true, placeholder: "请输入WebDAV服务器地址，如：https://dav.jianguoyun.com/dav/" },
            { key: "username", label: "用户名", type: "text", required: true, placeholder: "请输入用户名" },
            { key: "password", label: "密码", type: "password", required: true, placeholder: "请输入密码或应用专用密码" },
            { key: "root_path", label: "根目录路径", type: "text", required: false, placeholder: "默认为 /", defaultValue: "/" },
            { key: "tls_insecure_skip_verify", label: "跳过TLS证书验证", type: "boolean", required: false, defaultValue: false, help: "不安全，仅用于自签名证书" }
        ]
    }
};

// 获取所有可用的驱动类型
export function getAvailableDrivers(): Array<{key: string, name: string, description: string, fields: any[]}> {
    return Object.keys(config_list).map(key => ({
        key,
        name: config_list[key].name,
        description: config_list[key].description,
        fields: config_list[key].fields
    }));
}

// 获取指定驱动的配置字段
export function getDriverConfigFields(driverType: string): any[] {
    return config_list[driverType]?.fields || [];
}