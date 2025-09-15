import * as fso from "../../files/FilesObject";

class HostDriver {
    public configData: Record<string, any>
    public serverData: Record<string, any>

    constructor(
        public in_configData: Record<string, any>,
        public in_serverData: Record<string, any>,
    ) {
        this.configData = in_configData;
        this.serverData = in_serverData;
    }

    // 列出文件 =========================================================
    listFile(filePath: string): fso.PathInfo | null {
        return null;
    }

    // 创建文件 =========================================================
    makeFile(filePath: string): fso.FileTask | null {
        return null
    }

    // 删除文件 =========================================================
    killFile(filePath: string): fso.FileTask | null {
        return null
    }

    // 移动文件 =========================================================
    moveFile(fromPath: string,
             destPath: string): fso.FileTask | null {
        return null
    }

    // 复制文件 =========================================================
    copyFile(fromPath: string,
             destPath: string): fso.FileTask | null {
        return null
    }

    // 下载文件 =========================================================
    downFile(destPath: string): fso.FileLink[] | null {
        return null
    }

    // 上传文件 =========================================================
    pushFile(destPath: string): fso.FileLink[] | null {
        return null
    }
}