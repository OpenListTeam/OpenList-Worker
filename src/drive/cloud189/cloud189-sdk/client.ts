import superagent, { Agent, Response } from "superagent";
import { Await, Check, ContentType, ObjectUtil, Transform } from '@netdisk-sdk/utils'

import { AccountType, ApiURL, AppID, AuthURL, ClientType, ReturnURL, UserAgent, WebURL, clientSuffix } from "./const";
import { IAppSession, IAppToken, IEncryptConf, ILoginOptionCommon, ILoginParam } from "./types";
import { JSONParse, aseEncrypt, formatDate, rsaEncrypt, signatureV2, sleep, timestamp } from "./helper";
import { Cloud189SharedFSApi } from "./files";
import { HttpError, InvalidSessionError, InvalidTokenError, QRLoginError, throwError } from "./errors";

export class Cloud189Client {
    agent: Agent
    source: ITokenSessionSource
    shareApi: Cloud189SharedFSApi

    constructor(source: ITokenSessionSource, agent?: Agent) {
        this.source = source

        this.agent = (agent ?? superagent.agent())
            .accept(ContentType.JSON)
            .set('User-Agent', UserAgent)
            .ok((resp: Response) => {
                throwError(resp.body || resp.text)
                if (resp.status >= 400) throw HttpError.create('http request error, status={status}', { status: resp.status })
                return true
            })
            .use((req: any) => {
                const source = this.source
                const oldend = req._end
                let oldParams: URLSearchParams

                // 只有 _end 在重试时才执行 
                req._end = async function () {
                    try {
                        const url = new URL(req.url)
                        oldParams = oldParams ?? url.searchParams
                        if (url.origin.includes(ApiURL)) {
                            const { sessionKey, sessionSecret, familySessionKey, familySessionSecret } = await source.session()
                            const method = req.method.toUpperCase()

                            const sign = (sessionKey: string, sessionSecret: string) => {
                                // 加密search
                                const params = aseEncrypt(sessionSecret.slice(0, 16), oldParams.toString())
                                url.search = `params=${params}`

                                // 签名header
                                const header = signatureV2(method, url, params, { sessionKey, sessionSecret })

                                this.url = url.toString()
                                this.set(header)
                            }
                            url.pathname.includes('/family') ? sign(familySessionKey, familySessionSecret) : sign(sessionKey, sessionSecret)
                        } else if (url.origin.includes(WebURL)) {
                            const { sessionKey } = await source.session()
                            url.searchParams.set('sessionKey', sessionKey)
                            this.url = url.toString()
                        }

                        // node 额外操作
                        if (this.req) this.req.path = `${url.pathname}${url.search}`
                        // if (this.req) {this.req = null;this.req = this.request()}
                        oldend.call(this)
                    } catch (error) {
                        this.callback(error)
                    }
                }
            })
            .retry(3, (_: any, resp: Response) => {
                try { throwError(resp.body || resp.text) } catch (error) {
                    if (error instanceof InvalidSessionError) {
                        source.refreshSession?.()
                    } else if (error instanceof InvalidTokenError) {
                        source.refreshToken?.()
                    } else return void 0  // 由默认机制处理
                    return true
                }
            })
        this.shareApi = new Cloud189SharedFSApi(this)
    }
}

export class Cloud189AuthClient {
    agent: Agent
    encryptConf?: IEncryptConf;

    constructor(agent?: Agent) {
        this.agent = (agent ?? superagent.agent())
            .accept(ContentType.JSON)
            .set('User-Agent', UserAgent)
            .ok((resp: Response) => {
                throwError(resp.body || resp.text)
                if (resp.status >= 400) throw HttpError.create('http request error, status={status}', { status: resp.status })
                return true
            })
    }

    /**
     * @param refreshToken 
     * @returns 
     */
    async loginByRefreshToken(refreshToken: string): Promise<IAppToken & IAppSession> {
        const appToken = await this.refreshToken(refreshToken)
        const session = await this.getSessionForPC({ accessToken: appToken.accessToken })
        return { ...appToken, ...session }
    }

    /**
     * 使用账户密码登录
     * @param loginParam 通过getLoginParam获取
     * @param username 未加密用户名
     * @param password 未加密密码
     * @param options 
     * @returns 
     */
    async loginByPassword(loginParam: ILoginParam, username: string, password: string, options: Partial<ILoginOptionCommon> = {}): Promise<IAppToken & IAppSession> {
        delete options['signal']

        const rsaUsername = await this.encryptData(username)
        const rsaPassword = await this.encryptData(password)

        const { paramID, reqID, lt, captchaToken } = loginParam

        const { body: result } = await this.agent
            .post(`${AuthURL}/api/logbox/oauth2/loginSubmit.do`)
            .type(ContentType.FormUrlencoded)
            .set({
                Referer: AuthURL,
                Reqid: reqID,
                lt: lt,
            })
            .send({
                appKey: AppID,
                accountType: AccountType,
                userName: rsaUsername,
                password: rsaPassword,
                clientType: ClientType,
                returnUrl: ReturnURL,

                cb_SaveName: "3",

                validateCode: "",
                // smsValidateCode:"",
                captchaToken: captchaToken,
                paramId: paramID,

                // mailSuffix:   "@189.cn",
                dynamicCheck: "FALSE",

                isOauth2: "false",
                state: "",
                ...options
            })
        return await this.getSessionForPC({ redirectURL: result.toUrl })
    }

