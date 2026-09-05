import { encrypt, decrypt } from "../../pkg/crypto"
import { setJsonEnvCtx } from "./store/json"
import { getStoreBackend } from "./store/backend"

// 保持外部（middlewares.ts / router.ts / admin.ts）对 getKvBinding / getKvStatus
// 的既有引用不变，从 json 后端 re-export。
export { getKvBinding, getKvStatus } from "./store/json"
export { getStoreStatus } from "./store/backend"

// Global default configuration payload for Cloudflare Workers
export const defaultDb = {
  settings: [
    // Group 1: SITE (https://doc.oplist.org/configuration/site)
    {
      key: "version",
      value: "v4.2.3",
      type: "string",
      help: "Application Version",
      group: 1,
      flag: 1,
    },
    {
      key: "site_title",
      value: "OpenList",
      type: "string",
      help: "Site Title",
      group: 1,
      flag: 0,
    },
    {
      key: "announcement",
      value: "",
      type: "text",
      help: "Site Announcement",
      group: 1,
      flag: 0,
    },
    {
      key: "pagination_type",
      value: "pagination",
      type: "select",
      options: "all,pagination,load_more,auto_load_more",
      help: "Pagination Type",
      group: 1,
      flag: 0,
    },
    {
      key: "default_page_size",
      value: "20",
      type: "number",
      help: "Default Page Size",
      group: 1,
      flag: 0,
    },
    {
      key: "allow_indexed",
      value: "false",
      type: "bool",
      help: "Allow Search Engine Indexing",
      group: 1,
      flag: 0,
    },
    {
      key: "allow_mounted",
      value: "true",
      type: "bool",
      help: "Allow Mounted Storages",
      group: 1,
      flag: 0,
    },
    {
      key: "robots_txt",
      value: "User-agent: *\nDisallow: /",
      type: "text",
      help: "Robots Txt Content",
      group: 1,
      flag: 0,
    },

    // Group 2: STYLE (https://doc.oplist.org/configuration/style)
    {
      key: "logo",
      value: "/logo.png",
      type: "string",
      help: "Site Logo URL",
      group: 2,
      flag: 0,
    },
    {
      key: "favicon",
      value: "/favicon.png",
      type: "string",
      help: "Favicon URL",
      group: 2,
      flag: 0,
    },
    {
      key: "main_color",
      value: "#1890ff",
      type: "string",
      help: "Main Theme Color",
      group: 2,
      flag: 0,
    },
    {
      key: "home_icon",
      value: "openlist",
      type: "string",
      help: "Home Icon Name",
      group: 2,
      flag: 0,
    },
    {
      key: "home_container",
      value: "max_980px",
      type: "select",
      options: "max_980px,hope_container",
      help: "Home Container Width",
      group: 2,
      flag: 0,
    },
    {
      key: "settings_layout",
      value: "responsive",
      type: "select",
      options: "list,responsive",
      help: "Settings Layout Mode",
      group: 2,
      flag: 0,
    },

    // Group 3: PREVIEW (https://doc.oplist.org/configuration/preview)
    {
      key: "text_types",
      value:
        "txt,htm,html,xml,java,properties,sql,js,json,c,cpp,python,py,php,go,rst,css,typescript,ts,log,conf,yaml,yml,cmd,bash,sh,vue,ini",
      type: "text",
      help: "Text File Extensions",
      group: 3,
      flag: 0,
    },
    {
      key: "audio_types",
      value: "mp3,ogg,aac,wav,wma,flac,m4a,opus",
      type: "text",
      help: "Audio File Extensions",
      group: 3,
      flag: 0,
    },
    {
      key: "video_types",
      value: "mp4,mkv,webm,avi,mov,flv,m3u8,ts",
      type: "text",
      help: "Video File Extensions",
      group: 3,
      flag: 0,
    },
    {
      key: "image_types",
      value: "jpg,png,jpeg,gif,bmp,svg,ico,webp,avif,tiff",
      type: "text",
      help: "Image File Extensions",
      group: 3,
      flag: 0,
    },
    {
      key: "proxy_types",
      value: "",
      type: "text",
      help: "Proxy File Extensions",
      group: 3,
      flag: 0,
    },
    {
      key: "proxy_ignore_headers",
      value: "",
      type: "text",
      help: "Proxy Ignore Headers",
      group: 3,
      flag: 0,
    },
    {
      key: "external_previews",
      value: "{}",
      type: "text",
      help: "External Previews JSON Config",
      group: 3,
      flag: 0,
    },
    {
      key: "iframe_previews",
      value: "{}",
      type: "text",
      help: "Iframe Previews JSON Config",
      group: 3,
      flag: 0,
    },
    {
      key: "audio_cover",
      value: "https://file.nn.ci/alist/cover.png",
      type: "string",
      help: "Audio Default Cover Image URL",
      group: 3,
      flag: 0,
    },
    {
      key: "audio_autoplay",
      value: "false",
      type: "bool",
      help: "Autoplay Audio",
      group: 3,
      flag: 0,
    },
    {
      key: "video_autoplay",
      value: "false",
      type: "bool",
      help: "Autoplay Video",
      group: 3,
      flag: 0,
    },
    {
      key: "preview_archives_by_default",
      value: "false",
      type: "bool",
      help: "Preview Archives By Default",
      group: 3,
      flag: 0,
    },
    {
      key: "readme_autorender",
      value: "true",
      type: "bool",
      help: "Readme Autorender",
      group: 3,
      flag: 0,
    },
    {
      key: "filter_readme_scripts",
      value: "true",
      type: "bool",
      help: "Filter Readme Scripts",
      group: 3,
      flag: 0,
    },
    {
      key: "force_preview",
      value: "",
      type: "text",
      help: "Force Preview Config",
      group: 3,
      flag: 0,
    },
    {
      key: "specify_preview",
      value: "",
      type: "text",
      help: "Specify Preview Layout Config",
      group: 3,
      flag: 0,
    },
    {
      key: "markdown_autorender",
      value: "true",
      type: "bool",
      help: "Autorender Markdown",
      group: 3,
      flag: 0,
    },
    {
      key: "code_editor_theme",
      value: "vs-dark",
      type: "select",
      options: "vs,vs-dark,hc-black",
      help: "Monaco Theme",
      group: 3,
      flag: 0,
    },
    {
      key: "office_preview",
      value: "true",
      type: "bool",
      help: "Enable Office Document Preview",
      group: 3,
      flag: 0,
    },
    {
      key: "pdf_preview",
      value: "true",
      type: "bool",
      help: "Enable PDF Preview",
      group: 3,
      flag: 0,
    },

    // Group 4: GLOBAL (https://doc.oplist.org/configuration/global)
    {
      key: "hide_files",
      value: "",
      type: "text",
      help: "Files Regex to Hide",
      group: 4,
      flag: 0,
    },
    {
      key: "package_download",
      value: "true",
      type: "bool",
      help: "Package Download Enabled",
      group: 4,
      flag: 0,
    },
    {
      key: "customize_head",
      value: "",
      type: "text",
      help: "Custom Head HTML/CSS",
      group: 4,
      flag: 0,
    },
    {
      key: "customize_body",
      value: "",
      type: "text",
      help: "Custom Body Script",
      group: 4,
      flag: 0,
    },
    {
      key: "link_expiration",
      value: "0",
      type: "number",
      help: "Link Expiration in Seconds",
      group: 4,
      flag: 0,
    },
    {
      key: "sign_all",
      value: "false",
      type: "bool",
      help: "Sign All Download Links",
      group: 4,
      flag: 0,
    },
    {
      key: "privacy_regs",
      value: "",
      type: "text",
      help: "Privacy Regex Rules",
      group: 4,
      flag: 0,
    },
    {
      key: "ocr_api",
      value: "",
      type: "string",
      help: "OCR API Endpoint",
      group: 4,
      flag: 0,
    },
    {
      key: "filename_char_mapping",
      value: "{}",
      type: "text",
      help: "Filename Char Mapping JSON",
      group: 4,
      flag: 0,
    },
    {
      key: "forward_direct_link_params",
      value: "",
      type: "string",
      help: "Forward Direct Link Params",
      group: 4,
      flag: 0,
    },
    {
      key: "ignore_direct_link_params",
      value: "",
      type: "string",
      help: "Ignore Direct Link Params",
      group: 4,
      flag: 0,
    },
    {
      key: "webauthn_login_enabled",
      value: "false",
      type: "bool",
      help: "Webauthn Login Enabled",
      group: 4,
      flag: 0,
    },
    {
      key: "allow_previewing_sharing_files",
      value: "true",
      type: "bool",
      help: "Allow Previewing Sharing Files",
      group: 4,
      flag: 0,
    },
    {
      key: "allow_previewing_sharing_archives",
      value: "true",
      type: "bool",
      help: "Allow Previewing Sharing Archives",
      group: 4,
      flag: 0,
    },
    {
      key: "force_proxy_sharing_files",
      value: "false",
      type: "bool",
      help: "Force Proxy Sharing Files",
      group: 4,
      flag: 0,
    },
    {
      key: "share_summary_content",
      value: "",
      type: "text",
      help: "Share Summary Content",
      group: 4,
      flag: 0,
    },
    {
      key: "handle_hook_after_writing",
      value: "",
      type: "string",
      help: "Handle Hook After Writing",
      group: 4,
      flag: 0,
    },
    {
      key: "handle_hook_rate_limit",
      value: "0",
      type: "number",
      help: "Handle Hook Rate Limit",
      group: 4,
      flag: 0,
    },
    {
      key: "ignore_system_files",
      value: "true",
      type: "bool",
      help: "Ignore System Files (.DS_Store, desktop.ini, etc.)",
      group: 4,
      flag: 0,
    },
    {
      key: "auto_update_index",
      value: "false",
      type: "bool",
      help: "Auto Update Search Index",
      group: 4,
      flag: 0,
    },

    // Group 7: SSO
    {
      key: "sso_login_enabled",
      value: "false",
      type: "bool",
      help: "Enable SSO Login",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_login_platform",
      value: "",
      type: "select",
      options: "Github,Microsoft,Google,Dingtalk,Casdoor,OIDC",
      help: "SSO Platform",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_client_id",
      value: "",
      type: "string",
      help: "SSO Client ID",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_client_secret",
      value: "",
      type: "string",
      help: "SSO Client Secret",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_login_url",
      value: "",
      type: "string",
      help: "SSO Authorization Endpoint",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_token_url",
      value: "",
      type: "string",
      help: "SSO Token Endpoint (optional, defaults per platform)",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_userinfo_url",
      value: "",
      type: "string",
      help: "SSO UserInfo Endpoint (optional, defaults per platform)",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_scopes",
      value: "",
      type: "string",
      help: "SSO OAuth2 Scopes (optional, space separated)",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_oidc_discovery_url",
      value: "",
      type: "string",
      help: "OIDC Discovery URL (for OIDC platform)",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_login_callback_url",
      value: "",
      type: "string",
      help: "SSO Redirect/Callback URL (optional, defaults to /api/auth/sso_callback)",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_compatibility_mode",
      value: "false",
      type: "bool",
      help: "SSO Compatibility Mode (postMessage token handoff)",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_auto_register",
      value: "false",
      type: "bool",
      help: "Auto Register New SSO Users",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_default_dir",
      value: "/",
      type: "string",
      help: "SSO Default Directory for New Users",
      group: 7,
      flag: 0,
    },
    {
      key: "sso_default_permission",
      value: "0",
      type: "number",
      help: "SSO Default Permission for New Users",
      group: 7,
      flag: 0,
    },

    // Group 8: LDAP
    {
      key: "ldap_host",
      value: "",
      type: "string",
      help: "LDAP Server Host",
      group: 8,
      flag: 0,
    },
    {
      key: "ldap_port",
      value: "389",
      type: "number",
      help: "LDAP Server Port",
      group: 8,
      flag: 0,
    },

    // Group 10: TRAFFIC
    {
      key: "traffic_limit",
      value: "0",
      type: "number",
      help: "Traffic Limit in MB",
      group: 10,
      flag: 0,
    },
    {
      key: "ip_limit",
      value: "0",
      type: "number",
      help: "IP Rate Limit Per Minute",
      group: 10,
      flag: 0,
    },

    // Group 14: OTHER (https://doc.oplist.org/configuration/other)
    // 115 / 123 / PikPak / Thunder Temp Directories
    {
      key: "115_temp_dir",
      value: "",
      type: "string",
      help: "115 Temp Directory",
      group: 14,
      flag: 0,
    },
    {
      key: "115_open_temp_dir",
      value: "",
      type: "string",
      help: "115 Open Temp Directory",
      group: 14,
      flag: 0,
    },
    {
      key: "123_temp_dir",
      value: "",
      type: "string",
      help: "123 Pan Temp Directory",
      group: 14,
      flag: 0,
    },
    {
      key: "123_open_temp_dir",
      value: "",
      type: "string",
      help: "123 Open Temp Directory",
      group: 14,
      flag: 0,
    },
    {
      key: "123_open_callback_url",
      value: "",
      type: "string",
      help: "123 Open Callback URL",
      group: 14,
      flag: 0,
    },
    {
      key: "pikpak_temp_dir",
      value: "",
      type: "string",
      help: "PikPak Temp Directory",
      group: 14,
      flag: 0,
    },
    {
      key: "thunder_temp_dir",
      value: "",
      type: "string",
      help: "Thunder Temp Directory",
      group: 14,
      flag: 0,
    },
    {
      key: "thunder_browser_temp_dir",
      value: "",
      type: "string",
      help: "Thunder Browser Temp Directory",
      group: 14,
      flag: 0,
    },
    {
      key: "thunderx_temp_dir",
      value: "",
      type: "string",
      help: "ThunderX Temp Directory",
      group: 14,
      flag: 0,
    },

    // 115 / PikPak / Thunder
    {
      key: "token",
      value: "",
      type: "string",
      help: "115 / PikPak / Thunder Token",
      group: 14,
      flag: 0,
    },

    // Miscellaneous
    {
      key: "package_download_disabled",
      value: "false",
      type: "bool",
      help: "Disable Package Download",
      group: 14,
      flag: 0,
    },
  ],
  storages: [],
  users: [
    {
      id: 1,
      username: "admin",
      password: "",
      role: 2,
      permission: 0,
      base_path: "/",
      disabled: false,
      sso_id: "",
      allow_ldap: false,
      pwd_update_at: new Date().toISOString(),
    },
    {
      id: 2,
      username: "guest",
      password: "",
      role: 1,
      permission: 0,
      base_path: "/",
      disabled: false,
      sso_id: "",
      allow_ldap: false,
      pwd_update_at: new Date().toISOString(),
    },
  ],
  metas: [],
  shares: [],
  plugins: [],
}

