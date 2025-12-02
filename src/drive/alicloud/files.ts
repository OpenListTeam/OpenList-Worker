/** =========== 阿里云盘 文件操作驱动器 ================
 * 本文件实现了阿里云盘云存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - 阿里云盘 API 的认证和初始化、路径解析和 ID 查找
 * - 该驱动器继承自 BasicDriver，实现标准统一的云存储接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

//====== 公用导入 ======
import { Context } from "hono";
import { HostClouds } from "./utils";
import { BasicDriver } from "../BasicDriver";
import { DriveResult } from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import { 
	CONFIG_INFO, 
	SAVING_INFO, 
	AliCloudFile, 
	FileListResponse,
	CreateFileResponse,
	MoveOrCopyResponse,
	DownloadUrlResponse,
	PartInfo,
	SpaceInfoResponse
} from "./metas";
import crypto from "crypto";


//====== 阿里云盘文件操作驱动器类 ======
/**
 * 阿里云盘文件操作驱动器类
 * 
 * 继承自 BasicDriver，实现了阿里云盘云存储的完整文件操作功能。
 * 通过阿里云盘开放平台 API 提供文件的增删改查、上传下载等操作。
 */
export class HostDriver extends BasicDriver {
	declare public clouds: HostClouds;
	declare public config: CONFIG_INFO;
	declare public saving: SAVING_INFO;

	/**
	 * 构造函数
	 */
	constructor(
		c: Context,
		router: string,
		config: Record<string, any>,
		saving: Record<string, any>
	) {
		super(c, router, config, saving);
		this.clouds = new HostClouds(c, router, config, saving);
	}

	//====== 初始化和加载 ======
	/**
	 * 初始化驱动
	 * 执行Token刷新和驱动器信息获取
	 */
	async initSelf(): Promise<DriveResult> {
		const result: DriveResult = await this.clouds.initConfig();
		this.saving = this.clouds.saving;
		this.change = true;
		return result;
	}

	/**
	 * 加载驱动
	 * 加载保存的认证信息
	 */
	async loadSelf(): Promise<DriveResult> {
		await this.clouds.loadSaving();
		this.change = this.clouds.change;
		this.saving = this.clouds.saving;
		return {
			flag: true,
			text: "loadSelf",
		};
	}

