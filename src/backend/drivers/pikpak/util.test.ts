import test from "node:test"
import assert from "node:assert/strict"
import {
  ANDROID_CLIENT_ID,
  ANDROID_CLIENT_SECRET,
  PC_CLIENT_ID,
  PC_CLIENT_SECRET,
  PikPakApiClient,
  WEB_CLIENT_ID,
  WEB_CLIENT_SECRET,
} from "./util"

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

test("PikPak uses built-in official client credentials when addition omits them", () => {
  const web = new PikPakApiClient({
    username: "user@example.com",
    password: "password123",
  }) as any
  assert.equal(web.clientId, WEB_CLIENT_ID)
  assert.equal(web.clientSecret, WEB_CLIENT_SECRET)

  const android = new PikPakApiClient({
    username: "user@example.com",
    password: "password123",
    platform: "android",
  }) as any
  assert.equal(android.clientId, ANDROID_CLIENT_ID)
  assert.equal(android.clientSecret, ANDROID_CLIENT_SECRET)

  const pc = new PikPakApiClient({
    username: "user@example.com",
    password: "password123",
    platform: "pc",
  }) as any
  assert.equal(pc.clientId, PC_CLIENT_ID)
  assert.equal(pc.clientSecret, PC_CLIENT_SECRET)
})

test("PikPak treats blank overrides as absent and honors explicit ones", () => {
  const blank = new PikPakApiClient({
    username: "user@example.com",
    password: "password123",
    client_id: "   ",
    client_secret: "",
  }) as any
  assert.equal(blank.clientId, WEB_CLIENT_ID)
  assert.equal(blank.clientSecret, WEB_CLIENT_SECRET)

  const custom = new PikPakApiClient({
    username: "user@example.com",
    password: "password123",
    client_id: "custom-client",
    client_secret: "custom-secret",
  }) as any
  assert.equal(custom.clientId, "custom-client")
  assert.equal(custom.clientSecret, "custom-secret")
})

test("PikPak login succeeds without user-provided client_id (issue #179)", async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; body: any }> = []

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input)
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body })

    if (url.includes("/v1/shield/captcha/init")) {
      return jsonResponse({ captcha_token: "captcha-token", expires_in: 300 })
    }
    if (url.includes("/v1/auth/signin")) {
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        sub: "user-id",
      })
    }
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const persisted: Array<{ accessToken: string; refreshToken: string }> = []
    const client = new PikPakApiClient(
      { username: "user@example.com", password: "password123" },
      async (tokens) => {
        persisted.push(tokens)
      },
    )

    await client.init()
    assert.equal((client as any).accessToken, "access-token")
    assert.equal((client as any).refreshTokenVal, "refresh-token")
    assert.equal(persisted.length, 1)
    assert.equal(persisted[0].accessToken, "access-token")
    assert.equal(persisted[0].refreshToken, "refresh-token")

    const captcha = calls.find((c) => c.url.includes("/v1/shield/captcha/init"))
    const signin = calls.find((c) => c.url.includes("/v1/auth/signin"))
    assert.ok(captcha, "captcha init must be requested before signin")
    assert.ok(signin, "signin must be requested")

    // 空 client_id 正是 issue #179 的失败根因：请求必须带上内置标识
    const signinUrl = new URL(signin!.url)
    assert.equal(signinUrl.searchParams.get("client_id"), WEB_CLIENT_ID)
    const captchaUrl = new URL(captcha!.url)
    assert.equal(captchaUrl.searchParams.get("client_id"), WEB_CLIENT_ID)
    assert.equal(signin!.body.client_id, WEB_CLIENT_ID)
    assert.equal(signin!.body.client_secret, WEB_CLIENT_SECRET)
    assert.equal(signin!.body.username, "user@example.com")
    assert.equal(signin!.body.password, "password123")
  } finally {
    globalThis.fetch = originalFetch
  }
})
