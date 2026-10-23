/**
 * Emby / OpenSubsonic 兼容层（对齐 Go 版 server/handles/emby*.go、subsonic*.go）。
 *
 * 已覆盖 Go 侧最新的协议修复：
 *   - PlaybackInfo 的 Path / DirectStreamUrl 必须是可播放的 HTTP 流地址，
 *     且带 api_key（否则客户端报 "Playback of this content is currently restricted"）；
 *   - 封面/图片端点允许匿名访问（Emby 客户端的图片 URL 不带 token）；
 *   - Sessions/Playing* 真正落播放进度、已看与收藏；
 *   - 剧集按 Series → Season → Episode 三层组织；
 *   - Subsonic 默认输出 XML，支持 f=json/jsonp 与 POST 表单；
 *   - 认证失败按 IP + 用户名限流。
 */

import { Hono } from "hono"

import { getDb } from "../internal/model/db"
import { twoStepHash } from "../pkg/password"
import { md5 as md5Hex } from "../pkg/crypto"
import { encodeDownloadPath } from "../pkg/path"
import { getSignPolicy, signDownloadPath } from "../pkg/sign"
import { isAdmin } from "../pkg/permission"
import {
  EMBY_VERSION,
  SUBSONIC_VERSION,
  extOf,
  mediaProtocolEnabled,
  settingBool,
  type EmbyDevice,
  type EpisodeInfo,
  type MediaDb,
  type MediaItem,
} from "../internal/media/model"
import { isWithinUserRoot } from "../pkg/permission"
import {
  createPlaylist,
  deletePlaylist,
  ensureUserData,
  findItem,
  getMediaDb,
  getPlayQueue,
  getPlaylist,
  getSettingsMap,
  isTypeEnabled,
  listPlaylists,
  playlistItems,
  replacePlaylistItems,
  saveMediaDb,
  savePlayQueue,
  updatePlaylist,
} from "../internal/media/store"
import { mediaHelpers } from "./media"

const originOf = (c: any) => new URL(c.req.url).origin
const b64url = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
const unb64url = (value: string) => {
  try {
    const raw = value.replace(/-/g, "+").replace(/_/g, "/")
    const bin = atob(raw + "=".repeat((4 - (raw.length % 4)) % 4))
    return new TextDecoder().decode(
      Uint8Array.from(bin, (ch) => ch.charCodeAt(0)),
    )
  } catch {
    return ""
  }
}

