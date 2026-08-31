import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { saveDb } from "../internal/model/db"
import { publicRouter } from "./public"

const env: any = {}

const seed = (settings: any[]) =>
  saveDb({ settings, users: [], storages: [], shares: [] }, env)

const fetchSettings = async () => {
  const app = new Hono()
  app.route("/api/public", publicRouter)
  const res = await app.request("/api/public/settings")
  assert.equal(res.status, 200)
  return (await res.json()) as any
}

test("Security(C-1): /api/public/settings must never echo credential-shaped keys", async () => {
  await seed([
    { key: "token", value: "SUPER_SECRET_ADMIN_TOKEN" },
    { key: "jwt_secret", value: "SECRET" },
    { key: "s3_secret_key", value: "SECRET" },
    { key: "refresh_token", value: "SECRET" },
    { key: "api_key", value: "SECRET" },
  ])
  const json = await fetchSettings()
  for (const key of [
    "token",
    "jwt_secret",
    "s3_secret_key",
    "refresh_token",
    "api_key",
  ]) {
    assert.equal(
      key in json.data,
      false,
      `"${key}" must never be echoed to anonymous callers`,
    )
  }
})

test("Security(C-1): public settings still returns display options (no regression)", async () => {
  await seed([
    { key: "customize_body", value: "<p>custom</p>" },
    { key: "customize_head", value: "<meta name='x'>" },
    { key: "sso_login_enabled", value: "false" },
    { key: "ldap_login_enabled", value: "false" },
    { key: "webauthn_login_enabled", value: "false" },
    { key: "sign_all", value: "true" },
    { key: "site_title", value: "My Site" },
  ])
  const json = await fetchSettings()
  assert.equal(json.data.customize_body, "<p>custom</p>")
  assert.equal(json.data.customize_head, "<meta name='x'>")
  assert.equal(json.data.sso_login_enabled, "false")
  assert.equal(json.data.ldap_login_enabled, "false")
  assert.equal(json.data.webauthn_login_enabled, "false")
  assert.equal(json.data.sign_all, "true")
  assert.equal(json.data.site_title, "My Site")
  // NOTE: allow_guest is deliberately not asserted here — it is derived from
  // whether a guest account exists (see guest_auth.test.ts), not a plain echo.
})

test("Security(F-14): unknown keys fail closed — they are not echoed", async () => {
  // The allowlist is the boundary now: a key that is not explicitly listed
  // must never reach an anonymous caller, no matter how harmless it looks.
  await seed([
    { key: "some_future_setting", value: "value" },
    { key: "driver_callback_url", value: "https://evil.example" },
    { key: "new_storage_token_cache", value: "SECRET" },
  ])
  const json = await fetchSettings()
  for (const key of [
    "some_future_setting",
    "driver_callback_url",
    "new_storage_token_cache",
  ]) {
    assert.equal(
      key in json.data,
      false,
      `"${key}" is not in the public allowlist and must not be echoed`,
    )
  }
})

test("Security(F-14): keys the frontend actually reads are still echoed", async () => {
  // These 8 keys are read by the frontend but absent from the display
  // defaults; the allowlist must carry them explicitly or those pages break.
  await seed([
    { key: "audio_cover", value: "cover.jpg" },
    { key: "share_icon", value: "/icon.png" },
    { key: "ldap_login_tips", value: "use your corp account" },
    { key: "sso_login_platform", value: "github" },
  ])
  const json = await fetchSettings()
  assert.equal(json.data.audio_cover, "cover.jpg")
  assert.equal(json.data.share_icon, "/icon.png")
  assert.equal(json.data.ldap_login_tips, "use your corp account")
  assert.equal(json.data.sso_login_platform, "github")
})
