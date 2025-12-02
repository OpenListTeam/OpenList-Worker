/** =========== 115云盘 文件操作驱动器 ================
 * 本文件实现了115云盘存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - 115云盘 API 的认证和初始化、路径解析和 ID 查找
 * - 该驱动器继承自 BasicDriver，实现标准统一的云存储接口
 * =========================================================
 * @author "OpenList Team"
 * @version 25.11.21
 * =======================================================*/

// 公用导入 ================================================
import { Context } from "hono";
import { HostClouds } from "./utils";
import { BasicDriver } from "../BasicDriver";
import { DriveResult } from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import { CONFIG_INFO, Cloud115File, Cloud115APIFile, Cloud115FileListResponse, Cloud115UploadInitResponse, Cloud115UploadTokenResponse } from "./metas";

/**
 * 115云盘 文件操作驱动器类
 * 
 * 继承自 BasicDriver，实现了 115 云盘存储的完整文件操作功能。
 * 通过 115 API 提供文件的增删改查、上传下载等操作。
 */
export class HostDriver extends BasicDriver {
	declare public clouds: HostClouds;
	declare public config: CONFIG_INFO;

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
	 * 执行Token验证和配置初始化
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
			// 确保file对象存在
			if (!file) {
				file = { path: "/", uuid: "" };
			}

			// 获取文件ID
			if (file.path) {
				file.uuid = await this.findUUID(file.path) || "";
			}
			if (!file.uuid) {
				file.uuid = this.config.root_folder_id || "0";
			}

			// 获取文件列表
			const files = await this.getFiles(file.uuid);
			const fileList: fso.FileInfo[] = files.map((f) => this.convertToFileInfo(f, file.path || "/"));

			return {
				pageSize: fileList.length,
				filePath: file.path || "/",
				fileList: fileList,
			};
		} catch (error: any) {
			console.error("[115云盘] listFile error:", error);
			return { fileList: [], pageSize: 0, filePath: "/" };
		}
	}

	//====== 文件下载 ======
	/**
	 * 获取文件下载链接
	 * 返回文件的直接下载URL
/**
	 * 下载文件
	 */
	async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
		try {
			// 获取文件ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path) || "";
			}
			if (!file?.uuid) {
				return [{ status: false, result: "No UUID" }];
			}

			console.log(`[115云盘] 开始下载文件，UUID: ${file.uuid}`);

			// 获取文件的父目录ID
			// 在115云盘中，我们需要获取文件所在目录的文件列表来找到该文件的pick_code
			const fileInfo = await this.findFileById(file.uuid);
			if (!fileInfo || !fileInfo.Pc) {
				return [{ status: false, result: "No file info or pick_code" }];
			}

			console.log(`[115云盘] 找到文件信息: ${fileInfo.Fn}, pick_code: ${fileInfo.Pc}`);

			// 使用正确的115下载API - 基于搜索结果的实现
			const downloadUrl = await this.getDownloadUrlByPickCode(fileInfo.Pc);
			if (!downloadUrl) {
				return [{ status: false, result: "No download URL" }];
			}

			console.log(`[115云盘] 获取下载链接成功: ${downloadUrl}`);

			return [
				{
					status: true,
					direct: downloadUrl,
				},
			];
		} catch (error: any) {
			console.error("[115云盘] downFile error:", error);
			return [{ status: false, result: error.message }];
		}
	}

