import * as fso from "../../manage/FileObject";
import {Requests} from "../../shared/Requests";


export class HostDriver {
    public configData: Record<string, any>
    public serverData: Record<string, any>

    constructor(
        public in_configData: Record<string, any>,
        public in_serverData: Record<string, any>,
    ) {
        this.configData = in_configData;
        this.serverData = in_serverData;
    }
    // 初始驱动 =========================================================
    async initSelf() {

    }

    // 载入驱动 =========================================================
    async loadSelf() {}

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
                        'Cookie': this.configData['cookie']
                    },
                    body: JSON.stringify(params)
                },)
            const result_json: Record<string, any> = await result_data.text()
            console.log(result_json);
        }
        return null;
    }

}


