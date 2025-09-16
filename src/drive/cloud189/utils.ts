// 公用导入 =====================================================
import {Context} from "hono";
import {DriveResult} from "../DriveObject";
import {BasicClouds} from "../BasicClouds";
import * as con from "./const";
// 专用导入 =====================================================
import * as crypto from "crypto";
import {HttpRequest} from "../../share/HttpRequest";


// 驱动器 #######################################################
export class HostClouds extends BasicClouds {
    // 公共数据 =================================================
    public config: Record<string, any> | undefined;
    public saving: Record<string, any> | undefined;

    // 专有数据 =================================================
    private loginParam: CONFIG_INFO | null = null;
    private tokenParam: APP_SESSION | null = null;
    private verifyCode: string | null | any = '';

    // 构造函数 ================================================
    constructor(c: Context, router: string,
                public config: Record<string, any> | any,
                public saving: Record<string, any> | any) {
        super(c, router, config, saving);
    }

    // RSA加密 =====================================================
    async rsaEncrypt(publicKey: string, data: string): string {
        const buffer = Buffer.from(data, "utf8");
        const crypts = crypto.publicEncrypt(publicKey, buffer);
        return crypts.toString("base64");
    }

    // 获取登录参数 =================================================
    async initParams(): Promise<DriveResult> {
        // 清除登录数据 ========================================================
        this.serverData = {};
        // 获取登录参数 ========================================================
        const res = await HttpRequest(
            `${con.WEB_URL}/api/portal/unifyLoginForPC.action`, {
                appId: con.APP_ID,
                clientType: con.CLIENT_TYPE,
                returnURL: con.RETURN_URL,
                timeStamp: Date.now().toString(),
            }, "GET", false, undefined, "text");
        if (!res) {
            console.log(res)
            return {flag: false, text: "Failed to fetch login parameters"}
        }
        // 提取登录参数 ========================================================
        // console.log(res)
        const captchaToken = res.match(/'captchaToken' value='(.+?)'/)?.[1];
        const lt = res.match(/lt = "(.+?)"/)?.[1];
        const paramId = res.match(/paramId = "(.+?)"/)?.[1];
        const reqId = res.match(/reqId = "(.+?)"/)?.[1];
        if (!captchaToken || !lt || !paramId || !reqId) {
            console.log("res", captchaToken, lt, paramId, reqId)
            return {flag: false, text: "Failed to extract login parameters"}
        }
        // 获取RSA公钥 =========================================================
        const encryptConf = await HttpRequest(
            `${con.AUTH_URL}/api/logbox/config/encryptConf.do`, {appId: con.APP_ID},
            "POST", false, {"Content-Type": "application/json"}, "json"
        );
        // console.log(encryptConf)
        if (!encryptConf?.data?.pubKey || !encryptConf?.data?.pre) {
            console.log("encryptConf", encryptConf)
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
            Lt: lt,
            ParamId: paramId,
            ReqId: reqId,
            jRsaKey,
            rsaUsername,
            rsaPassword,
        };

        // 检查是否需要验证码
        // const needCaptcha = await HttpRequest(
        //     `${AUTH_URL}/api/logbox/oauth2/needcaptcha.do`,
        //     {
        //         appKey: APP_ID,
        //         accountType: ACCOUNT_TYPE,
        //         userName: rsaUsername,
        //     },
        //     "POST",
        //     false,
        //     { REQID: reqId },
        //     "text"
        // );
        //
        // if (needCaptcha === "0") {
        //     return null;
        // }
        //
        // // 获取验证码图片
        // const imgRes = await HttpRequest(
        //     `${AUTH_URL}/api/logbox/oauth2/picCaptcha.do`,
        //     {
        //         token: captchaToken,
        //         REQID: reqId,
        //         rnd: Date.now().toString(),
        //     },
        //     "GET",
        //     false,
        //     undefined,
        //     "blob"
        // );
        //
        // if (imgRes?.size > 20) {
        //     // 处理OCR或返回Base64图片
        //     return new Error(`Need verification code: ${imgRes}`);
        // }
        return {flag: true, text: "OK"};
    }

    // 初始化配置项 =================================================
    async initConfig(): Promise<DriveResult> {
        // 初始化登录所需参数 =======================================
        const result = await this.initParams()
        if (!result.flag) {
            console.log(result)
            return {flag: false, text: result.text};
        }
        console.log(this.config, this.loginParam)
        try {
            // 发送登录请求 =========================================
            const login_resp: LOGIN_RESULT = await HttpRequest(
                `${con.AUTH_URL}/api/logbox/oauth2/loginSubmit.do`,
                {
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
                },
                "POST", false, {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "REQID": this.loginParam.ReqId,
                    "lt": this.loginParam.Lt
                }, "json"
            );
            // 检查登录结果 ==========================================
            console.log(login_resp)
            if (!login_resp.ToUrl) {
                console.log(`login failed, msg: ${login_resp.msg}`)
                return {
                    flag: false,
                    text: `login failed, msg: ${login_resp.msg}`
                }

            }

            // 获取Token信息 =========================================
            suffixParams["redirectURL"] = login_resp.ToUrl;
            const tokenInfo: APP_SESSION = await HttpRequest(
                `${API_URL}/getSessionForPC.action`,
                suffixParams, "POST", false, undefined, "json"
            );
            // 检查错误 ==============================================
            if (tokenInfo.ResCode !== 0) {
                console.log(`login failed, msg: ${tokenInfo}`)
                return {
                    flag: false,
                    text: `login failed, msg: ${tokenInfo}`
                }
            }
            this.tokenParam = tokenInfo;
            console.log(tokenInfo)
            // 异常处理 ==============================================
        } catch (e) {
            console.log(e.message)
            return {
                flag: false,
                text: `login failed, msg: ${e.message}`
            }
        } finally {
            this.verifyCode = ""; // 销毁短信验证码
            this.loginParam = null; // 销毁登录参数
        }
    }

