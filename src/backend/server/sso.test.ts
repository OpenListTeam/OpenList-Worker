import assert from "node:assert/strict"
import test from "node:test"
import { Hono } from "hono"
import { verify } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { setupRouter } from "./router"
import {
  generateOidcState,
  resolvePopupTargetOrigins,
  verifyOidcState,
} from "./sso"

function createApp() {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

async function seedSsoDb(
  env: any,
  overrides: {
    settings?: Array<{ key: string; value: string }>
    users?: any[]
  } = {},
) {
  const baseSettings = [
    { key: "sso_login_enabled", value: "true" },
    { key: "sso_login_platform", value: "OIDC" },
    { key: "sso_client_id", value: "oidc-client-id" },
    { key: "sso_client_secret", value: "oidc-client-secret" },
    {
      key: "sso_oidc_discovery_url",
      value: "https://idp.example.com/.well-known/openid-configuration",
    },
    { key: "sso_scopes", value: "openid profile email" },
    { key: "sso_compatibility_mode", value: "true" },
    { key: "sso_auto_register", value: "false" },
    { key: "sso_default_dir", value: "/" },
    { key: "sso_default_permission", value: "0" },
  ]
  const settingsMap = new Map(baseSettings.map((s) => [s.key, s.value]))
  for (const s of overrides.settings || []) {
    settingsMap.set(s.key, s.value)
  }
  await saveDb(
    {
      settings: Array.from(settingsMap, ([key, value]) => ({ key, value })),
      users: overrides.users ?? [
        {
          id: 1,
          username: "alice",
          password: "unused",
          role: 0,
          permission: 0,
          base_path: "/",
          disabled: false,
          sso_id: "auth0|user-1",
          pwd_update_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      storages: [],
      shares: [],
    },
    env,
    { force: true },
  )
}

function mockOidcFetch(
  t: test.TestContext,
  options: {
    tokenResponse?: { status?: number; body: any }
    userInfo?: any
    onTokenRequest?: (params: URLSearchParams) => void
  } = {},
) {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    if (url === "https://idp.example.com/.well-known/openid-configuration") {
      return new Response(
        JSON.stringify({
          authorization_endpoint: "https://idp.example.com/authorize",
          token_endpoint: "https://idp.example.com/oauth/token",
          userinfo_endpoint: "https://idp.example.com/userinfo",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }
    if (url === "https://idp.example.com/oauth/token") {
      const bodyStr = typeof init?.body === "string" ? init.body : ""
      options.onTokenRequest?.(new URLSearchParams(bodyStr))
      const status = options.tokenResponse?.status ?? 200
      const body = options.tokenResponse?.body ?? {
        access_token: "idp-access-token",
        token_type: "Bearer",
      }
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (url === "https://idp.example.com/userinfo") {
      return new Response(
        JSON.stringify(
          options.userInfo ?? {
            sub: "auth0|user-1",
            preferred_username: "alice",
            name: "Alice",
          },
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }
    throw new Error(`Unexpected fetch URL in SSO test: ${url}`)
  }) as typeof fetch
}

test("OIDC compatibility mode full flow redirects to /@login with valid JWT", async (t) => {
  const env: any = { JWT_SECRET: "sso-test-secret-compat-login" }
  await seedSsoDb(env)

  let tokenExchangeParams: URLSearchParams | null = null
  mockOidcFetch(t, {
    onTokenRequest: (params) => {
      tokenExchangeParams = params
    },
  })

  const app = createApp()

  const startRes = await app.request(
    "https://drive.example.com/api/auth/sso?method=sso_get_token",
    {
      headers: { "CF-Connecting-IP": "203.0.113.10" },
    },
    env,
  )
  assert.equal(startRes.status, 302)
  const authLocation = startRes.headers.get("Location")
  assert.ok(authLocation)
  const authUrl = new URL(authLocation)
  assert.equal(authUrl.origin + authUrl.pathname, "https://idp.example.com/authorize")
  assert.equal(
    authUrl.searchParams.get("redirect_uri"),
    "https://drive.example.com/api/auth/sso_get_token",
  )
  const state = authUrl.searchParams.get("state") || ""
  assert.match(state, /^[0-9a-f]+\.[0-9a-f]{32}\.[0-9a-f]{64}$/)

  const cbRes = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=auth-code-123&state=${encodeURIComponent(state)}&iss=${encodeURIComponent("https://idp.example.com/")}`,
    {
      headers: { "CF-Connecting-IP": "203.0.113.10" },
    },
    env,
  )
  assert.equal(cbRes.status, 302)
  assert.equal(cbRes.headers.get("Cache-Control"), "no-store")
  assert.ok(tokenExchangeParams)
  assert.equal(
    (tokenExchangeParams as URLSearchParams).get("redirect_uri"),
    "https://drive.example.com/api/auth/sso_get_token",
  )
  assert.equal(
    (tokenExchangeParams as URLSearchParams).get("code"),
    "auth-code-123",
  )

  const loginLocation = cbRes.headers.get("Location")
  assert.ok(loginLocation)
  const loginUrl = new URL(loginLocation)
  assert.equal(loginUrl.origin + loginUrl.pathname, "https://drive.example.com/@login")
  const token = loginUrl.searchParams.get("token") || ""
  assert.ok(token.length > 0)
  const payload: any = await verify(token, env.JWT_SECRET, "HS256")
  assert.equal(payload.id, 1)
  assert.equal(payload.username, "alice")
})

test("OIDC compatibility mode /api/auth/get_sso_id redirects to /@manage", async (t) => {
  const env: any = { JWT_SECRET: "sso-test-secret-compat-id" }
  await seedSsoDb(env)
  mockOidcFetch(t)
  const app = createApp()

  const state = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "203.0.113.11",
  )
  const res = await app.request(
    `https://drive.example.com/api/auth/get_sso_id?code=code-id&state=${encodeURIComponent(state)}`,
    {
      headers: { "CF-Connecting-IP": "203.0.113.11" },
    },
    env,
  )
  assert.equal(res.status, 302)
  assert.equal(res.headers.get("Cache-Control"), "no-store")
  assert.equal(
    res.headers.get("Location"),
    "https://drive.example.com/@manage?sso_id=auth0%7Cuser-1",
  )
})

test("Stateless HMAC OIDC state works across isolates and rejects replay, tampering, IP mismatch, and expiry", async (t) => {
  const env: any = { JWT_SECRET: "sso-test-secret-stateless" }
  await seedSsoDb(env)
  mockOidcFetch(t)
  const app = createApp()

  // Simulate state issued by a different Worker isolate (no prior /api/auth/sso hit here)
  const validState = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "198.51.100.20",
  )
  const okRes = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=code-ok&state=${encodeURIComponent(validState)}`,
    {
      headers: { "CF-Connecting-IP": "198.51.100.20" },
    },
    env,
  )
  assert.equal(okRes.status, 302)

  // Replay within same isolate is rejected
  const replayRes = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=code-replay&state=${encodeURIComponent(validState)}`,
    {
      headers: { "CF-Connecting-IP": "198.51.100.20" },
    },
    env,
  )
  assert.equal(replayRes.status, 400)
  assert.equal(await replayRes.text(), "incorrect or expired state parameter")

  // Tampered MAC is rejected
  const parts = validState.split(".")
  const flipped = (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1)
  const tamperedState = `${parts[0]}.${parts[1]}.${flipped}`
  const tamperedRes = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=code-tamper&state=${encodeURIComponent(tamperedState)}`,
    {
      headers: { "CF-Connecting-IP": "198.51.100.20" },
    },
    env,
  )
  assert.equal(tamperedRes.status, 400)
  assert.equal(await tamperedRes.text(), "incorrect or expired state parameter")

  // Mismatched IP is rejected
  const ipState = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "198.51.100.21",
  )
  const ipMismatchRes = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=code-ip&state=${encodeURIComponent(ipState)}`,
    {
      headers: { "CF-Connecting-IP": "198.51.100.99" },
    },
    env,
  )
  assert.equal(ipMismatchRes.status, 400)
  assert.equal(await ipMismatchRes.text(), "incorrect or expired state parameter")

  // Concurrent callbacks within same isolate only accept one invocation
  const concurrentState = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "198.51.100.23",
  )
  const concurrentResults = await Promise.all(
    Array.from({ length: 5 }, () =>
      verifyOidcState(
        env.JWT_SECRET,
        "oidc-client-id",
        "198.51.100.23",
        concurrentState,
      ),
    ),
  )
  assert.equal(concurrentResults.filter(Boolean).length, 1)

  // Expired state is rejected
  const expiredState = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "198.51.100.22",
    Date.now() - 10 * 60 * 1000,
  )
  const expiredValidCheck = await verifyOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "198.51.100.22",
    expiredState,
  )
  assert.equal(expiredValidCheck, false)
  const expiredRes = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=code-exp&state=${encodeURIComponent(expiredState)}`,
    {
      headers: { "CF-Connecting-IP": "198.51.100.22" },
    },
    env,
  )
  assert.equal(expiredRes.status, 400)
  assert.equal(await expiredRes.text(), "incorrect or expired state parameter")
})

test("Non-compatibility popup mode returns HTML with matching CSP nonce and Cache-Control: no-store", async (t) => {
  const env: any = { JWT_SECRET: "sso-test-secret-popup" }
  await seedSsoDb(env, {
    settings: [{ key: "sso_compatibility_mode", value: "false" }],
  })
  mockOidcFetch(t)
  const app = createApp()

  const state = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "203.0.113.30",
  )
  const res = await app.request(
    `https://drive.example.com/api/auth/sso_callback?method=sso_get_token&code=popup-code&state=${encodeURIComponent(state)}`,
    {
      headers: { "CF-Connecting-IP": "203.0.113.30" },
    },
    env,
  )
  assert.equal(res.status, 200)
  assert.match(res.headers.get("Content-Type") || "", /^text\/html/)
  assert.equal(res.headers.get("Cache-Control"), "no-store")

  const csp = res.headers.get("Content-Security-Policy") || ""
  const cspMatch = csp.match(
    /^default-src 'none'; script-src 'nonce-([0-9a-f]+)'; frame-ancestors 'none'$/,
  )
  assert.ok(cspMatch, `Unexpected CSP header: ${csp}`)

  const html = await res.text()
  assert.ok(html.includes(`<script nonce="${cspMatch[1]}">`))
  assert.ok(html.includes("window.opener.postMessage(payload, origins[i])"))
  assert.ok(html.includes('["https://drive.example.com"]'))
  assert.ok(!html.includes('"*"'))
})

