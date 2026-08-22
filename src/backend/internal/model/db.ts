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
      value: "OpenListNext",
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
      value: "openlistnext",
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
}

let memoryDb: any = null
let globalEnvCtx: any = null

/**
 * 在请求处理开始时注入当前环境的 KV binding 上下文。
 * CF Workers 每个实例的模块级 globalEnvCtx 初始为 null，且请求会被负载均衡到
 * 不同实例——若不设置，getDb()/saveDb() 会退回内存模式，导致 KV 中的配置
 * （含网盘账号密码、access_token）读取/持久化失败。
 */
export function setEnvCtx(env: any) {
  if (env) globalEnvCtx = env
}

/**
 * Universal KV Storage Adapter for EdgeOne Makers / Cloudflare Workers
 */
export function getKvBinding(envCtx?: any): {
  binding: any
  platform: string
  mode: "binding" | "api" | "none"
} {
  if (envCtx) {
    globalEnvCtx = envCtx
  }
  const env =
    envCtx ||
    globalEnvCtx ||
    (typeof process !== "undefined" ? process.env : {})
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {}

  // 允许通过环境变量指定自定义绑定的 KV 变量名
  const customKvName =
    (env && (env.EDGEONE_KV_NAME || env.KV_NAMESPACE || env.KV_NAME)) ||
    g.EDGEONE_KV_NAME ||
    g.KV_NAMESPACE

  const candidates = [
    customKvName,
    "EDGEONE_KV",
    "edgeone_kv",
    "EO_KV",
    "eo_kv",
    "OPENLISTNEXT_KV",
    "openlistnext_kv",
    "OPENLISTNEXT_KV_ID",
    "KV",
    "kv",
    "CF_KV",
    "cf_kv",
    "DATABASE_KV",
    "database_kv",
    "openlist_kv",
    "OPENLIST_KV",
  ].filter(Boolean) as string[]

  for (const name of candidates) {
    const b = (env && env[name]) || g[name]
    if (b && typeof b.get === "function" && typeof b.put === "function") {
      const isEdgeOne =
        name.toLowerCase().includes("edgeone") ||
        name.toLowerCase().includes("eo") ||
        Boolean(env && (env.EDGEONE || env.EO_REGION || env.EDGEONE_KV_NAME)) ||
        Boolean(g.EDGEONE_KV || g.EO_KV || g.edgeone_kv)
      const platformName = isEdgeOne
        ? `EdgeOne KV (${name})`
        : `Cloudflare / EdgeOne KV (${name})`

      return {
        binding: b,
        platform: platformName,
        mode: "binding",
      }
    }
  }

  // 动态扫描 env / globalThis 下任意实现了 get 和 put 的 KV 对象
  if (env && typeof env === "object") {
    for (const key of Object.keys(env)) {
      const b = env[key]
      if (
        b &&
        typeof b === "object" &&
        typeof b.get === "function" &&
        typeof b.put === "function"
      ) {
        return {
          binding: b,
          platform: `EdgeOne / Cloudflare KV (${key})`,
          mode: "binding",
        }
      }
    }
  }

  // Cloudflare REST API Check
  const cfAccountId =
    env.CF_ACCOUNT_ID ||
    (typeof process !== "undefined" ? process.env.CF_ACCOUNT_ID : "")
  const cfNamespaceId =
    env.CF_KV_NAMESPACE_ID ||
    (typeof process !== "undefined" ? process.env.CF_KV_NAMESPACE_ID : "")
  const cfApiToken =
    env.CF_API_TOKEN ||
    (typeof process !== "undefined" ? process.env.CF_API_TOKEN : "")

  if (cfAccountId && cfNamespaceId && cfApiToken) {
    return {
      binding: {
        type: "cf_rest",
        accountId: cfAccountId,
        namespaceId: cfNamespaceId,
        token: cfApiToken,
      },
      platform: "Cloudflare KV (REST API)",
      mode: "api",
    }
  }

  return { binding: null, platform: "Memory", mode: "none" }
}

async function readFromKv(
  kvInfo: ReturnType<typeof getKvBinding>,
  key = "openlistnext_config",
): Promise<any | null> {
  const { binding, mode } = kvInfo
  if (mode === "none" || !binding) return null

  try {
    if (mode === "binding") {
      let val: any = null
      try {
        val = await binding.get(key, "text")
      } catch {
        try {
          val = await binding.get(key)
        } catch {}
      }
      if (val === undefined || val === null) {
        try {
          val = await binding.get(key)
        } catch {}
      }
      if (!val) return null
      if (typeof val === "object") return val
      if (typeof val === "string") {
        try {
          return JSON.parse(val)
        } catch {
          return null
        }
      }
    } else if (binding.type === "cf_rest") {
      const url = `https://api.cloudflare.com/client/v4/accounts/${binding.accountId}/storage/kv/namespaces/${binding.namespaceId}/values/${key}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${binding.token}` },
      })
      if (res.ok) {
        const text = await res.text()
        return JSON.parse(text)
      }
    }
  } catch (err) {
    console.error("[KV Store] Error reading key:", key, err)
  }
  return null
}

