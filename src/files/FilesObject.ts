import {CryptInfo} from "../crypt/CryptObject";
import {StatusCode} from "../enums";

export * from "./FilesObject";

export interface FileFind {
    path?: string | null;
    uuid?: string | null;
}

// 文件信息 ############################
export interface FileInfo {
    // 必要属性 ========================
    filePath: string      // 文件路径
    fileName: string      // 文件名称
    fileSize: number      // 文件大小
    fileType: number      // 文件类型
    // 拓展属性 ========================
    fileHash?: FileHash   // 文件哈希
    fileUUID?: string     // 文件标识
    // 可选属性 ========================
    thumbnails?: string   // 预览地址
    timeModify?: Date     // 修改时间
    timeCreate?: Date     // 创建时间
    fileCrypts?: CryptInfo// 加密数据
    fileExtend?: Record<string, string>
}

// 目录信息 ############################
export interface PathInfo {
    pageSize?: number | null  // 文件数量
    pageNums?: number | null  // 页面编号
    filePath?: string | null  // 文件路径
    fileList?: FileInfo[]     // 文件列表
}

// 任务信息 ############################
export interface FileTask {
    taskType?: FSAction  // 任务类型
    taskFlag?: FSStatus  // 任务状态
    messages?: string   // 任务消息
}

// 下载连接 ############################
export interface FileLink {
    status?: boolean    // 下载状态
    direct?: string     // 下载地址
    stream?: any        // 下载FD流
    header?: Record<string, string>
    result?: string     // 文本结果
}

// 文件哈希 ############################
export interface FileHash {
    md5?: string        // MD5-哈希
    sha1?: string       // SHA1哈希
    sha256?: string     // SHA2哈希
}

// 任务类型 ############################
export enum FSAction {
    CREATE = 0,         // 创建文件
    DELETE = 1,         // 删除文件
    UPLOAD = 2,         // 上传文件
    MOVETO = 3,         // 移动文件
    COPYTO = 4,         // 复制文件
    RENAME = 5          // 命名文件
}

// FS状态码 ############################
export enum FSStatus {
    SUCCESSFUL_ALL = 0, // 成功处理
    PROCESSING_NOW = 1, // 正在处理
    NETWORKING_ERR = 2, // 网络失败
    PERMISSION_ERR = 3, // 权限失败
    FILESYSTEM_ERR = 4, // 文件失败
    UNDETECTED_ERR = 9  // 未知失败
}

// 文件类型 ############################
export enum FileType {
    F_DIR = 0,           // 文件目录
    F_ALL = 1,           // 文件全部
    F_TXT = 2,           // 文本文件
    F_IMG = 3,           // 图像文件
    F_VID = 4,           // 视频文件
    F_AUD = 5,           // 音频文件
    F_DOC = 6,           // 文档文件
    F_ZIP = 7,           // 压缩文件
    F_EXE = 8,           // 执行文件
    F_ISO = 9            // 光盘文件
}