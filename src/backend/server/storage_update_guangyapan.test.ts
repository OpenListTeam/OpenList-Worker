import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { adminRouter } from "./admin"
import { getDb, saveDb } from "../internal/model/db"

/**
 * PR #142 回归：/admin/storage/update 走驱动初始化时，驱动通过 onStateChanged
 * 回写的一次性登录态（verification_id / captcha_token / send_code）必须落库，
 * 同时不能把用户本次提交的其它 addition 配置项回退成旧值。
 *
 * 修复前 handler 会在 getDriver 之后重新读库再 `{...提交, ...读库}` 合并，
 * 由于读到的库值是「旧 addition + 驱动改动」，提交里所有已存在的键都会被旧值覆盖
 * （例如提交 page_size=500，旧值 200，最终写入 200）。
 */

const authHeaders = { Authorization: "Bearer admin-token" }

const DEVICE_ID = "0123456789abcdef0123456789abcdef"

async function setupEnv(storage: any): Promise<any> {
  const env: any = {}
  await saveDb(
    {
      settings: [{ key: "token", value: "admin-token" }],
      users: [],
      storages: [storage],
      shares: [],
      metas: [],
    },
    env,
  )
  return env
}

function makeApp(): Hono {
  const app = new Hono()
  app.route("/api/admin", adminRouter)
  return app
}

function jsonResponse(body: any): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

test("storage/update 同时保留提交的 addition 与驱动回写的登录态", async () => {
  const env = await setupEnv({
    id: 1,
    driver: "GuangYaPan",
    mount_path: "/guangyapan-test",
    addition: JSON.stringify({
      client_id: "cid",
      device_id: DEVICE_ID,
      phone_number: "13800138000",
      send_code: false,
      page_size: 200,
    }),
    disabled: false,
    modified: "2026-01-01T00:00:00.000Z",
  })
  const app = makeApp()

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = new URL(String(input))
    const key = `${init?.method || "GET"} ${url.pathname}`
    if (key === "POST /v1/shield/captcha/init") {
      return jsonResponse({ captcha_token: "ct1" })
    }
    if (key === "POST /v1/auth/verification") {
      return jsonResponse({ verification_id: "vid1" })
    }
    throw new Error(`unexpected fetch: ${key}`)
  }) as typeof fetch

  try {
    const res = await app.request(
      "/api/admin/storage/update",
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: 1,
          driver: "GuangYaPan",
          mount_path: "/guangyapan-test",
          // 用户本次把 page_size 从 200 改成 500，并触发发送短信验证码
          addition: JSON.stringify({
            client_id: "cid",
            device_id: DEVICE_ID,
            phone_number: "13800138000",
            send_code: true,
            page_size: 500,
          }),
        }),
      },
      env,
    )
    assert.equal(res.status, 200)
    const body: any = await res.json()
    assert.equal(body.code, 200)
  } finally {
    globalThis.fetch = originalFetch
  }

  const db: any = await getDb(env)
  const saved = (db.storages || []).find((s: any) => s.id === 1)
  assert.ok(saved, "storage 仍应存在")
  const addition = JSON.parse(saved.addition)

  // 用户提交的配置项不能被旧值回退
  assert.equal(addition.page_size, 500)
  // 驱动初始化时回写的登录态必须落库
  assert.equal(addition.captcha_token, "ct1")
  assert.equal(addition.verification_id, "vid1")
  assert.equal(addition.send_code, false)
})
