/**
 * STRM 生成（对齐 Go 版 internal/media/strm.go）。
 *
 * 输出结构：
 *   video/movie:  <title (year)>/<title (year)>.strm
 *   video/tv   :  <series>/Season 01/<series> S01E02 - <title>.strm
 *   music      :  <artist>/<album>/<02 - title>.strm
 *
 * 模板占位符与 Go 一致：{site_url} {path} {sign} {raw_path} {name}
 */

import { getItem, putItem, listItems } from "../op/storage"
import { encodeDownloadPath } from "../../pkg/path"
import { getJwtSecret } from "../../server/middlewares"
import { signDownloadPath } from "../../pkg/sign"
import {
  settingBool,
  type EpisodeInfo,
  type MediaItem,
  type MediaType,
  type StrmOptions,
} from "./model"
import { getMediaDb, getSettingsMap, listScanPaths } from "./store"

export interface StrmTarget {
  /** 相对输出目录的路径 */
  relPath: string
  /** 媒体文件 VFS 路径 */
  rawPath: string
  /** 同目录模式的 .strm 路径 */
  sameDirPath: string
}

const sanitizeName = (value: string) => {
  let s = String(value || "").trim()
  if (!s) return "Unknown"
  s = s.replace(/[/\\:*?"<>|\n\r]/g, "_")
  if (s.length > 120) s = s.slice(0, 120)
  return s.trim() || "Unknown"
}

const itemTitle = (item: MediaItem) => {
  if (item.scraped_name) return item.scraped_name
  const name = item.file_name || ""
  return item.is_folder ? name : name.replace(/\.[^.]+$/, "")
}

const parseEpisodes = (item: MediaItem): EpisodeInfo[] => {
  if (!item.episodes) return []
  try {
    const list = JSON.parse(item.episodes)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const itemFolder = (item: MediaItem) =>
  (item.folder_path || "/").replace(/\/+$/, "") || "/"

const joinPath = (parts: string[]) =>
  parts
    .filter((p) => p !== "")
    .join("/")
    .replace(/\/+/g, "/")

const strmSibling = (rawPath: string, isDir: boolean) => {
  if (isDir) return `${rawPath.replace(/\/+$/, "")}/${rawPath.split("/").filter(Boolean).pop()}.strm`
  const idx = rawPath.lastIndexOf(".")
  const slash = rawPath.lastIndexOf("/")
  if (idx > slash) return `${rawPath.slice(0, idx)}.strm`
  return `${rawPath}.strm`
}

/** 计算一个条目对应的 STRM 目标（图片/书籍返回空） */
export function buildStrmTargets(item: MediaItem): StrmTarget[] {
  const title = sanitizeName(itemTitle(item))
  const year = (item.release_date || "").slice(0, 4)
  const folder = itemFolder(item)

  if (item.media_type === "video") {
    if (item.video_type === "tv") {
      const series = title
      const season = item.season > 0 ? item.season : 1
      if (item.is_folder) {
        const out: StrmTarget[] = []
        parseEpisodes(item).forEach((ep, idx) => {
          const num = ep.index > 0 ? ep.index : idx + 1
          const epTitle = sanitizeName(ep.title || ep.file_name)
          const epRaw = joinPath([folder, item.file_name, ep.file_name])
          out.push({
            relPath: joinPath([
              series,
              `Season ${String(season).padStart(2, "0")}`,
              `${series} S${String(season).padStart(2, "0")}E${String(num).padStart(2, "0")} - ${epTitle}.strm`,
            ]),
            rawPath: epRaw,
            sameDirPath: strmSibling(epRaw, false),
          })
        })
        return out
      }
      const num = item.episode > 0 ? item.episode : 1
      const raw = joinPath([folder, item.file_name])
      return [
        {
          relPath: joinPath([
            series,
            `Season ${String(season).padStart(2, "0")}`,
            `${series} S${String(season).padStart(2, "0")}E${String(num).padStart(2, "0")}.strm`,
          ]),
          rawPath: raw,
          sameDirPath: strmSibling(raw, false),
        },
      ]
    }
    const name = year ? `${title} (${year})` : title
    const raw = joinPath([folder, item.file_name])
    return [
      {
        relPath: joinPath([name, `${name}.strm`]),
        rawPath: raw,
        sameDirPath: strmSibling(raw, !!item.is_folder),
      },
    ]
  }

  if (item.media_type === "music") {
    const artist = sanitizeName(item.album_artist || "Unknown Artist")
    const album = sanitizeName(item.album_name || "Unknown Album")
    const track = item.track_number > 0 ? item.track_number : 1
    const raw = joinPath([folder, item.file_name])
    return [
      {
        relPath: joinPath([
          artist,
          album,
          `${String(track).padStart(2, "0")} - ${title}.strm`,
        ]),
        rawPath: raw,
        sameDirPath: strmSibling(raw, false),
      },
    ]
  }

  return []
}

/** 渲染 .strm 内容（单行 URL） */
export async function renderStrmContent(
  env: any,
  template: string,
  apiRoot: string,
  rawPath: string,
): Promise<string> {
  const tpl = template || "{site_url}/d{path}?sign={sign}"
  const base = (apiRoot || "").replace(/\/+$/, "")
  const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
  const expires = 0
  let sign = ""
  try {
    sign = await signDownloadPath({ env }, rawPath, expires)
  } catch {
    sign = ""
  }
  const replaced = tpl
    .replace(/\{site_url\}/g, base)
    .replace(/\{raw_path\}/g, p)
    .replace(/\{path\}/g, encodeDownloadPath(p))
    .replace(/\{sign\}/g, encodeURIComponent(sign))
    .replace(/\{name\}/g, p.split("/").filter(Boolean).pop() || "")
  return replaced.trim()
}

export function strmOptionsFromSettings(
  settings: Record<string, string>,
  apiRoot: string,
): StrmOptions {
  return {
    apiRoot: (apiRoot || settings.site_url || "").replace(/\/+$/, ""),
    template: settings.media_strm_template || "{site_url}/d{path}?sign={sign}",
    overwrite: settingBool(settings, "media_strm_overwrite", false),
    sameDir: settingBool(settings, "media_strm_same_dir", true),
    outputPath: (settings.media_strm_path || "/strm").replace(/\/+$/, "") || "/strm",
  }
}

async function exists(env: any, path: string) {
  try {
    await getItem(path, { env })
    return true
  } catch {
    return false
  }
}

/** 为一组条目生成 STRM，返回写入数量 */
export async function generateStrmForItems(
  env: any,
  items: MediaItem[],
  opts: StrmOptions,
): Promise<{ written: number; failed: number }> {
  let written = 0
  let failed = 0
  const outRoot =
    !opts.sameDir && opts.outputPath
      ? "/" + opts.outputPath.replace(/^\/+/, "").replace(/\/+$/, "")
      : ""

  for (const item of items) {
    if (item.hidden) continue
    for (const target of buildStrmTargets(item)) {
      const dst = opts.sameDir ? target.sameDirPath : joinPath([outRoot, target.relPath])
      if (!dst) continue
      // 防目录穿越：relPath 里可能含刮削得到的外部名称
      if (!opts.sameDir) {
        const normalized = "/" + dst.split("/").filter(Boolean).join("/")
        if (outRoot && normalized !== outRoot && !normalized.startsWith(`${outRoot}/`)) {
          continue
        }
      }
      if (!opts.overwrite && (await exists(env, dst))) continue
      try {
        const content = await renderStrmContent(
          env,
          opts.template,
          opts.apiRoot,
          target.rawPath,
        )
        await putItem(dst, new TextEncoder().encode(content) as any, { env })
        written += 1
      } catch (e: any) {
        failed += 1
        console.warn("[media] strm write failed", dst, e?.message || e)
      }
    }
  }
  return { written, failed }
}

/** 按媒体类型（可选扫描路径）批量生成 */
export async function generateStrmForType(
  env: any,
  mediaType: MediaType | "",
  scanPathId = 0,
  apiRoot = "",
): Promise<{ written: number; failed: number; path: string }> {
  const db = await getMediaDb(env)
  const settings = await getSettingsMap(env)
  const opts = strmOptionsFromSettings(settings, apiRoot)
  let items = db.items
  if (scanPathId) items = items.filter((i) => i.scan_path_id === scanPathId)
  if (mediaType) items = items.filter((i) => i.media_type === mediaType)
  const result = await generateStrmForItems(env, items, opts)
  return {
    ...result,
    path: opts.sameDir ? "同目录" : opts.outputPath,
  }
}

/** 扫描结束后按 media_strm_on_scan 自动生成 */
export async function maybeGenerateStrmOnScan(env: any, mediaType: MediaType) {
  const settings = await getSettingsMap(env)
  if (!settingBool(settings, "media_strm_on_scan", false)) return
  const opts = strmOptionsFromSettings(settings, settings.site_url || "")
  if (!opts.sameDir && !opts.outputPath) return
  const result = await generateStrmForType(env, mediaType, 0, opts.apiRoot)
  console.log(
    `[media] strm on scan ${mediaType}: written=${result.written} failed=${result.failed}`,
  )
}

/** 判断扫描路径是否配置了合并模式（供管理端提示） */
export async function describeScanPaths(env: any, type: MediaType) {
  const db = await getMediaDb(env)
  return listScanPaths(db, type).map((p) => ({
    ...p,
    path_merge: !!p.path_merge,
  }))
}

/** 导出：供测试验证 STRM 目标计算 */
export const __strmInternals = { sanitizeName, itemTitle, strmSibling, joinPath }
