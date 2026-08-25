import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { adminAuthMiddleware, getUserFromContext } from "./middlewares"
import { can, PermissionBit, isAdmin, getActualPath } from "../pkg/permission"

export const shareRouter = new Hono()

function sanitizePath(p: string): string {
  const normalized = (p || "").replace(/\\/g, "/").replace(/\/+/g, "/")
  const segments = normalized.split("/").filter((s) => s && s !== ".")
  if (segments.some((s) => s === "..")) {
    throw new Error("Path traversal segment '..' is not allowed")
  }
  return "/" + segments.join("/")
}

// 分享管理接口需要管理员权限（list/get/update/delete）
shareRouter.use("/list", adminAuthMiddleware)
shareRouter.use("/get", adminAuthMiddleware)
shareRouter.use("/update", adminAuthMiddleware)
shareRouter.use("/delete", adminAuthMiddleware)
shareRouter.use("/cancel", adminAuthMiddleware)
shareRouter.use("/enable", adminAuthMiddleware)
shareRouter.use("/disable", adminAuthMiddleware)

// List all shares (sanitizes plain password field)
shareRouter.get("/list", async (c) => {
  const db = await getDb(c.env)
  const sanitizedShares = (db.shares || []).map((s: any) => ({
    ...s,
    pwd: s.pwd ? "******" : "",
  }))
  return c.json({
    code: 200,
    message: "success",
    data: { content: sanitizedShares, total: sanitizedShares.length },
  })
})

// Get a single share
shareRouter.get("/get", async (c) => {
  const id = c.req.query("id") || ""
  const db = await getDb(c.env)
  const share = (db.shares || []).find((s: any) => s.id === id)
  if (!share) {
    return c.json({ code: 404, message: "分享不存在", data: null })
  }
  return c.json({
    code: 200,
    message: "success",
    data: { ...share, pwd: share.pwd ? "****" : "" },
  })
})

// Create a new share (requires logged-in user with SHARE permission; admins always allowed)
shareRouter.post("/create", async (c) => {
  const user = await getUserFromContext(c)
  if (!user || user.disabled) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }

  // 检查分享权限位
  if (!isAdmin(user) && !can(user, PermissionBit.SHARE)) {
    return c.json({ code: 403, message: "Permission denied", data: null }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  // 校验并清理分享路径
  let files: string[] = []
  if (Array.isArray(body.files)) {
    try {
      files = body.files.map((f: string) => {
        const clean = sanitizePath(String(f))
        return isAdmin(user) ? clean : getActualPath(user, clean)
      })
    } catch (err: any) {
      return c.json(
        { code: 400, message: err.message || "Invalid file path", data: null },
        400,
      )
    }
  }

  // 校验自定义 ID 格式
  const rawId = body.id ? String(body.id).trim() : ""
  if (rawId && !/^[a-zA-Z0-9_-]{1,64}$/.test(rawId)) {
    return c.json(
      {
        code: 400,
        message:
          "Invalid share id format (only alphanumeric, _ and - allowed, max 64 chars)",
        data: null,
      },
      400,
    )
  }

  const shareId = rawId || generateShareId()

  if ((db.shares || []).some((s: any) => s.id === shareId)) {
    return c.json(
      {
        code: 400,
        message: "share id already exists",
        data: null,
      },
      400,
    )
  }

  const newShare = {
    id: shareId,
    new_id: body.new_id || shareId,
    creator: user.username || "user",
    creator_role: user.role ?? 1,
    accessed: 0,
    expires: body.expires || null,
    pwd: body.pwd || "",
    max_accessed: body.max_accessed ?? 0,
    disabled: body.disabled ?? false,
    order_by: body.order_by || "",
    order_direction: body.order_direction || "",
    extract_folder: body.extract_folder || "",
    files,
    remark: body.remark || "",
    readme: body.readme || "",
    header: body.header || "",
  }

  if (!db.shares) db.shares = []
  db.shares.push(newShare)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: newShare })
})

function generateShareId(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "")
  return uuid.slice(0, 16)
}

// Update an existing share
shareRouter.post("/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  if (!body.id) {
    return c.json({ code: 400, message: "分享 ID 为必填项", data: null }, 400)
  }

  const idx = (db.shares || []).findIndex((s: any) => s.id === body.id)
  if (idx === -1) {
    return c.json({ code: 404, message: "分享不存在", data: null }, 404)
  }

  const newId =
    body.new_id && String(body.new_id).trim() !== ""
      ? String(body.new_id).trim()
      : body.id
  if (newId !== body.id) {
    const collision = (db.shares || []).some(
      (s: any) => s.id === newId && s.id !== body.id,
    )
    if (collision) {
      return c.json(
        {
          code: 400,
          message: "分享 ID 已存在",
          data: null,
        },
        400,
      )
    }
  }

  db.shares[idx] = {
    ...db.shares[idx],
    id: newId,
    new_id: newId,
    expires: body.expires !== undefined ? body.expires : db.shares[idx].expires,
    pwd: body.pwd !== undefined ? body.pwd : db.shares[idx].pwd,
    max_accessed:
      body.max_accessed !== undefined
        ? body.max_accessed
        : db.shares[idx].max_accessed,
    disabled:
      body.disabled !== undefined ? body.disabled : db.shares[idx].disabled,
    order_by:
      body.order_by !== undefined ? body.order_by : db.shares[idx].order_by,
    order_direction:
      body.order_direction !== undefined
        ? body.order_direction
        : db.shares[idx].order_direction,
    extract_folder:
      body.extract_folder !== undefined
        ? body.extract_folder
        : db.shares[idx].extract_folder,
    files: body.files !== undefined ? body.files : db.shares[idx].files,
    remark: body.remark !== undefined ? body.remark : db.shares[idx].remark,
    readme: body.readme !== undefined ? body.readme : db.shares[idx].readme,
    header: body.header !== undefined ? body.header : db.shares[idx].header,
  }
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// Delete a share
shareRouter.post("/delete", async (c) => {
  const id = c.req.query("id") || ""
  const db = await getDb(c.env)
  if (!db.shares) db.shares = []
  db.shares = db.shares.filter((s: any) => s.id !== id)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// Enable a share
shareRouter.post("/enable", async (c) => {
  const id = c.req.query("id") || ""
  const db = await getDb(c.env)
  const s = (db.shares || []).find((s: any) => s.id === id)
  if (s) {
    s.disabled = false
    await saveDb(db, c.env)
  }
  return c.json({ code: 200, message: "success", data: null })
})

// Disable a share
shareRouter.post("/disable", async (c) => {
  const id = c.req.query("id") || ""
  const db = await getDb(c.env)
  const s = (db.shares || []).find((s: any) => s.id === id)
  if (s) {
    s.disabled = true
    await saveDb(db, c.env)
  }
  return c.json({ code: 200, message: "success", data: null })
})
