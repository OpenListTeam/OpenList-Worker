// Simulate Cloudflare Workers environment: no process.release (no Node.js runtime)
import app from "../src/backend/index"

// Simulate Workers: process.release is undefined (even with nodejs_compat)
Object.defineProperty(process, "release", { value: undefined, configurable: true })

let pass = 0
let fail = 0

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    pass++
    console.log(`✅ ${name}`)
  } catch (e: any) {
    fail++
    console.error(`❌ ${name}:`, e.message)
  }
}

let authToken = ""

async function req(method: string, path: string, body?: any, withAuth = false) {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (withAuth && authToken) headers["Authorization"] = authToken

  const res = await app.request(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

await test("登录 /api/auth/login", async () => {
  const { status, json } = await req("POST", "/api/auth/login", {
    username: "admin",
    password: "admin",
  })
  if (status !== 200 || json.code !== 200) throw new Error(`status ${status} code ${json.code}`)
  authToken = json.data?.token || ""
})

await test("健康检查 /api/health", async () => {
  const { status } = await req("GET", "/api/health")
  if (status !== 200) throw new Error(`status ${status}`)
})

await test("任务列表 /api/task/upload/undone", async () => {
  const { status, json } = await req("GET", "/api/task/upload/undone", undefined, true)
  if (status !== 200 || json.code !== 200) throw new Error(`status ${status}`)
})

await test("任务操作 /api/task/upload/clear_done", async () => {
  const { status, json } = await req("POST", "/api/task/upload/clear_done", undefined, true)
  if (status !== 200 || json.code !== 200) throw new Error(`status ${status}`)
})

await test("分享列表 /api/share/list", async () => {
  const { status, json } = await req("GET", "/api/share/list", undefined, true)
  if (status !== 200 || json.code !== 200) throw new Error(`status ${status}`)
})

await test("存储列表 /api/admin/storage/list (无auth应code401)", async () => {
  const { status, json } = await req("GET", "/api/admin/storage/list")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 401) throw new Error(`expected code 401, got ${json.code}`)
})

await test("索引进度 /api/admin/index/progress (无auth应code401)", async () => {
  const { status, json } = await req("GET", "/api/admin/index/progress")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 401) throw new Error(`expected code 401, got ${json.code}`)
})

await test("扫描进度 /api/admin/scan/progress (无auth应code401)", async () => {
  const { status, json } = await req("GET", "/api/admin/scan/progress")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 401) throw new Error(`expected code 401, got ${json.code}`)
})

await test("公开设置 /api/public/settings", async () => {
  const { status } = await req("GET", "/api/public/settings")
  if (status !== 200) throw new Error(`status ${status}`)
})

await test("raw 下载（无存储时404）", async () => {
  const { status } = await req("GET", "/api/p/test.txt")
  // 无存储时应返回错误而非崩溃
  if (status === 500) throw new Error("server error, should be 4xx")
})

await test("驱动列表 /api/admin/driver/names", async () => {
  const { status, json } = await req("GET", "/api/admin/driver/names", undefined, true)
  if (status !== 200 || json.code !== 200) throw new Error(`status ${status}`)
  if (!json.data.includes("PikPak") || !json.data.includes("Seafile") || !json.data.includes("YandexDisk")) {
    throw new Error("Missing newly added drivers in /driver/names")
  }
})

await test("debug 信息 /api/debug/info", async () => {
  const { status } = await req("GET", "/api/debug/info")
  if (status !== 200) throw new Error(`status ${status}`)
})

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
