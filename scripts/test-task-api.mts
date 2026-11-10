// Smoke test for the task management API.
//
// 契约对齐 Go 版（server/handles/task.go）：
//   - 列表/清理：200
//   - 单个任务操作（info/cancel/delete/retry）：tid 不存在 → 404（防探测）
//   - 批量操作：200，返回 {tid: error} 映射
import { Hono } from "hono"
import { saveDb } from "../src/backend/internal/model/db"
import { setupRouter } from "../src/backend/server/router"

// 不用 src/backend/index 的默认导出：它带「存储配置错误 → 全局 503」拦截，
// 在无绑定的本地冒烟环境里会把所有 API 直接拦掉。这里只挂路由。
const api = new Hono()
setupRouter(api)
const app = new Hono()
app.route("/api", api)

const TOKEN = "TASK_API_SMOKE_TOKEN"
const env: any = { JWT_SECRET: "TASK_API_SMOKE_CRON_SECRET" }
const headers = { Authorization: `Bearer ${TOKEN}` }

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`✅ ${name}`)
  } catch (e: any) {
    console.error(`❌ ${name}:`, e.message)
    process.exitCode = 1
  }
}

async function req(method: string, path: string, body?: any) {
  const res = await app.request(
    path,
    {
      method,
      headers:
        body !== undefined
          ? { ...headers, "Content-Type": "application/json" }
          : headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    env,
  )
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

await saveDb(
  {
    settings: [{ key: "token", value: TOKEN }],
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

const types = [
  "upload",
  "copy",
  "move",
  "offline_download",
  "decompress",
  "seed_generate",
  "seed_save",
]

await test("GET /api/task/{all types}/{undone|done} returns TaskInfo[]", async () => {
  for (const type of types) {
    for (const state of ["undone", "done"]) {
      const { status, json } = await req("GET", `/api/task/${type}/${state}`)
      if (status !== 200) throw new Error(`${type}/${state}: status ${status}`)
      if (json.code !== 200) throw new Error(`${type}/${state}: code ${json.code}`)
      if (!Array.isArray(json.data)) {
        throw new Error(`${type}/${state}: data is not an array`)
      }
    }
  }
})

await test("unknown task type returns 404", async () => {
  const { status } = await req("GET", "/api/task/not-a-type/undone")
  if (status !== 404) throw new Error(`status ${status}`)
})

await test("clear_done / clear_succeeded work", async () => {
  for (const action of ["clear_done", "clear_succeeded"]) {
    const { status, json } = await req("POST", `/api/task/copy/${action}`)
    if (status !== 200) throw new Error(`${action}: status ${status}`)
    if (json.code !== 200) throw new Error(`${action}: code ${json.code}`)
  }
})

await test("retry_failed works", async () => {
  const { status, json } = await req("POST", "/api/task/copy/retry_failed")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("single-task operations return 404 for a missing tid", async () => {
  for (const action of ["info", "cancel", "delete", "retry"]) {
    const { status } = await req("POST", `/api/task/copy/${action}?tid=missing`)
    if (status !== 404) throw new Error(`${action}: status ${status}`)
  }
})

await test("bulk operations report per-tid errors", async () => {
  for (const action of ["cancel_some", "delete_some", "retry_some"]) {
    const { status, json } = await req("POST", `/api/task/copy/${action}`, [
      "missing-1",
      "missing-2",
    ])
    if (status !== 200) throw new Error(`${action}: status ${status}`)
    if (json.data?.["missing-1"] !== "task not found") {
      throw new Error(`${action}: unexpected payload ${JSON.stringify(json.data)}`)
    }
  }
})

await test("unauthenticated task API returns 401", async () => {
  const res = await app.request("/api/task/copy/undone", {}, env)
  if (res.status !== 401) throw new Error(`status ${res.status}`)
})

console.log("\nAll task API tests completed.")
