import assert from "node:assert/strict"
import test, { after, before } from "node:test"

import { Hono } from "hono"

import { getDb, saveDb } from "../internal/model/db"
import { DEFAULT_CONFIG, MEDIA_TYPES, emptyMediaDb, type MediaItem } from "../internal/media/model"
import { invalidateMediaCache, saveMediaDb } from "../internal/media/store"
import { memoryDriver } from "../internal/model/store/driver/memory"
import { __embyTest, embyRouter, subsonicRouter } from "./emby"

function buildApp() {
  const app = new Hono()
  app.route("/@emby", embyRouter)
  app.route("/@rest", subsonicRouter)
  return app
}

const original = new Map<string, string>()
let originalGuestBasePath: string | null = null
let originalMetas: any[] | null = null

async function setSetting(key: string, value: string) {
  const db = await getDb()
  const row = (db.settings || []).find((s: any) => s.key === key)
  if (!row) return
  if (!original.has(key)) original.set(key, String(row.value ?? ""))
  row.value = value
  await saveDb(db, undefined, { force: true } as any)
}

before(async () => {
  await setSetting("media_enabled", "true")
  await setSetting("media_emby_enabled", "true")
  await setSetting("media_subsonic_enabled", "true")
})

after(async () => {
  const db = await getDb()
  for (const [key, value] of original) {
    const row = (db.settings || []).find((s: any) => s.key === key)
    if (row) row.value = value
  }
  const guest = (db.users || []).find((u: any) => u.username === "guest")
  if (guest && originalGuestBasePath !== null) guest.base_path = originalGuestBasePath
  if (originalMetas !== null) db.metas = originalMetas
  await saveDb(db, undefined, { force: true } as any)
})

