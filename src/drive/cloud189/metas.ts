interface CONFIG_INFO {
    username: string;
    password: string;
    cookie?: string; // 添加cookie字段
}

interface APP_SESSION {
    loginName?: string;
    sessionKey?: string;
    sessionSecret?: string;
    keepAlive?: number;
    getFileDiffSpan?: number;
    getUserInfoSpan?: number;
    familySessionKey?: string;
    familySessionSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    isSaveName?: boolean;
    cookies?: string;
    userId?: string;
}

interface LOGIN_RESULT {
    toUrl: string;
    msg?: string;
    result: number;
}

interface FILE_INFO {
    id: string;
    name: string;
    size: number;
    isFolder: boolean;
    createTime: string;
    lastOpTime: string;
    parentId: string;
    path?: string;
    downloadUrl?: string;
}

interface FOLDER_INFO {
    fileListAO: {
        count: number;
        fileList: FILE_INFO[];
    };
}

interface UPLOAD_RESULT {
    uploadFileId: string;
    fileName: string;
    fileSize: number;
}

