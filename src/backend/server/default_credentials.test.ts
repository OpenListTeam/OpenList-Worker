import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import {
  getOrInitUsers,
  verifyUserPassword,
  hashPasswordSHA256,
} from "./auth"
import { isHex64 } from "../pkg/password"
import { userRouter } from "./user"

const env: any = {}
const ADMIN_TOKEN = "ADMIN_STATIC_TOKEN"

const seed = (users: any[], settings: any[] = []) =>
  saveDb({ settings, users, storages: [], shares: [] }, env)

const adminUser = (password: string) => ({
  id: 1,
  username: "admin",
  password,
  role: 2,
  permission: 0,
  base_path: "/",
  disabled: false,
})

const currentAdmin = async () => {
  const db: any = await getDb(env)
  return db.users.find((u: any) => u.username === "admin")
}

test("Initialization: a fresh deployment stays uninitialized without ADMIN_PASSWORD", async () => {
  // 隔离 CI/宿主机环境变量，避免影响“未初始化”断言
  delete process.env.ADMIN_PASSWORD
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
  delete process.env.ADMIN_PASSWORD
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
  delete process.env.ADMIN_PASSWORD
  await seed([adminUser("")])
  await getOrInitUsers(env)
  const admin = await currentAdmin()
  assert.equal(
    admin.password,
    "",
    "empty password must stay empty until the setup wizard runs",
  )
})

test("Security(F-11): ADMIN_PASSWORD still forces an explicit reset (to salted double-SHA256)", async () => {
  await seed([adminUser("pbkdf2:100000:somesalt:deadbeef")])
  const envWithPass: any = { ...env, ADMIN_PASSWORD: "operator-chosen" }
  await getOrInitUsers(envWithPass)
  const admin = await currentAdmin()
  assert.ok(isHex64(admin.password), "reset must store a 64-hex SHA-256 value")
  assert.ok(admin.salt, "reset must assign a per-user salt (Go two-step hash)")
  assert.equal(
    await verifyUserPassword(admin, "operator-chosen"),
    true,
    "the ADMIN_PASSWORD value must verify",
  )
  assert.equal(
    await verifyUserPassword(admin, "wrong-password"),
    false,
    "a wrong password must not verify",
  )
})

test("Security(F-11): user/create without a password gets a random one, not 123456", async () => {
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
  assert.ok(
    json.data?.password,
    "the generated password must be returned to the admin caller once",
  )
  assert.notEqual(json.data.password, "123456")

  const db: any = await getDb(env)
  const created = db.users.find((u: any) => u.username === "newuser")
  assert.ok(isHex64(created.password), "stored value must be a 64-hex hash")
  assert.ok(created.salt, "stored user must carry a per-user salt")
  assert.equal(
    await verifyUserPassword(created, json.data.password),
    true,
    "the returned random password must actually log the user in",
  )
  assert.equal(
    await verifyUserPassword(created, "123456"),
    false,
    "the stored hash must not be of the well-known 123456",
  )
})