/** 32 位 FNV-1a：用于把字符串 key 变成 Emby 客户端友好的数字 ID */
function fnv1a(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

const hashKey = (value: string) => fnv1a(value).toString(36)
const numericId = (orig: string) => {
  const m = orig.match(/^(?:mv|so|ep)-(\d+)(?:-(\d+))?$/)
  if (m) return m[2] ? `${m[1]}${String(m[2]).padStart(3, "0")}` : m[1]
  return String(fnv1a(orig))
}
const guidLike = (orig: string) =>
  `${String(fnv1a(orig)).padStart(8, "0")}-0000-0000-0000-000000000000`
const imageTag = (item: MediaItem) =>
  item.cover ? hashKey(`${item.cover}|${item.updated_at}`).slice(0, 12) : ""

// ==================== 库 ====================

interface EmbySeries {
  key: string
  name: string
  items: MediaItem[]
  year: number
  overview: string
  cover: string
}

interface EmbyAlbum {
  key: string
  name: string
  artist: string
  items: MediaItem[]
  year: number
  cover: string
}

interface EmbyLibrary {
  user: any
  db: MediaDb
  videos: MediaItem[]
  music: MediaItem[]
  images: MediaItem[]
  books: MediaItem[]
  series: EmbySeries[]
  albums: EmbyAlbum[]
  ids: Map<string, string>
}

const isSeriesItem = (item: MediaItem) =>
  !!item.is_folder || item.video_type === "tv"

const seriesKeyOf = (item: MediaItem) =>
  hashKey(`series:${(item.scraped_name || item.folder_path).toLowerCase()}`)

const seriesNameOf = (item: MediaItem) =>
  item.scraped_name || item.file_name.replace(/\.[^.]+$/, "")

const albumKeyOf = (item: MediaItem) =>
  hashKey(
    `${(item.album_artist || "未知艺术家").toLowerCase()}\u0000${(item.album_name || "未知专辑").toLowerCase()}`,
  )
const artistKeyOf = (item: MediaItem) =>
  hashKey((item.album_artist || "未知艺术家").toLowerCase())

const artistOf = (item: MediaItem) => item.album_artist || "未知艺术家"
const albumOf = (item: MediaItem) => item.album_name || "未知专辑"

const parseEpisodesOf = (item: MediaItem): EpisodeInfo[] => {
  if (!item.episodes) return []
  try {
    const list = JSON.parse(item.episodes)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** 基础可见性（不含 meta）：类型开关 + hidden + base_path */
function baseVisible(db: MediaDb, user: any, item: MediaItem) {
  if (item.hidden) return false
  if (!isTypeEnabled(db, item.media_type)) return false
  try {
    return isWithinUserRoot(user, item.folder_path)
  } catch {
    return true
  }
}

/** 取 guest 用户（匿名入口用）；不存在或被禁用返回 null */
async function guestUserOf(env: any) {
  const db = await getDb(env)
  const guest = (db.users || []).find((u: any) => u.username === "guest")
  return guest && !guest.disabled ? guest : null
}

/** meta 级校验（成本较高，只对要返回的条目调用） */
async function metaFilter(env: any, user: any, items: MediaItem[]) {
  const out: MediaItem[] = []
  for (const item of items) {
    if (await mediaHelpers.canAccessItem(env, user, item)) out.push(item)
  }
  return out
}

/**
 * 加载协议层媒体库。
 *
 * 只保留「按 user 过滤」这一条路径：之前的 `all: true` 分支只过滤 hidden，
 * 会绕过 base_path / 类型开关，被匿名封面接口用来读全库。
 */
async function loadLibrary(env: any, user: any): Promise<EmbyLibrary> {
  const db = await getMediaDb(env)
  const visible = (item: MediaItem) => baseVisible(db, user, item)
  const videos = db.items.filter((i) => i.media_type === "video" && visible(i))
  const music = db.items.filter((i) => i.media_type === "music" && visible(i))
  const images = db.items.filter((i) => i.media_type === "image" && visible(i))
  const books = db.items.filter((i) => i.media_type === "book" && visible(i))

  const seriesMap = new Map<string, EmbySeries>()
  for (const item of videos) {
    if (!isSeriesItem(item)) continue
    const key = seriesKeyOf(item)
    let s = seriesMap.get(key)
    if (!s) {
      s = {
        key,
        name: seriesNameOf(item),
        items: [],
        year: Number((item.release_date || "").slice(0, 4)) || 0,
        overview: item.plot || "",
        cover: item.cover || "",
      }
      seriesMap.set(key, s)
    }
    if (!s.cover && item.cover) s.cover = item.cover
    if (!s.overview && item.plot) s.overview = item.plot
    s.items.push(item)
  }

  const albumMap = new Map<string, EmbyAlbum>()
  for (const item of music) {
    const key = albumKeyOf(item)
    let a = albumMap.get(key)
    if (!a) {
      a = {
        key,
        name: albumOf(item),
        artist: artistOf(item),
        items: [],
        year: Number((item.release_date || "").slice(0, 4)) || 0,
        cover: item.cover || "",
      }
      albumMap.set(key, a)
    }
    if (!a.cover && item.cover) a.cover = item.cover
    a.items.push(item)
  }

  const ids = new Map<string, string>()
  const register = (orig: string) => {
    ids.set(numericId(orig), orig)
    ids.set(guidLike(orig), orig)
  }
  register("root")
  register("lib-movie")
  register("lib-tv")
  register("lib-music")
  register("lib-image")
  register("lib-book")
  for (const item of [...videos, ...music, ...images, ...books]) {
    register(
      item.media_type === "music" ? `so-${item.id}` : `mv-${item.id}`,
    )
    if (item.media_type === "music") {
      register(`al-${albumKeyOf(item)}`)
      register(`ar-${artistKeyOf(item)}`)
    }
  }
  for (const s of seriesMap.values()) {
    register(`sr-${s.key}`)
    for (const season of seasonListOf(s)) register(`sn-${s.key}-${season}`)
    for (const ep of episodesOf(s, 0)) {
      register(`ep-${ep.item.id}-${ep.index}`)
    }
  }

  return {
    user,
    db,
    videos,
    music,
    images,
    books,
    series: Array.from(seriesMap.values()),
    albums: Array.from(albumMap.values()),
    ids,
  }
}

const origId = (lib: EmbyLibrary, id: string) =>
  lib.ids.get(String(id || "").trim()) || String(id || "").trim()

// ==================== DTO ====================

const embyServerId = (c: any) =>
  String(fnv1a(`server:${new URL(c.req.url).host}`))

const ticks = (seconds: number) => Math.round((Number(seconds) || 0) * 10_000_000)
const yearOf = (date: string) => Number(String(date || "").slice(0, 4)) || 0

const userDataOf = (lib: EmbyLibrary, itemId: number, episode = 0) => {
  const row = lib.user
    ? lib.db.user_data.find(
        (d) =>
          d.user_id === lib.user.id &&
          d.item_id === itemId &&
          d.episode_index === episode,
      )
    : undefined
  return {
    PlaybackPositionTicks: row?.position_ticks || 0,
    PlayCount: row?.play_count || 0,
    IsFavorite: !!row?.is_favorite,
    Played: !!row?.played,
    LastPlayedDate: row?.last_played_at || null,
    Rating: row?.rating || 0,
  }
}

interface DtoOptions {
  type?: string
  extra?: Record<string, any>
  parentId?: string
}

function makeDto(
  c: any,
  lib: EmbyLibrary,
  item: MediaItem,
  options: DtoOptions = {},
) {
  const isMusic = item.media_type === "music"
  const id = numericId(isMusic ? `so-${item.id}` : `mv-${item.id}`)
  const name = item.scraped_name || item.file_name.replace(/\.[^.]+$/, "")
  const art = imageTag(item)
  return {
    Name: name,
    SortName: name,
    ServerId: embyServerId(c),
    Id: id,
    ParentId: options.parentId,
    Type:
      options.type ||
      (isMusic ? "Audio" : item.media_type === "book" ? "Book" : "Movie"),
    MediaType: isMusic ? "Audio" : item.media_type === "image" ? "Photo" : "Video",
    IsFolder: !!item.is_folder,
    Overview: item.plot || item.description || "",
    ProductionYear: yearOf(item.release_date),
    PremiereDate: item.release_date || undefined,
    RunTimeTicks: ticks(item.duration),
    CommunityRating: item.rating || undefined,
    Genres: item.genre ? item.genre.split(",").filter(Boolean) : [],
    People: item.authors
      ? String(item.authors)
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((s) => s.replace(/^"|"$/g, "").trim())
          .filter(Boolean)
          .map((n) => ({ Name: n, Type: "Actor" }))
      : [],
    Path: `${item.folder_path.replace(/\/+$/, "")}/${item.file_name}`,
    DateCreated: item.created_at,
    ImageTags: art ? { Primary: art } : {},
    BackdropImageTags: [],
    ProviderIds: item.external_id ? { Tmdb: String(item.external_id) } : {},
    LocationType: "FileSystem",
    UserData: userDataOf(lib, item.id, 0),
    Album: isMusic ? albumOf(item) : undefined,
    AlbumId: isMusic ? numericId(`al-${albumKeyOf(item)}`) : undefined,
    AlbumArtist: isMusic ? artistOf(item) : undefined,
    AlbumArtists: isMusic
      ? [{ Name: artistOf(item), Id: numericId(`ar-${artistKeyOf(item)}`) }]
      : undefined,
    Artists: isMusic ? [artistOf(item)] : undefined,
    ArtistItems: isMusic
      ? [{ Name: artistOf(item), Id: numericId(`ar-${artistKeyOf(item)}`) }]
      : undefined,
    IndexNumber: isMusic ? item.track_number || undefined : undefined,
    Container: item.file_name.split(".").pop() || undefined,
    ...(options.extra || {}),
  }
}

function movieDto(c: any, lib: EmbyLibrary, item: MediaItem) {
  return makeDto(c, lib, item, { type: "Movie", parentId: numericId("lib-movie") })
}

function seriesDto(c: any, lib: EmbyLibrary, s: EmbySeries) {
  const first = s.items[0]
  const art = imageTag(first)
  return {
    Name: s.name,
    SortName: s.name,
    ServerId: embyServerId(c),
    Id: numericId(`sr-${s.key}`),
    ParentId: numericId("lib-tv"),
    Type: "Series",
    IsFolder: true,
    Overview: s.overview,
    ProductionYear: s.year,
    ChildCount: seasonListOf(s).length,
    RecursiveItemCount: episodesOf(s, 0).length,
    ImageTags: art ? { Primary: art } : {},
    BackdropImageTags: [],
    LocationType: "FileSystem",
    UserData: userDataOf(lib, first.id, 0),
  }
}

function seasonListOf(s: EmbySeries): number[] {
  const set = new Set<number>()
  for (const item of s.items) {
    const eps = parseEpisodesOf(item)
    if (eps.length > 0) {
      for (const ep of eps) set.add(Number(ep.season) || item.season || 1)
    } else {
      set.add(Number(item.season) || 1)
    }
  }
  if (set.size === 0) set.add(1)
  return Array.from(set).sort((a, b) => a - b)
}

interface EmbyEpisode {
  item: MediaItem
  index: number
  season: number
  title: string
  fileName: string
}

function episodesOf(s: EmbySeries, season = 0): EmbyEpisode[] {
  const out: EmbyEpisode[] = []
  for (const item of s.items) {
    const eps = parseEpisodesOf(item)
    if (eps.length > 0) {
      eps.forEach((ep, idx) => {
        const sn = Number(ep.season) || item.season || 1
        if (season && sn !== season) return
        out.push({
          item,
          index: Number(ep.index) || idx + 1,
          season: sn,
          title: ep.title || ep.file_name.replace(/\.[^.]+$/, ""),
          fileName: ep.file_name,
        })
      })
    } else {
      const sn = Number(item.season) || 1
      if (season && sn !== season) continue
      out.push({
        item,
        index: Number(item.episode) || 1,
        season: sn,
        title: item.scraped_name || item.file_name.replace(/\.[^.]+$/, ""),
        fileName: item.file_name,
      })
    }
  }
  return out.sort(
    (a, b) => a.season - b.season || a.index - b.index,
  )
}

function seasonDto(c: any, s: EmbySeries, season: number) {
  const eps = episodesOf(s, season)
  const first = eps[0]?.item || s.items[0]
  const art = imageTag(first)
  return {
    Name: season === 0 ? "Specials" : `Season ${season}`,
    SortName: String(season).padStart(4, "0"),
    ServerId: embyServerId(c),
    Id: numericId(`sn-${s.key}-${season}`),
    ParentId: numericId(`sr-${s.key}`),
    SeriesId: numericId(`sr-${s.key}`),
    SeriesName: s.name,
    Type: "Season",
    IsFolder: true,
    IndexNumber: season,
    ChildCount: eps.length,
    RecursiveItemCount: eps.length,
    ImageTags: art ? { Primary: art } : {},
    BackdropImageTags: [],
    LocationType: "FileSystem",
    UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
  }
}

function episodeDto(c: any, lib: EmbyLibrary, s: EmbySeries, ep: EmbyEpisode) {
  const art = imageTag(ep.item)
  const path = `${ep.item.folder_path.replace(/\/+$/, "")}/${ep.item.file_name}${ep.item.is_folder ? `/${ep.fileName}` : ""}`
  return {
    Name: ep.title,
    SortName: ep.title,
    ServerId: embyServerId(c),
    Id: numericId(`ep-${ep.item.id}-${ep.index}`),
    ParentId: numericId(`sn-${s.key}-${ep.season}`),
    SeriesId: numericId(`sr-${s.key}`),
    SeriesName: s.name,
    SeasonId: numericId(`sn-${s.key}-${ep.season}`),
    SeasonName: `Season ${ep.season}`,
    Type: "Episode",
    MediaType: "Video",
    IsFolder: false,
    IndexNumber: ep.index,
    ParentIndexNumber: ep.season,
    Overview: ep.item.plot || "",
    RunTimeTicks: ticks(ep.item.duration),
    ImageTags: art ? { Primary: art } : {},
    BackdropImageTags: [],
    Path: path,
    Container: ep.fileName.split(".").pop() || "mp4",
    LocationType: "FileSystem",
    UserData: userDataOf(lib, ep.item.id, ep.index),
  }
}

function albumDto(c: any, al: EmbyAlbum) {
  const first = al.items[0]
  const art = imageTag(first)
  return {
    Name: al.name,
    SortName: al.name,
    ServerId: embyServerId(c),
    Id: numericId(`al-${al.key}`),
    ParentId: numericId("lib-music"),
    Type: "MusicAlbum",
    IsFolder: true,
    AlbumArtist: al.artist,
    AlbumArtists: [{ Name: al.artist, Id: numericId(`ar-${artistKeyOf(first)}`) }],
    ProductionYear: al.year,
    ChildCount: al.items.length,
    RecursiveItemCount: al.items.length,
    ImageTags: art ? { Primary: art } : {},
    BackdropImageTags: [],
    LocationType: "FileSystem",
    UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
  }
}

function songDto(c: any, lib: EmbyLibrary, item: MediaItem) {
  return makeDto(c, lib, item, {
    type: "Audio",
    parentId: numericId(`al-${albumKeyOf(item)}`),
    extra: {
      IndexNumber: item.track_number || undefined,
      RunTimeTicks: ticks(item.duration),
    },
  })
}

/** 视图（Movies / TV Shows / Music / Photos / Books） */
function viewDtos(c: any, lib: EmbyLibrary) {
  const movieCount = lib.videos.filter((v) => !isSeriesItem(v)).length
  const out: any[] = []
  if (isTypeEnabled(lib.db, "video")) {
    out.push({
      Name: "Movies",
      SortName: "Movies",
      ServerId: embyServerId(c),
      Id: numericId("lib-movie"),
      ParentId: numericId("root"),
      Type: "CollectionFolder",
      IsFolder: true,
      CollectionType: "movies",
      ViewType: "movies",
      LocationType: "FileSystem",
      ChildCount: movieCount,
      RecursiveItemCount: movieCount,
      Subviews: ["movies"],
      ImageTags: {},
      UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
    })
    out.push({
      Name: "TV Shows",
      SortName: "TV Shows",
      ServerId: embyServerId(c),
      Id: numericId("lib-tv"),
      ParentId: numericId("root"),
      Type: "CollectionFolder",
      IsFolder: true,
      CollectionType: "tvshows",
      ViewType: "tvshows",
      LocationType: "FileSystem",
      ChildCount: lib.series.length,
      RecursiveItemCount: lib.series.length,
      ImageTags: {},
      UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
    })
  }
  if (isTypeEnabled(lib.db, "music")) {
    out.push({
      Name: "Music",
      SortName: "Music",
      ServerId: embyServerId(c),
      Id: numericId("lib-music"),
      ParentId: numericId("root"),
      Type: "CollectionFolder",
      IsFolder: true,
      CollectionType: "music",
      ViewType: "music",
      LocationType: "FileSystem",
      ChildCount: lib.albums.length,
      RecursiveItemCount: lib.albums.length,
      ImageTags: {},
      UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
    })
  }
  if (isTypeEnabled(lib.db, "image")) {
    out.push({
      Name: "Photos",
      SortName: "Photos",
      ServerId: embyServerId(c),
      Id: numericId("lib-image"),
      ParentId: numericId("root"),
      Type: "CollectionFolder",
      IsFolder: true,
      CollectionType: "photos",
      ViewType: "photos",
      LocationType: "FileSystem",
      ChildCount: lib.images.length,
      RecursiveItemCount: lib.images.length,
      ImageTags: {},
      UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
    })
  }
  if (isTypeEnabled(lib.db, "book")) {
    out.push({
      Name: "Books",
      SortName: "Books",
      ServerId: embyServerId(c),
      Id: numericId("lib-book"),
      ParentId: numericId("root"),
      Type: "CollectionFolder",
      IsFolder: true,
      CollectionType: "books",
      ViewType: "books",
      LocationType: "FileSystem",
      ChildCount: lib.books.length,
      RecursiveItemCount: lib.books.length,
      ImageTags: {},
      UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
    })
  }
  return out
}

/** 按 ParentId 取子项（对齐 Go childrenOf） */
function childrenOf(c: any, lib: EmbyLibrary, parentRaw: string): any[] {
  const parent = origId(lib, parentRaw)
  if (!parent || parent === "root") {
    // 对齐 Go 的 rootItem.childrenOf：根目录只暴露视图，不混入剧集/专辑
    return viewDtos(c, lib)
  }
  if (parent === "lib-movie") {
    return lib.videos
      .filter((v) => !isSeriesItem(v))
      .map((v) => movieDto(c, lib, v))
  }
  if (parent === "lib-tv") {
    return lib.series.map((s) => seriesDto(c, lib, s))
  }
  if (parent === "lib-music") {
    return lib.albums.map((a) => albumDto(c, a))
  }
  if (parent === "lib-image") {
    return lib.images.map((i) =>
      makeDto(c, lib, i, {
        type: "Photo",
        parentId: numericId("lib-image"),
      }),
    )
  }
  if (parent === "lib-book") {
    return lib.books.map((i) =>
      makeDto(c, lib, i, { type: "Book", parentId: numericId("lib-book") }),
    )
  }
  if (parent.startsWith("sr-")) {
    const key = parent.slice(3)
    const s = lib.series.find((x) => x.key === key)
    if (!s) return []
    return seasonListOf(s).map((sn) => seasonDto(c, s, sn))
  }
  if (parent.startsWith("sn-")) {
    const rest = parent.slice(3)
    const idx = rest.lastIndexOf("-")
    if (idx < 0) return []
    const key = rest.slice(0, idx)
    const season = Number(rest.slice(idx + 1)) || 1
    const s = lib.series.find((x) => x.key === key)
    if (!s) return []
    return episodesOf(s, season).map((ep) => episodeDto(c, lib, s, ep))
  }
  if (parent.startsWith("al-")) {
    const key = parent.slice(3)
    const al = lib.albums.find((x) => x.key === key)
    if (!al) return []
    return al.items
      .slice()
      .sort((a, b) => a.track_number - b.track_number)
      .map((i) => songDto(c, lib, i))
  }
  if (parent.startsWith("ar-")) {
    const key = parent.slice(3)
    return lib.albums
      .filter((al) => artistKeyOf(al.items[0]) === key)
      .map((al) => albumDto(c, al))
  }
  return []
}

/** 全部条目（用于搜索/递归查询） */
function allDtos(c: any, lib: EmbyLibrary, include: string[]): any[] {
  const want = (t: string) =>
    include.length === 0 || include.some((x) => x.toLowerCase() === t.toLowerCase())
  const out: any[] = []
  if (want("Movie")) {
    for (const v of lib.videos) if (!isSeriesItem(v)) out.push(movieDto(c, lib, v))
  }
  if (want("Series")) {
    for (const s of lib.series) out.push(seriesDto(c, lib, s))
  }
  if (want("Season")) {
    for (const s of lib.series) {
      for (const sn of seasonListOf(s)) out.push(seasonDto(c, s, sn))
    }
  }
  if (want("Episode")) {
    for (const s of lib.series) {
      for (const ep of episodesOf(s, 0)) out.push(episodeDto(c, lib, s, ep))
    }
  }
  if (want("MusicAlbum")) {
    for (const al of lib.albums) out.push(albumDto(c, al))
  }
  if (want("Audio")) {
    for (const m of lib.music) out.push(songDto(c, lib, m))
  }
  if (want("Photo")) {
    for (const i of lib.images) {
      out.push(makeDto(c, lib, i, { type: "Photo", parentId: numericId("lib-image") }))
    }
  }
  if (want("Book")) {
    for (const i of lib.books) {
      out.push(makeDto(c, lib, i, { type: "Book", parentId: numericId("lib-book") }))
    }
  }
  return out
}

const csv = (value: string) =>
  String(value || "")
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean)

function filterDtos(
  list: any[],
  c: any,
  lib: EmbyLibrary,
): any[] {
  const q = (k: string) => c.req.query(k) || ""
  const search = q("SearchTerm").toLowerCase()
  const nameStarts = q("NameStartsWith").toLowerCase()
  const include = csv(q("IncludeItemTypes"))
  const exclude = csv(q("ExcludeItemTypes"))
  const mediaTypes = csv(q("MediaTypes"))
  const idsParam = csv(q("Ids"))
  const isFolder = q("IsFolder")
  const filters = csv(q("Filters"))
  const years = csv(q("Years"))

  let out = list
  if (search) {
    out = out.filter((d) => String(d.Name || "").toLowerCase().includes(search))
  }
  if (nameStarts) {
    out = out.filter((d) =>
      String(d.Name || "").toLowerCase().startsWith(nameStarts),
    )
  }
  if (include.length) {
    out = out.filter((d) =>
      include.some((t) => String(d.Type).toLowerCase() === t.toLowerCase()),
    )
  }
  if (exclude.length) {
    out = out.filter(
      (d) => !exclude.some((t) => String(d.Type).toLowerCase() === t.toLowerCase()),
    )
  }
  if (mediaTypes.length) {
    out = out.filter((d) =>
      mediaTypes.some(
        (t) => String(d.MediaType || "").toLowerCase() === t.toLowerCase(),
      ),
    )
  }
  if (idsParam.length) {
    const set = new Set(idsParam.map((x) => origId(lib, x)))
    out = out.filter((d) => {
      const id = String(d.Id)
      const orig = lib.ids.get(id) || id
      return set.has(orig) || set.has(id)
    })
  }
  if (isFolder === "true") out = out.filter((d) => !!d.IsFolder)
  if (isFolder === "false") out = out.filter((d) => !d.IsFolder)
  if (years.length) {
    out = out.filter((d) => years.includes(String(d.ProductionYear || "")))
  }
  if (filters.some((f) => f.toLowerCase() === "isfavorite")) {
    out = out.filter((d) => !!d.UserData?.IsFavorite)
  }
  if (filters.some((f) => f.toLowerCase() === "isplayed")) {
    out = out.filter((d) => !!d.UserData?.Played)
  }
  if (filters.some((f) => f.toLowerCase() === "isunplayed")) {
    out = out.filter((d) => !d.UserData?.Played)
  }
  return out
}

function sortDtos(
  list: any[],
  c: any,
  override?: { sortBy?: string; sortOrder?: string },
) {
  const sortBy = (
    override?.sortBy ||
    c.req.query("SortBy") ||
    "SortName"
  )
    .split(",")[0]
    .trim()
  const desc = (
    override?.sortOrder ||
    c.req.query("SortOrder") ||
    "Ascending"
  )
    .toLowerCase()
    .startsWith("desc")
  const key = sortBy.toLowerCase()
  const valueOf = (d: any) => {
    if (key === "datecreated") return String(d.DateCreated || "")
    if (key === "productionyear") return Number(d.ProductionYear || 0)
    if (key === "communityrating") return Number(d.CommunityRating || 0)
    if (key === "random") return Math.random()
    return String(d.SortName || d.Name || "").toLowerCase()
  }
  return list
    .slice()
    .sort((a, b) => {
      const av = valueOf(a)
      const bv = valueOf(b)
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
      return desc ? -cmp : cmp
    })
}

function paginate(list: any[], c: any) {
  const start = Math.max(0, Number(c.req.query("StartIndex") || 0))
  const limitRaw = c.req.query("Limit")
  // 客户端不传 Limit 时给一个合理默认值：逐条 meta 校验的开销必须可控
  const limit =
    limitRaw === undefined
      ? 200
      : Math.max(0, Math.min(Number(limitRaw) || 0, 2000))
  return {
    Items: list.slice(start, start + limit),
    TotalRecordCount: list.length,
    StartIndex: start,
  }
}

// ==================== Emby 路由 ====================

export const embyRouter = new Hono()

embyRouter.use("*", async (c, next) => {
  const settings = await getSettingsMap(c.env)
  if (!mediaProtocolEnabled(settings, "media_emby_enabled")) return c.notFound()
  await next()
})

// ---- 公共端点（无需 token） ----

// 浏览器直接打开 /@emby 时返回说明页（Go 在鉴权前处理，否则会 401）
embyRouter.get("/", (c) => c.json({ Service: "OpenList", Version: EMBY_VERSION }))
embyRouter.get("/web/index.html", (c) => c.html(embyWebNotice()))
embyRouter.get("/web/", (c) => c.html(embyWebNotice()))
embyRouter.get("/web", (c) => c.html(embyWebNotice()))

embyRouter.get("/System/Info/Public", (c) =>
  c.json({
    ServerName: "OpenList",
    Version: EMBY_VERSION,
    Id: embyServerId(c),
    OperatingSystem: "Linux",
    LocalAddress: originOf(c),
    WebPath: "",
    StartupWizardCompleted: true,
  }),
)

embyRouter.get("/System/Ping", (c) => c.text("Emby Server"))

embyRouter.get("/System/Info", (c) =>
  c.json({
    ServerName: "OpenList",
    Version: EMBY_VERSION,
    Id: embyServerId(c),
    OperatingSystem: "Linux",
    OperatingSystemDisplayName: "Linux",
    LocalAddress: originOf(c),
    WebPath: "",
    StartupWizardCompleted: true,
    HasPendingRestart: false,
    IsShuttingDown: false,
    SupportsLibraryMonitor: false,
    CanSelfRestart: false,
    CanLaunchWebBrowser: false,
    SupportsHttps: false,
    HasUpdateAvailable: false,
    EncoderLocation: "System",
    SystemArchitecture: "X64",
    SystemUpdateLevel: "Release",
    // 该端点匿名可访问；客户端本来就已知接入端口，回真实端口只是白给一份探测信息
    HttpServerPortNumber: 0,
    HttpsPortNumber: 0,
    ProgramDataPath: "",
    ItemsByNamePath: "",
    CachePath: "",
    LogPath: "",
    InternalMetadataPath: "",
    TranscodingTempPath: "",
  }),
)

embyRouter.get("/System/Endpoint", (c) => {
  // 按实际来源判断：固定返回 true 会让客户端误以为可内网直连，也等于对匿名
  // 访问者宣称内网可达
  const local = isLocalClient(c)
  return c.json({ IsLocal: local, IsInNetwork: local })
})
embyRouter.get("/System/Configuration/Public", (c) => c.json({}))
embyRouter.get("/Branding/Configuration", (c) => c.json({}))
embyRouter.get("/Localization/Options", (c) => c.json([]))
embyRouter.post("/Sessions/Capabilities", (c) => c.body(null, 204))
embyRouter.post("/Sessions/Capabilities/Full", (c) => c.body(null, 204))

const requestToken = (c: any) => {
  const header =
    c.req.header("X-Emby-Token") || c.req.header("X-MediaBrowser-Token")
  if (header) return header
  const auth =
    c.req.header("X-Emby-Authorization") || c.req.header("Authorization") || ""
  const m = auth.match(/Token="?([^",]+)"?/i)
  return m?.[1] || c.req.query("api_key") || c.req.query("ApiKey") || ""
}

const parseAuthHeader = (raw: string) => {
  const out: Record<string, string> = {}
  for (const part of String(raw || "").split(",")) {
    const idx = part.indexOf("=")
    if (idx < 0) continue
    out[part.slice(0, idx).trim().toLowerCase()] = part
      .slice(idx + 1)
      .trim()
      .replace(/^"|"$/g, "")
  }
  return out
}

async function userFromDb(env: any, id?: number, name?: string) {
  const db = await getDb(env)
  return (db.users || []).find(
    (u: any) => (id && u.id === id) || (name && u.username === name && !u.disabled),
  )
}

/** 常量时间比较，避免按前缀命中后通过比较耗时泄露密钥内容 */
const safeEqualStr = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * 按明文应用密钥查找记录（对齐 Go 的 LookUpAppKeyUser）。
 * 先用 prefix 把范围缩到同前缀的少数几条，再解密做常量时间比对；
 * 相比「遍历全部 key 比 sha256」，密钥多了以后也不会退化成 O(n)。
 */
async function findAppKeyByPlain(env: any, plain: string, db: MediaDb) {
  const key = String(plain || "").trim()
  if (!key.startsWith("olmp_")) return null
  const prefix = key.slice(0, 10)
  const ctx = { env }
  for (const row of db.app_keys.filter((k) => k.prefix === prefix)) {
    const stored = await mediaHelpers.appKeyPlainOf(ctx, row)
    if (stored && safeEqualStr(stored, key)) return row
  }
  return null
}

/**
 * Emby 客户端按 GUID 校验用户 Id；这里把数字 id 映射成稳定、可逆的 GUID 形状。
 * 数字 id 与用户名仍可解析（对齐 Go 的 embyResolveUserID 兼容旧形式）。
 */
const userGuid = (id: number) =>
  `00000000-0000-4000-8000-${Math.max(0, Math.trunc(Number(id) || 0))
    .toString(16)
    .padStart(12, "0")}`

const parseUserGuid = (raw: string): number => {
  const m = String(raw || "").match(/^0{8}-0{4}-4000-8000-([0-9a-f]{12})$/i)
  if (!m) return 0
  const id = parseInt(m[1], 16)
  return Number.isFinite(id) && id > 0 ? id : 0
}

/** 请求是否来自本机 / 内网（/System/Endpoint 用，不能固定返回 true） */
const isLocalClient = (c: any) => {
  const ip = String(
    c.req.header("cf-connecting-ip") ||
      c.req.header("x-real-ip") ||
      c.req.header("x-forwarded-for") ||
      "",
  )
    .split(",")[0]
    .trim()
    .toLowerCase()
  if (!ip) return false
  if (ip === "::1" || ip.startsWith("127.")) return true
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true
  const m = ip.match(/^172\.(\d{1,3})\./)
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true
  return ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")
}

async function tokenUser(env: any, token: string) {
  if (!token) return null
  const db = await getMediaDb(env)
  const hash = await mediaHelpers.sha256Hex(token)
  const device = db.emby_devices.find((d) => d.token === hash)
  if (device) {
    const user = await userFromDb(env, device.user_id)
    if (user && !user.disabled) {
      device.last_seen_at = new Date().toISOString()
      return user
    }
  }
  const key = await findAppKeyByPlain(env, token, db)
  if (key) {
    const user = await userFromDb(env, key.user_id)
    if (user && !user.disabled && user.username !== "guest") {
      key.last_used_at = new Date().toISOString()
      return user
    }
  }
  return null
}

const userDto = (u: any, c: any) => ({
  Name: u.username,
  ServerId: embyServerId(c),
  Id: userGuid(u.id),
  HasPassword: !!u.password,
  HasConfiguredPassword: !!u.password,
  Configuration: {},
  Policy: {
    IsAdministrator: u.role === 2,
    EnableAllFolders: true,
    EnabledFolders: [],
  },
  IsAdministrator: u.role === 2,
  IsDisabled: !!u.disabled,
})

embyRouter.get("/Users/Public", async (c) => {
  const db = await getDb(c.env)
  const users = (db.users || []).filter(
    (u: any) => !u.disabled && u.username !== "guest",
  )
  return c.json(users.map((u: any) => userDto(u, c)))
})

async function readAuthBody(c: any): Promise<{ username: string; pw: string }> {
  let username = c.req.query("Username") || c.req.query("username") || ""
  let pw = c.req.query("Pw") || c.req.query("Password") || ""
  try {
    const ct = String(c.req.header("content-type") || "").toLowerCase()
    if (ct.includes("json")) {
      const body = await c.req.json()
      username = String(body.Username || body.username || username)
      pw = String(body.Pw || body.Password || pw)
    } else if (ct.includes("form")) {
      const form = await c.req.formData()
      username = String(form.get("Username") || form.get("username") || username)
      pw = String(form.get("Pw") || form.get("Password") || pw)
    }
  } catch {
    /* ignore */
  }
  return { username: username.trim(), pw }
}

async function authenticate(c: any, username: string, pw: string) {
  if (!username) return null
  const db = await getDb(c.env)
  const user = (db.users || []).find(
    (u: any) => u.username === username && !u.disabled && u.username !== "guest",
  )
  if (!user) return null
  // 应用密钥也可以直接当密码用（对齐 Go）
  if (pw.startsWith("olmp_")) {
    const mediaDb = await getMediaDb(c.env)
    const key = await findAppKeyByPlain(c.env, pw, mediaDb)
    if (key) {
      const owner = await userFromDb(c.env, key.user_id)
      if (owner && owner.id === user.id) {
        key.last_used_at = new Date().toISOString()
        return user
      }
    }
    return null
  }
  if (!user.password || !user.salt) return null
  const hash = await twoStepHash(pw, user.salt)
  return hash === user.password ? user : null
}

async function issueToken(c: any, user: any) {
  const db = await getMediaDb(c.env)
  const token = mediaHelpers.randomToken("emb_")
  const header = parseAuthHeader(c.req.header("X-Emby-Authorization") || "")
  const device: EmbyDevice = {
    id: db.next_id++,
    user_id: user.id,
    device_id: header.deviceid || "",
    device_name: header.device || "",
    client: header.client || "",
    version: header.version || "",
    token: await mediaHelpers.sha256Hex(token),
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    app_key_id: 0,
  }
  db.emby_devices.push(device)
  await saveMediaDb(c.env, db)
  return token
}

embyRouter.post("/Users/AuthenticateByName", async (c) => {
  const { username, pw } = await readAuthBody(c)
  if (await mediaHelpers.authLockedFor(c, username)) {
    return c.json({ Error: "Too many failed attempts" }, 429)
  }
  const user = await authenticate(c, username, pw)
  if (!user) {
    if (username || pw) await mediaHelpers.authFailed(c, username)
    return c.json({ Error: "Unauthorized" }, 401)
  }
  mediaHelpers.authSucceeded(c, username)
  const token = await issueToken(c, user)
  return c.json({
    User: userDto(user, c),
    AccessToken: token,
    ServerId: embyServerId(c),
  })
})

embyRouter.post("/Users/:id/Authenticate", async (c) => {
  const rawId = c.req.param("id")
  const { pw } = await readAuthBody(c)
  let user: any = null
  // 兼容三种形式：GUID（当前返回）、数字（旧客户端缓存）、用户名
  const guidId = parseUserGuid(rawId)
  if (guidId) {
    user = await userFromDb(c.env, guidId)
  }
  if (!user && /^\d+$/.test(rawId)) {
    user = await userFromDb(c.env, Number(rawId))
  }
  if (!user) {
    const db = await getDb(c.env)
    user = (db.users || []).find(
      (u: any) => String(u.id) === rawId || u.username === rawId,
    )
  }
  if (!user || user.disabled) return c.json({ Error: "Unauthorized" }, 401)
  if (await mediaHelpers.authLockedFor(c, user.username)) {
    return c.json({ Error: "Too many failed attempts" }, 429)
  }
  const okUser = await authenticate(c, user.username, pw)
  if (!okUser) {
    await mediaHelpers.authFailed(c, user.username)
    return c.json({ Error: "Unauthorized" }, 401)
  }
  mediaHelpers.authSucceeded(c, user.username)
  const token = await issueToken(c, okUser)
  return c.json({
    User: userDto(okUser, c),
    AccessToken: token,
    ServerId: embyServerId(c),
  })
})

/** 图片端点：允许匿名（客户端封面 URL 不带 token），但按 guest 权限过滤 */
embyRouter.get("/Items/:id/Images/:type", async (c) => {
  // 匿名 ≠ 全库可见：带 token 时按该用户过滤，没有 token 才退回 guest，
  // 两条路径都走 base_path / 类型开关 / hidden 的同一套判断。之前用 all:true
  // 只过滤 hidden，等于绕过了用户根目录与 meta 权限。
  const token = requestToken(c)
  const user =
    (token ? await tokenUser(c.env, token) : null) ?? (await guestUserOf(c.env))
  if (!user) return c.body(null, 401)
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id"))
  const target = findItem(lib.db, Number(id.replace(/^(mv|so)-/, "")))
  let cover = target?.cover || ""
  if (!cover && id.startsWith("ep-")) {
    const item = findItem(lib.db, Number(id.split("-")[1]))
    cover = item?.cover || ""
  }
  if (!cover && (id.startsWith("sr-") || id.startsWith("sn-"))) {
    const key = id.startsWith("sr-") ? id.slice(3) : id.slice(3, id.lastIndexOf("-"))
    cover = lib.series.find((s) => s.key === key)?.cover || ""
  }
  if (!cover && id.startsWith("al-")) {
    const key = id.slice(3)
    cover = lib.albums.find((a) => a.key === key)?.cover || ""
  }
  if (!cover) return c.body(null, 404)
  return serveCover(c, cover)
})

async function serveCover(c: any, cover: string) {
  const origin = originOf(c)
  if (cover.startsWith("thumb:")) {
    return c.redirect(
      `${origin}/api/public/media/thumb?path=${encodeURIComponent(cover.slice(6))}`,
    )
  }
  if (cover.startsWith("data:")) {
    const m = cover.match(/^data:[^;]+;base64,(.*)$/)
    if (!m) return c.body(null, 404)
    let bytes: Uint8Array
    try {
      bytes = Uint8Array.from(atob(m[1]), (ch) => ch.charCodeAt(0))
    } catch {
      // 存量数据里可能有被截断/篡改的 base64
      return c.body(null, 404)
    }
    // 内联串里的 MIME 来自历史数据（早期版本会采信 ID3 声明的 image/svg+xml），
    // 这里按魔数重新判定，认不出来直接 404，不再把存储串当 Content-Type 用。
    const mime = mediaHelpers.sniffImageMime(bytes)
    if (!mime) return c.body(null, 404)
    c.header("Content-Type", mime)
    c.header("Cache-Control", "public, max-age=604800")
    c.header("X-Content-Type-Options", "nosniff")
    // 再补一层沙箱：即使以后嗅探白名单里混进可执行格式，也不会在本站源下跑脚本
    c.header("Content-Security-Policy", "default-src 'none'; sandbox")
    return c.body(bytes as any)
  }
  if (/^https?:\/\//i.test(cover)) {
    const settings = await getSettingsMap(c.env)
    if (settingBool(settings, "media_proxy_cover", false)) {
      return c.redirect(
        `${origin}/api/public/media/proxy?url=${encodeURIComponent(cover)}`,
      )
    }
    return c.redirect(cover)
  }
  return c.redirect(
    `${origin}/d${encodeDownloadPath(cover)}?sign=${encodeURIComponent(await signDownloadPath(c, cover, 0))}`,
  )
}

// ---- 以下需要 token ----

embyRouter.use("*", async (c, next) => {
  const token = requestToken(c)
  const user = token ? await tokenUser(c.env, token) : null
  if (!user) {
    return c.json(
      { Error: "Unauthorized", ResponseStatus: { ErrorCode: "Unauthorized" } },
      401,
    )
  }
  ;(c as any).set("mediaUser", user)
  await next()
})

embyRouter.get("/Users/Me", async (c) => {
  const user = (c as any).get("mediaUser")
  return c.json(userDto(user, c))
})

embyRouter.get("/Users/:id", async (c) => {
  const user = (c as any).get("mediaUser")
  return c.json(userDto(user, c))
})

embyRouter.get("/Users", async (c) => {
  const user = (c as any).get("mediaUser")
  if (!isAdmin(user)) {
    const db = await getDb(c.env)
    const list = (db.users || []).filter(
      (u: any) => !u.disabled && u.username !== "guest",
    )
    return c.json(list.map((u: any) => userDto(u, c)))
  }
  const db = await getDb(c.env)
  return c.json((db.users || []).map((u: any) => userDto(u, c)))
})

embyRouter.get("/Users/Query", async (c) => {
  const db = await getDb(c.env)
  const list = (db.users || []).filter((u: any) => !u.disabled)
  return c.json({ Items: list.map((u: any) => userDto(u, c)), TotalRecordCount: list.length })
})

const handleViews = async (c: any) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const items = viewDtos(c, lib)
  return c.json({ Items: items, TotalRecordCount: items.length })
}
embyRouter.get("/Users/:id/Views", handleViews)
embyRouter.get("/UserViews", handleViews)

