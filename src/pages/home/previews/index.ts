import { Component, lazy } from "solid-js"
import { getIframePreviews, me, getSettingBool, isArchive } from "~/store"
import { Obj, ObjType, UserMethods, UserPermissions, ArchiveObj } from "~/types"
import { ext } from "~/utils"
import { generateIframePreview } from "./iframe"
import { useRouter, useT } from "~/hooks"

type Ext = string[] | "*" | ((name: string) => boolean)
type Prior = boolean | (() => boolean)

const extsContains = (exts: Ext | undefined, name: string): boolean => {
  if (exts === undefined) {
    return false
  } else if (exts === "*") {
    return true
  } else if (typeof exts === "function") {
    return (exts as (name: string) => boolean)(name)
  } else {
    return (exts as string[]).includes(ext(name).toLowerCase())
  }
}

const isPrior = (p: Prior): boolean => {
  if (typeof p === "boolean") {
    return p
  }
  return p()
}

export interface Preview {
  key: string
  type?: ObjType
  exts?: Ext
  provider?: RegExp
  component: Component
  prior: Prior
  availableInArchive?: boolean
}

export interface PreviewComponent {
  key: string
  name: string
  component: Component
}

const previews: Preview[] = [
  {
    key: "html",
    exts: ["html"],
    component: lazy(() => import("./html")),
    prior: true,
  },
  {
    key: "aliyun_video",
    type: ObjType.VIDEO,
    provider: /^Aliyundrive(Open)?$/,
    component: lazy(() => import("./aliyun_video")),
    prior: true,
  },
  {
    key: "markdown",
    type: ObjType.TEXT,
    component: lazy(() => import("./markdown")),
    prior: true,
  },
  {
    key: "flash",
    exts: ["swf"],
    component: lazy(() => import("./flash")),
    prior: true,
  },
  {
    key: "markdown_with_word_wrap",
    type: ObjType.TEXT,
    component: lazy(() => import("./markdown_with_word_wrap")),
    prior: true,
  },
  {
    key: "url_open",
    exts: ["url"],
    component: lazy(() => import("./url")),
    prior: true,
  },
  {
    key: "text_editor",
    type: ObjType.TEXT,
    exts: ["url"],
    component: lazy(() => import("./text-editor")),
    prior: true,
    availableInArchive: false,
  },
  {
    key: "image",
    type: ObjType.IMAGE,
    exts: ["heic", "heif", "avif", "vvc", "avc"], // libheif
    component: lazy(() => import("./image")),
    prior: true,
  },
  {
    key: "video",
    type: ObjType.VIDEO,
    component: lazy(() => import("./video")),
    prior: true,
  },
  {
    key: "audio",
    type: ObjType.AUDIO,
    component: lazy(() => import("./audio")),
    prior: true,
  },
  {
    key: "ipa",
    exts: ["ipa", "tipa"],
    component: lazy(() => import("./ipa")),
    prior: true,
  },
  {
    key: "plist",
    exts: ["plist"],
    component: lazy(() => import("./plist")),
    prior: true,
  },

  ...(import.meta.env.VITE_LITE === "true"
    ? []
    : [
        {
          key: "pdf",
          exts: ["pdf"],
          component: lazy(() => import("./pdf")),
          prior: true,
        },
      ]),
  {
    key: "ppt",
    exts: ["pptx"],
    component: lazy(() => import("./ppt")),
    prior: true,
  },
  {
    key: "xls",
    exts: ["xlsx"],
    component: lazy(() => import("./xls")),
    prior: true,
  },
  {
    key: "doc",
    exts: ["docx"],
    component: lazy(() => import("./doc")),
    prior: true,
  },
  {
    key: "asciinema",
    exts: ["cast"],
    component: lazy(() => import("./asciinema")),
    prior: true,
  },
  {
    key: "video360",
    type: ObjType.VIDEO,
    component: lazy(() => import("./video360")),
    prior: true,
  },
  {
    key: "torrent",
    exts: ["torrent"],
    component: lazy(() => import("./torrent")),
    prior: true,
  },
  {
    key: "archive",
    exts: (name: string) => {
      const index = UserPermissions.findIndex(
        (item) => item === "read_archives",
      )
      const { isShare } = useRouter()
      if (!isShare() && !UserMethods.can(me(), index)) return false
      if (isShare() && !getSettingBool("share_archive_preview")) return false
      return isArchive(name)
    },
    component: lazy(() => import("./archive")),
    prior: () => {
      const { isShare } = useRouter()
      return (
        (!isShare() &&
          getSettingBool("preview_archives_by_default") &&
          !getSettingBool("preview_download_by_default")) ||
        (isShare() &&
          getSettingBool("share_preview_archives_by_default") &&
          !getSettingBool("share_preview_download_by_default"))
      )
    },
    availableInArchive: false,
  },
]