    /**
     * 根据cookie登录
     * 
     * @param cookies 
     */
    async loginByCookies(cookies: string) {
        if (!/SSON=([0-9a-z]*)/gi.test(cookies)) throw new Error('Cookies need key SSON')
            
        const resp1 = await this.agent
            .get(`${WebURL}/api/portal/unifyLoginForPC.action`)
            .query({
                appId: AppID,
                clientType: ClientType,
                returnURL: ReturnURL,
                timeStamp: timestamp(),
            })
            .redirects(0)
        const location = resp1.headers['location']
        if (location == null) throw new Error('prevent redirect fail, header location is null')

        const resp2 = await this.agent
            .get(location)
            .set('Cookie', cookies)
            .redirects(0)
        const redirectURL = resp2.headers['location']

        if (redirectURL == null) throw new Error('login failed,No redirectURL obtained')
        return await this.getSessionForPC({ redirectURL })
    }

    /**
     * 二维码扫描登录
     */
    async loginByQR(loginParam: ILoginParam, showImage: (image: Uint8Array) => void, options: Partial<ILoginOptionCommon> = {}): Promise<IAppToken & IAppSession> {
        const { paramID, reqID, lt } = loginParam
        const signal = options.signal
        delete options['signal']

        interface IUUIDResult {
            encodeuuid: string
            encryuuid: string
            uuid: string
        }

        const { body: { uuid, encodeuuid, encryuuid } } = await this.agent
            .post(`${AuthURL}/api/logbox/oauth2/getUUID.do`)
            .type(ContentType.FormUrlencoded)
            .buffer(true).parse(JSONParse)
            .send({ appId: AppID })

        // 下载验证码
        const { body: image } = await this.agent
            .get(`${AuthURL}/api/logbox/oauth2/image.do`)
            .query({ uuid: encodeuuid, REQID: reqID })
            .responseType('arraybuffer')

        showImage(image)

        /**
         * 判断二维码状态
         */
        while (true) {
            signal?.throwIfAborted()

            interface IState {
                status: number
                redirectUrl: string
            }
            const timeStamp = timestamp()
            const date = formatDate(new Date(timeStamp))

            const { body: { status, redirectUrl } } = await this.agent
                .post(`${AuthURL}/api/logbox/oauth2/qrcodeLoginState.do`)
                .type(ContentType.FormUrlencoded)
                .set({
                    Referer: AuthURL,
                    Reqid: reqID,
                    lt: lt,
                })
                .buffer(true).parse(JSONParse)
                .send({
                    appId: AppID,
                    clientType: ClientType,
                    returnUrl: ReturnURL,
                    paramId: paramID,

                    uuid,
                    encryuuid,
                    date,
                    timeStamp: timeStamp,
                    cb_SaveName: 0,
                    isOauth2: false,
                    state: '',
                    ...options
                })

            switch (status) {
                case 0:
                    return await this.getSessionForPC({ redirectURL: redirectUrl })
                case -11001:// 过期
                    throw QRLoginError.create('QR code expired')
                case -106: // 等待扫描
                case -11002://等待确认
                    await sleep(1000)
                    continue
                default:
                    throw QRLoginError.create('QR code unknown error,status: {status} ', status)
            }
        }
    }

    getSessionForPC(param: { redirectURL: string }): Promise<IAppSession & IAppToken>;
    /**
     * 刷新会话token
     * @param param 
     */
    getSessionForPC(param: { accessToken: string }): Promise<IAppSession>;
    async getSessionForPC({ redirectURL, accessToken }: any) {
        if (redirectURL == null && accessToken == null) throw new Error('params is null')
        const params = redirectURL != null ? { redirectURL } : { accessToken, appId: AppID }

        const { body: result } = await this.agent
            .query({
                appId: AppID,
                ...clientSuffix(),
                ...params
            })
            .post(`${ApiURL}/getSessionForPC.action`)

        if (redirectURL) result.expiry = new Date(Date.now() + 8640 * 1000).getTime()
        return result
    }

    /**
     * 刷新token
     * 
     * docs: https://id.189.cn/html/api_detail_493.html
     * @param refreshToken 
     */
    async refreshToken(refreshToken: string): Promise<IAppToken> {
        const { body: appToken } = await this.agent
            .type(ContentType.FormUrlencoded)
            .buffer(true).parse(JSONParse)
            .post(`${AuthURL}/api/oauth2/refreshToken.do`)
            .send({
                clientId: AppID,
                refreshToken: refreshToken,
                grantType: 'refresh_token',
                format: 'json',
            })

        appToken.expiry = new Date(Date.now() + appToken.expiresIn * 1000).getTime()
        return appToken
    }

