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

interface RecordedCall {
  url: string
  body: any
  headers: Record<string, string>
}

function installFetchMock(
  handler: (url: string, call: RecordedCall, index: number) => Response | undefined,
): { calls: RecordedCall[]; restore: () => void } {
  const originalFetch = globalThis.fetch
  const calls: RecordedCall[] = []
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input)
    const headers: Record<string, string> = {}
    new Headers(init?.headers || {}).forEach((v, k) => {
      headers[k.toLowerCase()] = v
    })
    const call: RecordedCall = {
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers,
    }
    const index = calls.push(call) - 1
    return (
      handler(url, call, index) ||
      new Response("unexpected URL", { status: 404 })
    )
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = originalFetch) }
}

test("PikPak login refreshes captcha token instead of reusing the persisted one (4126)", async () => {
  let captchaCount = 0
  const mock = installFetchMock((url) => {
    if (url.includes("/v1/shield/captcha/init")) {
      captchaCount++
      return jsonResponse({
        captcha_token: `fresh-captcha-${captchaCount}`,
        expires_in: 300,
      })
    }
    if (url.includes("/v1/auth/signin")) {
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        sub: "user-id",
      })
    }
    return undefined
  })

  try {
    const client = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
      // 上次登录后持久化的旧验证码 token，此时已经过期
      captcha_token: "stale-captcha",
    }) as any

    await client.login()

    const signin = mock.calls.find((c) => c.url.includes("/v1/auth/signin"))!
    const captcha = mock.calls.find((c) =>
      c.url.includes("/v1/shield/captcha/init"),
    )!
    assert.ok(captcha, "captcha init must run even when captcha_token exists")
    assert.equal(signin.body.captcha_token, "fresh-captcha-1")
    assert.notEqual(signin.body.captcha_token, "stale-captcha")
  } finally {
    mock.restore()
  }
})

test("PikPak login captcha init carries client metadata and captcha_sign", async () => {
  const mock = installFetchMock((url) => {
    if (url.includes("/v1/shield/captcha/init")) {
      return jsonResponse({ captcha_token: "ct", expires_in: 300 })
    }
    if (url.includes("/v1/auth/signin")) {
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        sub: "user-id",
      })
    }
    return undefined
  })

  try {
    const client = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
    }) as any
    await client.login()

    const captcha = mock.calls.find((c) =>
      c.url.includes("/v1/shield/captcha/init"),
    )!
    assert.equal(captcha.body.action, "POST:/v1/auth/signin")
    assert.equal(captcha.body.meta.email, "user@example.com")
    assert.equal(captcha.body.meta.client_version, client.clientVersion)
    assert.equal(captcha.body.meta.package_name, client.packageName)
    assert.ok(/^\d+$/.test(captcha.body.meta.timestamp))
    assert.ok(captcha.body.meta.captcha_sign.startsWith("1."))
  } finally {
    mock.restore()
  }
})

test("PikPak signin only sends web headers, not native SDK headers", async () => {
  const mock = installFetchMock((url) => {
    if (url.includes("/v1/shield/captcha/init")) {
      return jsonResponse({ captcha_token: "ct", expires_in: 300 })
    }
    if (url.includes("/v1/auth/signin")) {
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        sub: "user-id",
      })
    }
    return undefined
  })

  try {
    const client = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
    }) as any
    await client.login()

    const signin = mock.calls.find((c) => c.url.includes("/v1/auth/signin"))!
    // 原生 SDK 才带这两个头，web 凭据下带上会被判为 AccessProhibited
    assert.equal(signin.headers["x-device-id"], undefined)
    assert.equal(signin.headers["x-captcha-token"], undefined)
    assert.equal(signin.headers["content-type"], "application/json")
    assert.ok(signin.headers["user-agent"])
  } finally {
    mock.restore()
  }
})

