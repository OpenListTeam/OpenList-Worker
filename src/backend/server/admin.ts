import { Hono } from "hono"
import { verify } from "hono/jwt"
import { getDb, saveDb, defaultDb, getKvStatus } from "../internal/model/db"
import { JWT_SECRET } from "./middlewares"

export const adminRouter = new Hono()

adminRouter.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json({ code: 401, message: "Unauthorized", data: null })
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
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
  const db = await getDb(c.env)
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.storages, total: db.storages.length },
  })
})

adminRouter.post("/storage/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  const mountPath =
    "/" + (body.mount_path || "").split("/").filter(Boolean).join("/")
  if (
    db.storages.some(
      (s: any) =>
        "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") ===
        mountPath,
    )
  ) {
    return c.json({
      code: 400,
      message: "mount path already exists",
      data: null,
    })
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
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: newStorage })
})

adminRouter.post("/storage/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  const mountPath =
    "/" + (body.mount_path || "").split("/").filter(Boolean).join("/")
  if (
    db.storages.some(
      (s: any) =>
        s.id !== body.id &&
        "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") ===
          mountPath,
    )
  ) {
    return c.json({
      code: 400,
      message: "mount path already exists",
      data: null,
    })
  }

  const idx = db.storages.findIndex((s: any) => s.id === body.id)
  if (idx !== -1) {
    db.storages[idx] = {
      ...db.storages[idx],
      ...body,
      mount_path: mountPath,
      modified: new Date().toISOString(),
    }
    await saveDb(db, c.env)
  }
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/storage/delete", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb(c.env)
  db.storages = db.storages.filter((s: any) => s.id !== id)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/storage/enable", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb(c.env)
  const s = db.storages.find((s: any) => s.id === id)
  if (s) {
    s.disabled = false
    await saveDb(db, c.env)
  }
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/storage/disable", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb(c.env)
  const s = db.storages.find((s: any) => s.id === id)
  if (s) {
    s.disabled = true
    await saveDb(db, c.env)
  }
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.get("/driver/names", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: ["AliyundriveOpen", "GoogleDrive", "Onedrive", "S3"],
  })
})

const COMMON_FIELDS = [
  {
    name: "mount_path",
    type: "string",
    default: "",
    required: true,
    help: "1",
  },
  { name: "order", type: "number", default: "0", required: false, help: "" },
  { name: "remark", type: "string", default: "", required: false, help: "" },
  { name: "cache_expiration", type: "number", default: "30", required: false },
]

const driverConfigs: Record<string, any> = {
  AliyundriveOpen: {
    name: "AliyundriveOpen",
    default_mount_path: "/aliyundrive",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "refresh_token",
        type: "text",
        default: "",
        required: true,
        help: "true",
      },
      {
        name: "drive_type",
        type: "select",
        options: "default,resource,backup",
        default: "default",
        required: true,
      },
      { name: "drive_id", type: "string", default: "", required: false },
      {
        name: "root_folder_id",
        type: "string",
        default: "root",
        required: true,
      },
      {
        name: "order_by",
        type: "select",
        options: "updated_at,name,size,created_at",
        default: "updated_at",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "DESC,ASC",
        default: "DESC",
        required: false,
      },
      {
        name: "api_url_address",
        type: "string",
        default: "https://api.oplist.org/alicloud/renewapi",
        required: false,
        help: "true",
      },
      {
        name: "alipan_type",
        type: "select",
        options: "alipanQR,alipanTV",
        default: "alipanQR",
        required: false,
      },
      { name: "client_id", type: "string", default: "", required: false },
      { name: "client_secret", type: "string", default: "", required: false },
      {
        name: "remove_way",
        type: "select",
        options: "trash,delete",
        default: "trash",
        required: false,
      },
    ],
    config: {
      name: "AliyundriveOpen",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "root",
    },
  },
  S3: {
    name: "S3",
    default_mount_path: "/s3",
    common: COMMON_FIELDS.slice(0, 3),
    additional: [
      { name: "s3_bucket_name", type: "string", default: "", required: true },
    ],
    config: {
      name: "S3",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  Onedrive: {
    name: "Onedrive",
    default_mount_path: "/onedrive",
    common: COMMON_FIELDS.slice(0, 3),
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
      { name: "client_id", type: "string", default: "", required: false },
      { name: "client_secret", type: "string", default: "", required: false },
      {
        name: "redirect_uri",
        type: "string",
        default: "https://api.oplist.org/onedrive/callback",
        required: true,
      },
      { name: "refresh_token", type: "string", default: "", required: true },
      { name: "site_id", type: "string", default: "", required: false },
      { name: "chunk_size", type: "number", default: "5", required: false },
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
  },
  GoogleDrive: {
    name: "GoogleDrive",
    default_mount_path: "/google-drive",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "refresh_token",
        type: "text",
        default: "",
        required: true,
        help: "true",
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "root",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "folder,name,modifiedTime desc",
        default: "folder,name,modifiedTime desc",
        required: false,
      },
      {
        name: "api_url_address",
        type: "string",
        default: "https://api.alist.nn.ci/googledrive/token",
        required: false,
        help: "true",
      },
      {
        name: "use_online_api",
        type: "bool",
        default: "true",
        required: false,
      },
      { name: "client_id", type: "string", default: "", required: false },
      { name: "client_secret", type: "string", default: "", required: false },
      { name: "chunk_size", type: "number", default: "5", required: false },
    ],
    config: {
      name: "GoogleDrive",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "root",
    },
  },
}

adminRouter.get("/driver/list", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: driverConfigs,
  })
})

adminRouter.get("/driver/info", (c) => {
  const driverName = c.req.query("driver") || ""
  const info = driverConfigs[driverName] || driverConfigs["AliyundriveOpen"]
  return c.json({
    code: 200,
    message: "success",
    data: info,
  })
})

adminRouter.get("/setting/list", async (c) => {
  const db = await getDb(c.env)
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
  const db = await getDb(c.env)
  for (const item of body) {
    const idx = db.settings.findIndex((s: any) => s.key === item.key)
    if (idx !== -1) {
      db.settings[idx].value = item.value
    } else {
      db.settings.push(item)
    }
  }
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/setting/default", async (c) => {
  const groupQuery = c.req.query("group")
  if (groupQuery === undefined) {
    return c.json({ code: 400, message: "group is required", data: null })
  }
  const groupNum = parseInt(groupQuery, 10)
  const db = await getDb(c.env)

  db.settings = (db.settings || []).filter((s: any) => s.group !== groupNum)
  const groupDefaults = defaultDb.settings.filter(
    (s: any) => s.group === groupNum,
  )
  db.settings.push(...JSON.parse(JSON.stringify(groupDefaults)))

  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: groupDefaults })
})

adminRouter.post("/setting/delete", async (c) => {
  const key = c.req.query("key")
  if (!key) {
    return c.json({ code: 400, message: "key is required", data: null })
  }
  const db = await getDb(c.env)
  db.settings = (db.settings || []).filter((s: any) => s.key !== key)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.get("/meta/list", async (c) => {
  const db = await getDb(c.env)
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.metas, total: db.metas.length },
  })
})

import { userRouter } from "./user"
adminRouter.route("/user", userRouter)

adminRouter.get("/kv/status", async (c) => {
  const statusData = await getKvStatus(c.env)
  return c.json({
    code: 200,
    message: "success",
    data: statusData,
  })
})
