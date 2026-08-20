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

adminRouter.get("/storage/get", async (c) => {
  const id = parseInt(c.req.query("id") || "0", 10)
  const db = await getDb(c.env)
  const storage = db.storages.find((s: any) => s.id === id)
  if (!storage) {
    return c.json({ code: 404, message: "storage not found", data: null })
  }
  return c.json({ code: 200, message: "success", data: storage })
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
    data: [
      "AliyundriveOpen",
      "GoogleDrive",
      "Onedrive",
      "Quark",
      "123Pan",
      "BaiduNetdisk",
      "115Open",
      "GitHub API",
      "Thunder",
      "ThunderExpert",
      "189Cloud",
      "Lanzou",
    ],
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
