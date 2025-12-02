/** =========== 115云盘 配置信息接口 ================
 * 本文件定义了115云盘存储服务的配置信息接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 115云盘配置信息接口 ======
export interface CONFIG_INFO {
	// 认证配置
	access_token: string;        // 访问令牌
	refresh_token: string;       // 刷新令牌
	
	// 基础配置
	root_folder_id: string;      // 根文件夹ID，默认为"0"
	
	// 排序配置
	order_by: string;            // 排序方式：file_name, file_size, user_utime, file_type
	order_direction: string;     // 排序方向：asc, desc
	
	// 限流配置
	limit_rate: number;          // API请求限流（请求/秒），默认1
}

//====== 115云盘保存信息接口 ======
export interface SAVING_INFO {
	access_token?: string;       // 访问令牌
	refresh_token?: string;      // 刷新令牌
	user_id?: string;            // 用户ID
	user_name?: string;          // 用户名
}

//====== 115云盘文件信息接口（期望格式） ======
export interface Cloud115File {
	fid: string;                 // 文件ID
	cid?: string;                // 父目录ID
	pid?: string;                // 父目录ID（另一种表示）
	n: string;                   // 文件名
	s?: number;                  // 文件大小
	fc?: string;                 // 文件分类（0=文件夹）
	sha1?: string;               // SHA1哈希
	pc?: string;                 // PickCode
	te?: number;                 // 创建时间
	tu?: number;                 // 修改时间
	tp?: number;                 // 上传时间
	ico?: string;                // 图标
	thumb?: string;              // 缩略图
}

//====== 115云盘API实际返回的文件信息接口 ======
export interface Cloud115APIFile {
	Fid: string;                 // 文件ID
	Fn: string;                  // 文件名
	Fc: string;                  // 文件类别（0=文件夹）
	FS: number;                  // 文件大小
	Sha1?: string;               // SHA1哈希
	Pc?: string;                 // PickCode
	Thumbnail?: string;          // 缩略图
	UpPt?: number;               // 上传时间戳
	Upt?: number;                // 更新时间戳
	Pid?: string;                // 父目录ID
}

//====== 115云盘文件列表响应 ======
export interface Cloud115FileListResponse {
	state: boolean;
	flag?: boolean;              // 新API格式中的状态标识
	error?: string;
	text?: string;               // 新API格式中的消息
	count?: number;
	data?: Cloud115File[] | Cloud115APIFile[] | any[];  // 支持两种格式
	offset?: number;
	page_size?: number;
}

//====== 115云盘用户信息响应 ======
export interface Cloud115UserInfoResponse {
	state: boolean;
	error?: string;
	data?: {
		user_id: string;
		user_name: string;
		space_info?: {
			all_total: {
				size: number;
			};
			all_remain: {
				size: number;
			};
		};
	};
}

//====== 115云盘上传初始化响应 ======
export interface Cloud115UploadInitResponse {
	state: boolean;
	status: number;              // 1=需要上传, 2=秒传成功, 6/7/8=需要二次验证
	sign_key?: string;           // 签名密钥
	sign_check?: string;         // 签名检查范围
	bucket?: string;             // OSS bucket
	object?: string;             // OSS object
	callback?: {
		callback: string;
		callback_var: string;
	};
}

//====== 115云盘上传Token响应 ======
export interface Cloud115UploadTokenResponse {
	state: boolean;
	endpoint?: string;
	access_key_id?: string;
	access_key_secret?: string;
	security_token?: string;
}
