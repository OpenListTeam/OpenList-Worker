/** =========== SFTP 文件操作驱动器 ================
 * 注意：SFTP在边缘运行时中需要通过代理服务实现，此处提供接口骨架
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import {CONFIG_INFO, SAVING_INFO} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds; declare public config: CONFIG_INFO; declare public saving: SAVING_INFO;
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) { super(c, router, config, saving); this.clouds = new HostClouds(c, router, config, saving); }
    async initSelf(): Promise<DriveResult> { return this.clouds.initConfig(); }
    async loadSelf(): Promise<DriveResult> { return {flag: true, text: "OK"}; }

    private resolvePath(path?: string): string { return (this.config.root_path || "/") + (path || ""); }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        // SFTP列目录需要ssh2库，在Worker环境下需通过代理实现
        console.warn("[SFTP] listFile: 需要Node.js环境或代理服务支持");
        return {pageSize: 0, filePath: file?.path, fileList: []};
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        console.warn("[SFTP] downFile: 需要Node.js环境或代理服务支持");
        return [{status: false, result: "SFTP下载需要Node.js环境支持"}];
    }

    async copyFile(): Promise<fso.FileTask> { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: "SFTP不支持服务端复制"}; }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        console.warn("[SFTP] moveFile: 需要Node.js环境或代理服务支持");
        return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: "SFTP移动需要Node.js环境支持"};
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        console.warn("[SFTP] killFile: 需要Node.js环境或代理服务支持");
        return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: "SFTP删除需要Node.js环境支持"};
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType): Promise<DriveResult> {
        console.warn("[SFTP] makeFile: 需要Node.js环境或代理服务支持");
        return {flag: false, text: "SFTP操作需要Node.js环境支持"};
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return this.makeFile(file, name, type); }
}
