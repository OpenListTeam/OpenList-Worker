import assert from "node:assert/strict"
import test, { after, before } from "node:test"

import { Hono } from "hono"

import { getDb, saveDb } from "../internal/model/db"
import { __embyTest, embyRouter, subsonicRouter } from "./emby"

function buildApp() {
  const app = new Hono()
  app.route("/@emby", embyRouter)
  app.route("/@rest", subsonicRouter)
  return app
}

const original = new Map<string, string>()

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
  await saveDb(db, undefined, { force: true } as any)
})

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
