// 公用导入 =====================================================
import {Context} from "hono";
import {HostClouds} from "./utils"
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
// 专用导入 =====================================================
import {HttpRequest} from "../../share/HttpRequest";


export class HostDriver extends BasicDriver {
    // 公共定义 =============================
    public c: Context
    public router: string
    public config: Record<string, any>
    public saving: Record<string, any>
    public clouds: HostClouds

    // 构造函数 =============================
    constructor(
        c: Context, router: string,
        public config: Record<string, any>,
        public saving: Record<string, any>,
    ) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    // 载入驱动 =========================================================
    async initSelf(): Promise<any> {
        const result: boolean = await this.clouds.initConfig();
        this.saving = this.clouds.saving;
        this.change = true;
        return result;
    }

    // 载入驱动 =========================================================
    async loadSelf(): Promise<any> {
        // if (this.clouds) return false;
        const result = await this.clouds.initConfig();
        console.log("@loadSelf", result);
        this.change = this.clouds.change;
        this.server = this.clouds.saving;
        return true;
    }

    // 列出文件 =========================================================
    async listFile(filePath: string): Promise<fso.PathInfo | null> {
        const path_text: string = filePath.slice(1)
        const path_list: string[] = path_text.split("/");
        console.log(path_list);
        let now_uuid: number = -11
        for (const now_path in path_list) {
            // 创建参数模板
            console.log(path_list[now_path]);
            const params: FileListParams = {
                mediaType: "0",
                folderId: now_uuid,
                iconOption: "5",
                orderBy: "lastOpTime",
                descending: "true",
            }
            // 请求文件列表
            const result_data: any = await fetch(
                "https://cloud.189.cn/api/open/file/listFiles.action", {
                    method: 'POST', headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': this.config['cookie']
                    },
                    body: JSON.stringify(params)
                },)
            const result_json: Record<string, any> = await result_data.text()
            console.log(result_json);
        }
        return null;
    }

}


