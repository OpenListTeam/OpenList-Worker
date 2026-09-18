import assert from "node:assert/strict"
import { test } from "node:test"
import { __resetDbCacheForTest } from "../internal/model/db"
import { getJwtSecret, resetJwtSecretCache } from "./middlewares"

/**
 * getJwtSecret() 缓存回归测试
 *
 * 背景 1（性能）：getJwtSecret 的「持久化密钥」分支曾经只 `return kvSecret`
 * 而不写缓存，导致该函数**自身**没有缓存：只要底层读取没有被其它层记忆化，
 * 每次调用都会重新回源。而它一次请求内会被
 * getUserFromContext / csrfProtection / checkAdminAuth 调用 2-4 次。
 *
 * 背景 2（隔离）：缓存必须是**按 env 对象**的。env 决定「去哪个后端读密钥」，
 * 单一进程级缓存会把先读到的密钥发给另一套环境，导致跨环境 token 互相可验证。
 * （Go 版是单进程单部署、密钥在启动时由 conf.Conf.JwtSecret 一次确定，不存在
 * 该问题；TS 版必须按 env 隔离才能保持等价语义。）
 *
 * 说明：底层 getKvBinding 也有按 env 身份的结果缓存，因此复用同一个 env 对象时，
 * 即使 getJwtSecret 自身不缓存也可能不产生额外读取。本文件直接用「KV 绑定上的
 * 读取计数」观测真实回源次数，并复用同一个 env 对象——这正是生产形态：
 * 一次请求 = 一个 env 对象。
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

test("getJwtSecret: 同一 env 命中缓存后不再回源（修复前每次调用都回源）", async () => {
  __resetDbCacheForTest()
  resetJwtSecretCache()

  const stats = { get: 0, put: 0 }
  const seed = { [JWT_SECRET_KV_KEY]: STRONG_SECRET }
  // 生产形态：一次请求 = 一个 env 对象，同一对象内可能被调用多次。
  const env = { KV: createCountingKv(seed, stats) }

  const first = await getJwtSecret({ env })
  assert.equal(first, STRONG_SECRET)
  const readsAfterFirst = stats.get
  assert.ok(readsAfterFirst >= 1, "首次调用必须回源存储")

  const second = await getJwtSecret({ env })
  const third = await getJwtSecret({ env })

  assert.equal(second, STRONG_SECRET)
  assert.equal(third, STRONG_SECRET)
  assert.equal(
    stats.get,
    readsAfterFirst,
    "同一 env 命中缓存后不得再回源（修复前此处会 +2 次）",
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

test("getJwtSecret: 不同 env 各自使用自己后端的密钥（不得串用）", async () => {
  __resetDbCacheForTest()
  resetJwtSecretCache()

  const secretA = "a".repeat(48)
  const secretB = "b".repeat(48)
  const statsA = { get: 0, put: 0 }
  const statsB = { get: 0, put: 0 }
  const envA = { KV: createCountingKv({ [JWT_SECRET_KV_KEY]: secretA }, statsA) }
  const envB = { KV: createCountingKv({ [JWT_SECRET_KV_KEY]: secretB }, statsB) }

  assert.equal(await getJwtSecret({ env: envA }), secretA)
  const readsA = statsA.get

  // 修复前：envB 会拿到 envA 的密钥（进程级单变量缓存）。
  assert.equal(
    await getJwtSecret({ env: envB }),
    secretB,
    "envB 必须拿到自己后端的密钥，不能复用 envA 的",
  )
  assert.ok(statsB.get >= 1, "envB 必须实际回源自己的后端")

  // envA 的缓存也不应被 envB 覆盖。
  assert.equal(await getJwtSecret({ env: envA }), secretA)
  assert.equal(statsA.get, readsA, "envA 仍应命中自己的缓存")
})
