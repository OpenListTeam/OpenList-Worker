import assert from "node:assert/strict"
import { test } from "node:test"

/**
 * 缓存模块回归测试（文件树缓存 / 下载链接缓存）。
 *
 * 锁定以下契约：
 *   1. 默认只向数据库启用（CACHE_DRIVER 缺省 → `db`）；KV/Blob 等专用后端
 *      必须显式配置，未配置时绝不启用；
 *   2. 开关语义：CACHE_ENABLED / CACHE_FILE_TREE / CACHE_DOWNLOAD_LINK；
 *   3. 键名对 KV 合法（EdgeOne 只接受 [A-Za-z0-9_]），且超长路径被确定性压缩；
 *   4. 文件树缓存命中时返回副本（避免调用方就地修改污染缓存）；
 *   5. 过期条目视为未命中；
 *   6. 下载链接缓存只缓存「确实拿到直链的文件」，目录 / 空直链不缓存；
 *   7. clearCache 能按存储 id 过滤，避免 storages_1_ 误伤 storages_10_。
 *
 * 测试通过 __setCacheDriversForTest 注入内存假驱动，完全不依赖真实存储后端。
 */

const mod = await import("./index")
const {
  buildCacheKey,
  cacheGetEnvelope,
  cacheSetEnvelope,
  clearCache,
  encodeCachePathSegment,
  expandToInvalidationPaths,
  getCacheConfig,
  getCachedFileTree,
  getCachedLink,
  parseCacheBackends,
  setCachedFileTree,
  setCachedLink,
  storageIdFromCacheKey,
  __resetCacheConfigForTest,
  __resetCacheStoreForTest,
  __setCacheDriversForTest,
} = mod as any

/** 内存假驱动（满足 Driver 接口的键值部分）。 */
function createFakeDriver(name = "fake") {
  const store = new Map<string, string>()
  return {
    name,
    __store: store,
    async isAvailable() {
      return true
    },
    async init() {},
    async get(key: string) {
      return store.get(key) ?? null
    },
    async put(key: string, value: string) {
      store.set(key, value)
    },
    async delete(key: string) {
      store.delete(key)
    },
    async list(prefix: string) {
      return [...store.keys()].filter((k) => k.startsWith(prefix))
    },
    async health() {
      return { connected: true }
    },
  }
}

function setup(driver: any = createFakeDriver()) {
  __resetCacheConfigForTest()
  __resetCacheStoreForTest()
  __setCacheDriversForTest(async () => [driver])
  return driver
}

const SAMPLE_ITEMS = [
  { name: "a.txt", size: 1, is_dir: false, modified: "2026-01-01", sign: "", type: 0 },
  { name: "sub", size: 0, is_dir: true, modified: "2026-01-01", sign: "", type: 1 },
]

// ───────────────────────── 配置 ─────────────────────────

test("配置：默认只向数据库启用", () => {
  __resetCacheConfigForTest()
  const cfg = getCacheConfig({})
  assert.equal(cfg.enabled, true)
  assert.deepEqual(cfg.backends, ["db"])
  assert.equal(cfg.fileTree, true)
  assert.equal(cfg.downloadLink, true)
  // 默认 TTL：文件树跟随存储级 cache_expiration（0 = 不覆盖）
  assert.equal(cfg.ttlMinutes, 0)
  assert.equal(cfg.linkTtlMinutes, 5)
})

test("配置：CACHE_DRIVER 解析（db / kv / 多后端 / none / 未知值）", () => {
  assert.deepEqual(parseCacheBackends(""), ["db"])
  assert.deepEqual(parseCacheBackends("kv"), ["kv"])
  assert.deepEqual(parseCacheBackends("db,kv"), ["db", "kv"])
  assert.deepEqual(parseCacheBackends("KV , BLOB"), ["kv", "blob"])
  assert.deepEqual(parseCacheBackends("none"), [])
  // 未知值被忽略，且不会把列表清空（回退 db）
  assert.deepEqual(parseCacheBackends("nope"), ["db"])
  assert.deepEqual(parseCacheBackends("nope,kv"), ["kv"])
})

