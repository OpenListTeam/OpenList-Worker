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

/** 用假 fetch 跑 init 的辅助：routes 为 `${method} ${path}` -> 响应体 */
async function withMockFetch(
  routes: Record<string, { status?: number; body: any }>,
  fn: () => Promise<void>,
) {
  const calls: string[] = []
  const orig = globalThis.fetch
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = new URL(String(url))
    const key = `${init?.method || "GET"} ${u.pathname}`
    calls.push(key)
    const r = routes[key]
    if (!r) throw new Error(`unexpected fetch: ${key}`)
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 })
  }) as any
  try {
    await fn()
  } finally {
    globalThis.fetch = orig
  }
  return calls
}

test("init: phone+send_code 发短信并暂存 verification_id，不视为失败", async () => {
  const persisted: Record<string, any>[] = []
  const driver = new GuangYaPanDriver(
    {
      client_id: "cid",
      device_id: "0123456789abcdef0123456789abcdef",
      phone_number: "13800138000",
      send_code: true,
    },
    async (changes) => {
      persisted.push(changes)
    },
  )
  await withMockFetch(
    {
      "POST /v1/shield/captcha/init": { body: { captcha_token: "ct1" } },
      "POST /v1/auth/verification": { body: { verification_id: "vid1" } },
    },
    async () => {
      await driver.init()
    },
  )
  // 发送成功后自动复位 send_code，并回写 verification_id
  const last = persisted[persisted.length - 1]
  assert.equal(last.verification_id, "vid1")
  assert.equal(last.send_code, false)
})

test("init: phone+verify_code 完成登录并清空一次性字段", async () => {
  const persisted: Record<string, any>[] = []
  const driver = new GuangYaPanDriver(
    {
      client_id: "cid",
      device_id: "0123456789abcdef0123456789abcdef",
      phone_number: "+86 13800138000",
      verify_code: "123456",
      verification_id: "vid1",
    },
    async (changes) => {
      persisted.push(changes)
    },
  )
  await withMockFetch(
    {
      "POST /v1/auth/verification/verify": {
        body: { verification_token: "vt1" },
      },
      "POST /v1/auth/signin": {
        body: { access_token: "at1", refresh_token: "rt1" },
      },
      "GET /v1/user/me": { body: { sub: "u1" } },
    },
    async () => {
      await driver.init()
    },
  )
  const last = persisted[persisted.length - 1]
  assert.equal(last.access_token, "at1")
  assert.equal(last.refresh_token, "rt1")
  assert.equal(last.verify_code, "")
  assert.equal(last.verification_id, "")
})

test("init: captcha 失效时自动刷新并重试发短信", async () => {
  const driver = new GuangYaPanDriver({
    client_id: "cid",
    device_id: "0123456789abcdef0123456789abcdef",
    phone_number: "13800138000",
    send_code: true,
    captcha_token: "old-ct",
  })
  let captchaInits = 0
  let verificationCalls = 0
  const orig = globalThis.fetch
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = new URL(String(url))
    const key = `${init?.method || "GET"} ${u.pathname}`
    if (key === "POST /v1/shield/captcha/init") {
      captchaInits++
      return new Response(JSON.stringify({ captcha_token: "new-ct" }))
    }
    if (key === "POST /v1/auth/verification") {
      // 第一次模拟 captcha 失效，刷新后第二次成功
      verificationCalls++
      if (verificationCalls === 1) {
        return new Response(
          JSON.stringify({
            error: "captcha_invalid",
            error_description: "captcha_token expired",
          }),
          { status: 400 },
        )
      }
      return new Response(JSON.stringify({ verification_id: "vid2" }))
    }
    throw new Error(`unexpected fetch: ${key}`)
  }) as any
  try {
    await driver.init()
  } finally {
    globalThis.fetch = orig
  }
  // ensureCaptchaToken(false) 因已有旧 token 而跳过；发码失败后 force 刷新一次
  assert.equal(captchaInits, 1)
})

test("init: 无任何凭据时抛出可读错误", async () => {
  const driver = new GuangYaPanDriver({ client_id: "cid" })
  await assert.rejects(() => driver.init(), /login failed/)
})

test("init: 缺 client_id 直接失败", async () => {
  const driver = new GuangYaPanDriver({ access_token: "at" })
  await assert.rejects(() => driver.init(), /client_id is required/)
})
