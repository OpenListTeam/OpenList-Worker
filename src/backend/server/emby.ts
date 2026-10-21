/**
 * Emby / OpenSubsonic 兼容层（Worker 版）。
 *
 * 目标：让 Infuse / VidHub / Symfonium / Feishin 等客户端可以直接接入
 * Worker 媒体库。只实现浏览、播放、收藏、进度所需的核心端点。
 */

import { Hono } from "hono"

import { getDb } from "../internal/model/db"
import { twoStepHash } from "../pkg/password"
import { md5 as md5Hex } from "../pkg/crypto"
import { encodeDownloadPath } from "../pkg/path"
import { getSignExpiresIn, signDownloadPath } from "../pkg/sign"
import { isAdmin } from "../pkg/permission"
import { getNearestMeta, canAccess } from "../pkg/meta"
import {
  mediaEnabled,
  mediaProtocolEnabled,
  type MediaItem,
  type MediaType,
} from "../internal/media/model"
import {
  ensureUserData,
  findItem,
  getMediaDb,
  getSettingsMap,
  getUserData,
  isTypeEnabled,
  saveMediaDb,
} from "../internal/media/store"
import { mediaHelpers } from "./media"

const originOf = (c: any) => new URL(c.req.url).origin

const b64 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
const unb64 = (value: string) => {
  try {
    const raw = value.replace(/-/g, "+").replace(/_/g, "/")
    const bin = atob(raw + "=".repeat((4 - (raw.length % 4)) % 4))
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ""
  }
}

const userFromDb = async (env: any, id?: number, name?: string) => {
  const db = await getDb(env)
  return (db.users || []).find(
    (u: any) => (id && u.id === id) || (name && u.username === name),
  )
}

const requestToken = (c: any) => {
  const header =
    c.req.header("X-Emby-Token") || c.req.header("X-MediaBrowser-Token")
  if (header) return header
  const auth =
    c.req.header("X-Emby-Authorization") || c.req.header("Authorization") || ""
  const m = auth.match(/Token="?([^",]+)"?/i)
  return m?.[1] || c.req.query("api_key") || c.req.query("ApiKey") || ""
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
  const key = db.app_keys.find((k) => k.secret === hash)
  if (key) {
    const user = await userFromDb(env, key.user_id)
    if (user && !user.disabled) {
      key.last_used_at = new Date().toISOString()
      return user
    }
  }
  return null
}

async function guestUser(env: any) {
  const guest = await userFromDb(env, undefined, "guest")
  return guest && !guest.disabled ? guest : null
}

async function accessItems(env: any, user: any, type: MediaType) {
  const db = await getMediaDb(env)
  if (!isTypeEnabled(db, type)) return []
  const out: MediaItem[] = []
  for (const item of db.items) {
    if (item.media_type !== type || item.hidden) continue
    if (!(await mediaHelpers.canAccessItem(env, user, item))) continue
    out.push(item)
  }
  return out
}

const ticks = (seconds: number) => Math.round((seconds || 0) * 10_000_000)
const year = (date: string) => Number(String(date || "").slice(0, 4)) || 0

const imageTag = (item: MediaItem) =>
  item.cover ? b64(item.cover).slice(0, 16) : undefined

const itemDto = (c: any, item: MediaItem, type?: string, extra: any = {}) => {
  const id = item.media_type === "music" ? `so-${item.id}` : `mv-${item.id}`
  return {
    Name: item.scraped_name || item.file_name,
    Id: id,
    ServerId: serverId(c),
    Type:
      type ||
      (item.media_type === "music"
        ? "Audio"
        : item.media_type === "book"
          ? "Book"
          : "Movie"),
    MediaType: item.media_type === "music" ? "Audio" : "Video",
    Overview: item.plot || item.description || "",
    ProductionYear: year(item.release_date),
    RunTimeTicks: ticks(item.duration),
    CommunityRating: item.rating || undefined,
    OfficialRating: undefined,
    ImageTags: item.cover ? { Primary: imageTag(item) } : {},
    BackdropImageTags: [],
    Genres: item.genre ? item.genre.split(",").filter(Boolean) : [],
    People: item.authors
      ? item.authors
          .split(",")
          .map((name) => ({ Name: name.trim(), Type: "Actor" }))
      : [],
    Path: mediaHelpers.itemPath(item),
    SortName: item.scraped_name || item.file_name,
    DateCreated: item.created_at,
    Album: item.album_name || undefined,
    AlbumArtist: item.album_artist || undefined,
    Artists: item.album_artist ? [item.album_artist] : undefined,
    IndexNumber: item.track_number || undefined,
    ...extra,
  }
}

