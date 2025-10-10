/**
 * OAuth绑定配置接口
 */
export interface BindsConfig {
    oauth_name: string;     // 授权名称
    binds_user: string;     // 绑定的用户名
    binds_data: string;     // 绑定数据（JSON格式）
    is_enabled: number;     // 是否启用（1启用，0禁用）
}

/**
 * OAuth绑定操作结果接口
 */
export interface BindsResult {
    flag: boolean;          // 操作是否成功
    text: string;           // 操作结果描述
    data?: BindsConfig[];   // 返回的绑定数据
}

/**
 * OAuth绑定数据接口
 */
export interface BindsData {
    oauth_user_id: string;  // OAuth用户ID
    email?: string;         // 邮箱
    name?: string;          // 姓名
    avatar?: string;        // 头像
    raw_data: string;       // 原始数据
    created_at: number;     // 创建时间
    updated_at?: number;    // 更新时间
}