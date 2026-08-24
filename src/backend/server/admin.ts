import { Hono } from "hono"
import { getDb, saveDb, defaultDb, getKvStatus } from "../internal/model/db"
import { getDriver } from "../internal/op/storage"
import { checkAdminAuth } from "../pkg/utils"
import { safeErrorMessage } from "../pkg/errs"

export const adminRouter = new Hono()

adminRouter.use("*", async (c, next) => {
  // 统一走 checkAdminAuth：静态 API token（settings.token）与 JWT 管理员
  // （role===2 且 DB 中存在未禁用用户）都视为管理员。
  const isAdmin = await checkAdminAuth(c)
  if (!isAdmin) {
    return c.json({ code: 401, message: "Unauthorized", data: null })
  }
  await next()
})

adminRouter.get("/storage/list", async (c) => {
  const db = await getDb(c.env)
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.storages, total: db.storages.length },
  })
})

adminRouter.post("/storage/load_all", async (c) => {
  const db = await getDb(c.env)
  const results: any[] = []
  let loaded = 0
  let failed = 0

  for (const storage of db.storages || []) {
    if (storage.disabled) continue
    try {
      await getDriver(storage.driver, storage)
      loaded++
      results.push({
        id: storage.id,
        mount_path: storage.mount_path,
        driver: storage.driver,
        status: "ok",
      })
    } catch (e: any) {
      failed++
      results.push({
        id: storage.id,
        mount_path: storage.mount_path,
        driver: storage.driver,
        status: "failed",
        error: e?.message || String(e),
      })
    }
  }

  return c.json({
    code: 200,
    message: "success",
    data: { loaded, failed, results },
  })
})

adminRouter.get("/storage/get", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb(c.env)
  const storage = db.storages.find((s: any) => s.id === id)
  if (!storage) {
    return c.json({ code: 404, message: "storage not found", data: null })
  }
  return c.json({ code: 200, message: "success", data: storage })
})

export const normalizeDriver = (driverName: string): string => {
  const norm = (driverName || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!norm) return ""
  const available = Object.keys(driverConfigs)
  const matched = available.find(
    (d) =>
      d.toLowerCase() === norm ||
      d.toLowerCase().replace(/[^a-z0-9]/g, "") === norm,
  )
  if (matched) return matched
  // Common OpenList aliases
  if (norm.startsWith("115")) return "115Open"
  if (norm.startsWith("123")) return "123Pan"
  if (norm.includes("aliyun")) return "AliyundriveOpen"
  if (norm.startsWith("baidu")) return "BaiduNetdisk"
  if (
    norm.startsWith("189") ||
    norm.includes("cloud189") ||
    norm.includes("ctyun")
  )
    return "Cloud189"
  if (norm === "onedriveapp") return "OnedriveAPP"
  if (norm.startsWith("onedrive")) return "Onedrive"
  if (norm.startsWith("google") || norm.includes("gdrive")) return "GoogleDrive"
  if (
    (norm.includes("thunder") || norm.includes("xunlei")) &&
    norm.includes("expert")
  )
    return "ThunderExpert"
  if (norm.includes("thunder") || norm.includes("xunlei")) return "Thunder"
  if (norm === "webdav" || norm === "webdavdriver") return "WebDav"
  if (norm === "wopan" || norm.includes("unicom") || norm.includes("woyun"))
    return "WoPan"
  if (norm === "quark" || norm === "quarkuc" || norm === "uc") return "Quark"
  if (
    [
      "s3",
      "doge",
      "dogecloud",
      "minio",
      "ceph",
      "aws",
      "r2",
      "b2",
      "cos",
      "oss",
      "kodo",
    ].includes(norm)
  )
    return "S3"
  if (norm.startsWith("github")) return "Github"
  if (norm === "local") return "Local"
  if (norm.includes("pikpak")) return "PikPak"
  if (norm.includes("seafile")) return "Seafile"
  if (norm.includes("yandex")) return "YandexDisk"
  if (norm.includes("terabox") || norm.includes("dubox")) return "Terabox"
  if (norm.includes("mediatrack") || norm.includes("fenmiao"))
    return "MediaTrack"
  if (norm.includes("alias")) return "Alias"
  return driverName || ""
}

const ensureStorageAdditionDeviceId = (
  driverName: string,
  additionInput: any,
): string => {
  let additionStr = ""
  if (typeof additionInput === "object" && additionInput !== null) {
    try {
      additionStr = JSON.stringify(additionInput)
    } catch {
      additionStr = "{}"
    }
  } else {
    additionStr = String(additionInput || "{}")
  }
  const norm = (driverName || "").toLowerCase()
  if (norm.includes("thunder") || norm.includes("xunlei")) {
    try {
      const addition = JSON.parse(additionStr || "{}")
      if (
        !addition.device_id ||
        typeof addition.device_id !== "string" ||
        addition.device_id.trim().length !== 32
      ) {
        const rand32 =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID().replace(/-/g, "")
            : Math.random().toString(16).substring(2).padEnd(16, "0") +
              Math.random().toString(16).substring(2).padEnd(16, "0")
        addition.device_id = rand32.slice(0, 32)
        return JSON.stringify(addition)
      }
    } catch {}
  }
  return additionStr
}

adminRouter.post("/storage/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  if (
    !body.driver ||
    typeof body.driver !== "string" ||
    body.driver.trim() === "" ||
    body.driver === "undefined" ||
    body.driver === "null"
  ) {
    return c.json(
      {
        code: 400,
        message: "Storage driver is required",
        data: null,
      },
      400,
    )
  }

  // mount_path 为空时用驱动配置的 default_mount_path 兜底，
  // 避免空路径被规范化成 "/" 而与根挂载冲突
  let rawMount = body.mount_path
  if (!rawMount || String(rawMount).trim() === "") {
    const fallbackMount =
      driverConfigs[body.driver as string]?.default_mount_path
    if (fallbackMount) {
      rawMount = fallbackMount
    }
  }
  const mountPath =
    "/" + String(rawMount || "").split("/").filter(Boolean).join("/")
  if (
    db.storages.some(
      (s: any) =>
        !s.disabled &&
        "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") ===
          mountPath,
    )
  ) {
    return c.json({
      code: 400,
      message: `mount path already exists: ${mountPath}`,
      data: null,
    })
  }

  const normalizedDriver = normalizeDriver(body.driver)
  const newAddition = ensureStorageAdditionDeviceId(
    normalizedDriver,
    body.addition || "{}",
  )

  const newStorage = {
    ...body,
    driver: normalizedDriver,
    addition: newAddition,
    mount_path: mountPath,
    id: db.storages.length
      ? Math.max(...db.storages.map((s: any) => s.id)) + 1
      : 1,
    status: "work",
    modified: new Date().toISOString(),
  }

  if (!newStorage.disabled) {
    try {
      const driver = await getDriver(newStorage.driver, newStorage)
      await driver.init?.()
      newStorage.status = "work"
    } catch (e: any) {
      newStorage.status = e.message || String(e)
      // If driver is completely unsupported, disable storage to avoid crashing path resolution
      if (String(e.message || e).includes("unsupported driver")) {
        newStorage.disabled = true
      }
      db.storages.push(newStorage)
      await saveDb(db, c.env)
      return c.json({
        code: 500,
        message: e.message || String(e),
        data: newStorage,
      })
    }
  }

  db.storages.push(newStorage)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: newStorage })
})

