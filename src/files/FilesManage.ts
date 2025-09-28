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
        const mount_data: MountManage = new MountManage(this.c);
        console.log("@action before", action, source, target, config)
        
        // 对于 list 操作，使用 fetch_full=true 来获取所有匹配的驱动
        let drive_load: any;
        if (action === "list") {
            const all_drivers = await mount_data.filter(source || "/", true);
            if (all_drivers && Array.isArray(all_drivers) && all_drivers.length > 0) {
                // 使用最长匹配的驱动（第一个）作为主驱动
                drive_load = all_drivers[0];
                console.log("@action list", source, drive_load.router)
                const result: any = await drive_load.loadSelf();
                console.log("@action list", result, drive_load.change)
                if (!result.flag) drive_load = null;
            }
        } else {
            drive_load = await mount_data.loader(source);
        }
        // console.log("@files", drive_load)
        if (!drive_load) return this.c.json({flag: false, text: '404 NOT FOUND'}, 404)
        source = source?.replace(drive_load.router, '') || "/"
        console.log("@action", source, drive_load.router)
        target = target?.replace(drive_load.router, '') || "/"
        console.log("@action after", action, source, target, drive_load.router)
        // 执行操作 ==========================================================================
        switch (action) {
            case "list": { // 列出文件 =======================================================
                // 获取当前目录的文件列表
                const path_info = await drive_load.listFile({path: source})
                const file_list: any[] = path_info?.fileList || []
                
                // 修复原始文件的filePath字段
                file_list.forEach(file => {
                    if (file.filePath === "" || file.filePath === null || file.filePath === undefined) {
                        file.filePath = source || "/"
                    }
                })
                
                // 获取所有匹配的驱动（包括子目录驱动），并过滤掉未启用的挂载点
                const all_drivers = await mount_data.filter(source || "/", true, true);
                if (all_drivers && Array.isArray(all_drivers) && all_drivers.length > 1) {
                    // 跳过第一个（主驱动），处理其他子目录驱动
                    for (let i = 1; i < all_drivers.length; i++) {
                        const sub_driver = all_drivers[i];
                        // 计算相对路径作为文件夹名
                        const relative_path = sub_driver.router.substring(drive_load.router.length + 1);
                        // 添加为FileInfo格式的文件夹类型
                        file_list.push({
                            filePath: source || "", // 使用当前请求的路径
                            fileName: relative_path,
                            fileSize: 0,
                            fileType: 0, // 0 表示文件夹
                            fileUUID: sub_driver.router, // 使用路径作为UUID
                            fileHash: {},
                            timeModify: new Date(),
                            timeCreate: new Date()
                        });
                    }
                }
                
                // 返回符合前端期望的PathInfo格式
                const pathInfo = {
                    pageSize: file_list.length,
                    filePath: source || "/",
                    fileList: file_list
                };
                
                return this.c.json({flag: true, text: 'Success', data: pathInfo})
            }
            case "link": { // 获取链接 =======================================================
                const file_links = await drive_load.downFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: file_links})
            }
            case "copy": { // 复制文件 =======================================================
                console.log("@action", "copy", source, target)
                const task_result = await drive_load.copyFile({path: source}, {path: target})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "move": { // 移动文件 =======================================================
                console.log("@action", "moveFile", source, target)
                const task_result = await drive_load.moveFile({path: source}, {path: target})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "create": { // 创建对象 =====================================================
                if (!target) return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const create_result = await drive_load.makeFile(
                    {path: source},
                    target,
                    target.endsWith("/") ? FileType.F_DIR : FileType.F_ALL)
                return this.c.json({flag: true, text: 'Success', data: create_result})
            }
            case "remove": { // 删除对象 =====================================================
                const task_result = await drive_load.killFile({path: source})
                return this.c.json({flag: true, text: 'Success', data: task_result})
            }
            case "upload": { // 上传文件 =====================================================
                if (!upload || !upload["files"])
                    return this.c.json({flag: false, text: 'Invalid Target'}, 400)
                const upload_result = await drive_load.pushFile(
                    {path: source}, upload["files"].name, FileType.F_ALL, upload["files"])
                return this.c.json({flag: true, text: 'Success', data: upload_result})
            }
            default: { // 默认应输出错误 =====================================================
                return this.c.json({flag: false, text: 'Invalid Action'}, 400)
            }
        }
    }
}