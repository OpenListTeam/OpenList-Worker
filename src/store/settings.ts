import { createStore } from "solid-js/store"
import { ext, recordToArray, strToRegExp } from "~/utils"

const [settings, setSettingsStore] = createStore<Record<string, string>>({})

const injectCustomContent = (
  containerId: string,
  content: string | undefined,
  parent: HTMLElement | null,
) => {
  if (typeof document === "undefined" || !parent) return
  let container = document.getElementById(containerId)
  if (!container) {
    container = document.createElement("div")
    container.id = containerId
    parent.appendChild(container)
  }
  container.innerHTML = ""
  if (!content || !content.trim()) return

  try {
    const range = document.createRange()
    range.selectNode(container)
    const fragment = range.createContextualFragment(content)

    // Re-create script elements so that the browser executes them
    const scripts = Array.from(fragment.querySelectorAll("script"))
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script")
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value)
      })
      newScript.textContent = oldScript.textContent
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    })

    container.appendChild(fragment)
  } catch (err) {
    console.error(`Failed to inject custom content for #${containerId}:`, err)
  }
}

export const setSettings = (items: Record<string, string>) => {
  setSettingsStore(items)
  const version = settings["version"] || "Unknown"
  console.log(
    `%c OpenListNext %c ${version} %c https://github.com/OpenListTeam/OpenList`,
    "color: #fff; background: #5f5f5f",
    "color: #fff; background: #70c6be",
    "",
  )

  if (typeof document !== "undefined") {
    if (settings["customize_head"] !== undefined) {
      injectCustomContent(
        "customize-head",
        settings["customize_head"],
        document.head,
      )
    }
    if (settings["customize_body"] !== undefined) {
      injectCustomContent(
        "customize-body",
        settings["customize_body"],
        document.body,
      )
    }
  }
}

export const getSetting = (key: string) => settings[key] ?? ""
export const getSettingBool = (key: string) => {
  const value = getSetting(key)
  return value === "true" || value === "1"
}
export const getSettingNumber = (key: string, defaultV?: number) => {
  const value = getSetting(key)
  if (value) {
    const num = Math.floor(Number(value))
    if (!isNaN(num) && num >= 1) {
      return num
    }
  }
  return defaultV ?? 0
}
export const getMainColor = (): string => {
  if (window.OPENLISTNEXT_CONFIG.main_color) {
    return window.OPENLISTNEXT_CONFIG.main_color
  }
  return getSetting("main_color") || "#1890ff"
}

/**
 * like this:
{
  "ppt,pptx":{
    "example1":"https://example1.com/ppt?url=$url",
    "example2":"https://example2.com/ppt?url=$url"
  }
}
 */

type Previews = Record<string, Record<string, string>>
let previewsRecord: Record<string, Previews> = {}
type PreviewsType = "external_previews" | "iframe_previews"

const getPreviews = (type: PreviewsType): Previews => {
  if (!previewsRecord[type]) {
    try {
      const setting = getSetting(type)
      if (!setting) {
        previewsRecord[type] = {}
      } else {
        previewsRecord[type] = JSON.parse(setting)
      }
    } catch (e) {
      console.error(`failed parse ${type}, use default`, e)
      previewsRecord[type] = {}
    }
  }
  return previewsRecord[type]
}

const getPreviewsByName = (name: string, type: PreviewsType) => {
  const extension = ext(name).toLowerCase()
  const res: { key: string; value: string }[] = []
  for (const key in getPreviews(type)) {
    if (key.startsWith("/")) {
      const reg = strToRegExp(key)
      if (reg.test(extension)) {
        res.push(...recordToArray(getPreviews(type)[key]))
      }
    } else if (key.split(",").includes(extension)) {
      res.push(...recordToArray(getPreviews(type)[key]))
    }
  }
  return res
}

export const getExternalPreviews = (name: string) =>
  getPreviewsByName(name, "external_previews")
export const getIframePreviews = (name: string) =>
  getPreviewsByName(name, "iframe_previews")

export const getPagination = (): {
  size: number
  type: "all" | "pagination" | "load_more" | "auto_load_more"
} => {
  const rawSize = getSettingNumber("default_page_size", 20)
  return {
    type: (getSetting("pagination_type") || "pagination") as any,
    size: rawSize >= 1 ? rawSize : 20,
  }
}

let hideFiles: RegExp[]

export const getHideFiles = () => {
  if (!hideFiles) {
    hideFiles = getSetting("hide_files")
      .split(/\n/g)
      .filter((item) => !!item.trim())
      .map((item) => {
        item = item.trim()
        let str = item.replace(/^\/(.*)\/([a-z]*)$/, "$1")
        let args = item.replace(/^\/(.*)\/([a-z]*)$/, "$2")
        return new RegExp(str, args)
      })
  }
  return hideFiles
}
