/**
 * 阿里夸克网盘 文件操作驱动器（骨架）
 * 当前为占位实现，待后续完善。
 */
import {Context} from "hono";
import {BasicDriver} from "../../BasicDriver";
import {DriveResult} from "../../DriveObject";
import * as fso from "../../../files/FilesObject";

export class HostDriver extends BasicDriver {
    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) {
        super(c, router, config, saving);
    }

    async initSelf(): Promise<DriveResult> {
        return {flag: false, text: '阿里夸克网盘驱动尚未实现，敬请期待'};
    }

    async loadSelf(): Promise<DriveResult> {
        return {flag: false, text: '阿里夸克网盘驱动尚未实现'};
    }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        return {fileList: [], pageSize: 0};
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[] | null> {
        return [{status: false, result: '驱动未实现'}];
    }

    async copyFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
    }

    async moveFile(file?: fso.FileFind, dest?: fso.FileFind): Promise<fso.FileTask> {
        return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        return {taskFlag: fso.FSStatus.FILESYSTEM_ERR};
    }

    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any): Promise<DriveResult | null> {
        return {flag: false, text: '驱动未实现'};
    }

    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any): Promise<DriveResult | null> {
        return {flag: false, text: '驱动未实现'};
    }
}