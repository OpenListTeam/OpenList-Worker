/**
 * 媒体扫描：遍历配置的 VFS 路径，把文件写入媒体库。
 *
 * 注意：扫描在 Worker 请求内执行，受 CPU/时间限制。这里限制深度与条目数，
 * 超大媒体库建议分批配置多个扫描路径分别扫描。
 */

import { listItems } from "../op/storage"
import {
  extOf,
  isBookFile,
  isImageFile,
  isMusicFile,
  isVideoFile,
  mediaTypeOfFile,
  type MediaType,
} from "./model"
import { getMediaDb, isTypeEnabled, saveMediaDb, upsertItem } from "./store"

const MAX_DEPTH = 12
const MAX_ITEMS = 20000

export interface ScanProgress {
  media_type: MediaType
  scan_path_id: number
  running: boolean
  total: number
  current: number
  message: string
  started_at: string
  finished_at: string
}

const progressMap = new Map<string, ScanProgress>()

const progressKey = (type: MediaType, scanPathId: number) =>
  `${type}:${scanPathId}`

export const getScanProgress = (type: MediaType, scanPathId = 0) => {
  if (scanPathId) {
    return (
      progressMap.get(progressKey(type, scanPathId)) || {
        media_type: type,
        scan_path_id: scanPathId,
        running: false,
        total: 0,
        current: 0,
        message: "",
        started_at: "",
        finished_at: "",
      }
    )
  }
  // 返回该类型最近一次扫描进度
  let latest: ScanProgress | undefined
  for (const [key, p] of progressMap) {
    if (!key.startsWith(`${type}:`)) continue
    if (!latest || p.started_at > latest.started_at) latest = p
  }
  return (
    latest || {
      media_type: type,
      scan_path_id: 0,
      running: false,
      total: 0,
      current: 0,
      message: "",
      started_at: "",
      finished_at: "",
    }
  )
}

interface WalkFile {
  path: string
  name: string
  size: number
  modified: string
}

const joinPath = (dir: string, name: string) =>
  `${dir.replace(/\/+$/, "")}/${name}`.replace(/\/+/g, "/")

async function walk(
  env: any,
  root: string,
  type: MediaType,
  opts: { collect: (file: WalkFile) => void; aggregateDirs: boolean },
  depth = 0,
) {
  if (depth > MAX_DEPTH) return
  let content: any[] = []
  try {
    const res = await listItems(root, { env })
    content = res.content || []
  } catch (e: any) {
    console.warn(`[media] list ${root} failed:`, e?.message || e)
    return
  }
  const files = content.filter((i) => !i.is_dir)
  const dirs = content.filter((i) => i.is_dir)

  const matching = files.filter((f) => mediaTypeOfFile(f.name) === type)
  if (opts.aggregateDirs && type === "video" && matching.length >= 2) {
    // 目录聚合：一个文件夹视为一个条目，里面所有视频作为选集
    const episodes = matching
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
      .map((f, idx) => ({
        index: idx + 1,
        title: f.name.replace(/\.[^.]+$/, ""),
        file_name: f.name,
      }))
    opts.collect({
      path: root,
      name: root.split("/").filter(Boolean).pop() || root,
      size: matching.reduce((sum, f) => sum + (Number(f.size) || 0), 0),
      modified: matching[0]?.modified || "",
      ...({ episodes } as any),
      ...({ aggregated: true } as any),
    } as any)
  } else {
    for (const f of matching) {
      opts.collect({
        path: root,
        name: f.name,
        size: Number(f.size) || 0,
        modified: f.modified || "",
      })
    }
  }

  for (const dir of dirs) {
    if (dir.name.startsWith(".")) continue
    await walk(env, joinPath(root, dir.name), type, opts, depth + 1)
  }
}

export async function scanMedia(
  env: any,
  type: MediaType,
  scanPathId = 0,
): Promise<{ scanned: number; created: number; updated: number }> {
  const db = await getMediaDb(env)
  if (!isTypeEnabled(db, type)) {
    throw new Error(`media type ${type} is disabled`)
  }
  const paths = db.scan_paths.filter(
    (p) => p.media_type === type && (!scanPathId || p.id === scanPathId),
  )
  let scanned = 0
  let created = 0
  let updated = 0

  for (const sp of paths) {
    const key = progressKey(type, sp.id)
    const progress: ScanProgress = {
      media_type: type,
      scan_path_id: sp.id,
      running: true,
      total: 0,
      current: 0,
      message: "scanning",
      started_at: new Date().toISOString(),
      finished_at: "",
    }
    progressMap.set(key, progress)

    const files: any[] = []
    await walk(
      env,
      sp.path,
      type,
      {
        aggregateDirs: type === "video",
        collect: (file: any) => {
          if (files.length < MAX_ITEMS) files.push(file)
        },
      },
      0,
    )
    progress.total = files.length

    for (const file of files) {
      progress.current += 1
      const folder = file.path.replace(/\/+$/, "") || "/"
      const isAgg = !!file.aggregated
      const name = file.name
      const existing = db.items.find(
        (i) =>
          i.folder_path === folder &&
          i.file_name === name &&
          i.media_type === type,
      )
      const albumName =
        type === "music" ? folder.split("/").filter(Boolean).pop() || "" : ""
      const albumArtist = type === "music" ? "" : ""
      const data = {
        media_type: type,
        scan_path_id: sp.id,
        folder_path: folder,
        file_name: name,
        scraped_name: existing?.scraped_name || name.replace(/\.[^.]+$/, ""),
        cover: existing?.cover || "",
        authors: existing?.authors || "",
        plot: existing?.plot || "",
        description: existing?.description || "",
        genre: existing?.genre || "",
        release_date: existing?.release_date || "",
        rating: existing?.rating || 0,
        file_size: file.size || 0,
        duration: existing?.duration || 0,
        season: existing?.season || 0,
        episode: existing?.episode || 0,
        episodes: isAgg
          ? JSON.stringify(file.episodes || [])
          : existing?.episodes || "",
        album_name: existing?.album_name || albumName,
        album_artist: existing?.album_artist || albumArtist,
        track_number: existing?.track_number || 0,
        publisher: existing?.publisher || "",
        isbn: existing?.isbn || "",
        external_id: existing?.external_id || "",
        hidden: existing?.hidden || false,
        scraper_source: existing?.scraper_source || "",
      }
      if (existing) {
        Object.assign(existing, {
          ...data,
          updated_at: new Date().toISOString(),
        })
        updated += 1
      } else {
        upsertItem(db, data)
        created += 1
      }
      scanned += 1
    }
    progress.message = "done"
    progress.running = false
    progress.finished_at = new Date().toISOString()
    await saveMediaDb(env, db)
  }
  return { scanned, created, updated }
}

export function isImageExt(name: string) {
  return isImageFile(name)
}
export function isBookExt(name: string) {
  return isBookFile(name)
}
export function isMusicExt(name: string) {
  return isMusicFile(name)
}
export function isVideoExt(name: string) {
  return isVideoFile(name)
}
export function extName(name: string) {
  return extOf(name)
}
