import {Context} from "hono";
import {MountManage} from "../mount/MountManage";

export class FilesManage {
    public c: Context
    public d: any | null

    constructor(c: Context, d?: any) {
        this.c = c
        this.d = d
    }

    async action(action: string, source: string, target: string | undefined,
                 config?: Record<string, any> | undefined): Promise<any> {
        console.log("@files", action, source, target, config)
        // 检查参数 ==========================================================================
        const mount_data: MountManage = new MountManage(this.c);
        const drive_load: any = await mount_data.loader(source);
        if (!drive_load) return this.c.json({flag: false, text: '404 NOT FOUND'}, 404)
        // 执行操作 ==========================================================================
        switch (action) {
            case "list": { // 列出文件 =======================================================
                const file_list: any[] = await drive_load.listFile(source)
                return this.c.json({flag: true, text: 'Success', data: file_list})
            }
            case "link": { // 获取链接 =======================================================
                break;
            }
            case "copy": { // 复制文件 =======================================================
                break;
            }
            case "move": { // 移动文件 =======================================================
                break;
            }
            case "create": { // 创建对象 =====================================================
                break;
            }
            case "remove": { // 删除对象 =====================================================
                break;
            }
            case "config": { // 配置对象 =====================================================
                break;
            }
            case "shared": { // 共享对象 =====================================================
                break;
            }
            default: { // 默认应输出错误 =====================================================
                return this.c.json({flag: false, text: 'Invalid Action'}, 400)
            }
        }
    }
}