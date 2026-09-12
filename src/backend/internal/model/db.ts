import { encrypt, decrypt } from "../../pkg/crypto"
import {
  generateSecret,
  readPersistedSecret,
  setJsonEnvCtx,
  writePersistedSecret,
} from "./store/json"
import { getStoreBackend } from "./store/backend"

// 保持外部（middlewares.ts / router.ts / admin.ts）对 getKvBinding / getKvStatus
// 的既有引用不变，从 json 后端 re-export。
export {
  getKvBinding,
  getKvStatus,
  readPersistedSecret,
  writePersistedSecret,
} from "./store/json"
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
      value: "https://res.oplist.org/logo/logo.svg",
      type: "string",
      help: "Site Logo URL",
      group: 2,
      flag: 0,
    },
    {
      key: "favicon",
      value: "https://res.oplist.org/logo/logo.svg",
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
      key: "seed_site_url",
      value: "",
      type: "string",
      help: "Public site URL used by transfer seed sources",
      group: 4,
      flag: 1,
    },
    {
      key: "seed_default_matrix",
      value: "{\"md5\":{\"whole\":true,\"pieces\":false},\"sha1\":{\"whole\":true,\"pieces\":false},\"sha256\":{\"whole\":true,\"pieces\":false}}",
      type: "text",
      help: "Default transfer seed hash matrix",
      group: 4,
      flag: 1,
    },
    {
      key: "seed_format_policies",
      value: "{\"oss\":\"off\",\"torrent\":\"off\",\"cas\":\"off\"}",
      type: "text",
      help: "Automatic transfer seed format policies",
      group: 4,
      flag: 1,
    },
    {
      key: "seed_auto_generate_policy",
      value: "off",
      type: "select",
      options: "off,on",
      help: "Global automatic transfer seed policy",
      group: 4,
      flag: 1,
    },
    {
      key: "seed_single_direct_preview",
      value: "false",
      type: "bool",
      help: "Open single-file transfer seeds directly in preview",
      group: 4,
      flag: 0,
    },
    {
      key: "seed_cas_direct_access",
      value: "false",
      type: "bool",
      help: "When opening a single-file CAS seed, immediately rapid-upload it into the same folder and preview the restored file",
      group: 4,
      flag: 0,
    },
    {
      key: "seed_default_trackers",
      value: "",
      type: "text",
      help: "Default tracker list offered when generating torrent seeds (one tracker per line)",
      group: 4,
      flag: 1,
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
    from: ["", "/logo.png", "https://res.oplist.org/logo/logo.png"],
    to: "https://res.oplist.org/logo/logo.svg",
  },
  favicon: {
    from: ["", "/favicon.png"],
    to: "https://res.oplist.org/logo/logo.svg",
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

// FIX(备份恢复 / meta 丢失): loadDb 此前对 settings/storages/shares/plugins 都做了
// 兜底，唯独漏了 metas。旧 KV 数据若不含 metas 字段，getDb() 返回的 db.metas 为
// undefined，meta/list 会因 db.metas.length 直接 500，meta/create 虽自行兜底，
// 但列表读取始终失败，表现为「恢复后 metas 一条都看不到」。
const ensureDefaultMetas = (db: any) => {
  if (!db) return
  if (!db.metas || !Array.isArray(db.metas)) {
    db.metas = []
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
      await unsealDb(persisted, await getEncryptionKey(activeEnv))
      memoryDb = persisted
      ensureDefaultSettings(memoryDb)
      ensureDefaultStorages(memoryDb)
      ensureDefaultShares(memoryDb)
      ensureDefaultPlugins(memoryDb)
      ensureDefaultMetas(memoryDb)
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
    ensureDefaultMetas(memoryDb)
    return memoryDb
  }

  // Priority 2: In-Memory DB（模块级，进程内共享；重启即失，仅用于本地调试）
  memoryDb = JSON.parse(JSON.stringify(defaultDb))
  ensureDefaultStorages(memoryDb)
  ensureDefaultShares(memoryDb)
  ensureDefaultPlugins(memoryDb)
  ensureDefaultMetas(memoryDb)
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
// 改动。密钥统一取 JWT_SECRET（签名与加密共用）；未配置时跳过加密，
// 保持既有部署（无密钥）向后兼容。已存在的明文数据不带前缀，unseal 时原样
// 返回，不会因升级而丢失。
// ============================================================
const ENCRYPTION_PREFIX = "enc:v1:"

const SENSITIVE_SETTING_KEYS = new Set([
  "token",
  "sso_client_secret",
  "sso_client_id",
  "ldap_bind_password",
  "ldap_bind_dn",
  "ocr_api",
  "handle_hook_after_writing",
])

let encryptionKeyWarned = false

/**
 * 字段加密密钥的持久化键名。
 *
 * 注意：这是 **KV 存储槽位名**，不是环境变量名。历史部署已用它存过密钥，
 * 改名会导致既有密文无法解密，故保持不变。
 */
export const ENCRYPTION_SECRET_KV_KEY = "openlist_encryption_secret"

/**
 * 解析「环境变量中显式配置的」字段加密密钥。
 *
 * 约定：字段加密与 JWT 签名都优先使用 JWT_SECRET 环境变量。
 * 但两者在「未配置 env」时的持久化槽位是独立的
 * （加密 → openlist_encryption_secret，签名 → openlist_jwt_secret），
 * 因此未配置 JWT_SECRET 的部署中二者会是不同的随机值——这不影响正确性，
 * 加密与签名本就无需同钥。
 *
 * 长度不足 16 视为未配置，避免弱密钥。
 *
 * 该来源具有**最高优先级且恒定不变**：只要它存在，seal 与 unseal
 * 都必须使用它，从而保证加解密对称。
 */
function readEnvEncryptionKey(env: any): string | null {
  const raw =
    env?.JWT_SECRET ||
    (typeof process !== "undefined" ? process.env?.JWT_SECRET : "")
  return typeof raw === "string" && raw.length >= 16 ? raw : null
}

/** 进程内缓存：避免每次 load/save 都读存储 */
let cachedEncryptionKey: string | null = null
/** 缓存值是否来自环境变量（来自 env 的最高优先级，不会被持久化值替换） */
let cachedFromEnv = false

/**
 * 获取字段加密密钥（只读，绝不生成）。
 *
 * 优先级：
 *   1. env.JWT_SECRET
 *   2. 持久化密钥 openlist_encryption_secret（由 setup 阶段写入）
 *
 * 关键约束（保证加解密对称）：
 *   - 生成只发生在 setup，见 ensureEncryptionSecret()。此处绝不生成，
 *     否则一次瞬时读取失败就会换钥，导致既有密文永久无法解密。
 *   - 环境变量一旦配置，就始终优先于持久化密钥，且不会被其覆盖，
 *     这样运维显式指定的密钥总是生效。
 */
async function getEncryptionKey(envCtx?: any): Promise<string | null> {
  const env =
    envCtx ||
    globalEnvCtx ||
    (typeof process !== "undefined" ? process.env : {})

  // 环境变量优先级最高：每次都要先看，避免被此前的持久化缓存挡住。
  const envKey = readEnvEncryptionKey(env)
  if (envKey) {
    if (!cachedFromEnv || cachedEncryptionKey !== envKey) {
      cachedEncryptionKey = envKey
      cachedFromEnv = true
    }
    return envKey
  }

  // 已从持久化解析过则复用
  if (cachedEncryptionKey && !cachedFromEnv) return cachedEncryptionKey

  // 回退到持久化密钥（仅读取）
  try {
    const persisted = await readPersistedSecret(env, ENCRYPTION_SECRET_KV_KEY)
    if (persisted && persisted.length >= 16) {
      cachedEncryptionKey = persisted
      cachedFromEnv = false
      return persisted
    }
  } catch {
    // 读取失败按未配置处理
  }

  if (!encryptionKeyWarned) {
    encryptionKeyWarned = true
    console.error(
      "[DB] No encryption key available: set JWT_SECRET. " +
        "Sensitive fields would otherwise be written in plaintext.",
    )
  }
  return null
}

/**
 * 加密密钥是否已就绪（**绕过进程内缓存**，直查真实来源）。
 *
 * 用途：供 `/public/init_status` 向前端暴露「后端是否已准备好接受登录」。
 *
 * 为什么需要绕过缓存：setup 完成后，同一实例的缓存里必然有密钥；但
 * 用户实际登录请求很可能落在**另一个实例**（其缓存为空，需重新读 KV）。
 * 只有真实来源（env 或 KV 持久化）可读，才代表**任意实例**都能解密。
 *
 * @returns true 表示任意实例都能取得密钥
 */
export async function isEncryptionReady(envCtx?: any): Promise<boolean> {
  const env =
    envCtx ||
    globalEnvCtx ||
    (typeof process !== "undefined" ? process.env : {})

  // 环境变量存在即永远就绪
  if (readEnvEncryptionKey(env)) return true

  // 直查持久化（不走缓存）
  try {
    const persisted = await readPersistedSecret(env, ENCRYPTION_SECRET_KV_KEY)
    return Boolean(persisted && persisted.length >= 16)
  } catch {
    return false
  }
}

/**
 * 初始化阶段确保字段加密密钥存在。只在 setup 流程中调用。
 *
 * 行为（与 getEncryptionKey 使用完全相同的优先级，避免加解密分裂）：
 *   1. 环境变量已配置 → 直接采用，不写持久化（尊重运维配置）
 *   2. 持久化密钥已存在 → 复用（存在性门控，永不覆盖）
 *   3. 都不存在 → 生成 → 写入 → **回读校验（带重试）**
 *
 * ## 为什么必须「写后回读校验」
 *
 * Cloudflare KV / EdgeOne KV 等**最终一致**存储存在写入传播延迟：
 * 刚 `put` 的键，紧接着 `get` 可能返回 null（跨隔离实例尤其明显）。
 *
 * 若 setup 写入密钥后直接返回，会出现严重故障：
 *   - setup 请求（实例 I₁）生成密钥 A 并写入，用 A 加密密码落盘；
 *   - 紧随其后的登录请求可能落在**另一个实例 I₂**，其缓存为空，
 *     重新读 KV 时 A 尚未传播 → 读到 null → `getEncryptionKey` 返回 null
 *     → `unsealDb` 跳过解密 → `password` 保持 `enc:v1:` 密文
 *     → `verifyUserPassword` 判定非 64 位 hex → **密码认证失败**。
 *   - 等待数十秒后 KV 传播完成，又能登录（「过一会就好了」）。
 *
 * 因此这里在写入后**主动回读确认**，读不到则按指数退避重试，直到
 * 密钥真正可读（或超出重试上限，明确报错而非静默返回）。
 * 这样 setup 只有在密钥**确实可被后续请求读到**时才报告成功。
 *
 * 并发安全：用进程内单飞（inflight 合并）消除同一实例内的重复生成。
 *
 * @returns 密钥；无法确定时返回 null 并说明原因
 */
let ensureSecretInflight: Promise<string | null> | null = null

/** 写后回读重试参数：总等待上限约 1.9s（0.1+0.2+0.4+0.8+... 封顶） */
const SECRET_VERIFY_RETRIES = 6
const SECRET_VERIFY_BASE_MS = 100
const SECRET_VERIFY_MAX_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function ensureEncryptionSecret(envCtx?: any): Promise<string | null> {
  // 进程内单飞：并发 setup 只生成一次
  if (ensureSecretInflight) return ensureSecretInflight

  ensureSecretInflight = (async () => {
    const env =
      envCtx ||
      globalEnvCtx ||
      (typeof process !== "undefined" ? process.env : {})

    // 1. 环境变量优先。
    //    必须与 getEncryptionKey 完全一致，否则会出现「setup 生成随机密钥，
    //    而后续请求使用环境变量密钥」的分裂：同一份数据被两个密钥加解密，
    //    已加密的密码永远解不开，表现为「初始化成功但密码不正确」。
    const envKey = readEnvEncryptionKey(env)
    if (envKey) return envKey

    // 2. 已存在则复用（存在性门控，永不覆盖）
    const existing = await readPersistedSecret(env, ENCRYPTION_SECRET_KV_KEY)
    if (existing && existing.length >= 16) {
      cachedEncryptionKey = existing
      cachedFromEnv = false
      return existing
    }

    // 3. 生成并写入
    const generated = generateSecret()
    const ok = await writePersistedSecret(env, ENCRYPTION_SECRET_KV_KEY, generated)
    if (!ok) {
      console.error(
        "[DB] Failed to persist an encryption key. Sensitive fields will be " +
          "stored in plaintext until JWT_SECRET is configured via environment variable.",
      )
      return null
    }

    // 4. 写后回读校验（关键）：确保密钥已传播，后续请求能读到同一密钥。
    //    立即设缓存，保证**本实例**后续调用（saveDb 加密）与写入值一致。
    cachedEncryptionKey = generated
    cachedFromEnv = false

    let delay = SECRET_VERIFY_BASE_MS
    for (let i = 0; i < SECRET_VERIFY_RETRIES; i++) {
      const readBack = await readPersistedSecret(env, ENCRYPTION_SECRET_KV_KEY)
      if (readBack === generated) {
        console.log(
          `[DB] Generated and persisted a new encryption key ` +
            `(verified after ${i} retr${i === 1 ? "y" : "ies"})`,
        )
        return generated
      }
      // 读到的值不是我们写的那把（可能被并发 setup 覆盖）：说明存在竞态，
      // 采用「先写入者优先」——复用已存在的密钥，避免用两把钥匙加解密。
      if (readBack && readBack.length >= 16 && readBack !== generated) {
        console.warn(
          "[DB] A different encryption key already exists; adopting it to " +
            "keep encrypt/decrypt symmetric.",
        )
        cachedEncryptionKey = readBack
        cachedFromEnv = false
        return readBack
      }
      // 尚未传播：退避重试
      await sleep(delay)
      delay = Math.min(delay * 2, SECRET_VERIFY_MAX_MS)
    }

    // 超出重试上限：密钥写入成功但暂时读不回。返回它并让本实例缓存生效，
    // 但明确告警——此时跨实例的首次登录可能短暂失败，稍后自动恢复。
    console.warn(
      `[DB] Encryption key written but not yet readable after ` +
        `${SECRET_VERIFY_RETRIES} retries. Cross-instance reads may lag ` +
        `briefly due to eventual consistency; retry shortly.`,
    )
    return generated
  })()

  try {
    return await ensureSecretInflight
  } finally {
    // 释放单飞锁：下次调用重新走完整检查（密钥已持久化，会命中步骤 2）
    ensureSecretInflight = null
  }
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
      "[DB] Failed to decrypt a sealed secret (wrong JWT_SECRET?):",
      e,
    )
    return value // keep raw value, never lose data
  }
}