test("配置：开关与 TTL 读取", () => {
  __resetCacheConfigForTest()
  const cfg = getCacheConfig({
    CACHE_ENABLED: "false",
    CACHE_FILE_TREE: "0",
    CACHE_DOWNLOAD_LINK: "off",
    CACHE_TTL: "12",
    CACHE_LINK_TTL: "1",
    CACHE_DRIVER: "db,kv",
  })
  assert.equal(cfg.enabled, false)
  assert.equal(cfg.fileTree, false)
  assert.equal(cfg.downloadLink, false)
  assert.equal(cfg.ttlMinutes, 12)
  assert.equal(cfg.linkTtlMinutes, 1)
  assert.deepEqual(cfg.backends, ["db", "kv"])
})

test("配置：CACHE_DRIVER=none 时整体关闭", () => {
  __resetCacheConfigForTest()
  const cfg = getCacheConfig({ CACHE_DRIVER: "none" })
  assert.equal(cfg.enabled, false)
  assert.deepEqual(cfg.backends, [])
})

test("配置：默认排除纯本地计算型驱动", () => {
  __resetCacheConfigForTest()
  const cfg = getCacheConfig({})
  assert.ok(cfg.excludeDrivers.has("virtual"))
  assert.ok(cfg.excludeDrivers.has("alias"))
  assert.ok(cfg.excludeDrivers.has("urltree"))
})

// ───────────────────────── 键名编码 ─────────────────────────

test("键名：KV 合法字符集 + 存储 id 可解析", () => {
  const key = buildCacheKey("ft", 1, "/a b/c%d.txt", "openlist_cache")
  assert.match(key, /^[A-Za-z0-9_]+$/, "键名必须只含 [A-Za-z0-9_]")
  assert.equal(storageIdFromCacheKey(key, "ft", "openlist_cache"), "1")
  // 同输入必得同键（失效时才能算出一致的键）
  assert.equal(key, buildCacheKey("ft", 1, "/a b/c%d.txt", "openlist_cache"))
})

test("键名：storageId 解析不受前缀内下划线影响", () => {
  const key = buildCacheKey("ln", 42, "/x", "my_cache_prefix")
  assert.equal(storageIdFromCacheKey(key, "ln", "my_cache_prefix"), "42")
  // kind 不同不会串味
  assert.equal(storageIdFromCacheKey(key, "ft", "my_cache_prefix"), null)
})

test("键名：超长路径被确定性压缩且仍在合法字符集内", () => {
  const long = "/" + Array.from({ length: 60 }, (_, i) => `dir${i}`).join("/")
  const a = encodeCachePathSegment(long)
  const b = encodeCachePathSegment(long)
  assert.equal(a, b)
  assert.ok(a.length <= 180, "长路径应被压缩")
  assert.match(a, /^[A-Za-z0-9_]+$/)
  // 不同长路径不应碰撞
  assert.notEqual(a, encodeCachePathSegment(long + "x"))
})

test("失效路径展开：包含父目录", () => {
  assert.deepEqual(expandToInvalidationPaths("/a/b/c.txt").sort(), ["/a/b", "/a/b/c.txt"])
  assert.deepEqual(expandToInvalidationPaths("/x").sort(), ["/", "/x"])
})

// ───────────────────────── 存储层 ─────────────────────────

test("存储层：写入后可读出，过期条目视为未命中并被清理", async () => {
  const driver = setup()
  const env = { CACHE_DRIVER: "db" }

  await cacheSetEnvelope("k1", { hello: "world" }, 60_000, env)
  const hit = await cacheGetEnvelope("k1", env)
  assert.deepEqual(hit?.v, { hello: "world" })

  // 手工写入一条已过期条目
  await driver.put("k2", JSON.stringify({ v: 1, ts: 1, exp: Date.now() - 1000 }))
  assert.equal(await cacheGetEnvelope("k2", env), null)
  // 惰性清理是 fire-and-forget，等一个 tick 再断言
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(await driver.get("k2"), null, "过期条目应被惰性清理")
})

