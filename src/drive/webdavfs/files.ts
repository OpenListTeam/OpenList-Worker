/** =========== WebDAV 文件操作驱动器 ================
 * 本文件实现了WebDAV云存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、上传、下载
 * - WebDAV API 的认证和初始化、路径解析
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
import { CONFIG_INFO } from "./metas";

//====== WebDAV文件信息接口 ======
interface WebDAVFile {
	href: string;
	name: string;
	size: number;
	modified: string;
	isDir: boolean;
}

//====== 文件操作驱动器类 ======
export class HostDriver extends BasicDriver {
	declare public clouds: HostClouds;
	declare public config: CONFIG_INFO;

	/**
	 * 构造函数
	 * 初始化WebDAV驱动器实例
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
	 * 执行认证和配置初始化
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
			const path = file?.path || "/";
			const fullPath = this.getFullPath(path);
			
			// 发送PROPFIND请求
			const url = this.clouds.getFullUrl(fullPath);
			const xml = await this.clouds.request(url, "PROPFIND", null, {
				"Depth": "1",
				"Content-Type": "application/xml",
			});

			// 解析响应
			const files = this.clouds.parsePropfindResponse(xml);
			
			// 过滤掉当前目录本身
			const filteredFiles = files.filter((f) => {
				const filePath = this.extractPath(f.href);
				return filePath !== fullPath && filePath !== fullPath + "/";
			});

			// 转换为标准格式
			const fileList: fso.FileInfo[] = filteredFiles.map((f) => this.convertToFileInfo(f, path));

			return {
				pageSize: fileList.length,
				filePath: path,
				fileList: fileList,
			};
		} catch (error: any) {
			console.error("[WebDAV] listFile error:", error);
			return { fileList: [], pageSize: 0 };
		}
	}

	//====== 文件下载 ======
	/**
	 * 获取文件下载链接
	 * 返回文件的直接下载URL
	 */
	async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
		try {
			if (!file?.path) {
				return [{ status: false, result: "No path provided" }];
			}

			const fullPath = this.getFullPath(file.path);
			const url = this.clouds.getFullUrl(fullPath);

			return [
				{
					status: true,
					direct: url,
					header: this.clouds["getAuthHeaders"](),
				},
			];
		} catch (error: any) {
			console.error("[WebDAV] downFile error:", error);
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
			if (!file?.path || !dest?.path) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			const srcPath = this.getFullPath(file.path);
			const fileName = this.getFileName(file.path);
			const destPath = this.getFullPath(dest.path) + "/" + fileName;

			// 发送COPY请求
			const srcUrl = this.clouds.getFullUrl(srcPath);
			const destUrl = this.clouds.getFullUrl(destPath);

			await this.clouds.request(srcUrl, "COPY", null, {
				"Destination": destUrl,
				"Overwrite": "T",
			});

			return {
				taskType: fso.FSAction.COPYTO,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("[WebDAV] copyFile error:", error);
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
			if (!file?.path || !dest?.path) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			const srcPath = this.getFullPath(file.path);
			const fileName = this.getFileName(file.path);
			const destPath = this.getFullPath(dest.path) + "/" + fileName;

			// 发送MOVE请求
			const srcUrl = this.clouds.getFullUrl(srcPath);
			const destUrl = this.clouds.getFullUrl(destPath);

			await this.clouds.request(srcUrl, "MOVE", null, {
				"Destination": destUrl,
				"Overwrite": "T",
			});

			return {
				taskType: fso.FSAction.MOVETO,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("[WebDAV] moveFile error:", error);
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
			if (!file?.path) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			const fullPath = this.getFullPath(file.path);
			const url = this.clouds.getFullUrl(fullPath);

			// 发送DELETE请求
			await this.clouds.request(url, "DELETE");

			return {
				taskType: fso.FSAction.DELETE,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("[WebDAV] killFile error:", error);
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
	): Promise<DriveResult> {
		try {
			if (!file?.path || !name) {
				return { flag: false, text: "Invalid parameters" };
			}

			const parentPath = this.getFullPath(file.path);
			const newPath = parentPath + "/" + name.replace(/\/$/, "");
			const url = this.clouds.getFullUrl(newPath);

			// 创建文件夹
			if (type === fso.FileType.F_DIR) {
				await this.clouds.request(url, "MKCOL");
				return { flag: true, text: "Folder created" };
			}
			// 创建文件
			else {
				return await this.uploadFile(url, data);
			}
		} catch (error: any) {
			console.error("[WebDAV] makeFile error:", error);
			return { flag: false, text: error.message };
		}
	}

	//====== 文件上传 ======
	/**
	 * 上传文件
	 * 支持各种数据类型的上传
	 */
	async pushFile(
		file?: fso.FileFind,
		name?: string | null,
		type?: fso.FileType,
		data?: any | null
	): Promise<DriveResult> {
		return this.makeFile(file, name, type, data);
	}

	//====== 辅助方法 ======
	/**
	 * 上传文件数据
	 * 将数据上传到指定URL
	 */
	private async uploadFile(url: string, data: any): Promise<DriveResult> {
		try {
			let fileData: ArrayBuffer | Blob | string;

			if (data instanceof File || data instanceof Blob) {
				fileData = data;
			} else if (data instanceof ArrayBuffer) {
				fileData = data;
			} else if (typeof data === "string") {
				fileData = data;
			} else {
				return { flag: false, text: "Unsupported data type" };
			}

			// 发送PUT请求上传文件
			await this.clouds.request(url, "PUT", fileData, {
				"Content-Type": "application/octet-stream",
			});

			return { flag: true, text: "File uploaded" };
		} catch (error: any) {
			console.error("[WebDAV] uploadFile error:", error);
			return { flag: false, text: error.message };
		}
	}

	/**
	 * 获取完整路径
	 * 拼接根路径和相对路径
	 */
	private getFullPath(path: string): string {
		const rootPath = this.config.root_path || "/";
		
		// 如果根路径是/，直接返回path
		if (rootPath === "/") {
			return path;
		}
		
		// 拼接路径
		const cleanRoot = rootPath.replace(/\/$/, "");
		const cleanPath = path.startsWith("/") ? path : "/" + path;
		
		return cleanRoot + cleanPath;
	}

	/**
	 * 从href中提取路径
	 * 去除URL中的主机部分，只保留路径
	 */
	private extractPath(href: string): string {
		try {
			const url = new URL(href);
			return decodeURIComponent(url.pathname);
		} catch {
			// 如果不是完整URL，直接返回
			return href;
		}
	}

	/**
	 * 获取文件名
	 * 从路径中提取文件名
	 */
	private getFileName(path: string): string {
		const parts = path.split("/").filter((p) => p);
		return parts[parts.length - 1] || "";
	}

	/**
	 * 转换文件信息
	 * 将WebDAV文件信息转换为标准文件信息格式
	 */
	private convertToFileInfo(file: WebDAVFile, basePath: string): fso.FileInfo {
		// 从href中提取相对路径
		const fullPath = this.extractPath(file.href);
		const rootPath = this.config.root_path || "/";
		
		// 计算相对于basePath的路径
		let relativePath = fullPath;
		if (rootPath !== "/") {
			relativePath = fullPath.replace(rootPath, "");
		}
		
		// 确保路径以/开头
		if (!relativePath.startsWith("/")) {
			relativePath = "/" + relativePath;
		}

		return {
			filePath: relativePath,
			fileUUID: fullPath,
			fileName: file.name,
			fileSize: file.size || 0,
			fileType: file.isDir ? fso.FileType.F_DIR : fso.FileType.F_ALL,
			timeModify: file.modified ? new Date(file.modified) : undefined,
		};
	}
}
