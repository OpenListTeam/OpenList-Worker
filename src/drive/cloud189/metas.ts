
type CONFIG_INFO = {
    username: string;
    password: string;
};

type APP_SESSION = {
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
};

type LOGIN_RESULT = {
    toUrl: string;
    msg?: string;
    result: number;
};