async function saveToKv(
  kvInfo: ReturnType<typeof getKvBinding>,
  key: string,
  data: any,
): Promise<boolean> {
  const { binding, mode } = kvInfo
  if (mode === "none" || !binding) return false

  const valStr = JSON.stringify(data)

  try {
    if (mode === "binding") {
      await binding.put(key, valStr)
      return true
    } else if (binding.type === "cf_rest") {
      const url = `https://api.cloudflare.com/client/v4/accounts/${binding.accountId}/storage/kv/namespaces/${binding.namespaceId}/values/${key}`
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${binding.token}`,
          "Content-Type": "text/plain",
        },
        body: valStr,
      })
      return res.ok
    }
  } catch (err) {
    console.error("[KV Store] Error writing key:", key, err)
  }
  return false
}

// 已知的旧默认值 → 当前默认值迁移表。
// 修复「开发环境(无 KV，用新默认值)与生产环境(KV 里保存了旧默认值)不一致」：
// 早期默认 logo/favicon 为空或 res.oplist.org 旧地址、site_title=OpenList、
// home_icon=openlist，品牌统一后默认值已更新，但已写入 KV 的旧值不会被
// ensureDefaultSettings 的「仅补缺失 key」逻辑覆盖，导致 prod 显示旧图标/标题。
const LEGACY_SETTING_MIGRATIONS: Record<string, { from: any[]; to: string }> = {
  logo: {
    from: ["", "https://res.oplist.org/logo/logo.png"],
    to: "/logo.png",
  },
  favicon: {
    from: ["", "https://res.oplist.org/logo/logo.svg"],
    to: "/favicon.png",
  },
  site_title: {
    from: ["OpenList"],
    to: "OpenListNext",
  },
  home_icon: {
    from: ["openlist", "oplist"],
    to: "openlistnext",
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
  if (!Array.isArray(db.settings)) {
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
    if (s && s.key && !seenKeys.has(s.key)) {
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
  if (!Array.isArray(db.storages)) {
    db.storages = []
  }
}

const ensureDefaultShares = (db: any) => {
  if (!db) return
  if (!Array.isArray(db.shares)) {
    db.shares = []
  }
}

export const getDb = async (envCtx?: any) => {
  if (envCtx) {
    globalEnvCtx = envCtx
  }

  // Priority 1: Cloudflare / EdgeOne KV Namespace Storage
  const kvInfo = getKvBinding(envCtx)
  if (kvInfo.mode !== "none") {
    try {
      const kvConfig = await readFromKv(kvInfo, "openlistnext_config")
      if (kvConfig && typeof kvConfig === "object") {
        memoryDb = kvConfig
        ensureDefaultSettings(memoryDb)
        ensureDefaultStorages(memoryDb)
        ensureDefaultShares(memoryDb)
        return memoryDb
      }
    } catch (err) {
      console.error("[DB] Error reading config from KV:", err)
    }
  }

  if (memoryDb) {
    ensureDefaultSettings(memoryDb)
    ensureDefaultStorages(memoryDb)
    ensureDefaultShares(memoryDb)
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
      return memoryDb
    } catch (err) {
      console.error("Failed to parse DATABASE_JSON env variable:", err)
    }
  }

  // Priority 3: In-Memory DB
  memoryDb = JSON.parse(JSON.stringify(defaultDb))
  ensureDefaultSettings(memoryDb)
  ensureDefaultStorages(memoryDb)
  ensureDefaultShares(memoryDb)
  return memoryDb
}

export const saveDb = async (data: any, envCtx?: any) => {
  if (envCtx) {
    globalEnvCtx = envCtx
  }
  memoryDb = data

  // Save to KV Namespace
  const kvInfo = getKvBinding(envCtx)
  if (kvInfo.mode !== "none") {
    const success = await saveToKv(kvInfo, "openlistnext_config", data).catch(
      (err) => {
        console.error("[DB] Failed to save to KV:", err)
        return false
      },
    )
    if (success) {
      console.log(
        `[DB] Successfully persisted ${data.storages?.length || 0} storages to KV (${kvInfo.platform})`,
      )
    }
  } else {
    console.warn(
      "[DB] WARNING: No KV binding found! Storage configuration changes will exist only in memory!",
    )
  }
}

export async function getKvStatus(envCtx?: any) {
  const kvInfo = getKvBinding(envCtx)
  const isConfigured = kvInfo.mode !== "none"
  let connected = false
  let error: string | null = null

  if (isConfigured) {
    try {
      const testVal = await readFromKv(kvInfo, "openlistnext_config")
      connected = true
      return {
        configured: true,
        connected: true,
        platform: kvInfo.platform,
        mode: kvInfo.mode,
        hasData: !!testVal,
        error: null,
      }
    } catch (err: any) {
      error = err.message || String(err)
    }
  }

  return {
    configured: isConfigured,
    connected,
    platform: kvInfo.platform,
    mode: kvInfo.mode,
    hasData: false,
    error,
  }
}

export async function resolvePath(virtualPath: string) {
  const db = await getDb()

  let cleanPath = "/" + virtualPath.split("/").filter(Boolean).join("/")
  if (cleanPath === "") {
    cleanPath = "/"
  }

  const activeStorages = (db.storages || []).filter((s: any) => !s.disabled)

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

      const addition = JSON.parse(storage.addition || "{}")
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
