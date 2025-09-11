export interface DBSelect {
    main: string;   // 所属表
    keys?: Record<string, string>[]; // 数据主键
    data?: Record<string, any> | any;
    find?: boolean; // 是否模糊匹配
}

export interface DBResult {
    flag: boolean;
    text: string;
    data?: any[] | DBSelect[] | any;
}
