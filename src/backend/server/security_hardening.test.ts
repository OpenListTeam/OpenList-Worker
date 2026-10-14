import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { sign } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { meHandler } from "./auth"
import { passwordStampOf, setUserPassword } from "../pkg/password"
import { userRouter } from "./user"

/**
 * 本轮安全加固的回归测试：
 *   1. 管理员用户管理接口的角色保护（对齐 Go handles/user.go + op/user.go）；
 *   2. 密码指纹（对齐 Go common.UserClaims.PwdTS）—— 改密后旧令牌立即失效。
 */

const env: any = { JWT_SECRET: "test-only-jwt-secret-for-hardening" }
const ADMIN_TOKEN = "HARDENING_STATIC_TOKEN"

const seed = (users: any[], settings: any[] = []) =>
  saveDb(
    { settings, users, storages: [], shares: [] },
    env,
    { force: true },
  )

const adminUser = (overrides: any = {}) => ({
  id: 1,
  username: "admin",
  password: "",
  salt: "",
  role: 2,
  permission: 0,
  base_path: "/",
  disabled: false,
  pwd_update_at: new Date().toISOString(),
  ...overrides,
})

function adminApp() {
  const app = new Hono()
  app.route("/api/admin/user", userRouter)
  return app
}

const adminHeaders = {
  "Content-Type": "application/json",
  Authorization: ADMIN_TOKEN,
}

test("user/create rejects admin and guest roles", async () => {
  await seed([adminUser()], [{ key: "token", value: ADMIN_TOKEN }])
  const app = adminApp()

  for (const role of [1, 2]) {
    const res = await app.request("/api/admin/user/create", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ username: `u${role}`, role }),
    })
    assert.equal(res.status, 400, `role=${role} must be rejected`)
    const json: any = await res.json()
    assert.equal(json.message, "admin or guest user can not be created")
  }

  const ok = await app.request("/api/admin/user/create", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ username: "normal", role: 0, password: "p@ssw0rd" }),
  })
  assert.equal(ok.status, 200)
})

test("user/update forbids role changes and disabling the admin account", async () => {
  await seed(
    [
      adminUser(),
      {
        id: 5,
        username: "someone",
        password: "",
        salt: "",
        role: 0,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
    ],
    [{ key: "token", value: ADMIN_TOKEN }],
  )
  const app = adminApp()

  const promote = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ id: 5, role: 2 }),
  })
  assert.equal(promote.status, 400)
  assert.equal((await promote.json() as any).message, "role can not be changed")

  const demote = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ id: 1, role: 0 }),
  })
  assert.equal(demote.status, 400)

  const disableAdmin = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ id: 1, disabled: true }),
  })
  assert.equal(disableAdmin.status, 400)
  assert.equal(
    (await disableAdmin.json() as any).message,
    "admin user can not be disabled",
  )

  // 允许的更新：权限位 / base_path / 禁用普通用户
  const ok = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ id: 5, permission: 8, base_path: "/data", disabled: true }),
  })
  assert.equal(ok.status, 200)
})

test("user/delete protects admin and guest by role, not by hardcoded id", async () => {
  await seed(
    [
      adminUser(),
      {
        id: 2,
        username: "guest",
        password: "",
        salt: "",
        role: 1,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
      {
        // 迁移/多管理员场景：id 不等于 1 的管理员同样必须受保护
        id: 7,
        username: "second-admin",
        password: "",
        salt: "",
        role: 2,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
      {
        id: 9,
        username: "normal",
        password: "",
        salt: "",
        role: 0,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
    ],
    [{ key: "token", value: ADMIN_TOKEN }],
  )
  const app = adminApp()

  for (const id of [1, 2, 7]) {
    const res = await app.request(`/api/admin/user/delete?id=${id}`, {
      method: "POST",
      headers: adminHeaders,
    })
    assert.equal(res.status, 400, `id=${id} must be protected`)
    assert.equal((await res.json() as any).message, "cannot delete admin or guest")
  }

  const del = await app.request("/api/admin/user/delete?id=9", {
    method: "POST",
    headers: adminHeaders,
  })
  assert.equal(del.status, 200)
  const db: any = await getDb(env)
  assert.equal(
    db.users.some((u: any) => u.id === 9),
    false,
    "a normal user must still be deletable",
  )
})

test("password change invalidates previously issued tokens (Go PwdTS parity)", async () => {
  await seed([adminUser()])
  const db: any = await getDb(env)
  const admin = db.users.find((u: any) => u.username === "admin")

  const app = new Hono()
  app.get("/me", meHandler)

  const tokenBefore = await sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      pwd_ts: passwordStampOf(admin),
      exp: Math.floor(Date.now() / 1000) + 600,
      jti: "pwd-ts-before",
    },
    env.JWT_SECRET,
  )
  const before = await app.request(
    "/me",
    { headers: { Authorization: `Bearer ${tokenBefore}` } },
    env,
  )
  assert.equal(before.status, 200, "token issued before the change must work")

  // 改密（Go: SetPassword 会刷新 PwdTS）
  await setUserPassword(admin, "brand-new-password")
  await saveDb(db, env, { force: true })

  const after = await app.request(
    "/me",
    { headers: { Authorization: `Bearer ${tokenBefore}` } },
    env,
  )
  assert.equal(after.status, 401, "token issued before the change must be rejected")

  const tokenAfter = await sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      pwd_ts: passwordStampOf(admin),
      exp: Math.floor(Date.now() / 1000) + 600,
      jti: "pwd-ts-after",
    },
    env.JWT_SECRET,
  )
  const fresh = await app.request(
    "/me",
    { headers: { Authorization: `Bearer ${tokenAfter}` } },
    env,
  )
  assert.equal(fresh.status, 200, "a fresh token must work")
})
