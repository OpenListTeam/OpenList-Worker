// 公用导入 =====================================================
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
import {APP_SESSION} from "./metas";
// 专用导入 =====================================================
import * as crypto from "crypto";
import {HttpRequest} from "../../share/HttpRequest";


// 驱动器 ###########################################################
export class HostClouds extends BasicClouds {
    // 专有数据 =====================================================
    private loginParam: Record<string, any> = {};
    private _tokenParam: APP_SESSION | Record<string, any> = {};
    private verifyCode: string | null | any = '';

    // 公共访问器
    get tokenParam(): APP_SESSION | Record<string, any> {
        return this._tokenParam;
    }

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
        // console.log(res)
        const captchaToken = res.match(/'captchaToken' value='(.+?)'/)?.[1];
        const lt = res.match(/lt = "(.+?)"/)?.[1];
        const paramId = res.match(/paramId = "(.+?)"/)?.[1];
        const reqId = res.match(/reqId = "(.+?)"/)?.[1];
        if (!captchaToken || !lt || !paramId || !reqId) {
            // console.log("res", captchaToken, lt, paramId, reqId)
            return {flag: false, text: "Failed to extract login parameters"}
        }
        // 获取RSA公钥 =========================================================
        const encryptConf = await HttpRequest("POST",
            `${con.AUTH_URL}/api/logbox/config/encryptConf.do`, {appId: con.APP_ID},
            {"Content-Type": "application/json"}, {finder: "json"}
        );
        // console.log(encryptConf)
        if (!encryptConf?.data?.pubKey || !encryptConf?.data?.pre) {
            // console.log("encryptConf", encryptConf)
            return {flag: false, text: "Failed to fetch RSA public key"}
        }
        const jRsaKey = `-----BEGIN PUBLIC KEY-----\n${encryptConf.data.pubKey}\n-----END PUBLIC KEY-----`;
        const rsaUsername = encryptConf.data.pre +
            this.rsaEncrypt(jRsaKey, this.config.username);
        const rsaPassword = encryptConf.data.pre +
            this.rsaEncrypt(jRsaKey, this.config.password);
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
        if (needCaptcha === "0") return {flag: false, text: "Failed to get Captcha"}
        // 获取验证码图片 =======================================================
        const imgRes = await HttpRequest("GET",
            `${con.AUTH_URL}/api/logbox/oauth2/picCaptcha.do`, {
                token: captchaToken,
                REQID: reqId,
                rnd: Date.now().toString(),
            }, undefined, "blob"
        );
        console.log(imgRes)
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
        // console.log(this.config, this.loginParam)
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
            // console.log(login_resp)
            if (!login_resp.toUrl) {
                console.log(`登录账号失败: ${login_resp.msg}`)
                return {
                    flag: false,
                    text: `登录账号失败: ${login_resp.msg}`
                }

            }
            // 获取Token信息 =========================================
            // this.saving.login["redirectURL"] = login_resp.toUrl;
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
            console.log("tokenInfo:", tokenInfo)
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
            // console.log(tokenInfo)
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
        if (!this.saving.token) return await this.initConfig();
        this._tokenParam = this.saving.token;
        this.loginParam = this.saving.login;
        return {
            flag: true,
            text: "OK"
        }
    }

    async refreshSession(): Promise<Error | null> {
        try {
            const tokenInfo: APP_SESSION | Record<string, any> = this.tokenParam;
            if (!tokenInfo) {
                return new Error("No token info available");
            }

            const resp = await HttpRequest("POST",
                `${con.API_URL}/getSessionForPC.action`, {
                    "accessToken": tokenInfo.accessToken,
                    "appId": con.APP_ID
                }, undefined, {finder: "json"}
            );

            if (resp.ResCode !== 0) {
                return new Error(resp.ResMessage || "Failed to refresh session");
            }

            this._tokenParam = resp;
            return null;
        } catch (e) {
            return e as Error;
        }
    }
}

