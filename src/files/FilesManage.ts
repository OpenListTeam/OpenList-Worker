import {Context} from "hono";
import {MountManage} from "../mount/MountManage";
import {FileType} from "./FilesObject";
import {FileFind} from "../drive/DriveObject";

export class FilesManage {
    public c: Context
    public d: any | null

    constructor(c: Context, d?: any) {
        this.c = c
        this.d = d
    }

    async action(action?: string | undefined,
                 source?: string | undefined,
                 target?: string | undefined,
                 config?: Record<string, any> | undefined,
                 driver?: string | undefined,
                 upload?: { [key: string]: any } | undefined): Promise<any> {
        // 检查参数 ==========================================================================
        const mount_data: MountManage = new MountManage(this.c);
        console.log("@action before", action, source, target, config)
        const drive_load: any = await mount_data.loader(source);
        // console.log("@files", drive_load)
        if (!drive_load) return this.c.json({flag: false, text: '404 NOT FOUND'}, 404)
        source = source?.replace(drive_load.router, '') || "/"
        console.log("@action", source, drive_load.router)
        target = target?.replace(drive_load.router, '') || "/"
        console.log("@action after", action, source, target, drive_load.router)
        // 执行操作 ==========================================================================
        switch (action) {
            case "list": { // 列出文件 =======================================================
                const file_list: any[] = await drive_load.listFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            case "link": { // 获取链接 =======================================================
                const file_list: any[] = await drive_load.downFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            case "copy": { // 复制文件 =======================================================
                console.log("@action", "copy", source, target)
                const file_list: any[] = await drive_load.copyFile({path: source}, {path: target})
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            case "move": { // 移动文件 =======================================================
                console.log("@action", "moveFile", source, target)
                const file_list: any[] = await drive_load.moveFile({path: source}, {path: target})
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            case "create": { // 创建对象 =====================================================
                if (!target) return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const file_list: any[] = await drive_load.makeFile(
                    {path: source},
                    target,
                    target.endsWith("/") ? FileType.F_DIR : FileType.F_ALL)
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            case "remove": { // 删除对象 =====================================================
                const file_list: any[] = await drive_load.killFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            case "upload": { // 上传文件 =====================================================
                if (!upload || !upload["files"])
                    return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const file_list: any[] = await drive_load.pushFile(
                    {path: source}, upload["files"].name, FileType.F_ALL, upload["files"])
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            default: { // 默认应输出错误 =====================================================
                return this.c.json({flag: false, text: 'Invalid Action'}, 400)
            }
        }
    }
}