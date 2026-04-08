/**
 * HTTP 响应格式工具
 * 与 GO 后端保持一致的响应格式：
 *   成功: { code: 200, message: "success", data: {...} }
 *   失败: { code: <错误码>, message: "<错误信息>" }
 */
import type { Context } from 'hono';

/** 标准成功响应体 */
export interface SuccessBody<T = any> {
    code: 200;
    message: 'success';
    data: T;
}

/** 标准错误响应体 */
export interface ErrorBody {
    code: number;
    message: string;
}

/** 分页响应数据 */
export interface PageData<T = any> {
    content: T[];
    total: number;
}

/**
 * 返回成功响应
 * 对应 GO 后端的 common.SuccessResp
 */
export function successResp(c: Context, data?: any): Response {
    if (data === undefined || data === null) {
        return c.json({ code: 200, message: 'success' } as any, 200);
    }
    return c.json({ code: 200, message: 'success', data } as SuccessBody, 200);
}

/**
 * 返回错误响应
 * 对应 GO 后端的 common.ErrorResp / common.ErrorStrResp
 */
export function errorResp(c: Context, message: string, httpStatus: number = 400): Response {
    return c.json({ code: httpStatus, message } as ErrorBody, httpStatus as any);
}

/**
 * 返回分页成功响应
 * 对应 GO 后端的 common.PageResp
 */
export function pageResp<T>(c: Context, content: T[], total: number): Response {
    return successResp(c, { content, total } as PageData<T>);
}

/**
 * 将旧格式 {flag, text, data} 转换为新格式 {code, message, data}
 * 用于兼容现有 Manage 层返回值
 */
export function fromLegacy(c: Context, result: { flag: boolean; text?: string; data?: any }, httpStatus?: number): Response {
    if (result.flag) {
        return successResp(c, result.data !== undefined ? result.data : undefined);
    }
    const status = httpStatus ?? 400;
    return errorResp(c, result.text || '操作失败', status);
}

/**
 * 将旧格式 {flag, text, data} 转换为新格式，带 token 字段
 * 用于登录接口
 */
export function fromLegacyWithToken(c: Context, result: { flag: boolean; text?: string; data?: any; token?: string }): Response {
    if (result.flag) {
        return c.json({ code: 200, message: 'success', data: { token: result.token } } as any, 200);
    }
    return errorResp(c, result.text || '操作失败', 401);
}
