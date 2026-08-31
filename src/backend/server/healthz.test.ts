import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { saveDb } from "../internal/model/db"
import { setupRouter } from "./router"

const buildApp = () => {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

const healthyEnv = () => ({
  KV: {
    get: async () =>
      JSON.stringify({
        settings: [],
        users: [],
        storages: [{ id: 1, mount_path: "/x", driver: "local" }],
        shares: [],
      }),
    put: async () => true,
  },
})

test("Observability: /api/healthz returns 200 when config and persistence are healthy", async () => {
  const env = healthyEnv()
  await saveDb(
    { settings: [], users: [], storages: [], shares: [] },
    env as any,
  )
  const res = await buildApp().request("/api/healthz", { method: "GET" }, env)
  assert.equal(res.status, 200, "a healthy deployment must report 200")
  const json: any = await res.json()
  assert.equal(json.ok, true)
  assert.equal(json.checks.persistence.configured, true)
})

test("Observability: /api/healthz returns 200 when no persistence is configured (memory mode)", async () => {
  // Empty env means no KV binding: this is a valid memory-only deployment
  // (Vercel, Lambda, Docker). Return 200 so monitors don't alarm, but
  // clearly indicate the mode in the response.
  const env: any = {}
  const res = await buildApp().request("/api/healthz", { method: "GET" }, env)
  assert.equal(
    res.status,
    200,
    "memory-only deployments should be reported as healthy",
  )
  const json: any = await res.json()
  assert.equal(json.ok, true)
  assert.equal(json.checks.persistence.configured, false)
  assert.equal(json.checks.persistence.mode, "memory")
  assert.ok(
    json.checks.persistence.note,
    "should include a note about ephemeral mode",
  )
})

test("Observability: /api/health is left untouched as a liveness-only marker", async () => {
  // External monitors may already depend on /health answering 200. It is a
  // known-fake probe (hardcoded ok:true) and is deliberately not changed —
  // /healthz is the real signal.
  const res = await buildApp().request("/api/health", { method: "GET" }, {})
  assert.equal(res.status, 200)
  const json: any = await res.json()
  assert.equal(json.ok, true)
})
