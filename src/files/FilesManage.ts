import {Context} from "hono";
import {MountManage} from "../mount/MountManage";
import {FileType} from "./FilesObject";

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
        console.log("@action before", action, source, target, config)
        let mount_data: MountManage = new MountManage(this.c);
        let drive_load: any = await mount_data.loader(source, action == "list", action == "list");
        if (!drive_load) return this.c.json({flag: false, text: '404 NOT FOUND'}, 404)
        let drive_text: any = await drive_load[0].loadSelf();
        console.log("@action list", source, drive_load[0].router)
        console.log("@action list", drive_text, drive_load[0].change)
        if (!drive_load) return this.c.json({flag: false, text: '404 NOT FOUND'}, 404)
        source = source?.replace(drive_load[0].router, '') || "/"
        console.log("@action", source, drive_load[0].router)
        target = target?.replace(drive_load[0].router, '') || "/"
        console.log("@action after", action, source, target,  drive_load.downFile)
        // 执行操作 ==========================================================================
        switch (action) {
            case "list": { // 列出文件 =======================================================
                // 获取当前目录的文件列表 ====================================================
                const path_info = await drive_load[0].listFile({path: source})
                const file_list: any[] = path_info?.fileList || []
                // 获取所有子目录挂载点 ======================================================
                for (let i = 1; i < drive_load.length; i++) {
                    const sub_driver = drive_load[i];
                    const relative_path = sub_driver.router.substring(drive_load[0].router.length + 1);
                    file_list.push({
                        filePath: source || "",
                        fileName: relative_path,
                        fileSize: 0, fileType: 0,
                        fileUUID: "", fileHash: {},
                        timeModify: new Date(),
                        timeCreate: new Date()
                    });
                }
                return this.c.json({
                    flag: true, text: 'Success', data: {
                        pageSize: file_list.length,
                        filePath: source || "/",
                        fileList: file_list
                    }
                })
            }
            case "link": { // 获取链接 =======================================================
                const file_links = await drive_load[0].downFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: file_links})
            }
            case "copy": { // 复制文件 =======================================================
                console.log("@action", "copy", source, target)
                const task_result = await drive_load[0].copyFile({path: source}, {path: target})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "move": { // 移动文件 =======================================================
                console.log("@action", "moveFile", source, target)
                const task_result = await drive_load[0].moveFile({path: source}, {path: target})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "create": { // 创建对象 =====================================================
                if (!target) return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const create_result = await drive_load[0].makeFile(
                    {path: source},
                    target,
                    target.endsWith("/") ? FileType.F_DIR : FileType.F_ALL)
                // 检查创建结果，如果失败则返回错误
                if (create_result && !create_result.flag) {
                    return this.c.json({flag: false, text: create_result.text}, 400)
                }
                return this.c.json({flag: true, text: 'Success', data: create_result})
            }
            case "remove": { // 删除对象 =====================================================
                const task_result = await drive_load[0].killFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "upload": { // 上传文件 =====================================================
                if (!upload || !upload["files"])
                    return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const upload_result = await drive_load[0].pushFile(
                    {path: source}, upload["files"].name, FileType.F_ALL, upload["files"])
                return this.c.json({flag: true, text: 'Success', data: upload_result})
            }
            default: { // 默认应输出错误 =====================================================
                return this.c.json({flag: false, text: 'Invalid Action'}, 400)
            }
        }
    }
}