test("Popup postMessage target origins respect ALLOW_URLS and reject unsafe values", async (t) => {
  const env: any = {
    JWT_SECRET: "sso-test-secret-popup-allow-urls",
    ALLOW_URLS: "https://ui.example.com, https://admin.example.com/sub, *, javascript:alert(1)",
  }
  const resolved = resolvePopupTargetOrigins({
    req: { url: "https://drive.example.com/api/auth/sso_callback" },
    env,
  })
  assert.deepEqual(resolved, [
    "https://drive.example.com",
    "https://ui.example.com",
    "https://admin.example.com",
  ])

  await seedSsoDb(env, {
    settings: [{ key: "sso_compatibility_mode", value: "false" }],
  })
  mockOidcFetch(t)
  const app = createApp()

  const state = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "203.0.113.31",
  )
  const res = await app.request(
    `https://drive.example.com/api/auth/sso_callback?method=sso_get_token&code=popup-code-allow&state=${encodeURIComponent(state)}`,
    {
      headers: { "CF-Connecting-IP": "203.0.113.31" },
    },
    env,
  )
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(
    html.includes(
      '["https://drive.example.com","https://ui.example.com","https://admin.example.com"]',
    ),
  )
  assert.ok(!html.includes('"*"'))
  assert.ok(!html.includes("javascript:alert(1)"))
})

