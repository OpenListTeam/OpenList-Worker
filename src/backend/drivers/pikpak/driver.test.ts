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

function createDriverWithRequests(responses: unknown[]) {
  const driver = new PikPakDriver({
    username: "user@example.com",
    password: "password123",
    platform: "web",
  })
  const calls: { url: string; params?: Record<string, string> }[] = []
  ;(driver as any).resolveParentId = async () => "file-id-1"
  ;(driver as any).client = {
    request: async (url: string, options: any) => {
      calls.push({ url, params: options?.params })
      return responses[calls.length - 1]
    },
  }
  return { driver, calls }
}

test("PikPak get falls back to usage=FETCH when CACHE returns no link", async () => {
  const { driver, calls } = createDriverWithRequests([
    { id: "file-id-1", kind: "drive#file", name: "readme.txt", size: "12" },
    {
      id: "file-id-1",
      kind: "drive#file",
      name: "readme.txt",
      size: "12",
      web_content_link: "https://dl.example.com/readme.txt",
    },
  ])

  const item = await driver.get("/readme.txt", "/readme.txt")
  assert.equal(item.raw_url, "https://dl.example.com/readme.txt")
  assert.equal(calls.length, 2)
  assert.equal(calls[0].params?.usage, "CACHE")
  assert.equal(calls[1].params?.usage, "FETCH")
})

test("PikPak get keeps a single CACHE request when medias is present", async () => {
  const { driver, calls } = createDriverWithRequests([
    {
      id: "file-id-1",
      kind: "drive#file",
      name: "movie.mp4",
      size: "1024",
      medias: [{ link: { url: "https://media.example.com/movie.mp4" } }],
    },
  ])

  const item = await driver.get("/movie.mp4", "/movie.mp4")
  assert.equal(item.raw_url, "https://media.example.com/movie.mp4")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].params?.usage, "CACHE")
})