let memoryDb: any = null
let globalEnvCtx: any = null

/**
 * 在请求处理开始时注入当前环境的持久化后端上下文。
 * CF Workers 每个实例的模块级 globalEnvCtx 初始为 null，且请求会被负载均衡到
 * 不同实例——若不设置，getDb()/saveDb() 会退回内存模式，导致配置
 * （含网盘账号密码、access_token）读取/持久化失败。
 */
export function setEnvCtx(env: any) {
  if (env) {
    globalEnvCtx = env
    setJsonEnvCtx(env)
  }
}

// 已知的旧默认值 → 当前默认值迁移表。
// 修复「开发环境(无 KV，用新默认值)与生产环境(KV 里保存了旧默认值)不一致」：
// 早期默认 logo/favicon 为空或 res.oplist.org 旧地址，已写入 KV 的旧值不会被
// ensureDefaultSettings 的「仅补缺失 key」逻辑覆盖，导致 prod 显示旧图标。
const LEGACY_SETTING_MIGRATIONS: Record<string, { from: any[]; to: string }> = {
  logo: {
    from: ["", "https://res.oplist.org/logo/logo.png"],
    to: "/logo.png",
  },
  favicon: {
    from: ["", "https://res.oplist.org/logo/logo.svg"],
    to: "/favicon.png",
  },
  // 上游 OpenList 的 home_container 默认是 max_980px（内容限宽 980px 居中），
  // 本项目早期误把默认值设为 hope_container（HopeUI Container 无 maxW，流式全宽），
  // 导致首页文件列表横向铺满整屏。已写入 KV 的旧默认值需要迁移回限宽布局。
  home_container: {
    from: ["hope_container"],
    to: "max_980px",
  },
}

