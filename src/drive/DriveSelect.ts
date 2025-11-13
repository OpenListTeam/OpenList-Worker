import * as cloud189 from "./cloud189/files"
import * as cloud139 from "./cloud139/files"
import * as goodrive from "./goodrive/files"

interface FormValues {
    auth_type: string;
}

export const driver_list: Record<string, any> = {
    cloud189: cloud189.HostDriver,
    cloud139: cloud139.HostDriver,
    goodrive: goodrive.HostDriver,
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
            { key: "cookie", label: "Cookie", type: "textarea", required: false, placeholder: "请输入Cookie值", show: (values: FormValues) => values.authtype === 'cookie' },
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