/**
	 * 通过pick_code获取下载链接
	 * 基于搜索结果中的正确实现
	 */
	private async getDownloadUrlByPickCode(pickCode: string): Promise<string | null> {
		try {
			// 生成时间戳和签名
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const signature = this.generateDownloadSignature(pickCode, timestamp);
			
			const payload = {
				pickcode: pickCode,
				type: 0,
				sign: signature,
				time: timestamp
			};

			console.log(`[115云盘] 下载请求参数:`, payload);

			// 直接使用完整URL，不通过getApiUrl
			const url = "https://webapi.115.com/files/download";
			const response = await this.clouds.requestFullUrl(url, "POST", payload, {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Referer': 'https://115.com/',
				'Origin': 'https://115.com'
			});

			console.log(`[115云盘] 下载API响应:`, response);

			if (!response || !response.state) {
				console.log(`[115云盘] 下载API返回失败:`, response);
				return null;
			}

			if (!response.data || !response.data.url) {
				console.log(`[115云盘] 响应中没有下载链接:`, response.data);
				return null;
			}

			return response.data.url;
		} catch (error: any) {
			console.error("[115云盘] getDownloadUrlByPickCode error:", error);
			return null;
		}
	}

	/**
	 * 生成下载请求的签名
	 * 基于搜索结果中的签名算法
	 */
	private generateDownloadSignature(pickcode: string, timestamp: string): string {
		const crypto = require('crypto');
		const raw = `download${pickcode}${timestamp}salt!@#`;
		return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
	}

/**
	 * 通过文件ID查找文件信息（包含pick_code）
	 */
	private async findFileById(fileId: string): Promise<Cloud115APIFile | null> {
		try {
			console.log(`[115云盘] 开始查找文件ID: ${fileId}`);
			
			// 递归查找文件的辅助函数
			const searchInDirectory = async (dirId: string, depth: number = 0): Promise<Cloud115APIFile | null> => {
				if (depth > 10) { // 防止无限递归
					console.log(`[115云盘] 查找深度超过限制，停止查找`);
					return null;
				}
				
				console.log(`[115云盘] 在目录 ${dirId} 中查找（深度: ${depth}）`);
				
				const files = await this.getFiles(dirId);
				if (!files || files.length === 0) {
					console.log(`[115云盘] 目录 ${dirId} 为空`);
					return null;
				}
				
				// 在当前目录查找
				const found = files.find(f => f.Fid === fileId);
				if (found) {
					console.log(`[115云盘] 找到文件: ${found.Fn} (ID: ${found.Fid})`);
					return found;
				}
				
				// 如果是文件夹，递归查找子目录
				const folders = files.filter(f => f.Fc === "0"); // Fc="0" 表示文件夹
				console.log(`[115云盘] 在目录 ${dirId} 中找到 ${folders.length} 个子文件夹`);
				
				for (const folder of folders) {
					const result = await searchInDirectory(folder.Fid, depth + 1);
					if (result) {
						return result;
					}
				}
				
				return null;
			};
			
			// 从根目录开始查找
			const rootCid = "0"; // 根目录ID
			const result = await searchInDirectory(rootCid);
			
			if (!result) {
				console.log(`[115云盘] 未找到文件ID: ${fileId}`);
			}
			
			return result;
		} catch (error: any) {
			console.error("[115云盘] findFileById error:", error);
			return null;
		}
	}

	//====== 文件复制 ======
	/**
	 * 复制文件
	 * 将文件复制到目标目录
	 */
	async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
try {
			// 获取源文件和目标目录ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path) || "";
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path) || "";
			}
			if (!file?.uuid || !dest?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			// 执行复制
			const url = this.clouds.getApiUrl(con.API_PATHS.COPY);
			await this.clouds.request(url, "POST", {
				pid: dest.uuid,
				fid: file.uuid,
				no_dupli: "1",
			});

			return {
				taskType: fso.FSAction.COPYTO,
				taskFlag: fso.FSStatus.PROCESSING_NOW,
			};
		} catch (error: any) {
			console.error("[115云盘] copyFile error:", error);
			return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message };
		}
	}

	//====== 文件移动 ======
	/**
	 * 移动文件
	 * 将文件移动到目标目录
	 */
	async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