adminRouter.post("/storage/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)

  // 与 create 保持一致：空路径用 default_mount_path 兜底
  let rawMount = body.mount_path
  if (!rawMount || String(rawMount).trim() === "") {
    const fallbackMount =
      driverConfigs[body.driver as string]?.default_mount_path
    if (fallbackMount) {
      rawMount = fallbackMount
    }
  }
  const mountPath =
    String(rawMount || "").trim() !== ""
      ? "/" + String(rawMount || "").split("/").filter(Boolean).join("/")
      : undefined

  if (mountPath) {
    if (
      db.storages.some(
        (s: any) =>
          s.id !== body.id &&
          !s.disabled &&
          "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") ===
            mountPath,
      )
    ) {
      return c.json({
        code: 400,
        message: `mount path already exists: ${mountPath}`,
        data: null,
      })
    }
  }

  const idx = db.storages.findIndex((s: any) => s.id === body.id)
  if (idx !== -1) {
    const rawDriver = body.driver || db.storages[idx].driver
    const normalizedDriver = normalizeDriver(rawDriver)
    const updatedAddition = ensureStorageAdditionDeviceId(
      normalizedDriver,
      body.addition !== undefined
        ? body.addition
        : db.storages[idx].addition || "{}",
    )

    const updatedStorage = {
      ...db.storages[idx],
      ...body,
      driver: normalizedDriver,
      addition: updatedAddition,
      mount_path: mountPath || db.storages[idx].mount_path,
      modified: new Date().toISOString(),
    }
    if (!updatedStorage.disabled) {
      try {
        const driver = await getDriver(updatedStorage.driver, updatedStorage)
        await driver.init?.()
        updatedStorage.status = "work"
      } catch (e: any) {
        updatedStorage.status = e.message || String(e)
        if (String(e.message || e).includes("unsupported driver")) {
          updatedStorage.disabled = true
        }
        db.storages[idx] = updatedStorage
        await saveDb(db, c.env)
        return c.json({
          code: 500,
          message: e.message || String(e),
          data: { id: updatedStorage.id },
        })
      }
    }
    db.storages[idx] = updatedStorage
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
    s.modified = new Date().toISOString()
    await saveDb(db, c.env)
    // 异步初始化驱动（不阻塞响应）：启用多个云盘时立即返回，
    // 初始化完成后更新状态；失败时把错误写入 status，下次访问或
    // 重新加载时会再次尝试。
    ;(async () => {
      try {
        const driver = await getDriver(s.driver, s)
        await driver.init?.()
        const db2 = await getDb(c.env)
        const st = db2.storages.find((x: any) => x.id === id)
        if (st && !st.disabled) {
          st.status = "work"
          st.modified = new Date().toISOString()
          await saveDb(db2, c.env)
        }
      } catch (e: any) {
        const db3 = await getDb(c.env)
        const st = db3.storages.find((x: any) => x.id === id)
        if (st && !st.disabled) {
          st.status = e.message || String(e)
          await saveDb(db3, c.env)
        }
      }
    })()
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
    data: [
      "AliyundriveOpen",
      "GoogleDrive",
      "Onedrive",
      "OnedriveAPP",
      "Quark",
      "123Pan",
      "BaiduNetdisk",
      "115Open",
      "GitHub API",
      "Thunder",
      "ThunderExpert",
      "189Cloud",
      "WoPan",
      "Lanzou",
      "WebDav",
      "S3",
      "Doge",
      "PikPak",
      "Seafile",
      "YandexDisk",
      "Terabox",
      "MediaTrack",
      "Alias",
      "Dropbox",
      "WPS",
      "139Yun",
      "Mega_nz",
      "115Share",
      "123PanShare",
      "AliyundriveShare",
      "OnedriveSharelink",
      "PikPakShare",
      "SMB",
    ],
  })
})

