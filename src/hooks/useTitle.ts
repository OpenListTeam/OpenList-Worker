import { createEffect, onCleanup } from "solid-js"
import { getSetting } from "~/store"
import { pathBase } from "~/utils"
import { useRouter } from "./useRouter"
import { useT } from "./useT"

let id = 0
const effects: Record<string, boolean> = {}

const useTitle = (title: string | (() => string)) => {
  const cid = (id++).toString()
  const valids: string[] = []
  for (const key in effects) {
    if (effects[key]) {
      valids.push(key)
      effects[key] = false
    }
  }
  effects[cid] = true
  const pre = document.title
  if (typeof title === "function") {
    createEffect(() => {
      if (effects[cid]) {
        document.title = title()
      }
    })
  } else {
    document.title = title
  }
  onCleanup(() => {
    // document.title = pre;
    delete effects[cid]
    for (const key in valids) {
      effects[key] = true
    }
  })
}

export const useObjTitle = () => {
  const { pathname } = useRouter()
  useTitle(() =>
    pathname() === "/"
      ? getSetting("site_title")
      : `${pathBase(pathname())} | ${getSetting("site_title")}`,
  )
}

export const useManageTitle = (title: string) => {
  const t = useT()
  useTitle(() => `${t(title)} | ${t("manage.title")}`)
}

export { useTitle }