const ensureDefaultSettings = (db: any) => {
  if (!db) return
  if (!db.settings) {
    db.settings = []
  }
  let modified = false
  const newSettings: any[] = []
  const seenKeys = new Set<string>()

  for (const defSetting of defaultDb.settings) {
    seenKeys.add(defSetting.key)
    const matching = db.settings.filter((s: any) => s.key === defSetting.key)
    if (matching.length === 0) {
      newSettings.push(JSON.parse(JSON.stringify(defSetting)))
      modified = true
    } else {
      // If duplicates existed in KV/storage, pick the one with non-empty value if available
      const chosen =
        matching.find((s: any) => s.value && s.value.trim() !== "") ||
        matching[0]
      if (
        chosen.group !== defSetting.group ||
        chosen.help !== defSetting.help ||
        chosen.type !== defSetting.type ||
        chosen.options !== defSetting.options ||
        chosen.flag !== defSetting.flag
      ) {
        chosen.group = defSetting.group
        chosen.help = defSetting.help
        chosen.type = defSetting.type
        chosen.options = defSetting.options
        chosen.flag = defSetting.flag
        modified = true
      }
      if (matching.length > 1) {
        modified = true
      }
      // 旧默认值迁移：KV 中保存的值若等于已知旧默认值，更新为当前默认
      const migration = LEGACY_SETTING_MIGRATIONS[defSetting.key]
      if (migration && migration.from.includes(chosen.value)) {
        chosen.value = migration.to
        modified = true
      }
      newSettings.push(chosen)
    }
  }

  // Preserve any custom user-added settings not present in defaultDb
  for (const s of db.settings) {
    if (s.key && !seenKeys.has(s.key)) {
      seenKeys.add(s.key)
      newSettings.push(s)
    }
  }

  if (modified || newSettings.length !== db.settings.length) {
    db.settings = newSettings
    saveDb(db).catch(() => {})
  }
}

