export interface DBSelect {
    main: string;   // 所属表
    keys?: Record<string, string>; // 数据主键
    data?: Record<string, any> | any;
    find?: boolean; // 是否模糊匹配
}

export interface DBResult {
    flag: boolean;
    text: string;
    data?: DBSelect[] | any[] | any;
}

export interface D1Filter {
    [key: string]: {      // 索引签名，允许额外未知 key
        value: unknown;
        op?: string;
    };
}