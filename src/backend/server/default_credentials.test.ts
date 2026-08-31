import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { getOrInitUsers, hashPassword } from "./auth"
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

test("Security(F-11): a fresh deployment must not get the well-known admin/admin password", async () => {
  await seed([])
  await getOrInitUsers(env)
  const admin = await currentAdmin()
  assert.ok(admin, "admin must be created")
  assert.notEqual(
    admin.password,
    await hashPassword("admin"),
    "a fresh deployment must never start with admin/admin",
  )
  assert.match(admin.password, /^[0-9a-f]{64}$/, "hash format must stay valid")
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
  assert.notEqual(admin.password, await hashPassword("admin"))
})

test("Security(F-11): an empty admin password gets a random password, not 'admin'", async () => {
  await seed([adminUser("")])
  await getOrInitUsers(env)
  const admin = await currentAdmin()
  assert.match(admin.password, /^[0-9a-f]{64}$/, "must be a real hash")
  assert.notEqual(
    admin.password,
    await hashPassword("admin"),
    "must not fall back to the well-known password",
  )
})

test("Security(F-11): ADMIN_PASSWORD still forces an explicit reset", async () => {
  await seed([adminUser("pbkdf2:100000:somesalt:deadbeef")])
  const envWithPass: any = { ...env, ADMIN_PASSWORD: "operator-chosen" }
  await getOrInitUsers(envWithPass)
  const admin = await currentAdmin()
  assert.equal(admin.password, await hashPassword("operator-chosen"))
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
  assert.notEqual(
    created.password,
    await hashPassword("123456"),
    "the stored hash must not be of the well-known 123456",
  )
  assert.equal(created.password, await hashPassword(json.data.password))
})
