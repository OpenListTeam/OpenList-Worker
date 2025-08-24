export class PathInfo {
    public pageSize: number // 文件数量
    public pageNums: number // 页面编号
    public filePath: string // 文件路径
    public fileList: FileInfo[]

    constructor() {
    }
}

export class FileInfo {
    // 必要属性 ========================
    public filePath: string // 文件路径
    public fileName: string // 文件名称
    public fileSize: number // 文件大小
    public fileType: number // 文件类型
    // 可选属性 ========================
    public uuidData: string // 文件标识
    public hashData: string // 文件哈希
    public hashType: string // 文件哈希
    public dateLast: Date   // 修改时间
    public dateInit: Date   // 创建时间
    constructor() {
    }
}

enum Action {
    CREATE = 0,
    DELETE = 1,
    UPLOAD = 2,
    MOVETO = 3,
    COPYTO = 4
}

enum Status {
    SUCCESSFUL = 0, // 成功处理提交事务
    PROCESSING = 1, // 正在处理提交事务
    NETWORKING_ERR = 2, // 网络原因失败
    PERMISSION_ERR = 3, // 权限原因失败
    FILESYSTEM_ERR = 4, // 文件原因失败
    UNDETECTED_ERR = 9  // 未知原因失败
}

export class FileTask {
    public taskType: Action
    public taskFlag: Status
    public messages: string
}

export class FileLink {
    public fileLink: string
    public fileName: string
    public fileSize: number
    public linkInfo: any
    public metaInfo: any
}