const ensureDefaultStorages = (db: any) => {
  if (!db) return
  if (!db.storages || !Array.isArray(db.storages)) {
    db.storages = []
  } else {
    // Sanitize any corrupt or invalid storages (e.g. driver is undefined/null/empty)
    db.storages = db.storages.filter(
      (s: any) =>
        s &&
        typeof s === "object" &&
        typeof s.driver === "string" &&
        s.driver.trim() !== "" &&
        s.driver !== "undefined" &&
        s.driver !== "null" &&
        typeof s.mount_path === "string" &&
        s.mount_path.trim() !== "",
    )
  }
}

const ensureDefaultShares = (db: any) => {
  if (!db) return
  if (!db.shares) {
    db.shares = []
  }
}

const ensureDefaultPlugins = (db: any) => {
  if (!db) return
  if (!db.plugins) {
    db.plugins = []
  }
}

/**
 * Request-scoped memoization for getDb().
 *
 * A single /api/fs/list triggers 6-8 full KV reads plus a full JSON.parse of
 * the config. Alibaba ESA caps a request at exactly 8 KV subrequests, so one
 * directory listing could exhaust the budget on its own.
 *
 * Two layers:
 *  1. in-flight de-duplication — concurrent callers share one KV read.
 *  2. short-TTL memoization — sequential calls within a request reuse it.
 *
 * Trade-off worth knowing: on Workers `env` is shared across requests within
 * an isolate, so a cache hung directly on it would never expire.
 * AsyncLocalStorage would give exact per-request scope but is unavailable on
 * EdgeOne/ESA/Vercel (nodejs_compat is only declared in wrangler.toml). A 1s
 * TTL is the portable middle ground — worst case a concurrent isolate sees
 * config up to 1s stale, and saveDb() refreshes the cache on every write.
 *
 * TODO: threading `db` down from the handler gives exact per-request scope,
 * but touches all ~83 call sites.
 */
