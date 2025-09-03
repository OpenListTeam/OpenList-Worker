import {Requests} from "../../shared/Requests";

class HostClouds {
    public configData: Record<string, any> | undefined
    public serverData: Record<string, any> | undefined

    private loginParam: LoginParam | null = null;
    private VCode: string = '';
    private tokenInfo: AppSessionResp | null = null;
    private NoUseOcr: boolean = false;

    async login(): Promise<Error | null> {
        // 初始化登录所需参数
        let err: Error | null = null;

        try {
            const param = this.loginParam!;
            // 发送登录请求
            const login_resp: LoginResp = await Requests(
                `${AUTH_URL}/api/logbox/oauth2/loginSubmit.do`,
                {
                    "appKey": APP_ID,
                    "accountType": ACCOUNT_TYPE,
                    "userName": param.RsaUsername,
                    "password": param.RsaPassword,
                    "validateCode": this.VCode,
                    "captchaToken": param.CaptchaToken,
                    "returnUrl": RETURN_URL,
                    "dynamicCheck": "FALSE",
                    "clientType": CLIENT_TYPE,
                    "cb_SaveName": "1",
                    "isOauth2": "false",
                    "state": "",
                    "paramId": param.ParamId
                },
                "POST",
                false,
                {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "REQID": param.ReqId,
                    "lt": param.Lt
                },
                "json"
            );

            if (!login_resp.ToUrl) {
                return new Error(`login failed, No toUrl obtained, msg: ${login_resp.Msg}`);
            }

            suffixParams["redirectURL"] = login_resp.ToUrl;

            const tokenInfo: AppSessionResp = await Requests(
                `${API_URL}/getSessionForPC.action`,
                suffixParams,
                "POST",
                false,
                undefined,
                "json"
            );

            // 检查错误
            if (tokenInfo.ResCode !== 0) {
                return new Error(tokenInfo.ResMessage || "Unknown error");
            }

            this.tokenInfo = tokenInfo;
        } catch (e) {
            err = e as Error;
        } finally {
            // 销毁验证码
            this.VCode = "";
            // 销毁登录参数
            this.loginParam = null;

        }
        return err;
    }



    private clientSuffix(): Record<string, string> {
        // 实现clientSuffix逻辑
        // 这里需要根据实际情况实现
        return {};
    }
}