async function sealDb(data: any, key: string | null): Promise<any> {
  if (!key || !data) return data
  const copy = JSON.parse(JSON.stringify(data))
  
  // 1. 加密存储配置中的 addition 字段（网盘凭据）
  for (const s of copy.storages || []) {
    if (!s || !s.addition) continue
    const str =
      typeof s.addition === "string" ? s.addition : JSON.stringify(s.addition)
    if (str && str !== "{}") {
      s.addition = await sealValue(str, key)
    }
  }
  
  // 2. 加密敏感的系统设置
  for (const st of copy.settings || []) {
    if (st && SENSITIVE_SETTING_KEYS.has(st.key) && st.value) {
      st.value = await sealValue(String(st.value), key)
    }
  }
  
  // 3. 加密用户敏感信息
  for (const u of copy.users || []) {
    // OTP 密钥
    if (u && u.otp_secret) {
      u.otp_secret = await sealValue(String(u.otp_secret), key)
    }
    // 密码二次加密（defense-in-depth，即使已哈希也加密存储）
    if (u && u.password) {
      u.password = await sealValue(String(u.password), key)
    }
  }
  
  return copy
}

async function unsealDb(data: any, key: string | null): Promise<void> {
  if (!key || !data) return
  
  // 1. 解密存储配置
  for (const s of data.storages || []) {
    if (
      s &&
      typeof s.addition === "string" &&
      s.addition.startsWith(ENCRYPTION_PREFIX)
    ) {
      s.addition = await unsealValue(s.addition, key)
    }
  }
  
  // 2. 解密系统设置
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
  
  // 3. 解密用户信息
  for (const u of data.users || []) {
    // OTP 密钥
    if (
      u &&
      typeof u.otp_secret === "string" &&
      u.otp_secret.startsWith(ENCRYPTION_PREFIX)
    ) {
      u.otp_secret = await unsealValue(u.otp_secret, key)
    }
    // 密码解密
    if (
      u &&
      typeof u.password === "string" &&
      u.password.startsWith(ENCRYPTION_PREFIX)
    ) {
      u.password = await unsealValue(u.password, key)
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
    console.log(
      `[DB] saveDb: sealing and persisting to ${backend.name}, storages=${data.storages?.length || 0}`,
    )
    const sealed = await sealDb(data, await getEncryptionKey(activeEnv))
    console.log(
      `[DB] saveDb: sealed data size=${JSON.stringify(sealed).length} bytes`,
    )
    await backend.save(sealed, activeEnv)
  } catch (err: any) {
    console.error(
      `[DB] saveDb FAILED: backend=${backend.name}, error=${err?.message || err}`,
      `stack=${err?.stack?.substring(0, 500) || ""}`,
    )
    throw new Error(
      `[DB] Failed to persist config (${backend.name}); the change was NOT saved: ${err?.message || err}`,
    )
  }

  console.log(
    `[DB] Successfully persisted ${data.storages?.length || 0} storages to ${backend.name}`,
  )
  return true
}

export async function resolvePath(virtualPath: string, envCtx?: any) {
  const db = await getDb(envCtx)

  // ============ 路径遍历防护增强 (2026-09-08) ============
  // 1. URL 解码（防止 %2e%2e 等编码绕过）
  let path = virtualPath
  try {
    path = decodeURIComponent(String(path || ""))
  } catch {
    // 解码失败，使用原始值
  }
  
  // 2. 多重解码检测（防止双重编码绕过）
  let prevPath = ""
  let decodeAttempts = 0
  while (path !== prevPath && decodeAttempts < 3) {
    prevPath = path
    try {
      const decoded = decodeURIComponent(path)
      if (decoded === path) break // 没有更多编码
      path = decoded
      decodeAttempts++
    } catch {
      break
    }
  }
  
  // 3. 规范化路径分隔符和特殊字符
  path = path
    .replace(/\\/g, "/")              // 反斜杠 -> 正斜杠
    .replace(/%5c/gi, "/")            // URL 编码的反斜杠
    .replace(/%2f/gi, "/")            // URL 编码的正斜杠
    .replace(/\.{3,}/g, "..")         // 多个点规范化为 ..
    .replace(/\/+/g, "/")             // 多个斜杠合并为一个
  
  // 4. 检测非法字符
  const illegalChars = ["\0", "\r", "\n", "\t"]
  for (const ch of illegalChars) {
    if (path.includes(ch)) {
      throw new Error(`invalid path: illegal character detected (0x${ch.charCodeAt(0).toString(16)})`)
    }
  }
  
  // 5. Windows 绝对路径检测
  if (/^[A-Za-z]:/.test(path)) {
    throw new Error("invalid path: absolute Windows path not allowed")
  }
  
  // 6. UNC 路径检测
  if (path.startsWith("//") || path.startsWith("\\\\")) {
    throw new Error("invalid path: UNC path not allowed")
  }

  // Normalize ".." / "." segments so callers cannot escape the storage
  // mount root (path traversal). A leading ".." that pops an empty stack
  // is clamped to the root instead of escaping upward.
  const stack: string[] = []
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue
    if (seg === "..") {
      stack.pop()
      continue
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