const DB_CACHE_TTL_MS = 1000
const dbCache = new WeakMap<object, { ts: number; db: any }>()
const dbInflight = new WeakMap<object, Promise<any>>()

const loadDb = async (envCtx?: any) => {
  if (envCtx) {
    globalEnvCtx = envCtx
  }

  // Priority 1: 持久化后端（json/KV/Blob、D1、MySQL）
  // 注意：envCtx 可能为空（如 resolvePath 等内部调用 getDb() 不传 env）。
  // 此时必须回退到请求级 globalEnvCtx，否则 readDriver 读不到 DB_DRIVER、
  // getD1 读不到 DB binding，会错误回退到 json 后端读到旧的 KV 数据。
  const activeEnv = envCtx || globalEnvCtx
  const backend = await getStoreBackend(activeEnv)
  try {
    const persisted = await backend.load(activeEnv)
    if (persisted) {
      await unsealDb(persisted, getEncryptionKey(activeEnv))
      memoryDb = persisted
      ensureDefaultSettings(memoryDb)
      ensureDefaultStorages(memoryDb)
      ensureDefaultShares(memoryDb)
      ensureDefaultPlugins(memoryDb)
      return memoryDb
    }
  } catch (err) {
    console.error(`[DB] Error reading config from ${backend.name}:`, err)
  }

  if (memoryDb) {
    ensureDefaultSettings(memoryDb)
    ensureDefaultStorages(memoryDb)
    ensureDefaultShares(memoryDb)
    ensureDefaultPlugins(memoryDb)
    return memoryDb
  }

  // Priority 2: Environment Variable
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.DATABASE_JSON
  ) {
    try {
      memoryDb = JSON.parse(process.env.DATABASE_JSON)
      ensureDefaultSettings(memoryDb)
      ensureDefaultStorages(memoryDb)
      ensureDefaultShares(memoryDb)
      ensureDefaultPlugins(memoryDb)
      return memoryDb
    } catch (err) {
      console.error("Failed to parse DATABASE_JSON env variable:", err)
    }
  }

  // Priority 3: In-Memory DB
  memoryDb = JSON.parse(JSON.stringify(defaultDb))
  ensureDefaultStorages(memoryDb)
  ensureDefaultShares(memoryDb)
  ensureDefaultPlugins(memoryDb)
  return memoryDb
}