const COMMON_FIELDS = [
  {
    name: "mount_path",
    type: "string",
    default: "",
    required: true,
  },
  {
    name: "order",
    type: "number",
    default: "0",
    required: false,
  },
  {
    name: "remark",
    type: "string",
    default: "",
    required: false,
  },
  {
    name: "cache_expiration",
    type: "number",
    default: "30",
    required: false,
  },
  {
    name: "web_proxy",
    type: "bool",
    default: "false",
    required: false,
  },
  {
    name: "webdav_policy",
    type: "select",
    options: "302_redirect,use_proxy_url,native_proxy",
    default: "302_redirect",
    required: false,
  },
  {
    name: "down_proxy_url",
    type: "string",
    default: "",
    required: false,
  },
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
        options: "resource,backup,default",
        default: "resource",
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
      {
        name: "order_by",
        type: "select",
        options: "filename,modified_time,size",
        default: "filename",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
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
  OnedriveAPP: {
    name: "OnedriveAPP",
    default_mount_path: "/onedrive_app",
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
      { name: "client_id", type: "string", default: "", required: true },
      { name: "client_secret", type: "string", default: "", required: true },
      { name: "tenant_id", type: "string", default: "", required: true },
      { name: "email", type: "string", default: "", required: true },
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
      {
        name: "order_by",
        type: "select",
        options: "filename,modified_time,size",
        default: "filename",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "OnedriveAPP",
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
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
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
  Quark: {
    name: "Quark",
    default_mount_path: "/quark",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "variant",
        type: "select",
        options: "Quark,UC",
        default: "Quark",
        required: true,
      },
      {
        name: "cookie",
        type: "text",
        default: "",
        required: true,
        help: "true",
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "0",
        required: true,
      },
      {
        name: "order_by",
        type: "select",
        options: "none,file_type,file_name,updated_at",
        default: "none",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
      {
        name: "use_transcoding_address",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "only_list_video_file",
        type: "bool",
        default: "false",
        required: false,
      },
    ],
    config: {
      name: "Quark",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "0",
    },
  },
  "123Pan": {
    name: "123Pan",
    default_mount_path: "/123",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "username",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "access_token",
        type: "string",
        default: "",
        required: false,
        help: "登录令牌（可选，自动持久化，无需手动填写）。仅需填写上方 123 网盘手机号和密码，登录后自动获取并保存，跳过重复登录可避免境外 IP 触发风控。",
      },
      {
        name: "cookie",
        type: "text",
        default: "",
        required: false,
        help: "浏览器 Cookie（可选）。在 123 网盘网页登录后，从开发者工具复制请求头中的 Cookie 整串粘贴于此（含 sso-token），或从 Authorization: Bearer <token> 中复制 token/Bearer 值。解析出的 JWT 会作为 Bearer 令牌使用，效果等同访问令牌，适合账号密码登录被风控拦截的环境。",
      },
      {
        name: "root_id",
        type: "string",
        default: "0",
        required: false,
      },
      {
        name: "upload_thread",
        type: "number",
        default: "3",
        required: false,
        help: "the threads of upload",
      },
      {
        name: "platform",
        type: "string",
        default: "web",
        required: false,
        help: "the platform header value, sent with API requests",
      },
      {
        name: "order_by",
        type: "select",
        options: "file_id,file_name,size,created_at,updated_at",
        default: "file_id",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "desc",
        required: false,
      },
    ],
    config: {
      name: "123Pan",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "0",
    },
  },
  BaiduNetdisk: {
    name: "BaiduNetdisk",
    default_mount_path: "/baidu",
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
        name: "access_token",
        type: "string",
        default: "",
        required: true,
        help: "访问令牌（必填）。通过 https://api.oplist.org/ 获取。若令牌失效，挂载时会自动根据 refresh_token 通过在线 API 换新并持久化。",
      },
      {
        name: "use_online_api",
        type: "bool",
        default: "true",
        required: false,
        help: "使用在线 API 刷新 token（无需 ClientID/ClientSecret）",
      },
      {
        name: "api_url_address",
        type: "string",
        default: "https://api.oplist.org/baiduyun/renewapi",
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
        name: "download_api",
        type: "select",
        options: "official,crack,crack_video",
        default: "official",
        required: false,
      },
      {
        name: "custom_crack_ua",
        type: "string",
        default: "netdisk",
        required: true,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,time,size",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
      {
        name: "only_list_video_file",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "upload_thread",
        type: "string",
        default: "3",
        required: false,
        help: "1<=thread<=32",
      },
      {
        name: "upload_timeout",
        type: "number",
        default: "60",
        required: false,
        help: "per-slice upload timeout in seconds",
      },
      {
        name: "custom_upload_part_size",
        type: "number",
        default: "0",
        required: false,
        help: "0 for auto",
      },
      {
        name: "use_dynamic_upload_api",
        type: "bool",
        default: "true",
        required: false,
        help: "dynamically get upload api domain, when enabled, the 'Upload API' setting will be used as a fallback if failed to get",
      },
      {
        name: "upload_api",
        type: "string",
        default: "https://d.pcs.baidu.com",
        required: false,
      },
      {
        name: "low_bandwith_upload_mode",
        type: "bool",
        default: "false",
        required: false,
      },
    ],
    config: {
      name: "BaiduNetdisk",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  "115Open": {
    name: "115Open",
    default_mount_path: "/115",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "access_token",
        type: "string",
        default:
          "e4mvi.43f51ee687247d07f386048e903ae6b7.3a9175e14e8e4b254ab81462866f9111e2bdc9984324da30a2b8e2bdfad74ff1",
        required: true,
        help: "访问令牌（必填）。通过 115 开放平台获取；失效时自动用 refresh_token 刷新并持久化。",
      },
      {
        name: "refresh_token",
        type: "string",
        default: "",
        required: true,
        help: "刷新令牌（必填）。通过 115 开放平台获取；access_token 失效时自动刷新。",
      },
      {
        name: "root_id",
        type: "string",
        default: "0",
        required: false,
        help: "根文件夹 ID，默认 0（根目录）",
      },
      {
        name: "order_by",
        type: "select",
        options: "file_name,file_size,user_utime,file_type",
        default: "file_name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
      {
        name: "page_size",
        type: "number",
        default: "200",
        required: false,
        help: "list api per page size (1~1150)",
      },
      {
        name: "limit_rate",
        type: "float",
        default: "1",
        required: false,
        help: "limit all api request rate ([limit]r/1s)，0 表示不限速",
      },
    ],
    config: {
      name: "115Open",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "0",
    },
  },
  "GitHub API": {
    name: "GitHub API",
    default_mount_path: "/github",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: true,
      },
      { name: "token", type: "string", default: "", required: true },
      { name: "owner", type: "string", default: "", required: true },
      { name: "repo", type: "string", default: "", required: true },
      {
        name: "ref",
        type: "string",
        default: "",
        required: false,
        help: "A branch, a tag or a commit SHA, default branch by default.",
      },
      {
        name: "gh_proxy",
        type: "string",
        default: "",
        required: false,
        help: "GitHub proxy, e.g. https://ghproxy.net/raw.githubusercontent.com",
      },
      { name: "committer_name", type: "string", default: "", required: false },
      {
        name: "committer_email",
        type: "string",
        default: "",
        required: false,
      },
      { name: "author_name", type: "string", default: "", required: false },
      { name: "author_email", type: "string", default: "", required: false },
      {
        name: "mkdir_commit_message",
        type: "text",
        default: "{{.UserName}} mkdir {{.ObjPath}}",
        required: false,
      },
      {
        name: "delete_commit_message",
        type: "text",
        default: "{{.UserName}} remove {{.ObjPath}}",
        required: false,
      },
      {
        name: "put_commit_message",
        type: "text",
        default: "{{.UserName}} upload {{.ObjPath}}",
        required: false,
      },
      {
        name: "rename_commit_message",
        type: "text",
        default: "{{.UserName}} rename {{.ObjPath}} to {{.TargetName}}",
        required: false,
      },
      {
        name: "copy_commit_message",
        type: "text",
        default: "{{.UserName}} copy {{.ObjPath}} to {{.TargetPath}}",
        required: false,
      },
      {
        name: "move_commit_message",
        type: "text",
        default: "{{.UserName}} move {{.ObjPath}} to {{.TargetPath}}",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "GitHub API",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  Thunder: {
    name: "Thunder",
    default_mount_path: "/thunder",
    common: COMMON_FIELDS,
    additional: [
      { name: "root_folder_id", type: "string", default: "", required: false },
      { name: "username", type: "string", default: "", required: true },
      { name: "password", type: "string", default: "", required: true },
      { name: "captcha_token", type: "string", default: "", required: false },
      {
        name: "credit_key",
        type: "string",
        default: "",
        required: false,
        help: "credit key, used for login",
      },
      {
        name: "device_id",
        type: "string",
        default: "",
        required: false,
        help: "32 hex characters",
      },
      {
        name: "space",
        type: "string",
        default: "",
        required: false,
        help: "device id for remote device",
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Thunder",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "",
    },
  },
  ThunderExpert: {
    name: "ThunderExpert",
    default_mount_path: "/thunderexpert",
    common: COMMON_FIELDS,
    additional: [
      { name: "root_folder_id", type: "string", default: "", required: false },
      {
        name: "login_type",
        type: "select",
        options: "user,refresh_token",
        default: "user",
        required: true,
      },
      {
        name: "sign_type",
        type: "select",
        options: "algorithms,captcha_sign",
        default: "algorithms",
        required: true,
      },
      {
        name: "username",
        type: "string",
        default: "",
        required: false,
        help: "login type is user, this is required",
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: false,
        help: "login type is user, this is required",
      },
      {
        name: "refresh_token",
        type: "string",
        default: "",
        required: false,
        help: "login type is refresh_token, this is required",
      },
      {
        name: "algorithms",
        type: "string",
        default:
          "9uJNVj/wLmdwKrJaVj/omlQ,Oz64Lp0GigmChHMf/6TNfxx7O9PyopcczMsnf,Eb+L7Ce+Ej48u,jKY0,ASr0zCl6v8W4aidjPK5KHd1Lq3t+vBFf41dqv5+fnOd,wQlozdg6r1qxh0eRmt3QgNXOvSZO6q/GXK,gmirk+ciAvIgA/cxUUCema47jr/YToixTT+Q6O,5IiCoM9B1/788ntB,P07JH0h6qoM6TSUAK2aL9T5s2QBVeY9JWvalf,+oK0AN",
        required: false,
      },
      { name: "captcha_sign", type: "string", default: "", required: false },
      { name: "timestamp", type: "string", default: "", required: false },
      { name: "captcha_token", type: "string", default: "", required: false },
      {
        name: "credit_key",
        type: "string",
        default: "",
        required: false,
        help: "credit key, used for login",
      },
      { name: "device_id", type: "string", default: "", required: false },
      {
        name: "client_id",
        type: "string",
        default: "Xp6vsxz_7IYVw2BB",
        required: true,
      },
      {
        name: "client_secret",
        type: "string",
        default: "Xp6vsy4tN9toTVdMSpomVdXpRmES",
        required: true,
      },
      {
        name: "client_version",
        type: "string",
        default: "8.31.0.9726",
        required: true,
      },
      {
        name: "package_name",
        type: "string",
        default: "com.xunlei.downloadprovider",
        required: true,
      },
      {
        name: "user_agent",
        type: "string",
        default:
          "ANDROID-com.xunlei.downloadprovider/8.31.0.9726 netWorkType/5G appid/40 deviceName/Xiaomi_M2004j7ac deviceModel/M2004J7AC OSVersion/12 protocolVersion/301 platformVersion/10 sdkVersion/512000 Oauth2Client/0.9 (Linux 4_14_186-perf-gddfs8vbb238b) (JAVA 0)",
        required: true,
      },
      {
        name: "download_user_agent",
        type: "string",
        default:
          "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)",
        required: true,
      },
      {
        name: "use_video_url",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "space",
        type: "string",
        default: "",
        required: false,
        help: "device id for remote device",
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "ThunderExpert",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "",
    },
  },
  "189Cloud": {
    name: "189Cloud",
    default_mount_path: "/189",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "username",
        type: "string",
        default: "",
        required: true,
        help: "the phone number used to log in",
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: true,
        help: "password for login",
      },
      {
        name: "cookie",
        type: "text",
        default: "",
        required: false,
        help: "Fill in the cookie if need captcha (若遇滑块验证码或设备锁，可在浏览器登录后复制 Cookie 填入)",
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "-11",
        required: false,
        help: "根文件夹ID，默认为 -11（个人云根目录）",
      },
      {
        name: "order_by",
        type: "select",
        options: "lastOpTime,filename,fileSize",
        default: "lastOpTime",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "desc,asc",
        default: "desc",
        required: false,
      },
    ],
    config: {
      name: "189Cloud",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "-11",
    },
  },
  Lanzou: {
    name: "Lanzou",
    default_mount_path: "/lanzou",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "type",
        type: "select",
        options: "cookie,account,url",
        default: "cookie",
        required: true,
      },
      {
        name: "account",
        type: "string",
        default: "",
        required: false,
        help: "账号（手机号/UID），仅 account 模式需填写",
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: false,
        help: "密码，仅 account 模式需填写",
      },
      {
        name: "cookie",
        type: "text",
        default: "",
        required: false,
        help: "登录 Cookie（含 ylogin, phpdisk_info 等），cookie 模式需填写；有效期约 15 天",
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "-1",
        required: false,
        help: "根文件夹 ID / 分享 ID（个人盘默认 -1，分享链接填分享 ID 如 b00xxxx）",
      },
      {
        name: "share_password",
        type: "string",
        default: "",
        required: false,
        help: "提取码 / 访问密码（无密码留空）",
      },
      {
        name: "baseUrl",
        type: "string",
        default: "https://pc.woozooo.com",
        required: false,
        help: "基本 API 域名",
      },
      {
        name: "shareUrl",
        type: "string",
        default: "https://pan.lanzoui.com",
        required: false,
        help: "分享页面解析域名",
      },
      {
        name: "user_agent",
        type: "string",
        default:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/142.0.0.0 OpenList/42",
        required: true,
        help: "发送给蓝奏云 API 与直链解析时携带的客户端 User-Agent",
      },
      {
        name: "repair_file_info",
        type: "bool",
        default: "false",
        required: false,
        help: "通过 HEAD 请求修正文件精确大小与修改时间（WebDAV 推荐开启）",
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,time",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Lanzou",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "-1",
    },
  },
  WebDav: {
    name: "WebDav",
    default_mount_path: "/webdav",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "vendor",
        type: "select",
        options: "other,sharepoint",
        default: "other",
        required: true,
      },
      {
        name: "address",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "username",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "tls_insecure_skip_verify",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "WebDav",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  WoPan: {
    name: "WoPan",
    default_mount_path: "/wopan",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_id",
        type: "string",
        default: "0",
        required: false,
      },
      {
        name: "refresh_token",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "family_id",
        type: "string",
        default: "",
        required: false,
        help: "true",
      },
      {
        name: "sort_rule",
        type: "select",
        options: "name_asc,name_desc,time_asc,time_desc,size_asc,size_desc",
        default: "name_asc",
        required: false,
      },
      {
        name: "access_token",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "WoPan",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "0",
      no_overwrite_upload: true,
    },
  },
  S3: {
    name: "S3",
    default_mount_path: "/s3",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "bucket",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "endpoint",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "region",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "access_key_id",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "secret_access_key",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "session_token",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "custom_host",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "enable_custom_host_presign",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "sign_url_expire",
        type: "number",
        default: "4",
        required: false,
      },
      {
        name: "placeholder",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "force_path_style",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "list_object_version",
        type: "select",
        options: "v1,v2",
        default: "v1",
        required: false,
      },
      {
        name: "remove_bucket",
        type: "bool",
        default: "false",
        required: false,
        help: "true",
      },
      {
        name: "add_filename_to_disposition",
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
      },
      {
        name: "direct_upload_host",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "user_agent",
        type: "string",
        default: "",
        required: false,
        help: "true",
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
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
      check_status: true,
    },
  },
  Doge: {
    name: "Doge",
    default_mount_path: "/doge",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "bucket",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "endpoint",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "region",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "access_key_id",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "secret_access_key",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "session_token",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "custom_host",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "enable_custom_host_presign",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "sign_url_expire",
        type: "number",
        default: "4",
        required: false,
      },
      {
        name: "placeholder",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "force_path_style",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "list_object_version",
        type: "select",
        options: "v1,v2",
        default: "v1",
        required: false,
      },
      {
        name: "remove_bucket",
        type: "bool",
        default: "false",
        required: false,
        help: "true",
      },
      {
        name: "add_filename_to_disposition",
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
      },
      {
        name: "direct_upload_host",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "user_agent",
        type: "string",
        default: "",
        required: false,
        help: "true",
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Doge",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
      check_status: true,
    },
  },
  WeiYun: {
    name: "WeiYun",
    default_mount_path: "/weiyun",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "cookies",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,updated_at",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
      {
        name: "upload_thread",
        type: "string",
        default: "4",
        required: false,
        help: "4<=thread<=32",
      },
    ],
    config: {
      name: "WeiYun",
      local_sort: false,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "",
      check_status: true,
    },
  },
  SFTP: {
    name: "SFTP",
    default_mount_path: "/sftp",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "address",
        type: "string",
        default: "",
        required: true,
        help: "SSH host:port (e.g. 127.0.0.1:22)",
      },
      {
        name: "username",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "private_key",
        type: "text",
        default: "",
        required: false,
      },
      {
        name: "passphrase",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "ignore_symlink_error",
        type: "bool",
        default: "false",
        required: false,
        help: "Ignore symlink error",
      },
    ],
    config: {
      name: "SFTP",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
      check_status: true,
      no_link_url: true,
    },
  },
  FTP: {
    name: "FTP",
    default_mount_path: "/ftp",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "address",
        type: "string",
        default: "",
        required: true,
        help: "FTP host:port (e.g. 127.0.0.1:21)",
      },
      {
        name: "username",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "encoding",
        type: "string",
        default: "utf-8",
        required: true,
        help: "Character encoding, e.g. utf-8, gbk, gb2312",
      },
      {
        name: "cwd_list",
        type: "bool",
        default: "false",
        required: false,
        help: "Enter directory before listing",
      },
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
    ],
    config: {
      name: "FTP",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
      check_status: true,
      no_link_url: true,
    },
  },
  PikPak: {
    name: "PikPak",
    default_mount_path: "/pikpak",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "username",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "platform",
        type: "select",
        options: "web,android,pc",
        default: "web",
        required: true,
      },
      {
        name: "refresh_token",
        type: "text",
        default: "",
        required: false,
      },
      {
        name: "captcha_token",
        type: "text",
        default: "",
        required: false,
      },
      {
        name: "device_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "disable_media_link",
        type: "bool",
        default: "true",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "PikPak",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "",
    },
  },
  Seafile: {
    name: "Seafile",
    default_mount_path: "/seafile",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "address",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "username",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "token",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "repo_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "repo_pwd",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Seafile",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  YandexDisk: {
    name: "YandexDisk",
    default_mount_path: "/yandex",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "refresh_token",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
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
        default: "https://api.oplist.org/yandexui/renewapi",
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
        name: "order_by",
        type: "select",
        options: "name,path,created,modified,size",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "YandexDisk",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  Terabox: {
    name: "Terabox",
    default_mount_path: "/terabox",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "cookie",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "download_api",
        type: "select",
        options: "official,crack",
        default: "official",
        required: false,
      },
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,time,size",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Terabox",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  MediaTrack: {
    name: "MediaTrack",
    default_mount_path: "/mediatrack",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "access_token",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "project_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "updated_at,title,size",
        default: "title",
        required: false,
      },
      {
        name: "order_desc",
        type: "bool",
        default: "false",
        required: false,
      },
    ],
    config: {
      name: "MediaTrack",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "",
    },
  },
  Alias: {
    name: "Alias",
    default_mount_path: "/alias",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "paths",
        type: "text",
        default: "",
        required: true,
        help: "Newline-separated list of paths, e.g. /local or sub:/target",
      },
      {
        name: "read_conflict_policy",
        type: "select",
        options: "first,random,all",
        default: "first",
        required: false,
      },
      {
        name: "write_conflict_policy",
        type: "select",
        options:
          "disabled,first,deterministic,deterministic_or_all,all,all_strict",
        default: "disabled",
        required: false,
      },
      {
        name: "put_conflict_policy",
        type: "select",
        options:
          "disabled,first,deterministic,deterministic_or_all,all,all_strict,random,quota,quota_strict",
        default: "disabled",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Alias",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: true,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  Dropbox: {
    name: "Dropbox",
    default_mount_path: "/dropbox",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "use_online_api",
        type: "bool",
        default: "false",
        required: false,
      },
      {
        name: "api_url_address",
        type: "string",
        default: "https://api.oplist.org/dropboxs/renewapi",
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
        name: "refresh_token",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "root_namespace_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Dropbox",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  WPS: {
    name: "WPS",
    default_mount_path: "/wps",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "cookie",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "mode",
        type: "select",
        options: "Personal,Business",
        default: "Personal",
        required: false,
      },
      {
        name: "custom_ua",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "WPS",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  "139Yun": {
    name: "139Yun",
    default_mount_path: "/139",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "authorization",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "type",
        type: "select",
        options: "personal_new,family,group,personal,share",
        default: "personal_new",
        required: false,
      },
      {
        name: "link_id",
        type: "text",
        default: "",
        required: false,
      },
      {
        name: "cloud_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "139Yun",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "",
    },
  },
  Mega_nz: {
    name: "Mega_nz",
    default_mount_path: "/mega",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "email",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "password",
        default: "",
        required: true,
      },
      {
        name: "two_fa_code",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "two_fa_secret",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "move_to_trash",
        type: "bool",
        default: "true",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "Mega_nz",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: false,
      need_ms: false,
      default_root: "/",
    },
  },
  "115Share": {
    name: "115Share",
    default_mount_path: "/115_share",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "share_code",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "receive_code",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "cookie",
        type: "text",
        default: "",
        required: false,
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "0",
        required: false,
      },
      {
        name: "page_size",
        type: "number",
        default: "1000",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "115Share",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: true,
      need_ms: false,
      default_root: "0",
    },
  },
  "123PanShare": {
    name: "123PanShare",
    default_mount_path: "/123_share",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "sharekey",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "sharepassword",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "accesstoken",
        type: "text",
        default: "",
        required: false,
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "0",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "123PanShare",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: false,
      no_upload: true,
      need_ms: false,
      default_root: "0",
    },
  },
  AliyundriveShare: {
    name: "AliyundriveShare",
    default_mount_path: "/aliyun_share",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "share_id",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "share_pwd",
        type: "string",
        default: "",
        required: false,
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
        options: "name,size,updated_at,created_at",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "ASC,DESC",
        default: "ASC",
        required: false,
      },
    ],
    config: {
      name: "AliyundriveShare",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: true,
      need_ms: false,
      default_root: "root",
    },
  },
  OnedriveSharelink: {
    name: "OnedriveSharelink",
    default_mount_path: "/onedrive_share",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "url",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "OnedriveSharelink",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: true,
      need_ms: false,
      default_root: "/",
    },
  },
  PikPakShare: {
    name: "PikPakShare",
    default_mount_path: "/pikpak_share",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "share_id",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "share_pwd",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "platform",
        type: "select",
        options: "android,web,pc",
        default: "web",
        required: false,
      },
      {
        name: "root_folder_id",
        type: "string",
        default: "",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "PikPakShare",
      local_sort: true,
      only_local: false,
      only_proxy: false,
      no_cache: false,
      no_upload: true,
      need_ms: false,
      default_root: "",
    },
  },
  SMB: {
    name: "SMB",
    default_mount_path: "/smb",
    common: COMMON_FIELDS,
    additional: [
      {
        name: "address",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "share_name",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "username",
        type: "string",
        default: "",
        required: true,
      },
      {
        name: "password",
        type: "password",
        default: "",
        required: false,
      },
      {
        name: "port",
        type: "number",
        default: "445",
        required: false,
      },
      {
        name: "root_folder_path",
        type: "string",
        default: "/",
        required: false,
      },
      {
        name: "order_by",
        type: "select",
        options: "name,size,modified",
        default: "name",
        required: false,
      },
      {
        name: "order_direction",
        type: "select",
        options: "asc,desc",
        default: "asc",
        required: false,
      },
    ],
    config: {
      name: "SMB",
      local_sort: true,
      only_local: false,
      only_proxy: true,
      no_cache: true,
      no_upload: false,
      need_ms: false,
      default_root: "/",
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
  if (!db.settings) {
    db.settings = []
  }
  for (const item of body) {
    const idx = db.settings.findIndex((s: any) => s.key === item.key)
    if (idx !== -1) {
      db.settings[idx].value = item.value
      if (item.group !== undefined) {
        db.settings[idx].group = item.group
      }
    } else {
      db.settings.push(item)
    }
  }

  // Deduplicate any duplicates by key
  const seenKeys = new Set<string>()
  db.settings = db.settings.filter((s: any) => {
    if (!s.key) return false
    if (seenKeys.has(s.key)) return false
    seenKeys.add(s.key)
    return true
  })

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
  const groupKeys = new Set(groupDefaults.map((s: any) => s.key))
  db.settings = db.settings.filter((s: any) => !groupKeys.has(s.key))
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

function randomAdminToken(length = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let res = ""
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return res
}

adminRouter.post("/setting/reset_token", async (c) => {
  const db = await getDb(c.env)
  const token = randomAdminToken(32)

  const idx = (db.settings || []).findIndex((s: any) => s.key === "token")
  if (idx !== -1) {
    db.settings[idx].value = token
    if (db.settings[idx].group !== 5 && db.settings[idx].group !== 0) {
      db.settings[idx].group = 5
    }
  } else {
    if (!db.settings) db.settings = []
    db.settings.push({
      key: "token",
      value: token,
      type: "string",
      help: "115 / PikPak / Thunder Token",
      group: 5,
      flag: 0,
    })
  }

  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: token })
})