test("存储层：ttl<=0 时不写入", async () => {
  const driver = setup()
  await cacheSetEnvelope("k", 1, 0, {})
  assert.equal(await driver.get("k"), null)
})

// ───────────────────────── 文件树缓存 ─────────────────────────

test("文件树缓存：命中时返回深拷贝副本", async () => {
  setup()
  const env = { CACHE_DRIVER: "db", CACHE_TTL: "30" }
  const target = { storage: { id: 1, driver: "fake" }, cleanPath: "/a" }

  await setCachedFileTree(target, SAMPLE_ITEMS as any, env)
  const hit = await getCachedFileTree(target, env)
  assert.ok(hit)
  assert.equal(hit!.length, 2)
  assert.equal(hit![0].name, "a.txt")

  // 必须是副本：就地修改不能回写缓存
  assert.notEqual(hit, SAMPLE_ITEMS)
  assert.notEqual(hit![0], SAMPLE_ITEMS[0])
  hit![0].name = "MUTATED"
  const again = await getCachedFileTree(target, env)
  assert.equal(again![0].name, "a.txt")
})

test("文件树缓存：空目录也会被缓存（避免反复击穿存储）", async () => {
  setup()
  const env = { CACHE_DRIVER: "db", CACHE_TTL: "30" }
  const target = { storage: { id: 7, driver: "fake" }, cleanPath: "/empty" }
  await setCachedFileTree(target, [], env)
  const hit = await getCachedFileTree(target, env)
  assert.ok(Array.isArray(hit))
  assert.equal(hit!.length, 0)
})

test("文件树缓存：cache_expiration=0（不缓存）时读写都被跳过", async () => {
  const driver = setup()
  const env = { CACHE_DRIVER: "db" }
  const target = {
    storage: { id: 2, driver: "fake", cache_expiration: 0 },
    cleanPath: "/nocache",
  }
  await setCachedFileTree(target, SAMPLE_ITEMS as any, env)
  assert.equal(await getCachedFileTree(target, env), null)
  assert.equal(driver.__store.size, 0, "不应产生任何缓存键")
})

test("文件树缓存：排除名单中的驱动不缓存", async () => {
  const driver = setup()
  const env = { CACHE_DRIVER: "db", CACHE_TTL: "30" }
  const target = { storage: { id: 3, driver: "virtual" }, cleanPath: "/v" }
  await setCachedFileTree(target, SAMPLE_ITEMS as any, env)
  assert.equal(await getCachedFileTree(target, env), null)
  assert.equal(driver.__store.size, 0)
})

test("文件树缓存：CACHE_FILE_TREE=false 时关闭", async () => {
  const driver = setup()
  const env = { CACHE_DRIVER: "db", CACHE_FILE_TREE: "false", CACHE_TTL: "30" }
  const target = { storage: { id: 4, driver: "fake" }, cleanPath: "/a" }
  await setCachedFileTree(target, SAMPLE_ITEMS as any, env)
  assert.equal(await getCachedFileTree(target, env), null)
  assert.equal(driver.__store.size, 0)
})

test("文件树缓存：custom_cache_policies 命中 0 分钟即不缓存", async () => {
  const driver = setup()
  const env = { CACHE_DRIVER: "db" }
  const target = {
    storage: {
      id: 5,
      driver: "fake",
      cache_expiration: 30,
      custom_cache_policies: JSON.stringify([
        { path: "/private/*", cache_expiration: 0 },
      ]),
    },
    cleanPath: "/private/x",
  }
  await setCachedFileTree(target, SAMPLE_ITEMS as any, env)
  assert.equal(await getCachedFileTree(target, env), null)
  assert.equal(driver.__store.size, 0)
})

// ───────────────────────── 下载链接缓存 ─────────────────────────

