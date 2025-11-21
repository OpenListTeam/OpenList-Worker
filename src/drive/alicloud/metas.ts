/** =========== 阿里云盘 类型定义 ================
 * 本文件定义了阿里云盘的类型接口，包括：
 * - 配置信息接口
 * - 保存信息接口
 * - API响应接口
 * - 文件信息接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 配置信息接口 ======
export interface CONFIG_INFO {
	// 基础配置
	drive_type: string;           // 驱动类型：default/resource/backup
	root_folder_id: string;       // 根目录ID
	refresh_token: string;        // 刷新令牌
	
	// 排序配置
	order_by: string;             // 排序字段：name/size/updated_at/created_at
	order_direction: string;      // 排序方向：ASC/DESC
	
	// API配置
	use_online_api: boolean;      // 是否使用在线API
	alipan_type: string;          // 阿里云盘类型：default/alipanTV
	api_address: string;          // API地址
	client_id?: string;           // 客户端ID（可选）
	client_secret?: string;       // 客户端密钥（可选）
	
	// 功能配置
	remove_way: string;           // 删除方式：trash/delete
	rapid_upload: boolean;        // 是否启用秒传
	internal_upload: boolean;     // 是否使用内网上传
	livp_download_format: string; // LIVP下载格式：jpeg/mov
}

//====== 保存信息接口 ======
export interface SAVING_INFO {
	access_token?: string;        // 访问令牌
	refresh_token?: string;       // 刷新令牌
	drive_id?: string;            // 驱动器ID
	user_id?: string;             // 用户ID
	expires_at?: number;          // 过期时间戳
}

//====== 错误响应接口 ======
export interface ErrorResponse {
	code: string;
	message: string;
}

//====== 文件信息接口 ======
export interface AliCloudFile {
	drive_id: string;
	file_id: string;
	parent_file_id: string;
	name: string;
	size: number;
	file_extension?: string;
	content_hash?: string;
	category?: string;
	type: string;                 // folder/file
	thumbnail?: string;
	url?: string;
	created_at: string;
	updated_at: string;
	
	// 创建时使用
	file_name?: string;
}

//====== 文件列表响应接口 ======
export interface FileListResponse {
	items: AliCloudFile[];
	next_marker: string;
}

//====== 驱动信息响应接口 ======
export interface DriveInfoResponse {
	default_drive_id?: string;
	resource_drive_id?: string;
	backup_drive_id?: string;
	user_id: string;
}

//====== 空间信息响应接口 ======
export interface SpaceInfoResponse {
	personal_space_info: {
		total_size: number;
		used_size: number;
	};
}

//====== 分片信息接口 ======
export interface PartInfo {
	part_number: number;
	upload_url?: string;
	etag?: string;
	part_size?: number;
	content_type?: string;
}

//====== 创建文件响应接口 ======
export interface CreateFileResponse {
	file_id: string;
	upload_id?: string;
	rapid_upload?: boolean;
	part_info_list?: PartInfo[];
	type?: string;
	parent_file_id?: string;
	drive_id?: string;
	file_name?: string;
}

//====== 移动/复制响应接口 ======
export interface MoveOrCopyResponse {
	exist: boolean;
	drive_id: string;
	file_id: string;
}

//====== 下载链接响应接口 ======
export interface DownloadUrlResponse {
	url: string;
	expiration?: string;
	method?: string;
	streamsUrl?: {
		jpeg?: string;
		mov?: string;
	};
}

//====== Token响应接口 ======
export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in?: number;
	token_type?: string;
}

//====== 在线API响应接口 ======
export interface OnlineApiResponse {
	refresh_token: string;
	access_token: string;
	text?: string;
}
