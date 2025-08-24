import * as fso from './object'


class HostFileManage {
    private driver: HostFileDriver;

    // 列出文件 =========================================================
    listFile(): fso.PathInfo | null {

        return null;
    }

    // 创建文件 =========================================================
    makeFile(filePath: string): void {
    }

    // 删除文件 =========================================================
    killFile(filePath: string): void {
    }

    // 移动文件 =========================================================
    moveFile(fromPath: string, destPath: string): void {
    }

    // 复制文件 =========================================================
    copyFile(fromPath: string, destPath: string): void {
    }

    // 下载文件 =========================================================
    downFile(destPath: string): void {

    }

    pushFile(destPath: string): void {

    }
}