const FILE_ITEM = {
  name: "movie.mp4",
  size: 100,
  is_dir: false,
  modified: "2026-01-01",
  sign: "",
  type: 2,
  raw_url: "https://cdn.example.com/movie.mp4?sig=abc",
}

test("下载链接缓存：缓存拿到直链的文件，并返回副本", async () => {
  setup()
  const env = { CACHE_DRIVER: "db" }
  const target = { storage: { id: 10, driver: "fake" }, cleanPath: "/movie.mp4" }

  await setCachedLink(target, FILE_ITEM as any, env)
  const hit = await getCachedLink(target, env)
  assert.ok(hit)
  assert.equal(hit!.raw_url, FILE_ITEM.raw_url)
  assert.notEqual(hit, FILE_ITEM)

  hit!.raw_url = "MUTATED"
  const again = await getCachedLink(target, env)
  assert.equal(again!.raw_url, FILE_ITEM.raw_url)
})

test("下载链接缓存：目录 / 空直链不缓存", async () => {
  const driver = setup()
  const env = { CACHE_DRIVER: "db" }
  const dirTarget = { storage: { id: 11, driver: "fake" }, cleanPath: "/dir" }
  const emptyTarget = { storage: { id: 11, driver: "fake" }, cleanPath: "/empty" }

  await setCachedLink(dirTarget, { ...FILE_ITEM, is_dir: true } as any, env)
  await setCachedLink(emptyTarget, { ...FILE_ITEM, raw_url: "" } as any, env)

  assert.equal(await getCachedLink(dirTarget, env), null)
  assert.equal(await getCachedLink(emptyTarget, env), null)
  assert.equal(driver.__store.size, 0)
})

test("下载链接缓存：CACHE_LINK_TTL=0 时关闭", async () => {
  const driver = setup()
  const env = { CACHE_DRIVER: "db", CACHE_LINK_TTL: "0" }
  const target = { storage: { id: 12, driver: "fake" }, cleanPath: "/movie.mp4" }
  await setCachedLink(target, FILE_ITEM as any, env)
  assert.equal(await getCachedLink(target, env), null)
  assert.equal(driver.__store.size, 0)
})

// ───────────────────────── 清理 ─────────────────────────

test("clearCache：按存储 id 过滤，不误伤相邻 id", async () => {
  setup()
  const env = { CACHE_DRIVER: "db", CACHE_TTL: "30" }
  await setCachedFileTree(
    { storage: { id: 1, driver: "fake" }, cleanPath: "/a" },
    SAMPLE_ITEMS as any,
    env,
  )
  await setCachedFileTree(
    { storage: { id: 10, driver: "fake" }, cleanPath: "/a" },
    SAMPLE_ITEMS as any,
    env,
  )
  await setCachedLink(
    { storage: { id: 1, driver: "fake" }, cleanPath: "/movie.mp4" },
    FILE_ITEM as any,
    env,
  )

  const removed = await clearCache(env, { storageId: 1 })
  assert.equal(removed, 2, "只应清掉 storage 1 的两条缓存")

  // storage 10 的文件树缓存仍在
  const survivor = await getCachedFileTree(
    { storage: { id: 10, driver: "fake" }, cleanPath: "/a" },
    env,
  )
  assert.ok(survivor)

  const rest = await clearCache(env, {})
  assert.equal(rest, 1)
})

test("clearCache：按 kind 只清一类", async () => {
  setup()
  const env = { CACHE_DRIVER: "db", CACHE_TTL: "30" }
  await setCachedFileTree(
    { storage: { id: 1, driver: "fake" }, cleanPath: "/a" },
    SAMPLE_ITEMS as any,
    env,
  )
  await setCachedLink(
    { storage: { id: 1, driver: "fake" }, cleanPath: "/movie.mp4" },
    FILE_ITEM as any,
    env,
  )
  assert.equal(await clearCache(env, { kind: "ft" }), 1)
  assert.ok(
    await getCachedLink(
      { storage: { id: 1, driver: "fake" }, cleanPath: "/movie.mp4" },
      env,
    ),
  )
})
