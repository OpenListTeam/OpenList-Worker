// ==================== 移动云盘配置信息 ====================

/**
 * 移动云盘配置信息接口
 */
interface CONFIG_INFO {
    // 授权信息（Base64编码的账号密码）
    authorization: string;
    // 云盘类型：personal_new, personal, family, group
    type: string;
    // 根文件夹ID
    root_folder_id?: string;
    // 云盘ID（家庭云/群组云需要）
    cloud_id?: string;
    // 用户域ID（用于显示磁盘使用情况）
    user_domain_id?: string;
}