export const getDb = async (envCtx?: any) => {
  if (envCtx) {
    globalEnvCtx = envCtx
  }
  // envCtx is the cache key — without it there is nothing safe to scope to.
  if (!envCtx) return loadDb(envCtx)

  // 1) Concurrent de-duplication: concurrent callers share a single KV read.
  const pending = dbInflight.get(envCtx)
  if (pending) return pending

  // 2) Short-TTL memoization: sequential calls in one request reuse the result.
  const hit = dbCache.get(envCtx)
  if (hit && Date.now() - hit.ts < DB_CACHE_TTL_MS) return hit.db

  const promise = loadDb(envCtx)
    .then((db) => {
      dbCache.set(envCtx, { ts: Date.now(), db })
      return db
    })
    .finally(() => {
      dbInflight.delete(envCtx)
    })
  dbInflight.set(envCtx, promise)
  return promise
}

/**
 * Persist the config. Returns whether the write actually landed.
 *
 * FIX: persistence failures used to be swallowed here with a console.error and
 * a void return, so callers could not tell a saved change from a lost one.
 * The next read would then fall back to defaults and silently overwrite real
 * config — the "config reverted to default" SEV2 in the incident report.
 *
 * Throwing is deliberately scoped to *failed writes*: when no KV binding is
 * configured at all (in-memory / container mode) this keeps the historical
 * warn-and-continue behavior, so unpersisted deployments are not broken by it.
 */
// ============================================================
// 静态加密（At-rest encryption）
// 修复 H-1：网盘 token/secret/OTP 等敏感字段此前以明文 JSON 落 KV/Blob。
// 这里在「持久化边界」做字段级加密（落盘前 seal、读盘后 unseal），内存中
// 始终保持明文，因此 resolvePath / parseAddition / 各驱动 / admin 接口均无需
// 改动。密钥优先取 ENCRYPTION_SECRET，回退 JWT_SECRET；两者皆无时跳过加密，
// 保持既有部署（无密钥）向后兼容。已存在的明文数据不带前缀，unseal 时原样
// 返回，不会因升级而丢失。
// ============================================================
const ENCRYPTION_PREFIX = "enc:v1:"

const SENSITIVE_SETTING_KEYS = new Set(["token", "sso_client_secret"])

let encryptionKeyWarned = false

function getEncryptionKey(envCtx?: any): string | null {
  const env =
    envCtx ||
    globalEnvCtx ||
    (typeof process !== "undefined" ? process.env : {})
  const key =
    env?.ENCRYPTION_SECRET ||
    env?.JWT_SECRET ||
    (typeof process !== "undefined" ? process.env?.ENCRYPTION_SECRET : "") ||
    (typeof process !== "undefined" ? process.env?.JWT_SECRET : "")
  const resolved = key && String(key).length >= 16 ? String(key) : null
  if (!resolved && !encryptionKeyWarned) {
    encryptionKeyWarned = true
    console.error(
      "[DB] ENCRYPTION_SECRET / JWT_SECRET 未配置：网盘 token/secret 等敏感字段将以明文落盘。生产环境请务必配置 >=16 字符的 ENCRYPTION_SECRET。",
    )
  }
  return resolved
}

async function sealValue(value: string, key: string): Promise<string> {
  if (!value) return value
  if (value.startsWith(ENCRYPTION_PREFIX)) return value // idempotent
  return ENCRYPTION_PREFIX + (await encrypt(value, key))
}

async function unsealValue(value: string, key: string): Promise<string> {
  if (!value || !value.startsWith(ENCRYPTION_PREFIX)) return value
  try {
    return await decrypt(value.slice(ENCRYPTION_PREFIX.length), key)
  } catch (e) {
    console.warn(
      "[DB] Failed to decrypt a sealed secret (wrong ENCRYPTION_SECRET/JWT_SECRET?):",
      e,
    )
    return value // keep raw value, never lose data
  }
}

