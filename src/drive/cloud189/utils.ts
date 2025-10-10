// 公用导入 =====================================================
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
// 专用导入 =====================================================
import crypto from "crypto";
import {HttpRequest} from "../../types/HttpRequest";


// 驱动器 ###########################################################
export class HostClouds extends BasicClouds {
    // 专有数据 =====================================================
    private loginParam: Record<string, any> = {};
    private tokenParam: Record<string, any> = {};
    private verifyCode: string | null | any = '';

    // 构造函数 =====================================================
    constructor(c: Context, router: string,
                public in_config: Record<string, any>,
                public in_saving: Record<string, any>) {
        super(c, router, in_config, in_saving);
    }

    // RSA加密 ======================================================
    async rsaEncrypt(publicKey: string, data: string): Promise<string> {
        const buffer = Buffer.from(data, "utf8");
        const crypts = crypto.publicEncrypt(publicKey, buffer);
        return crypts.toString("base64");
    }

    // 获取登录参数 =================================================
    async initParams(): Promise<DriveResult> {
        // 清除登录数据 ========================================================
        this.saving = {};
        // 获取登录参数 ========================================================
        const res = await HttpRequest(
            "GET",
            `${con.WEB_URL}/api/portal/unifyLoginForPC.action`, {
                appId: con.APP_ID,
                clientType: con.CLIENT_TYPE,
                returnURL: con.RETURN_URL,
                timeStamp: Date.now().toString(),
            }, undefined, {finder: "text"});
        // console.log(res)
        if (!res) {
            // console.log(res)
            return {flag: false, text: "Failed to fetch login parameters"}
        }
        // 提取登录参数 ========================================================
        const captchaToken = res.match(/'captchaToken' value='(.+?)'/)?.[1];
        const lt = res.match(/lt = "(.+?)"/)?.[1];
        const paramId = res.match(/paramId = "(.+?)"/)?.[1];
        const reqId = res.match(/reqId = "(.+?)"/)?.[1];
        if (!captchaToken || !lt || !paramId || !reqId) {
            return {flag: false, text: "Failed to extract login parameters"}
        }
        // 获取RSA公钥 =========================================================
        const encryptConf = await HttpRequest("POST",
            `${con.AUTH_URL}/api/logbox/config/encryptConf.do`, {appId: con.APP_ID},
            {"Content-Type": "application/json"}, {finder: "json"}
        );
        if (!encryptConf?.data?.pubKey || !encryptConf?.data?.pre) {
            return {flag: false, text: "Failed to fetch RSA public key"}
        }
        const jRsaKey = `-----BEGIN PUBLIC KEY-----\n${encryptConf.data.pubKey}\n-----END PUBLIC KEY-----`;
        const rsaUsername = encryptConf.data.pre + await this.rsaEncrypt(jRsaKey, this.config.username);
        const rsaPassword = encryptConf.data.pre + await this.rsaEncrypt(jRsaKey, this.config.password);
        // 保存登录参数 =========================================================
        this.loginParam = {
            CaptchaToken: captchaToken,
            Lt: lt, ParamId: paramId,
            ReqId: reqId, jRsaKey,
            rsaUsername, rsaPassword,
        };
        // 检查是否需要验证码 ===================================================
        const needCaptcha = await HttpRequest("POST",
            `${con.AUTH_URL}/api/logbox/oauth2/needcaptcha.do`, {
                appKey: con.APP_ID,
                accountType: con.ACCOUNT_TYPE,
                userName: rsaUsername,
            }, {REQID: reqId}, "text"
        );
        // console.log("needCaptcha", await needCaptcha.text())
        if (needCaptcha === "0") return {flag: true, text: "No Captcha"}
        // 获取验证码图片 =======================================================
        const imgRes = await HttpRequest("GET",
            `${con.AUTH_URL}/api/logbox/oauth2/picCaptcha.do`, {
                token: captchaToken, REQID: reqId,
                rnd: Date.now().toString(),
            }, undefined, "blob"
        );
        // console.log(imgRes)
        if (imgRes?.size > 20)
            return {flag: false, text: `Need verification code: ${imgRes}`}
        return {flag: true, text: "OK"};
    }

