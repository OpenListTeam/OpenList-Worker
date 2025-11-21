/** =========== 123云盘 配置信息接口 ================
 * 本文件定义了123云盘存储服务的配置信息接口和数据结构
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 123云盘配置信息接口 ======
export interface CONFIG_INFO {
	// 认证配置
	client_id: string;              // 客户端ID
	client_secret: string;          // 客户端密钥
	refresh_token?: string;         // 刷新令牌（可选）
	access_token?: string;          // 访问令牌（可选）
	
	// 基础配置
	root_folder_id?: string;        // 根文件夹ID，默认为0
	upload_thread?: number;         // 上传线程数，默认为3
	
	// 直链配置
	direct_link?: boolean;          // 是否使用直链
	direct_link_private_key?: string;  // 直链私钥（启用URL鉴权时需要）
	direct_link_valid_duration?: number;  // 直链有效期（分钟），默认30
}

//====== 123云盘保存信息接口 ======
export interface SAVING_INFO {
	access_token?: string;          // 访问令牌
	refresh_token?: string;         // 刷新令牌
	expires_at?: number;            // 过期时间戳
	uid?: number;                   // 用户ID
}

//====== 基础响应接口 ======
export interface BaseResponse {
	code: number;                   // 响应码，0表示成功
	message: string;                // 响应消息
	"x-traceID"?: string;          // 追踪ID
}

//====== 访问令牌响应 ======
export interface AccessTokenResponse extends BaseResponse {
	data: {
		accessToken: string;        // 访问令牌
		expiredAt: string;          // 过期时间
	};
}

//====== 刷新令牌响应 ======
export interface RefreshTokenResponse {
	access_token: string;           // 访问令牌
	expires_in: number;             // 过期时间（秒）
	refresh_token: string;          // 刷新令牌
	scope: string;                  // 权限范围
	token_type: string;             // 令牌类型
}

//====== 用户信息响应 ======
export interface UserInfoResponse extends BaseResponse {
	data: {
		uid: number;                // 用户ID
		spaceUsed: number;          // 已使用空间
		spacePermanent: number;     // 永久空间
		spaceTemp: number;          // 临时空间
	};
}

//====== 文件信息接口 ======
export interface Cloud123File {
	filename: string;               // 文件名
	size: number;                   // 文件大小
	createAt: string;               // 创建时间
	updateAt: string;               // 更新时间
	fileId: number;                 // 文件ID
	type: number;                   // 类型：1-文件夹，2-文件
	etag: string;                   // 文件MD5
	s3KeyFlag: string;              // S3标识
	parentFileId: number;           // 父文件夹ID
	category: number;               // 分类
	status: number;                 // 状态
	trashed: number;                // 是否在回收站：0-否，1-是
}

//====== 文件列表响应 ======
export interface FileListResponse extends BaseResponse {
	data: {
		lastFileId: number;         // 最后一个文件ID，-1表示没有更多
		fileList: Cloud123File[];   // 文件列表
	};
}

//====== 下载信息响应 ======
export interface DownloadInfoResponse extends BaseResponse {
	data: {
		downloadUrl: string;        // 下载链接
	};
}

//====== 直链响应 ======
export interface DirectLinkResponse extends BaseResponse {
	data: {
		url: string;                // 直链地址
	};
}

//====== 上传创建响应 ======
export interface UploadCreateResponse extends BaseResponse {
	data: {
		fileID: number;             // 文件ID（秒传成功时返回）
		preuploadID: string;        // 预上传ID
		reuse: boolean;             // 是否秒传
		sliceSize: number;          // 分片大小
		servers: string[];          // 上传服务器列表
	};
}

//====== 上传完成响应 ======
export interface UploadCompleteResponse extends BaseResponse {
	data: {
		completed: boolean;         // 是否完成
		fileID: number;             // 文件ID
	};
}