	//====== 文件列表 ======
	/**
	 * 列出文件
	 * 获取指定目录下的所有文件和文件夹
	 */
	async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
		try {
			// 解析路径获取文件ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			
			// 如果没有UUID，使用根目录ID
			if (!file?.uuid) {
				file = { uuid: this.config.root_folder_id };
			}

			// 获取文件列表
			const files = await this.getFiles(file.uuid);
			
			// 转换为标准格式
			const fileList: fso.FileInfo[] = files.map(f => this.fileToObj(f));

			return {
				pageSize: fileList.length,
				filePath: file?.path,
				fileList: fileList,
			};
		} catch (error: any) {
			console.error("[AliCloud] 列出文件失败:", error.message);
			return {
				pageSize: 0,
				filePath: file?.path,
				fileList: [],
			};
		}
	}

	/**
	 * 获取文件列表（支持分页）
	 */
	private async getFiles(fileId: string): Promise<AliCloudFile[]> {
		const result: AliCloudFile[] = [];
		let marker = "";

		do {
			const data: any = {
				drive_id: this.saving.drive_id,
				parent_file_id: fileId,
				limit: 200,
				order_by: this.config.order_by || con.DEFAULTS.ORDER_BY,
				order_direction: this.config.order_direction || con.DEFAULTS.ORDER_DIRECTION,
			};

			if (marker) {
				data.marker = marker;
			}

			const response: FileListResponse = await this.clouds.request(
				con.API_ENDPOINTS.FILE_LIST,
				"POST",
				data,
				con.LimiterType.LIST
			);

			result.push(...response.items);
			marker = response.next_marker;
		} while (marker);

		return result;
	}

	/**
	 * 将阿里云盘文件对象转换为标准文件对象
	 */
	private fileToObj(file: AliCloudFile): fso.FileInfo {
		return {
			filePath: "",
			fileName: file.name || file.file_name || "",
			fileSize: file.size || 0,
			fileType: file.type === con.FILE_TYPES.FOLDER ? 0 : 1,
			fileUUID: file.file_id,
			thumbnails: file.thumbnail || "",
			timeModify: new Date(file.updated_at),
			fileHash: {
				sha1: file.content_hash || "",
			},
		};
	}

	//====== 路径解析 ======
	/**
	 * 根据路径查找文件UUID
	 */
	async findUUID(path: string): Promise<string> {
		if (!path || path === "/" || path === "\\") {
			return this.config.root_folder_id;
		}

		// 分割路径
		const parts = path.split("/").filter(p => p);
		let currentId = this.config.root_folder_id;

		// 逐级查找
		for (const part of parts) {
			const files = await this.getFiles(currentId);
			const found = files.find(f => f.name === part);
			
			if (!found) {
				throw new Error(`路径不存在: ${path}`);
			}
			
			currentId = found.file_id;
		}

		return currentId;
	}

	/**
	 * 根据UUID查找路径
	 */
	async findPath(uuid: string): Promise<fso.FileInfo[]> {
		const files = await this.getFiles(uuid);
		return files.map(f => this.fileToObj(f));
	}

	//====== 文件下载 ======
	/**
	 * 获取文件下载流
	 */
	async downFile(file: fso.FileFind): Promise<fso.FileLink[]> {
		try {
			// 解析路径获取文件ID
			if (file.path) {
				file.uuid = await this.findUUID(file.path);
			}

			if (!file.uuid) {
				return [{ status: false, result: "文件ID不能为空" }];
			}

			// 获取下载链接
			const response: DownloadUrlResponse = await this.clouds.request(
				con.API_ENDPOINTS.FILE_GET_DOWNLOAD_URL,
				"POST",
				{
					drive_id: this.saving.drive_id,
					file_id: file.uuid,
					expire_sec: 14400, // 4小时
				},
				con.LimiterType.LINK
			);

			let url = response.url;
			
			// 处理LIVP格式
			if (!url && response.streamsUrl) {
				url = response.streamsUrl[this.config.livp_download_format as keyof typeof response.streamsUrl] || "";
			}

			if (!url) {
				return [{ status: false, result: "获取下载链接失败" }];
			}

// 返回下载流，由后端代理下载
			return [
				{
					status: true,
					stream: async (response: any) => {
						try {
							console.log("[AliCloud] 开始代理下载:", url);
							
							// 发起下载请求
							const downloadResponse = await fetch(url, {
								method: "GET",
								headers: {
									"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
									"Referer": "https://www.aliyundrive.com/"
								}
							});

							if (!downloadResponse.ok) {
								throw new Error(`下载请求失败: ${downloadResponse.status} ${downloadResponse.statusText}`);
							}

							// 设置响应头
							response.status = downloadResponse.status;
							
							// 复制重要的响应头
							const contentType = downloadResponse.headers.get("Content-Type");
							const contentLength = downloadResponse.headers.get("Content-Length");
							const contentDisposition = downloadResponse.headers.get("Content-Disposition");
							
							if (contentType) response.header("Content-Type", contentType);
							if (contentLength) response.header("Content-Length", contentLength);
							if (contentDisposition) {
								response.header("Content-Disposition", contentDisposition);
							} else {
								// 如果没有Content-Disposition，根据文件名设置一个
								const fileName = file.path?.split('/').pop() || 'download';
								response.header("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
							}
							
							// 直接返回ReadableStream，让Hono框架处理流传输
							if (downloadResponse.body) {
								console.log("[AliCloud] 返回流式响应");
								return downloadResponse.body;
							} else {
								throw new Error("下载响应体为空");
							}
						} catch (error: any) {
							console.error("[AliCloud] 代理下载失败:", error.message);
							throw error;
						}
					}
				}
			];
		} catch (error: any) {
			console.error("[AliCloud] 获取下载链接失败:", error.message);
			return [{ status: false, result: error.message || "获取下载链接失败" }];
		}
	}

	//====== 文件/文件夹创建 ======
	/**
	 * 创建文件夹
	 */
	async makeDir(file: fso.FileFind): Promise<DriveResult> {
		try {
			// 解析父目录路径
			let parentId = this.config.root_folder_id;
			if (file.path) {
				const parentPath = file.path.substring(0, file.path.lastIndexOf("/"));
				if (parentPath) {
					parentId = await this.findUUID(parentPath);
				}
			}

			const fileName = file.path?.split("/").pop() || file.name || "";

			// 创建文件夹
			const response: CreateFileResponse = await this.clouds.request(
				con.API_ENDPOINTS.FILE_CREATE,
				"POST",
				{
					drive_id: this.saving.drive_id,
					parent_file_id: parentId,
					name: fileName,
					type: con.FILE_TYPES.FOLDER,
					check_name_mode: con.CHECK_NAME_MODES.REFUSE,
				},
				con.LimiterType.OTHER
			);

			return {
				flag: true,
				text: "创建文件夹成功",
				data: response.file_id,
			};
		} catch (error: any) {
			console.error("[AliCloud] 创建文件夹失败:", error.message);
			return {
				flag: false,
				text: error.message || "创建文件夹失败",
			};
		}
	}

	//====== 文件删除 ======
	/**
	 * 删除文件或文件夹
	 */
	async delFile(file: fso.FileFind): Promise<DriveResult> {
		try {
			// 解析路径获取文件ID
			if (file.path) {
				file.uuid = await this.findUUID(file.path);
			}

			if (!file.uuid) {
				throw new Error("文件ID不能为空");
			}

			// 根据配置选择删除方式
			const endpoint = this.config.remove_way === con.REMOVE_WAYS.DELETE
				? con.API_ENDPOINTS.FILE_DELETE
				: con.API_ENDPOINTS.FILE_TRASH;

			await this.clouds.request(
				endpoint,
				"POST",
				{
					drive_id: this.saving.drive_id,
					file_id: file.uuid,
				},
				con.LimiterType.OTHER
			);

			return {
				flag: true,
				text: "删除成功",
			};
		} catch (error: any) {
			console.error("[AliCloud] 删除文件失败:", error.message);
			return {
				flag: false,
				text: error.message || "删除文件失败",
			};
		}
	}

	//====== 文件移动 ======
	/**
	 * 移动文件或文件夹
	 */
	async moveFile(source: fso.FileFind, target: fso.FileFind): Promise<DriveResult> {
		try {
			// 解析源文件ID
			if (source.path) {
				source.uuid = await this.findUUID(source.path);
			}
			
			// 解析目标目录ID
			if (target.path) {
				target.uuid = await this.findUUID(target.path);
			}

			if (!source.uuid || !target.uuid) {
				throw new Error("源文件或目标目录ID不能为空");
			}

			// 移动文件
			const response: MoveOrCopyResponse = await this.clouds.request(
				con.API_ENDPOINTS.FILE_MOVE,
				"POST",
				{
					drive_id: this.saving.drive_id,
					file_id: source.uuid,
					to_parent_file_id: target.uuid,
					check_name_mode: con.CHECK_NAME_MODES.IGNORE,
				},
				con.LimiterType.OTHER
			);

			return {
				flag: true,
				text: "移动成功",
				data: response.file_id,
			};
		} catch (error: any) {
			console.error("[AliCloud] 移动文件失败:", error.message);
			return {
				flag: false,
				text: error.message || "移动文件失败",
			};
		}
	}

	//====== 文件复制 ======
	/**
	 * 复制文件或文件夹
	 */
	async copyFile(source: fso.FileFind, target: fso.FileFind): Promise<DriveResult> {
		try {
			// 解析源文件ID
			if (source.path) {
				source.uuid = await this.findUUID(source.path);
			}
			
			// 解析目标目录ID
			if (target.path) {
				target.uuid = await this.findUUID(target.path);
			}

			if (!source.uuid || !target.uuid) {
				throw new Error("源文件或目标目录ID不能为空");
			}

			// 复制文件
			const response: MoveOrCopyResponse = await this.clouds.request(
				con.API_ENDPOINTS.FILE_COPY,
				"POST",
				{
					drive_id: this.saving.drive_id,
					file_id: source.uuid,
					to_parent_file_id: target.uuid,
					auto_rename: false,
				},
				con.LimiterType.OTHER
			);

			return {
				flag: true,
				text: "复制成功",
				data: response.file_id,
			};
		} catch (error: any) {
			console.error("[AliCloud] 复制文件失败:", error.message);
			return {
				flag: false,
				text: error.message || "复制文件失败",
			};
		}
	}

	//====== 文件重命名 ======
	/**
	 * 重命名文件或文件夹
	 */
	async renameFile(file: fso.FileFind, newName: string): Promise<DriveResult> {
		try {
			// 解析文件ID
			if (file.path) {
				file.uuid = await this.findUUID(file.path);
			}

			if (!file.uuid) {
				throw new Error("文件ID不能为空");
			}

			// 重命名
			await this.clouds.request(
				con.API_ENDPOINTS.FILE_UPDATE,
				"POST",
				{
					drive_id: this.saving.drive_id,
					file_id: file.uuid,
					name: newName,
				},
				con.LimiterType.OTHER
			);

			return {
				flag: true,
				text: "重命名成功",
			};
		} catch (error: any) {
			console.error("[AliCloud] 重命名失败:", error.message);
			return {
				flag: false,
				text: error.message || "重命名失败",
			};
		}
	}

	//====== 文件上传 ======
	/**
	 * 上传文件
	 */
	async upFile(
		file: fso.FileFind,
		fileData: Buffer | ReadableStream,
		onProgress?: (progress: number) => void
	): Promise<DriveResult> {
		try {
			// 解析父目录ID
			let parentId = this.config.root_folder_id;
			if (file.path) {
				const parentPath = file.path.substring(0, file.path.lastIndexOf("/"));
				if (parentPath) {
					parentId = await this.findUUID(parentPath);
				}
			}

			const fileName = file.path?.split("/").pop() || file.name || "";
			const fileSize = file.size || 0;

			// 计算分片大小和数量
			const partSize = this.calculatePartSize(fileSize);
			const partCount = Math.ceil(fileSize / partSize);

			// 创建分片信息列表
			const partInfoList: any[] = [];
			for (let i = 0; i < partCount; i++) {
				partInfoList.push({ part_number: i + 1 });
			}

			// 准备创建文件的数据
			const createData: any = {
				drive_id: this.saving.drive_id,
				parent_file_id: parentId,
				name: fileName,
				type: con.FILE_TYPES.FILE,
				check_name_mode: con.CHECK_NAME_MODES.IGNORE,
				size: fileSize,
				part_info_list: partInfoList,
			};

			// 如果启用秒传，计算pre_hash
			if (this.config.rapid_upload && fileSize > 100 * 1024) {
				const preHash = await this.calculatePreHash(fileData);
				createData.pre_hash = preHash;
			}

			// 创建文件
			let createResponse: CreateFileResponse;
			try {
				createResponse = await this.clouds.request(
					con.API_ENDPOINTS.FILE_CREATE,
					"POST",
					createData,
					con.LimiterType.OTHER
				);
			} catch (error: any) {
				// 如果pre_hash匹配，尝试秒传
				if (error.message.includes(con.ERROR_CODES.PRE_HASH_MATCHED) && this.config.rapid_upload) {
					console.log("[AliCloud] pre_hash匹配，尝试秒传");
					
					// 计算完整文件hash
					const contentHash = await this.calculateSHA1(fileData);
					const proofCode = await this.calculateProofCode(fileData, fileSize);

					delete createData.pre_hash;
					createData.content_hash = contentHash;
					createData.proof_code = proofCode;
					createData.proof_version = "v1";
					createData.content_hash_name = "sha1";

					createResponse = await this.clouds.request(
						con.API_ENDPOINTS.FILE_CREATE,
						"POST",
						createData,
						con.LimiterType.OTHER
					);
				} else {
					throw error;
				}
			}

			// 如果秒传成功
			if (createResponse.rapid_upload) {
				console.log("[AliCloud] 秒传成功");
				if (onProgress) onProgress(100);
				
				return {
					flag: true,
					text: "上传成功（秒传）",
					data: createResponse.file_id,
				};
			}

			// 普通上传
			console.log("[AliCloud] 开始分片上传");
			await this.uploadParts(
				fileData,
				createResponse.part_info_list || [],
				partSize,
				onProgress
			);

			// 完成上传
			await this.clouds.request(
				con.API_ENDPOINTS.FILE_COMPLETE,
				"POST",
				{
					drive_id: this.saving.drive_id,
					file_id: createResponse.file_id,
					upload_id: createResponse.upload_id,
				},
				con.LimiterType.OTHER
			);

			return {
				flag: true,
				text: "上传成功",
				data: createResponse.file_id,
			};
		} catch (error: any) {
			console.error("[AliCloud] 上传文件失败:", error.message);
			return {
				flag: false,
				text: error.message || "上传文件失败",
			};
		}
	}

	/**
	 * 计算分片大小
	 */
	private calculatePartSize(fileSize: number): number {
		let partSize = con.DEFAULTS.CHUNK_SIZE; // 20MB

		if (fileSize > partSize) {
			if (fileSize > 1024 * 1024 * 1024 * 1024) { // > 1TB
				partSize = 5 * 1024 * 1024 * 1024; // 5GB
			} else if (fileSize > 768 * 1024 * 1024 * 1024) { // > 768GB
				partSize = 109951163; // ≈ 104.86MB
			} else if (fileSize > 512 * 1024 * 1024 * 1024) { // > 512GB
				partSize = 82463373; // ≈ 78.64MB
			} else if (fileSize > 384 * 1024 * 1024 * 1024) { // > 384GB
				partSize = 54975582; // ≈ 52.43MB
			} else if (fileSize > 256 * 1024 * 1024 * 1024) { // > 256GB
				partSize = 41231687; // ≈ 39.32MB
			} else if (fileSize > 128 * 1024 * 1024 * 1024) { // > 128GB
				partSize = 27487791; // ≈ 26.21MB
			}
		}

		return partSize;
	}

	/**
	 * 上传分片
	 */
	private async uploadParts(
		fileData: Buffer | ReadableStream,
		partInfoList: PartInfo[],
		partSize: number,
		onProgress?: (progress: number) => void
	): Promise<void> {
		const buffer = fileData instanceof Buffer ? fileData : await this.streamToBuffer(fileData);

		for (let i = 0; i < partInfoList.length; i++) {
			const partInfo = partInfoList[i];
			const start = i * partSize;
			const end = Math.min(start + partSize, buffer.length);
			const chunk = buffer.slice(start, end);

			// 上传分片
			let uploadUrl = partInfo.upload_url || "";
			
			// 如果启用内网上传，替换URL
			if (this.config.internal_upload) {
				uploadUrl = uploadUrl.replace(
					"https://cn-beijing-data.aliyundrive.net/",
					"http://ccp-bj29-bj-1592982087.oss-cn-beijing-internal.aliyuncs.com/"
				);
			}

			const response = await fetch(uploadUrl, {
				method: "PUT",
				body: chunk,
			});

			if (!response.ok && response.status !== 409) {
				throw new Error(`分片上传失败: ${response.status}`);
			}

			// 更新进度
			if (onProgress) {
				const progress = ((i + 1) / partInfoList.length) * 100;
				onProgress(progress);
			}
		}
	}

	/**
	 * 计算文件的前1024字节SHA1（用于秒传）
	 */
	private async calculatePreHash(fileData: Buffer | ReadableStream): Promise<string> {
		const buffer = fileData instanceof Buffer ? fileData : await this.streamToBuffer(fileData);
		const preData = buffer.slice(0, Math.min(1024, buffer.length));
		return crypto.createHash("sha1").update(preData).digest("hex").toUpperCase();
	}

	/**
	 * 计算文件完整SHA1
	 */
	private async calculateSHA1(fileData: Buffer | ReadableStream): Promise<string> {
		const buffer = fileData instanceof Buffer ? fileData : await this.streamToBuffer(fileData);
		return crypto.createHash("sha1").update(buffer).digest("hex").toUpperCase();
	}

	/**
	 * 计算proof_code（用于秒传验证）
	 */
	private async calculateProofCode(fileData: Buffer | ReadableStream, fileSize: number): Promise<string> {
		if (fileSize === 0) {
			return "";
		}

		const buffer = fileData instanceof Buffer ? fileData : await this.streamToBuffer(fileData);
		const accessToken = this.saving.access_token || "";
		
		// 计算proof范围
		const md5 = crypto.createHash("md5").update(accessToken).digest("hex").substring(0, 16);
		const index = BigInt("0x" + md5) % BigInt(fileSize);
		const start = Number(index);
		const end = Math.min(start + 8, fileSize);

		// 提取数据并base64编码
		const proofData = buffer.slice(start, end);
		return proofData.toString("base64");
	}

	/**
	 * 将ReadableStream转换为Buffer
	 */
	private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
		const reader = stream.getReader();
		const chunks: Uint8Array[] = [];
		
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) chunks.push(value);
		}

		return Buffer.concat(chunks);
	}

	//====== 存储空间信息 ======
	/**
	 * 获取存储空间信息
	 */
	async getSpaceInfo(): Promise<{ total: number; used: number; free: number }> {
		try {
			const response: SpaceInfoResponse = await this.clouds.request(
				con.API_ENDPOINTS.GET_SPACE_INFO,
				"POST",
				{},
				con.LimiterType.OTHER
			);

			const total = response.personal_space_info.total_size;
			const used = response.personal_space_info.used_size;

			return {
				total,
				used,
				free: total - used,
			};
		} catch (error: any) {
			console.error("[AliCloud] 获取存储空间信息失败:", error.message);
			return {
				total: 0,
				used: 0,
				free: 0,
			};
		}
	}
}