async function sealDb(data: any, key: string | null): Promise<any> {
  if (!key || !data) return data
  const copy = JSON.parse(JSON.stringify(data))
  for (const s of copy.storages || []) {
    if (!s || !s.addition) continue
    const str =
      typeof s.addition === "string" ? s.addition : JSON.stringify(s.addition)
    if (str && str !== "{}") {
      s.addition = await sealValue(str, key)
    }
  }
  for (const st of copy.settings || []) {
    if (st && SENSITIVE_SETTING_KEYS.has(st.key) && st.value) {
      st.value = await sealValue(String(st.value), key)
    }
  }
  for (const u of copy.users || []) {
    if (u && u.otp_secret) {
      u.otp_secret = await sealValue(String(u.otp_secret), key)
    }
  }
  return copy
}

async function unsealDb(data: any, key: string | null): Promise<void> {
  if (!key || !data) return
  for (const s of data.storages || []) {
    if (
      s &&
      typeof s.addition === "string" &&
      s.addition.startsWith(ENCRYPTION_PREFIX)
    ) {
      s.addition = await unsealValue(s.addition, key)
    }
  }
  for (const st of data.settings || []) {
    if (
      st &&
      SENSITIVE_SETTING_KEYS.has(st.key) &&
      typeof st.value === "string" &&
      st.value.startsWith(ENCRYPTION_PREFIX)
    ) {
      st.value = await unsealValue(st.value, key)
    }
  }
  for (const u of data.users || []) {
    if (
      u &&
      typeof u.otp_secret === "string" &&
      u.otp_secret.startsWith(ENCRYPTION_PREFIX)
    ) {
      u.otp_secret = await unsealValue(u.otp_secret, key)
    }
  }
}

export const saveDb = async (data: any, envCtx?: any): Promise<boolean> => {
  if (envCtx) {
    globalEnvCtx = envCtx
  }
  memoryDb = data
  // Refresh the request cache so any getDb() later in this request observes
  // the write rather than a pre-write snapshot.
  if (envCtx) dbCache.set(envCtx, { ts: Date.now(), db: data })

  const activeEnv = envCtx || globalEnvCtx
  const backend = await getStoreBackend(activeEnv)
  const configured = backend.isConfigured
    ? await backend.isConfigured(activeEnv)
    : true
  if (!configured) {
    // No persistence configured — not a failed write, just an unpersisted
    // deployment. Preserve the old non-throwing behavior.
    console.warn(
      "[DB] WARNING: No persistence backend configured! Storage configuration changes will exist only in memory!",
    )
    return false
  }

  try {
    // 落盘前对敏感字段做静态加密（H-1），内存中的 data 保持明文
    const sealed = await sealDb(data, getEncryptionKey(activeEnv))
    await backend.save(sealed, activeEnv)
  } catch (err: any) {
    throw new Error(
      `[DB] Failed to persist config (${backend.name}); the change was NOT saved: ${err?.message || err}`,
    )
  }

  console.log(
    `[DB] Successfully persisted ${data.storages?.length || 0} storages to ${backend.name}`,
  )
  return true
}

