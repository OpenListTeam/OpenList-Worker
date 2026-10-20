import assert from "node:assert/strict"
import { test as nodeTest } from "node:test"
import { Hono } from "hono"
import {
  getDb,
  saveDb,
  __resetDbCacheForTest,
  __setStoreBackendLoaderForTest,
} from "../internal/model/db"
import { getOrInitUsers, verifyUserPassword, hashPasswordSHA256 } from "./auth"
import { isHex64 } from "../pkg/password"
import { userRouter } from "./user"

const env: any = {}
const ADMIN_TOKEN = "ADMIN_STATIC_TOKEN"

// 每个用例独立运行：重置模块级 db 缓存 + 注入一次性内存 store 后端，
// 结束时恢复 process.env.ADMIN_PASS。
// 注意：ADMIN_PASS 是"进程级全局状态"，因此本文件用例必须保持串行
// （concurrency: false，见下方 test 包装）。若未来需要并发，请改为
// 显式依赖注入而非共享 process.env。
const run = async (fn: () => Promise<void>) => {
  const originalAdminPass = process.env.ADMIN_PASS
  try {
    __resetDbCacheForTest()
    delete process.env.ADMIN_PASS
    let stored: any = null
    __setStoreBackendLoaderForTest(async () => ({
      name: "test",
      isConfigured: async () => true,
      load: async () => (stored ? JSON.parse(JSON.stringify(stored)) : null),
      save: async (next: any) => {
        stored = JSON.parse(JSON.stringify(next))
        return true
      },
    }))
    await fn()
  } finally {
    __resetDbCacheForTest()
    if (originalAdminPass === undefined) {
      delete process.env.ADMIN_PASS
    } else {
      process.env.ADMIN_PASS = originalAdminPass
    }
  }
}

const test = (name: string, fn: () => Promise<void>) =>
  nodeTest(name, { concurrency: false }, () => run(fn))

// 显式断言 saveDb 成功，避免"写库失败被掩盖成测试绿灯"。
// force 默认 true：测试数据本就不受生产写入守卫约束（例如
// "持久化空密码管理员"场景），main 分支在此文件统一采用 force。
const seed = async (
  users: any[],
  settings: any[] = [],
  options?: { force?: boolean },
) => {
  assert.equal(
    await saveDb(
      { settings, users, storages: [], shares: [] },
      env,
      { force: true, ...(options || {}) },
    ),
    true,
  )
}

const adminUser = (password: string) => ({
  id: 1,
  username: "admin",
  password,
  role: 2,
  permission: 0,
  base_path: "/",
  disabled: false,
})

const currentAdmin = async (context = env) => {
  const db: any = await getDb(context)
  return db.users.find((u: any) => u.username === "admin")
}

test("Initialization: a fresh deployment stays uninitialized without ADMIN_PASS", async () => {
  await seed([])
  await getOrInitUsers(env)
  const admin = await currentAdmin()
  assert.equal(
    admin,
    undefined,
    "admin must NOT be auto-created before the setup wizard runs",
  )
})

test("Security(F-11): a legacy-format hash is left untouched (no silent reset on upgrade)", async () => {
  // The old code reset any non-64-hex password back to admin/admin — meaning
  // a routine upgrade silently reopened the admin account. It must stay.
  const legacyHash = "pbkdf2:100000:somesalt:deadbeef"
  await seed([adminUser(legacyHash)])
  await getOrInitUsers(env)
  const admin = await currentAdmin()
  assert.equal(
    admin.password,
    legacyHash,
    "a legacy hash must be preserved, never silently reset",
  )
  assert.notEqual(
    admin.password,
    await hashPasswordSHA256("admin"),
    "legacy format must not be treated as a verifiable SHA-256 hash",
  )
})

test("Initialization: an empty admin password stays empty (uninitialized), not a random one", async () => {
  await seed([adminUser("")])
  await getOrInitUsers(env)
  const admin = await currentAdmin()
  assert.equal(
    admin.password,
    "",
    "empty password must stay empty until the setup wizard runs",
  )
})

test("Security(F-11): ADMIN_PASS still forces an explicit reset (to salted double-SHA256)", async () => {
  await seed([adminUser("pbkdf2:100000:somesalt:deadbeef")])
  const envWithPass: any = { ...env, ADMIN_PASS: "operator-chosen" }
  await getOrInitUsers(envWithPass)
  const admin = await currentAdmin(envWithPass)
  assert.ok(isHex64(admin.password), "reset must store a 64-hex SHA-256 value")
  assert.ok(admin.salt, "reset must assign a per-user salt (Go two-step hash)")
  assert.equal(
    await verifyUserPassword(admin, "operator-chosen"),
    true,
    "the ADMIN_PASS value must verify",
  )
  assert.equal(
    await verifyUserPassword(admin, "wrong-password"),
    false,
    "a wrong password must not verify",
  )
})

test("user/create follows Go: no silent default password and no echoed password", async () => {
  await seed(
    [
      adminUser(
        "0000000000000000000000000000000000000000000000000000000000000000",
      ),
    ],
    [{ key: "token", value: ADMIN_TOKEN }],
  )
  const app = new Hono()
  app.route("/api/admin/user", userRouter)
  const res = await app.request("/api/admin/user/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ADMIN_TOKEN,
    },
    body: JSON.stringify({ username: "newuser" }),
  })
  assert.equal(res.status, 200)
  const json: any = await res.json()
  // 对齐 Go：不再自动生成随机密码，也不会把密码回显给调用方
  assert.equal(json.data, null)

  const db: any = await getDb(env)
  const created = db.users.find((u: any) => u.username === "newuser")
  assert.ok(isHex64(created.password), "stored value must be a 64-hex hash")
  assert.ok(created.salt, "stored user must carry a per-user salt")
  assert.equal(
    await verifyUserPassword(created, ""),
    true,
    'an empty password matches Go\'s SetPassword("") semantics',
  )
  assert.equal(
    await verifyUserPassword(created, "123456"),
    false,
    "the stored hash must not be of the well-known 123456",
  )
})
