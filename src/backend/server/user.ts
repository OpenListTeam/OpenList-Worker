import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { verifyUserPassword } from "./auth"
import { setUserPassword } from "../pkg/password"
import { verify } from "hono/jwt"
import { getJwtSecret } from "./middlewares"
import { listUserSshKeys, deleteUserSshKey } from "../internal/op/sshkey"

export const userRouter = new Hono()

// GET /api/admin/user/list
userRouter.get("/list", async (c) => {
  const db = await getDb(c.env)
  const users = (db.users || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    permission: u.permission ?? 0,
    base_path: u.base_path || "/",
    disabled: !!u.disabled,
    sso_id: u.sso_id || "",
    allow_ldap: !!u.allow_ldap,
    pwd_update_at: u.pwd_update_at || "",
    otp: !!u.otp_secret,
  }))
  return c.json({
    code: 200,
    message: "success",
    data: {
      content: users,
      total: users.length,
    },
  })
})

// GET /api/admin/user/get?id=...
userRouter.get("/get", async (c) => {
  const idQuery = c.req.query("id")
  if (!idQuery) {
    return c.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  }
  const id = parseInt(idQuery, 10)
  const db = await getDb(c.env)
  const user = (db.users || []).find((u: any) => u.id === id)

  if (!user) {
    return c.json({ code: 404, message: "User not found", data: null }, 404)
  }

  return c.json({
    code: 200,
    message: "success",
    data: {
      id: user.id,
      username: user.username,
      password: "", // Never expose hashed password to client
      role: user.role,
      permission: user.permission ?? 0,
      base_path: user.base_path || "/",
      disabled: !!user.disabled,
      sso_id: user.sso_id || "",
      allow_ldap: !!user.allow_ldap,
      otp: !!user.otp_secret,
    },
  })
})

// POST /api/admin/user/create
userRouter.post("/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!body.username) {
    return c.json(
      { code: 400, message: "Username is required", data: null },
      400,
    )
  }

  const db = await getDb(c.env)
  if (!db.users) db.users = []

  const exists = db.users.some((u: any) => u.username === body.username)
  if (exists) {
    return c.json(
      { code: 400, message: "Username already exists", data: null },
      400,
    )
  }

  // 对齐 Go handles.CreateUser：admin / guest 不能通过 create 接口创建。
  // 管理员账号由安装向导（或 ADMIN_PASS）创建、guest 全局唯一，两者都不应
  // 经由此接口产生 —— 否则后台可被批量制造出多个管理员。
  const role = body.role !== undefined ? parseInt(body.role, 10) : 0
  if (role === 1 || role === 2) {
    return c.json(
      {
        code: 400,
        message: "admin or guest user can not be created",
        data: null,
      },
      400,
    )
  }

  const maxId = db.users.reduce(
    (max: number, u: any) => Math.max(max, u.id || 0),
    0,
  )
  const newId = maxId + 1

  // 密码直接采用调用方传入值（对齐 Go：不传入即为空密码；不再自动生成随机
  // 密码并回显）。
  const newUser: any = {
    id: newId,
    username: body.username,
    role,
    permission:
      body.permission !== undefined ? parseInt(body.permission, 10) : 0,
    base_path: body.base_path || "/",
    disabled: !!body.disabled,
    sso_id: body.sso_id || "",
    allow_ldap: !!body.allow_ldap,
    pwd_update_at: new Date().toISOString(),
  }

  await setUserPassword(newUser, body.password || "")
  db.users.push(newUser)
  await saveDb(db, c.env)

  return c.json({ code: 200, message: "success", data: null })
})

// POST /api/admin/user/update
userRouter.post("/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!body.id) {
    return c.json(
      { code: 400, message: "User ID is required", data: null },
      400,
    )
  }

  const id = parseInt(body.id, 10)
  const db = await getDb(c.env)
  if (!db.users) db.users = []

  const userIdx = db.users.findIndex((u: any) => u.id === id)
  if (userIdx === -1) {
    return c.json({ code: 404, message: "User not found", data: null }, 404)
  }

  const user = db.users[userIdx]

  if (body.username && body.username !== user.username) {
    const exists = db.users.some(
      (u: any) => u.id !== id && u.username === body.username,
    )
    if (exists) {
      return c.json(
        { code: 400, message: "Username already in use", data: null },
        400,
      )
    }
    user.username = body.username
  }

  // 对齐 Go handles.UpdateUser：
  //  1) role 不可通过 update 修改（防止把普通用户提升为管理员 / 使既有管理员降级）；
  //  2) 管理员账号不可被禁用（避免唯一管理员把自己锁在后台之外）。
  if (body.role !== undefined && parseInt(body.role, 10) !== user.role) {
    return c.json(
      { code: 400, message: "role can not be changed", data: null },
      400,
    )
  }
  if (body.disabled !== undefined && !!body.disabled && user.role === 2) {
    return c.json(
      { code: 400, message: "admin user can not be disabled", data: null },
      400,
    )
  }

  if (body.password && body.password.trim() !== "") {
    await setUserPassword(user, body.password.trim())
  }

  if (body.permission !== undefined)
    user.permission = parseInt(body.permission, 10)
  if (body.base_path !== undefined) user.base_path = body.base_path
  if (body.disabled !== undefined) user.disabled = !!body.disabled
  if (body.sso_id !== undefined) user.sso_id = body.sso_id
  if (body.allow_ldap !== undefined) user.allow_ldap = !!body.allow_ldap

  db.users[userIdx] = user
  await saveDb(db, c.env)

  return c.json({ code: 200, message: "success", data: null })
})