//     async getFiles(fileId: string, isFamily: boolean): Promise<Array<Record<string, any>> | null> {
//         const files: Array<Record<string, any>> = [];
//         for (let pageNum = 1; ; pageNum++) {
//             const resp = await this.getFilesWithPage(fileId, isFamily, pageNum, 1000, "filename", "asc");
//             if (!resp || resp.FileListAO.Count === 0) {
//                 break;
//             }
//
//             files.push(...resp.FileListAO.FolderList, ...resp.FileListAO.FileList);
//         }
//         return files.length > 0 ? files : null;
//     }
//
//     async uploadFile(file: File, folderId: string, isFamily: boolean = false): Promise<Record<string, any> | null> {
//         try {
//             const uploadInfo = await this.initUpload(folderId, file.name, file.size.toString(), isFamily);
//             if (!uploadInfo) {
//                 return null;
//             }
//
//             const uploadUrl = uploadInfo.UploadUrl;
//             const headers = {
//                 "Content-Type": "application/octet-stream",
//                 "Content-Length": file.size.toString(),
//             };
//
//             const response = await HttpRequest("PUT",
//                 uploadUrl, file, headers,
//                 {finder: "json"}
//             );
//
//             if (response.ResCode !== 0) {
//                 throw new Error(response.ResMessage || "Upload failed");
//             }
//
//             return response;
//         } catch (e) {
//             console.error("Upload error:", e);
//             return null;
//         }
//     }
//
//     async deleteFile(fileId: string, isFamily: boolean = false): Promise<boolean> {
//         try {
//             const url = isFamily ? `${API_URL}/family/file/deleteFile.action` : `${API_URL}/deleteFile.action`;
//             const params = {
//                 "fileId": fileId,
//             };
//
//             const response = await HttpRequest("POST", url, params, undefined, {finder: "json"});
//
//             return response.ResCode === 0;
//         } catch (e) {
//             console.error("Delete error:", e);
//             return false;
//         }
//     }
//
//     async renameFile(fileId: string, newName: string, isFamily: boolean = false): Promise<boolean> {
//         try {
//             const url = isFamily ? `${API_URL}/family/file/renameFile.action` : `${API_URL}/renameFile.action`;
//             const params = {
//                 "fileId": fileId,
//                 "newFileName": newName,
//             };
//
//             const response = await HttpRequest("POST",
//                 url,
//                 params,
//                 undefined,
//                 {finder: "json"}
//             );
//
//             return response.ResCode === 0;
//         } catch (e) {
//             console.error("Rename error:", e);
//             return false;
//         }
//     }
//
//     async downloadFile(fileId: string, isFamily: boolean = false): Promise<Blob | null> {
//         try {
//             const url = isFamily ? `${API_URL}/family/file/downloadFile.action` : `${API_URL}/downloadFile.action`;
//             const params = {
//                 "fileId": fileId,
//             };
//
//             const response = await HttpRequest(
//                 "GET",
//                 url,
//                 params,
//                 undefined,
//                 {finder: "blob"}
//             );
//
//             return response;
//         } catch (e) {
//             console.error("Download error:", e);
//             return null;
//         }
//     }
//
//     async batchDelete(fileIds: string[], isFamily: boolean = false): Promise<boolean> {
//         try {
//             const url = isFamily ? `${API_URL}/family/file/batchDeleteFile.action` : `${API_URL}/batchDeleteFile.action`;
//             const params = {
//                 "fileIds": fileIds.join(","),
//             };
//
//             const response = await HttpRequest("POST",
//                 url,
//                 params,
//                 undefined,
//                 {finder: "json"}
//             );
//
//             return response.ResCode === 0;
//         } catch (e) {
//             console.error("Batch delete error:", e);
//             return false;
//         }
//     }
//
//     async batchMove(fileIds: string[], targetFolderId: string, isFamily: boolean = false): Promise<boolean> {
//         try {
//             const url = isFamily ? `${API_URL}/family/file/batchMoveFile.action` : `${API_URL}/batchMoveFile.action`;
//             const params = {
//                 "fileIds": fileIds.join(","),
//                 "targetFolderId": targetFolderId,
//             };
//
//             const response = await HttpRequest(
//                 "POST",
//                 url,
//                 params,
//                 undefined,
//                 {finder: "json"}
//             );
//
//             return response.ResCode === 0;
//         } catch (e) {
//             console.error("Batch move error:", e);
//             return false;
//         }
//     }