const updateSettingValue = async (
  env: any,
  pairs: Record<string, string | undefined>,
  group = 14,
) => {
  const db = await getDb(env)
  if (!db.settings) {
    db.settings = []
  }
  for (const [k, v] of Object.entries(pairs)) {
    if (v === undefined) continue
    const idx = db.settings.findIndex((s: any) => s.key === k)
    if (idx !== -1) {
      db.settings[idx].value = v
    } else {
      db.settings.push({
        key: k,
        value: v,
        type: "string",
        help: k,
        group,
        flag: 0,
      })
    }
  }
  await saveDb(db, env)
}

adminRouter.post("/setting/set_115", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, { "115_temp_dir": body.temp_dir || "" })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/set_115_open", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, { "115_open_temp_dir": body.temp_dir || "" })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/set_123_pan", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, {
    "123_pan_temp_dir": body.temp_dir || "",
    "123_temp_dir": body.temp_dir || "",
  })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/set_123_open", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, {
    "123_open_temp_dir": body.temp_dir || "",
    "123_open_callback_url": body.callback_url || "",
  })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/set_pikpak", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, { pikpak_temp_dir: body.temp_dir || "" })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/set_thunder", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, { thunder_temp_dir: body.temp_dir || "" })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/set_thunder_browser", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, {
    thunder_browser_temp_dir: body.temp_dir || "",
  })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/set_thunderx", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await updateSettingValue(c.env, { thunderx_temp_dir: body.temp_dir || "" })
  return c.json({ code: 200, message: "success", data: "success" })
})

