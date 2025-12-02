//====== 公用导入 ======
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";

//====== 专用导入 ======
import crypto from "crypto";
import {HttpRequest} from "../../types/HttpRequest";
import NodeRSA from "node-rsa";
import {CookieJar} from "tough-cookie";
import {wrapper} from "axios-cookiejar-support";
import axios, {AxiosInstance} from "axios";
import * as url from "url";
import loginFn from "./cloudLoginUtils";

/** ==========================================================================
 *                      天翼云盘认证和配置管理类
 * ===========================================================================
 * 继承自BasicClouds，负责处理天翼云盘的登录、会话管理、签名生成等核心功能
 * ==========================================================================*/
export class HostClouds extends BasicClouds {
    //====== 专有数据 ======
    public loginParam: Record<string, any> = {};
    public tokenParam: Record<string, any> = {};
    public verifyCode: string | null | any = '';
    public cookie: string | null = null; // 添加cookie属性

    // 移动端登录相关配置 ========================================================
    private readonly mobileConfig: Record<string, any> = {
        clientId: "538135150693412",
        model: "KB2000",
        version: "9.0.6",
    };

    // 移动端请求头 ==============================================================
    private readonly mobileHeaders: Record<string, any> = {
        "User-Agent": `Mozilla/5.0 (Linux; U; Android 11; ` +
            `${this.mobileConfig.model} Build/RP1A.201005.001) ` +
            `AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 ` +
            `Chrome/74.0.3729.136 Mobile Safari/537.36 ` +
            `Ecloud/${this.mobileConfig.version} ` +
            `Android/30 clientId/${this.mobileConfig.clientId} ` +
            `clientModel/${this.mobileConfig.model} ` +
            `clientChannelId/qq proVersion/1.0.6`,
        Referer: "https://m.cloud.189.cn/zhuanti/2016/sign/`+" +
            "`index.jsp?albumBackupOpened=1",
        "Accept-Encoding": "gzip, deflate",
        Host: "cloud.189.cn",
    };

    /** ==========================================================================
     *                              构造函数
     ========================================================================== */
    constructor(c: Context, router: string,
                public in_config: Record<string, any>,
                public in_saving: Record<string, any>) {
        super(c, router, in_config, in_saving);
    }

    /** ==========================================================================
     *                            初始化配置项
     ========================================================================== */
    async initConfig(): Promise<DriveResult> {
        // Cookie登录方式 ########################################################
        console.log("initConfig username:", this.config.username);
        console.log("initConfig password:", this.config.password);
        console.log("initConfig authtype:", this.config.authtype);
        if (this.config.authtype === 'cookie') {
            try {// 获取cookie ===================================================
                if (this.config.username && this.config.password) {
                    if (!this.config.cookie || this.config.cookie == "") {
                        console.log("使用用户名密码获取cookie...");
                        // this.cookie = await this.loginWithCookie();
                        this.cookie = await loginFn(this.config.username,
                            this.config.password);
                    }
                }
                // 覆盖当前用户设置的cookie ======================================
                this.saving.cookie = this.cookie;
                console.log("cookie获取成功");
                // 检查cookie是否有效 ============================================
                // const isValid = await this.checkLogin();
                // if (isValid) return {flag: true, text: "OK"};
                // else return {flag: false, text: "获取的cookie无效"};
                return {flag: true, text: "OK"};
            } catch (e) {
                console.error("通过用户名密码获取cookie失败:", e);
                return {flag: false, text: `登录失败: ${(e as Error).message}`};
            }
        } else {
            // 初始化登录所需参数 ===============================================
            const result: DriveResult = await this.initParams()
            if (!result.flag) return {flag: false, text: result.text};
            return await this.loginWithSession()
        }
    }

