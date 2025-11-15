/** =========== Baidu Netdisk File Operations Driver ================
 * This file implements file operation functionality for Baidu Netdisk storage:
 * - File and folder listing, creation, deletion, moving, copying, upload, download
 * - Baidu Netdisk API authentication and initialization
 * - Path resolution and file ID management
 * - Inherits from BasicDriver to implement standard cloud storage interface
 * ===================================================================
 * @author "OpenList Team"
 * @version 25.01.25
 * =================================================================*/

// Public imports
import {Context} from "hono";
import {HostClouds} from "./utils"
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
// Specific imports
import * as con from "./const";
import type * as meta from "./metas";
import crypto from "crypto";

// Baidu Netdisk file operations driver class
export class HostDriver extends BasicDriver {
    // Specific members
    private uploadThread: number = 3
    private vipType: number = con.VIP_TYPE_NORMAL

    /** ================== Constructor ========================
     * @param c - Hono context object
     * @param router - Router identifier
     * @param config - Configuration information
     * @param saving - Saved authentication information
     * ===================================================*/
    constructor(
        c: Context, 
        router: string,
        config: Record<string, any>,
        saving: Record<string, any>,
    ) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config as meta.BaiduNetdiskConfig, saving as meta.BaiduNetdiskSaving) as any;
    }

    // Initialize driver configuration
    async initSelf(): Promise<DriveResult> {
        const clouds = this.clouds as HostClouds;
        const result = await clouds.initConfig();
        if (result.flag) {
            this.saving = clouds.saving;
            this.change = true;
            this.vipType = clouds.getVipType();
            this.uploadThread = clouds.getUploadThread();
        }
        return result;
    }

    // Load driver instance
    async loadSelf(): Promise<DriveResult> {
        const clouds = this.clouds as HostClouds;
        const result = await clouds.loadConfig();
        if (result.flag) {
            this.change = clouds.change;
            this.saving = clouds.saving;
            this.vipType = clouds.getVipType();
            this.uploadThread = clouds.getUploadThread();
        }
        return result;
    }

    /** =======================List directory contents========================
     * Get all files and subdirectories in the specified directory
     * @param   file - File search parameters, may contain path or UUID
     * @returns Promise<fso.PathInfo> Directory information with file list and stats
     * ===========================================================*/
    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const path = file?.path || this.config.root_path || "/";
            const files = await this.getFiles(path);
            
            return {
                pageSize: files.length,
                filePath: path,
                fileList: files.map(f => this.baiduFileToFileInfo(f))
            };
        } catch (error) {
            console.error("List files error:", error);
            return {
                pageSize: 0,
                filePath: file?.path,
                fileList: []
            };
        }
    }

    // Get files from Baidu Netdisk API
    private async getFiles(dir: string): Promise<meta.BaiduFile[]> {
        const clouds = this.clouds as HostClouds;
        const config = this.config as meta.BaiduNetdiskConfig;
        let start = 0;
        const limit = 200;
        const files: meta.BaiduFile[] = [];

        const params: Record<string, string> = {
            method: "list",
            dir: dir,
            web: "web"
        };

        // Add sorting parameters
        if (config.order_by) {
            params.order = config.order_by;
            if (config.order_direction === "desc") {
                params.desc = "1";
            }
        }

        // Fetch all pages
        while (true) {
            params.start = start.toString();
            params.limit = limit.toString();
            start += limit;

            const response = await clouds.get("/xpan/file", params) as meta.ListFilesResponse;
            
            if (!response.list || response.list.length === 0) {
                break;
            }

            // Filter video files if configured
            if (config.only_list_video_file) {
                for (const file of response.list) {
                    if (file.isdir === 1 || file.category === 1) {
                        files.push(file);
                    }
                }
            } else {
                files.push(...response.list);
            }
        }

        return files;
    }

    /** =======================Get file download link====================
     * Generate direct download link for specified file with necessary auth headers
     * @param   file - File search parameters, may contain path or UUID
     * @returns Promise<fso.FileLink[]> Array of file download links
     * ===========================================================*/
    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            const config = this.config as meta.BaiduNetdiskConfig;
            const fsId = file?.uuid;

            if (!fsId) {
                return [{status: false, result: "File ID is required"}];
            }

            // Choose download method based on configuration
            if (config.download_api === "crack_video") {
                return await this.linkCrackVideo(file);
            } else if (config.download_api === "crack") {
                return await this.linkCrack(file);
            } else {
                return await this.linkOfficial(file);
            }
        } catch (error) {
            console.error("Download file error:", error);
            return [{
                status: false, 
                result: error instanceof Error ? error.message : String(error)
            }];
        }
    }

    // Official download method
    private async linkOfficial(file?: fso.FileFind): Promise<fso.FileLink[]> {
        const clouds = this.clouds as HostClouds;
        const fsId = file?.uuid;
        const params = {
            method: "filemetas",
            fsids: `[${fsId}]`,
            dlink: "1"
        };

        const response = await clouds.get("/xpan/multimedia", params) as meta.DownloadLinkResponse;
        
        if (!response.list || response.list.length === 0) {
            return [{status: false, result: "No download link found"}];
        }

        const dlink = response.list[0].dlink;
        const url = `${dlink}&access_token=${clouds.getAccessToken()}`;

        return [{
            status: true,
            direct: url,
            header: {
                "User-Agent": con.DEFAULT_UA
            }
        }];
    }

    // Crack download method
    private async linkCrack(file?: fso.FileFind): Promise<fso.FileLink[]> {
        const clouds = this.clouds as HostClouds;
        const path = file?.path;
        const params = {
            target: `["${path}"]`,
            dlink: "1",
            web: "5",
            origin: "dlna"
        };

        const response = await clouds.get("/api/filemetas", params) as meta.DownloadLinkCrackResponse;
        
        if (!response.info || response.info.length === 0) {
            return [{status: false, result: "No download link found"}];
        }

        const config = this.config as meta.BaiduNetdiskConfig;
        return [{
            status: true,
            direct: response.info[0].dlink,
            header: {
                "User-Agent": config.custom_crack_ua || con.NETDISK_UA
            }
        }];
    }

    // Crack video download method
    private async linkCrackVideo(file?: fso.FileFind): Promise<fso.FileLink[]> {
        const clouds = this.clouds as HostClouds;
        const path = file?.path;
        const fsId = file?.uuid;
        
        const params = {
            type: "VideoURL",
            path: path || "",
            fs_id: fsId || "",
            devuid: "0%1",
            clienttype: "1",
            channel: "android_15_25010PN30C_bd-netdisk_1523a",
            nom3u8: "1",
            dlink: "1",
            media: "1",
            origin: "dlna"
        };

        const response = await clouds.get("/api/mediainfo", params);
        const dlink = response?.info?.dlink;

        if (!dlink) {
            return [{status: false, result: "No download link found"}];
        }

        const config = this.config as meta.BaiduNetdiskConfig;
        return [{
            status: true,
            direct: dlink,
            header: {
                "User-Agent": config.custom_crack_ua || con.NETDISK_UA
            }
        }];
    }

    /** =======================Copy file or folder====================
     * Copy specified file or folder to target directory
     * @param   file - Source file search parameters
     * @param   dest - Target directory search parameters
     * @returns Promise<fso.FileTask> File task status
     * ===========================================================*/
    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcPath = file?.path;
            const destPath = dest?.path;
            const fileName = srcPath?.split('/').pop();

            if (!srcPath || !destPath || !fileName) {
                return {
                    taskType: fso.FSAction.COPYTO,
                    taskFlag: fso.FSStatus.FILESYSTEM_ERR,
                    messages: "Invalid source or destination path"
                };
            }

            const data = [{
                path: srcPath,
                dest: destPath,
                newname: fileName
            }];

            await this.manage("copy", data);

            return {
                taskType: fso.FSAction.COPYTO,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL
            };
        } catch (error) {
            return {
                taskType: fso.FSAction.COPYTO,
                taskFlag: fso.FSStatus.FILESYSTEM_ERR,
                messages: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /** =======================Move file or folder====================
     * Move specified file or folder to target directory
     * @param   file - Source file search parameters
     * @param   dest - Target directory search parameters
     * @returns Promise<fso.FileTask> File task status
     * ===========================================================*/
    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcPath = file?.path;
            const destPath = dest?.path;
            const fileName = srcPath?.split('/').pop();

            if (!srcPath || !destPath || !fileName) {
                return {
                    taskType: fso.FSAction.MOVETO,
                    taskFlag: fso.FSStatus.FILESYSTEM_ERR,
                    messages: "Invalid source or destination path"
                };
            }

            const data = [{
                path: srcPath,
                dest: destPath,
                newname: fileName
            }];

            await this.manage("move", data);

            return {
                taskType: fso.FSAction.MOVETO,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL
            };
        } catch (error) {
            return {
                taskType: fso.FSAction.MOVETO,
                taskFlag: fso.FSStatus.FILESYSTEM_ERR,
                messages: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /** =======================Delete file or folder====================
     * Permanently delete specified file or folder
     * @param   file - File search parameters
     * @returns Promise<fso.FileTask> File task status
     * ===========================================================*/
    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const path = file?.path;

            if (!path) {
                return {
                    taskType: fso.FSAction.DELETE,
                    taskFlag: fso.FSStatus.FILESYSTEM_ERR,
                    messages: "Invalid file path"
                };
            }

            const data = [path];
            await this.manage("delete", data);

            return {
                taskType: fso.FSAction.DELETE,
                taskFlag: fso.FSStatus.SUCCESSFUL_ALL
            };
        } catch (error) {
            return {
                taskType: fso.FSAction.DELETE,
                taskFlag: fso.FSStatus.FILESYSTEM_ERR,
                messages: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // Generic file management operation
    private async manage(opera: string, filelist: any): Promise<any> {
        const clouds = this.clouds as HostClouds;
        const params = {
            method: "filemanager",
            opera: opera
        };

        const formData = {
            async: "0",
            filelist: JSON.stringify(filelist),
            ondup: "fail"
        };

        return await clouds.postForm("/xpan/file", params, formData);
    }

    /** =======================Create file or folder====================
     * Create new file or folder in specified directory
     * @param   file - Target directory search parameters
     * @param   name - Name of file or folder to create
     * @param   type - File type (file or folder)
     * @param   data - File data (null for folder)
     * @returns Promise<DriveResult> Creation result with new file ID
     * ===========================================================*/
    async makeFile(
        file?: fso.FileFind,
        name?: string | null,
        type?: fso.FileType,
        data?: any | null
    ): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) {
                // Create folder
                const parentPath = file?.path || this.config.root_path || "/";
                const folderPath = parentPath.endsWith('/') 
                    ? `${parentPath}${name}` 
                    : `${parentPath}/${name}`;

                const result = await this.create(folderPath, 0, 1, "", "", 0, 0);
                return {flag: true, text: result?.info?.fs_id?.toString() || ""};
            }

            return {flag: false, text: "File upload not implemented in makeFile, use pushFile"};
        } catch (error) {
            return {
                flag: false,
                text: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // Create file or folder via API
    private async create(
        path: string,
        size: number,
        isdir: number,
        uploadid: string,
        blockList: string,
        mtime: number,
        ctime: number
    ): Promise<any> {
        const params = {
            method: "create"
        };

        const formData: Record<string, string> = {
            path: path,
            size: size.toString(),
            isdir: isdir.toString(),
            rtype: "3"
        };

        if (mtime && ctime) {
            formData.local_mtime = mtime.toString();
            formData.local_ctime = ctime.toString();
        }

        if (uploadid) {
            formData.uploadid = uploadid;
        }

        if (blockList) {
            formData.block_list = blockList;
        }

        const clouds = this.clouds as HostClouds;
        return await clouds.postForm("/xpan/file", params, formData);
    }

    /** =======================Upload file==========================
     * Upload file to specified directory
     * @param   file - Target directory search parameters
     * @param   name - Upload file name
     * @param   type - File type
     * @param   data - File data (Buffer or ArrayBuffer)
     * @returns Promise<DriveResult> Upload result with new file ID
     * ===========================================================*/
    async pushFile(
        file?: fso.FileFind,
        name?: string | null,
        type?: fso.FileType,
        data?: any | null
    ): Promise<DriveResult> {
        try {
            if (!name || !data) {
                return {flag: false, text: "File name and data are required"};
            }

            const parentPath = file?.path || this.config.root_path || "/";
            const filePath = parentPath.endsWith('/') 
                ? `${parentPath}${name}` 
                : `${parentPath}/${name}`;

            // Convert data to Buffer if needed
            let buffer: Buffer;
            if (Buffer.isBuffer(data)) {
                buffer = data;
            } else if (data instanceof ArrayBuffer) {
                buffer = Buffer.from(data);
            } else if (typeof data === 'string') {
                buffer = Buffer.from(data, 'utf-8');
            } else {
                return {flag: false, text: "Unsupported data type"};
            }

            // Try rapid upload first
            const rapidResult = await this.putRapid(filePath, name, buffer);
            if (rapidResult.flag) {
                return rapidResult;
            }

            // Fall back to multipart upload
            return await this.putMultipart(filePath, name, buffer);
        } catch (error) {
            return {
                flag: false,
                text: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // Rapid upload (秒传)
    private async putRapid(
        path: string,
        name: string,
        buffer: Buffer
    ): Promise<DriveResult> {
        try {
            const fileSize = buffer.length;
            const contentMd5 = this.calculateMd5(buffer);
            const blockList = JSON.stringify([contentMd5]);
            const now = Math.floor(Date.now() / 1000);

            const result = await this.create(path, fileSize, 0, "", blockList, now, now);
            
            if (result?.info?.fs_id) {
                return {
                    flag: true,
                    text: result.info.fs_id.toString()
                };
            }

            return {flag: false, text: "Rapid upload not available"};
        } catch (error) {
            // Rapid upload failed, will try normal upload
            return {flag: false, text: "Rapid upload failed"};
        }
    }

    // Multipart upload
    private async putMultipart(
        path: string,
        name: string,
        buffer: Buffer
    ): Promise<DriveResult> {
        const fileSize = buffer.length;
        const sliceSize = this.getSliceSize(fileSize);
        
        // Calculate slice count
        const count = Math.ceil(fileSize / sliceSize);
        const lastBlockSize = fileSize % sliceSize || sliceSize;

        // Calculate MD5 hashes
        const blockList: string[] = [];
        let offset = 0;
        const fileMd5 = crypto.createHash('md5');
        const sliceMd5First256k = crypto.createHash('md5');
        let written256k = 0;
        const SLICE_256K = 256 * con.KB;

        // Calculate MD5 for each slice
        for (let i = 0; i < count; i++) {
            const sliceEnd = Math.min(offset + sliceSize, fileSize);
            const slice = buffer.slice(offset, sliceEnd);
            
            // Update file MD5
            fileMd5.update(slice);
            
            // Calculate slice MD5
            const sliceMd5 = crypto.createHash('md5').update(slice).digest('hex');
            blockList.push(sliceMd5);
            
            // Update first 256k MD5
            if (written256k < SLICE_256K) {
                const toWrite = Math.min(slice.length, SLICE_256K - written256k);
                sliceMd5First256k.update(slice.slice(0, toWrite));
                written256k += toWrite;
            }
            
            offset = sliceEnd;
        }

        const contentMd5 = fileMd5.digest('hex');
        const sliceMd5 = sliceMd5First256k.digest('hex');
        const blockListStr = JSON.stringify(blockList);
        const now = Math.floor(Date.now() / 1000);

        // Step 1: Precreate
        const precreateResp = await this.precreate(
            path, 
            fileSize, 
            blockListStr, 
            contentMd5, 
            sliceMd5,
            now,
            now
        );

        if (!precreateResp) {
            return {flag: false, text: "Precreate failed"};
        }

        // Check if rapid upload succeeded
        if (precreateResp.return_type === 2 && precreateResp.info) {
            return {
                flag: true,
                text: precreateResp.info.fs_id.toString()
            };
        }

        // Step 2: Upload slices
        if (!precreateResp.uploadid || !precreateResp.block_list) {
            return {flag: false, text: "Invalid precreate response"};
        }

        const uploadTasks: Promise<void>[] = [];
        const config = this.config as meta.BaiduNetdiskConfig;
        const uploadApi = config.upload_api || con.DEFAULT_UPLOAD_API;

        for (let i = 0; i < precreateResp.block_list.length; i++) {
            const partseq = precreateResp.block_list[i];
            const sliceOffset = partseq * sliceSize;
            const sliceEnd = Math.min(sliceOffset + sliceSize, fileSize);
            const slice = buffer.slice(sliceOffset, sliceEnd);

            const task = this.uploadSlice(
                uploadApi,
                path,
                precreateResp.uploadid,
                partseq,
                name,
                slice
            );
            
            uploadTasks.push(task);

            // Limit concurrent uploads
            if (uploadTasks.length >= this.uploadThread) {
                await Promise.race(uploadTasks);
                // Remove completed tasks
                for (let j = uploadTasks.length - 1; j >= 0; j--) {
                    if (await Promise.race([uploadTasks[j], Promise.resolve('pending')]) !== 'pending') {
                        uploadTasks.splice(j, 1);
                    }
                }
            }
        }

        // Wait for all uploads to complete
        await Promise.all(uploadTasks);

        // Step 3: Create file
        const result = await this.create(
            path, 
            fileSize, 
            0, 
            precreateResp.uploadid, 
            blockListStr,
            now,
            now
        );

        if (result?.info?.fs_id) {
            return {
                flag: true,
                text: result.info.fs_id.toString()
            };
        }

        return {flag: false, text: "File creation failed"};
    }

    // Precreate upload
    private async precreate(
        path: string,
        size: number,
        blockList: string,
        contentMd5: string,
        sliceMd5: string,
        mtime: number,
        ctime: number
    ): Promise<meta.PrecreateResponse | null> {
        try {
            const clouds = this.clouds as HostClouds;
            const params = {
                method: "precreate"
            };

            const formData: Record<string, string> = {
                path: path,
                size: size.toString(),
                isdir: "0",
                autoinit: "1",
                rtype: "3",
                block_list: blockList,
                "content-md5": contentMd5,
                "slice-md5": sliceMd5,
                local_mtime: mtime.toString(),
                local_ctime: ctime.toString()
            };

            return await clouds.postForm("/xpan/file", params, formData);
        } catch (error) {
            console.error("Precreate error:", error);
            return null;
        }
    }

    // Upload single slice
    private async uploadSlice(
        uploadApi: string,
        path: string,
        uploadid: string,
        partseq: number,
        fileName: string,
        slice: Buffer
    ): Promise<void> {
        const clouds = this.clouds as HostClouds;
        const accessToken = clouds.getAccessToken();

        const url = `${uploadApi}/rest/2.0/pcs/superfile2`;
        const params = new URLSearchParams({
            method: "upload",
            access_token: accessToken,
            type: "tmpfile",
            path: path,
            uploadid: uploadid,
            partseq: partseq.toString()
        });

        // Create form data
        const formData = new FormData();
        const blob = new Blob([slice], {type: 'application/octet-stream'});
        formData.append('file', blob, fileName);

        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload slice failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.errno !== undefined && result.errno !== 0) {
            throw new Error(`Upload slice failed with errno: ${result.errno}`);
        }
    }

    // Calculate MD5 hash
    private calculateMd5(buffer: Buffer): string {
        return crypto.createHash('md5').update(buffer).digest('hex');
    }

    // Convert Baidu file format to FileInfo format
    private baiduFileToFileInfo(file: meta.BaiduFile): fso.FileInfo {
        const fileName = file.server_filename || file.path.split('/').pop() || "";
        const ctime = file.server_ctime || file.ctime || 0;
        const mtime = file.server_mtime || file.mtime || 0;

        return {
            filePath: file.path,
            fileName: fileName,
            fileSize: file.size,
            fileType: file.isdir === 1 ? fso.FileType.F_DIR : fso.FileType.F_ALL,
            fileUUID: file.fs_id.toString(),
            fileHash: file.md5 ? {
                md5: this.decryptMd5(file.md5)
            } : undefined,
            thumbnails: file.thumbs?.url3,
            timeCreate: ctime ? new Date(ctime * 1000) : undefined,
            timeModify: mtime ? new Date(mtime * 1000) : undefined
        };
    }

    // Decrypt MD5 hash from Baidu format
    private decryptMd5(encryptedMd5: string): string {
        // Check if already valid hex
        if (/^[0-9a-f]{32}$/i.test(encryptedMd5)) {
            return encryptedMd5.toLowerCase();
        }

        let result = '';
        for (let i = 0; i < encryptedMd5.length; i++) {
            let n: number;
            if (i === 9) {
                n = encryptedMd5.charCodeAt(i) - 'g'.charCodeAt(0);
            } else {
                n = parseInt(encryptedMd5[i], 16);
            }
            result += (n ^ (15 & i)).toString(16);
        }

        // Rearrange: [8:16] + [0:8] + [24:32] + [16:24]
        return result.substring(8, 16) + result.substring(0, 8) + 
               result.substring(24, 32) + result.substring(16, 24);
    }

    // Encrypt MD5 hash to Baidu format
    private encryptMd5(originalMd5: string): string {
        // Rearrange: [8:16] + [0:8] + [24:32] + [16:24]
        const reversed = originalMd5.substring(8, 16) + originalMd5.substring(0, 8) + 
                        originalMd5.substring(24, 32) + originalMd5.substring(16, 24);

        let result = '';
        for (let i = 0; i < reversed.length; i++) {
            let n = parseInt(reversed[i], 16);
            n ^= (15 & i);
            if (i === 9) {
                result += String.fromCharCode(n + 'g'.charCodeAt(0));
            } else {
                result += n.toString(16);
            }
        }

        return result;
    }

    // Calculate slice size based on file size and VIP type
    private getSliceSize(fileSize: number): number {
        const config = this.config as meta.BaiduNetdiskConfig;

        // Non-VIP users use fixed slice size
        if (this.vipType === con.VIP_TYPE_NORMAL) {
            if (config.custom_upload_part_size) {
                console.warn("CustomUploadPartSize not supported for non-VIP users, using default");
            }
            if (fileSize > con.MAX_SLICE_NUM * con.DEFAULT_SLICE_SIZE) {
                console.warn(`File size (${fileSize}) may be too large for non-VIP user`);
            }
            return con.DEFAULT_SLICE_SIZE;
        }

        // Determine max slice size based on VIP type
        let maxSliceSize = con.DEFAULT_SLICE_SIZE;
        if (this.vipType === con.VIP_TYPE_VIP) {
            maxSliceSize = con.VIP_SLICE_SIZE;
        } else if (this.vipType === con.VIP_TYPE_SVIP) {
            maxSliceSize = con.SVIP_SLICE_SIZE;
        }

        // Use custom slice size if configured
        if (config.custom_upload_part_size) {
            if (config.custom_upload_part_size < con.DEFAULT_SLICE_SIZE) {
                console.warn("CustomUploadPartSize too small, using default");
                return con.DEFAULT_SLICE_SIZE;
            }
            if (config.custom_upload_part_size > maxSliceSize) {
                console.warn(`CustomUploadPartSize too large, using max: ${maxSliceSize}`);
                return maxSliceSize;
            }
            return config.custom_upload_part_size;
        }

        // Low bandwidth mode: use smallest slice size that fits within limit
        if (config.low_bandwith_upload_mode) {
            let size = con.DEFAULT_SLICE_SIZE;
            while (size <= maxSliceSize) {
                if (fileSize <= con.MAX_SLICE_NUM * size) {
                    return size;
                }
                size += con.SLICE_STEP;
            }
        }

        // Check if file is too large
        if (fileSize > con.MAX_SLICE_NUM * maxSliceSize) {
            console.warn(`File size (${fileSize}) may be too large`);
        }

        return maxSliceSize;
    }
}