const handleItems = async (c: any) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const parent = origId(lib, c.req.query("ParentId") || "")
  const recursive =
    c.req.query("Recursive") === "true" ||
    c.req.query("Recursive") === "1" ||
    !parent
  const include = csv(c.req.query("IncludeItemTypes"))

  let list: any[]
  if (recursive) {
    list = allDtos(c, lib, include)
  } else {
    list = childrenOf(c, lib, parent)
  }
  list = filterDtos(list, c, lib)
  list = sortDtos(list, c)

  // 对当前页做 meta 级权限过滤
  const page = paginate(list, c)
  if (!isAdmin(user)) {
    const allowed: any[] = []
    for (const dto of page.Items) {
      const orig = origId(lib, String(dto.Id))
      const numeric = orig.match(/^(?:mv|so)-(\d+)$/)
      if (numeric) {
        const item = findItem(lib.db, Number(numeric[1]))
        if (item && !(await mediaHelpers.canAccessItem(c.env, user, item))) continue
      }
      allowed.push(dto)
    }
    page.Items = allowed
  }
  return c.json(page)
}

embyRouter.get("/Items", handleItems)
embyRouter.get("/Users/:id/Items", handleItems)

const handleLatest = async (c: any) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const parent = origId(lib, c.req.query("ParentId") || "")
  let list =
    parent === "lib-music"
      ? lib.albums.map((a) => albumDto(c, a))
      : parent === "lib-tv"
        ? lib.series.map((s) => seriesDto(c, lib, s))
        : lib.videos.filter((v) => !isSeriesItem(v)).map((v) => movieDto(c, lib, v))
  list = sortDtos(list, c, {
    sortBy: "DateCreated",
    sortOrder: "Descending",
  })
  return c.json({ Items: list.slice(0, 20), TotalRecordCount: Math.min(list.length, 20) })
}
embyRouter.get("/Users/:id/Items/Latest", handleLatest)
embyRouter.get("/Items/Latest", handleLatest)