adminRouter.post("/setting/reset_token", async (c) => {
  const newToken =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2)
  await updateSettingValue(c.env, { token: newToken })
  return c.json({ code: 200, message: "success", data: newToken })
})

adminRouter.get("/meta/list", async (c) => {
  const db = await getDb(c.env)
  return c.json({
    code: 200,
    message: "success",
    data: { content: db.metas, total: db.metas.length },
  })
})

adminRouter.get("/meta/get", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb(c.env)
  const meta = (db.metas || []).find((m: any) => m.id === id)
  if (!meta) {
    return c.json({ code: 404, message: "meta not found", data: null })
  }
  return c.json({ code: 200, message: "success", data: meta })
})

adminRouter.post("/meta/create", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)
  if (!db.metas) db.metas = []

  const path =
    "/" +
    String(body.path || "")
      .split("/")
      .filter(Boolean)
      .join("/")
  if (!path || path === "/") {
    return c.json({ code: 400, message: "path is required", data: null })
  }
  if (db.metas.some((m: any) => m.path === path)) {
    return c.json({ code: 400, message: "meta already exists", data: null })
  }

  const newMeta = {
    id: db.metas.length ? Math.max(...db.metas.map((m: any) => m.id)) + 1 : 1,
    path,
    password: body.password || "",
    read_users: body.read_users || [],
    read_users_sub: !!body.read_users_sub,
    write_users: body.write_users || [],
    write_users_sub: !!body.write_users_sub,
    p_sub: !!body.p_sub,
    write: !!body.write,
    w_sub: !!body.w_sub,
    hide: body.hide || "",
    h_sub: !!body.h_sub,
    readme: body.readme || "",
    r_sub: !!body.r_sub,
    header: body.header || "",
    header_sub: !!body.header_sub,
  }
  db.metas.push(newMeta)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: newMeta })
})

