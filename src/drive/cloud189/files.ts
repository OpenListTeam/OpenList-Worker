// 公用导入 =====================================================
import {Context} from "hono";
import {HostClouds} from "./utils"
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
// 专用导入 =====================================================
import {HttpRequest} from "../../share/HttpRequest";
import {v4 as uuidv4} from 'uuid';

export class HostDriver extends BasicDriver {
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
    async initSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.initConfig();
        console.log("@initSelf", result);
        if (result.flag) {
            this.saving = this.clouds.saving;
            this.change = true;
        }
        return result;
    }

    // 载入驱动 =========================================================
    async loadSelf(): Promise<DriveResult> {
        const result: DriveResult = await this.clouds.readConfig();
        console.log("@loadSelf", result);
        if (result.flag) {
            this.change = this.clouds.change;
            this.saving = this.clouds.saving;
        }
        return result;
    }

    // 列出文件 =========================================================
    async listFile(filePath: string): Promise<fso.PathInfo | null> {
        const path_text: string = filePath.slice(1)
        const path_list: string[] = path_text.split("/");
        console.log(path_list);
        let now_uuid: number = -11
        for (const now_path in path_list) {
            // 创建参数模板
            console.log("#listFile", path_list[now_path]);
            console.log("#listFile", this.saving.token.accessToken);
            const params: Record<string, any> = {
                // 头部 =============================
                appKey: con.APP_ID,
                timeStamp: Date.now(),
                accessToken: this.saving.token.accessToken,
                // paras: "",
                // sign: "",
                // 参数 =============================
                folderId: now_uuid,
                mediaType: "0",
                iconOption: "5",
                // 分页 =============================
                recursive: "0",
                orderBy: "filename",
                descending: "false",
            }
            console.log("#listFile", params);
            const result_data: any = await HttpRequest(
                "POST",
                "https://cloud.189.cn/api/open/file/listFiles.action",
                params, {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Request-ID': uuidv4()
                }, {finder: "json"}
            );
            console.log(result_data);
        }
        return null;
    }

    // 在HostDriver类中添加以下方法
    async getFilesWithPage(fileId: string,
                           isFamily: boolean,
                           pageNum: number,
                           pageSize: number,
                           orderBy: string,
                           orderDirection: string): Promise<any> {
        let fullUrl = this.clouds.API_URL;
        if (isFamily) {
            fullUrl += "/family/file";
        }
        fullUrl += "/listFiles.action";

        const params: Record<string, string> = {
            folderId: fileId,
            fileType: "0",
            mediaAttr: "0",
            iconOption: "5",
            pageNum: pageNum.toString(),
            pageSize: pageSize.toString()
        };

        if (isFamily) {
            params.familyId = this.clouds.FamilyID;
            params.orderBy = "1";
            params.descending = "false";
        } else {
            params.recursive = "0";
            params.orderBy = orderBy;
            params.descending = "false";
        }

        try {
            const response = await this.clouds.httpRequest.get(fullUrl, {params});
            return response.data;
        } catch (error) {
            console.error("Failed to get files:", error);
            throw error;
        }
    }
}