const handleResume = async (c: any) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const rows = lib.db.user_data
    .filter((d) => d.user_id === user.id && !d.played && d.position_ticks > 0)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
  const items: any[] = []
  for (const row of rows) {
    const item = findItem(lib.db, row.item_id)
    if (!item || item.hidden) continue
    if (!(await mediaHelpers.canAccessItem(c.env, user, item))) continue
    if (row.episode_index > 0) {
      const s = lib.series.find((x) => x.items.some((i) => i.id === item.id))
      if (!s) continue
      const ep = episodesOf(s, 0).find(
        (e) => e.item.id === item.id && e.index === row.episode_index,
      )
      if (ep) {
        items.push({
          ...episodeDto(c, lib, s, ep),
          UserData: {
            ...userDataOf(lib, item.id, row.episode_index),
            PlaybackPositionTicks: row.position_ticks,
          },
        })
      }
    } else {
      items.push({
        ...makeDto(c, lib, item),
        UserData: {
          ...userDataOf(lib, item.id, 0),
          PlaybackPositionTicks: row.position_ticks,
        },
      })
    }
  }
  return c.json({ Items: items, TotalRecordCount: items.length })
}
embyRouter.get("/Users/:id/Items/Resume", handleResume)
embyRouter.get("/Items/Resume", handleResume)

embyRouter.get("/Users/:id/Items/Root", (c) =>
  c.json({
    Name: "OpenList",
    Id: numericId("root"),
    ServerId: embyServerId(c),
    Type: "CollectionFolder",
    IsFolder: true,
    CollectionType: "root",
    ImageTags: {},
    UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
  }),
)

embyRouter.get("/Items/Counts", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  return c.json({
    MovieCount: lib.videos.filter((v) => !isSeriesItem(v)).length,
    SeriesCount: lib.series.length,
    EpisodeCount: lib.series.reduce((n, s) => n + episodesOf(s, 0).length, 0),
    AlbumCount: lib.albums.length,
    SongCount: lib.music.length,
    BoxSetCount: 0,
    BookCount: lib.books.length,
    ItemCount: lib.videos.length + lib.music.length + lib.images.length + lib.books.length,
  })
})

const handleItemDetail = async (c: any) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id") || c.req.param("itemId"))
  const numeric = id.match(/^(?:mv|so)-(\d+)$/)
  if (numeric) {
    const item = findItem(lib.db, Number(numeric[1]))
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) {
      return c.json({ Error: "Not Found" }, 404)
    }
    return c.json(makeDto(c, lib, item))
  }
  if (id.startsWith("ep-")) {
    const [, itemId, epIndex] = id.split("-")
    const item = findItem(lib.db, Number(itemId))
    const s = lib.series.find((x) => x.items.some((i) => i.id === item?.id))
    if (!item || !s) return c.json({ Error: "Not Found" }, 404)
    const ep = episodesOf(s, 0).find((e) => e.index === Number(epIndex))
    if (!ep) return c.json({ Error: "Not Found" }, 404)
    return c.json(episodeDto(c, lib, s, ep))
  }
  if (id.startsWith("sr-")) {
    const s = lib.series.find((x) => x.key === id.slice(3))
    return s ? c.json(seriesDto(c, lib, s)) : c.json({ Error: "Not Found" }, 404)
  }
  if (id.startsWith("sn-")) {
    const rest = id.slice(3)
    const idx = rest.lastIndexOf("-")
    const key = rest.slice(0, idx)
    const season = Number(rest.slice(idx + 1)) || 1
    const s = lib.series.find((x) => x.key === key)
    return s ? c.json(seasonDto(c, s, season)) : c.json({ Error: "Not Found" }, 404)
  }
  if (id.startsWith("al-")) {
    const al = lib.albums.find((x) => x.key === id.slice(3))
    return al ? c.json(albumDto(c, al)) : c.json({ Error: "Not Found" }, 404)
  }
  return c.json({ Error: "Not Found" }, 404)
}

embyRouter.get("/Items/:id", handleItemDetail)
embyRouter.get("/Users/:id/Items/:itemId", handleItemDetail)

/**
 * Emby WebSocket（会话/实时通知通道）。
 *
 * 对齐 Go 的 embyWebSocket：握手成功后立即回一条 KeepAlive，并每 30s 心跳。
 * 客户端只靠这个通道判断「服务器是否在线」，缺失时会持续重连并刷 404。
 *
 * 实现依赖 Cloudflare Workers 的 WebSocketPair；其它运行时（Node/EdgeOne）
 * 没有该能力，明确返回 426，避免客户端误以为网络故障。
 */
const handleEmbyWebSocket = async (c: any) => {
  const g: any = globalThis as any
  if (typeof g.WebSocketPair === "undefined") {
    return c.body("WebSocket is not supported on this runtime", 426)
  }
  try {
    const { upgradeWebSocket } = await import("hono/cloudflare-workers")
    const handler: any = upgradeWebSocket(() => {
      let timer: ReturnType<typeof setInterval> | null = null
      const stop = () => {
        if (timer) {
          clearInterval(timer)
          timer = null
        }
      }
      return {
        onOpen(_evt: any, ws: any) {
          try {
            ws.send('{"MessageType":"KeepAlive"}')
          } catch {
            /* ignore */
          }
          timer = setInterval(() => {
            try {
              ws.send('{"MessageType":"KeepAlive"}')
            } catch {
              stop()
            }
          }, 30_000)
        },
        onMessage(_evt: any, _ws: any) {
          // Emby 客户端只发送 KeepAlive / 会话上报，无需回写
        },
        onClose() {
          stop()
        },
        onError() {
          stop()
        },
      }
    })
    return handler(c, async () => {})
  } catch (e: any) {
    console.warn("[emby] websocket upgrade failed:", e?.message || e)
    return c.body("WebSocket upgrade failed", 426)
  }
}

// 客户端大小写不统一，两个路径都要注册
embyRouter.get("/embywebsocket", handleEmbyWebSocket)
embyRouter.get("/EmbyWebsocket", handleEmbyWebSocket)
embyRouter.get("/mediabrowserwebsocket", handleEmbyWebSocket)

// 客户端常探测的辅助端点：返回空结构而不是 401/404，避免连接阶段被判服务器异常
embyRouter.get("/Sessions", (c) => c.json([]))
embyRouter.get("/System/Activity/Log", (c) => c.json({ Items: [], TotalRecordCount: 0 }))
embyRouter.get("/Plugins", (c) => c.json([]))
embyRouter.get("/Videos/:id/info", (c) => c.body(null, 204))
embyRouter.get("/Users/:id/Images/:type", (c) => c.body(null, 404))
embyRouter.get("/Shows/Upcoming", (c) =>
  c.json({ Items: [], TotalRecordCount: 0 }),
)