    async refreshSession(): Promise<Error | null> {
        try {
            const tokenInfo = this.tokenParam;
            if (!tokenInfo) {
                return new Error("No token info available");
            }

            const resp = await HttpRequest(
                `${API_URL}/getSessionForPC.action`,
                {
                    "accessToken": tokenInfo.AccessToken,
                    "appId": APP_ID
                },
                "POST",
                false,
                undefined,
                "json"
            );

            if (resp.ResCode !== 0) {
                return new Error(resp.ResMessage || "Failed to refresh session");
            }

            this.tokenParam = resp;
            return null;
        } catch (e) {
            return e as Error;
        }
    }

    async getFiles(fileId: string, isFamily: boolean): Promise<Array<Record<string, any>> | null> {
        const files: Array<Record<string, any>> = [];
        for (let pageNum = 1; ; pageNum++) {
            const resp = await this.getFilesWithPage(fileId, isFamily, pageNum, 1000, "filename", "asc");
            if (!resp || resp.FileListAO.Count === 0) {
                break;
            }

            files.push(...resp.FileListAO.FolderList, ...resp.FileListAO.FileList);
        }
        return files.length > 0 ? files : null;
    }

    async uploadFile(file: File, folderId: string, isFamily: boolean = false): Promise<Record<string, any> | null> {
        try {
            const uploadInfo = await this.initUpload(folderId, file.name, file.size.toString(), isFamily);
            if (!uploadInfo) {
                return null;
            }

            const uploadUrl = uploadInfo.UploadUrl;
            const headers = {
                "Content-Type": "application/octet-stream",
                "Content-Length": file.size.toString(),
            };

            const response = await HttpRequest(
                uploadUrl,
                file,
                "PUT",
                false,
                headers,
                "json"
            );

            if (response.ResCode !== 0) {
                throw new Error(response.ResMessage || "Upload failed");
            }

            return response;
        } catch (e) {
            console.error("Upload error:", e);
            return null;
        }
    }

    async deleteFile(fileId: string, isFamily: boolean = false): Promise<boolean> {
        try {
            const url = isFamily ? `${API_URL}/family/file/deleteFile.action` : `${API_URL}/deleteFile.action`;
            const params = {
                "fileId": fileId,
            };

            const response = await HttpRequest(
                url,
                params,
                "POST",
                false,
                undefined,
                "json"
            );

            return response.ResCode === 0;
        } catch (e) {
            console.error("Delete error:", e);
            return false;
        }
    }

    async renameFile(fileId: string, newName: string, isFamily: boolean = false): Promise<boolean> {
        try {
            const url = isFamily ? `${API_URL}/family/file/renameFile.action` : `${API_URL}/renameFile.action`;
            const params = {
                "fileId": fileId,
                "newFileName": newName,
            };

            const response = await HttpRequest(
                url,
                params,
                "POST",
                false,
                undefined,
                "json"
            );

            return response.ResCode === 0;
        } catch (e) {
            console.error("Rename error:", e);
            return false;
        }
    }

    async downloadFile(fileId: string, isFamily: boolean = false): Promise<Blob | null> {
        try {
            const url = isFamily ? `${API_URL}/family/file/downloadFile.action` : `${API_URL}/downloadFile.action`;
            const params = {
                "fileId": fileId,
            };

            const response = await HttpRequest(
                url,
                params,
                "GET",
                false,
                undefined,
                "blob"
            );

            return response;
        } catch (e) {
            console.error("Download error:", e);
            return null;
        }
    }

    async batchDelete(fileIds: string[], isFamily: boolean = false): Promise<boolean> {
        try {
            const url = isFamily ? `${API_URL}/family/file/batchDeleteFile.action` : `${API_URL}/batchDeleteFile.action`;
            const params = {
                "fileIds": fileIds.join(","),
            };

            const response = await HttpRequest(
                url,
                params,
                "POST",
                false,
                undefined,
                "json"
            );

            return response.ResCode === 0;
        } catch (e) {
            console.error("Batch delete error:", e);
            return false;
        }
    }

    async batchMove(fileIds: string[], targetFolderId: string, isFamily: boolean = false): Promise<boolean> {
        try {
            const url = isFamily ? `${API_URL}/family/file/batchMoveFile.action` : `${API_URL}/batchMoveFile.action`;
            const params = {
                "fileIds": fileIds.join(","),
                "targetFolderId": targetFolderId,
            };

            const response = await HttpRequest(
                url,
                params,
                "POST",
                false,
                undefined,
                "json"
            );

            return response.ResCode === 0;
        } catch (e) {
            console.error("Batch move error:", e);
            return false;
        }
    }
}