/** 媒体库条目（补齐测试用默认值） */
function mediaItem(
  over: Partial<MediaItem> &
    Pick<MediaItem, "id" | "media_type" | "folder_path" | "file_name">,
): MediaItem {
  return {
    scan_path_id: 1,
    scraped_name: "",
    cover: "",
    authors: "",
    plot: "",
    description: "",
    genre: "",
    release_date: "",
    rating: 0,
    file_size: 0,
    duration: 0,
    season: 0,
    episode: 0,
    episodes: "",
    album_name: "",
    album_artist: "",
    track_number: 0,
    publisher: "",
    isbn: "",
    external_id: "",
    hidden: false,
    scraper_source: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

/** 重置内存持久层的媒体分片，保证每个用例互不影响 */
async function resetMediaStore() {
  for (const key of await memoryDriver.list("openlist_media_")) {
    await memoryDriver.delete(key)
  }
  invalidateMediaCache()
}

/**
 * 造一个「访客根目录为 /public」的环境：条目在 /private 下或 hidden 时
 * 任何入口都不应再返回封面。
 */
async function seedMediaEnv(items: MediaItem[], metas: any[] = [], enabled = true) {
  const userDb = await getDb()
  const guest = (userDb.users || []).find((u: any) => u.username === "guest")
  if (guest) {
    if (originalGuestBasePath === null) {
      originalGuestBasePath = String(guest.base_path || "/")
    }
    guest.base_path = "/public"
  }
  if (originalMetas === null) originalMetas = JSON.parse(JSON.stringify(userDb.metas || []))
  userDb.metas = metas
  await saveDb(userDb, undefined, { force: true } as any)

  await resetMediaStore()
  const media = emptyMediaDb()
  media.configs = MEDIA_TYPES.map((t) => ({
    ...DEFAULT_CONFIG(t),
    enabled,
  }))
  media.items = items
  media.next_id = 1000
  await saveMediaDb({}, media)
  invalidateMediaCache()
}


test("Emby public system info is reachable without token", async () => {
  const res = await buildApp().request("/@emby/System/Info/Public", {}, {})
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.ok(body.Version)
  assert.ok(body.Id)
  assert.equal(body.StartupWizardCompleted, true)
})

test("Emby ping", async () => {
  const res = await buildApp().request("/@emby/System/Ping", {}, {})
  assert.equal(res.status, 200)
  assert.equal(await res.text(), "Emby Server")
})

test("Emby web notice is not blocked by auth", async () => {
  const res = await buildApp().request("/@emby/web/index.html", {}, {})
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /Emby/)
})

test("Emby protected endpoint requires token", async () => {
  const res = await buildApp().request("/@emby/Users/Me", {}, {})
  assert.equal(res.status, 401)
})

test("Subsonic extensions are reachable without auth", async () => {
  const res = await buildApp().request(
    "/@rest/getOpenSubsonicExtensions?f=json",
    {},
    {},
  )
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.equal(body["subsonic-response"].status, "ok")
  assert.ok(Array.isArray(body["subsonic-response"].openSubsonicExtensions))
})

test("Subsonic ping returns XML by default", async () => {
  const res = await buildApp().request("/@rest/ping", {}, {})
  assert.equal(res.status, 200)
  const xml = await res.text()
  assert.match(xml, /<subsonic-response/)
  assert.match(xml, /status="ok"/)
})

test("Subsonic ping supports json format", async () => {
  const res = await buildApp().request("/@rest/ping?f=json", {}, {})
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.equal(body["subsonic-response"].status, "ok")
  assert.equal(body["subsonic-response"].openSubsonic, true)
})

test("Subsonic rejects anonymous credential requests", async () => {
  const res = await buildApp().request(
    "/@rest/getArtists?u=nobody&p=wrong&f=json",
    {},
    {},
  )
  const body: any = await res.json()
  assert.equal(body["subsonic-response"].status, "failed")
  assert.equal(body["subsonic-response"].error.code, 40)
})

test("Subsonic XML serializer emits attributes and nested arrays", () => {
  const xml = __embyTest.toXmlNode("subsonic-response", {
    status: "ok",
    version: "1.16.1",
    album: [
      {
        id: "al-1",
        name: "Album",
        song: [{ id: "so-1", title: "Song" }],
      },
    ],
  })
  assert.match(xml, /status="ok"/)
  assert.match(xml, /version="1.16.1"/)
  assert.match(
    xml,
    /<album id="al-1" name="Album"><song id="so-1" title="Song"\/><\/album>/,
  )
})

test("Subsonic XML serializer escapes dangerous characters", () => {
  const xml = __embyTest.toXmlNode("subsonic-response", {
    name: `a<b&c"d`,
  })
  assert.match(xml, /a&lt;b&amp;c&quot;d/)
})

test("Emby numeric ids are stable and reversible", () => {
  const a = __embyTest.numericId("mv-12")
  const b = __embyTest.numericId("mv-12")
  assert.equal(a, b)
  assert.equal(a, "12")
  assert.notEqual(
    __embyTest.numericId("sr-abc"),
    __embyTest.numericId("sr-abd"),
  )
})

// ---- 封面权限：origId 对未映射 ID 原样返回，不能借此读全库 ----

test("Emby 封面：访客根目录之外 / hidden 的条目一律 404", async () => {
  await seedMediaEnv([
    mediaItem({
      id: 1,
      media_type: "video",
      folder_path: "/public",
      file_name: "ok.mkv",
      cover: "https://example.com/ok.jpg",
    }),
    mediaItem({
      id: 42,
      media_type: "video",
      folder_path: "/private",
      file_name: "secret.mkv",
      cover: "https://example.com/secret.jpg",
    }),
    mediaItem({
      id: 43,
      media_type: "video",
      folder_path: "/public",
      file_name: "hidden.mkv",
      cover: "https://example.com/hidden.jpg",
      hidden: true,
    }),
  ])

  const app = buildApp()
  const ok = await app.request("/@emby/Items/mv-1/Images/Primary", {}, {})
  assert.equal(ok.status, 302)
  assert.equal(ok.headers.get("location"), "https://example.com/ok.jpg")

  // 未映射的 mv-42 / 纯数字 42 都不能命中 /private 下的条目
  for (const id of ["mv-42", "42"]) {
    const res = await app.request(`/@emby/Items/${id}/Images/Primary`, {}, {})
    assert.equal(res.status, 404, `${id} 不应返回访客根目录外的封面`)
  }

  const hidden = await app.request("/@emby/Items/mv-43/Images/Primary", {}, {})
  assert.equal(hidden.status, 404)
})

test("Emby 封面：媒体类型关闭后不再返回封面", async () => {
  await seedMediaEnv(
    [
      mediaItem({
        id: 1,
        media_type: "video",
        folder_path: "/public",
        file_name: "ok.mkv",
        cover: "https://example.com/ok.jpg",
      }),
    ],
    [],
    false,
  )

  const res = await buildApp().request(
    "/@emby/Items/mv-1/Images/Primary",
    {},
    {},
  )
  assert.equal(res.status, 404)
})

test("Emby 封面：剧集封面同样经过 meta 校验", async () => {
  const show = mediaItem({
    id: 10,
    media_type: "video",
    folder_path: "/public/Show",
    file_name: "Show",
    scraped_name: "Show",
    video_type: "tv",
    is_folder: true,
    cover: "https://example.com/show.jpg",
  })
  const key = __embyTest.seriesKeyOf(show)
  const path = `/@emby/Items/sr-${key}/Images/Primary`
  const app = buildApp()

  // 无 meta 限制时可访问（正例，确保下面的 404 不是路径/ID 写错造成）
  await seedMediaEnv([show])
  const allowed = await app.request(path, {}, {})
  assert.equal(allowed.status, 302)

  // /public/Show 仅对用户 9999 开放：聚合出来的 series.cover 不能再直接返回
  await seedMediaEnv([show], [
    {
      id: 1,
      path: "/public/Show",
      password: "",
      p_sub: false,
      read_users: [9999],
      read_users_sub: true,
      write_users: [],
      write_users_sub: false,
      write: false,
      w_sub: false,
      hide: "",
      h_sub: false,
      readme: "",
      r_sub: false,
      header: "",
      header_sub: false,
    },
  ])
  const denied = await app.request(path, {}, {})
  assert.equal(denied.status, 404)
})