adminRouter.post("/meta/update", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = await getDb(c.env)
  if (!db.metas) db.metas = []

  const idx = db.metas.findIndex((m: any) => m.id === body.id)
  if (idx === -1) {
    return c.json({ code: 404, message: "meta not found", data: null })
  }

  const path =
    body.path !== undefined
      ? "/" + String(body.path).split("/").filter(Boolean).join("/")
      : db.metas[idx].path
  if (path && db.metas.some((m: any) => m.path === path && m.id !== body.id)) {
    return c.json({ code: 400, message: "meta already exists", data: null })
  }

  db.metas[idx] = {
    ...db.metas[idx],
    ...(path ? { path } : {}),
    password:
      body.password !== undefined ? body.password : db.metas[idx].password,
    read_users:
      body.read_users !== undefined
        ? body.read_users
        : db.metas[idx].read_users,
    read_users_sub:
      body.read_users_sub !== undefined
        ? !!body.read_users_sub
        : db.metas[idx].read_users_sub,
    write_users:
      body.write_users !== undefined
        ? body.write_users
        : db.metas[idx].write_users,
    write_users_sub:
      body.write_users_sub !== undefined
        ? !!body.write_users_sub
        : db.metas[idx].write_users_sub,
    p_sub: body.p_sub !== undefined ? !!body.p_sub : db.metas[idx].p_sub,
    write: body.write !== undefined ? !!body.write : db.metas[idx].write,
    w_sub: body.w_sub !== undefined ? !!body.w_sub : db.metas[idx].w_sub,
    hide: body.hide !== undefined ? body.hide : db.metas[idx].hide,
    h_sub: body.h_sub !== undefined ? !!body.h_sub : db.metas[idx].h_sub,
    readme: body.readme !== undefined ? body.readme : db.metas[idx].readme,
    r_sub: body.r_sub !== undefined ? !!body.r_sub : db.metas[idx].r_sub,
    header: body.header !== undefined ? body.header : db.metas[idx].header,
    header_sub:
      body.header_sub !== undefined
        ? !!body.header_sub
        : db.metas[idx].header_sub,
  }
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

adminRouter.post("/meta/delete", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb(c.env)
  if (!db.metas) db.metas = []
  db.metas = db.metas.filter((m: any) => m.id !== id)
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
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

// Index progress stub — background indexing is not supported in stateless Workers
adminRouter.get("/index/progress", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: { total: 0, current: 0, speed: 0 },
  })
})

