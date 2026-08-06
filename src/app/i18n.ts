import * as i18n from "@solid-primitives/i18n"
import { createResource, createSignal, createRoot } from "solid-js"
export { i18n }

// Statically import English and Chinese dictionaries to guarantee build-time/runtime bundling
import enDict from "../lang/en/entry"
import zhCNDict from "../lang/zh-CN/entry"

// Glob search by Vite for index.json descriptors
const rawLangs = import.meta.glob("../lang/*/index.json", {
  eager: true,
}) as Record<string, any>

const globLanguages = Object.keys(rawLangs).map((langPath) => {
  const parts = langPath.replace(/\\/g, "/").split("/")
  const langCode = parts[parts.length - 2] || "en"
  const item = rawLangs[langPath]
  const langName =
    item?.default?.lang ||
    item?.lang ||
    (langCode.startsWith("zh") ? "简体中文" : langCode)
  return { code: langCode, lang: langName }
})

const defaultLanguages = [
  { code: "en", lang: "English" },
  { code: "zh-CN", lang: "简体中文" },
]

// Merge & deduplicate by language code & display name
const langMap = new Map<string, { code: string; lang: string }>()
for (const l of defaultLanguages) {
  langMap.set(l.code, l)
}
for (const l of globLanguages) {
  if (l.code && l.lang) {
    const canonicalCode = l.code.toLowerCase().startsWith("zh")
      ? "zh-CN"
      : l.code
    if (!langMap.has(canonicalCode)) {
      langMap.set(canonicalCode, { code: canonicalCode, lang: l.lang })
    }
  }
}

export const languages = Array.from(langMap.values())

// Determine browser's default language
const userLang = navigator.language.toLowerCase()
const defaultLang =
  languages.find((lang) => lang.code.toLowerCase() === userLang)?.code ||
  languages.find(
    (lang) => lang.code.toLowerCase().split("-")[0] === userLang.split("-")[0],
  )?.code ||
  "zh-CN"

// Get initial language from localStorage or fallback to defaultLang
export let initialLang = localStorage.getItem("lang") ?? defaultLang

if (
  initialLang === "zh" ||
  initialLang === "zh_CN" ||
  initialLang === "zh-cn"
) {
  initialLang = "zh-CN"
}

if (!languages.some((lang) => lang.code === initialLang)) {
  initialLang = defaultLang
}

export type Lang = string
export type RawDictionary = typeof enDict
export type Dictionary = i18n.Flatten<RawDictionary>

const dictImports = import.meta.glob("../lang/*/entry.ts")

// Fetch and flatten the dictionary with high fault tolerance
const fetchDictionary = async (locale: Lang): Promise<any> => {
  try {
    const loc = (locale || "zh-CN").toLowerCase()
    if (loc === "en") {
      return i18n.flatten(enDict as any) as any
    }
    if (loc === "zh-cn" || loc === "zh_cn" || loc === "zh") {
      return i18n.flatten(zhCNDict as any) as any
    }

    const importKey = Object.keys(dictImports).find((key) => {
      const normalized = key.replace(/\\/g, "/").toLowerCase()
      return normalized.endsWith(`/${loc}/entry.ts`)
    })
    const importer = importKey ? dictImports[importKey] : undefined
    if (!importer) {
      console.warn(`Dictionary not found for locale: ${locale}. Falling back.`)
      const fallback = loc.startsWith("zh") ? zhCNDict : enDict
      return i18n.flatten(fallback as any) as any
    }
    const module = (await importer()) as { default: RawDictionary }
    const dictObj = module.default
    if (!dictObj || typeof dictObj !== "object") {
      const fallback = loc.startsWith("zh") ? zhCNDict : enDict
      return i18n.flatten(fallback as any) as any
    }
    return i18n.flatten(dictObj as any) as any
  } catch (err) {
    console.error(`Error loading dictionary for locale: ${locale}`, err)
    const fallback = (locale || "").toLowerCase().startsWith("zh")
      ? zhCNDict
      : enDict
    return i18n.flatten(fallback as any) as any
  }
}

// Signals to track current language and dictionary state
export const [currentLang, setCurrentLang] = createSignal<Lang>(initialLang)

export const { dict, t } = createRoot(() => {
  const [dict] = createResource(currentLang, fetchDictionary)
  const t = i18n.translator(dict, i18n.resolveTemplate)
  return { dict, t }
})
