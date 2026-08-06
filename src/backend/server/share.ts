import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"

export const shareRouter = new Hono()

// List all shares
shareRouter.get("/list", async (c) => {
  const db = await getDb(c.env)
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.shares || [], total: (db.shares || []).length },
  })
})

// Get a single share
shareRouter.get("/get", async (c) => {
  const id = c.req.query("id") || ""
  const db = await getDb(c.env)
  const share = (db.shares || []).find((s: any) => s.id === id)
  if (!share) {
    return c.json({ code: 404, message: "share not found", data: null })
  }
  return c.json({ code: 200, message: "success", data: share })
})

// Create a new share
shareRouter.post("/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  // Auto-generate a random share id when the client leaves it empty
  const shareId =
    body.id && String(body.id).trim() !== ""
      ? String(body.id).trim()
      : generateShareId()

  if ((db.shares || []).some((s: any) => s.id === shareId)) {
    return c.json({
      code: 400,
      message: "share id already exists",
      data: null,
    })
  }

  const newShare = {
    id: shareId,
    new_id: body.new_id || shareId,
    creator: "admin",
    creator_role: 2,
    accessed: 0,
    expires: body.expires || null,
    pwd: body.pwd || "",
    max_accessed: body.max_accessed ?? 0,
    disabled: body.disabled ?? false,
    order_by: body.order_by || "",
    order_direction: body.order_direction || "",
    extract_folder: body.extract_folder || "",
    files: body.files || [],
    remark: body.remark || "",
    readme: body.readme || "",
    header: body.header || "",
  }

  if (!db.shares) db.shares = []
  db.shares.push(newShare)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: newShare })
})

/** Generate a random 16-char share id using Web Crypto (Workers-compatible) */
function generateShareId(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "")
  return uuid.slice(0, 16)
}

// Update an existing share
shareRouter.post("/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  if (!body.id) {
    return c.json({ code: 400, message: "share id is required", data: null })
  }

  const idx = (db.shares || []).findIndex((s: any) => s.id === body.id)
  if (idx === -1) {
    return c.json({ code: 404, message: "share not found", data: null })
  }

  // Support renaming via new_id (must not collide with another share)
  const newId =
    body.new_id && String(body.new_id).trim() !== ""
      ? String(body.new_id).trim()
      : body.id
  if (newId !== body.id) {
    const collision = (db.shares || []).some(
      (s: any) => s.id === newId && s.id !== body.id,
    )
    if (collision) {
      return c.json({
        code: 400,
        message: "share id already exists",
        data: null,
      })
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
