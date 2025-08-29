import {Requests} from "../../shared/WebRequest";

class Cloud189PC {
    private loginParam: LoginParam | null = null;
    private VCode: string = '';
    private tokenInfo: AppSessionResp | null = null;
    private NoUseOcr: boolean = false;

    async login(): Promise<Error | null> {
        // 初始化登录所需参数
        if (!this.loginParam) {
            const initError = await this.initLoginParam();
            if (initError) {
                return initError;
            }
        }

        let err: Error | null = null;

        try {
            const param = this.loginParam!;

            // 发送登录请求
            const loginresp: LoginResp = await Requests(
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

            if (!loginresp.ToUrl) {
                return new Error(`login failed, No toUrl obtained, msg: ${loginresp.Msg}`);
            }

            // 获取Session
            const suffixParams = this.clientSuffix();
            suffixParams["redirectURL"] = loginresp.ToUrl;

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

            // 遇到错误，重新加载登录参数(刷新验证码)
            if (err && this.NoUseOcr) {
                try {
                    const err1 = await this.initLoginParam();
                    if (err1) {
                        err = new Error(`err1: ${err.message} \nerr2: ${err1.message}`);
                    }
                } catch (e) {
                    // 忽略初始化错误
                }
            }
        }

        return err;
    }

    private async initLoginParam(): Promise<Error | null> {
        // 实现初始化登录参数的逻辑
        // 这里需要根据实际情况实现
        return null;
    }

    private clientSuffix(): Record<string, string> {
        // 实现clientSuffix逻辑
        // 这里需要根据实际情况实现
        return {};
    }
}