/**
 * 回归测试：请求级存储上下文必须始终携带 `env`。
 *
 * 背景（真实缺陷）：`getStorageRequestContext()` 早期实现在缺少
 * `executionCtx.waitUntil` 时直接返回 `undefined`，把 `env` 一起丢了。
 * 于是缓存解析后端时拿到 `env=undefined` → `getStorageBackend(undefined)`
 * 解析成**内存驱动**，而业务数据仍走全局 env ctx 的持久化后端 —— 缓存与
 * 数据库被静默拆到两个后端：列表看似命中缓存（内容陈旧），但持久层里
 * 一条缓存键都没有、`/cache/status` 计数恒为 0、`/cache/clear` 永远 removed=0。
 *
 * 这里刻意**不传** `app.request()` 的第 4 个参数（executionCtx），
 * 断言缓存仍然落到 `CACHE_DRIVER=db` 解析出的真实后端（KV）上。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import app from "../index"

const JWT_SECRET = "jwt-secret-32-characters-long!!"
const ORIGIN = "http://localhost"
const SANDBOX = process.cwd() + "/.tmp-storage-ctx"
const ROOT = SANDBOX + "/root"

/** 内存 KV 绑定（EdgeOne KV 语义：list -> { keys: [{ key }], complete }) */
function makeKv() {
  const store = new Map<string, string>()
  return {
    store,
    binding: {
      async get(key: string) {
        return store.has(key) ? store.get(key)! : null
      },
      async put(key: string, value: string) {
        store.set(key, value)
      },
      async delete(key: string) {
        store.delete(key)
      },
      async list(opts?: { prefix?: string }) {
        const prefix = opts?.prefix || ""
        return {
          keys: [...store.keys()]
            .filter((k) => k.startsWith(prefix))
            .map((key) => ({ key })),
          complete: true,
        }
      },
    },
  }
}

test("缺少 executionCtx 时，缓存仍必须写入 CACHE_DRIVER=db 指向的真实后端", async () => {
  const kv = makeKv()
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    KV: kv.binding,
    JWT_SECRET,
    ADMIN_PASS: "admin",
    __requestOrigin: ORIGIN,
  }

  rmSync(SANDBOX, { recursive: true, force: true })
  mkdirSync(ROOT + "/sub", { recursive: true })
  writeFileSync(ROOT + "/sub/c.txt", "gamma")

  try {
    const post = (path: string, body: any, token?: string) =>
      // 注意：刻意省略第 4 个参数（executionCtx）
      app.request(
        path,
        {
          method: "POST",
          headers: token
            ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
            : { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        },
        env,
      )

    const login: any = await (await post("/api/auth/login", {
      username: "admin",
      password: "admin",
    })).json()
    const token = login?.data?.token
    assert.ok(token, `login failed: ${JSON.stringify(login)}`)

    const created: any = await (await post(
      "/api/admin/storage/create",
      {
        mount_path: "/ctx",
        driver: "Local",
        addition: JSON.stringify({ root_folder_path: ROOT }),
        order: 0,
      },
      token,
    )).json()
    assert.equal(created?.code, 200, `create storage failed: ${JSON.stringify(created)}`)

    // 首次列目录 → 应回源并写入缓存
    const listed: any = await (await post(
      "/api/fs/list",
      { path: "/ctx/sub", page: 1, per_page: 0 },
      token,
    )).json()
    assert.equal(listed?.code, 200, `list failed: ${JSON.stringify(listed)}`)
    assert.deepEqual(
      (listed?.data?.content || []).map((i: any) => i.name),
      ["c.txt"],
    )

    // 核心断言：缓存键必须出现在 KV 里。
    // 修复前这里恒为空 —— 缓存被静默写进了内存驱动。
    const cacheKeys = [...kv.store.keys()].filter((k) => k.startsWith("openlist_cache_ft_"))
    assert.ok(
      cacheKeys.length >= 1,
      `expected a file-tree cache key in the configured KV backend, got keys: ` +
        JSON.stringify([...kv.store.keys()]),
    )

    // 键名用缓存模块自己的编码函数推导，避免硬编码编码细节
    const { buildCacheKey } = await import("../internal/cache/store")
    const storageId = 1
    const expectedKey = buildCacheKey("ft", storageId, "/ctx/sub", "openlist_cache")
    assert.ok(
      cacheKeys.includes(expectedKey),
      `unexpected cache key: expected ${expectedKey}, got ${JSON.stringify(cacheKeys)}`,
    )

    // 缓存值应为带过期时间的信封
    const raw = kv.store.get(cacheKeys[0])!
    const envelope = JSON.parse(raw)
    assert.ok(Array.isArray(envelope?.v), `cache envelope payload is not an array: ${raw.slice(0, 120)}`)
    assert.ok(typeof envelope?.exp === "number" && envelope.exp > Date.now(), "cache envelope missing future exp")

    // 管理接口应能统计到条目（同样验证 env 透传到了缓存层）
    const status: any = await (
      await app.request("/api/admin/cache/status", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }, env)
    ).json()
    assert.equal(status?.code, 200)
    assert.ok(
      (status?.data?.entries?.file_tree ?? 0) >= 1,
      `cache/status did not count the entry: ${JSON.stringify(status?.data?.entries)}`,
    )
    assert.ok(
      (status?.data?.drivers || []).includes("kv"),
      `cache/status resolved unexpected drivers: ${JSON.stringify(status?.data?.drivers)}`,
    )
  } finally {
    rmSync(SANDBOX, { recursive: true, force: true })
  }
})
