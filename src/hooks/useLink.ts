import { objStore, selectedObjs, State, me } from "~/store"
import { Obj, ArchiveObj } from "~/types"
import {
  base_path,
  api,
  encodePath,
  pathDir,
  pathJoin,
  standardizePath,
} from "~/utils"
import { useRouter, useUtil } from "."
import { cookieStorage } from "@solid-primitives/storage"

// 获取 JWT token（token 存储在 sessionStorage/localStorage 中）
function getAuthToken(): string {
  try {
    return (
      sessionStorage.getItem("token") || localStorage.getItem("token") || ""
    )
  } catch {
    return ""
  }
}

type URLType = "preview" | "direct" | "proxy"

// get download url by dir and obj
export const getLinkByDirAndObj = (
  dir: string,
  obj: Obj,
  type: URLType = "direct",
  isShare: boolean,
  encodeAll?: boolean,
) => {
  if (type !== "preview")
    dir = isShare
      ? dir.substring(3) /* remove /@s */
      : pathJoin(me().base_path, dir)

  dir = standardizePath(dir, true)
  let path = `${dir}/${obj.name}`
  path = encodePath(path, encodeAll)
  let host = api
  let prefix = isShare ? "/sd" : type === "direct" ? "/d" : "/p"
  if (type === "preview") {
    prefix = ""
    if (!api.startsWith(location.origin + base_path))
      host = location.origin + base_path
  }
  const { inner_path, archive, pass: archive_pass } = obj as ArchiveObj
  if (archive) {
    prefix = "/ae"
    path = `${dir}/${archive.name}`
    path = encodePath(path, encodeAll)
  }
  let QP = () => {
    QP = () => "&"
    return "?"
  }
  let ans = `${host}${prefix}${path}`
  if (type !== "preview" && !isShare && obj.sign) {
    ans += `${QP()}sign=${obj.sign}`
  }
  if (type !== "preview" && isShare) {
    const pwd = cookieStorage.getItem("browser-password") || ""
    if (pwd) {
      ans += `${QP()}pwd=${pwd}`
    }
  }
  if (archive) {
    let inner = `${inner_path}/${obj.name}`
    ans += `${QP()}inner=${encodePath(inner, encodeAll)}${archive_pass ? `&pass=${encodeURIComponent(archive_pass)}` : ""}`
  }
  // 非分享链接且非预览链接时，添加 JWT token 作为 query parameter
  if (type !== "preview" && !isShare) {
    const token = getAuthToken()
    if (token) {
      ans += `${QP()}token=${encodeURIComponent(token)}`
    }
  }
  return ans
}

// get download link by current state and pathname
export const useLink = () => {
  const { pathname, isShare } = useRouter()
  const getLinkByObj = (obj: Obj, type?: URLType, encodeAll?: boolean) => {
    let dir: string
    if (objStore.state === State.File) {
      dir = pathDir(pathname())
      if (isShare() && dir === "/@s") {
        dir = pathname()
        obj = { ...obj, name: "" }
      }
    } else {
      dir = pathname()
    }
    return getLinkByDirAndObj(dir, obj, type, isShare(), encodeAll)
  }
  const rawLink = (obj: Obj, encodeAll?: boolean) => {
    return getLinkByObj(obj, "direct", encodeAll)
  }
  return {
    getLinkByObj: getLinkByObj,
    rawLink: rawLink,
    proxyLink: (obj: Obj, encodeAll?: boolean) => {
      return getLinkByObj(obj, "proxy", encodeAll)
    },
    previewPage: (obj: Obj, encodeAll?: boolean) => {
      return getLinkByObj(obj, "preview", encodeAll)
    },
    currentObjLink: (encodeAll?: boolean) => {
      return rawLink(objStore.obj, encodeAll)
    },
  }
}

export const useSelectedLink = () => {
  const { previewPage, rawLink: rawUrl, proxyLink } = useLink()
  const rawLinks = (encodeAll?: boolean) => {
    return selectedObjs()
      .filter((obj) => !obj.is_dir)
      .map((obj) => rawUrl(obj, encodeAll))
  }
  const proxyLinks = (encodeAll?: boolean) => {
    return selectedObjs()
      .filter((obj) => !obj.is_dir)
      .map((obj) => proxyLink(obj, encodeAll))
  }
  return {
    rawLinks: rawLinks,
    proxyLinks: proxyLinks,
    previewPagesText: () => {
      return selectedObjs()
        .map((obj) => previewPage(obj, true))
        .join("\n")
    },
    rawLinksText: (encodeAll?: boolean) => {
      return rawLinks(encodeAll).join("\n")
    },
  }
}

export const useCopyLink = () => {
  const { copy } = useUtil()
  const { previewPagesText, rawLinksText } = useSelectedLink()
  const { currentObjLink } = useLink()
  return {
    copySelectedPreviewPage: () => {
      copy(previewPagesText())
    },
    copySelectedRawLink: (encodeAll?: boolean) => {
      copy(rawLinksText(encodeAll))
    },
    copyCurrentRawLink: (encodeAll?: boolean) => {
      copy(currentObjLink(encodeAll))
    },
  }
}
