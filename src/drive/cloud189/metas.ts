
type CONFIG_INFO = {
    username: string;
    password: string;
};

type APP_SESSION = {
    SessionKey: string;
    SessionSecret: string;
    FamilySessionKey?: string;
    FamilySessionSecret?: string;
    AccessToken: string;
    ResCode: number;
    ResMessage?: string;
};

type LOGIN_RESULT = {
    ToUrl: string;
    Msg?: string;
};

// interface Request {
//     ForceContentType(contentType: string): Request;
//     SetResult<T>(result: T): Request;
//     SetHeaders(headers: Record<string, string>): Request;
//     SetFormData(formData: Record<string, string>): Request;
//     SetError<T>(error: T): Request;
//     SetQueryParams(params: Record<string, string>): Request;
//     SetQueryParam(key: string, value: string): Request;
//     Post(url: string): Promise<any>;
// }
//
// interface Client {
//     R(): Request;
// }