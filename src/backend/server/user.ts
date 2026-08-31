import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { hashPassword, generateRandomPassword } from "./auth"
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

  const maxId = db.users.reduce(
    (max: number, u: any) => Math.max(max, u.id || 0),
    0,
  )
  const newId = maxId + 1

  // FIX(F-11): "123456" as a silent fallback meant every user created without
  // an explicit password shipped with a guessable one. When no password is
  // given, generate a random one and hand it back to the admin caller once —
  // it is never stored or logged in plaintext.
  let plainPassword: string = body.password || ""
  let generatedPassword: string | null = null
  if (!plainPassword) {
    generatedPassword = generateRandomPassword()
    plainPassword = generatedPassword
  }
  const hashedPassword = await hashPassword(plainPassword)

  const newUser = {
    id: newId,
    username: body.username,
    password: hashedPassword,
    role: body.role !== undefined ? parseInt(body.role, 10) : 0,
    permission:
      body.permission !== undefined ? parseInt(body.permission, 10) : 0,
    base_path: body.base_path || "/",
    disabled: !!body.disabled,
    sso_id: body.sso_id || "",
    allow_ldap: !!body.allow_ldap,
    pwd_update_at: new Date().toISOString(),
  }

  db.users.push(newUser)
  await saveDb(db, c.env)

  return c.json({
    code: 200,
    message: generatedPassword
      ? "success (a random password was generated — pass one explicitly to choose your own)"
      : "success",
    data: generatedPassword ? { password: generatedPassword } : null,
  })
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

  if (body.password && body.password.trim() !== "") {
    user.password = await hashPassword(body.password)
    user.pwd_update_at = new Date().toISOString()
  }

  if (body.role !== undefined) user.role = parseInt(body.role, 10)
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
  if (id === 1) {
    return c.json(
      { code: 400, message: "Cannot delete primary admin user", data: null },
      400,
    )
  }

  const db = await getDb(c.env)
  if (!db.users) db.users = []

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
    const oldHashed = await hashPassword(oldPassword)

    if (
      !user.password ||
      user.password.length !== 64 ||
      user.password !== oldHashed
    ) {
      return c.json(
        { code: 400, message: "Incorrect old password", data: null },
        400,
      )
    }

    user.password = await hashPassword(newPassword)
    user.pwd_update_at = new Date().toISOString()
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
