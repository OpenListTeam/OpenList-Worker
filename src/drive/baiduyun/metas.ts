/** =========== 百度网盘 配置信息接口 ================
 * 本文件定义了百度网盘云存储服务的配置信息接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 百度网盘配置信息接口 ======
export interface CONFIG_INFO {
	// 基础配置
	root_path: string;                    // 根目录路径
	
	// 排序配置
	order_by: string;                     // 排序方式：name, time, size
	order_direction: string;              // 排序方向：asc, desc
	
	// 下载配置
	download_api: string;                 // 下载API类型：official, crack, crack_video
	custom_crack_ua: string;              // 自定义破解UA
	
	// 认证配置
	use_online_api: boolean;              // 是否使用在线API刷新Token
	api_address: string;                  // 在线API地址
	client_id: string;                    // 客户端ID
	client_secret: string;                // 客户端密钥
	refresh_token: string;                // 刷新令牌
	
	// 上传配置
	upload_thread: string;                // 上传线程数（1-32）
	upload_api: string;                   // 上传API地址
	custom_upload_part_size: number;      // 自定义上传分片大小（0为自动）
	low_bandwith_upload_mode: boolean;    // 低带宽上传模式
	
	// 其他配置
	only_list_video_file: boolean;        // 仅列出视频文件
}

//====== 百度网盘保存信息接口 ======
export interface SAVING_INFO {
	access_token?: string;                // 访问令牌
	refresh_token?: string;               // 刷新令牌
	vip_type?: number;                    // 会员类型：0普通、1会员、2超级会员
}
