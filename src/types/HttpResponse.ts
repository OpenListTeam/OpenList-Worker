/**
 * HTTP 响应格式工具
 * 与 GO 后端保持一致的响应格式：
 *   成功: { code: 200, message: "success", data: {...} }
 *   失败: { code: <错误码>, message: "<错误信息>" }
 *
 * 支持国际化：通过 Context 中的 locale 自动翻译消息
 */
import type { Context } from 'hono';
import { makeTranslator, detectLocale, DEFAULT_LOCALE } from '../i18n';
import type { LocaleCode, TranslationParams } from '../i18n';

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

// ============================================================
// 内部辅助：从 Context 获取翻译函数
// ============================================================

/**
 * 获取当前请求的翻译函数
 * 若 context 中已缓存 locale，直接使用；否则检测并缓存
 */
function t(c: Context): (key: string, params?: TranslationParams) => string {
    let locale = c.get('locale') as LocaleCode | undefined;
    if (!locale) {
        locale = detectLocale(c);
        c.set('locale', locale);
    }
    let translator = c.get('_translator') as ReturnType<typeof makeTranslator> | undefined;
    if (!translator) {
        translator = makeTranslator(locale || DEFAULT_LOCALE);
        c.set('_translator', translator);
    }
    return (key: string, params?: TranslationParams) => translator!(key, params);
}

// ============================================================
// 响应函数
// ============================================================

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
 * 返回错误响应（自动翻译消息）
 * 对应 GO 后端的 common.ErrorResp / common.ErrorStrResp
 *
 * @param c        Hono Context
 * @param message  翻译键（如 "common.operation_failed"）或明文消息
 * @param httpStatus HTTP 状态码
 * @param params   插值参数（可选，如 { name: "file.txt" }）
 */
export function errorResp(c: Context, message: string, httpStatus: number = 400, params?: TranslationParams): Response {
    const translated = t(c)(message, params);
    return c.json({ code: httpStatus, message: translated } as ErrorBody, httpStatus as any);
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
    return errorResp(c, result.text || 'common.operation_failed', status);
}

/**
 * 将旧格式 {flag, text, data} 转换为新格式，带 token 字段
 * 用于登录接口
 */
export function fromLegacyWithToken(c: Context, result: { flag: boolean; text?: string; data?: any; token?: string; code?: number }): Response {
    if (result.flag) {
        return c.json({ code: 200, message: 'success', data: { token: result.token } } as any, 200);
    }
    const status = result.code === ErrCode.NEED_2FA ? ErrCode.NEED_2FA : ErrCode.UNAUTHORIZED;
    return errorResp(c, result.text || 'common.operation_failed', status);
}

// ============================================================
// 统一错误码常量（与 Go 后端 internal/errs 对齐）
// ============================================================

/** 通用错误码 */
export const ErrCode = {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    SERVICE_UNAVAILABLE: 503,
    /** 需要二次验证（2FA） */
    NEED_2FA: 402,
    /** 对象已存在 */
    OBJECT_EXISTS: 405,
    /** 存储空间不足 */
    INSUFFICIENT_STORAGE: 507,
} as const;

// ============================================================
// 快捷响应方法
// ============================================================

/** 成功响应（别名，与 successResp 等价） */
export function ok(c: Context, data?: any): Response {
    return successResp(c, data);
}

/** 失败响应（别名，与 errorResp 等价） */
export function fail(c: Context, message: string, code: number = 400): Response {
    return errorResp(c, message, code);
}

/** 401 未登录 */
export function unauthorized(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.unauthorized', 401);
}

/** 403 无权限 */
export function forbidden(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.forbidden', 403);
}

/** 404 未找到 */
export function notFound(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.not_found', 404);
}

/** 409 冲突 */
export function conflict(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.conflict', 409);
}

/** 429 请求过于频繁 */
export function tooManyRequests(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.too_many_requests', 429);
}

/** 400 参数错误 */
export function badRequest(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.bad_request', 400);
}

/** 500 服务器内部错误 */
export function internalError(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.internal_error', 500);
}

/** 501 未实现 */
export function notImplemented(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.not_implemented', 501);
}

/** 503 服务不可用 */
export function serviceUnavailable(c: Context, message?: string): Response {
    return errorResp(c, message || 'common.service_unavailable', 503);
}

// ============================================================
// 路径安全校验工具
// ============================================================

/** 路径穿越风险字符 */
const PATH_TRAVERSAL_PATTERN = /\.\./;
/** 绝对路径检测 */
const ABSOLUTE_PATH_PATTERN = /^[a-zA-Z]:\\|^\//;
/** 空字节检测 */
const NULL_BYTE_PATTERN = /\x00/;

/**
 * 校验并规范化路径，拒绝不安全输入
 * @returns 规范化后的路径，或不安全时返回 null
 */
export function sanitizePath(rawPath: string): string | null {
    if (!rawPath || typeof rawPath !== 'string') return null;
    // 拒绝空字节
    if (NULL_BYTE_PATTERN.test(rawPath)) return null;
    // 拒绝路径穿越
    if (PATH_TRAVERSAL_PATTERN.test(rawPath)) return null;
    // 统一反斜杠为正斜杠
    let cleaned = rawPath.replace(/\\/g, '/');
    // 移除多余的连续斜杠
    cleaned = cleaned.replace(/\/{2,}/g, '/');
    // 确保以 / 开头，除非是根路径
    if (!cleaned.startsWith('/')) {
        cleaned = '/' + cleaned;
    }
    // 移除末尾斜杠（保留根路径 /）
    if (cleaned.length > 1 && cleaned.endsWith('/')) {
        cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
}