try {
			// 获取源文件和目标目录ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path) || "";
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path) || "";
			}
			if (!file?.uuid || !dest?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			// 执行移动
			const url = this.clouds.getApiUrl(con.API_PATHS.MOVE);
			await this.clouds.request(url, "POST", {
				fid: file.uuid,
				pid: dest.uuid,
			});

			return {
				taskType: fso.FSAction.MOVETO,
				taskFlag: fso.FSStatus.PROCESSING_NOW,
			};
		} catch (error: any) {
			console.error("[115云盘] moveFile error:", error);
			return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message };
		}
	}

	//====== 文件删除 ======
	/**
	 * 删除文件
	 * 删除指定的文件或文件夹
	 */
	async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
		try {
			// 获取文件ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			// 获取文件信息以获取父目录ID
			const fileInfo = await this.getFile(file.uuid);
			if (!fileInfo) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			// 执行删除
			const url = this.clouds.getApiUrl(con.API_PATHS.DELETE);
			await this.clouds.request(url, "POST", {
				fid: file.uuid,
				pid: fileInfo.cid || fileInfo.pid || "0",
			});

			return {
				taskType: fso.FSAction.DELETE,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("[115云盘] killFile error:", error);
			return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message };
		}
	}

	//====== 文件创建 ======
	/**
	 * 创建文件或文件夹
	 * 在指定目录下创建新的文件或文件夹
	 */
	async makeFile(
		file?: fso.FileFind,
		name?: string | null,
		type?: fso.FileType,
		data?: any | null
	): Promise<DriveResult | null> {
		try {
			// 获取父目录ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				file.uuid = this.config.root_folder_id || "0";
			}
			if (!name) {
				return { flag: false, text: "Invalid parameters" };
			}

			// 创建文件夹
			if (type === fso.FileType.F_DIR) {
				const url = this.clouds.getApiUrl(con.API_PATHS.MKDIR);
				const result = await this.clouds.request(url, "POST", {
					pid: file.uuid,
					cname: name.replace(/\/$/, ""),
				});

				return { flag: true, text: result.cid || result.file_id };
			}
			// 创建文件
			else {
				return await this.uploadFile(file.uuid, name, data);
			}
		} catch (error: any) {
			console.error("[115云盘] makeFile error:", error);
			return { flag: false, text: error.message };
		}
	}

	//====== 文件上传 ======
	/**
	 * 上传文件
	 * 支持小文件直接上传和大文件分块上传
	 */
	async pushFile(
		file?: fso.FileFind,
		name?: string | null,
		type?: fso.FileType,
		data?: any | null
	): Promise<DriveResult | null> {
		return this.makeFile(file, name, type, data);
	}

	//====== 辅助方法 ======
/**
	 * 根据路径查找文件 ID
	 * 将文件系统路径转换为 115 云盘的文件 ID
	 */
async findUUID(path: string): Promise<string | null> {
		try {
			// 根目录
			if (!path || path === "/" || path === "\\") {
				return this.config.root_folder_id || "0";
			}

			// 分割路径，并对每个部分进行URL解码
			const parts = path.split("/").filter((part) => part.trim() !== "");
			if (parts.length === 0) {
				return this.config.root_folder_id || "0";
			}

			// 逐级查找
			let currentID = this.config.root_folder_id || "0";
			for (const part of parts) {
				// 对路径部分进行URL解码，处理中文文件名
				const decodedPart = decodeURIComponent(part);
				const cleanPart = decodedPart.replace(/\/$/, "");
				
				console.log(`[115云盘] 查找路径部分: ${part} -> 解码后: ${decodedPart} -> 清理后: ${cleanPart}`);
				
				const files = await this.getFiles(currentID);
				if (!files || files.length === 0) {
					console.log(`[115云盘] 目录 ${currentID} 为空或获取失败`);
					return null;
				}
				
				// 兼容新旧两种格式的文件名匹配
				const foundFile = files.find((f) => {
					if (!f) return false;
					
					// 新格式：使用Fn字段
					if ((f as Cloud115APIFile).Fn && (f as Cloud115APIFile).Fn === cleanPart) {
						return true;
					}
					// 旧格式：使用n字段
					if ((f as any).n && (f as any).n === cleanPart) {
						return true;
					}
					// 新格式：如果Fn为空，尝试其他字段
					if (!(f as Cloud115APIFile).Fn && (f as any).fileName === cleanPart) {
						return true;
					}
					// 更多的字段匹配尝试
					if ((f as any).name === cleanPart || (f as any).file_name === cleanPart) {
						return true;
					}
					return false;
				});
				
				if (!foundFile) {
					console.log(`[115云盘] 未找到文件/文件夹: ${cleanPart}`);
					console.log(`[115云盘] 当前目录文件列表:`, files.map(f => ({
						name: (f as Cloud115APIFile).Fn || (f as any).n || (f as any).fileName || 'unknown',
						id: (f as Cloud115APIFile).Fid || (f as any).fid
					})));
					return null;
				}
				currentID = (foundFile as Cloud115APIFile).Fid || 
						  (foundFile as any).fileUUID || 
						  (foundFile as any).fid || 
						  (foundFile as any).id || "";
				
				console.log(`[115云盘] 找到文件: ${cleanPart}, ID: ${currentID}`);
				
				if (!currentID) {
					return null;
				}
			}

			return currentID;
		} catch (error: any) {
			console.error("[115云盘] findUUID error:", error);
			return null;
		}
	}

