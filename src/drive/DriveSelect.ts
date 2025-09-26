import * as cloud189 from "./cloud189/files"
import * as goodrive from "./goodrive/files"
import * as cloud189_metas from "./cloud189/metas"
import * as goodrive_metas from "./goodrive/metas"

export const driver_list: Record<string, any> = {
    cloud189: cloud189.HostDriver,
    goodrive: goodrive.HostDriver,
};

// 驱动配置信息映射
export const config_list: Record<string, any> = {
    cloud189: {
        name: "天翼云盘",
        description: "中国电信天翼云盘存储服务",
        fields: [
            { key: "username", label: "用户名", type: "text", required: true, placeholder: "请输入天翼云盘用户名" },
            { key: "password", label: "密码", type: "password", required: true, placeholder: "请输入天翼云盘密码" },
            { key: "cookie", label: "Cookie", type: "textarea", required: false, placeholder: "可选：手动设置Cookie" }
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