const serverId = (c: any) => {
  // 稳定即可，客户端只把它当作服务器标识
  return `worker-${new URL(c.req.url).host}`.replace(/[^a-zA-Z0-9-]/g, "")
}

const signedUrl = async (c: any, path: string) => {
  const expires = await getSignExpiresIn(c)
  const sign = await signDownloadPath(c, path, expires)
  return `${originOf(c)}/d${encodeDownloadPath(path)}?sign=${encodeURIComponent(sign)}`
}

const parseAuthHeader = (raw: string) => {
  const out: Record<string, string> = {}
  for (const part of (raw || "").split(",")) {
    const idx = part.indexOf("=")
    if (idx < 0) continue
    out[part.slice(0, idx).trim().toLowerCase()] = part
      .slice(idx + 1)
      .trim()
      .replace(/^"|"$/g, "")
  }
  return out
}

// ==================== Emby ====================

export const embyRouter = new Hono()

embyRouter.use("*", async (c, next) => {
  const settings = await getSettingsMap(c.env)
  if (!mediaProtocolEnabled(settings, "media_emby_enabled")) return c.notFound()
  await next()
})

embyRouter.get("/System/Info/Public", (c) => {
  const origin = originOf(c)
  return c.json({
    ServerName: "OpenList",
    Version: "4.8.0.0",
    Id: serverId(c),
    OperatingSystem: "Linux",
    LocalAddress: origin,
    StartupWizardCompleted: true,
  })
})

embyRouter.get("/System/Ping", (c) => c.text("Emby Server"))

embyRouter.get("/Users/Public", async (c) => {
  const db = await getDb(c.env)
  const users = (db.users || []).filter(
    (u: any) => !u.disabled && u.username !== "guest",
  )
  return c.json(
    users.map((u: any) => ({
      Name: u.username,
      Id: String(u.id),
      ServerId: serverId(c),
      HasPassword: !!u.password,
      HasConfiguredPassword: !!u.password,
      Configuration: {},
      Policy: { IsAdministrator: u.role === 2, EnableAllFolders: true },
      IsAdministrator: u.role === 2,
      IsDisabled: !!u.disabled,
    })),
  )
})

embyRouter.post("/Users/AuthenticateByName", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = String(body.Username || "").trim()
  const pw = String(body.Pw || body.Password || "")
  const user = await userFromDb(c.env, undefined, name)
  if (!user || user.disabled || user.username === "guest") {
    return c.json({ Error: "Unauthorized" }, 401)
  }
  if (!user.password || !user.salt) {
    return c.json({ Error: "Unauthorized" }, 401)
  }
  const hash = await twoStepHash(pw, user.salt)
  if (hash !== user.password) {
    return c.json({ Error: "Unauthorized" }, 401)
  }
  const db = await getMediaDb(c.env)
  const token = mediaHelpers.randomToken("emb_")
  const header = parseAuthHeader(c.req.header("X-Emby-Authorization") || "")
  db.emby_devices.push({
    id: db.next_id++,
    user_id: user.id,
    device_id: header.deviceid || "",
    device_name: header.device || "",
    client: header.client || "",
    version: header.version || "",
    token: await mediaHelpers.sha256Hex(token),
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  })
  await saveMediaDb(c.env, db)
  return c.json({
    User: {
      Name: user.username,
      Id: String(user.id),
      ServerId: serverId(c),
      HasPassword: true,
      HasConfiguredPassword: true,
      Configuration: {},
      Policy: { IsAdministrator: user.role === 2, EnableAllFolders: true },
      IsAdministrator: user.role === 2,
    },
    AccessToken: token,
    ServerId: serverId(c),
  })
})

// 以下端点需要 token
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
  return c.json({
    Name: user.username,
    Id: String(user.id),
    ServerId: serverId(c),
    HasPassword: true,
    Policy: { IsAdministrator: user.role === 2 },
    IsAdministrator: user.role === 2,
  })
})

