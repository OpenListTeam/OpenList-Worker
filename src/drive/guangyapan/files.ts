/** =========== 广雅云盘 文件操作驱动器 ================
 * 本文件实现了广雅云盘（GuangYaPan）存储服务的文件操作功能，包括：
 * - 文件和文件夹列表、创建、删除、移动、复制、下载
 * - 广雅云盘 API 的认证和初始化
 * - 路径解析和 ID 查找
 * =========================================================
 * @author "OpenList Team"
 * @version 25.08.04
 * =======================================================*/

import { Context } from "hono";
import { HostClouds } from "./utils";
import { BasicDriver } from "../BasicDriver";
import { DriveResult } from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {
	CONFIG_INFO,
	FileItem,
	FileListResponse,
	DownloadResponse,
	TaskResponse,
	AssetsInfoResponse,
	isSuccessMsg,
} from "./metas";

/**
 * 广雅云盘 文件操作驱动器类
 *
 * 继承自 BasicDriver，实现了广雅云盘存储的完整文件操作功能。
 * 通过广雅云盘 API 提供文件的增删改查、下载等操作。
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
	async initSelf(): Promise<DriveResult> {
		const result: DriveResult = await this.clouds.initConfig();
		this.saving = this.clouds.saving;
		this.change = true;
		return result;
	}

	async loadSelf(): Promise<DriveResult> {
		await this.clouds.loadSaving();
		this.change = this.clouds.change;
		this.saving = this.clouds.saving;
		return { flag: true, text: "loadSelf" };
	}

	//====== 文件列表 ======
	async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
		try {
			await this.clouds.ensureAccessToken();

			let parentId = file?.uuid ?? "";
			if (file?.path) {
				parentId = (await this.findUUID(file.path)) ?? "";
			}

			const files = await this.getFiles(parentId);
			const fileList: fso.FileInfo[] = files.map((f) => this.convertToFileInfo(f, parentId));

			return {
				pageSize: fileList.length,
				filePath: file?.path,
				fileList: fileList,
			};
		} catch (error: any) {
			console.error("[广雅云盘] listFile error:", error);
			return { fileList: [], pageSize: 0 };
		}
	}

	//====== 文件下载 ======
	async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
		try {
			await this.clouds.ensureAccessToken();

			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return [{ status: false, result: "No UUID" }];
			}

			const resp: DownloadResponse = await this.clouds.apiRequest(
				con.API_PATHS.DOWNLOAD,
				{ fileId: file.uuid }
			);

			const url = (resp.data.signedURL || resp.data.downloadUrl || "").trim();
			if (!url) {
				return [{ status: false, result: "Empty download URL" }];
			}

			return [{ status: true, direct: url }];
		} catch (error: any) {
			console.error("[广雅云盘] downFile error:", error);
			return [{ status: false, result: error.message }];
		}
	}

	//====== 文件复制 ======
	async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
		try {
			await this.clouds.ensureAccessToken();

			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path);
			}
			if (!file?.uuid || !dest?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			const out: TaskResponse = await this.clouds.apiRequest(
				con.API_PATHS.COPY,
				{ fileIds: [file.uuid], parentId: dest.uuid }
			);

			if (!isSuccessMsg(out.msg)) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: `Copy failed: ${out.msg}` };
			}

			if (out.data.taskId) {
				await this.clouds.waitTaskDone(out.data.taskId);
			}

			return {
				taskType: fso.FSAction.COPYTO,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("[广雅云盘] copyFile error:", error);
			return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message };
		}
	}

	//====== 文件移动 ======
	async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
		try {
			await this.clouds.ensureAccessToken();

			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (dest?.path) {
				dest.uuid = await this.findUUID(dest.path);
			}
			if (!file?.uuid || !dest?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			const out: TaskResponse = await this.clouds.apiRequest(
				con.API_PATHS.MOVE,
				{ fileIds: [file.uuid], parentId: dest.uuid }
			);

			if (!isSuccessMsg(out.msg)) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: `Move failed: ${out.msg}` };
			}

			if (out.data.taskId) {
				await this.clouds.waitTaskDone(out.data.taskId);
			}

			return {
				taskType: fso.FSAction.MOVETO,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("[广雅云盘] moveFile error:", error);
			return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message };
		}
	}

	//====== 文件删除 ======
	async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
		try {
			await this.clouds.ensureAccessToken();

			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR };
			}

			const out: TaskResponse = await this.clouds.apiRequest(
				con.API_PATHS.DELETE,
				{ fileIds: [file.uuid] }
			);

			if (!isSuccessMsg(out.msg)) {
				return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: `Delete failed: ${out.msg}` };
			}

			if (out.data.taskId) {
				await this.clouds.waitTaskDone(out.data.taskId);
			}

			return {
				taskType: fso.FSAction.DELETE,
				taskFlag: fso.FSStatus.SUCCESSFUL_ALL,
			};
		} catch (error: any) {
			console.error("[广雅云盘] killFile error:", error);
			return { taskFlag: fso.FSStatus.FILESYSTEM_ERR, messages: error.message };
		}
	}

	//====== 文件/文件夹创建 ======
	async makeFile(
		file?: fso.FileFind,
		name?: string | null,
		type?: fso.FileType,
		data?: any | null
	): Promise<DriveResult | null> {
		try {
			await this.clouds.ensureAccessToken();

			let parentId = file?.uuid ?? "";
			if (file?.path) {
				parentId = (await this.findUUID(file.path)) ?? "";
			}
			if (!name || !name.trim()) {
				return { flag: false, text: "Invalid parameters" };
			}

			const dirName = name.replace(/\/$/, "").trim();

			if (type === fso.FileType.F_DIR) {
				const out = await this.clouds.apiRequest(
					con.API_PATHS.MKDIR,
					{ parentId, dirName }
				);

				if (!isSuccessMsg(out.msg)) {
					return { flag: false, text: `Make dir failed: ${out.msg}` };
				}
				return { flag: true, text: "Folder created" };
			}

			// 文件创建不支持（需要上传功能）
			return { flag: false, text: "File creation requires upload support" };
		} catch (error: any) {
			console.error("[广雅云盘] makeFile error:", error);
			return { flag: false, text: error.message };
		}
	}

	//====== 文件重命名 ======
	async renameFile(file?: fso.FileFind, newName?: string | null): Promise<DriveResult | null> {
		try {
			await this.clouds.ensureAccessToken();

			if (file?.path) {
				file.uuid = await this.findUUID(file.path);
			}
			if (!file?.uuid) {
				return { flag: false, text: "File ID is empty" };
			}
			if (!newName || !newName.trim()) {
				return { flag: false, text: "New name is empty" };
			}

			const out = await this.clouds.apiRequest(
				con.API_PATHS.RENAME,
				{ fileId: file.uuid, newName: newName.trim() }
			);

			if (!isSuccessMsg(out.msg)) {
				return { flag: false, text: `Rename failed: ${out.msg}` };
			}

			return { flag: true, text: "Renamed" };
		} catch (error: any) {
			console.error("[广雅云盘] renameFile error:", error);
			return { flag: false, text: error.message };
		}
	}

	//====== 存储信息 ======
	async getSpaceInfo(): Promise<{ total: number; used: number } | null> {
		try {
			const resp: AssetsInfoResponse = await this.clouds.apiRequest(
				con.API_PATHS.ASSETS
			);

			if (isSuccessMsg(resp.msg) && resp.data.totalSpaceSize > 0) {
				return {
					total: resp.data.totalSpaceSize,
					used: resp.data.usedSpaceSize,
				};
			}
			return null;
		} catch (error: any) {
			console.error("[广雅云盘] getSpaceInfo error:", error);
			return null;
		}
	}

	//====== 辅助方法 ======
	/**
	 * 根据路径查找文件 ID
	 * 将文件系统路径转换为广雅云盘的文件 ID
	 */
	async findUUID(path: string): Promise<string | null> {
		try {
			if (!path || path === "/" || path === "\\") {
				return "";
			}

			const rootPath = this.config.root_path || "";
			const fullPath = rootPath ? rootPath + "/" + path : path;
			const parts = fullPath.split("/").filter((part) => part.trim() !== "");

			if (parts.length === 0) {
				return "";
			}

			let currentID = "";
			for (const part of parts) {
				const files = await this.getFiles(currentID);
				const foundFile = files.find((f) => f.fileName === part.replace(/\/$/, ""));
				if (!foundFile) {
					return null;
				}
				currentID = foundFile.fileId;
			}

			return currentID;
		} catch (error: any) {
			console.error("[广雅云盘] findUUID error:", error);
			return null;
		}
	}

	/**
	 * 获取文件列表
	 * 获取指定目录下的所有文件，支持分页
	 */
	private async getFiles(parentID: string): Promise<FileItem[]> {
		const files: FileItem[] = [];
		const pageSize = this.config.page_size || con.DEFAULT_PAGE_SIZE;
		const orderBy = this.config.order_by ?? con.DEFAULT_ORDER_BY;
		const sortType = this.config.sort_type ?? con.DEFAULT_SORT_TYPE;
		const maxPage = 10000;

		for (let page = 0; page < maxPage; page++) {
			const result: FileListResponse = await this.clouds.apiRequest(
				con.API_PATHS.FILE_LIST,
				{
					parentId: parentID,
					page,
					pageSize,
					orderBy,
					sortType,
				}
			);

			if (!result.data?.list) break;

			files.push(...result.data.list);

			if (result.data.list.length < pageSize) break;
			if (result.data.total > 0 && files.length >= result.data.total) break;
		}

		return files;
	}

	/**
	 * 转换文件信息
	 * 将广雅云盘文件信息转换为标准文件信息格式
	 */
	private convertToFileInfo(file: FileItem, parentPath: string): fso.FileInfo {
		const isFolder = file.resType === con.RES_TYPE.FOLDER;

		return {
			filePath: parentPath,
			fileUUID: file.fileId,
			fileName: file.fileName,
			fileSize: file.fileSize || 0,
			fileType: isFolder ? fso.FileType.F_DIR : fso.FileType.F_ALL,
			timeModify: file.utime > 0 ? new Date(file.utime * 1000) : undefined,
			timeCreate: file.ctime > 0 ? new Date(file.ctime * 1000) : undefined,
		};
	}
}