embyRouter.get("/Items/:id/Images/:type", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id"))
  let cover = ""
  const numeric = id.match(/^(?:mv|so)-(\d+)$/)
  if (numeric) cover = findItem(lib.db, Number(numeric[1]))?.cover || ""
  if (!cover && id.startsWith("ep-")) {
    cover = findItem(lib.db, Number(id.split("-")[1]))?.cover || ""
  }
  if (!cover && id.startsWith("sr-")) {
    cover = lib.series.find((s) => s.key === id.slice(3))?.cover || ""
  }
  if (!cover && id.startsWith("al-")) {
    cover = lib.albums.find((a) => a.key === id.slice(3))?.cover || ""
  }
  if (!cover) return c.body(null, 404)
  return serveCover(c, cover)
})

/** 歌词：作为外挂字幕轨（Emby Theater 的歌词面板只读 Subtitle 流） */
const handleLyrics = async (c: any, idRaw: string) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, idRaw)
  const numeric = id.match(/^so-(\d+)$/)
  const item = numeric ? findItem(lib.db, Number(numeric[1])) : undefined
  if (!item?.lyrics) return c.body("", 200)
  c.header("Content-Type", "text/plain; charset=utf-8")
  return c.body(item.lyrics)
}
embyRouter.get("/Audio/:id/lyrics", (c) => handleLyrics(c, c.req.param("id")))

/** 播放目标解析 */
async function playTarget(c: any, idRaw: string) {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, idRaw)
  const numeric = id.match(/^(?:mv|so)-(\d+)$/)
  if (numeric) {
    const item = findItem(lib.db, Number(numeric[1]))
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) return null
    return {
      item,
      episode: null as EpisodeInfo | null,
      rawPath: mediaHelpers.itemPath(item),
      name: item.scraped_name || item.file_name,
      container: item.file_name.split(".").pop() || "mp4",
      duration: item.duration,
    }
  }
  const epMatch = id.match(/^ep-(\d+)-(\d+)$/)
  if (epMatch) {
    const item = findItem(lib.db, Number(epMatch[1]))
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) return null
    const eps = parseEpisodesOf(item)
    const ep = eps.find((e) => Number(e.index) === Number(epMatch[2]))
    if (!ep) return null
    return {
      item,
      episode: ep,
      rawPath: mediaHelpers.itemPath(item, ep.index),
      name: ep.title || ep.file_name,
      container: ep.file_name.split(".").pop() || "mp4",
      duration: ep.duration || item.duration,
    }
  }
  if (id.startsWith("sr-")) {
    const s = lib.series.find((x) => x.key === id.slice(3))
    const eps: EmbyEpisode[] = s ? episodesOf(s, 0) : []
    const ep: EmbyEpisode | undefined = eps[0]
    if (!s || !ep) return null
    return {
      item: ep.item,
      episode: {
        index: ep.index,
        title: ep.title,
        file_name: ep.fileName,
        season: ep.season,
      },
      rawPath: mediaHelpers.itemPath(ep.item, ep.index),
      name: ep.title,
      container: ep.fileName.split(".").pop() || "mp4",
      duration: ep.item.duration,
    }
  }
  if (id.startsWith("al-")) {
    const al = lib.albums.find((x) => x.key === id.slice(3))
    const first = al?.items[0]
    if (!first) return null
    return {
      item: first,
      episode: null,
      rawPath: mediaHelpers.itemPath(first),
      name: first.scraped_name || first.file_name,
      container: first.file_name.split(".").pop() || "mp3",
      duration: first.duration,
    }
  }
  return null
}

/** 播放流地址：必须带 api_key，且 Path/DirectStreamUrl 都用它（对齐最新 Go 修复） */
const streamUrlOf = (c: any, idRaw: string, container: string) => {
  const token = requestToken(c)
  const kind = "Videos"
  const suffix = container ? `.${container}` : ""
  const q = new URLSearchParams({
    Static: "true",
    MediaSourceId: idRaw,
  })
  if (token) q.set("api_key", token)
  return `${originOf(c)}/@emby/${kind}/${idRaw}/stream${suffix}?${q.toString()}`
}

const handlePlaybackInfo = async (c: any) => {
  let idRaw = c.req.param("id")
  // 兼容 POST body 里的 ItemId
  if (!idRaw) {
    const body = await c.req.json().catch(() => ({}))
    idRaw = String(body.ItemId || "")
  }
  const target = await playTarget(c, idRaw)
  if (!target) return c.json({ Error: "Not Found" }, 404)
  const isAudio = target.item.media_type === "music"
  const kind = isAudio ? "Audio" : "Videos"
  const url = (() => {
    const token = requestToken(c)
    const suffix = target.container ? `.${target.container}` : ""
    const q = new URLSearchParams({ Static: "true", MediaSourceId: idRaw })
    if (token) q.set("api_key", token)
    return `${originOf(c)}/@emby/${kind}/${idRaw}/stream${suffix}?${q.toString()}`
  })()

  const streams: any[] = [
    { Type: isAudio ? "Audio" : "Video", Index: 0, IsDefault: true },
  ]
  let subtitleIndex: number | undefined
  if (isAudio && target.item.lyrics) {
    subtitleIndex = streams.length
    streams.push({
      Type: "Subtitle",
      Index: subtitleIndex,
      IsDefault: false,
      IsExternal: true,
      Codec: "srt",
      Language: "und",
      DisplayTitle: "Lyrics",
      DeliveryUrl: `/Items/${idRaw}/Subtitles/${subtitleIndex}/Stream.js`,
    })
  }

  return c.json({
    MediaSources: [
      {
        Protocol: "Http",
        Id: idRaw,
        ItemId: idRaw,
        Path: url,
        Type: "Default",
        Container: target.container,
        Name: target.name,
        Size: target.item.file_size || 0,
        ETag: hashKey(`${target.rawPath}|${target.item.file_size}`),
        RunTimeTicks: ticks(target.duration),
        SupportsDirectPlay: true,
        SupportsDirectStream: true,
        SupportsTranscoding: false,
        SupportsProbing: false,
        MediaStreams: streams,
        MediaAttachments: [],
        Formats: [],
        RequiredHttpHeaders: {},
        DirectStreamUrl: url,
        AddApiKeyToDirectStreamUrl: false,
        DefaultSubtitleStreamIndex: subtitleIndex,
      },
    ],
    PlaySessionId: `openlist-${target.item.id}-${target.episode?.index || 0}`,
  })
}

embyRouter.get("/Items/:id/PlaybackInfo", handlePlaybackInfo)
embyRouter.post("/Items/:id/PlaybackInfo", handlePlaybackInfo)

embyRouter.post("/Items/:id/Refresh", (c) => c.json({}))
embyRouter.get("/Items/:id/Similar", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id"))
  const numeric = id.match(/^mv-(\d+)$/)
  const item = numeric ? findItem(lib.db, Number(numeric[1])) : undefined
  if (!item) return c.json({ Items: [], TotalRecordCount: 0 })
  const genres = new Set(item.genre.split(",").filter(Boolean))
  const list = lib.videos
    .filter(
      (v) =>
        v.id !== item.id &&
        !isSeriesItem(v) &&
        v.genre.split(",").some((g) => genres.has(g)),
    )
    .slice(0, 20)
    .map((v) => movieDto(c, lib, v))
  return c.json({ Items: list, TotalRecordCount: list.length })
})

// 剧集
embyRouter.get("/Shows/:id/Seasons", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id"))
  const key = id.startsWith("sr-") ? id.slice(3) : id
  const s = lib.series.find((x) => x.key === key)
  if (!s) return c.json({ Items: [], TotalRecordCount: 0 })
  const list = seasonListOf(s).map((sn) => seasonDto(c, s, sn))
  return c.json({ Items: list, TotalRecordCount: list.length })
})

embyRouter.get("/Shows/:id/Episodes", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id"))
  const key = id.startsWith("sr-") ? id.slice(3) : id
  const s = lib.series.find((x) => x.key === key)
  if (!s) return c.json({ Items: [], TotalRecordCount: 0 })
  const season = Number(c.req.query("Season") || 0)
  let list = episodesOf(s, season).map((ep) => episodeDto(c, lib, s, ep))
  list = filterDtos(list, c, lib)
  list = sortDtos(list, c)
  return c.json(paginate(list, c))
})

embyRouter.get("/Shows/NextUp", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const out: any[] = []
  for (const s of lib.series) {
    const eps = episodesOf(s, 0)
    const next = eps.find((ep) => {
      const row = lib.db.user_data.find(
        (d) =>
          d.user_id === user.id &&
          d.item_id === ep.item.id &&
          d.episode_index === ep.index,
      )
      return !row?.played
    })
    if (next) out.push(episodeDto(c, lib, s, next))
  }
  return c.json({ Items: out.slice(0, 20), TotalRecordCount: Math.min(out.length, 20) })
})

// 音乐
embyRouter.get("/Artists", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const map = new Map<string, any>()
  for (const al of lib.albums) {
    const key = artistKeyOf(al.items[0])
    const row = map.get(key) || {
      Name: al.artist,
      SortName: al.artist,
      ServerId: embyServerId(c),
      Id: numericId(`ar-${key}`),
      Type: "MusicArtist",
      IsFolder: true,
      AlbumCount: 0,
      ImageTags: {},
      UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
    }
    row.AlbumCount += 1
    map.set(key, row)
  }
  const list = Array.from(map.values())
  return c.json({ Items: list, TotalRecordCount: list.length })
})
embyRouter.get("/Artists/AlbumArtists", (c) => c.redirect(`${originOf(c)}/@emby/Artists${new URL(c.req.url).search}`))
embyRouter.get("/Artists/:id", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id"))
  const key = id.startsWith("ar-") ? id.slice(3) : id
  const al = lib.albums.find((a) => artistKeyOf(a.items[0]) === key)
  if (!al) return c.json({ Error: "Not Found" }, 404)
  return c.json({
    Name: al.artist,
    ServerId: embyServerId(c),
    Id: numericId(`ar-${key}`),
    Type: "MusicArtist",
    IsFolder: true,
    AlbumCount: lib.albums.filter((a) => artistKeyOf(a.items[0]) === key).length,
    ImageTags: {},
    UserData: { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false },
  })
})
embyRouter.get("/MusicGenres", (c) => c.json({ Items: [], TotalRecordCount: 0 }))

// 收藏 / 已看
async function setFavorite(c: any, idRaw: string, favorite: boolean) {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, idRaw)
  let itemId = 0
  let epIndex = 0
  const numeric = id.match(/^(?:mv|so)-(\d+)$/)
  if (numeric) itemId = Number(numeric[1])
  const epMatch = id.match(/^ep-(\d+)-(\d+)$/)
  if (epMatch) {
    itemId = Number(epMatch[1])
    epIndex = Number(epMatch[2])
  }
  if (!itemId) return c.json({ Error: "Not Found" }, 404)
  const item = findItem(lib.db, itemId)
  if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) {
    return c.json({ Error: "Not Found" }, 404)
  }
  const row = ensureUserData(lib.db, user.id, itemId, epIndex)
  row.is_favorite = favorite
  row.updated_at = new Date().toISOString()
  await saveMediaDb(c.env, lib.db)
  return c.json({})
}

async function setPlayed(c: any, idRaw: string, played: boolean) {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, idRaw)
  const ids: Array<{ itemId: number; ep: number }> = []
  const numeric = id.match(/^(?:mv|so)-(\d+)$/)
  if (numeric) ids.push({ itemId: Number(numeric[1]), ep: 0 })
  const epMatch = id.match(/^ep-(\d+)-(\d+)$/)
  if (epMatch) ids.push({ itemId: Number(epMatch[1]), ep: Number(epMatch[2]) })
  // 剧集/季：批量标记
  if (id.startsWith("sr-") || id.startsWith("sn-")) {
    const key = id.startsWith("sr-") ? id.slice(3) : id.slice(3, id.lastIndexOf("-"))
    const s = lib.series.find((x) => x.key === key)
    if (s) {
      const season = id.startsWith("sn-") ? Number(id.slice(id.lastIndexOf("-") + 1)) : 0
      for (const ep of episodesOf(s, season)) {
        ids.push({ itemId: ep.item.id, ep: ep.index })
      }
    }
  }
  if (ids.length === 0) return c.json({ Error: "Not Found" }, 404)
  for (const { itemId, ep } of ids) {
    const row = ensureUserData(lib.db, user.id, itemId, ep)
    row.played = played
    if (played && row.play_count === 0) row.play_count = 1
    row.position_ticks = played ? row.position_ticks : 0
    row.updated_at = new Date().toISOString()
  }
  await saveMediaDb(c.env, lib.db)
  return c.json({})
}

embyRouter.get("/Users/:id/FavoriteItems", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const rows = listPlaylistFavorites(lib.db, user.id)
  const items: any[] = []
  for (const row of rows) {
    const item = findItem(lib.db, row.item_id)
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) continue
    items.push(makeDto(c, lib, item))
  }
  return c.json({ Items: items, TotalRecordCount: items.length })
})

function listPlaylistFavorites(db: MediaDb, userId: number) {
  return db.user_data.filter((d) => d.user_id === userId && d.is_favorite)
}

