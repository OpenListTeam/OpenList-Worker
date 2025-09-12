import {Context} from "hono";

export class FilesManage {
    public c: Context
    public d: any | null

    constructor(c: Context, d?: any) {
        this.c = c
        this.d = d
    }

    async listFile(mount_path?: string): Promise<FilesInfo> {

    }
}