export async function resolvePath(virtualPath: string) {
  const db = await getDb()

  // Normalize ".." / "." segments so callers cannot escape the storage
  // mount root (path traversal). A leading ".." that pops an empty stack
  // is clamped to the root instead of escaping upward.
  const stack: string[] = []
  // FIX(C-2): backslashes must be normalized BEFORE segmenting, not after.
  // The old code split on "/" only, so "..\..\.." stayed a single opaque
  // segment and was pushed verbatim onto the stack; the later
  // .replace(/\\/g,"/") on physicalPath then turned it into real "..",
  // escaping the storage root (CWE-22, verified at runtime).
  for (const seg of String(virtualPath || "")
    .replace(/\\/g, "/")
    .split("/")) {
    if (seg === "" || seg === ".") continue
    if (seg === "..") {
      stack.pop()
      continue
    }
    if (seg.includes("\0")) {
      throw new Error("invalid path: null byte")
    }
    stack.push(seg)
  }
  let cleanPath = "/" + stack.join("/")
  if (cleanPath === "") {
    cleanPath = "/"
  }

  const activeStorages = (db.storages || []).filter(
    (s: any) =>
      !s.disabled &&
      typeof s.driver === "string" &&
      s.driver.trim() !== "" &&
      s.driver !== "undefined" &&
      s.driver !== "null" &&
      typeof s.mount_path === "string" &&
      s.mount_path.trim() !== "",
  )

  if (activeStorages.length === 0) {
    throw new Error(
      "failed get storage: storage not found; please add a storage first",
    )
  }

  const sortedStorages = [...activeStorages].sort((a: any, b: any) => {
    const aMount =
      "/" + (a.mount_path || "").split("/").filter(Boolean).join("/")
    const bMount =
      "/" + (b.mount_path || "").split("/").filter(Boolean).join("/")
    return bMount.length - aMount.length
  })

  for (const storage of sortedStorages) {
    const mount =
      "/" + (storage.mount_path || "").split("/").filter(Boolean).join("/")
    const isRootMount = mount === "/"
    const isMatch =
      isRootMount || cleanPath === mount || cleanPath.startsWith(mount + "/")

    if (isMatch) {
      let relPath = cleanPath
      if (!isRootMount) {
        relPath = cleanPath.slice(mount.length)
      }
      if (!relPath.startsWith("/")) {
        relPath = "/" + relPath
      }

      let addition: any = {}
      try {
        addition =
          typeof storage.addition === "string"
            ? JSON.parse(storage.addition || "{}")
            : storage.addition || {}
      } catch {
        addition = {}
      }
      const defaultRoot = "/"
      let rootFolder =
        addition.root_folder_path !== undefined
          ? addition.root_folder_path
          : defaultRoot

      const parts = [rootFolder, relPath]
        .map((p) => p.replace(/\\/g, "/"))
        .filter((p) => Boolean(p) && p !== "/")
      // Keep root_folder_path intact (e.g. Windows "C:/data" must not be
      // split into segments) while normalizing separators and slashes.
      const physicalPath = (parts.join("/") || "/").replace(/\/{2,}/g, "/")

      // FIX(C-2): defense-in-depth. Even if the normalization above ever
      // regresses, the resolved physical path may never leave rootFolder.
      // A rootFolder of "" or "/" means "no restriction", hence the skip.
      const rootNorm =
        String(rootFolder || "/")
          .replace(/\\/g, "/")
          .replace(/\/+$/, "") || "/"
      if (
        rootNorm !== "/" &&
        physicalPath !== rootNorm &&
        !physicalPath.startsWith(rootNorm + "/")
      ) {
        throw new Error("path traversal blocked: escapes storage root")
      }

      // FIX(H-4): 即使 rootFolder 为 "/"（无限制）从而跳过了上面的 containment
      // 校验，最终物理路径也绝不允许出现 ".." 段。这堵住了「root 挂载的存储
      // 依赖 cleanPath 钳制、而 root_folder_path 本身可能携带 .. 」的纵深缺口。
      if (physicalPath.split("/").includes("..")) {
        throw new Error("path traversal blocked: illegal '..' segment")
      }

      return {
        storage,
        relative: relPath,
        physical: physicalPath,
        rootFolder,
        cleanPath,
        isVirtual: false,
      }
    }
  }

  let isVirtual = false
  for (const storage of activeStorages) {
    const mount =
      "/" + (storage.mount_path || "").split("/").filter(Boolean).join("/")
    if (
      mount !== "/" &&
      mount.startsWith(cleanPath === "/" ? "/" : cleanPath + "/")
    ) {
      isVirtual = true
      break
    }
  }

  if (isVirtual) {
    return {
      storage: null,
      relative: cleanPath,
      physical: null,
      rootFolder: null,
      cleanPath,
      isVirtual: true,
    }
  }

  throw new Error("failed get storage: storage not found")
}

export async function getSettings() {
  const db = await getDb()
  const settingsObj: Record<string, any> = {}
  if (db.settings) {
    db.settings.forEach((s: any) => {
      settingsObj[s.key] = s.value
    })
  }
  return settingsObj
}

export async function getUsers() {
  const db = await getDb()
  return db.users || []
}

export async function getStorages() {
  const db = await getDb()
  return db.storages || []
}

export async function getMetas() {
  const db = await getDb()
  return db.metas || []
}

export async function getPlugins() {
  const db = await getDb()
  return db.plugins || []
}

export interface User {
  id: number
  username: string
  password?: string
  role?: number
  base_path?: string
  permission?: number
  disabled?: boolean
  otp_secret?: string
  ssh_keys?: any[]
  [key: string]: any
}
