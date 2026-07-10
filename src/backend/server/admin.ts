import { Hono } from "hono"
import { verify } from "hono/jwt"
import { getDb, saveDb, defaultDb } from "../internal/model/db"
import { JWT_SECRET } from "./middlewares"

export const adminRouter = new Hono()

adminRouter.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json({ code: 401, message: "Unauthorized", data: null })
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader
  try {
    const payload = await verify(token, JWT_SECRET, "HS256")
    if (payload.role !== 2) {
      return c.json({ code: 403, message: "Forbidden", data: null })
    }
    await next()
  } catch (e) {
    return c.json({ code: 401, message: "Unauthorized", data: null })
  }
})

adminRouter.get("/storage/list", async (c) => {
  const db = await getDb()
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.storages, total: db.storages.length },
  })
})

adminRouter.post("/storage/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb()
  const newStorage = {
    ...body,
    id: db.storages.length
      ? Math.max(...db.storages.map((s: any) => s.id)) + 1
      : 1,
    status: "work",
    modified: new Date().toISOString(),
  }
  db.storages.push(newStorage)
  await saveDb(db)
  return c.json({ code: 200, message: "success", data: newStorage })
})

adminRouter.post("/storage/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb()
  const idx = db.storages.findIndex((s: any) => s.id === body.id)
  if (idx !== -1) {
    db.storages[idx] = {
      ...db.storages[idx],
      ...body,
      modified: new Date().toISOString(),
    }
    await saveDb(db)
  }
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/storage/delete", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb()
  db.storages = db.storages.filter((s: any) => s.id !== id)
  await saveDb(db)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/storage/enable", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb()
  const s = db.storages.find((s: any) => s.id === id)
  if (s) {
    s.disabled = false
    await saveDb(db)
  }
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/storage/disable", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb()
  const s = db.storages.find((s: any) => s.id === id)
  if (s) {
    s.disabled = true
    await saveDb(db)
  }
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.get("/driver/names", (c) => {
  return c.json({ code: 200, message: "success", data: ["Local", "S3"] })
})

adminRouter.get("/driver/list", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: {
      Local: {
        name: "Local",
        default_mount_path: "/",
        common: [],
        additional: [
          {
            name: "root_folder_path",
            type: "string",
            default: "",
            required: true,
          },
        ],
      },
      S3: {
        name: "S3",
        default_mount_path: "/s3",
        common: [],
        additional: [
          {
            name: "s3_bucket_name",
            type: "string",
            default: "",
            required: true,
          }
        ]
      }
    },
  })
})

adminRouter.get("/setting/list", async (c) => {
  const db = await getDb()
  const groupQuery = c.req.query("group")
  const groupsQuery = c.req.query("groups")

  let settings = db.settings || []

  if (groupQuery !== undefined) {
    const groupNum = parseInt(groupQuery, 10)
    settings = settings.filter((s: any) => s.group === groupNum)
  } else if (groupsQuery !== undefined) {
    const groupNums = groupsQuery.split(",").map((g: string) => parseInt(g, 10))
    settings = settings.filter((s: any) => groupNums.includes(s.group))
  }

  return c.json({ code: 200, message: "success", data: settings })
})

adminRouter.post("/setting/save", async (c) => {
  const body = await c.req.json().catch(() => [])
  const db = await getDb()
  for (const item of body) {
    const idx = db.settings.findIndex((s: any) => s.key === item.key)
    if (idx !== -1) {
      db.settings[idx].value = item.value
    } else {
      db.settings.push(item)
    }
  }
  await saveDb(db)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/setting/default", async (c) => {
  const groupQuery = c.req.query("group")
  if (groupQuery === undefined) {
    return c.json({ code: 400, message: "group is required", data: null })
  }
  const groupNum = parseInt(groupQuery, 10)
  const db = await getDb()
  
  db.settings = (db.settings || []).filter((s: any) => s.group !== groupNum)
  const groupDefaults = defaultDb.settings.filter((s: any) => s.group === groupNum)
  db.settings.push(...JSON.parse(JSON.stringify(groupDefaults)))
  
  await saveDb(db)
  return c.json({ code: 200, message: "success", data: groupDefaults })
})

adminRouter.post("/setting/delete", async (c) => {
  const key = c.req.query("key")
  if (!key) {
    return c.json({ code: 400, message: "key is required", data: null })
  }
  const db = await getDb()
  db.settings = (db.settings || []).filter((s: any) => s.key !== key)
  await saveDb(db)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.get("/meta/list", async (c) => {
  const db = await getDb()
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.metas, total: db.metas.length },
  })
})

adminRouter.get("/user/list", async (c) => {
  const db = await getDb()
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.users, total: db.users.length },
  })
})