embyRouter.get("/Users/:id", async (c) => {
  const user = (c as any).get("mediaUser")
  return c.json({
    Name: user.username,
    Id: String(user.id),
    ServerId: serverId(c),
    Policy: { IsAdministrator: user.role === 2 },
    IsAdministrator: user.role === 2,
  })
})

embyRouter.get("/Users/:id/Views", async (c) => {
  const user = (c as any).get("mediaUser")
  const db = await getMediaDb(c.env)
  const views: any[] = []
  const defs: Array<[MediaType, string, string, string]> = [
    ["video", "lib-video", "Movies & TV", "movies"],
    ["music", "lib-music", "Music", "music"],
    ["image", "lib-image", "Photos", "photos"],
    ["book", "lib-book", "Books", "books"],
  ]
  for (const [type, id, name, collection] of defs) {
    if (!isTypeEnabled(db, type)) continue
    views.push({
      Name: name,
      Id: id,
      ServerId: serverId(c),
      Type: "CollectionFolder",
      CollectionType: collection,
      IsFolder: true,
      ImageTags: {},
      BackdropImageTags: [],
    })
  }
  return c.json({ Items: views, TotalRecordCount: views.length })
})

embyRouter.get("/Users/:id/FavoriteItems", async (c) => {
  const user = (c as any).get("mediaUser")
  const db = await getMediaDb(c.env)
  const fav = db.user_data.filter((d) => d.user_id === user.id && d.is_favorite)
  const items = fav
    .map((d) => findItem(db, d.item_id))
    .filter(Boolean)
    .map((item) => itemDto(c, item!))
  return c.json({ Items: items, TotalRecordCount: items.length })
})

const handleItems = async (c: any) => {
  const user = (c as any).get("mediaUser")
  const db = await getMediaDb(c.env)
  const parent = c.req.query("ParentId") || "views"
  const search = (c.req.query("SearchTerm") || "").toLowerCase()
  const start = Number(c.req.query("StartIndex") || 0)
  const limit = Math.min(Number(c.req.query("Limit") || 100), 500)
  const types = (c.req.query("IncludeItemTypes") || "").split(",")
  let items: any[] = []

  if (parent === "views") {
    return c.json({ Items: [], TotalRecordCount: 0 })
  }

  if (parent === "lib-video") {
    const videos = (await accessItems(c.env, user, "video")).filter(
      (i) =>
        !search ||
        (i.scraped_name || i.file_name).toLowerCase().includes(search),
    )
    items = videos.map((item) => {
      const eps = (() => {
        try {
          return JSON.parse(item.episodes || "[]")
        } catch {
          return []
        }
      })()
      if (eps.length > 0 && types.includes("Series")) {
        return itemDto(c, item, "Series", {
          Id: `sr-${b64(item.folder_path)}`,
          ChildCount: eps.length,
          RecursiveItemCount: eps.length,
        })
      }
      return itemDto(c, item)
    })
  } else if (parent === "lib-music") {
    const songs = await accessItems(c.env, user, "music")
    if (types.includes("MusicAlbum") || !types.includes("Audio")) {
      const map = new Map<string, any>()
      for (const song of songs) {
        const album = song.album_name || "未知专辑"
        const artist = song.album_artist || "未知艺术家"
        const key = `${artist}\u0000${album}`
        const dto = map.get(key) || {
          Name: album,
          Id: `al-${b64(key)}`,
          ServerId: serverId(c),
          Type: "MusicAlbum",
          AlbumArtist: artist,
          Artists: [artist],
          ProductionYear: year(song.release_date),
          ImageTags: song.cover ? { Primary: imageTag(song) } : {},
          ChildCount: 0,
        }
        dto.ChildCount += 1
        map.set(key, dto)
      }
      items = Array.from(map.values())
    } else {
      items = songs.map((s) => itemDto(c, s))
    }
  } else if (parent.startsWith("al-")) {
    const key = unb64(parent.slice(3))
    const [artist, album] = key.split("\u0000")
    const songs = (await accessItems(c.env, user, "music")).filter(
      (s) =>
        (s.album_name || "未知专辑") === album &&
        (s.album_artist || "未知艺术家") === artist,
    )
    songs.sort((a, b) => a.track_number - b.track_number)
    items = songs.map((s, idx) =>
      itemDto(c, s, "Audio", {
        ParentId: parent,
        IndexNumber: s.track_number || idx + 1,
      }),
    )
  } else if (parent.startsWith("sr-")) {
    const folder = unb64(parent.slice(3))
    const videos = await accessItems(c.env, user, "video")
    const series = videos.find((v) => v.folder_path === folder)
    if (series) {
      const eps = (() => {
        try {
          return JSON.parse(series.episodes || "[]")
        } catch {
          return []
        }
      })()
      items = eps.map((ep: any) =>
        itemDto(c, series, "Episode", {
          Id: `ep-${series.id}-${ep.index}`,
          Name: ep.title || ep.file_name,
          IndexNumber: ep.index,
          ParentId: parent,
          SeriesName: series.scraped_name || series.file_name,
          RunTimeTicks: 0,
        }),
      )
    }
  } else if (parent === "lib-image" || parent === "lib-book") {
    const type: MediaType = parent === "lib-image" ? "image" : "book"
    items = (await accessItems(c.env, user, type)).map((i) => itemDto(c, i))
  }

  const page = items.slice(start, start + limit)
  return c.json({
    Items: page,
    TotalRecordCount: items.length,
    StartIndex: start,
  })
}

