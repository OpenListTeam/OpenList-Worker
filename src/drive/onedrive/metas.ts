/** =========== OneDrive 配置信息接口 ================
 * 本文件定义了OneDrive云存储服务的配置信息接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== OneDrive配置信息接口 ======
export interface CONFIG_INFO {
	// 基础配置
	region: string;              // 区域选择：global, cn, us, de
	root_folder_path: string;    // 根文件夹路径
	
	// 认证配置
	use_online_api: boolean;     // 是否使用在线API刷新Token
	api_address: string;         // 在线API地址
	client_id: string;           // 客户端ID
	client_secret: string;       // 客户端密钥
	redirect_uri: string;        // 重定向URI
	refresh_token: string;       // 刷新令牌
	
	// SharePoint配置
	is_sharepoint: boolean;      // 是否为SharePoint
	site_id: string;             // SharePoint站点ID
	
	// 高级配置
	chunk_size: number;          // 分块上传大小（MB）
	custom_host: string;         // 自定义下载链接主机
	disable_disk_usage: boolean; // 禁用磁盘使用统计
}

//====== OneDrive保存信息接口 ======
export interface SAVING_INFO {
	access_token?: string;       // 访问令牌
	refresh_token?: string;      // 刷新令牌
	expires_at?: number;         // 过期时间戳
}
