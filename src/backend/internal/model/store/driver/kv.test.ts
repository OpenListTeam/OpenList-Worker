import assert from "node:assert/strict"
import test from "node:test"
import { kvDriver } from "./kv"

/**
 * issue #125 回归：binding 模式 list() 必须同时兼容两种平台语义。
 *
 * Cloudflare Workers KV（KVNamespaceListResult）：
 *   keys: [{ name }]、list_complete: boolean、cursor?: string（服务端下发）
 * EdgeOne KV（官方 functions-kv 示例）：
 *   keys: [{ key, ttl, meta }]、complete: boolean（游标取本页最后一个 key）
 *
 * 旧实现只按 EdgeOne 语义读 item.key / page.complete：在 Cloudflare 上
 * 两字段恒为 undefined，keys 恒为空、complete 恒 false，且 cursor 被赋值
 * 成 ""，每轮重复拉取同一页直到 guard 上限 —— 单次 list() 消耗上千次真实
 * KV list 请求，打满免费版 1000 次/天配额。
 */

/** 构造 Cloudflare 形态的 KV binding 桩（按页返回，记录每次调用参数） */
function createCfBinding(
  pages: Array<{ keys: string[]; list_complete: boolean; cursor?: string }>,
) {
  let i = 0
  const calls: any[] = []
  return {
    calls,
    env: {
      KV: {
        get: async () => null,
        put: async () => {},
        delete: async () => {},
        list: async (opts: any) => {
          calls.push(opts)
          const page = pages[Math.min(i, pages.length - 1)]
          i += 1
          return {
            keys: page.keys.map((name) => ({ name })),
            list_complete: page.list_complete,
            cursor: page.cursor,
            cacheStatus: null,
          }
        },
      },
    },
  }
}

test("kv binding list follows Cloudflare semantics (name / list_complete / cursor)", async () => {
  const cf = createCfBinding([
    { keys: ["users_1", "users_2"], list_complete: false, cursor: "CUR1" },
    { keys: ["users_3"], list_complete: true },
  ])

  const keys = await kvDriver.list("users_", cf.env)
  assert.deepEqual(keys, ["users_1", "users_2", "users_3"])
  // 两页 = 恰好两次真实 list 请求（回归：旧实现会重复拉同一页上千次）
  assert.equal(cf.calls.length, 2)
  assert.equal(cf.calls[0].cursor, "")
  assert.equal(cf.calls[1].cursor, "CUR1")
})

test("kv binding list follows EdgeOne semantics (key / complete / last-key cursor)", async () => {
  const pages: any[] = [
    { keys: [{ key: "stor_1", ttl: 0, meta: null }], complete: false },
    { keys: [{ key: "stor_2", ttl: 0, meta: null }], complete: true },
  ]
  let i = 0
  const calls: any[] = []
  const env = {
    KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
      list: async (opts: any) => {
        calls.push(opts)
        return pages[Math.min(i++, pages.length - 1)]
      },
    },
  }

  const keys = await kvDriver.list("stor_", env)
  assert.deepEqual(keys, ["stor_1", "stor_2"])
  assert.equal(calls.length, 2)
  // EdgeOne 无服务端 cursor 字段：游标回退为本页最后一个 key
  assert.equal(calls[1].cursor, "stor_1")
})

test("kv binding list stops when cursor cannot advance (quota-burn guard)", async () => {
  let calls = 0
  const env = {
    KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
      // 同一页永远返回：无 list_complete / complete / cursor 的未知形态，
      // 或游标回传失效。绝不能空转到 guard 上限。
      list: async () => {
        calls += 1
        return { keys: [{ name: "meta_1" }] }
      },
    },
  }

  const keys = await kvDriver.list("meta_", env)
  assert.deepEqual(keys, ["meta_1"])
  // 首页 + 一次重复页检测即终止，而不是 1000 次
  assert.equal(calls, 2)
})

test("kv health (binding, key format) exercises list so exhausted quota is not reported ready", async () => {
  // DB_FORMAT=key 依赖 list；list 抛错（如 Cloudflare 配额耗尽）必须报不可用。
  const badEnv = {
    DB_FORMAT: "key",
    KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
      list: async () => {
        throw new Error("Too many list operations")
      },
    },
  }
  const bad = await kvDriver.health(badEnv)
  assert.equal(bad.available, false)
  assert.match(String(bad.error), /Too many list/)

  // 健康时：list 探测恰好消耗 1 次操作，且不用空前缀（不拉全量键）
  let listCalls = 0
  const okEnv = {
    DB_FORMAT: "key",
    KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
      list: async (opts: any) => {
        listCalls += 1
        assert.notEqual(opts.prefix, "")
        return { keys: [], list_complete: true }
      },
    },
  }
  const ok = await kvDriver.health(okEnv)
  assert.equal(ok.available, true)
  assert.equal(listCalls, 1)
})

test("kv health (binding, map format) does not require an unsupported list API", async () => {
  // ESA EdgeKV exposes get/put/delete but no list. Map format only needs the
  // single openlist_config key, so it must still be considered healthy.
  let getCalls = 0
  let healthCheckCalls = 0
  const env = {
    DB_FORMAT: "map",
    KV: {
      get: async () => {
        getCalls += 1
        return undefined
      },
      put: async () => {},
      delete: async () => true,
      // esa-entry has already performed this raw probe for the current request.
      healthCheck: async () => {
        healthCheckCalls += 1
      },
    },
  }

  const health = await kvDriver.health(env)
  assert.equal(health.available, true)
  assert.equal(health.mode, "binding")
  assert.equal(getCalls, 0, "health must reuse the ESA entry probe")
  assert.equal(healthCheckCalls, 1)

  const failedProbe = await kvDriver.health({
    DB_FORMAT: "map",
    KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => true,
      healthCheck: async () => {
        throw new Error("EdgeKV read unavailable")
      },
    },
  })
  assert.equal(failedProbe.available, false)
  assert.match(String(failedProbe.error), /EdgeKV read unavailable/)
})

test("kv health (binding) honors the legacy DB_DRIVER=json map alias", async () => {
  const health = await kvDriver.health({
    DB_DRIVER: "json",
    DB_FORMAT: "key",
    KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => true,
    },
  })
  assert.equal(health.available, true)
})

test("kv health (binding, key format) reports missing list support explicitly", async () => {
  const env = {
    DB_FORMAT: "key",
    KV: {
      get: async () => undefined,
      put: async () => {},
      delete: async () => true,
    },
  }

  const health = await kvDriver.health(env)
  assert.equal(health.available, false)
  assert.match(String(health.error), /list\(\).*required by DB_FORMAT=key/)
})

test("kv health defaults to map when DB_FORMAT is unset (ESA EdgeKV shape)", async () => {
  // 曾经的复刻实现自己解析 env，与 backend.ts 的 readFormat() 各写一份；
  // 现在两者共用同一份实现，缺省格式必须是 map（而不是按驱动名猜 key），
  // 因此没有 list() 的 EdgeKV 绑定在未配置 DB_FORMAT 时仍应判为可用。
  let listCalls = 0
  const health = await kvDriver.health({
    KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => true,
      list: async () => {
        listCalls += 1
        return { keys: [], list_complete: true }
      },
    },
  })
  assert.equal(health.available, true)
  assert.equal(listCalls, 0, "map 格式不得探测 list")
})