embyRouter.get("/Users/:id/PlayedItems", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const rows = lib.db.user_data.filter((d) => d.user_id === user.id && d.played)
  const items: any[] = []
  for (const row of rows) {
    const item = findItem(lib.db, row.item_id)
    if (!item) continue
    items.push(makeDto(c, lib, item))
  }
  return c.json({ Items: items, TotalRecordCount: items.length })
})

embyRouter.post("/Users/:id/FavoriteItems/:itemId", (c) =>
  setFavorite(c, c.req.param("itemId"), true),
)
embyRouter.delete("/Users/:id/FavoriteItems/:itemId", (c) =>
  setFavorite(c, c.req.param("itemId"), false),
)
embyRouter.post("/Users/:id/PlayedItems/:itemId", (c) =>
  setPlayed(c, c.req.param("itemId"), true),
)
embyRouter.delete("/Users/:id/PlayedItems/:itemId", (c) =>
  setPlayed(c, c.req.param("itemId"), false),
)

// UserData 读写
async function readUserData(c: any, idRaw: string) {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, idRaw)
  const numeric = id.match(/^(?:mv|so)-(\d+)$/)
  const epMatch = id.match(/^ep-(\d+)-(\d+)$/)
  const itemId = numeric ? Number(numeric[1]) : epMatch ? Number(epMatch[1]) : 0
  const ep = epMatch ? Number(epMatch[2]) : 0
  const item = findItem(lib.db, itemId)
  if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) {
    return null
  }
  return { item, ep, data: userDataOf(lib, itemId, ep) }
}

embyRouter.get("/Users/:id/Items/:itemId/UserData", async (c) => {
  const found = await readUserData(c, c.req.param("itemId"))
  if (!found) return c.json({ Error: "Not Found" }, 404)
  return c.json(found.data)
})

embyRouter.post("/Users/:id/Items/:itemId/UserData", async (c) => {
  const user = (c as any).get("mediaUser")
  const found = await readUserData(c, c.req.param("itemId"))
  if (!found) return c.json({ Error: "Not Found" }, 404)
  const body = await c.req.json().catch(() => ({}))
  const db = await getMediaDb(c.env)
  const row = ensureUserData(db, user.id, found.item.id, found.ep)
  if (body.Played !== undefined) row.played = !!body.Played
  if (body.IsFavorite !== undefined) row.is_favorite = !!body.IsFavorite
  if (body.PlaybackPositionTicks !== undefined) {
    row.position_ticks = Math.max(0, Number(body.PlaybackPositionTicks) || 0)
  }
  if (body.Rating !== undefined) row.rating = Number(body.Rating) || 0
  row.updated_at = new Date().toISOString()
  await saveMediaDb(c.env, db)
  return c.json(userDataOf({ ...(await loadLibrary(c.env, user)) } as EmbyLibrary, found.item.id, found.ep))
})

embyRouter.get("/Items/:id/UserData", async (c) => {
  const found = await readUserData(c, c.req.param("id"))
  if (!found) return c.json({ Error: "Not Found" }, 404)
  return c.json(found.data)
})

// 播放会话：真正落进度
async function applySessionProgress(c: any, action: "start" | "progress" | "stop") {
  const user = (c as any).get("mediaUser")
  const body = await c.req.json().catch(() => ({}))
  const idRaw = String(body.ItemId || c.req.query("ItemId") || "")
  if (!idRaw) return c.json({})
  const found = await readUserData(c, idRaw)
  if (!found) return c.json({})
  const db = await getMediaDb(c.env)
  const row = ensureUserData(db, user.id, found.item.id, found.ep)
  const ticksIn = Number(body.PositionTicks) || 0
  row.position_ticks = Math.max(0, ticksIn)
  if (ticksIn > 0) {
    row.duration_ticks = Math.max(row.duration_ticks, ticks(targetOf(found.item).duration) || 0)
  }
  row.last_played_at = new Date().toISOString()
  row.updated_at = row.last_played_at
  if (action === "start") {
    if (row.played) {
      row.played = false
      row.position_ticks = ticksIn || 0
    }
  }
  if (action === "stop") {
    const total = row.duration_ticks || ticks(found.item.duration) || 0
    if (total > 0 && row.position_ticks / total >= PLAYED_RATIO) {
      if (!row.played) {
        row.played = true
        row.play_count += 1
      }
      row.position_ticks = total
    }
  }
  await saveMediaDb(c.env, db)
  return c.json({})
}

const PLAYED_RATIO = 0.9
const targetOf = (item: MediaItem) => ({ duration: item.duration })

embyRouter.post("/Sessions/Playing", (c) => applySessionProgress(c, "start"))
embyRouter.post("/Sessions/Playing/Progress", (c) => applySessionProgress(c, "progress"))
embyRouter.post("/Sessions/Playing/Stopped", (c) => applySessionProgress(c, "stop"))
embyRouter.post("/Sessions/Logout", async (c) => {
  const token = requestToken(c)
  if (token) {
    const db = await getMediaDb(c.env)
    const hash = await mediaHelpers.sha256Hex(token)
    db.emby_devices = db.emby_devices.filter((d) => d.token !== hash)
    await saveMediaDb(c.env, db)
  }
  return c.body(null, 204)
})

embyRouter.get("/DisplayPreferences/:id", (c) =>
  c.json({
    Id: c.req.param("id") || "usersettings",
    ViewType: "",
    SortBy: "SortName",
    IndexBy: "",
    RememberIndexing: false,
    PrimaryImageHeight: 250,
    PrimaryImageWidth: 250,
    CustomPrefs: { homeSections: "" },
    ScrollDirection: "Horizontal",
    ShowBackdrop: true,
    RememberSorting: false,
    SortOrder: "Ascending",
    ShowSidebar: false,
    Client: "emby",
  }),
)
embyRouter.post("/DisplayPreferences/:id", (c) => c.body(null, 204))

embyRouter.get("/Library/SelectableMediaFolders", async (c) => {
  const lib = await loadLibrary(c.env, (c as any).get("mediaUser"))
  return c.json(viewDtos(c, lib).map((v) => ({ ...v, SubFolders: [] })))
})
embyRouter.get("/Library/VirtualFolders/Query", async (c) => {
  const lib = await loadLibrary(c.env, (c as any).get("mediaUser"))
  return c.json({ Items: viewDtos(c, lib), TotalRecordCount: viewDtos(c, lib).length })
})
embyRouter.post("/Library/Refresh", (c) => c.json({}))

embyRouter.get("/Search/Hints", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const term = (c.req.query("SearchTerm") || "").toLowerCase()
  const list = filterDtos(allDtos(c, lib, []), c, lib)
    .filter((d) => !term || String(d.Name || "").toLowerCase().includes(term))
    .slice(0, 50)
    .map((d) => ({
      Id: d.Id,
      Name: d.Name,
      Type: d.Type,
      MediaType: d.MediaType,
      IsFolder: d.IsFolder,
      ProductionYear: d.ProductionYear,
    }))
  return c.json({ SearchHints: list, TotalRecordCount: list.length })
})

// 播放流
async function stream(c: any, idRaw: string) {
  const user = (c as any).get("mediaUser")
  const target = await playTarget(c, idRaw)
  if (!target) return c.body(null, 404)
  if (!target.item || !(await mediaHelpers.canAccessItem(c.env, user, target.item))) {
    return c.body(null, 404)
  }
  const policy = await getSignPolicy(c)
  const sign = await signDownloadPath(c, target.rawPath, policy.expiresIn)
  return c.redirect(
    `${originOf(c)}/d${encodeDownloadPath(target.rawPath)}?sign=${encodeURIComponent(sign)}`,
  )
}
embyRouter.get("/Videos/:id/stream", (c) => stream(c, c.req.param("id")))
embyRouter.get("/Audio/:id/stream", (c) => stream(c, c.req.param("id")))
embyRouter.get("/Audio/:id/universal", (c) => stream(c, c.req.param("id")))
embyRouter.get("/Videos/:id/stream.:ext", (c) => stream(c, c.req.param("id")))

// 字幕（歌词）
embyRouter.get("/Items/:id/Subtitles/:index/Stream.js", async (c) => {
  const user = (c as any).get("mediaUser")
  const lib = await loadLibrary(c.env, user)
  const id = origId(lib, c.req.param("id"))
  const numeric = id.match(/^so-(\d+)$/)
  const item = numeric ? findItem(lib.db, Number(numeric[1])) : undefined
  if (!item?.lyrics) return c.body(null, 404)
  const lrc = item.lyrics
  // 简单 LRC → SRT
  const lines: string[] = []
  const re = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/
  let idx = 1
  for (const raw of lrc.split("\n")) {
    const m = raw.match(re)
    if (!m) continue
    const start =
      Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(`0.${m[3] || 0}`)
    lines.push(
      `${idx++}\n${srtTime(start)} --> ${srtTime(start + 3)}\n${m[4]}`,
    )
  }
  c.header("Content-Type", "text/plain; charset=utf-8")
  return c.body(lines.length ? lines.join("\n\n") : lrc)
})

const srtTime = (seconds: number) => {
  const s = Math.max(0, seconds)
  const hh = String(Math.floor(s / 3600)).padStart(2, "0")
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0")
  const ss = String(Math.floor(s % 60)).padStart(2, "0")
  const ms = String(Math.floor((s % 1) * 1000)).padStart(3, "0")
  return `${hh}:${mm}:${ss},${ms}`
}

const embyWebNotice = () => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenList - Emby API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:720px;margin:64px auto;padding:0 20px;line-height:1.8;color:#222">
<h2>OpenList 仅提供 Emby 兼容 API</h2>
<p>当前地址没有 Emby Web 客户端界面，请使用支持 Emby 协议的客户端添加服务器。</p>
<table style="border-collapse:collapse">
<tr><td style="padding:4px 12px 4px 0;color:#666">服务器地址</td><td><code>http://你的地址/@emby</code></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">用户名</td><td>OpenList 用户名</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">密码</td><td>OpenList 密码或媒体应用密钥</td></tr>
</table>
</body></html>`

// ==================== Subsonic ====================

export const subsonicRouter = new Hono()

type SubPayload = Record<string, any>

const xmlEscape = (value: string) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

/** 通用 XML 序列化：标量 → 属性，对象/数组 → 子元素，#text → chardata */
function toXmlNode(name: string, value: any): string {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) {
    return value.map((v) => toXmlNode(name, v)).join("")
  }
  if (typeof value !== "object") {
    if (typeof value === "boolean") value = value ? "true" : "false"
    return `<${name}>${xmlEscape(String(value))}</${name}>`
  }
  const attrs: string[] = []
  let text = ""
  const children: string[] = []
  for (const [k, v] of Object.entries(value)) {
    if (v === null || v === undefined) continue
    if (k === "#text") {
      text = xmlEscape(String(v))
      continue
    }
    if (Array.isArray(v) || typeof v === "object") {
      const inner = toXmlNode(k, v)
      if (inner) children.push(inner)
    } else {
      const raw = typeof v === "boolean" ? (v ? "true" : "false") : String(v)
      attrs.push(`${k}="${xmlEscape(raw)}"`)
    }
  }
  const a = attrs.length ? ` ${attrs.join(" ")}` : ""
  const inner = children.join("")
  if (!inner && !text) return `<${name}${a}/>`
  return `<${name}${a}>${text}${inner}</${name}>`
}

function subRespond(c: any, payload: SubPayload = {}, status: "ok" | "failed" = "ok", error?: any) {
  const body: any = {
    status,
    version: SUBSONIC_VERSION,
    type: "OpenList",
    serverVersion: EMBY_VERSION,
    openSubsonic: true,
    ...payload,
  }
  if (error) body.error = error
  const format = String(
    c.req.query("f") || c.req.query("format") || "xml",
  ).toLowerCase()
  if (format === "json") return c.json({ "subsonic-response": body })
  if (format === "jsonp") {
    const cb = String(c.req.query("callback") || "")
    if (!/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(cb)) {
      return c.json(
        {
          "subsonic-response": {
            status: "failed",
            version: SUBSONIC_VERSION,
            type: "OpenList",
            error: { code: 0, message: "invalid callback parameter" },
          },
        },
        200,
      )
    }
    c.header("Content-Type", "application/javascript; charset=utf-8")
    return c.body(`${cb}(${JSON.stringify({ "subsonic-response": body })})`)
  }
  c.header("Content-Type", "text/xml; charset=utf-8")
  return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n${toXmlNode("subsonic-response", body)}`)
}

const subError = (c: any, code: number, message: string) =>
  subRespond(c, {}, "failed", { code, message })

