import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"

import { saveDb } from "../internal/model/db"
import { enqueueTask } from "../internal/task/manager"
import { setupRouter } from "./router"

const ADMIN_TOKEN = "TASK_ADMIN_TOKEN"
const CRON_SECRET = "TASK_CRON_SECRET_123456"

const env: any = { JWT_SECRET: CRON_SECRET }

function makeApp() {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

async function seedDb() {
  await saveDb(
    {
      settings: [{ key: "token", value: ADMIN_TOKEN }],
      users: [
        {
          id: 1,
          username: "admin",
          password: "xxx",
          role: 2,
          permission: 0,
          base_path: "/",
          disabled: false,
        },
      ],
      storages: [],
      shares: [],
    },
    env,
  )
}

const adminHeaders = { Authorization: `Bearer ${ADMIN_TOKEN}` }

test("task API requires authentication", async () => {
  await seedDb()
  const res = await makeApp().request("/api/task/copy/undone", {}, env)
  assert.equal(res.status, 401)
})

test("unknown task type is a 404 (same as the Go route layout)", async () => {
  await seedDb()
  const res = await makeApp().request(
    "/api/task/not-a-type/undone",
    { headers: adminHeaders },
    env,
  )
  assert.equal(res.status, 404)
})

test("invalid state is rejected", async () => {
  await seedDb()
  const res = await makeApp().request(
    "/api/task/copy/something",
    { headers: adminHeaders },
    env,
  )
  assert.equal(res.status, 400)
})

test("admin can list undone tasks and gets TaskInfo shape", async () => {
  await seedDb()
  const record = await enqueueTask(env, {
    type: "copy",
    name: "copy /a to /b",
    creator_id: 1,
    creator: "admin",
    creator_role: 2,
    payload: { op: "copy", src_dir: "/a", dst_dir: "/b", names: ["x"] },
  })

  const res = await makeApp().request(
    "/api/task/copy/undone",
    { headers: adminHeaders },
    env,
  )
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.equal(body.code, 200)
  assert.equal(Array.isArray(body.data), true)
  const item = body.data.find((t: any) => t.id === record.id)
  assert.ok(item, "enqueued task must be visible")
  assert.equal(item.name, "copy /a to /b")
  assert.equal(item.creator, "admin")
  assert.equal(item.creator_role, 2)
  assert.equal(item.state, 0)
  assert.equal(item.payload, undefined)
  assert.equal(item.cursor, undefined)
})

test("a task that never existed returns 404 for info/cancel/delete/retry", async () => {
  await seedDb()
  const app = makeApp()
  for (const endpoint of ["info", "cancel", "delete", "retry"]) {
    const res = await app.request(
      `/api/task/copy/${endpoint}?tid=missing`,
      { method: "POST", headers: adminHeaders },
      env,
    )
    assert.equal(res.status, 404, `${endpoint} must be 404`)
  }
})

test("seed_save does not support retry (matches Go canRetry=false)", async () => {
  await seedDb()
  const res = await makeApp().request(
    "/api/task/seed_save/retry?tid=x",
    { method: "POST", headers: adminHeaders },
    env,
  )
  assert.equal(res.status, 404)
})

test("cancel moves a pending task to canceled immediately", async () => {
  await seedDb()
  const record = await enqueueTask(env, {
    type: "move",
    name: "move /a to /b",
    creator_id: 1,
    creator: "admin",
    creator_role: 2,
    payload: { op: "move", src_dir: "/a", dst_dir: "/b", names: ["x"] },
  })
  const res = await makeApp().request(
    `/api/task/move/cancel?tid=${record.id}`,
    { method: "POST", headers: adminHeaders },
    env,
  )
  assert.equal(res.status, 200)
  const info = await makeApp().request(
    `/api/task/move/info?tid=${record.id}`,
    { method: "POST", headers: adminHeaders },
    env,
  )
  const body: any = await info.json()
  assert.equal(body.data.state, 4)
  assert.equal(body.data.end_time !== null, true)
})

test("clear_done removes finished tasks", async () => {
  await seedDb()
  const record = await enqueueTask(env, {
    type: "copy",
    name: "copy /c to /d",
    creator_id: 1,
    creator: "admin",
    creator_role: 2,
    payload: { op: "copy", src_dir: "/c", dst_dir: "/d", names: ["y"] },
  })
  // 先取消，让它进入 done 状态
  await makeApp().request(
    `/api/task/copy/cancel?tid=${record.id}`,
    { method: "POST", headers: adminHeaders },
    env,
  )
  const res = await makeApp().request(
    "/api/task/copy/clear_done",
    { method: "POST", headers: adminHeaders },
    env,
  )
  assert.equal(res.status, 200)

  const list = await makeApp().request(
    "/api/task/copy/done",
    { headers: adminHeaders },
    env,
  )
  const body: any = await list.json()
  assert.equal(body.data.some((t: any) => t.id === record.id), false)
})

test("POST /api/task/run requires the cron secret or an admin", async () => {
  await seedDb()
  const denied = await makeApp().request(
    "/api/task/run",
    { method: "POST" },
    env,
  )
  assert.equal(denied.status, 401)

  const allowed = await makeApp().request(
    "/api/task/run",
    {
      method: "POST",
      headers: { "X-Cron-Secret": CRON_SECRET },
    },
    env,
  )
  assert.equal(allowed.status, 200)
  const body: any = await allowed.json()
  assert.equal(body.code, 200)
  assert.equal(typeof body.data.ran, "number")
  assert.equal(typeof body.data.remaining, "number")
})

test("bulk actions report per-tid errors without failing the whole request", async () => {
  await seedDb()
  const res = await makeApp().request(
    "/api/task/copy/delete_some",
    {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(["missing-1", "missing-2"]),
    },
    env,
  )
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.equal(body.data["missing-1"], "task not found")
  assert.equal(body.data["missing-2"], "task not found")
})