test("Auto-register persists new user with sso_default_dir and sso_default_permission", async (t) => {
  const env: any = { JWT_SECRET: "sso-test-secret-autoreg" }
  await seedSsoDb(env, {
    users: [],
    settings: [
      { key: "sso_auto_register", value: "true" },
      { key: "sso_default_dir", value: "/shared/sso" },
      { key: "sso_default_permission", value: "3" },
    ],
  })
  mockOidcFetch(t, {
    userInfo: {
      sub: "auth0|new-user-42",
      preferred_username: "bob",
      name: "Bob",
    },
  })
  const app = createApp()

  const state = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "203.0.113.40",
  )
  const res = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=new-user-code&state=${encodeURIComponent(state)}`,
    {
      headers: { "CF-Connecting-IP": "203.0.113.40" },
    },
    env,
  )
  assert.equal(res.status, 302)

  const db = await getDb(env)
  const created = db.users.find((u: any) => u.sso_id === "auth0|new-user-42")
  assert.ok(created)
  assert.equal(created.username, "bob")
  assert.equal(created.base_path, "/shared/sso")
  assert.equal(created.permission, 3)
  assert.ok(created.password && created.password !== "")
})

test("Callback surfaces IdP error query params and OIDC token exchange error_description", async (t) => {
  const env: any = { JWT_SECRET: "sso-test-secret-errors" }
  await seedSsoDb(env)
  mockOidcFetch(t, {
    tokenResponse: {
      status: 403,
      body: {
        error: "invalid_grant",
        error_description: "Authorization code has expired",
      },
    },
  })
  const app = createApp()

  const errorRes = await app.request(
    "https://drive.example.com/api/auth/sso_get_token?error=access_denied&error_description=User+denied",
    {},
    env,
  )
  assert.equal(errorRes.status, 400)
  assert.equal(await errorRes.text(), "SSO error: access_denied (User denied)")

  const state = await generateOidcState(
    env.JWT_SECRET,
    "oidc-client-id",
    "203.0.113.50",
  )
  const tokenErrRes = await app.request(
    `https://drive.example.com/api/auth/sso_get_token?code=expired-code&state=${encodeURIComponent(state)}`,
    {
      headers: { "CF-Connecting-IP": "203.0.113.50" },
    },
    env,
  )
  assert.equal(tokenErrRes.status, 500)
  assert.equal(
    await tokenErrRes.text(),
    "OIDC token exchange failed: Authorization code has expired",
  )
})