test("PikPak retries signin once with a fresh captcha token on 4126", async () => {
  let signinCount = 0
  let captchaCount = 0
  const mock = installFetchMock((url) => {
    if (url.includes("/v1/shield/captcha/init")) {
      captchaCount++
      return jsonResponse({
        captcha_token: `captcha-${captchaCount}`,
        expires_in: 300,
      })
    }
    if (url.includes("/v1/auth/signin")) {
      signinCount++
      if (signinCount === 1) {
        return jsonResponse({
          error_code: 4126,
          error: "AccessProhibited",
          error_description: "AccessProhibited",
        })
      }
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        sub: "user-id",
      })
    }
    return undefined
  })

  try {
    const client = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
    }) as any
    await client.login()

    const signins = mock.calls.filter((c) => c.url.includes("/v1/auth/signin"))
    assert.equal(signins.length, 2)
    assert.equal(signins[0].body.captcha_token, "captcha-1")
    assert.equal(signins[1].body.captcha_token, "captcha-2")
    assert.equal((client as any).accessToken, "access-token")
  } finally {
    mock.restore()
  }
})

test("PikPak refresh_token exchange omits UA and X-Device-ID", async () => {
  const mock = installFetchMock((url) => {
    if (url.includes("/v1/auth/token")) {
      return jsonResponse({
        access_token: "new-access",
        refresh_token: "new-refresh",
        sub: "user-id",
      })
    }
    if (url.includes("/v1/shield/captcha/init")) {
      return jsonResponse({ captcha_token: "ct", expires_in: 300 })
    }
    return undefined
  })

  try {
    const client = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
      refresh_token: "old-refresh",
    }) as any
    await client.refreshToken()

    const tokenCall = mock.calls.find((c) => c.url.includes("/v1/auth/token"))!
    assert.equal(tokenCall.body.grant_type, "refresh_token")
    assert.equal(tokenCall.body.refresh_token, "old-refresh")
    assert.equal(tokenCall.headers["user-agent"], "")
    assert.equal(tokenCall.headers["x-device-id"], undefined)
    assert.equal((client as any).accessToken, "new-access")
  } finally {
    mock.restore()
  }
})

test("PikPak fails on a captcha verification url unless skip_verification is set", async () => {
  const mock = installFetchMock((url) => {
    if (url.includes("/v1/shield/captcha/init")) {
      return jsonResponse({
        captcha_token: "ct",
        expires_in: 300,
        url: "https://user.mypikpak.net/forbidden/test",
      })
    }
    if (url.includes("/v1/auth/signin")) {
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        sub: "user-id",
      })
    }
    return undefined
  })

  try {
    const strict = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
    }) as any
    await assert.rejects(() => strict.login(), /requires captcha verification/)

    const relaxed = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
      skip_verification: true,
    }) as any
    await relaxed.login()
    assert.equal(relaxed.accessToken, "access-token")
  } finally {
    mock.restore()
  }
})

test("PikPak refresh 4126 re-logins with credentials, else asks for a new refresh_token", async () => {
  const mock = installFetchMock((url) => {
    if (url.includes("/v1/auth/token")) {
      return jsonResponse({
        error_code: 4126,
        error: "invalid_grant",
        error_description: "invalid_grant",
      })
    }
    if (url.includes("/v1/shield/captcha/init")) {
      return jsonResponse({ captcha_token: "ct", expires_in: 300 })
    }
    if (url.includes("/v1/auth/signin")) {
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        sub: "user-id",
      })
    }
    return undefined
  })

  try {
    const withCredentials = new PikPakApiClient({
      username: "user@example.com",
      password: "password123",
      refresh_token: "stale-refresh",
    }) as any
    await withCredentials.refreshToken()
    assert.equal(
      mock.calls.filter((c) => c.url.includes("/v1/auth/signin")).length,
      1,
    )
    assert.equal(withCredentials.accessToken, "access-token")

    mock.calls.length = 0
    const withoutCredentials = new PikPakApiClient({
      refresh_token: "stale-refresh",
    }) as any
    await assert.rejects(
      () => withoutCredentials.refreshToken(),
      /re-provide refresh_token/,
    )
    assert.equal(
      mock.calls.filter((c) => c.url.includes("/v1/auth/signin")).length,
      0,
    )
  } finally {
    mock.restore()
  }
})
