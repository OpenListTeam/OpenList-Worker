import test from "node:test"
import assert from "node:assert/strict"
import {
  cdnURL,
  cleanObjectPath,
  normalizeBaseURL,
  signCDNURL,
  storageURL,
} from "./util"
import { BunnyStorageDriver, normalizeBunnyAddition } from "./driver"

test("normalizeBaseURL adds scheme and strips trailing slash", () => {
  // 根路径 URL 会被 URL 标准规范化为带尾斜杠 "/"
  assert.equal(
    normalizeBaseURL("storage.bunnycdn.com/", "storage.bunnycdn.com"),
    "https://storage.bunnycdn.com/",
  )
  assert.equal(
    normalizeBaseURL("https://a.example.com/x/", ""),
    "https://a.example.com/x",
  )
})

test("cleanObjectPath normalizes leading slashes", () => {
  assert.equal(cleanObjectPath("/a//b/"), "/a/b")
  assert.equal(cleanObjectPath(""), "/")
})

test("storageURL builds zone-prefixed URL", () => {
  const add = normalizeBunnyAddition({
    storage_zone_name: "zone1",
    endpoint: "storage.bunnycdn.com",
  })
  assert.equal(
    storageURL(add, "/", true),
    "https://storage.bunnycdn.com/zone1/",
  )
  assert.equal(
    storageURL(add, "/a/b.txt", false),
    "https://storage.bunnycdn.com/zone1/a/b.txt",
  )
})

test("cdnURL joins base url and path", () => {
  const add = normalizeBunnyAddition({
    cdn_base_url: "https://cdn.example.com/base/",
  })
  assert.equal(cdnURL(add, "/a/b.txt"), "https://cdn.example.com/base/a/b.txt")
})

test("signCDNURL adds token and expires", async () => {
  const add = normalizeBunnyAddition({
    cdn_base_url: "https://cdn.example.com",
    cdn_token_key: "secret",
    cdn_token_method: "sha256",
    sign_url_expire: 4,
  })
  const signed = await signCDNURL(add, "https://cdn.example.com/a/b.txt")
  const u = new URL(signed)
  assert.ok(u.searchParams.get("token"))
  assert.ok(u.searchParams.get("expires"))
  assert.equal(
    u.pathname,
    "/a/b.txt",
  )
})

test("BunnyStorageDriver instantiation", () => {
  const driver = new BunnyStorageDriver({
    storage_zone_name: "zone1",
    access_key: "ak",
  })
  assert.ok(driver)
})