    /**
     * 获取登录所需参数
     */
    async getLoginParam(): Promise<ILoginParam> {
        const { text: html } = await this.agent
            .query({
                appId: AppID,
                clientType: ClientType,
                returnURL: ReturnURL,
                timeStamp: timestamp(),
            })
            .get(`${WebURL}/api/portal/unifyLoginForPC.action`)

        const captchaToken = html.match(`'captchaToken' value='(.+?)'`)![1]
        const lt = html.match(`lt = "(.+?)"`)![1]
        const paramID = html.match(`paramId = "(.+?)"`)![1]
        const reqID = html.match(`reqId = "(.+?)"`)![1]
        return { captchaToken, lt, paramID, reqID }
    }

    /**
     * 判断登录是否需要验证码
     * @param usesrname
     */
    async needCaptcha(username: string): Promise<boolean> {
        const rsaUsername = await this.encryptData(username)
        const { body: need } = await this.agent
            .type(ContentType.FormUrlencoded)
            .post(`${AuthURL}/api/logbox/oauth2/needcaptcha.do`)
            .send({
                appKey: AppID,
                accountType: AccountType,
                userName: rsaUsername,
            })
        return Boolean(Number(need))
    }

    /**
     * 获取验证码
     * @param loginParam 
     */
    async getCaptchaImage({ captchaToken, reqID }: ILoginParam) {
        const resp = await this.agent
            .query({
                "token": captchaToken,
                "REQID": reqID,
                "rnd": timestamp(),
            })
            .get(`${AuthURL}/api/logbox/oauth2/picCaptcha.do`)
            .responseType('arraybuffer')

        return resp.body
    }

    /**
     * 获取加密参数
     */
    async getEncryptConf(refresh = false): Promise<IEncryptConf> {
        if (this.encryptConf == null || refresh) {
            const { body: { data: encryptConf } } = await this.agent
                .type(ContentType.FormUrlencoded)
                .buffer(true).parse(JSONParse)
                .post(`${AuthURL}/api/logbox/config/encryptConf.do`)
                .send({ appId: AppID })

            this.encryptConf = encryptConf as IEncryptConf
        }
        return this.encryptConf
    }

    encryptData(data: string, joinPre?: boolean): Promise<string>
    encryptData(data: string[], joinPre?: boolean): Promise<string[]>
    encryptData<T extends string[]>(data: T, joinPre?: boolean): Promise<T>
    async encryptData(data: any, joinPre = true) {
        const encryptConf = await this.getEncryptConf()
        const publichKey = `-----BEGIN PUBLIC KEY-----\n${encryptConf.pubKey}\n-----END PUBLIC KEY-----`
        const rsaDatas = Transform.toArray<string>(data).map(data => {
            if (data.startsWith(encryptConf.pre))
                return data
            const rsaData = rsaEncrypt(publichKey, data)
            return joinPre ? (encryptConf.pre + rsaData) : rsaData
        })
        return Check.isArray(data) ? rsaDatas : rsaDatas[0]
    }

    /**
     * 过期自动刷新的TokenSessionSource
     * @param token 
     * @param tokenSource 
     * @param session 
     * @param sessionSource 
     * @param update 当session或token刷新时调用，无论成功或失败
     * @returns 
     */
    createTokenSessionSource(
        token: IAppToken | null,
        tokenSource?: ITokenSource | null,
        session?: IAppSession | null,
        sessionSource?: ISessionSource | null,
        update?: (token: IAppToken | null, session?: IAppSession | null) => void
    ) {
        tokenSource = tokenSource ?? {
            token: () => {
                if (token?.refreshToken == null) throw new Error('refreshToken is null')
                return this.refreshToken(token.refreshToken)
            },
        }

        const refreshToken = async () => {
            try {
                   token = (await tokenSource.refreshToken?.()) || (await tokenSource.token())
                   return token
            } finally { update?.(token, session) }
        }

        const getToken = async () => {
            if (token == null || (token.expiry && token.expiry < Date.now())) {
                token = await refreshToken()
            }
            return token
        }

        sessionSource = sessionSource ?? {
            session: async () => {
                const { accessToken } = await getToken()
                const session = await this.getSessionForPC({ accessToken })
                return session
            }
        }

        const refreshSession = async () => {
            // 从源获取新的session
            const getSession = async () => (await sessionSource.refreshSession?.()) || (await sessionSource.session())
            try {
                return session = await getSession()
            } catch (error: any) {
                // token 失效，刷新后重试
                if (error instanceof InvalidTokenError) {
                    await refreshToken()
                    return session = await getSession()
                }
                throw error
            } finally { update?.(token, session) }
        }

        const getSession = async () => {
            if (session == null ||
                session.familySessionKey == null ||
                session.familySessionSecret == null ||
                session.sessionKey == null || session.sessionSecret == null) session = await refreshSession()
            return session
        }

        return ObjectUtil.createObjectLock<ITokenSessionSource>({
            token: getToken, refreshToken,
            session: getSession, refreshSession
        })
    }
}

export interface ITokenSessionSource extends ITokenSource, ISessionSource { }

export interface ISessionSource {
    session(): Await<IAppSession>
    refreshSession?(): Await<IAppSession>
}

export interface ITokenSource {
    token(): Await<IAppToken>
    refreshToken?(): Await<IAppToken>
}