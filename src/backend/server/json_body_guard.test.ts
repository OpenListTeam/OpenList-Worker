import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { setupRouter } from "./router"

/**
 * jsonBodyGuard 回归测试（issue #170）。
 *
 * EdgeOne Node 云函数会把请求体的底层流在平台侧提前消费，实测 30%~45% 的
 * JSON POST 读不到 body。这里钉死三条长期必须成立的语义：
 *
 *   1. 「读不到 body」是**服务端暂时不可用**（503 + 可重试信号），不是
 *      客户端请求非法（400）——否则前端不重试，40% 的丢包直接变成 40% 的
 *      用户可见报错（issue #170 的原症状）；
 *   2. 无论读到还是读不到 body，都**不能**放行到 handler 去"再读一次"——
 *      Hono 的 bodyCache 里留下的是同一个 rejected Promise，二次读取只会
 *      把错误变成 500 或静默的根目录（issue #112）；
 *   3. 真正由客户端造成的「空 body / 非法 JSON」仍然必须是 400，且严格
 *      路径的判定不能靠 `startsWith("/api/fs")` 这类前缀误伤 `/api/fsx`。
 */

const RETRY_MESSAGE = "request body unavailable, please retry"

function buildApp() {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

/** 测试用 env：本文件只关心守卫分支，业务中间件拿不到配置即可。 */
const env = {} as any

function jsonPost(
  path: string,
  body: BodyInit | null,
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  })
}

async function envelope(res: Response): Promise<{ message?: string }> {
  try {
    return (await res.json()) as { message?: string }
  } catch {
    return {}
  }
}

test("平台已提前消费请求体（bodyUsed）→ 503 + 可重试信号，而不是 400", async () => {
  const request = jsonPost(
    "/api/auth/login",
    JSON.stringify({ username: "u", password: "p" }),
  )
  // 模拟 EdgeOne 平台在函数执行前把流读掉
  await request.text()
  assert.equal(request.bodyUsed, true)

  const res = await buildApp().request(request, undefined, env)

  assert.equal(res.status, 503)
  assert.equal(res.headers.get("x-openlist-retry"), "body")
  assert.equal(res.headers.get("retry-after"), "1")
  assert.equal((await envelope(res)).message, RETRY_MESSAGE)
})

test("读取请求体抛异常（terminated）→ 503，不放行到 handler", async () => {
  const broken = new ReadableStream({
    pull(controller) {
      controller.error(new Error("terminated"))
    },
  })
  const request = new Request("http://localhost/api/fs/list", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: broken,
    // Node 的 undici 对流式 body 要求显式声明半双工
    duplex: "half",
  } as any)

  const res = await buildApp().request(request, undefined, env)

  assert.equal(res.status, 503)
  assert.equal((await envelope(res)).message, RETRY_MESSAGE)
})

test("Content-Length 与实际读到长度不符（截断）→ 503", async () => {
  // 声明 100 字节，实际只有 12 字节：平台提前 EOF 的特征
  const request = jsonPost("/api/fs/list", JSON.stringify({ path: "/" }), {
    "content-length": "100",
  })

  const res = await buildApp().request(request, undefined, env)

  assert.equal(res.status, 503)
  assert.equal((await envelope(res)).message, RETRY_MESSAGE)
})

test("读到完整 body 后，非法 JSON 仍然是 400（客户端问题）", async () => {
  const res = await buildApp().request(
    jsonPost("/api/auth/login", "not-a-json"),
    undefined,
    env,
  )

  assert.equal(res.status, 400)
  assert.equal((await envelope(res)).message, "invalid JSON request body")
})

test("严格路径（/api/fs/*）空 body 仍然是 400", async () => {
  const res = await buildApp().request(
    jsonPost("/api/fs/list", null),
    undefined,
    env,
  )

  assert.equal(res.status, 400)
  assert.equal((await envelope(res)).message, "request body required")
})

test("严格路径判定不再前缀误伤 /api/fsx/*", async () => {
  const res = await buildApp().request(
    jsonPost("/api/fsx/list", null),
    undefined,
    env,
  )

  assert.notEqual(res.status, 503)
  assert.notEqual((await envelope(res)).message, "request body required")
})

test("非严格路径空 body 仍放行（兼容无 body 调用）", async () => {
  const res = await buildApp().request(
    jsonPost("/api/auth/login", null),
    undefined,
    env,
  )

  assert.notEqual(res.status, 503)
  assert.notEqual((await envelope(res)).message, "request body required")
})

test("正常 JSON body 不会被守卫拦截", async () => {
  const res = await buildApp().request(
    jsonPost(
      "/api/auth/login",
      JSON.stringify({ username: "u", password: "p" }),
    ),
    undefined,
    env,
  )

  assert.notEqual(res.status, 503)
  assert.notEqual((await envelope(res)).message, RETRY_MESSAGE)
})

test("GET 请求不读 body（平台丢包只影响写请求）", async () => {
  const res = await buildApp().request(
    "http://localhost/api/public/settings",
    undefined,
    env,
  )

  assert.notEqual(res.status, 503)
})
