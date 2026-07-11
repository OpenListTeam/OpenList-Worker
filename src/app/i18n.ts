import * as i18n from "@solid-primitives/i18n"
import { createResource, createSignal } from "solid-js"
export { i18n }

// glob search by Vite
const langs = import.meta.glob("~/lang/*/index.json", {
  eager: true,
  import: "default",
}) as Record<string, { lang: string }>

// all available languages
export const languages = Object.keys(langs).map((langPath) => {
  const langCode = langPath.split("/").slice(-2, -1)[0]
  const langName = langs[langPath].lang
  return { code: langCode, lang: langName }
})

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

import { dict as enDict } from "~/lang/en/entry.ts"
import { dict as zhDict } from "~/lang/zh-CN/entry.ts"

const dictionaries: Record<string, typeof enDict> = {
  en: enDict,
  "zh-CN": zhDict,
}

export type Lang = string
export type RawDictionary = typeof enDict
export type Dictionary = i18n.Flatten<RawDictionary>

// Fetch and flatten the dictionary
const fetchDictionary = async (locale: Lang): Promise<Dictionary> => {
  const dict = dictionaries[locale] || enDict
  return i18n.flatten(dict)
}

// Signals to track current language and dictionary state
export const [currentLang, setCurrentLang] = createSignal<Lang>(initialLang)

export const [dict] = createResource(currentLang, fetchDictionary)

export const t = i18n.translator(dict)
