/** =========== OneDrive 文件操作驱动器 ================
 * 本文件实现了OneDrive云存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - OneDrive API 的认证和初始化、路径解析和 UUID 查找
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
import { CONFIG_INFO } from "./metas";

//====== OneDrive文件信息接口 ======
interface OneDriveFile {
	id: string;
	name: string;
	size?: number;
	file?: {
		mimeType: string;
	};
	folder?: {};
	fileSystemInfo?: {
		createdDateTime: string;
		lastModifiedDateTime: string;
	};
	"@microsoft.graph.downloadUrl"?: string;
	thumbnails?: Array<{
		medium?: {
			url: string;
		};
	}>;
	parentReference?: {
		driveId: string;
		id: string;
	};
}

interface OneDriveFileList {
	value: OneDriveFile[];
	"@odata.nextLink"?: string;
}

/**
 * OneDrive 文件操作驱动器类
 * 
 * 继承自 BasicDriver，实现了 OneDrive 云存储的完整文件操作功能。
 * 通过 Microsoft Graph API 提供文件的增删改查、上传下载等操作。
 */
export class HostDriver extends BasicDriver {
	declare public clouds: HostClouds;
	declare public config: CONFIG_INFO;
	private rootCache: OneDriveFile | null = null;

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
	 * 执行Token刷新和配置初始化
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
			// 获取文件UUID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return { fileList: [], pageSize: 0 };
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
			console.error("listFile error:", error);
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
			// 获取文件UUID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return [{ status: false, result: "No UUID" }];
			}

			// 获取文件信息
			const fileInfo = await this.getFile(file.uuid);
			if (!fileInfo["@microsoft.graph.downloadUrl"]) {
				return [{ status: false, result: "No download URL" }];
			}

			let url = fileInfo["@microsoft.graph.downloadUrl"];
			
			// 使用自定义主机
			if (this.config.custom_host) {
				const urlObj = new URL(url);
				urlObj.host = this.config.custom_host;
				url = urlObj.toString();
			}

			return [
				{
					status: true,
					direct: url,
				},
			];
		} catch (error: any) {
			console.error("downFile error:", error);
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
			// 获取源文件和目标目录UUID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path);
			}
			if (!file?.uuid || !dest?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			// 获取目标目录信息
			const destInfo = await this.getFile(dest.uuid);

			// 执行复制
			const url = this.clouds.getMetaUrl(false, "") + `/items/${file.uuid}/copy`;
			const body = {
				parentReference: {
					driveId: destInfo.parentReference?.driveId,
					id: destInfo.id,
				},
			};

			await this.clouds.request(url, "POST", body);

			return {
				taskType: fso.FSAction.COPYTO,
				taskFlag: fso.FSStatus.PROCESSING_NOW,
			};
		} catch (error: any) {
			console.error("copyFile error:", error);
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
			// 获取源文件和目标目录UUID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path);
			}
			if (!file?.uuid || !dest?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			// 构建父路径
			let parentPath = "";
			if (dest.path) {
				if (dest.path === "/") {
					parentPath = "/drive/root";
				} else {
					parentPath = `/drive/root:${dest.path}`;
				}
			}

			// 执行移动
			const url = this.clouds.getMetaUrl(false, "") + `/items/${file.uuid}`;
			const body = {
				parentReference: {
					id: dest.uuid,
					path: parentPath,
				},
			};

			await this.clouds.request(url, "PATCH", body);

			return {
				taskType: fso.FSAction.MOVETO,
				taskFlag: fso.FSStatus.PROCESSING_NOW,
			};
		} catch (error: any) {
			console.error("moveFile error:", error);
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
			// 获取文件UUID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			// 执行删除
			const url = this.clouds.getMetaUrl(false, "") + `/items/${file.uuid}`;
			await this.clouds.request(url, "DELETE");

			return {
				taskType: fso.FSAction.DELETE,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("killFile error:", error);
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
			// 获取父目录UUID
			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid || !name) {
				return { flag: false, text: "Invalid parameters" };
			}

			// 创建文件夹
			if (type === fso.FileType.F_DIR) {
				const url = this.clouds.getMetaUrl(false, "") + `/items/${file.uuid}/children`;
				const body = {
					name: name.replace(/\/$/, ""),
					folder: {},
					"@microsoft.graph.conflictBehavior": "rename",
				};

				const result = await this.clouds.request(url, "POST", body);
				return { flag: true, text: result.id };
			}
			// 创建文件
			else {
				return await this.uploadFile(file.uuid, name, data);
			}
		} catch (error: any) {
			console.error("makeFile error:", error);
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
	 * 根据路径查找文件 UUID
	 * 将文件系统路径转换为 OneDrive 的文件 UUID
	 */
	async findUUID(path: string): Promise<string | null> {
		try {
			// 根目录
			if (!path || path === "/" || path === "\\") {
				return await this.getRootId();
			}

			// 如果配置了根文件夹路径，需要拼接
			const fullPath = this.config.root_folder_path && this.config.root_folder_path !== "/"
				? `${this.config.root_folder_path}${path}`
				: path;

			// 分割路径
			const parts = fullPath.split("/").filter((part) => part.trim() !== "");
			if (parts.length === 0) {
				return await this.getRootId();
			}

			// 逐级查找
			let currentUUID = await this.getRootId();
			for (const part of parts) {
				const files = await this.getFiles(currentUUID);
				const foundFile = files.find((f) => f.name === part.replace(/\/$/, ""));
				if (!foundFile) {
					return null;
				}
				currentUUID = foundFile.id;
			}

			return currentUUID;
		} catch (error: any) {
			console.error("findUUID error:", error);
			return null;
		}
	}

	/**
	 * 获取根目录ID
	 * 如果配置了根文件夹路径，返回该路径的ID，否则返回"root"
	 */
	private async getRootId(): Promise<string> {
		if (!this.config.root_folder_path || this.config.root_folder_path === "/") {
			return "root";
		}

		// 如果已缓存，直接返回
		if (this.rootCache) {
			return this.rootCache.id;
		}

		// 获取根文件夹信息
		const url = this.clouds.getMetaUrl(false, this.config.root_folder_path);
		const result = await this.clouds.request(url, "GET");
		this.rootCache = result;
		return result.id;
	}

	/**
	 * 获取文件列表
	 * 获取指定目录下的所有文件，支持分页
	 */
	private async getFiles(uuid: string): Promise<OneDriveFile[]> {
		const files: OneDriveFile[] = [];
		let nextLink = this.clouds.getMetaUrl(false, "") + 
			`/items/${uuid}/children?$top=1000&$expand=thumbnails($select=medium)&$select=id,name,size,fileSystemInfo,content.downloadUrl,file,folder,parentReference`;

		while (nextLink) {
			const result: OneDriveFileList = await this.clouds.request(nextLink, "GET");
			files.push(...result.value);
			nextLink = result["@odata.nextLink"] || "";
		}

		return files;
	}

	/**
	 * 获取文件信息
	 * 获取指定文件的详细信息
	 */
	private async getFile(uuid: string): Promise<OneDriveFile> {
		const url = this.clouds.getMetaUrl(false, "") + `/items/${uuid}`;
		return await this.clouds.request(url, "GET");
	}

	/**
	 * 上传文件
	 * 根据文件大小选择直接上传或分块上传
	 */
	private async uploadFile(parentUUID: string, name: string, data: any): Promise<DriveResult> {
		try {
			// 获取文件大小
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

			// 小文件直接上传
			if (fileSize <= con.SMALL_FILE_THRESHOLD) {
				return await this.uploadSmallFile(parentUUID, name, fileData);
			}
			// 大文件分块上传
			else {
				return await this.uploadLargeFile(parentUUID, name, fileData);
			}
		} catch (error: any) {
			console.error("uploadFile error:", error);
			return { flag: false, text: error.message };
		}
	}

	/**
	 * 上传小文件
	 * 直接上传小于4MB的文件
	 */
	private async uploadSmallFile(
		parentUUID: string,
		name: string,
		data: ArrayBuffer
	): Promise<DriveResult> {
		const url = this.clouds.getMetaUrl(false, "") + `/items/${parentUUID}:/${name}:/content`;
		const result = await this.clouds.request(url, "PUT", data, {
			"Content-Type": "application/octet-stream",
		});
		return { flag: true, text: result.id };
	}

	/**
	 * 上传大文件
	 * 使用分块上传方式上传大于4MB的文件
	 */
	private async uploadLargeFile(
		parentUUID: string,
		name: string,
		data: ArrayBuffer
	): Promise<DriveResult> {
		// 创建上传会话
		const sessionUrl = this.clouds.getMetaUrl(false, "") + `/items/${parentUUID}:/${name}:/createUploadSession`;
		const session = await this.clouds.request(sessionUrl, "POST", {
			item: {
				"@microsoft.graph.conflictBehavior": "rename",
			},
		});

		const uploadUrl = session.uploadUrl;
		const chunkSize = (this.config.chunk_size || con.DEFAULT_CHUNK_SIZE) * 1024 * 1024;
		const totalSize = data.byteLength;
		let uploadedSize = 0;

		// 分块上传
		while (uploadedSize < totalSize) {
			const start = uploadedSize;
			const end = Math.min(uploadedSize + chunkSize, totalSize);
			const chunk = data.slice(start, end);

			const response = await fetch(uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Length": chunk.byteLength.toString(),
					"Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
				},
				body: chunk,
			});

			if (!response.ok && response.status !== 202) {
				throw new Error(`Upload failed: ${response.status}`);
			}

			uploadedSize = end;
		}

		return { flag: true, text: "Upload completed" };
	}

	/**
	 * 转换文件信息
	 * 将OneDrive文件信息转换为标准文件信息格式
	 */
	private convertToFileInfo(file: OneDriveFile): fso.FileInfo {
		const isFolder = !!file.folder;
		const thumbnail = file.thumbnails?.[0]?.medium?.url || "";

		return {
			filePath: "",
			fileUUID: file.id,
			fileName: file.name,
			fileSize: file.size || 0,
			fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
			thumbnails: thumbnail,
			timeModify: file.fileSystemInfo?.lastModifiedDateTime
				? new Date(file.fileSystemInfo.lastModifiedDateTime)
				: undefined,
			timeCreate: file.fileSystemInfo?.createdDateTime
				? new Date(file.fileSystemInfo.createdDateTime)
				: undefined,
		};
	}
}
