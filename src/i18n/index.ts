/**
 * i18n 国际化核心模块
 *
 * 特性：
 *   - 零外部依赖，纯 TypeScript 实现
 *   - 支持嵌套键（点号分隔，如 "auth.login_failed"）
 *   - 支持参数插值（{{param}} 语法）
 *   - 语言检测：查询参数 → 用户偏好 → Accept-Language → 默认语言
 *   - 回退链：请求语言 → 默认语言(zh-CN) → 键名本身
 */
import type { Context } from 'hono';
import { zhCN } from './locales/zh-CN';
import { enUS } from './locales/en-US';
import { jaJP } from './locales/ja-JP';
import { koKR } from './locales/ko-KR';
import { zhTW } from './locales/zh-TW';
import { frFR } from './locales/fr-FR';
import { deDE } from './locales/de-DE';
import { esES } from './locales/es-ES';
import type { LocaleCode, TranslateFn, TranslationBundle, TranslationParams } from './types';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types';

// ============================================================
// 翻译包注册表
// ============================================================
const bundles: Record<LocaleCode, TranslationBundle> = {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP,
    'ko-KR': koKR,
    'zh-TW': zhTW,
    'fr-FR': frFR,
    'de-DE': deDE,
    'es-ES': esES,
};

// ============================================================
// 语言检测
// ============================================================

/**
 * Accept-Language 头解析
 * 示例: "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7" → ["ja-JP", "ja", "en-US", "en"]
 */
function parseAcceptLanguage(header: string): string[] {
    return header
        .split(',')
        .map(part => {
            const [lang, qStr] = part.trim().split(';q=');
            return { lang: lang.trim(), q: qStr ? parseFloat(qStr) : 1.0 };
        })
        .sort((a, b) => b.q - a.q)
        .map(item => item.lang);
}

/**
 * 将 BCP47 语言标签匹配到支持的语言
 */
function matchLocale(candidate: string): LocaleCode | null {
    const normalized = candidate.toLowerCase().replace('_', '-');

    // 精确匹配
    if (SUPPORTED_LOCALES.includes(normalized as LocaleCode)) {
        return normalized as LocaleCode;
    }

    // 模糊匹配（主语言匹配）
    const primaryLang = normalized.split('-')[0];
    for (const locale of SUPPORTED_LOCALES) {
        if (locale.toLowerCase().startsWith(primaryLang)) {
            return locale;
        }
    }
    return null;
}

/**
 * 从请求上下文中检测最佳语言
 * 优先级：查询参数 lang → 用户偏好 → Accept-Language 头 → 默认语言
 */
export function detectLocale(c: Context): LocaleCode {
    // 1. 查询参数 ?lang=xx
    const queryLang = c.req.query('lang');
    if (queryLang) {
        const matched = matchLocale(queryLang);
        if (matched) return matched;
    }

    // 2. 用户偏好（从数据库中读取）
    const user = c.get('user');
    if (user?.language) {
        const matched = matchLocale(user.language);
        if (matched) return matched;
    }

    // 3. Accept-Language 请求头
    const acceptLang = c.req.header('Accept-Language');
    if (acceptLang) {
        const candidates = parseAcceptLanguage(acceptLang);
        for (const candidate of candidates) {
            const matched = matchLocale(candidate);
            if (matched) return matched;
        }
    }

    // 4. 默认语言
    return DEFAULT_LOCALE;
}

/**
 * 从请求上下文获取翻译函数
 */
export function getTranslator(c: Context): TranslateFn {
    const locale = (c.get('locale') as LocaleCode) || detectLocale(c);
    // 缓存 locale 到上下文，避免重复检测
    c.set('locale', locale);
    return makeTranslator(locale);
}

/**
 * 创建指定语言的翻译函数
 */
export function makeTranslator(locale: LocaleCode): TranslateFn {
    const bundle = bundles[locale] || bundles[DEFAULT_LOCALE];
    const fallback = bundles[DEFAULT_LOCALE];

    return (key: string, params?: TranslationParams): string => {
        // 1. 查找当前语言翻译
        let text: string | undefined = bundle[key];
        // 2. 回退到默认语言
        if (text === undefined && fallback && locale !== DEFAULT_LOCALE) {
            text = fallback[key];
        }
        // 3. 回退到键名本身
        if (text === undefined) {
            text = key;
        }
        // 4. 参数插值 {{param}}
        if (params) {
            text = text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
                const val = params[name];
                return val !== undefined ? String(val) : `{{${name}}}`;
            });
        }
        return text;
    };
}

/**
 * 语言检测中间件
 * 在每个请求中检测语言并缓存到上下文
 */
export async function i18nMiddleware(c: Context, next: Function): Promise<any> {
    const locale = detectLocale(c);
    c.set('locale', locale);
    await next();
}

// ============================================================
// 便捷导出
// ============================================================
export { DEFAULT_LOCALE, SUPPORTED_LOCALES };
export type { LocaleCode, TranslateFn, TranslationParams };