    /** ==========================================================================
     *                             读取配置项
     ========================================================================== */
    async readConfig(): Promise<DriveResult> {
        this.tokenParam = this.saving?.token || {};
        this.loginParam = this.saving?.login || {};
        // 如果配置中提供了cookie，则使用cookie登录
        if (this.saving.cookie)
            this.config.cookie = this.saving.cookie;
        if (this.config.cookie) {
            this.cookie = this.config.cookie;
            // if (!(await this.checkLogin()))
            //     return await this.initConfig();
        }
        // 使用session认证 =========================
        else {
            if (!this.saving.token)
                return await this.initConfig()
            if (!(await this.checkLogin()))
                return await this.initConfig();
            this.loginParam = this.saving.login;
            this.tokenParam = this.saving.token;
        }

        return {flag: true, text: "OK"}
    }

    /** ==========================================================================
     *                            检测登录状态
     ========================================================================== */
    async checkLogin(): Promise<boolean> {
        try {
            const url = `${con.API_URL}/getUserInfo.action`;
            const signHeaders: Record<string, string> = this.signatureHeader(url, "GET", "");
            const response = await HttpRequest("GET", url, undefined, {
                ...signHeaders,
                "Content-Type": "application/json"
            }, {
                finder: "text",
                search: this.clientSuffix()
            });
            return response && !response.errorCode;
        } catch (e) {
            console.error("检测登录状态失败:", e);
            return false;
        }
    }

    /** ==========================================================================
     *                            签名计算函数
     *  ==========================================================================
     * @param method 请求方法(GET/POST)
     * @param requestURI 请求URI
     * @param date 请求时间(GMT格式)
     * @param sessionKey 会话密钥
     * @param requestId 请求ID
     * @param encryptedParams 加密后的参数
     * @param sessionSecret 会话密钥
     ========================================================================== */
    signatureV2(
        method: string, // 新增method参数
        requestURI: string,
        date: string,
        sessionKey: string,
        requestId: string,
        encryptedParams: string,
        sessionSecret: string
    ): string {
        // 日志调试 =============================================================
        console.log(`=== Signature Calculation Debug ===`);
        console.log(`Method: ${method}`); // 新增日志
        console.log(`RequestURI: ${requestURI}`);
        console.log(`Date: ${date}`);
        console.log(`SessionKey: ${sessionKey}`);
        console.log(`RequestId: ${requestId}`);
        console.log(`EncryptedParams: ${encryptedParams}`);
        // 构建签名字符串（包含method）
        const signStr: string = `${method}\n${requestURI}\n${date}` +
            `\n${sessionKey}\n${requestId}\n${encryptedParams}`;
        console.log(`Sign String: ${signStr}`);
        // 计算HMAC-SHA256签名 =================================================
        const signature: string = crypto.createHmac(
            'sha1', sessionSecret)
            .update(signStr).digest('hex');
        console.log(`Computed Signature: ${signature}`);
        console.log(`=== End Signature Calculation Debug ===`);
        return signature.toUpperCase();
    }

    /** ==========================================================================
     *                        RSA加密用户名和密码
     ========================================================================== */
    rsaEncrypt(publicKey: string, data: string): string {
        const buffer: Buffer<any> = Buffer.from(data, "utf8");
        const crypts: Buffer<any> = crypto.publicEncrypt(publicKey, buffer);
        return crypts.toString("base64");
    }

    /** ==========================================================================
     *                           AES ECB模式加密参数
     ========================================================================== */
    aesEncrypt(key: string, origData: string | Uint8Array): string {
        // console.log("=== AES Encrypt Debug ===")
        // console.log("key:", key)
        // console.log("key length:", key.length)
        // console.log("origData:", origData)

        // 实现PKCS7填充，与Go版本保持一致
        const data = Buffer.from(origData);
        const blockSize = 16; // AES块大小为16字节
        const padding = blockSize - (data.length % blockSize);
        const paddingData = Buffer.concat([data, Buffer.alloc(padding, padding)]);

        // 创建加密器
        const cipher = crypto.createCipheriv("aes-128-ecb", key, Buffer.alloc(0));
        cipher.setAutoPadding(false); // 禁用自动填充，使用手动PKCS7填充

        // 加密数据
        const encrypted = cipher.update(paddingData);
        const final = cipher.final();
        const results = Buffer.concat([encrypted, final]).toString('hex').toUpperCase();

        // console.log("encrypted (final):", results)
        // console.log("=== End AES Debug ===")
        return results
    }