export const getPreviews = (
  file: Obj & { provider: string },
): PreviewComponent[] => {
  const { searchParams, isShare } = useRouter()
  const t = useT()
  const typeOverride =
    ObjType[searchParams["type"]?.toUpperCase() as keyof typeof ObjType]
  const res: PreviewComponent[] = []
  const subsequent: PreviewComponent[] = []
  const downloadPrior =
    (!isShare() && getSettingBool("preview_download_by_default")) ||
    (isShare() && getSettingBool("share_preview_download_by_default"))
  const isInArchive = !!(file as ArchiveObj).archive
  // internal previews
  if (!isShare() || getSettingBool("share_preview")) {
    previews.forEach((preview) => {
      if (preview.provider && !preview.provider.test(file.provider)) {
        return
      }
      if (
        preview.type === file.type ||
        (typeOverride && preview.type === typeOverride) ||
        extsContains(preview.exts, file.name)
      ) {
        const r = {
          key: preview.key,
          name: t(`home.preview.names.${preview.key}`),
          component: preview.component,
        }
        // Skip previews that are not available in archive when file is in archive
        if (isInArchive && preview.availableInArchive === false) {
          return
        }
        if (!downloadPrior && isPrior(preview.prior)) {
          res.push(r)
        } else {
          subsequent.push(r)
        }
      }
    })
  }
  // iframe previews
  const iframePreviews = getIframePreviews(file.name)
  const matchedIframePreviews = iframePreviews.map((preview) => ({
    key: `iframe-${preview.key}`,
    name: preview.key, // TODO: Add name field to backend
    component: generateIframePreview(preview.value),
  }))
  // Condition for iframe previews to respect the "preview_download_by_default" setting
  if (downloadPrior) {
    subsequent.push(...matchedIframePreviews)
  } else {
    res.push(...matchedIframePreviews)
  }

  // download page
  const downloadComponent: PreviewComponent = {
    key: "download",
    name: t("home.preview.names.download"),
    component: lazy(() => import("./download")),
  }

  // Condition for the new requirement: a large text file.
  const isLargeTextFile =
    file.type === ObjType.TEXT && file.size >= 1 * 1024 * 1024

  // Conditions from the previous logic for small, unrecognized files.
  const noPreviewsFound = res.length === 0 && subsequent.length === 0
  const isSmallFile = file.size < 1 * 1024 * 1024

  if (isLargeTextFile) {
    // Case 1: Large text file. Place "Download" at the very beginning.
    // The standard text previews (Markdown, etc.) are already in `res` and will appear after it.
    res.unshift(downloadComponent)
  } else if (noPreviewsFound && isSmallFile) {
    // Case 2: No other previews found for a small file.
    // Add "Download" first, then suggest default text previews.
    res.push(downloadComponent)
    if (!isShare() || getSettingBool("share_preview")) {
      const textPreviewsToAdd = previews
        .filter((p) =>
          ["markdown", "markdown_with_word_wrap", "text_editor"].includes(
            p.key,
          ),
        )
        .map((p) => ({
          key: p.key,
          name: t(`home.preview.names.${p.key}`),
          component: p.component,
        }))
      res.push(...textPreviewsToAdd)
    }
  } else {
    // Case 3: The "normal" case for all other files (images, videos, small text files, etc.).
    // Add "Download" as the last fallback option in the high-priority list.
    res.push(downloadComponent)
  }
  return res.concat(subsequent)
}
