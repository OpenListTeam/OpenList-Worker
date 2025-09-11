export interface PathInfo {
    pageSize: number // 文件数量
    pageNums: number // 页面编号
    filePath: string // 文件路径
    fileList: FileInfo[]
}

export interface FileInfo {
    // 必要属性 ========================
    filePath: string // 文件路径
    fileName: string // 文件名称
    fileSize: number // 文件大小
    fileType: number // 文件类型
    // 可选属性 ========================
    uuidData: string // 文件标识
    hashData: string // 文件哈希
    hashType: string // 文件哈希
    dateLast: Date   // 修改时间
    dateInit: Date   // 创建时间
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

export interface FileTask {
    taskType: Action
    taskFlag: Status
    messages: string
}

export interface FileLink {
    direct: string
    header: Record<string, any>
}