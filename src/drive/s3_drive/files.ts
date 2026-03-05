/** =========== S3兼容存储 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { this.change = false; return {flag: true, text: "OK"}; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const prefix = this.getPrefix(file?.path);
            const fileList: fso.FileInfo[] = [];
            let continuationToken = "";
            do {
                const params = new URLSearchParams({"list-type": "2", prefix, delimiter: "/", "max-keys": String(con.DEFAULTS.MAX_KEYS)});
                if (continuationToken) params.set("continuation-token", continuationToken);
                const resp = await this.clouds.signedRequest("GET", "/", params);
                const text = await resp.text();
                // 解析XML响应
                const contents = text.match(/<Contents>([\s\S]*?)<\/Contents>/g) || [];
                for (const c of contents) {
                    const key = c.match(/<Key>(.*?)<\/Key>/)?.[1] || "";
                    const name = key.replace(prefix, "").replace(/\/$/, "");
                    if (!name || name === (this.config.placeholder || ".placeholder")) continue;
                    const size = parseInt(c.match(/<Size>(.*?)<\/Size>/)?.[1] || "0");
                    const lastModified = c.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] || "";
                    const etag = c.match(/<ETag>"?(.*?)"?<\/ETag>/)?.[1] || "";
                    fileList.push({filePath: "", fileName: name, fileSize: size, fileType: 1, timeModify: new Date(lastModified), fileHash: {md5: etag}});
                }
                const prefixes = text.match(/<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g) || [];
                for (const p of prefixes) {
                    const pKey = p.match(/<Prefix>(.*?)<\/Prefix>/)?.[1] || "";
                    const name = pKey.replace(prefix, "").replace(/\/$/, "");
                    if (name) fileList.push({filePath: "", fileName: name, fileSize: 0, fileType: 0});
                }
                continuationToken = text.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1] || "";
            } while (continuationToken);
            return {pageSize: fileList.length, filePath: file?.path, fileList};
        } catch (e: any) { return {pageSize: 0, filePath: file?.path, fileList: []}; }
    }

    private getPrefix(path?: string): string {
        const root = this.config.root_path ? `${this.config.root_path}/` : "";
        const sub = path ? path.replace(/^\//, "") : "";
        return root + (sub ? `${sub}/` : "");
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            const key = this.getPrefix(file?.path).replace(/\/$/, "");
            if (!key) return [{status: false, result: "文件路径不能为空"}];
            const resp = await this.clouds.signedRequest("GET", `/${key}`);
            const url = resp.url;
            return [{status: true, direct: url}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const srcKey = this.getPrefix(file?.path).replace(/\/$/, "");
            const dstKey = this.getPrefix(dest?.path).replace(/\/$/, "");
            if (!srcKey || !dstKey) throw new Error("路径不能为空");
            const headers: Record<string, string> = {"X-Amz-Copy-Source": `/${this.config.bucket}/${srcKey}`};
            await this.clouds.signedRequest("PUT", `/${dstKey}`);
            return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        const copyResult = await this.copyFile(file, dest);
        if (copyResult.taskFlag === fso.FSStatus.SUCCESSFUL_ALL) await this.killFile(file);
        return {taskType: fso.FSAction.MOVETO, taskFlag: copyResult.taskFlag, messages: copyResult.messages};
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            const key = this.getPrefix(file?.path).replace(/\/$/, "");
            if (!key) throw new Error("路径不能为空");
            await this.clouds.signedRequest("DELETE", `/${key}`);
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        try {
            if (type === fso.FileType.F_DIR) {
                const prefix = this.getPrefix(file?.path);
                await this.clouds.signedRequest("PUT", `/${prefix}${name}/`);
                return {flag: true, text: "创建成功"};
            }
            return {flag: false, text: "暂不支持直接上传"};
        } catch (e: any) { return {flag: false, text: e.message}; }
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