/** Subsonic 参数：query + POST 表单 */
async function subParams(c: any): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(c.req.query())) out[k] = String(v)
  const method = c.req.method.toUpperCase()
  if (method === "POST") {
    try {
      const ct = String(c.req.header("content-type") || "").toLowerCase()
      if (ct.includes("json")) {
        const body = (await c.req.json()) as Record<string, any>
        for (const [k, v] of Object.entries(body || {})) out[k] = String(v)
      } else if (ct.includes("form")) {
        const form = await c.req.formData()
        form.forEach((v: any, k: string) => {
          out[k] = String(v)
        })
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

const param = (p: Record<string, string>, key: string, def = "") =>
  p[key] ?? p[key.toLowerCase()] ?? def
const intParam = (p: Record<string, string>, key: string, def = 0) => {
  const n = parseInt(param(p, key), 10)
  return Number.isFinite(n) ? n : def
}

/** 用应用密钥明文校验 Subsonic token（md5(password + salt)） */
async function appKeyPlainFor(c: any, row: any): Promise<string> {
  return await mediaHelpers.appKeyPlainOf(c, row)
}

async function subAuth(c: any, p: Record<string, string>) {
  const db = await getMediaDb(c.env)
  // 1) apiKey 直接认证（OpenSubsonic apiKeyAuthentication）
  const apiKey = param(p, "apiKey")
  if (apiKey) {
    const row = await findAppKeyByPlain(c.env, apiKey, db)
    if (row) {
      const user = await userFromDb(c.env, row.user_id)
      if (user && !user.disabled && user.username !== "guest") {
        row.last_used_at = new Date().toISOString()
        await mediaHelpers.authSucceeded(c, user.username)
        return user
      }
    }
    return null
  }

  const username = param(p, "u")
  if (!username) return null
  const user = await userFromDb(c.env, undefined, username)
  if (!user || user.disabled || user.username === "guest") return null

  const salt = param(p, "s")
  const token = param(p, "t")
  if (salt && token) {
    for (const row of db.app_keys.filter((k) => k.user_id === user.id)) {
      const plain = await appKeyPlainFor(c, row)
      if (!plain) continue
      const expect = md5Hex(`${plain}${salt}`)
      if (expect.toLowerCase() === token.toLowerCase()) {
        row.last_used_at = new Date().toISOString()
        await mediaHelpers.authSucceeded(c, user.username)
        return user
      }
    }
    return null
  }

  // u+p：默认关闭（对齐 Go 的 media_subsonic_allow_password_auth），
  // 客户端应使用 apiKey 或 u+t+s（应用密钥）认证。
  const settings = await getSettingsMap(c.env)
  if (!settingBool(settings, "media_subsonic_allow_password_auth", false)) {
    return null
  }
  let pw = param(p, "p")
  if (pw.startsWith("enc:")) {
    try {
      const hex = pw.slice(4)
      const bytes = Uint8Array.from(
        (hex.match(/.{2}/g) || []).map((h) => parseInt(h, 16)),
      )
      pw = new TextDecoder().decode(bytes)
    } catch {
      return null
    }
  }
  if (!pw || !user.password) return null
  const hash = await twoStepHash(pw, user.salt)
  if (hash !== user.password) return null
  await mediaHelpers.authSucceeded(c, user.username)
  return user
}

/**
 * 请求是否真的带了认证凭据（对齐 Go 的 subHasCredential）。
 * 只有 u 没有 t/p 的裸探测不算失败：部分客户端启动时会先发一次空探测，
 * 计入失败会把它自己的 IP 锁死。
 */
const hasCredential = (p: Record<string, string>) => {
  if (param(p, "apiKey")) return true
  if (!param(p, "u")) return false
  return !!(param(p, "t") || param(p, "p"))
}

const subSongDto = (item: MediaItem) => ({
  id: `so-${item.id}`,
  parent: `al-${albumKeyOf(item)}`,
  isDir: false,
  title: item.scraped_name || item.file_name.replace(/\.[^.]+$/, ""),
  album: albumOf(item),
  artist: artistOf(item),
  track: item.track_number || 0,
  year: yearOf(item.release_date) || undefined,
  genre: item.genre || undefined,
  coverArt: `so-${item.id}`,
  size: item.file_size,
  contentType: item.mime_type || `audio/${extOf(item.file_name) || "mpeg"}`,
  suffix: extOf(item.file_name) || "mp3",
  duration: item.duration || 0,
  created: item.created_at,
  type: "music",
  isVideo: false,
  path: `${item.folder_path.replace(/\/+$/, "")}/${item.file_name}`,
})

const subAlbumDto = (al: EmbyAlbum) => {
  const duration = al.items.reduce((n, s) => n + (s.duration || 0), 0)
  return {
    id: `al-${al.key}`,
    name: al.name,
    artist: al.artist,
    artistId: `ar-${artistKeyOf(al.items[0])}`,
    coverArt: `al-${al.key}`,
    songCount: al.items.length,
    duration,
    created: al.items[0]?.created_at || new Date().toISOString(),
    year: al.year || undefined,
    song: al.items
      .slice()
      .sort((a, b) => a.track_number - b.track_number)
      .map((s) => subSongDto(s)),
  }
}

const subArtistDto = (artist: string, items: MediaItem[], albums: EmbyAlbum[]) => ({
  id: `ar-${hashKey(artist.toLowerCase())}`,
  name: artist,
  albumCount: albums.length,
  album: albums.map((al) => ({
    id: `al-${al.key}`,
    name: al.name,
    artist,
    artistId: `ar-${hashKey(artist.toLowerCase())}`,
    coverArt: `al-${al.key}`,
    songCount: al.items.length,
    duration: al.items.reduce((n, s) => n + (s.duration || 0), 0),
    created: al.items[0]?.created_at || new Date().toISOString(),
  })),
})

const handleSubsonic = async (c: any, methodRaw: string) => {
  const p = await subParams(c)
  const method = String(methodRaw || param(p, "method") || "")
    .toLowerCase()
    .replace(/\.view$/, "")
  if (method === "ping") return subRespond(c, {})
  if (method === "getlicense") return subRespond(c, { license: { valid: true } })
  if (method === "getopensubsonicextensions") {
    return subRespond(c, {
      openSubsonicExtensions: [
        { name: "apiKeyAuthentication", versions: [1] },
        { name: "formPost", versions: [1] },
        { name: "songLyrics", versions: [1] },
      ],
    })
  }

  if (await mediaHelpers.authLockedFor(c, param(p, "u"))) {
    return subError(c, 40, "Too many failed attempts, please try again later")
  }
  const user = await subAuth(c, p)
  if (!user) {
    if (hasCredential(p)) await mediaHelpers.authFailed(c, param(p, "u"))
    return subError(c, 40, "Wrong username or password")
  }

  const db = await getMediaDb(c.env)
  const lib = await loadLibrary(c.env, user)
  const music = lib.music

  const songList = () =>
    music
      .slice()
      .sort((a, b) => a.file_name.localeCompare(b.file_name, "zh-CN"))

  switch (method) {
    case "tokeninfo":
    case "getuser":
      return subRespond(c, {
        user: {
          username: user.username,
          scrobblingEnabled: true,
          adminRole: isAdmin(user),
          downloadRole: true,
          playlistRole: true,
          streamRole: true,
          coverArtRole: true,
        },
      })
    case "getusers":
      if (!isAdmin(user)) return subError(c, 50, "not authorized")
      {
        const udb = await getDb(c.env)
        return subRespond(c, {
          users: (udb.users || [])
            .filter((u: any) => !u.disabled && u.username !== "guest")
            .map((u: any) => ({
              username: u.username,
              scrobblingEnabled: true,
              adminRole: isAdmin(u),
              downloadRole: true,
              playlistRole: true,
              streamRole: true,
              coverArtRole: true,
            })),
        })
      }
    case "getmusicfolders":
      return subRespond(c, { musicFolders: [{ id: 1, name: "Music" }] })
    case "getindexes": {
      const map = new Map<string, any>()
      for (const item of music) {
        const artist = artistOf(item)
        const letter = artist.slice(0, 1).toUpperCase() || "#"
        const entry = map.get(letter) || { name: letter, artist: [] }
        if (!entry.artist.some((a: any) => a.name === artist)) {
          entry.artist.push({
            id: `ar-${artistKeyOf(item)}`,
            name: artist,
            albumCount: lib.albums.filter((al) => al.artist === artist).length,
          })
        }
        map.set(letter, entry)
      }
      return subRespond(c, {
        indexes: {
          lastModified: Date.now(),
          ignoredArticles: "The El La Los Las Le Les",
          index: Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        },
      })
    }
    case "getartists": {
      const map = new Map<string, any>()
      for (const al of lib.albums) {
        const key = artistKeyOf(al.items[0])
        const entry = map.get(key) || {
          id: `ar-${key}`,
          name: al.artist,
          albumCount: 0,
          album: [] as any[],
        }
        entry.albumCount += 1
        entry.album.push({
          id: `al-${al.key}`,
          name: al.name,
          artist: al.artist,
          artistId: `ar-${key}`,
          coverArt: `al-${al.key}`,
          songCount: al.items.length,
          duration: al.items.reduce((n, s) => n + (s.duration || 0), 0),
          created: al.items[0]?.created_at || new Date().toISOString(),
        })
        map.set(key, entry)
      }
      return subRespond(c, {
        artists: {
          ignoredArticles: "",
          index: [{ name: "#", artist: Array.from(map.values()) }],
        },
      })
    }
    case "getartist": {
      const id = param(p, "id")
      const key = id.replace(/^ar-/, "")
      const al = lib.albums.find((a) => artistKeyOf(a.items[0]) === key)
      if (!al) return subError(c, 70, "Artist not found")
      const albums = lib.albums.filter((a) => artistKeyOf(a.items[0]) === key)
      return subRespond(c, {
        artist: subArtistDto(al.artist, al.items, albums),
      })
    }
    case "getalbum": {
      const key = param(p, "id").replace(/^al-/, "")
      const al = lib.albums.find((a) => a.key === key)
      if (!al) return subError(c, 70, "Album not found")
      return subRespond(c, { album: subAlbumDto(al) })
    }
    case "getsong": {
      const id = param(p, "id").replace(/^so-/, "")
      const item = music.find((m) => String(m.id) === id)
      if (!item) return subError(c, 70, "Song not found")
      return subRespond(c, { song: subSongDto(item) })
    }
    case "getmusicdirectory": {
      const id = param(p, "id")
      if (id.startsWith("ar-") || id === "1") {
        const key = id.replace(/^ar-/, "")
        const albums = lib.albums.filter(
          (a) => !key || artistKeyOf(a.items[0]) === key,
        )
        return subRespond(c, {
          directory: {
            id,
            name: key ? albums[0]?.artist || "Artist" : "Music",
            child: albums.map((al) => ({
              id: `al-${al.key}`,
              parent: id,
              isDir: true,
              title: al.name,
              album: al.name,
              artist: al.artist,
              coverArt: `al-${al.key}`,
              created: al.items[0]?.created_at || new Date().toISOString(),
            })),
          },
        })
      }
      if (id.startsWith("al-")) {
        const key = id.slice(3)
        const al = lib.albums.find((a) => a.key === key)
        if (!al) return subError(c, 70, "Album not found")
        return subRespond(c, {
          directory: {
            id,
            parent: `ar-${artistKeyOf(al.items[0])}`,
            name: al.name,
            child: al.items.map((s) => ({
              ...subSongDto(s),
              parent: id,
              isDir: false,
            })),
          },
        })
      }
      return subError(c, 70, "Directory not found")
    }
    case "getalbumlist":
    case "getalbumlist2": {
      let albums = lib.albums.slice()
      const type = param(p, "type", "alphabeticalByName")
      if (type === "random") {
        albums.sort(() => Math.random() - 0.5)
      } else if (type === "newest") {
        albums.sort((a, b) =>
          String(b.items[0]?.created_at).localeCompare(String(a.items[0]?.created_at)),
        )
      } else if (type === "recent") {
        albums.sort((a, b) =>
          String(b.items[0]?.updated_at).localeCompare(String(a.items[0]?.updated_at)),
        )
      } else {
        albums.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
      }
      const size = Math.min(intParam(p, "size", 50) || 50, 500)
      const offset = Math.max(0, intParam(p, "offset", 0))
      const list = albums.slice(offset, offset + size).map((al) => {
        if (method === "getalbumlist") {
          return {
            id: `al-${al.key}`,
            parent: `ar-${artistKeyOf(al.items[0])}`,
            isDir: true,
            title: al.name,
            album: al.name,
            artist: al.artist,
            coverArt: `al-${al.key}`,
            created: al.items[0]?.created_at || new Date().toISOString(),
          }
        }
        return {
          id: `al-${al.key}`,
          name: al.name,
          artist: al.artist,
          artistId: `ar-${artistKeyOf(al.items[0])}`,
          coverArt: `al-${al.key}`,
          songCount: al.items.length,
          duration: al.items.reduce((n, s) => n + (s.duration || 0), 0),
          created: al.items[0]?.created_at || new Date().toISOString(),
        }
      })
      return subRespond(
        c,
        method === "getalbumlist"
          ? { albumList: { album: list } }
          : { albumList2: { album: list } },
      )
    }
    case "getrandomsongs": {
      const size = Math.min(intParam(p, "size", 10) || 10, 500)
      const list = songList().sort(() => Math.random() - 0.5).slice(0, size)
      return subRespond(c, { randomSongs: { song: list.map(subSongDto) } })
    }
    case "getsongsbygenre": {
      const genre = param(p, "genre").toLowerCase()
      const list = music.filter((m) => (m.genre || "").toLowerCase().includes(genre))
      return subRespond(c, { songsByGenre: { song: list.map(subSongDto) } })
    }
    case "search2":
    case "search3": {
      const q = param(p, "query").toLowerCase()
      const match = (value: string) => !q || String(value || "").toLowerCase().includes(q)
      const artists = new Map<string, any>()
      for (const item of music) {
        if (!match(artistOf(item))) continue
        artists.set(artistKeyOf(item), {
          id: `ar-${artistKeyOf(item)}`,
          name: artistOf(item),
          albumCount: lib.albums.filter((a) => artistKeyOf(a.items[0]) === artistKeyOf(item)).length,
        })
      }
      const albums = lib.albums
        .filter((al) => match(al.name) || match(al.artist))
        .map((al) => ({
          id: `al-${al.key}`,
          name: al.name,
          artist: al.artist,
          artistId: `ar-${artistKeyOf(al.items[0])}`,
          coverArt: `al-${al.key}`,
          songCount: al.items.length,
          duration: al.items.reduce((n, s) => n + (s.duration || 0), 0),
        }))
      const songs = music
        .filter((s) => match(s.file_name) || match(s.scraped_name) || match(albumOf(s)) || match(artistOf(s)))
        .slice(0, 100)
        .map(subSongDto)
      const key = method === "search2" ? "searchResult2" : "searchResult3"
      return subRespond(c, {
        [key]: {
          artist: Array.from(artists.values()),
          album: albums,
          song: songs,
        },
      })
    }
    case "getstarred":
    case "getstarred2": {
      const fav = db.user_data.filter((d) => d.user_id === user.id && d.is_favorite)
      const ids = new Set(fav.map((d) => d.item_id))
      const songs = music.filter((m) => ids.has(m.id))
      const albums = lib.albums.filter((al) => al.items.some((i) => ids.has(i.id)))
      const artists = Array.from(
        new Set(songs.map((s) => artistOf(s))),
      ).map((name) => ({
        id: `ar-${hashKey(name.toLowerCase())}`,
        name,
        albumCount: albums.filter((a) => a.artist === name).length,
      }))
      const payload = {
        artist: artists,
        album: albums.map((al) => ({
          id: `al-${al.key}`,
          name: al.name,
          artist: al.artist,
          artistId: `ar-${artistKeyOf(al.items[0])}`,
          coverArt: `al-${al.key}`,
          songCount: al.items.length,
          duration: al.items.reduce((n, s) => n + (s.duration || 0), 0),
        })),
        song: songs.map(subSongDto),
      }
      return subRespond(
        c,
        method === "getstarred" ? { starred: payload } : { starred2: payload },
      )
    }
    case "star":
    case "unstar": {
      const id = param(p, "id")
      const ids: string[] = [id]
      const albumId = param(p, "albumId")
      const artistId = param(p, "artistId")
      if (albumId) {
        const al = lib.albums.find((a) => `al-${a.key}` === albumId)
        if (al) ids.push(...al.items.map((i) => `so-${i.id}`))
      }
      if (artistId) {
        const key = artistId.replace(/^ar-/, "")
        for (const al of lib.albums.filter((a) => artistKeyOf(a.items[0]) === key)) {
          ids.push(...al.items.map((i) => `so-${i.id}`))
        }
      }
      for (const raw of ids) {
        const itemId = Number(String(raw).replace(/^so-/, ""))
        if (!itemId) continue
        const row = ensureUserData(db, user.id, itemId)
        row.is_favorite = method === "star"
        row.updated_at = new Date().toISOString()
      }
      await saveMediaDb(c.env, db)
      return subRespond(c, {})
    }
    case "setrating": {
      const id = Number(param(p, "id").replace(/^so-/, ""))
      const rating = Math.max(0, Math.min(5, intParam(p, "rating", 0)))
      if (id) {
        const row = ensureUserData(db, user.id, id)
        row.rating = rating
        row.updated_at = new Date().toISOString()
        await saveMediaDb(c.env, db)
      }
      return subRespond(c, {})
    }
    case "scrobble": {
      const id = Number(param(p, "id").replace(/^so-/, ""))
      if (id) {
        const row = ensureUserData(db, user.id, id)
        const submission = param(p, "submission", "true") !== "false"
        if (submission) {
          row.play_count += 1
          row.played = true
        }
        row.last_played_at = new Date().toISOString()
        row.updated_at = row.last_played_at
        await saveMediaDb(c.env, db)
      }
      return subRespond(c, {})
    }
    case "getnowplaying":
      return subRespond(c, { nowPlaying: { entry: [] } })
    case "getplaylists":
      return subRespond(c, {
        playlists: listPlaylists(db, user.id).map((pl) => ({
          id: String(pl.id),
          name: pl.name,
          comment: pl.comment || undefined,
          owner: user.username,
          public: pl.public,
          songCount: pl.item_count,
          duration: playlistItems(db, pl.id).reduce((n, it) => {
            const item = findItem(db, it.item_id)
            return n + (item?.duration || 0)
          }, 0),
          created: pl.created_at,
        })),
      })
    case "getplaylist": {
      const id = Number(param(p, "id"))
      const pl = getPlaylist(db, id)
      if (!pl) return subError(c, 70, "Playlist not found")
      if (pl.user_id !== user.id && !pl.public && !isAdmin(user)) {
        return subError(c, 50, "not authorized")
      }
      return subRespond(c, {
        playlist: {
          id: String(pl.id),
          name: pl.name,
          comment: pl.comment || undefined,
          owner: user.username,
          public: pl.public,
          songCount: pl.item_count,
          created: pl.created_at,
          entry: playlistItems(db, pl.id)
            .map((it) => findItem(db, it.item_id))
            .filter((i): i is MediaItem => !!i)
            .map(subSongDto),
        },
      })
    }
    case "createplaylist": {
      let ids = (param(p, "songId") || "")
        .split(",")
        .map((s) => Number(s.replace(/^so-/, "")))
        .filter(Boolean)
      const playlistId = intParam(p, "playlistId", 0)
      if (playlistId) {
        const pl = getPlaylist(db, playlistId)
        if (!pl) return subError(c, 70, "Playlist not found")
        if (ids.length) replacePlaylistItems(db, playlistId, ids)
        await saveMediaDb(c.env, db)
        return subRespond(c, {})
      }
      const name = param(p, "name") || "Playlist"
      const pl = createPlaylist(
        db,
        user.id,
        name,
        ids,
        param(p, "comment"),
        param(p, "public") === "true",
      )
      await saveMediaDb(c.env, db)
      return subRespond(c, {
        playlist: { id: String(pl.id), name: pl.name, songCount: pl.item_count },
      })
    }
    case "updateplaylist": {
      const id = Number(param(p, "playlistId"))
      const pl = getPlaylist(db, id)
      if (!pl) return subError(c, 70, "Playlist not found")
      if (pl.user_id !== user.id && !isAdmin(user)) return subError(c, 50, "not authorized")
      const add = (param(p, "songIdToAdd") || "")
        .split(",")
        .map((s) => Number(s.replace(/^so-/, "")))
        .filter(Boolean)
      const removeIdx = (param(p, "songIndexToRemove") || "")
        .split(",")
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n))
      const items = playlistItems(db, id).map((it) => it.item_id)
      for (const idx of removeIdx.sort((a, b) => b - a)) items.splice(idx, 1)
      items.push(...add)
      updatePlaylist(db, pl, {
        name: param(p, "name") || undefined,
        comment: param(p, "comment") || undefined,
        public:
          param(p, "public") === "" ? undefined : param(p, "public") === "true",
        itemIds: items,
      })
      await saveMediaDb(c.env, db)
      return subRespond(c, {})
    }
    case "deleteplaylist": {
      const id = Number(param(p, "id"))
      const pl = getPlaylist(db, id)
      if (!pl) return subError(c, 70, "Playlist not found")
      if (pl.user_id !== user.id && !isAdmin(user)) return subError(c, 50, "not authorized")
      deletePlaylist(db, id)
      await saveMediaDb(c.env, db)
      return subRespond(c, {})
    }
    case "saveplayqueue": {
      const ids = (param(p, "id") || "")
        .split(",")
        .map((s) => Number(s.replace(/^so-/, "")))
        .filter(Boolean)
      savePlayQueue(db, user.id, ids, param(p, "current"), intParam(p, "position", 0))
      await saveMediaDb(c.env, db)
      return subRespond(c, {})
    }
    case "getplayqueue": {
      const queue = getPlayQueue(db, user.id)
      return subRespond(c, {
        playQueue: queue
          ? {
              current: queue.current || undefined,
              position: queue.position || undefined,
              username: user.username,
              changed: queue.changed,
              entry: queue.entry_ids
                .map((id) => findItem(db, id))
                .filter((i): i is MediaItem => !!i)
                .map(subSongDto),
            }
          : undefined,
      })
    }
    case "getlyrics": {
      const artist = param(p, "artist")
      const title = param(p, "title")
      const item = music.find(
        (m) =>
          (!artist || artistOf(m) === artist) &&
          (!title || (m.scraped_name || m.file_name).includes(title)),
      )
      return subRespond(c, {
        lyrics: item?.lyrics
          ? { artist: artistOf(item), title: item.scraped_name || item.file_name, value: item.lyrics }
          : undefined,
      })
    }
    case "getlyricsbysongid": {
      const id = Number(param(p, "id").replace(/^so-/, ""))
      const item = findItem(db, id)
      return subRespond(c, {
        lyricsList: item?.lyrics
          ? {
              structuredLyrics: {
                displayArtist: artistOf(item),
                displayTitle: item.scraped_name || item.file_name,
                lang: "und",
                synced: item.lyrics.includes("["),
                line: [],
                "#text": item.lyrics,
              },
            }
          : undefined,
      })
    }
    case "getgenres": {
      const map = new Map<string, { songCount: number; albumCount: number }>()
      for (const item of music) {
        for (const g of String(item.genre || "").split(",").map((s) => s.trim()).filter(Boolean)) {
          const row = map.get(g) || { songCount: 0, albumCount: 0 }
          row.songCount += 1
          map.set(g, row)
        }
      }
      for (const al of lib.albums) {
        for (const item of al.items) {
          for (const g of String(item.genre || "").split(",").map((s) => s.trim()).filter(Boolean)) {
            const row = map.get(g)
            if (row) row.albumCount += 1
          }
        }
      }
      return subRespond(c, {
        genres: Array.from(map.entries()).map(([value, row]) => ({
          value,
          songCount: row.songCount,
          albumCount: row.albumCount,
        })),
      })
    }
    case "getscanstatus":
      return subRespond(c, {
        scanStatus: { scanning: false, count: music.length },
      })
    case "startscan":
      if (!isAdmin(user)) return subError(c, 50, "not authorized")
      {
        const { scanMedia } = await import("../internal/media/scan")
        void scanMedia(c.env, "music").catch(() => undefined)
      }
      return subRespond(c, {})
    case "getartistinfo2":
      return subRespond(c, { artistInfo2: {} })
    case "getalbuminfo":
    case "getalbuminfo2":
      return subRespond(c, { albumInfo: {} })
    case "gettopsongs":
    case "getsimilarsongs2":
      return subRespond(c, { topSongs: { song: [] } })
    case "getbookmarks":
      return subRespond(c, { bookmarks: {} })
    case "getavatars":
      return c.body(null, 404)
    case "stream":
    case "download": {
      const id = param(p, "id")
      let item: MediaItem | undefined
      if (id.startsWith("al-")) {
        const key = id.slice(3)
        const al = lib.albums.find((a) => a.key === key)
        item = al?.items[0]
      } else {
        item = findItem(db, Number(id.replace(/^so-/, "")))
      }
      if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) {
        return c.body(null, 404)
      }
      const settings = await getSettingsMap(c.env)
      const path = mediaHelpers.itemPath(item)
      const policy = await getSignPolicy(c)
      const sign = await signDownloadPath(c, path, policy.expiresIn)
      // media_subsonic_proxy_stream：不跟随 302 的客户端直接走 /p
      const useProxy = settingBool(settings, "media_subsonic_proxy_stream", false)
      const prefix = useProxy ? "/p" : "/d"
      return c.redirect(
        `${originOf(c)}${prefix}${encodeDownloadPath(path)}?sign=${encodeURIComponent(sign)}`,
      )
    }
    case "getcoverart": {
      const id = param(p, "id")
      let cover = ""
      if (id.startsWith("so-")) {
        cover = findItem(db, Number(id.slice(3)))?.cover || ""
      } else if (id.startsWith("al-")) {
        cover = lib.albums.find((a) => a.key === id.slice(3))?.cover || ""
      } else if (id.startsWith("ar-")) {
        const key = id.slice(3)
        cover =
          lib.albums.find((a) => artistKeyOf(a.items[0]) === key)?.cover || ""
      }
      if (!cover) return c.body(null, 404)
      return serveCover(c, cover)
    }
    default:
      return subError(c, 0, `unknown method: ${method}`)
  }
}

subsonicRouter.use("*", async (c, next) => {
  const settings = await getSettingsMap(c.env)
  if (!mediaProtocolEnabled(settings, "media_subsonic_enabled")) {
    return c.notFound()
  }
  await next()
})

// 兼容 /@rest/ping 与 /@rest/rest/ping 两种接入方式
subsonicRouter.all("/rest/:method", async (c) =>
  handleSubsonic(c, c.req.param("method")),
)
subsonicRouter.all("/:method", async (c) => handleSubsonic(c, c.req.param("method")))

/** 单测入口（不参与运行时逻辑） */
export const __embyTest = {
  toXmlNode,
  numericId,
  episodesOf,
  seasonListOf,
  parseEpisodesOf,
}
