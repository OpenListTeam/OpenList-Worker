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

  const mountPath = "/" + (body.mount_path || "").split("/").filter(Boolean).join("/")
  if (db.storages.some((s: any) => "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") === mountPath)) {
    return c.json({ code: 400, message: "mount path already exists", data: null })
  }

  const newStorage = {
    ...body,
    mount_path: mountPath,
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

  const mountPath = "/" + (body.mount_path || "").split("/").filter(Boolean).join("/")
  if (db.storages.some((s: any) => s.id !== body.id && "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") === mountPath)) {
    return c.json({ code: 400, message: "mount path already exists", data: null })
  }

  const idx = db.storages.findIndex((s: any) => s.id === body.id)
  if (idx !== -1) {
    db.storages[idx] = {
      ...db.storages[idx],
      ...body,
      mount_path: mountPath,
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
  return c.json({ code: 200, message: "success", data: ["Local", "S3", "Onedrive"] })
})

adminRouter.get("/driver/list", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: {
      Local: {
        name: "Local",
        default_mount_path: "/",
        common: [
          { name: "mount_path", type: "string", default: "", required: true, help: "1" },
          { name: "order", type: "number", default: "0", required: false, help: "" },
          { name: "remark", type: "string", default: "", required: false, help: "" },
          { name: "cache_expiration", type: "number", default: "30", required: true, help: "The cache expiration time for this storage (minutes)" },
          { name: "custom_cache_policies", type: "string", default: "", required: false },
          { name: "web_proxy", type: "bool", default: "false", required: false },
          { name: "webdav_policy", type: "select", options: "302 Redirect,Native", default: "302 Redirect", required: true },
          { name: "down_proxy_url", type: "string", default: "", required: false },
          { name: "disable_proxy_sign", type: "bool", default: "false", required: false },
          { name: "order_by", type: "select", options: "Choose,name,size,modified", default: "Choose", required: false },
          { name: "order_direction", type: "select", options: "Choose,asc,desc", default: "Choose", required: false },
          { name: "folder_order", type: "select", options: "Choose,first,last", default: "Choose", required: false },
          { name: "disable_index", type: "bool", default: "false", required: false },
          { name: "enable_sign", type: "bool", default: "false", required: false }
        ],
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
        common: [
          { name: "mount_path", type: "string", default: "", required: true, help: "1" },
          { name: "order", type: "number", default: "0", required: false, help: "" },
          { name: "remark", type: "string", default: "", required: false, help: "" },
          { name: "cache_expiration", type: "number", default: "30", required: true, help: "The cache expiration time for this storage (minutes)" },
          { name: "custom_cache_policies", type: "string", default: "", required: false },
          { name: "web_proxy", type: "bool", default: "false", required: false },
          { name: "webdav_policy", type: "select", options: "302 Redirect,Native", default: "302 Redirect", required: true },
          { name: "down_proxy_url", type: "string", default: "", required: false },
          { name: "disable_proxy_sign", type: "bool", default: "false", required: false },
          { name: "order_by", type: "select", options: "Choose,name,size,modified", default: "Choose", required: false },
          { name: "order_direction", type: "select", options: "Choose,asc,desc", default: "Choose", required: false },
          { name: "folder_order", type: "select", options: "Choose,first,last", default: "Choose", required: false },
          { name: "disable_index", type: "bool", default: "false", required: false },
          { name: "enable_sign", type: "bool", default: "false", required: false }
        ],
        additional: [
          {
            name: "s3_bucket_name",
            type: "string",
            default: "",
            required: true,
          }
        ]
      },
      Onedrive: {
        name: "Onedrive",
        default_mount_path: "/onedrive",
        common: [
          { name: "mount_path", type: "string", default: "", required: true, help: "1" },
          { name: "order", type: "number", default: "0", required: false, help: "" },
          { name: "remark", type: "string", default: "", required: false, help: "" },
          { name: "cache_expiration", type: "number", default: "30", required: true, help: "The cache expiration time for this storage (minutes)" },
          { name: "custom_cache_policies", type: "string", default: "", required: false },
          { name: "web_proxy", type: "bool", default: "false", required: false },
          { name: "webdav_policy", type: "select", options: "302 Redirect,Native", default: "302 Redirect", required: true },
          { name: "down_proxy_url", type: "string", default: "", required: false },
          { name: "disable_proxy_sign", type: "bool", default: "false", required: false },
          { name: "order_by", type: "select", options: "Choose,name,size,modified", default: "Choose", required: false },
          { name: "order_direction", type: "select", options: "Choose,asc,desc", default: "Choose", required: false },
          { name: "folder_order", type: "select", options: "Choose,first,last", default: "Choose", required: false },
          { name: "disable_index", type: "bool", default: "false", required: false },
          { name: "enable_sign", type: "bool", default: "false", required: false }
        ],
        additional: [
          {
            name: "root_folder_path",
            type: "string",
            default: "/",
            required: true,
          },
          {
            name: "region",
            type: "select",
            options: "global,cn,us,de",
            default: "global",
            required: true,
          },
          {
            name: "is_sharepoint",
            type: "bool",
            default: "false",
            required: false,
          },
          {
            name: "use_online_api",
            type: "bool",
            default: "true",
            required: false,
          },
          {
            name: "api_url_address",
            type: "string",
            default: "https://api.oplist.org/onedrive/renewapi",
            required: false,
          },
          {
            name: "client_id",
            type: "string",
            default: "",
            required: false,
          },
          {
            name: "client_secret",
            type: "string",
            default: "",
            required: false,
          },
          {
            name: "redirect_uri",
            type: "string",
            default: "https://api.oplist.org/onedrive/callback",
            required: true,
          },
          {
            name: "refresh_token",
            type: "string",
            default: "",
            required: true,
          },
          {
            name: "site_id",
            type: "string",
            default: "",
            required: false,
          },
          {
            name: "chunk_size",
            type: "number",
            default: "5",
            required: false,
          },
          {
            name: "custom_host",
            type: "string",
            default: "",
            required: false,
            help: "true",
          },
          {
            name: "disable_disk_usage",
            type: "bool",
            default: "false",
            required: false,
            help: "true",
          },
          {
            name: "enable_direct_upload",
            type: "bool",
            default: "false",
            required: false,
            help: "true",
          },
        ],
        config: {
          name: "Onedrive",
          local_sort: true,
          only_local: false,
          only_proxy: false,
          no_cache: false,
          no_upload: false,
          need_ms: false,
          default_root: "/",
        },
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

adminRouter.post("/user/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb()
  if (db.users.some((u: any) => u.username === body.username)) {
    return c.json({ code: 400, message: "Username already exists", data: null })
  }
  const newUser = {
    ...body,
    id: db.users.length ? Math.max(...db.users.map((u: any) => u.id)) + 1 : 1,
  }
  db.users.push(newUser)
  await saveDb(db)
  return c.json({ code: 200, message: "success", data: newUser })
})

adminRouter.post("/user/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb()
  const idx = db.users.findIndex((u: any) => u.id === body.id)
  if (idx !== -1) {
    if (body.username && db.users.some((u: any) => u.id !== body.id && u.username === body.username)) {
      return c.json({ code: 400, message: "Username already exists", data: null })
    }
    db.users[idx] = { ...db.users[idx], ...body }
    await saveDb(db)
  }
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/user/delete", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb()
  if (id === 1) {
    return c.json({ code: 400, message: "Cannot delete admin user", data: null })
  }
  db.users = db.users.filter((u: any) => u.id !== id)
  await saveDb(db)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.get("/supabase/status", async (c) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return c.json({
      code: 200,
      message: "success",
      data: {
        configured: false,
        tableExists: false,
        error: null,
        url: null
      }
    })
  }

  try {
    const { createClient } = await import("@supabase/supabase-js")
    const client = createClient(supabaseUrl, supabaseKey)
    const { error } = await client.from("openlist_config").select("id").eq("id", 1).maybeSingle()
    if (error) {
      return c.json({
        code: 200,
        message: "success",
        data: {
          configured: true,
          tableExists: false,
          error: error.message || String(error),
          url: supabaseUrl
        }
      })
    }
    return c.json({
      code: 200,
      message: "success",
      data: {
        configured: true,
        tableExists: true,
        error: null,
        url: supabaseUrl
      }
    })
  } catch (err: any) {
    return c.json({
      code: 200,
      message: "success",
      data: {
        configured: true,
        tableExists: false,
        error: err.message || String(err),
        url: supabaseUrl
      }
    })
  }
})
