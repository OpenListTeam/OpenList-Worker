import * as i18n from "@solid-primitives/i18n"
import { createResource, createSignal } from "solid-js"
export { i18n }

// glob search by Vite
const langs = import.meta.glob("../lang/*/index.json", {
  eager: true,
  import: "default",
}) as Record<string, { lang: string }>

// all available languages
export const languages = Object.keys(langs).length > 0
  ? Object.keys(langs).map((langPath) => {
      const parts = langPath.replace(/\\/g, "/").split("/")
      const langCode = parts[parts.length - 2] || "en"
      const langName = langs[langPath].lang
      return { code: langCode, lang: langName }
    })
  : [{ code: "en", lang: "English" }]

// determine browser's default language
const userLang = navigator.language.toLowerCase()
const defaultLang =
  languages.find((lang) => lang.code.toLowerCase() === userLang)?.code ||
  languages.find(
    (lang) => lang.code.toLowerCase().split("-")[0] === userLang.split("-")[0],
  )?.code ||
  "en"

// Get initial language from localStorage or fallback to defaultLang
export let initialLang = localStorage.getItem("lang") ?? defaultLang

if (!languages.some((lang) => lang.code === initialLang)) {
  initialLang = defaultLang
}

// Statically import English dictionary to prevent build-time/runtime loading failures
import enDict from "../lang/en/entry"

export type Lang = string
export type RawDictionary = typeof enDict
export type Dictionary = i18n.Flatten<RawDictionary>

const dictImports = import.meta.glob("../lang/*/entry.ts")

// Fetch and flatten the dictionary with high fault tolerance to prevent app crashes
const fetchDictionary = async (locale: Lang): Promise<Dictionary> => {
  try {
    if (locale === "en") {
      if (!enDict || typeof enDict !== "object") {
        throw new Error("enDict is undefined or invalid")
      }
      return i18n.flatten(enDict as any)
    }

    const importKey = Object.keys(dictImports).find(key => {
      const normalized = key.replace(/\\/g, "/")
      return normalized.endsWith(`/${locale}/entry.ts`)
    })
    const importer = importKey ? dictImports[importKey] : undefined
    if (!importer) {
      console.warn(`Dictionary not found for locale: ${locale}. Falling back to English.`)
      return enDict && typeof enDict === "object" ? i18n.flatten(enDict as any) : {} as any
    }
    const module = (await importer()) as { default: RawDictionary }
    const dict: RawDictionary = module.default
    if (!dict || typeof dict !== "object") {
      console.error(`Loaded dictionary for locale ${locale} is invalid. Falling back to English.`)
      return enDict && typeof enDict === "object" ? i18n.flatten(enDict as any) : {} as any
    }
    return i18n.flatten(dict) // Flatten dictionary for easier access to keys
  } catch (err) {
    console.error(`Error loading dictionary for locale: ${locale}`, err)
    // Always fall back to English dictionary or empty object instead of throwing
    try {
      if (enDict && typeof enDict === "object") {
        return i18n.flatten(enDict as any)
      }
    } catch (_) {}
    return {} as any
  }
}

// Signals to track current language and dictionary state
export const [currentLang, setCurrentLang] = createSignal<Lang>(initialLang)

export const [dict] = createResource(currentLang, fetchDictionary)

export const t = i18n.translator(dict)
