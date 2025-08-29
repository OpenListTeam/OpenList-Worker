// 定义参数接口
interface FileListParams {
    // pageSize: number | undefined;
    // pageNum: number | undefined;
    mediaType: string | undefined;
    folderId: number | undefined;
    iconOption: string | undefined;
    orderBy: string | undefined;
    descending: string | undefined;
}


interface LoginParam {
    ReqId: string;
    Lt: string;
    RsaUsername: string;
    RsaPassword: string;
    CaptchaToken: string;
    ParamId: string;
}

interface LoginResp {
    Msg: string;
    Result: number;
    ToUrl: string;
}

interface UserSessionResp {
    // 根据实际情况添加属性
}

interface AppSessionResp extends UserSessionResp {
    IsSaveName: string;
    AccessToken: string;
    RefreshToken: string;
    ResCode?: number;
    ResMessage?: string;
}

interface RespErr {
    HasError(): boolean;
}

interface Request {
    ForceContentType(contentType: string): Request;
    SetResult<T>(result: T): Request;
    SetHeaders(headers: Record<string, string>): Request;
    SetFormData(formData: Record<string, string>): Request;
    SetError<T>(error: T): Request;
    SetQueryParams(params: Record<string, string>): Request;
    SetQueryParam(key: string, value: string): Request;
    Post(url: string): Promise<any>;
}

interface Client {
    R(): Request;
}