// Scan progress stub — background scanning is not supported in stateless Workers
adminRouter.get("/scan/progress", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: { total: 0, current: 0, speed: 0 },
  })
})

// --- Plugin Management API ---
adminRouter.get("/plugin/list", async (c) => {
  const db = await getDb(c.env)
  if (!db.plugins) db.plugins = []
  return c.json({
    code: 200,
    message: "success",
    data: {
      content: db.plugins,
      total: db.plugins.length,
    },
  })
})

adminRouter.get("/plugin/get", async (c) => {
  const id = c.req.query("id")
  if (!id) {
    return c.json({ code: 400, message: "id is required", data: null })
  }
  const db = await getDb(c.env)
  if (!db.plugins) db.plugins = []
  const plugin = db.plugins.find((p: any) => p.id === id)
  if (!plugin) {
    return c.json({ code: 404, message: "Plugin not found", data: null })
  }
  return c.json({ code: 200, message: "success", data: plugin })
})

adminRouter.post("/plugin/install", async (c) => {
  try {
    const body = await c.req.json()
    let pluginData = body

    // Support install by manifest URL
    if (body.manifest_url && typeof body.manifest_url === "string") {
      try {
        const resp = await fetch(body.manifest_url)
        if (!resp.ok) {
          return c.json({
            code: 400,
            message: `Failed to fetch plugin manifest from URL: HTTP ${resp.status}`,
            data: null,
          })
        }
        const fetchedManifest = await resp.json()
        pluginData = { ...fetchedManifest, ...body }
      } catch (err: any) {
        return c.json({
          code: 400,
          message: `Network error fetching plugin manifest: ${safeErrorMessage(err, "unexpected network error")}`,
          data: null,
        })
      }
    }

    if (!pluginData.id || !pluginData.name) {
      return c.json({
        code: 400,
        message: "Plugin id and name are required",
        data: null,
      })
    }

    const db = await getDb(c.env)
    if (!db.plugins) db.plugins = []

    const existingIndex = db.plugins.findIndex(
      (p: any) => p.id === pluginData.id,
    )
    const now = new Date().toISOString()
    const newPlugin = {
      id: pluginData.id,
      name: pluginData.name,
      version: pluginData.version || "1.0.0",
      description: pluginData.description || "",
      author: pluginData.author || "Unknown",
      homepage: pluginData.homepage || "",
      repository: pluginData.repository || "",
      icon: pluginData.icon || "",
      type: pluginData.type || "ui",
      enabled:
        pluginData.enabled !== undefined ? Boolean(pluginData.enabled) : true,
      high_privilege: Boolean(pluginData.high_privilege),
      permissions: Array.isArray(pluginData.permissions)
        ? pluginData.permissions
        : [],
      entry_url: pluginData.entry_url || "",
      script_content: pluginData.script_content || "",
      style_content: pluginData.style_content || "",
      config_schema: pluginData.config_schema || [],
      config_values:
        pluginData.config_values || pluginData.default_config || {},
      target_hooks: pluginData.target_hooks || ["global"],
      is_builtin: Boolean(pluginData.is_builtin),
      tags: pluginData.tags || [],
      created_at:
        existingIndex >= 0 ? db.plugins[existingIndex].created_at : now,
      updated_at: now,
    }

    if (existingIndex >= 0) {
      db.plugins[existingIndex] = newPlugin
    } else {
      db.plugins.push(newPlugin)
    }

    await saveDb(db, c.env)
    return c.json({
      code: 200,
      message: "Plugin installed successfully",
      data: newPlugin,
    })
  } catch (err: any) {
    return c.json({
      code: 500,
      message: err.message || "Failed to install plugin",
      data: null,
    })
  }
})

