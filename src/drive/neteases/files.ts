/** =========== 网易云音乐 文件操作驱动器 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
import {Context} from "hono";
import {HostClouds} from "./utils";
import {BasicDriver} from "../BasicDriver";
import {DriveResult} from "../DriveObject";
import * as fso from "../../files/FilesObject";
import * as con from "./const";
import {CONFIG_INFO, SAVING_INFO, CloudSong} from "./metas";

export class HostDriver extends BasicDriver {
    declare public clouds: HostClouds;
    declare public config: CONFIG_INFO;
    declare public saving: SAVING_INFO;

    constructor(c: Context, router: string, config: Record<string, any>, saving: Record<string, any>) {
        super(c, router, config, saving);
        this.clouds = new HostClouds(c, router, config, saving);
    }

    async initSelf(): Promise<DriveResult> { const r = await this.clouds.initConfig(); this.saving = this.clouds.saving; this.change = true; return r; }
    async loadSelf(): Promise<DriveResult> { await this.clouds.loadSaving(); this.change = this.clouds.change; this.saving = this.clouds.saving; return {flag: true, text: "OK"}; }

    async listFile(file?: fso.FileFind): Promise<fso.PathInfo> {
        try {
            const limit = this.config.song_limit || 200;
            const resp = await this.clouds.request(con.API_ENDPOINTS.CLOUD_GET, "POST", {limit: String(limit), offset: "0"});
            const songs: CloudSong[] = resp.data || [];
            const fileList = songs.map(s => this.songToObj(s));
            return {pageSize: fileList.length, filePath: "/", fileList};
        } catch (e: any) { return {pageSize: 0, filePath: "/", fileList: []}; }
    }

    private songToObj(s: CloudSong): fso.FileInfo {
        return {filePath: "", fileName: s.fileName || `${s.songName}.mp3`, fileSize: s.fileSize || 0, fileType: 1, fileUUID: String(s.songId), timeModify: new Date(s.addTime)};
    }

    async downFile(file?: fso.FileFind): Promise<fso.FileLink[]> {
        try {
            if (!file?.uuid) return [{status: false, result: "歌曲ID不能为空"}];
            const resp = await this.clouds.request(con.API_ENDPOINTS.SONG_URL, "POST", {ids: `[${file.uuid}]`, level: "exhigh", encodeType: "mp3"});
            const url = resp.data?.[0]?.url;
            if (!url) return [{status: false, result: "获取播放链接失败"}];
            return [{status: true, direct: url}];
        } catch (e: any) { return [{status: false, result: e.message}]; }
    }

    async killFile(file?: fso.FileFind): Promise<fso.FileTask> {
        try {
            if (!file?.uuid) throw new Error("歌曲ID不能为空");
            await this.clouds.request(con.API_ENDPOINTS.CLOUD_DEL, "POST", {songIds: `[${file.uuid}]`});
            return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.SUCCESSFUL_ALL};
        } catch (e: any) { return {taskType: fso.FSAction.DELETE, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: e.message}; }
    }

    // 网易云音乐不支持的操作
    async copyFile(): Promise<fso.FileTask> { return {taskType: fso.FSAction.COPYTO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: "网易云音乐不支持复制"}; }
    async moveFile(): Promise<fso.FileTask> { return {taskType: fso.FSAction.MOVETO, taskFlag: fso.FSStatus.UNDETECTED_ERR, messages: "网易云音乐不支持移动"}; }
    async makeFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: any | null): Promise<DriveResult> { return {flag: false, text: "网易云音乐不支持创建文件夹"}; }
    async pushFile(file?: fso.FileFind, name?: string | null, type?: fso.FileType, data?: string | any | null): Promise<DriveResult> { return {flag: false, text: "暂不支持上传"}; }
}
