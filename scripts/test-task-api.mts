// Quick smoke test for task management API endpoints
import app from "../src/backend/index"

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
  const res = await app.request(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

const types = ["upload", "copy", "move", "offline_download"]

await test("GET /api/task/upload/undone returns task list", async () => {
  const { status, json } = await req("GET", "/api/task/upload/undone")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
  if (!Array.isArray(json.data)) throw new Error("data is not an array")
})

await test("GET /api/task/upload/done returns task list", async () => {
  const { status, json } = await req("GET", "/api/task/upload/done")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
  if (!Array.isArray(json.data)) throw new Error("data is not an array")
})

await test("GET /api/task/{all types}/{done} return 200", async () => {
  for (const type of types) {
    for (const done of ["undone", "done"]) {
      const { status } = await req("GET", `/api/task/${type}/${done}`)
      if (status !== 200) throw new Error(`${type}/${done}: status ${status}`)
    }
  }
})

await test("POST /api/task/upload/clear_done works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/clear_done")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/clear_succeeded works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/clear_succeeded")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/retry_failed works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/retry_failed")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/retry?tid= works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/retry?tid=1")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/cancel?tid= works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/cancel?tid=1")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/delete?tid= works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/delete?tid=1")
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/cancel_some works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/cancel_some", [
    "1",
    "2",
  ])
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/delete_some works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/delete_some", [
    "1",
    "2",
  ])
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

await test("POST /api/task/upload/retry_some works", async () => {
  const { status, json } = await req("POST", "/api/task/upload/retry_some", [
    "1",
    "2",
  ])
  if (status !== 200) throw new Error(`status ${status}`)
  if (json.code !== 200) throw new Error(`code ${json.code}`)
})

console.log("\nAll task API tests completed.")
