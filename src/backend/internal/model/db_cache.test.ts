import assert from "node:assert/strict"
import { test } from "node:test"

/**
 * getDb() 缓存回归测试（性能事故防护）
 *
 * 背景：曾出现过一次线上性能事故 —— getDb() 在**无参调用**时直接
 * `return loadDb(envCtx)`，绕过了 dbCache / dbInflight 两个缓存。
 * 而仓库里有约 30 处无参调用（storage.ts 的驱动回调、getSettings 等五个
 * getter），导致一次 WebDAV PROPFIND 或一次页面加载会触发数十次「完整冷加载」：
 * 后端全量读取 + JSON.parse + 逐字段 AES 解密。KV 与 D1 两种后端因此被同时
 * 放大数十倍而变慢。
 *
 * 本文件锁定修复后的行为：
 *  1. 重复的无参 getDb() 不得重复触发后端 load（应命中缓存）；
 *  2. 并发的无参 getDb() 必须合并为一次 load（in-flight 去重）；
 *  3. saveDb() 之后的无参 getDb() 必须能观察到最新写入（写后读一致）；
 *  4. 有参调用与无参调用共享同一份缓存，不应各自重复加载。
 *
 * 说明：db.ts 内部使用模块级缓存（TTL 1s），因此测试之间通过
 * `__resetDbCacheForTest()` 清理状态，避免相互干扰。
 */

// 动态导入以避免测试文件顶层就初始化 store 后端探测。
const mod = await import("./db")

const {
  getDb,
  saveDb,
  setEnvCtx,
  __resetDbCacheForTest,
  __setStoreBackendLoaderForTest,
} = mod as any

/** 统计 load 调用次数的伪后端。 */
function createCountingBackend(initial: any) {
  let data = initial ? JSON.parse(JSON.stringify(initial)) : null
  const stats = { load: 0, save: 0 }
  const backend = {
    name: "counting",
    isConfigured: async () => true,
    async load() {
      stats.load++
      // 模拟真实后端的网络 + 解析延迟，让并发窗口真实存在。
      await new Promise((r) => setTimeout(r, 10))
      return data ? JSON.parse(JSON.stringify(data)) : null
    },
    async save(next: any) {
      stats.save++
      data = JSON.parse(JSON.stringify(next))
      return true
    },
  }
  return { backend, stats, getData: () => data }
}

const SAMPLE = {
  settings: [{ key: "site_title", value: "OpenList" }],
  storages: [],
  users: [],
  shares: [],
  metas: [],
  plugins: [],
}

test("getDb: 重复无参调用只触发一次后端 load（缓存命中）", async () => {
  __resetDbCacheForTest()
  const { backend, stats } = createCountingBackend(SAMPLE)
  __setStoreBackendLoaderForTest(async () => backend)

  const env = { DB_DRIVER: "counting" }
  setEnvCtx(env)

  const a = await getDb()
  const b = await getDb()
  const c = await getDb()

  assert.equal(stats.load, 1, "连续无参 getDb() 应命中缓存，只 load 一次")
  assert.equal(a, b)
  assert.equal(b, c)

  // 传入同一 env 也复用同一缓存，不应额外 load。
  const d = await getDb(env)
  assert.equal(stats.load, 1, "有参调用应与无参调用共享缓存")
  assert.equal(d, a)
})

test("getDb: 并发无参调用合并为一次 load（in-flight 去重）", async () => {
  __resetDbCacheForTest()
  const { backend, stats } = createCountingBackend(SAMPLE)
  __setStoreBackendLoaderForTest(async () => backend)

  setEnvCtx({ DB_DRIVER: "counting" })

  // 同时发起（不 await），模拟一次请求内多个模块并行取 DB。
  const results = await Promise.all([
    getDb(),
    getDb(),
    getDb(),
    getDb(),
    getDb(),
  ])

  assert.equal(stats.load, 1, "并发无参 getDb() 应合并为一次 load")
  for (const r of results) assert.equal(r, results[0])
})

test("getDb: saveDb 后无参读取可观察到最新写入（写后读一致）", async () => {
  __resetDbCacheForTest()
  const { backend, stats, getData } = createCountingBackend(SAMPLE)
  __setStoreBackendLoaderForTest(async () => backend)

  const env = { DB_DRIVER: "counting" }
  setEnvCtx(env)

  await getDb()
  assert.equal(stats.load, 1)

  const next = { ...SAMPLE, settings: [{ key: "site_title", value: "Changed" }] }
  await saveDb(next)
  // 注意：saveDb 内部可能同时写入加密密钥等辅助数据，因此不断言 save 恰好为 1，
  // 只要求确实发生过持久化写入。
  assert.ok(stats.save >= 1, "saveDb 应触发后端持久化")

  // 注意：这里不等待 TTL 过期，验证的是 saveDb 主动刷新缓存。
  const after = await getDb()
  assert.equal(stats.load, 1, "saveDb 应刷新缓存，避免再触发一次 load")
  assert.equal(after.settings[0].value, "Changed")
  assert.equal(getData().settings[0].value, "Changed")
})

