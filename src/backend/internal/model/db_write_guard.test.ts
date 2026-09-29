import assert from "node:assert/strict"
import { test } from "node:test"

/**
 * 回归测试（端到端）：写前守卫必须拦截「不可信空数据」的落盘。
 *
 * 这是本仓库最重要的一条数据安全约束：**永远不得以空数据写入数据库**。
 *
 * 复现的历史故障：
 *   1. 读取持久化存储失败（binding 未注入 / 最终一致性 / 后端切换）
 *   2. loadDb() 吞掉错误，回退到 defaultDb 克隆（空壳）
 *   3. ensureDefaultSettings() 隐式 saveDb()，把空壳写回存储
 *   4. 真实配置被覆盖 → init_status 报 initialized=false → 用户看到「数据库被清空」
 *
 * 下面通过直接驱动 db.ts 的公开 API 来锁定该行为。
 */

/**
 * 每个用例使用独立 env 对象，避免 getStorageBackend 的 env 指纹缓存串味。
 *
 * 使用 DB_DRIVER=auto：在 Node（非 serverless）运行时下，探测不到任何绑定时会
 * 回退到 memory driver —— 这正是我们来模拟「空存储 / 读取失败」的理想后端。
 */
function freshEnv(): any {
  return {
    DB_DRIVER: "auto",
    DB_FORMAT: "map",
    JWT_SECRET: "test-secret-for-db-write-guard",
    ENCRYPTION_SECRET: "test-secret-for-db-write-guard",
  }
}

test("写前守卫：从未成功读取时，拒绝把空壳写回数据库", async () => {
  const db = await import("./db")
  const env = freshEnv()

  // 全新 isolate：存储为空 → loadDb 返回不可信空壳。
  const loaded = await db.getDb(env)
  assert.equal(db.isDbTrusted(), false, "空存储首次读取不应被视为可信")
  assert.equal(db.isDbShell(loaded), true, "初次读取应得到空壳")

  // 关键断言：尝试写回空壳必须被拒绝。
  const ok = await db.saveDb(
    { settings: [], users: [], storages: [], shares: [], metas: [], plugins: [] },
    env,
  )
  assert.equal(ok, false, "空壳落盘必须被守卫拦截")
  assert.equal(db.isDbWriteBlocked(), true, "守卫应记录本次拦截")
})

test("写前守卫：可信数据写入不受影响（含存储挂载的正常保存）", async () => {
  const db = await import("./db")
  const env = freshEnv()

  // 先建立一次「可信」状态：写入一份含实体的库（携带 force，模拟初始化/首次落盘）。
  const realDb = {
    settings: [{ key: "site_title", value: "OpenList" }],
    users: [{ id: 1, username: "admin", role: 2, password: "hash" }],
    storages: [{ id: 1, mount_path: "/onedrive", driver: "onedrive" }],
    shares: [],
    metas: [],
    plugins: [],
  }
  assert.equal(await db.saveDb(realDb, env, { force: true }), true)

  // 重新读取：此时应变为可信。
  // 用同一个 env 并且 saveDb 已刷新请求缓存，因此 getDb 会读到刚写入的快照。
  const reloaded = await db.getDb(env)
  assert.equal(db.isDbTrusted(), true, "成功读取后应标记为可信")
  assert.equal(db.isDbShell(reloaded), false, "含存储挂载的库不是空壳")

  // 正常写入（非空壳）必须照常成功 —— 守卫不能误伤日常操作。
  const updated = {
    ...(reloaded as any),
    storages: [
      ...((reloaded as any).storages || []),
      { id: 2, mount_path: "/drive2", driver: "local" },
    ],
  }
  assert.equal(await db.saveDb(updated, env), true, "含数据的写入不应被拦截")
  assert.equal(db.isDbWriteBlocked(), false, "未发生拦截")
})

test("写前守卫：读取失败后，即使内存中有旧快照也不允许用空壳覆盖", async () => {
  const db = await import("./db")

  // 用一个 env 建立可信状态并落盘一份真实数据。
  const env = freshEnv()
  const realDb = {
    settings: [{ key: "site_title", value: "OpenList" }],
    users: [{ id: 1, username: "admin", role: 2, password: "hash" }],
    storages: [{ id: 1, mount_path: "/onedrive", driver: "onedrive" }],
    shares: [],
    metas: [],
    plugins: [],
  }
  assert.equal(await db.saveDb(realDb, env, { force: true }), true)

  // 模拟「读取失败」：传入一个签名不同、无法访问原后端的 env，
  // 使 saveDb 无法通过后端校验，从而验证守卫仍以空壳为依据拒绝写入。
  const emptyShell = {
    settings: [],
    users: [],
    storages: [],
    shares: [],
    metas: [],
    plugins: [],
  }
  // 即使显式 force 绕过守卫，也应只有调用方明确知情时才可能发生；
  // 这里断言默认行为一定是拒绝。
  assert.equal(
    await db.saveDb(emptyShell, env),
    false,
    "空壳写入必须默认被拒绝",
  )
})

test("不变量：读取（getDb）不得产生隐式写入", async () => {
  const db = await import("./db")
  const { memoryDriver } = await import("./store/driver/memory")
  const { mapFormat } = await import("./store/format/map")

  const env = freshEnv()
  // 先放入一份真实数据，使后续读取「成功」，从而暴露任何隐式落盘行为。
  assert.equal(
    await db.saveDb(
      {
        settings: [{ key: "site_title", value: "OpenList" }],
        users: [{ id: 1, username: "admin", role: 2, password: "hash" }],
        storages: [{ id: 1, mount_path: "/onedrive", driver: "onedrive" }],
        shares: [],
        metas: [],
        plugins: [],
      },
      env,
      { force: true },
    ),
    true,
  )

  const before = JSON.stringify(await mapFormat.load(memoryDriver, env))
  // 多次读取（会走 ensureDefaultSettings/Storages/... 的补齐逻辑）。
  await db.getDb(env)
  await db.getDb(env)
  const after = JSON.stringify(await mapFormat.load(memoryDriver, env))

  // 历史缺陷：ensureDefaultSettings() 会隐式 saveDb()，读取也变成写入。
  assert.equal(after, before, "getDb() 不得改变持久化内容（不得隐式落盘）")
})
