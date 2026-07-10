import { i18n, t } from "~/app/i18n"
import { firstUpperCase } from "~/utils"

export const useT = () => {
  return (
    key: string,
    params?: i18n.BaseTemplateArgs | undefined,
    defaultValue?: string | undefined,
  ): string => {
    const translatedValue = (t as any)(key, params)

    if (typeof translatedValue === "string") return translatedValue
    if (defaultValue) return defaultValue
    if (import.meta.env.DEV) return key

    return formatKeyAsDisplay(key)
  }
}

const formatKeyAsDisplay = (key: string): string => {
  let lastDotIndex = key.lastIndexOf(".")
  if (lastDotIndex === key.length - 1) {
    lastDotIndex = key.lastIndexOf(".", lastDotIndex - 1)
  }
  const last = key.slice(lastDotIndex + 1)
  return firstUpperCase(last).split("_").join(" ")
}