test("saveDb: sensitive fields use the low-CPU v2 envelope and remain readable", async () => {
  __resetDbCacheForTest()
  const { backend, getData } = createCountingBackend({
    ...SAMPLE,
    users: [{ id: 1, username: "admin", password: "password-hash" }],
    // 注意：storage 必须带 driver / mount_path —— 否则会被 ensureDefaultStorages()
    // 当作损坏条目过滤掉（storages 变为空数组），断言在 storages[0] 上就会炸。
    storages: [
      {
        id: 1,
        driver: "local",
        mount_path: "/drive",
        addition: '{"refresh_token":"secret"}',
      },
    ],
  })
  __setStoreBackendLoaderForTest(async () => backend)

  const env = {
    DB_DRIVER: "counting",
    JWT_SECRET: "test-config-encryption-secret",
    // 加密是可选的：默认 DB_CIPHER=none（明文落盘），本用例显式开启加密，
    // 以锁定 #69 的低 CPU v2 envelope 行为（见下方「默认不加密」用例）。
    DB_CIPHER: "aes-256-gcm",
  }
  const plain = await getDb(env)
  await saveDb(plain, env)

  const persisted = getData()
  assert.match(persisted.storages[0].addition, /^enc:v2:/)
  assert.match(persisted.users[0].password, /^enc:v2:/)

  __resetDbCacheForTest()
  const reloadedBackend = createCountingBackend(persisted).backend
  __setStoreBackendLoaderForTest(async () => reloadedBackend)
  const reloaded = await getDb(env)
  assert.equal(reloaded.storages[0].addition, plain.storages[0].addition)
  assert.equal(reloaded.users[0].password, plain.users[0].password)
})

test("saveDb: without DB_CIPHER sensitive fields are written as plaintext", async () => {
  __resetDbCacheForTest()
  const { backend, getData } = createCountingBackend({
    ...SAMPLE,
    users: [{ id: 1, username: "admin", password: "password-hash" }],
    storages: [
      {
        id: 1,
        driver: "local",
        mount_path: "/drive",
        addition: '{"refresh_token":"secret"}',
      },
    ],
  })
  __setStoreBackendLoaderForTest(async () => backend)

  // 不配置 DB_CIPHER（默认 none）：即便提供了 JWT_SECRET 也不加密数据库字段。
  const env = {
    DB_DRIVER: "counting",
    JWT_SECRET: "test-config-encryption-secret",
  }
  const plain = await getDb(env)
  await saveDb(plain, env)

  const persisted = getData()
  assert.equal(persisted.storages[0].addition, '{"refresh_token":"secret"}')
  assert.equal(persisted.users[0].password, "password-hash")
})

test("getDb: 五个无参 getter 复用同一份缓存快照", async () => {
  __resetDbCacheForTest()
  const { backend, stats } = createCountingBackend({
    ...SAMPLE,
    users: [{ id: 1, username: "admin" }],
  })
  __setStoreBackendLoaderForTest(async () => backend)

  setEnvCtx({ DB_DRIVER: "counting" })

  // getSettings/getUsers/getStorages/getMetas/getPlugins 均为无参调用 getDb()。
  // 本用例的核心断言是 load 次数：修复前每个 getter 都各触发一次完整冷加载。
  const [settings, users, storages, metas, plugins] = await Promise.all([
    mod.getSettings(),
    mod.getUsers(),
    mod.getStorages(),
    mod.getMetas(),
    mod.getPlugins(),
  ])

  assert.equal(
    stats.load,
    1,
    "五个无参 getter 并发调用应合并为一次 load（修复前为 5 次）",
  )
  // getSettings() 返回「key -> value」的扁平对象，而非数组。
  assert.equal(settings.site_title, "OpenList")
  assert.equal(users[0].username, "admin")
  assert.ok(Array.isArray(storages))
  assert.ok(Array.isArray(metas))
  assert.ok(Array.isArray(plugins))
})

test("getDb: TTL 过期后允许重新加载（缓存不是永久固化）", async () => {
  __resetDbCacheForTest()
  const { backend, stats } = createCountingBackend(SAMPLE)
  __setStoreBackendLoaderForTest(async () => backend)

  setEnvCtx({ DB_DRIVER: "counting" })

  await getDb()
  assert.equal(stats.load, 1)

  // 等待 TTL（1s）过期，模拟跨请求/长时间空闲后的重新加载。
  await new Promise((r) => setTimeout(r, 1100))
  await getDb()
  assert.equal(stats.load, 2, "TTL 过期后应重新 load，以获取其他实例的写入")
})

test("getDb: __resetDbCacheForTest 同时复位写前守卫状态", async () => {
  __resetDbCacheForTest()
  const { backend } = createCountingBackend(SAMPLE)
  __setStoreBackendLoaderForTest(async () => backend)

  const env = { DB_DRIVER: "counting" }
  setEnvCtx(env)

  await getDb()
  assert.equal(mod.isDbTrusted(), true, "成功加载后应标记为内存库可信")

  // 写回一个空壳 → 必被守卫拦截，并留下 dbWriteBlocked 标记。
  const blocked = await saveDb({
    settings: [],
    users: [],
    storages: [],
    shares: [],
    metas: [],
    plugins: [],
  })
  assert.equal(blocked, false, "空壳写入必须被拒绝")
  assert.equal(mod.isDbWriteBlocked(), true, "守卫应记录本次拦截")

  // 关键断言：reset 之后这些模块级状态必须回到初始态，否则用例结果会取决于
  // 执行顺序（db_write_guard.test.ts 直接断言 isDbTrusted / isDbWriteBlocked）。
  __resetDbCacheForTest()
  assert.equal(mod.isDbTrusted(), false, "reset 后应回到「不可信」")
  assert.equal(mod.isDbWriteBlocked(), false, "reset 后应清除拦截标记")
  assert.equal(mod.getDbLoadError(), null, "reset 后不应残留读取错误")
})