adminRouter.post("/plugin/update", async (c) => {
  try {
    const body = await c.req.json()
    if (!body.id) {
      return c.json({ code: 400, message: "Plugin id is required", data: null })
    }

    const db = await getDb(c.env)
    if (!db.plugins) db.plugins = []

    const index = db.plugins.findIndex((p: any) => p.id === body.id)
    if (index === -1) {
      return c.json({ code: 404, message: "Plugin not found", data: null })
    }

    const current = db.plugins[index]
    const updated = {
      ...current,
      ...body,
      id: current.id, // prevent ID mutation
      updated_at: new Date().toISOString(),
    }

    db.plugins[index] = updated
    await saveDb(db, c.env)

    return c.json({
      code: 200,
      message: "Plugin updated successfully",
      data: updated,
    })
  } catch (err: any) {
    return c.json({
      code: 500,
      message: err.message || "Failed to update plugin",
      data: null,
    })
  }
})

adminRouter.post("/plugin/toggle", async (c) => {
  try {
    const body = await c.req.json()
    if (!body.id) {
      return c.json({ code: 400, message: "Plugin id is required", data: null })
    }

    const db = await getDb(c.env)
    if (!db.plugins) db.plugins = []

    const index = db.plugins.findIndex((p: any) => p.id === body.id)
    if (index === -1) {
      return c.json({ code: 404, message: "Plugin not found", data: null })
    }

    const targetEnabled =
      body.enabled !== undefined
        ? Boolean(body.enabled)
        : !db.plugins[index].enabled

    db.plugins[index].enabled = targetEnabled
    db.plugins[index].updated_at = new Date().toISOString()
    await saveDb(db, c.env)

    return c.json({
      code: 200,
      message: targetEnabled ? "Plugin enabled" : "Plugin disabled",
      data: { id: body.id, enabled: targetEnabled },
    })
  } catch (err: any) {
    return c.json({
      code: 500,
      message: err.message || "Failed to toggle plugin",
      data: null,
    })
  }
})

adminRouter.post("/plugin/delete", async (c) => {
  try {
    const queryId = c.req.query("id")
    let id = queryId
    if (!id) {
      try {
        const body = await c.req.json()
        id = body.id
      } catch {}
    }

    if (!id) {
      return c.json({ code: 400, message: "Plugin id is required", data: null })
    }

    const db = await getDb(c.env)
    if (!db.plugins) db.plugins = []

    const initialLen = db.plugins.length
    db.plugins = db.plugins.filter((p: any) => p.id !== id)

    if (db.plugins.length === initialLen) {
      return c.json({ code: 404, message: "Plugin not found", data: null })
    }

    await saveDb(db, c.env)
    return c.json({
      code: 200,
      message: "Plugin deleted successfully",
      data: null,
    })
  } catch (err: any) {
    return c.json({
      code: 500,
      message: err.message || "Failed to delete plugin",
      data: null,
    })
  }
})

adminRouter.post("/plugin/batch_save", async (c) => {
  try {
    const body = await c.req.json()
    const plugins = Array.isArray(body) ? body : body.plugins
    if (!Array.isArray(plugins)) {
      return c.json({
        code: 400,
        message: "plugins array is required",
        data: null,
      })
    }

    const db = await getDb(c.env)
    db.plugins = plugins
    await saveDb(db, c.env)

    return c.json({
      code: 200,
      message: "Plugins saved successfully",
      data: { count: plugins.length },
    })
  } catch (err: any) {
    return c.json({
      code: 500,
      message: err.message || "Failed to batch save plugins",
      data: null,
    })
  }
})