// POST /api/admin/user/delete or /api/admin/user/cancel
const deleteUserHandler = async (c: any) => {
  const idQuery = c.req.query("id")
  if (!idQuery) {
    return c.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  }
  const id = parseInt(idQuery, 10)

  const db = await getDb(c.env)
  if (!db.users) db.users = []

  // 对齐 Go op.DeleteUserById：按**角色**保护 admin/guest，而不是硬编码 id。
  // 历史缺陷：只拦 id===1 —— guest（通常 id=2）可被删除，导致匿名访问失去
  // 后备身份；若存在 id≠1 的管理员（迁移/多管理员场景）也完全不受保护。
  const target = db.users.find((u: any) => u.id === id)
  if (!target) {
    return c.json({ code: 404, message: "User not found", data: null }, 404)
  }
  if (target.role === 2 || target.role === 1) {
    return c.json(
      { code: 400, message: "cannot delete admin or guest", data: null },
      400,
    )
  }

  db.users = db.users.filter((u: any) => u.id !== id)
  await saveDb(db, c.env)

  return c.json({ code: 200, message: "success", data: null })
}

userRouter.post("/delete", deleteUserHandler)
userRouter.post("/cancel", deleteUserHandler)

// GET /api/admin/user/sshkey/list?uid=...
userRouter.get("/sshkey/list", async (c) => {
  const uid = parseInt(c.req.query("uid") || "0", 10)
  const keys = await listUserSshKeys(uid, c.env)
  return c.json({
    code: 200,
    message: "success",
    data: { content: keys, total: keys.length },
  })
})

// POST /api/admin/user/sshkey/delete?uid=...&id=...
userRouter.post("/sshkey/delete", async (c) => {
  const uid = parseInt(c.req.query("uid") || "0", 10)
  const id = c.req.query("id")
  if (!uid || !id) {
    return c.json(
      { code: 400, message: "Missing uid or id parameter", data: null },
      400,
    )
  }
  const removed = await deleteUserSshKey(uid, id, c.env)
  if (!removed) {
    return c.json({ code: 404, message: "SSH key not found", data: null }, 404)
  }
  const keys = await listUserSshKeys(uid, c.env)
  return c.json({
    code: 200,
    message: "success",
    data: keys,
  })
})

// POST /api/admin/user/cancel_2fa?id=... — admin disables a user's 2FA
userRouter.post("/cancel_2fa", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  if (!id) {
    return c.json(
      { code: 400, message: "Missing id parameter", data: null },
      400,
    )
  }
  const db = await getDb(c.env)
  const user = (db.users || []).find((u: any) => u.id === id)
  if (!user) {
    return c.json({ code: 404, message: "User not found", data: null }, 404)
  }
  delete user.otp_secret
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// POST /api/user/update_pwd
export const updatePwdHandler = async (c: any) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const secret = await getJwtSecret(c)
    const payload = await verify(token, secret, "HS256")
    const body = await c.req.json().catch(() => ({}))
    const oldPassword = body.old_password || ""
    const newPassword = body.new_password || ""

    if (!newPassword) {
      return c.json(
        { code: 400, message: "New password is required", data: null },
        400,
      )
    }

    const db = await getDb(c.env)
    if (!db.users) db.users = []

    const userIdx = db.users.findIndex(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (userIdx === -1) {
      return c.json({ code: 404, message: "User not found", data: null }, 404)
    }

    const user = db.users[userIdx]
    if (!user.password || !(await verifyUserPassword(user, oldPassword))) {
      return c.json(
        { code: 400, message: "Incorrect old password", data: null },
        400,
      )
    }

    await setUserPassword(user, newPassword)
    db.users[userIdx] = user
    await saveDb(db, c.env)

    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json(
      {
        code: 401,
        message: `Unauthorized: ${e.message || "Invalid token"}`,
        data: null,
      },
      401,
    )
  }
}