embyRouter.get("/Items", handleItems)
embyRouter.get("/Users/:id/Items", handleItems)

embyRouter.get("/Items/:id", async (c) => {
  const user = (c as any).get("mediaUser")
  const id = c.req.param("id")
  if (id.startsWith("sr-")) {
    const folder = unb64(id.slice(3))
    const db = await getMediaDb(c.env)
    const item = db.items.find(
      (i) =>
        i.media_type === "video" &&
        i.folder_path === folder &&
        (i.episodes || "[]") !== "[]",
    )
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) {
      return c.json({ Error: "Not Found" }, 404)
    }
    let count = 0
    try {
      count = JSON.parse(item.episodes || "[]").length
    } catch {
      count = 0
    }
    return c.json(
      itemDto(c, item, "Series", {
        Id: id,
        ChildCount: count,
        RecursiveItemCount: count,
      }),
    )
  }
  if (id.startsWith("al-")) {
    const key = unb64(id.slice(3))
    const [artist, album] = key.split("\u0000")
    const songs = (await accessItems(c.env, user, "music")).filter(
      (s) =>
        (s.album_name || "未知专辑") === album &&
        (s.album_artist || "未知艺术家") === artist,
    )
    if (songs.length === 0) return c.json({ Error: "Not Found" }, 404)
    const first = songs[0]
    return c.json(
      itemDto(c, first, "MusicAlbum", {
        Id: id,
        Name: album,
        AlbumArtist: artist,
        Artists: [artist],
        ChildCount: songs.length,
        RunTimeTicks: ticks(songs.reduce((n, s) => n + (s.duration || 0), 0)),
      }),
    )
  }
  const target = await resolveId(c, user, id)
  if (!target) return c.json({ Error: "Not Found" }, 404)
  if (target.episode) {
    return c.json(
      itemDto(c, target.item, "Episode", {
        Id: id,
        Name: target.episode.title || target.episode.file_name,
        IndexNumber: target.episode.index,
      }),
    )
  }
  return c.json(itemDto(c, target.item))
})

embyRouter.get("/Items/:id/Images/:type", async (c) => {
  const user = (c as any).get("mediaUser")
  const target = await resolveId(c, user, c.req.param("id"))
  if (!target?.item.cover) return c.body(null, 404)
  if (/^https?:\/\//.test(target.item.cover)) {
    return c.redirect(target.item.cover)
  }
  return c.redirect(await signedUrl(c, target.item.cover))
})

embyRouter.all("/Items/:id/PlaybackInfo", async (c) => {
  const user = (c as any).get("mediaUser")
  const target = await resolveId(c, user, c.req.param("id"))
  if (!target) return c.json({ Error: "Not Found" }, 404)
  const path = mediaHelpers.itemPath(target.item, target.episode?.index)
  const url = await signedUrl(c, path)
  return c.json({
    MediaSources: [
      {
        Protocol: "Http",
        Id: c.req.param("id"),
        Path: path,
        Type: "Default",
        Container: path.split(".").pop() || "mp4",
        RunTimeTicks: ticks(target.item.duration),
        SupportsDirectPlay: true,
        SupportsDirectStream: true,
        SupportsTranscoding: false,
        DirectStreamUrl: url,
        MediaStreams: [],
      },
    ],
    PlaySessionId: `worker-${Date.now()}`,
  })
})

