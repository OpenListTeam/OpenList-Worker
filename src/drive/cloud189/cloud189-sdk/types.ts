//  auth api返回
export type ICloud189AuthApiResult< Extend = {data:any}> = {
    /**
     * 返回状态 0 为正常
     */
    result: number
    msg: string
} & Extend

// api 返回
export type ICloud189ApiResult<Extend = {data:any}> = {
    /**
     * 返回状态 0 为正常
     */
    res_code: number | string
    res_message: string
} & Extend

export type ICloud189ApiResult2<Extend = {}> = {
    errorCode: string
    errorMsg: string
    success: boolean
} & Extend


export type IFileListResult<File, Folder = File, Extend = {}> = {
    fileListAO: {
        /** 文件数量 */
        count: number
        fileListSize: number
        fileList?: File[]
        folderList?: Folder[]
    }
    // 版本号
    lastRev: ITime2
} & Extend

export type IFileListQueryParam<Extend = {}> = {
    fileId: string
    pageNum: number
    pageSize: number
    isFolder: boolean
    /** small|medium|large|max60 */
    iconOption?: 1 | 2 | 4 | 8
    orderBy?: 'lastOpTime' | 'filename' | 'filesize' | 'createDate'
    descending?: boolean
    mediaAttr?: IBoolean
    /** 文件媒体类型选项, 0：不限 1：只限图片 2：只限音乐 3：只限视频 4：只限文档 */
    mediaType?: 0 | 1 | 2 | 3 | 4
    /** 文件类型选项, 0：不限 1：只限文件 2：只限文件夹 */
    fileType?: 0 | 1 | 2
} & Extend

export interface ILoginOptionCommon {
    signal?: AbortSignal
    /**
     * 0 => 默认
     * 1 => 7天内自动登录
     * 2 => 15天内自动登录
     * 3 => 30天内自动登录
     */
    cb_SaveName: '0' | '1' | '2' | '3' | string
    /**
     * 验证码
     */
    validateCode: string
}

export interface ILoginParam {
    captchaToken: string;
    lt: string;
    paramID: string;
    reqID: string;
}

export interface IEncryptConf {
    upSmsOn: string,
    pre: string,
    preDomain: string,
    pubKey: string
}

export interface IAppToken {
    accessToken: string,
    refreshToken: string,

    /** 过期时间(时间戳) */
    expiry: number
}

export interface IAppSession {
    sessionKey: string,
    sessionSecret: string
    familySessionKey: string,
    familySessionSecret: string,
}

export enum SignType {
    V1,
    /** 个人云签名 */
    V2P,
    /** 家庭云签名 */
    V2F
}

/**
 * 2006-01-02 15:04:05 
 */
export type ITime = string

/**
 * 20060102150405
 */
export type ITime2 = number | string
/**
 * 时间戳ms
 */
export type ITimestampMS = number

/**
 * 
 */
export type IBoolean = number

export type DeepStringify<T> = {
    [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string | T[K];
}; 