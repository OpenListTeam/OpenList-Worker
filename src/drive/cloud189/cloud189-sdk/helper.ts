import { ConstructorArgType, Check, Method } from "@netdisk-sdk/utils";

import Crypto from "crypto";
import { Buffer } from "buffer";
import { ICloud189ApiResult, ICloud189ApiResult2, ICloud189AuthApiResult } from "./types";
import superagent, { Response, CallbackHandler } from "superagent";

export const rsaEncrypt = (publicKey: string, origData: string | Uint8Array) => {

    const encryptedData = Crypto.publicEncrypt({
        key: publicKey,
        padding: Crypto.constants.RSA_PKCS1_PADDING,
    }, Buffer.from(origData));
    return encryptedData.toString('hex').toUpperCase()
}

export const aseEncrypt = (key: string, origData: string | Uint8Array): string => {
    const ciph = Crypto.createCipheriv("aes-128-ecb", key, null).setAutoPadding(true)
    return ciph.update(Buffer.from(origData)).toString('hex') + ciph.final('hex')
}


export const signatureV1 = (params: ConstructorArgType<typeof URLSearchParams>) => {
    const timestampStr = String(timestamp())
    const appKey = "601102120"
    const searchParams = new URLSearchParams(params)
    searchParams.set("Timestamp", timestampStr)
    searchParams.set("AppKey", appKey)
    searchParams.sort()
    const signature = Crypto.createHash("md5").update(searchParams.toString()).digest("hex")
    return {
        "Signature": signature,
        "Sign-Type": "1",
        "AppKey": appKey,
        "Timestamp": timestampStr
    }
}

interface IAppSession {
    sessionKey: string,
    sessionSecret: string
}
/**
 * @param method 请求方法
 * @param url 完整链接
 * @param appSession 
 * @returns 
 */
export const signatureV2 = (method: Method | string, path: URL | string, params: string, appSession: IAppSession) => {
    const requestURI = path instanceof URL ? path.pathname : path.toString()
    const { sessionKey, sessionSecret } = appSession
    const dateOfGmt = new Date().toUTCString()
    const requestID = Crypto.randomUUID()

    let signData = `SessionKey=${sessionKey}&Operate=${method}&RequestURI=${requestURI}&Date=${dateOfGmt}${params && `&params=${params}`}`
    const signature = Crypto.createHmac("sha1", sessionSecret).update(signData).digest("hex");

    return {
        "Date": dateOfGmt,
        "SessionKey": sessionKey,
        "X-Request-ID": requestID,
        "Signature": signature
    }
}

export const timestamp = () => Date.now()

export const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based  
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).slice(0, 3); // Take only the first 3 digits  

    return `${year}-${month}-${day}${hours}:${minutes}:${seconds}${milliseconds}`;
}

export const sleep = (ms?: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export const isICloud189ApiResult = (result: any): result is ICloud189ApiResult => {
    return Check.isObject(result) && 'res_code' in result && 'res_message' in result
}

export const isICloud189ApiResult2 = (result: any): result is ICloud189ApiResult2 => {
    return Check.isObject(result) && 'errorCode' in result && 'errorMsg' in result
}

export const isICloud189AuthApiResult = (result: any): result is ICloud189AuthApiResult => {
    return Check.isObject(result) && 'result' in result && 'msg' in result
}

export const JSONParse = (resp: Response, value: string | CallbackHandler) => {
    const parse = superagent.parse['application/json']
    // 兼容浏览器和node处理
    // @ts-ignore
    return Check.isString(value) ? parse(value) : parse(resp, value)
}