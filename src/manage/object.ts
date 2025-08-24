export class PathInfo {
    constructor(
        public pageSize: number, // 文件数量
        public pageNums: number, // 页面编号
        public filePath: string, // 文件路径
        public fileList: FileInfo[],
    ) {}
}

export class FileInfo {
    constructor(
        // 必要属性 ========================
        public filePath: string, // 文件路径
        public fileName: string, // 文件名称
        public fileSize: number, // 文件大小
        public fileType: number, // 文件类型
        // 可选属性 ========================
        public uuidData: string, // 文件标识
        public hashData: string, // 文件哈希
        public hashType: string, // 文件哈希
        public dateLast: Date,   // 修改时间
        public dateInit: Date,   // 创建时间
    ) {}
}