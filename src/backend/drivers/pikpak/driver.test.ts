import test from "node:test"
import assert from "node:assert/strict"
import { generateDeviceSign, getAction, buildCustomUserAgent } from "./util"
import { PikPakDriver } from "./driver"

test("PikPak signature and user agent generation", async () => {
  const deviceId = "testdevice1234567890123456789012"
  const sign = await generateDeviceSign(deviceId, "mypikpak.com")
  assert.ok(sign.startsWith("div101.testdevice1234567890123456789012"))

  const ua = await buildCustomUserAgent(
    deviceId,
    "YNxT9w7GMdWvEOKa",
    "com.pikcloud.pikpak",
    "2.0.6",
    "1.53.2",
    "com.pikcloud.pikpak",
    "user123",
  )
  assert.ok(ua.includes("ANDROID-com.pikcloud.pikpak/1.53.2"))
  assert.ok(ua.includes("clientid/YNxT9w7GMdWvEOKa"))
})

test("PikPak getAction utility", () => {
  const action = getAction(
    "GET",
    "https://api-drive.mypikpak.net/drive/v1/files",
  )
  assert.equal(action, "GET:/drive/v1/files")

  const actionPost = getAction(
    "POST",
    "https://user.mypikpak.net/v1/auth/signin",
  )
  assert.equal(actionPost, "POST:/v1/auth/signin")
})

test("PikPak driver instantiation", () => {
  const driver = new PikPakDriver({
    username: "user@example.com",
    password: "password123",
    platform: "web",
  })
  assert.ok(driver)
})