embyRouter.post("/Items/:id/Refresh", async (c) => c.json({}))
embyRouter.post("/Sessions/Playing", async (c) => c.json({}))
embyRouter.post("/Sessions/Playing/Progress", async (c) => c.json({}))
embyRouter.post("/Sessions/Playing/Stopped", async (c) => c.json({}))
embyRouter.post("/Users/:id/FavoriteItems/:itemId", async (c) =>
  setFavorite(c, true),
)
embyRouter.delete("/Users/:id/FavoriteItems/:itemId", async (c) =>
  setFavorite(c, false),
)

embyRouter.get("/Videos/:id/stream", async (c) => stream(c))
embyRouter.get("/Audio/:id/stream", async (c) => stream(c))

async function setFavorite(c: any, favorite: boolean) {
  const user = c.get("mediaUser")
  const target = await resolveId(c, user, c.req.param("itemId"))
  if (!target) return c.json({ Error: "Not Found" }, 404)
  const db = await getMediaDb(c.env)
  const row = ensureUserData(
    db,
    user.id,
    target.item.id,
    target.episode?.index || 0,
  )
  row.is_favorite = favorite
  row.updated_at = new Date().toISOString()
  await saveMediaDb(c.env, db)
  return c.json({})
}

async function stream(c: any) {
  const user = c.get("mediaUser")
  const target = await resolveId(c, user, c.req.param("id"))
  if (!target) return c.body(null, 404)
  const path = mediaHelpers.itemPath(target.item, target.episode?.index)
  return c.redirect(await signedUrl(c, path))
}

async function resolveId(c: any, user: any, id: string) {
  const db = await getMediaDb(c.env)
  if (id.startsWith("mv-") || id.startsWith("so-")) {
    const item = findItem(db, Number(id.slice(3)))
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item)))
      return null
    return { item }
  }
  if (id.startsWith("ep-")) {
    const parts = id.split("-")
    const item = findItem(db, Number(parts[1]))
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item)))
      return null
    const eps = (() => {
      try {
        return JSON.parse(item.episodes || "[]")
      } catch {
        return []
      }
    })()
    const ep = eps.find((e: any) => Number(e.index) === Number(parts[2]))
    return ep ? { item, episode: ep } : null
  }
  if (id.startsWith("al-") || id.startsWith("ar-") || id.startsWith("sr-")) {
    return { item: null as any }
  }
  return null
}

// ==================== Subsonic ====================

export const subsonicRouter = new Hono()

const sub = (
  c: any,
  payload: any = {},
  status: "ok" | "failed" = "ok",
  error?: any,
) => {
  const body: any = {
    "subsonic-response": {
      status,
      version: "1.16.1",
      type: "OpenList",
      serverVersion: "4.2.3",
      openSubsonic: true,
      ...payload,
    },
  }
  if (error) body["subsonic-response"].error = error
  return c.json(body)
}

const subError = (c: any, code: number, message: string) =>
  sub(c, {}, "failed", { code, message })

async function subAuth(c: any) {
  const db = await getMediaDb(c.env)
  const key = c.req.query("apiKey")
  if (key) {
    const hash = await mediaHelpers.sha256Hex(key)
    const row = db.app_keys.find((k) => k.secret === hash)
    if (row) {
      const user = await userFromDb(c.env, row.user_id)
      if (user && !user.disabled) {
        row.last_used_at = new Date().toISOString()
        return user
      }
    }
    return null
  }
  const name = c.req.query("u")
  if (!name) return null
  const user = await userFromDb(c.env, undefined, name)
  if (!user || user.disabled || user.username === "guest") return null
  const salt = c.req.query("s")
  const token = c.req.query("t")
  if (salt && token) {
    for (const row of db.app_keys.filter((k) => k.user_id === user.id)) {
      if (!row.plain) continue
      const expect = md5Hex(`${row.plain}${salt}`)
      if (expect.toLowerCase() === token.toLowerCase()) {
        row.last_used_at = new Date().toISOString()
        return user
      }
    }
    return null
  }
  let pw = c.req.query("p") || ""
  if (pw.startsWith("enc:")) {
    try {
      pw = new TextDecoder().decode(
        Uint8Array.from(
          (pw.slice(4).match(/.{2}/g) || []).map((h: string) =>
            parseInt(h, 16),
          ),
        ),
      )
    } catch {
      return null
    }
  }
  if (!pw || !user.password) return null
  const hash = await twoStepHash(pw, user.salt)
  return hash === user.password ? user : null
}

