import url from "url"
import NodeRSA from "node-rsa"
import { CookieJar } from "tough-cookie"
import { wrapper } from "axios-cookiejar-support"
import axios, { AxiosInstance } from "axios"

// 定义接口类型
interface Config {
    clientId: string
    model: string
    version: string
}

interface Headers {
    "User-Agent": string
    Referer: string
    "Accept-Encoding": string
    Host: string
    [key: string]: string
}

interface EncryptData {
    pubKey: string
    pre: string
}

interface QueryParams {
    lt: string
    reqId: string
    appId: string
    REQID: string
}

interface AppConf {
    returnUrl: string
    paramId: string
}

interface LoginFormData {
    appKey: string
    version: string
    accountType: string
    mailSuffix: string
    validateCode: string
    captchaToken: string
    dynamicCheck: string
    clientType: string
    cb_SaveName: string
    isOauth2: boolean
    returnUrl: string
    paramId: string
    userName: string
    password: string
}

interface LoginResponse {
    result: number
    toUrl: string
}

interface Cookie {
    domain: string
    [key: string]: any
}

let cookieJar: CookieJar = new CookieJar()
let _axios: AxiosInstance = wrapper(axios.create({ jar: cookieJar, withCredentials: true }))

const config: Config = {
    clientId: "538135150693412",
    model: "KB2000",
    version: "9.0.6",
}

const headers: Headers = {
    "User-Agent": `Mozilla/5.0 (Linux; U; Android 11; ${config.model} Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.136 Mobile Safari/537.36 Ecloud/${config.version} Android/30 clientId/${config.clientId} clientModel/${config.model} clientChannelId/qq proVersion/1.0.6`,
    Referer: "https://m.cloud.189.cn/zhuanti/2016/sign/index.jsp?albumBackupOpened=1",
    "Accept-Encoding": "gzip, deflate",
    Host: "cloud.189.cn",
}
function setCookies(cookies:Cookie[]):string {
    // console.log(' setCookies>>>>>:', cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; '));
    return cookies.map((cookie) => `${cookie.key}=${cookie.value}`).join("; ");
}

// 1.获取公钥
const getEncrypt = (): Promise<EncryptData> =>
    _axios.post("https://open.e.189.cn/api/logbox/config/encryptConf.do").then((res) => res.data.data)

const getAppConf = (query: QueryParams): Promise<AppConf> => {
    const formData = new URLSearchParams()
    formData.append("version", "2.0")
    formData.append("appKey", query.appId)

    return _axios
        .post("https://open.e.189.cn/api/logbox/oauth2/appConf.do", formData, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
                Referer: "https://open.e.189.cn/",
                lt: query.lt,
                REQID: query.reqId,
            },
        })
        .then((res) => res.data.data)
}

// 2.获取登录参数
const redirectURL = (): Promise<QueryParams> =>
    _axios
        .get(
            "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https://cloud.189.cn/web/redirect.html?returnURL=/main.action"
        )
        .then((res) => {
            const { query } = url.parse(res.request.res.responseUrl, true)
            return query as unknown as QueryParams
        })

const builLoginForm = (encrypt: EncryptData, appConf: AppConf, username: string, password: string): LoginFormData => {
    const keyData = `-----BEGIN PUBLIC KEY-----\n${encrypt.pubKey}\n-----END PUBLIC KEY-----`
    const RsaJsencrypt = new NodeRSA(keyData, "public", {
        encryptionScheme: "pkcs1",
    })
    // 加密数据
    const usernameEncrypt = Buffer.from(RsaJsencrypt.encrypt(username).toString("base64"), "base64").toString("hex")
    const passwordEncrypt = Buffer.from(RsaJsencrypt.encrypt(password).toString("base64"), "base64").toString("hex")

    return {
        appKey: "cloud",
        version: "2.0",
        accountType: "01",
        mailSuffix: "@189.cn",
        validateCode: "",
        captchaToken: "",
        dynamicCheck: "FALSE",
        clientType: "1",
        cb_SaveName: "3",
        isOauth2: false,
        returnUrl: appConf.returnUrl,
        paramId: appConf.paramId,
        userName: `${encrypt.pre}${usernameEncrypt}`,
        password: `${encrypt.pre}${passwordEncrypt}`,
    }
}

/**
 * 登录流程
 * 1.获取公钥
 * 2.获取登录参数
 * 3.获取登录地址
 * 4.跳转到登录页
 */
async function loginFn(username: string, password: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            const encrypt: EncryptData = await getEncrypt()
            const cacheQuery: QueryParams = await redirectURL()
            // console.log("🚀 ~ loginFn ~ cacheQuery:", cacheQuery)

            const appConf: AppConf = await getAppConf(cacheQuery)
            const data: LoginFormData = builLoginForm(encrypt, appConf, username, password)

            // 3.获取登录地址
            const res: LoginResponse = await _axios
                .post(
                    "https://open.e.189.cn/api/logbox/oauth2/loginSubmit.do",
                    data, // 表单数据
                    {
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
                            Referer: "https://open.e.189.cn/",
                            REQID: cacheQuery.REQID,
                            lt: cacheQuery.lt,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    }
                )
                .then((response) => response.data)

            if (res.result === 0) {
                return _axios
                    .get(res.toUrl, {
                        headers,
                        jar: cookieJar, // 使用 tough-cookie 的 CookieJar
                    })
                    .then((r) => {
                        const cookies: Cookie[] = JSON.parse(JSON.stringify(cookieJar)).cookies.filter(
                            (item: Cookie) => {
                                return item.domain.includes("cloud")
                            }
                        )
                        cookieJar = new CookieJar()
                        const cookieStr = setCookies(cookies)
                        // console.log('cookies >>>', cookies)
                        return resolve(cookieStr)
                    })
            } else {
                console.log("登录失败1", res)
                return reject(res)
            }
        } catch (error) {
            console.log("登录失败2", error)
            reject(error)
        }
    })
}

loginFn('1111','111').then(res=>{
    console.log('coookies',res);

})