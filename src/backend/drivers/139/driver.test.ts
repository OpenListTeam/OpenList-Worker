import test from "node:test"
import assert from "node:assert/strict"
import { Yun139Driver } from "./driver"
import { Yun139Addition } from "./types"
import { calSign, Yun139ApiClient } from "./util"

test("Yun139 calculation and signing", () => {
  const sign = calSign("{}", "2026-08-24 16:00:00", "1234567890abcdef")
  assert.ok(sign)
  assert.equal(typeof sign, "string")
  assert.equal(sign.length, 32)
})

test("Yun139Driver instantiation and methods", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|1780000000000",
    ).toString("base64"),
    type: "personal_new",
  }

  const driver = new Yun139Driver(addition)
  assert.ok(driver)

  // Mock listFiles
  ;(driver as any).client.listFiles = async (catalogId: string) => {
    return {
      folders: [
        {
          catalogID: "cat_101",
          catalogName: "photos",
          updateTime: "2026-08-24T12:00:00Z",
        },
      ],
      files: [
        {
          contentID: "cnt_201",
          contentName: "photo.jpg",
          contentSize: 500000,
          updateTime: "2026-08-24T12:00:00Z",
        },
      ],
    }
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "photos")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "photo.jpg")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 500000)

  // Mock getDownloadUrl
  ;(driver as any).client.getDownloadUrl = async (contentId: string) =>
    "https://download.yun.139.com/photo.jpg"

  const link = await driver.link("/photo.jpg", "/photo.jpg")
  assert.equal(link.url, "https://download.yun.139.com/photo.jpg")
})


test("Yun139 refreshes a near-expiry token with no Cookie header", async () => {
  const expiresAt = Date.now() + 5 * 24 * 60 * 60 * 1000
  const oldToken = `old-token|1|RCS|${expiresAt}|opaque`
  const newToken = `new-token|1|RCS|${Date.now() + 30 * 24 * 60 * 60 * 1000}|opaque`
  const account = "13800138000"
  const addition: Yun139Addition = {
    authorization: Buffer.from(`pc:${account}:${oldToken}`).toString("base64"),
    user_domain_id: "test-user-domain",
    type: "personal_new",
  }
  // Simulate a legacy config containing PC cookies; the refresh request must ignore them.
  ;(addition as any).pc_cloud_cookies = "mc_at=must-not-send; mc_bt=must-not-send"

  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; init?: RequestInit }> = []
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })

    if (url === "https://user-njs.yun.139.com/user/auth/refreshToken") {
      return new Response(
        JSON.stringify({
          success: true,
          code: "0000",
          message: "请求成功",
          data: { token: newToken, expireTime: 2592000 },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      )
    }

    if (url === "https://user-njs.yun.139.com/user/route/qryRoutePolicy") {
      return new Response(
        JSON.stringify({
          success: true,
          code: "0000",
          data: { routePolicyList: [] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const refreshedAuthorizations: string[] = []
    const client = new Yun139ApiClient(addition, async (authorization) => {
      refreshedAuthorizations.push(authorization)
    })
    await client.init()

    assert.equal(calls[0]?.url, "https://user-njs.yun.139.com/user/auth/refreshToken")
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      userDomainId: "test-user-domain",
    })

    const sentHeaders = calls[0]?.init?.headers as Record<string, string>
    assert.equal(sentHeaders.authorization, `Basic ${Buffer.from(`pc:${account}:${oldToken}`).toString("base64")}`)
    assert.equal(Object.keys(sentHeaders).some((key) => key.toLowerCase() === "cookie"), false)
    assert.equal(calls[0]?.init?.credentials, "omit")
    assert.equal(sentHeaders.app_cp, "1")
    assert.equal(sentHeaders["x-yun-api-version"], "v1")
    assert.equal(sentHeaders["x-yun-app-channel"], "10200153")
    assert.equal(sentHeaders["x-yun-market-source"], "1")
    assert.equal(sentHeaders["x-yun-module-type"], "1")
    assert.equal(sentHeaders["x-yun-client-info"], "PC")
    assert.equal(Object.keys(sentHeaders).some((key) => key.toLowerCase() === "x-yun-uni"), false)
    assert.equal(Object.keys(sentHeaders).some((key) => key.toLowerCase() === "x-deviceinfo"), false)

    assert.equal(
      Buffer.from(addition.authorization, "base64").toString("utf8"),
      `pc:${account}:${newToken}`,
    )
    assert.deepEqual(refreshedAuthorizations, [addition.authorization])
  } finally {
    globalThis.fetch = originalFetch
  }
})