subsonicRouter.use("*", async (c, next) => {
  const settings = await getSettingsMap(c.env)
  if (!mediaProtocolEnabled(settings, "media_subsonic_enabled"))
    return c.notFound()
  await next()
})

const handleSubsonic = async (c: any) => {
  const method = (c.req.param("method") || "")
    .toLowerCase()
    .replace(/\.view$/, "")
  if (method === "ping") return sub(c)
  if (method === "getlicense") return sub(c, { license: { valid: true } })
  const user = await subAuth(c)
  if (!user) return subError(c, 40, "Wrong username or password")
  const db = await getMediaDb(c.env)

  if (method === "getmusicfolders") {
    return sub(c, {
      musicFolders: { musicFolder: [{ id: 1, name: "Music" }] },
    })
  }

  if (method === "getartists") {
    const songs = await accessItems(c.env, user, "music")
    const map = new Map<string, any>()
    for (const song of songs) {
      const artist = song.album_artist || "未知艺术家"
      const entry = map.get(artist) || {
        id: `ar-${b64(artist)}`,
        name: artist,
        albumCount: 0,
        album: [],
      }
      entry.albumCount += 1
      map.set(artist, entry)
    }
    return sub(c, {
      artists: {
        ignoredArticles: "",
        index: [{ name: "#", artist: Array.from(map.values()) }],
      },
    })
  }

  if (method === "getartist") {
    const id = c.req.query("id") || ""
    const artist = unb64(id.replace(/^ar-/, ""))
    const songs = await accessItems(c.env, user, "music")
    const albums = new Map<string, any>()
    for (const song of songs) {
      if ((song.album_artist || "未知艺术家") !== artist) continue
      const album = song.album_name || "未知专辑"
      const row = albums.get(album) || {
        id: `al-${b64(`${artist}\u0000${album}`)}`,
        name: album,
        artist,
        artistId: id,
        songCount: 0,
        duration: 0,
        coverArt: `al-${b64(`${artist}\u0000${album}`)}`,
      }
      row.songCount += 1
      row.duration += song.duration || 0
      albums.set(album, row)
    }
    return sub(c, {
      artist: {
        id,
        name: artist,
        albumCount: albums.size,
        album: Array.from(albums.values()),
      },
    })
  }

  if (method === "getalbum") {
    const id = c.req.query("id") || ""
    const key = unb64(id.replace(/^al-/, ""))
    const [artist, album] = key.split("\u0000")
    const songs = (await accessItems(c.env, user, "music"))
      .filter(
        (s) =>
          (s.album_name || "未知专辑") === album &&
          (s.album_artist || "未知艺术家") === artist,
      )
      .sort((a, b) => a.track_number - b.track_number)
    return sub(c, {
      album: {
        id,
        name: album,
        artist,
        artistId: `ar-${b64(artist)}`,
        songCount: songs.length,
        duration: songs.reduce((n, s) => n + (s.duration || 0), 0),
        song: songs.map((s, idx) => songDto(s, idx + 1)),
      },
    })
  }

  if (method === "getalbumlist2" || method === "getalbumlist") {
    const songs = await accessItems(c.env, user, "music")
    const map = new Map<string, any>()
    for (const song of songs) {
      const artist = song.album_artist || "未知艺术家"
      const album = song.album_name || "未知专辑"
      const key = `${artist}\u0000${album}`
      const row = map.get(key) || {
        id: `al-${b64(key)}`,
        name: album,
        artist,
        artistId: `ar-${b64(artist)}`,
        songCount: 0,
        duration: 0,
        created: song.created_at,
      }
      row.songCount += 1
      row.duration += song.duration || 0
      map.set(key, row)
    }
    return sub(c, { albumList2: { album: Array.from(map.values()) } })
  }

  if (method === "getsong") {
    const id = c.req.query("id") || ""
    const item = findItem(db, Number(id.replace(/^so-/, "")))
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) {
      return subError(c, 70, "Song not found")
    }
    return sub(c, { song: songDto(item, 1) })
  }

  if (method === "search3") {
    const q = (c.req.query("query") || "").toLowerCase()
    const songs = (await accessItems(c.env, user, "music")).filter(
      (s) =>
        !q ||
        s.file_name.toLowerCase().includes(q) ||
        (s.album_name || "").toLowerCase().includes(q),
    )
    return sub(c, {
      searchResult3: {
        song: songs.slice(0, 100).map((s, idx) => songDto(s, idx + 1)),
      },
    })
  }

  if (method === "getstarred2") {
    const fav = db.user_data.filter(
      (d) => d.user_id === user.id && d.is_favorite,
    )
    const songs = fav
      .map((d) => findItem(db, d.item_id))
      .filter((i) => i?.media_type === "music")
      .map((s, idx) => songDto(s!, idx + 1))
    return sub(c, { starred2: { song: songs } })
  }

  if (method === "star" || method === "unstar") {
    const id = c.req.query("id") || ""
    const item = findItem(db, Number(id.replace(/^so-/, "")))
    if (item) {
      const row = ensureUserData(db, user.id, item.id)
      row.is_favorite = method === "star"
      row.updated_at = new Date().toISOString()
      await saveMediaDb(c.env, db)
    }
    return sub(c)
  }

  if (method === "scrobble") return sub(c)
  if (method === "getplaylists") return sub(c, { playlists: { playlist: [] } })
  if (method === "getscanstatus")
    return sub(c, { scanStatus: { scanning: false, count: db.items.length } })

  if (method === "stream" || method === "download") {
    const id = c.req.query("id") || ""
    if (id.startsWith("al-")) {
      const key = unb64(id.replace(/^al-/, ""))
      const [artist, album] = key.split("\u0000")
      const song = (await accessItems(c.env, user, "music")).find(
        (s) =>
          (s.album_name || "未知专辑") === album &&
          (s.album_artist || "未知艺术家") === artist,
      )
      if (!song) return c.body(null, 404)
      return c.redirect(await signedUrl(c, mediaHelpers.itemPath(song)))
    }
    const item = findItem(db, Number(id.replace(/^so-/, "")))
    if (!item || !(await mediaHelpers.canAccessItem(c.env, user, item))) {
      return c.body(null, 404)
    }
    return c.redirect(await signedUrl(c, mediaHelpers.itemPath(item)))
  }

  if (method === "getcoverart") {
    const id = c.req.query("id") || ""
    let item: MediaItem | undefined
    if (id.startsWith("so-")) item = findItem(db, Number(id.slice(3)))
    if (id.startsWith("al-")) {
      const key = unb64(id.slice(3))
      const [artist, album] = key.split("\u0000")
      item = (await accessItems(c.env, user, "music")).find(
        (s) =>
          (s.album_name || "未知专辑") === album &&
          (s.album_artist || "未知艺术家") === artist,
      )
    }
    if (!item?.cover) return c.body(null, 404)
    if (/^https?:\/\//.test(item.cover)) return c.redirect(item.cover)
    return c.redirect(await signedUrl(c, item.cover))
  }

  return subError(c, 0, "Unsupported method")
}

// 兼容两类客户端：base 填 /@rest 时请求 /@rest/ping，填站点根时请求 /rest/ping
subsonicRouter.all("/:method", handleSubsonic)
subsonicRouter.all("/rest/:method", handleSubsonic)

function songDto(item: MediaItem, index: number) {
  return {
    id: `so-${item.id}`,
    parent: `al-${b64(`${item.album_artist || "未知艺术家"}\u0000${item.album_name || "未知专辑"}`)}`,
    isDir: false,
    title: item.scraped_name || item.file_name,
    album: item.album_name || "未知专辑",
    artist: item.album_artist || "未知艺术家",
    track: item.track_number || index,
    year: year(item.release_date),
    genre: item.genre || "",
    coverArt: `so-${item.id}`,
    size: item.file_size,
    contentType: `audio/${item.file_name.split(".").pop() || "mpeg"}`,
    suffix: item.file_name.split(".").pop() || "mp3",
    duration: item.duration || 0,
    created: item.created_at,
    type: "music",
  }
}
