import { SError } from "error"
import { isICloud189ApiResult, isICloud189ApiResult2, isICloud189AuthApiResult } from "./helper"
import { Check } from "@netdisk-sdk/utils"

// token （无效、过期）错误
export class InvalidRefreshTokenError extends SError { }
export class InvalidTokenError extends SError { }
export class InvalidSessionError extends SError { }
export class AuthApiError extends SError { }
export class ApiError extends SError { }
/** 扫描登录错误 */
export class QRLoginError extends SError { }
/** http 请求错误 */
export class HttpError extends SError { }

/**
 * 抛出http请求服务器返回的错误
 * @param body 
 * @returns 
 */
export const throwError = (body: any) => {
    if (Check.isString(body)) try { body = JSON.parse(body) } catch (error) { }

    if (isICloud189AuthApiResult(body)) {
        const errorTmpl = 'err: {result}, msg: {msg}'
        switch (body.result) {
            case 0: return true
            case -117:
                throw InvalidRefreshTokenError.create(errorTmpl, body)
            default:
                throw AuthApiError.create(errorTmpl, body)
        }
    } else if (isICloud189ApiResult(body) || isICloud189ApiResult2(body)) {
        const errorTmpl = `err: {res_code}{errorCode}, msg: {res_message}{errorMsg}`
        // @ts-ignore
        switch (body.res_code ?? body.errorCode) {
            case 0: return true
            case 'InvalidSessionKey':
                throw InvalidSessionError.create(errorTmpl, body)
            case 'UserInvalidOpenToken':
            case 'InvalidAccessToken':
                throw InvalidTokenError.create(errorTmpl, body)
            default:
                throw ApiError.create(errorTmpl, body)
        }
    }
    return true
}