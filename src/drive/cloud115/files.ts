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
import { CONFIG_INFO, Cloud115File, Cloud115FileListResponse, Cloud115UploadInitResponse, Cloud115UploadTokenResponse } from "./metas";

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
			// 获取文件ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				file.uuid = this.config.root_folder_id || "0";
			}

			// 获取文件列表
			const files = await this.getFiles(file.uuid);
			const fileList: fso.FileInfo[] = files.map((f) => this.convertToFileInfo(f));

			return {
				pageSize: fileList.length,
				filePath: file?.path,
				fileList: fileList,
			};
		} catch (error: any) {
			console.error("[115云盘] listFile error:", error);
			return { fileList: [], pageSize: 0 };
		}
	}

	//====== 文件下载 ======
	/**
	 * 获取文件下载链接
	 * 返回文件的直接下载URL
	 */
	async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
		try {
			// 获取文件ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return [{ status: false, result: "No UUID" }];
			}

			// 获取文件信息
			const fileInfo = await this.getFile(file.uuid);
			if (!fileInfo || !fileInfo.pc) {
				return [{ status: false, result: "No file info" }];
			}

			// 获取下载链接
			const url = this.clouds.getApiUrl(con.API_PATHS.DOWNLOAD);
			const response = await this.clouds.request(url, "GET", {
				pickcode: fileInfo.pc,
			});

			if (!response || !response.data || !response.data[fileInfo.fid]) {
				return [{ status: false, result: "No download URL" }];
			}

			const downloadUrl = response.data[fileInfo.fid].url?.url;
			if (!downloadUrl) {
				return [{ status: false, result: "No download URL" }];
			}

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

	//====== 文件复制 ======
	/**
	 * 复制文件
	 * 将文件复制到目标目录
	 */
	async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
		try {
			// 获取源文件和目标目录ID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path);
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
				file.uuid = await this.findUUID(file.path);
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path);
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

			// 分割路径
			const parts = path.split("/").filter((part) => part.trim() !== "");
			if (parts.length === 0) {
				return this.config.root_folder_id || "0";
			}

			// 逐级查找
			let currentID = this.config.root_folder_id || "0";
			for (const part of parts) {
				const files = await this.getFiles(currentID);
				const foundFile = files.find((f) => f.n === part.replace(/\/$/, ""));
				if (!foundFile) {
					return null;
				}
				currentID = foundFile.fid;
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
	private async getFiles(cid: string): Promise<Cloud115File[]> {
		const files: Cloud115File[] = [];
		const pageSize = 200;
		let offset = 0;

		while (true) {
			const url = this.clouds.getApiUrl(con.API_PATHS.FILES_LIST);
			const result: Cloud115FileListResponse = await this.clouds.request(url, "GET", {
				cid: cid,
				limit: pageSize,
				offset: offset,
				asc: this.config.order_direction === "asc" ? 1 : 0,
				o: this.config.order_by || "file_name",
				show_dir: 1,
			});

			if (!result.data || result.data.length === 0) {
				break;
			}

			files.push(...result.data);

			if (files.length >= (result.count || 0)) {
				break;
			}

			offset += pageSize;
		}

		return files;
	}

	/**
	 * 获取文件信息
	 * 获取指定文件的详细信息
	 */
	private async getFile(fid: string): Promise<Cloud115File | null> {
		try {
			const url = this.clouds.getApiUrl(con.API_PATHS.FILE_INFO);
			const result = await this.clouds.request(url, "GET", {
				file_id: fid,
			});

			if (!result.data || result.data.length === 0) {
				return null;
			}

			return result.data[0];
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
			const preHash = await this.clouds.calculateSHA1(preHashData);

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
	private convertToFileInfo(file: Cloud115File): fso.FileInfo {
		const isFolder = file.fc === "0";

		return {
			filePath: "",
			fileUUID: file.fid,
			fileName: file.n,
			fileSize: file.s || 0,
			fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
			thumbnails: file.thumb || "",
			timeModify: file.tu ? new Date(file.tu * 1000) : undefined,
			timeCreate: file.te ? new Date(file.te * 1000) : undefined,
		};
	}
}
