import assert from "node:assert/strict"
import { test } from "node:test"
import { __resetDbCacheForTest } from "../internal/model/db"
import { getJwtSecret, resetJwtSecretCache } from "./middlewares"

/**
 * getJwtSecret() 缓存回归测试
 *
 * 背景：getJwtSecret 的 KV 命中分支曾经只 `return kvSecret` 而不写入
 * cachedJwtSecret，导致该函数**自身**没有缓存：只要底层 KV 读取没有被其它层
 * 记忆化，每次调用就会重新回源。而该函数在一次请求内会被
 * getUserFromContext / csrfProtection / checkAdminAuth 等调用 2-4 次。
 *
 * 说明：底层的 getKvBinding 也做了按 env 身份的结果缓存，因此若反复使用
 * **同一个 env 对象**，即使 getJwtSecret 自身不缓存也可能不产生额外 KV 读，
 * 从而掩盖问题。为了精确隔离 getJwtSecret 自身的缓存行为，本测试在每次调用时
 * 传入**不同的 env 对象**（令底层绑定缓存无法命中），确保观测到的是
 * getJwtSecret 自己的缓存效果。
 */

const JWT_SECRET_KV_KEY = "openlist_jwt_secret"
const STRONG_SECRET = "a".repeat(48)

/** 构造带读取计数的 KV 绑定（每次新建，绑定到不同的 env 上）。 */
function createCountingKv(
  seed: Record<string, string>,
  stats: { get: number; put: number },
) {
  const data = new Map<string, string>(Object.entries(seed))
  return {
    async get(key: string) {
      stats.get++
      return data.has(key) ? data.get(key)! : null
    },
    async put(key: string, value: string) {
      stats.put++
      data.set(key, value)
    },
  }
}

test("getJwtSecret: KV 命中后应缓存，后续调用不再回源 KV", async () => {
  __resetDbCacheForTest()
  resetJwtSecretCache()

  const stats = { get: 0, put: 0 }
  const seed = { [JWT_SECRET_KV_KEY]: STRONG_SECRET }

  // 每次传入全新的 env 对象，使底层 getKvBinding 的按 env 缓存失效，
  // 从而单独观测 getJwtSecret 自身的缓存能力。
  const first = await getJwtSecret({
    env: { KV: createCountingKv(seed, stats) },
  })
  assert.equal(first, STRONG_SECRET)
  const readsAfterFirst = stats.get
  assert.ok(readsAfterFirst >= 1, "首次调用必须回源 KV")

  const second = await getJwtSecret({
    env: { KV: createCountingKv(seed, stats) },
  })
  const third = await getJwtSecret({
    env: { KV: createCountingKv(seed, stats) },
  })

  assert.equal(second, STRONG_SECRET)
  assert.equal(third, STRONG_SECRET)
  assert.equal(
    stats.get,
    readsAfterFirst,
    "getJwtSecret 自身命中缓存后不得再回源 KV（修复前此处会 +2 次）",
  )
})

test("getJwtSecret: resetJwtSecretCache 后重新回源（支持令牌全失效）", async () => {
  __resetDbCacheForTest()
  resetJwtSecretCache()

  const stats = { get: 0, put: 0 }
  const seed = { [JWT_SECRET_KV_KEY]: STRONG_SECRET }

  await getJwtSecret({ env: { KV: createCountingKv(seed, stats) } })
  const before = stats.get

  // 模拟 reset_token：清缓存后必须重新回源，使旧 token 全部失效。
  resetJwtSecretCache()
  const again = await getJwtSecret({
    env: { KV: createCountingKv(seed, stats) },
  })

  assert.equal(again, STRONG_SECRET)
  assert.ok(stats.get > before, "清缓存后必须重新回源 KV")
})

test("getJwtSecret: env.JWT_SECRET 优先级最高且不读 KV", async () => {
  __resetDbCacheForTest()
  resetJwtSecretCache()

  const stats = { get: 0, put: 0 }
  const envSecret = "b".repeat(40)
  const env: any = {
    KV: createCountingKv({}, stats),
    JWT_SECRET: envSecret,
  }

  const secret = await getJwtSecret({ env })
  assert.equal(secret, envSecret)
  assert.equal(stats.get, 0, "配置了 env.JWT_SECRET 时不应读取 KV")
})
