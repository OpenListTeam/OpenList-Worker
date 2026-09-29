import assert from "node:assert/strict"
import { test } from "node:test"
import app from "../index"

/**
 * KV 代理端点的「自调用环」回归测试。
 *
 * 现象（本地 `wrangler dev`）：满屏 `GET /kv-list 503`，且每条耗时逐条增长
 * （2433ms → 2624ms …）。
 *
 * 机制：kv 驱动的可用性判定 = 向 `{origin}/kv-list?prefix=__health__` 发一次 HTTP
 * 探测（本地 origin 就是 dev server 自己）。若这些探测请求落进全局「存储配置错误
 * 拦截」，中间件会再次解析驱动 → 再次探测自身 → 无限自调用；每层都要等内层返回，
 * 所以耗时持续增长，而每条响应都是 503（kv 不可用 → 配置错误）。
 *
 * 因此本部署必须：① 不把这些路径交给拦截逻辑；② 明确回 410，而不是落进 SPA 兜底
 * （兜底返回 HTML 200，会让探测误判为「KV 可用」）。
 */

const JWT = "0123456789abcdef0123456789abcdef"

/** 记录出站 fetch：KV 代理探测就表现为一次出站请求 */
function captureFetch(status = 503) {
  const original = globalThis.fetch
  const calls: string[] = []
  ;(globalThis as any).fetch = async (input: any) => {
    calls.push(String(input?.url ?? input))
    return new Response("stub", { status })
  }
  return {
    calls,
    restore: () => {
      ;(globalThis as any).fetch = original
    },
  }
}

const kvEnv = (): any => ({
  DB_DRIVER: "kv",
  DB_FORMAT: "map",
  JWT_SECRET: JWT,
  __requestOrigin: "https://example.workers.dev",
})

test("KV 代理端点：本部署不提供 → 410，且处理它绝不再发起探测", async () => {
  const cap = captureFetch(503)
  try {
    const res = await app.fetch(
      new Request("https://example.workers.dev/kv-list?prefix=__health__"),
      kvEnv(),
    )
    assert.equal(
      res.status,
      410,
      "必须明确拒绝：既不能 503（会被拦截逻辑递归），也不能 200（会被误判为可用）",
    )
    const body: any = await res.json()
    assert.match(String(body.message), /not served by this deployment/)
    assert.equal(
      cap.calls.length,
      0,
      "处理该请求不得再发起任何出站探测，否则形成无限自调用环",
    )
  } finally {
    cap.restore()
  }
})

test("KV 代理端点：豁免拦截不影响业务接口（未降级、未放松）", async () => {
  const cap = captureFetch(503)
  try {
    const res = await app.fetch(
      new Request("https://example.workers.dev/api/public/settings"),
      kvEnv(),
    )
    assert.equal(res.status, 503, "kv 不可用时业务接口必须 503，不得静默降级")
    const body: any = await res.json()
    assert.equal(body.data?.code, "DRIVER_UNAVAILABLE")
    assert.match(
      String(body.data?.suggestion),
      /DB_DRIVER=/,
      "503 仍要带上「改成什么」的建议",
    )
  } finally {
    cap.restore()
  }
})