    /** ==========================================================================
     *                    获取与Go版本一致的GMT时间格式
     ========================================================================== */
    private getHttpDateStr(): string {
        // 模拟Go版本的http.TimeFormat: "Mon, 02 Jan 2006 15:04:05 GMT"
        // 但注意：Go版本实际返回的是GMT，而JavaScript的toUTCString()返回的是GMT但格式略有不同
        const date = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const dayName = days[date.getUTCDay()];
        const day = date.getUTCDate().toString().padStart(2, '0');
        const monthName = months[date.getUTCMonth()];
        const year = date.getUTCFullYear();
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');

        return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds} GMT`;
    }

    /** ==========================================================================
     *                             生成请求签名头
     ========================================================================== */
    signatureHeader(
        url: string, method: string, params: string, isFamily: boolean = false): Record<string, string> {

        // 使用与Go版本完全一致的时间格式
        const dateOfGmt = this.getHttpDateStr();
        let sessionKey = this.tokenParam.sessionKey;
        let sessionSecret = this.tokenParam.sessionSecret;

        // 处理family云的情况
        if (isFamily) {
            sessionKey = this.tokenParam.familySessionKey;
            sessionSecret = this.tokenParam.familySessionSecret;
        }

        const requestID = crypto.randomUUID();

        // 检查必要的参数是否存在
        if (!sessionKey || !sessionSecret) {
            console.error("Session key or secret is missing:", {sessionKey, sessionSecret, isFamily});
            console.log("this.saving", this.saving)
            console.log("this.tokenParam", this.tokenParam)
            throw new Error("Session认证信息不完整");
        }

        // 使用与Go版本相同的正则表达式提取URL路径
        const urlMatch = url.match(/:\/\/[^\/]+((\/[^\/\s?#]+)*)/);
        let requestURI = "";
        if (urlMatch && urlMatch[1]) {
            requestURI = urlMatch[1];
        } else {
            // fallback到URL pathname
            try {
                requestURI = new URL(url).pathname;
            } catch (e) {
                requestURI = url;
            }
        }

        // 构建签名数据 - 与Go版本保持完全一致
        let signData = `SessionKey=${sessionKey}&Operate=${method}&RequestURI=${requestURI}&Date=${dateOfGmt}`;
        if (params) {
            signData += `&params=${params}`;
        }

        // console.log("=== Signature Debug ===");
        // console.log("Method:", method);
        // console.log("URL:", url);
        // console.log("RequestURI:", requestURI);
        // console.log("Date:", dateOfGmt);
        // console.log("SessionKey:", sessionKey);
        // console.log("SessionSecret:", sessionSecret);
        // console.log("Params:", params);
        // console.log("SignData:", signData);
        // console.log("IsFamily:", isFamily);

        // 使用HMAC-SHA1签名，使用完整的sessionSecret（与Go版本保持一致）
        const signature = crypto.createHmac("sha1", Buffer.from(sessionSecret, 'ascii'))
            .update(signData)
            .digest("hex")
            .toUpperCase();

        // console.log("Signature:", signature);
        // console.log("=== End Signature Debug ===");

        return {
            "Date": dateOfGmt,
            "SessionKey": sessionKey,
            "X-Request-ID": requestID,
            "Signature": signature
        };
    }


    /** ==========================================================================
     *                              加密请求参数
     ========================================================================== */
    encryptParams(params: Record<string, string>): string {
        const sessionSecret = this.tokenParam.sessionSecret || "";
        if (!params || Object.keys(params).length === 0) return "";

        console.log("=== EncryptParams Debug ===");
        console.log("Input params:", params);

        // 按key排序并拼接，与Go版本保持一致
        const keys = Object.keys(params).sort();
        const paramStr = keys.map(k => `${k}=${params[k]}`).join("&");

        console.log("Param string:", paramStr);
        console.log("SessionSecret (first 16):", sessionSecret.slice(0, 16));

        // AES加密
        const encrypted = this.aesEncrypt(sessionSecret.slice(0, 16), paramStr);

        console.log("Encrypted result:", encrypted);
        console.log("=== End EncryptParams Debug ===");

        return encrypted;
    }

    /** ==========================================================================
     *                              获取客户端标识参数
     ========================================================================== */
    clientSuffix(): Record<string, string> {
        return {
            clientType: "TELEPC",
            version: con.VERSION,
            channelId: con.CHANNEL_ID,
            rand: `${Math.floor(Math.random() * 1e5)}_${Math.floor(Math.random() * 1e10)}`
        };
    }

    /** ==========================================================================
     *                              刷新会话密钥
     ========================================================================== */
    async refreshSession(): Promise<DriveResult> {
        try {
            const url = `${con.API_URL}/getSessionForPC.action`;

            // 使用签名认证，而不是直接HttpRequest
            const params = {
                ...this.clientSuffix(),
                appId: con.APP_ID,
                accessToken: this.tokenParam.accessToken
            };

            // 构建签名头
            const signHeaders = this.signatureHeader(url, "GET", "");
            const headers = {
                ...signHeaders,
                "Content-Type": "application/json"
            };

            const response = await HttpRequest("GET", url, undefined, headers, {
                finder: "json",
                search: params
            });

            if (response.sessionKey) {
                this.tokenParam.sessionKey = response.sessionKey;
                this.tokenParam.sessionSecret = response.sessionSecret;
                this.tokenParam.familySessionKey = response.familySessionKey;
                this.tokenParam.familySessionSecret = response.familySessionSecret;
                this.saving.token = this.tokenParam;
                this.change = true;
                return {flag: true, text: "OK"};
            }
            return {flag: false, text: "刷新会话失败"};
        } catch (e) {
            console.error("刷新会话失败:", e);
            return {flag: false, text: "刷新会话失败"};
        }
    }

    /** ==========================================================================
     *                            设置Cookie字符串
     ========================================================================== */
    // private setCookies(cookies: any[]): string {
    //     return cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; ')
    // }

    /** ==========================================================================
     *                    使用用户名密码进行移动端登录获取Cookie
     ========================================================================== */
    // async loginWithCookie(): Promise<string> {
    //     try {
    //         let cookieJar: CookieJar = new CookieJar();
    //         const _axios: AxiosInstance = wrapper(axios.create({jar: cookieJar, withCredentials: true}));
    //         // 1. 获取公钥
    //         const encryptRes: any = await _axios
    //             .post("https://open.e.189.cn/api/logbox/config/encryptConf.do")
    //             .then((res) => res.data);
    //         const encrypt = encryptRes.data;
    //         // 2. 获取登录参数
    //         const responseUrl = await _axios
    //             .get("https://cloud.189.cn/api/portal/loginUrl.action" +
    //                 "?redirectURL=https://cloud.189.cn/web/redirect.html?returnURL=/main.action")
    //             .then((res) => res.request.res.responseUrl);
    //         console.log("获取到的重定向URL:", responseUrl);
    //         if (!responseUrl) throw new Error("无法获取重定向URL");
    //         const {query} = url.parse(responseUrl, true);
    //         const queryParam = query as any;
    //         // 确保必要的参数存在
    //         queryParam.appId = queryParam.appId || "cloud";
    //         queryParam.lt = queryParam.lt || "";
    //         queryParam.reqId = queryParam.reqId || "";
    //         queryParam.REQID = queryParam.reqId;
    //         console.log("解析的查询参数:", queryParam);
    //         // 3. 获取应用配置
    //         const formData = new URLSearchParams();
    //         formData.append("version", "2.0");
    //         formData.append("appKey", queryParam.appId);
    //
    //         const appConfRes = await _axios
    //             .post("https://open.e.189.cn/api/logbox/oauth2/appConf.do", formData, {
    //                 headers: {
    //                     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
    //                     Referer: "https://open.e.189.cn/",
    //                     lt: query.lt,
    //                     REQID: query.reqId,
    //                 },
    //             })
    //             .then((res) => res.data.data);
    //         console.log("应用配置响应:", appConfRes);
    //         const appConf = appConfRes;
    //         if (!appConf) {
    //             throw new Error("获取应用配置失败: appConf为空");
    //         }
    //         console.log("应用配置获取成功:", appConf);
    //         // 4. 构建登录表单
    //         const keyData = `-----BEGIN PUBLIC KEY-----\n${encrypt.pubKey}\n-----END PUBLIC KEY-----`;
    //         const RsaJsencrypt = new NodeRSA(keyData, "public", {
    //             encryptionScheme: "pkcs1",
    //         });
    //         const usernameEncrypt = Buffer.from(RsaJsencrypt.encrypt(this.config.username).toString("base64"), "base64").toString("hex");
    //         const passwordEncrypt = Buffer.from(RsaJsencrypt.encrypt(this.config.password).toString("base64"), "base64").toString("hex");
    //         const loginData = {
    //             appKey: "cloud", version: "2.0", accountType: "01", mailSuffix: "@189.cn",
    //             validateCode: "", captchaToken: "", dynamicCheck: "FALSE", clientType: "1",
    //             cb_SaveName: "3", isOauth2: "false", returnUrl: appConf.returnUrl, paramId: appConf.paramId,
    //             userName: `${encrypt.pre}${usernameEncrypt}`, password: `${encrypt.pre}${passwordEncrypt}`,
    //         };
    //         // 5. 执行登录
    //         return new Promise(async (resolve, reject) => {
    //             // 3.获取登录地址
    //             const res: any = await _axios
    //                 .post(
    //                     "https://open.e.189.cn/api/logbox/oauth2/loginSubmit.do",
    //                     loginData, // 表单数据
    //                     {
    //                         headers: {
    //                             "User-Agent":
    //                                 "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
    //                             Referer: "https://open.e.189.cn/",
    //                             REQID: queryParam.reqId,
    //                             lt: queryParam.lt,
    //                             "Content-Type": "application/x-www-form-urlencoded",
    //                         },
    //                     }
    //                 )
    //                 .then((response) => response.data)
    //
    //             if (res.result === 0) {
    //                 return _axios
    //                     .get(res.toUrl, {
    //                         headers: this.mobileHeaders,
    //                         jar: cookieJar, // 使用 tough-cookie 的 CookieJar
    //                     })
    //                     .then((r) => {
    //                         const cookies: any[] = JSON.parse(JSON.stringify(cookieJar)).cookies.filter(
    //                             (item: any) => {
    //                                 return item.domain.includes("cloud")
    //                             }
    //                         )
    //                         cookieJar = new CookieJar()
    //                         const cookieStr = this.setCookies(cookies)
    //                         console.log("从登录响应提取到的Cookie:", cookieStr)
    //                         return resolve(cookieStr)
    //                     })
    //                     .catch((error) => {
    //                         console.error("跳转请求失败:", error)
    //                         return reject(error)
    //                     })
    //             } else {
    //                 console.log("登录失败1", res)
    //                 return reject(res)
    //             }
    //         })
    //     } catch (error) {
    //         console.error("移动端登录失败:", error);
    //         throw error;
    //     }
    // }

    /** ==========================================================================
     *                    使用会话密钥进行登录获取Token
     ========================================================================== */
    async loginWithSession(): Promise<DriveResult> {
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

    /** ==========================================================================
     *                    初始化登录所需的参数
     ========================================================================== */
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
}