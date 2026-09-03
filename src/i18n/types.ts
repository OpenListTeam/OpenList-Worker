/**
 * i18n 类型定义
 * 所有翻译键的联合类型，确保类型安全
 */

/** 支持的语言代码 */
export type LocaleCode = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR' | 'zh-TW' | 'fr-FR' | 'de-DE' | 'es-ES';

/** 语言显示名称映射 */
export const LOCALE_NAMES: Record<LocaleCode, string> = {
    'zh-CN': '简体中文',
    'en-US': 'English',
    'ja-JP': '日本語',
    'ko-KR': '한국어',
    'zh-TW': '繁體中文',
    'fr-FR': 'Français',
    'de-DE': 'Deutsch',
    'es-ES': 'Español',
};

/** 支持的语言代码列表 */
export const SUPPORTED_LOCALES: LocaleCode[] = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'zh-TW', 'fr-FR', 'de-DE', 'es-ES'];

/** 默认语言 */
export const DEFAULT_LOCALE: LocaleCode = 'zh-CN';

/** 翻译参数字典 */
export type TranslationParams = Record<string, string | number>;

/** 翻译函数类型 */
export type TranslateFn = (key: string, params?: TranslationParams) => string;

/** 翻译包（每种语言的翻译） */
export type TranslationBundle = Record<string, string>;
