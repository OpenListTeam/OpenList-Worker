/** =========== WebDAV 配置信息接口 ================
 * 本文件定义了WebDAV云存储服务的配置信息接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== WebDAV配置信息接口 ======
export interface CONFIG_INFO {
	// 基础配置
	vendor: string;                  // 服务商类型：sharepoint, other
	address: string;                 // WebDAV服务器地址
	username: string;                // 用户名
	password: string;                // 密码
	root_path: string;               // 根目录路径
	
	// 高级配置
	tls_insecure_skip_verify: boolean; // 跳过TLS证书验证
}

//====== WebDAV保存信息接口 ======
export interface SAVING_INFO {
	cookie?: string;                 // SharePoint认证Cookie
	last_login?: number;             // 最后登录时间戳
}