    // 初始化配置项 =================================================
    async initConfig(): Promise<DriveResult> {
        // 初始化登录所需参数 =======================================
        const result: DriveResult = await this.initParams()
        if (!result.flag) {
            // console.log(result)
            return {flag: false, text: result.text};
        }
        try {
            // 发送登录请求 =========================================
            this.saving.login = {
                "appKey": con.APP_ID,
                "accountType": con.ACCOUNT_TYPE,
                "userName": this.config.username,
                "password": this.config.password,
                "validateCode": this.verifyCode,
                "captchaToken": this.loginParam.CaptchaToken,
                "returnUrl": con.RETURN_URL,
                "dynamicCheck": "FALSE",
                "clientType": con.CLIENT_TYPE,
                "cb_SaveName": "1",
                "isOauth2": "false",
                "state": "",
                "paramId": this.loginParam.ParamId,
                "reqId": this.loginParam.ReqId,
                "lt": this.loginParam.Lt
            }
            const login_resp: LOGIN_RESULT = await HttpRequest(
                "POST", `${con.AUTH_URL}/api/logbox/oauth2/loginSubmit.do`,
                this.saving.login, {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": con.WEB_URL,
                    "REQID": this.loginParam.ReqId,
                    "lt": this.loginParam.Lt
                }, {finder: "json"}
            );
            // 检查登录结果 ==========================================
            if (!login_resp.toUrl) {
                console.log(`登录账号失败: ${login_resp.msg}`)
                return {flag: false, text: `登录账号失败: ${login_resp.msg}`}
            }
            // 获取Token信息 =========================================
            const tokenInfo: APP_SESSION = await HttpRequest("POST",
                `${con.API_URL}/getSessionForPC.action`,
                undefined, undefined, {
                    finder: "xml",
                    search: {
                        "redirectURL": login_resp.toUrl,
                        "clientType": "TELEPC",
                        "version": con.VERSION,
                        "channelId": con.CHANNEL_ID,
                        "rand": `${Math.floor(Math.random() * 1e5)}_${Math.floor(Math.random() * 1e10)}`,
                    }
                }
            );
            // console.log("tokenInfo:", tokenInfo)
            // 检查错误 ==============================================
            if (!tokenInfo || !tokenInfo.accessToken) {
                // console.log(`获取认证失败: ${tokenInfo}`)
                return {
                    flag: false,
                    text: `获取认证失败: ${tokenInfo}`
                }
            }
            this.tokenParam = tokenInfo;
            this.saving.token = tokenInfo;
            this.change = true;
            return {
                flag: true,
                text: "OK"
            }
            // 异常处理 ==============================================
        } catch (e) {
            console.log((e as Error).message)
            return {
                flag: false,
                text: `系统内部错误: ${(e as Error).message}`
            }
        } finally {
            this.verifyCode = ""; // 销毁短信验证码
            this.loginParam = {}; // 销毁登录参数
        }
    }

    // 载入接口 ================================================
    async readConfig(): Promise<DriveResult> {
        if (!this.saving.token) return await this.initConfig()
        this.loginParam = this.saving.login;
        this.tokenParam = this.saving.token;
        return {
            flag: true,
            text: "OK"
        }
    }

    signatureV2(method: string, path: URL | string, params: string, appSession?: {sessionKey: string, sessionSecret: string}): Record<string, string> {
        // 对于URL对象，使用完整路径包含查询参数
        const requestURI: string = path instanceof URL ? (path.pathname + path.search) : path.toString()
        const { sessionKey, sessionSecret } = appSession || this.tokenParam
        const dateOfGmt: string = new Date().toUTCString()
        const requestID: string = crypto.randomUUID()
        
        // 当使用直接URL编码时，不需要额外的params参数
        let signData: string = `SessionKey=${sessionKey}&Operate=${method}&RequestURI=${requestURI}&Date=${dateOfGmt}`
        if (params) {
            signData += `&params=${params}`
        }
        
        // 详细调试日志
        console.log("=== Cloud189 Signature Debug ===")
        console.log("method:", method)
        console.log("path (original):", path)
        console.log("requestURI:", requestURI)
        console.log("sessionKey:", sessionKey)
        console.log("sessionSecret:", sessionSecret)
        console.log("sessionSecret (truncated for HMAC):", sessionSecret.slice(0, 16))
        console.log("dateOfGmt:", dateOfGmt)
        console.log("params:", params)
        console.log("signData:", signData)
        
        // 使用截断的sessionSecret进行HMAC签名（与Go实现保持一致）
        const signature = crypto.createHmac("sha1", sessionSecret.slice(0, 16)).update(signData).digest("hex");
        console.log("signature:", signature)
        console.log("=== End Debug ===")

        return {
            "Date": dateOfGmt,
            "SessionKey": sessionKey,
            "X-Request-ID": requestID,
            "Signature": signature
        }
    }

    aseEncrypt(key: string, origData: string | Uint8Array): string {
        console.log("=== AES Encrypt Debug ===")
        console.log("key:", key)
        console.log("key length:", key.length)
        console.log("origData:", origData)
        
        const ciph = crypto.createCipheriv("aes-128-ecb", key, Buffer.alloc(0)).setAutoPadding(true)
        const encrypted = ciph.update(Buffer.from(origData)).toString('hex') + ciph.final('hex')
        const result = encrypted.toUpperCase()
        
        console.log("encrypted (before uppercase):", encrypted)
        console.log("encrypted (final):", result)
        console.log("=== End AES Debug ===")
        
        return result
    }
}