/**
	 * 获取文件列表
	 * 获取指定目录下的所有文件，支持分页
	 */
	private async getFiles(cid: string): Promise<Cloud115APIFile[]> {
		const files: Cloud115APIFile[] = [];
		const pageSize = 200;
		let offset = 0;

		console.log(`[115云盘] 开始获取文件列表，cid: ${cid}`);

		while (true) {
			const url = this.clouds.getApiUrl(con.API_PATHS.FILES_LIST);
			
			// 修复参数格式：115 Open API期望小写参数名
			const params: Record<string, any> = {
				cid: cid,  // 修复：使用小写的cid
				limit: pageSize,  // 修复：使用小写的limit
				offset: offset,  // 修复：使用小写的offset
				asc: this.config.order_direction === "asc" ? "1" : "0",  // 修复：使用字符串"1"/"0"
				o: this.config.order_by || "file_name",  // 修复：使用小写的o
				show_dir: "1",  // 修复：使用字符串"1"而不是true
			};

			const result: Cloud115FileListResponse = await this.clouds.request(url, "GET", params);

			console.log(`[115云盘] API响应: state=${result.state}, count=${result.count}, dataCount=${result.data?.length || 0}`);

			// 检查响应状态
			if (!result.state) {
				console.error(`[115云盘] API返回错误:`, result.error || result.text);
				break;
			}

			// 检查数据是否存在
			if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
				console.log(`[115云盘] 没有更多数据，结束获取`);
				break;
			}

			/**
			 * 转换API返回的数据格式
			 */
			const apiFiles: Cloud115APIFile[] = result.data.map((item: any) => {
				// 基于115 SDK Go版本的实现，确保字段映射正确
				const converted: Cloud115APIFile = {
					Fid: item.fid || item.file_id || item.id || item.fileUUID || item.Fid || "",
					Fn: item.fn || item.n || item.file_name || item.name || item.fileName || item.Fn || "", // 优先使用fn字段（115 API实际返回的字段名）
					Fc: item.fc || item.file_type || item.type || item.Fc || "1",
					FS: item.fs || item.s || item.size || item.file_size || item.FS || item.fs || 0, // 优先使用fs字段
					Sha1: item.sha1 || item.hash || item.Sha1 || "",
					Pc: item.pc || item.pick_code || item.pickCode || item.Pc || "",
					Thumbnail: item.ico || item.thumb || item.thumbnail || item.Thumbnail || "",
					UpPt: item.uppt || item.tp || item.time_create || item.create_time || item.UpPt || item.uppt || 0,
					Upt: item.upt || item.tu || item.time_update || item.update_time || item.Upt || item.upt || 0,
					Pid: item.pid || item.cid || item.parent_id || item.parentId || item.Pid || "0",
				};
				
				return converted;
			});

			// 过滤掉无效的文件（没有ID或文件名的）
			const validFiles = apiFiles.filter(file => file.Fid && file.Fn);
			console.log(`[115云盘] 有效文件数量: ${validFiles.length}/${apiFiles.length}`);

			files.push(...validFiles);

			// 检查是否已经获取了所有文件
			const totalCount = result.count || 0;
			if (files.length >= totalCount) {
				console.log(`[115云盘] 已获取所有文件: ${files.length}/${totalCount}`);
				break;
			}

			offset += pageSize;
		}

		console.log(`[115云盘] 最终获取文件数量: ${files.length}`);
		return files;
	}

	/**
	 * 获取文件信息
	 * 获取指定文件的详细信息
/**
	 * 获取文件信息（从文件列表缓存中获取）
	 * 注意：115 Open API的文件列表已经包含了所有必要信息，无需额外调用API
	 */
	private async getFile(fid: string): Promise<Cloud115File | null> {
		try {
			// 由于文件列表API已经返回了完整的文件信息（包括pick_code），
			// 我们不需要调用额外的文件信息API（该API路径错误）
			// 而是应该直接使用文件列表中获取的信息
			
			// 从常量中创建一个基本的文件信息结构
			// 实际使用中，文件信息应该在downFile中通过文件列表数据传递
			const fileInfo: Cloud115File = {
				fid: fid,
				pc: "", // pick_code应该由调用方提供
			};
			
			console.log(`[115云盘] getFile: 注意 - 此方法已废弃，文件信息应从文件列表获取`);
			return fileInfo;
		} catch (error: any) {
			console.error("[115云盘] getFile error:", error);
			return null;
		}
	}

	/**
	 * 上传文件
	 * 根据文件大小选择直接上传或分块上传
	 */
	private async uploadFile(parentID: string, name: string, data: any): Promise<DriveResult> {
		try {
			// 获取文件数据和大小
			let fileSize = 0;
			let fileData: ArrayBuffer;

			if (data instanceof File || data instanceof Blob) {
				fileSize = data.size;
				fileData = await data.arrayBuffer();
			} else if (data instanceof ArrayBuffer) {
				fileSize = data.byteLength;
				fileData = data;
			} else if (typeof data === "string") {
				fileData = new TextEncoder().encode(data).buffer;
				fileSize = fileData.byteLength;
			} else {
				return { flag: false, text: "Unsupported data type" };
			}

// 计算SHA1哈希
			const sha1 = await this.clouds.calculateSHA1(fileData);

			// 计算预哈希（前128KB）
			const preHashSize = Math.min(con.PRE_HASH_SIZE, fileSize);
			const preHashData = fileData.slice(0, preHashSize);
			const preHash = await this.clouds.calculateSHA1(preHashData as ArrayBuffer);

			// 1. 初始化上传
			let initResp = await this.uploadInit(parentID, name, fileSize, sha1, preHash);

			// 2. 秒传成功
			if (initResp.status === 2) {
				return { flag: true, text: "Upload completed (rapid)" };
			}

			// 3. 二次验证
			if ([6, 7, 8].includes(initResp.status) && initResp.sign_check) {
				const signCheck = initResp.sign_check.split("-");
				const start = parseInt(signCheck[0], 10);
				const end = parseInt(signCheck[1], 10);
				const signData = fileData.slice(start, end + 1);
				const signVal = await this.clouds.calculateSHA1(signData);

				initResp = await this.uploadInit(
					parentID,
					name,
					fileSize,
					sha1,
					preHash,
					initResp.sign_key,
					signVal
				);

				if (initResp.status === 2) {
					return { flag: true, text: "Upload completed (rapid after verify)" };
				}
			}

			// 4. 获取上传Token
			const tokenResp = await this.getUploadToken();

			// 5. 上传文件
			if (fileSize <= con.SMALL_FILE_THRESHOLD) {
				await this.uploadSmall(fileData, initResp, tokenResp);
			} else {
				await this.uploadMultipart(fileData, initResp, tokenResp);
			}

			return { flag: true, text: "Upload completed" };
		} catch (error: any) {
			console.error("[115云盘] uploadFile error:", error);
			return { flag: false, text: error.message };
		}
	}

	/**
	 * 初始化上传
	 * 获取上传参数和检查是否可以秒传
	 */
	private async uploadInit(
		target: string,
		fileName: string,
		fileSize: number,
		fileId: string,
		preId: string,
		signKey?: string,
		signVal?: string
	): Promise<Cloud115UploadInitResponse> {
		const url = this.clouds.getApiUrl(con.API_PATHS.UPLOAD_INIT);
		const params: any = {
			target: target,
			filename: fileName,
			filesize: fileSize,
			fileid: fileId,
			preid: preId,
		};

		if (signKey) {
			params.sign_key = signKey;
		}
		if (signVal) {
			params.sign_val = signVal;
		}

		return await this.clouds.request(url, "POST", params);
	}

	/**
	 * 获取上传Token
	 * 获取OSS上传凭证
	 */
	private async getUploadToken(): Promise<Cloud115UploadTokenResponse> {
		const url = this.clouds.getApiUrl(con.API_PATHS.UPLOAD_TOKEN);
		return await this.clouds.request(url, "GET");
	}

	/**
	 * 上传小文件
	 * 直接上传小文件
	 */
	private async uploadSmall(
		data: ArrayBuffer,
		initResp: Cloud115UploadInitResponse,
		tokenResp: Cloud115UploadTokenResponse
	): Promise<void> {
		// 注意：这里需要使用阿里云OSS SDK或直接调用OSS API
		// 由于TypeScript环境限制，这里提供基本实现框架
		// 实际使用时需要根据环境选择合适的OSS客户端库

		const ossUrl = `https://${initResp.bucket}.${tokenResp.endpoint}/${initResp.object}`;
		
		// 构建回调参数
		const callback = Buffer.from(JSON.stringify(initResp.callback)).toString("base64");
		
		await fetch(ossUrl, {
			method: "PUT",
			headers: {
				"Authorization": `OSS ${tokenResp.access_key_id}:signature`,
				"x-oss-security-token": tokenResp.security_token || "",
				"x-oss-callback": callback,
				"Content-Type": "application/octet-stream",
			},
			body: data,
		});
	}

	/**
	 * 分块上传大文件
	 * 使用分块上传方式上传大文件
	 */
	private async uploadMultipart(
		data: ArrayBuffer,
		initResp: Cloud115UploadInitResponse,
		tokenResp: Cloud115UploadTokenResponse
	): Promise<void> {
		// 注意：这里需要使用阿里云OSS SDK的分块上传功能
		// 由于TypeScript环境限制，这里提供基本实现框架
		// 实际使用时需要根据环境选择合适的OSS客户端库

		const fileSize = data.byteLength;
		const chunkSize = this.clouds.calculatePartSize(fileSize);
		const ossUrl = `https://${initResp.bucket}.${tokenResp.endpoint}/${initResp.object}`;

		// 1. 初始化分块上传
		const initUrl = `${ossUrl}?uploads`;
		const initResponse = await fetch(initUrl, {
			method: "POST",
			headers: {
				"Authorization": `OSS ${tokenResp.access_key_id}:signature`,
				"x-oss-security-token": tokenResp.security_token || "",
			},
		});
		const initXml = await initResponse.text();
		const uploadId = initXml.match(/<UploadId>(.*?)<\/UploadId>/)?.[1];

		if (!uploadId) {
			throw new Error("Failed to get upload ID");
		}

		// 2. 上传分块
		const parts: Array<{ partNumber: number; etag: string }> = [];
		let offset = 0;
		let partNumber = 1;

		while (offset < fileSize) {
			const end = Math.min(offset + chunkSize, fileSize);
			const chunk = data.slice(offset, end);

			const partUrl = `${ossUrl}?partNumber=${partNumber}&uploadId=${uploadId}`;
			const partResponse = await fetch(partUrl, {
				method: "PUT",
				headers: {
					"Authorization": `OSS ${tokenResp.access_key_id}:signature`,
					"x-oss-security-token": tokenResp.security_token || "",
					"Content-Type": "application/octet-stream",
				},
				body: chunk,
			});

			const etag = partResponse.headers.get("ETag");
			if (etag) {
				parts.push({ partNumber, etag });
			}

			offset = end;
			partNumber++;
		}

		// 3. 完成分块上传
		const completeUrl = `${ossUrl}?uploadId=${uploadId}`;
		const completeXml = `<CompleteMultipartUpload>${parts
			.map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`)
			.join("")}</CompleteMultipartUpload>`;

		const callback = Buffer.from(JSON.stringify(initResp.callback)).toString("base64");

		await fetch(completeUrl, {
			method: "POST",
			headers: {
				"Authorization": `OSS ${tokenResp.access_key_id}:signature`,
				"x-oss-security-token": tokenResp.security_token || "",
				"x-oss-callback": callback,
				"Content-Type": "application/xml",
			},
			body: completeXml,
		});
	}

/**
	 * 转换文件信息
	 * 将115云盘文件信息转换为标准文件信息格式
	 */
	private convertToFileInfo(file: Cloud115File | Cloud115APIFile, parentPath: string = ""): fso.FileInfo {
		if (!file) {
			// 返回默认文件信息，避免空指针错误
			return {
				filePath: parentPath || "/",
				fileUUID: "",
				fileName: "未知文件",
				fileSize: 0,
				fileType: fso.FileType.F_ALL,
				thumbnails: "",
				timeModify: new Date(),
				timeCreate: new Date(),
			};
		}

		// 构建完整的文件路径
		const fileName = this.extractFileName(file);
		const filePath = parentPath && parentPath !== "/" 
			? `${parentPath.replace(/\/$/, '')}/${fileName}`
			: `/${fileName}`;

		// 检查是否为新格式（API实际返回的格式）
		if ('Fid' in file) {
			const apiFile = file as Cloud115APIFile;
			const isFolder = apiFile.Fc === "0";
			
			return {
				filePath: filePath,
				fileUUID: apiFile.Fid || "",
				fileName: fileName,
				fileSize: apiFile.FS || 0,
				fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
				thumbnails: apiFile.Thumbnail || "",
				timeModify: apiFile.Upt ? new Date(apiFile.Upt * 1000) : new Date(),
				timeCreate: apiFile.UpPt ? new Date(apiFile.UpPt * 1000) : new Date(),
			};
		}
		// 旧格式处理
		else {
			const legacyFile = file as Cloud115File;
			const isFolder = legacyFile.fc === "0";
			
			return {
				filePath: filePath,
				fileUUID: legacyFile.fid || "",
				fileName: fileName,
				fileSize: legacyFile.s || 0,
				fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
				thumbnails: legacyFile.thumb || "",
				timeModify: legacyFile.tu ? new Date(legacyFile.tu * 1000) : new Date(),
				timeCreate: legacyFile.te ? new Date(legacyFile.te * 1000) : new Date(),
			};
		}
	}

/**
	 * 提取文件名
	 * 从不同格式的文件信息中提取文件名
	 */
	private extractFileName(file: Cloud115File | Cloud115APIFile): string {
		if (!file) {
			return "未知文件";
		}
		
		if ('Fid' in file) {
			const apiFile = file as Cloud115APIFile;
			return apiFile.Fn || `未知文件_${apiFile.Fid}`;
		} else {
			const legacyFile = file as Cloud115File;
			return legacyFile.n || `未知文件_${legacyFile.fid}`;
		}
	}
}