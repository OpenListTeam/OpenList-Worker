import test from "node:test"
import assert from "node:assert/strict"
import {
  normalizeDeviceID,
  normalizePhoneE164,
  unixOrNow,
  GuangYaPanClient,
} from "./util"
import { GuangYaPanDriver, normalizeGuangYaPanAddition } from "./driver"

test("normalizePhoneE164 formats CN mobile numbers", () => {
  assert.equal(normalizePhoneE164("13800138000"), "+86 13800138000")
  assert.equal(normalizePhoneE164("+86 13800138000"), "+86 13800138000")
  assert.equal(normalizePhoneE164(""), "")
})

test("normalizeDeviceID validates 32-hex", () => {
  const hex = "0123456789abcdef0123456789abcdef"
  assert.equal(normalizeDeviceID(hex.toUpperCase()), hex)
  assert.equal(normalizeDeviceID("bad"), "")
  assert.equal(normalizeDeviceID(""), "")
})

test("unixOrNow converts epoch seconds", () => {
  const iso = unixOrNow(1700000000)
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T/)
})

test("GuangYaPanClient.md5 matches RFC 1321 vector", () => {
  const digest = GuangYaPanClient.md5(new TextEncoder().encode("abc"))
  assert.equal(digest, "900150983cd24fb0d6963f7d28e17f72")
})

test("normalizeGuangYaPanAddition generates device_id fallback", () => {
  const a = normalizeGuangYaPanAddition({ client_id: "cid" })
  assert.equal(a.client_id, "cid")
  assert.match(a.device_id, /^[0-9a-f]{32}$/)
  assert.ok(a.device_sign.startsWith("wdi10."))
})

test("GuangYaPanDriver instantiation", () => {
  const driver = new GuangYaPanDriver({
    client_id: "cid",
    access_token: "at",
  })
  assert.ok(driver)
})
