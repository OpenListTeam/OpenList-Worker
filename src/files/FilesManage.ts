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

        // 检查drive_load[0]是否为null（没有匹配的挂载点）
        const has_main_mount = drive_load[0] !== null;

        if (has_main_mount) {
            let drive_text: any = await drive_load[0].loadSelf();
            console.log("@action driver core", source, drive_load[0].router)
            console.log("@action driver text", drive_text, drive_load[0].change)
            source = source?.replace(drive_load[0].router, '') || "/"
            console.log("@action source after", source, drive_load[0].router)
            target = target?.replace(drive_load[0].router, '') || "/"
            console.log("@action target after", target, drive_load[0].router)
            console.log("@action target after", action, source, target, drive_load.downFile)
        } else {
            console.log("@action target error",
                "没有匹配的主挂载点，只显示子挂载点")
        }
        // 执行操作 ==========================================================================
        switch (action) {
            case "list": { // 列出文件 =======================================================
                let file_list: any[] = [];

                // 获取当前目录的文件列表 ====================================================
                if (has_main_mount) {
                    const path_info = await drive_load[0].listFile({path: source})
                    file_list = path_info?.fileList || []
                }

                // 获取所有子目录挂载点 ======================================================
                for (let i = 1; i < drive_load.length; i++) {
                    const sub_driver = drive_load[i];
                    let relative_path: string;

                    if (has_main_mount) {
                        // 有主挂载点：计算相对路径
                        relative_path = drive_load[0].router === '/'
                            ? sub_driver.router.substring(1)
                            : sub_driver.router.substring(drive_load[0].router.length).replace(/^\//, '');
                    } else {
                        // 没有主挂载点：去掉开头的/，只保留第一级路径
                        const path_without_slash = sub_driver.router.substring(1); // 去掉开头的/
                        const first_slash_index = path_without_slash.indexOf('/');
                        relative_path = first_slash_index > 0
                            ? path_without_slash.substring(0, first_slash_index)
                            : path_without_slash;
                    }

                    console.log("@action sub_driver:", sub_driver.router, "=>", relative_path)
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