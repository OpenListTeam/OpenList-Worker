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
  plugins: [],
}

let memoryDb: any = null
let globalEnvCtx: any = null

// ---- EdgeOne Blob SDK (HTTP API, avoids Redis RESP protocol crashes) ----
let _blobStore: any = null
let _blobChecked = false

async function getBlobStore(): Promise<any | null> {
  if (_blobChecked) return _blobStore
  _blobChecked = true
  try {
    // @ts-ignore
    const { getStore } = await import("@edgeone/pages-blob")
    // In Makers Functions, projectId/token are auto-injected by the runtime.
    // TypeScript types require them, but the SDK works without them inside Functions.
    _blobStore = getStore({
      name: "openlistnext_db",
      consistency: "strong",
    } as any)
  } catch {
    _blobStore = null
  }
  return _blobStore
}

// ---- Safety net: catch uncaught exceptions from KV binding RESP parser ----
// Only registered in EdgeOne environments (invoked by getKvBinding detection),
// so Cloudflare Workers / local Node.js keep their default global error behavior.
let _respSafetyNetInstalled = false
function installRespSafetyNet() {
  if (_respSafetyNetInstalled) return
  _respSafetyNetInstalled = true
  if (typeof process === "undefined" || typeof process.on !== "function") return
  process.on("uncaughtException", (err: any) => {
    if (
      err?.message?.includes("RESP") ||
      err?.message?.includes("Unknown type") ||
      err?.stack?.includes("processResponses")
    ) {
      console.error(
        "[KV/RESP] Caught uncaught exception from storage binding, continuing:",
        err.message,
      )
      // Do NOT re-throw — let the function instance survive.
      // Subsequent requests will fall back to memoryDb.
    }
    // All other errors: let Node.js default handler process them.
  })
}

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
 * Universal KV / Blob Storage Adapter for EdgeOne Makers & Cloudflare Workers
 *
 * Detection order:
 *   1. @edgeone/pages-blob SDK (EdgeOne — HTTP API, no RESP crashes)
 *   2. KV namespace binding (Cloudflare Workers native)
 *   3. CF REST API (env vars)
 *   4. None (memory fallback)
 */
export async function getKvBinding(envCtx?: any): Promise<{
  binding: any
  platform: string
  mode: "binding" | "blob" | "api" | "none"
}> {
  if (envCtx) {
    globalEnvCtx = envCtx
  }
  const env =
    envCtx ||
    globalEnvCtx ||
    (typeof process !== "undefined" ? process.env : {})
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {}

  // 1. EdgeOne Blob SDK (HTTP API — avoids RESP protocol crashes)
  try {
    const blobStore = await getBlobStore()
    if (blobStore) {
      // Blob SDK only initializes inside the EdgeOne Makers runtime
      installRespSafetyNet()
      return {
        binding: blobStore,
        platform: "EdgeOne Blob (@edgeone/pages-blob, strong consistency)",
        mode: "blob",
      }
    }
  } catch {}

  // 2. KV namespace binding (Cloudflare Workers native — no RESP issues)
  const customKvName =
    (env && (env.EDGEONE_KV_NAME || env.KV_NAMESPACE || env.KV_NAME)) ||
    g.EDGEONE_KV_NAME ||
    g.KV_NAMESPACE

  const candidates = [
    ...(customKvName ? [{ key: customKvName, name: customKvName }] : []),
    { key: "EDGEONE_KV", name: "EDGEONE_KV" },
    { key: "EO_KV", name: "EO_KV" },
    { key: "OPENLISTNEXT_KV", name: "OPENLISTNEXT_KV" },
    { key: "OPENLISTNEXT_KV_ID", name: "OPENLISTNEXT_KV_ID" },
    { key: "KV", name: "KV" },
    { key: "CF_KV", name: "CF_KV" },
    { key: "DATABASE_KV", name: "DATABASE_KV" },
  ]

  for (const c of candidates) {
    const b = (env && env[c.key]) || g[c.key]
    if (
      b &&
      typeof b.get === "function" &&
      (typeof b.put === "function" || typeof b.set === "function")
    ) {
      const isEdgeOne =
        c.key.startsWith("EDGEONE") ||
        c.key.startsWith("EO") ||
        Boolean(env && (env.EDGEONE || env.EO_REGION || env.EDGEONE_KV_NAME)) ||
        Boolean(g.EDGEONE_KV || g.EO_KV)
      if (isEdgeOne) installRespSafetyNet()
      const platformName = isEdgeOne
        ? `EdgeOne KV (${c.name})`
        : `Cloudflare / EdgeOne KV (${c.name})`

      return {
        binding: b,
        platform: platformName,
        mode: "binding",
      }
    }
  }

  // 3. Cloudflare REST API 模式
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
  kvInfo: Awaited<ReturnType<typeof getKvBinding>>,
  key = "openlistnext_config",
): Promise<any | null> {
  const { binding, mode } = kvInfo
  if (mode === "none" || !binding) return null

  try {
    if (mode === "blob") {
      // @edgeone/pages-blob SDK: get(key, { type: "json" }) returns parsed object
      const val = await binding.get(key, { type: "json" })
      if (val) return val
      // Fallback: get as text and parse
      const text = await binding.get(key)
      if (text) {
        return typeof text === "string" ? JSON.parse(text) : text
      }
    } else if (mode === "binding") {
      let val: any = null
      try {
        // Cloudflare KV 支持 (key, "text")，EdgeOne KV 支持 (key)
        val = await binding.get(key, "text")
      } catch {
        val = await binding.get(key)
      }
      if (val === undefined || val === null) {
        val = await binding.get(key)
      }
      if (val) {
        return typeof val === "string" ? JSON.parse(val) : val
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
    console.error("[KV/Blob Store] Error reading key:", key, err)
  }
  return null
}

async function saveToKv(
  kvInfo: Awaited<ReturnType<typeof getKvBinding>>,
  key: string,
  data: any,
): Promise<boolean> {
  const { binding, mode } = kvInfo
  if (mode === "none" || !binding) return false

  const valStr = JSON.stringify(data)

  try {
    if (mode === "blob") {
      // @edgeone/pages-blob SDK: setJSON(key, value) for structured data
      if (typeof binding.setJSON === "function") {
        return (await binding.setJSON(key, data)) !== false
      }
      // Fallback: set(key, stringified)
      if (typeof binding.set === "function") {
        return (await binding.set(key, valStr)) !== false
      }
    } else if (mode === "binding") {
      // NOTE: only an explicit `false` counts as failure. Cloudflare KV's
      // put() resolves to void, so `undefined` must stay a success —
      // otherwise every normal write would be reported as failed.
      if (typeof binding.put === "function") {
        return (await binding.put(key, valStr)) !== false
      }
      if (typeof binding.set === "function") {
        return (await binding.set(key, valStr)) !== false
      }
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
    console.error("[KV/Blob Store] Error writing key:", key, err)
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

  // Priority 1: EdgeOne Blob / Cloudflare KV / EdgeOne KV
  const kvInfo = await getKvBinding(envCtx)
  if (kvInfo.mode !== "none") {
    try {
      const kvConfig = await readFromKv(kvInfo, "openlistnext_config")
      if (kvConfig) {
        memoryDb = kvConfig
        ensureDefaultSettings(memoryDb)
        ensureDefaultStorages(memoryDb)
        ensureDefaultShares(memoryDb)
        ensureDefaultPlugins(memoryDb)
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
export const saveDb = async (data: any, envCtx?: any): Promise<boolean> => {
  if (envCtx) {
    globalEnvCtx = envCtx
  }
  memoryDb = data
  // Refresh the request cache so any getDb() later in this request observes
  // the write rather than a pre-write snapshot.
  if (envCtx) dbCache.set(envCtx, { ts: Date.now(), db: data })

  const kvInfo = await getKvBinding(envCtx)
  if (kvInfo.mode === "none") {
    // No persistence configured — not a failed write, just an unpersisted
    // deployment. Preserve the old non-throwing behavior.
    console.warn(
      "[DB] WARNING: No KV binding found! Storage configuration changes will exist only in memory!",
    )
    return false
  }

  let success = false
  try {
    success = await saveToKv(kvInfo, "openlistnext_config", data)
  } catch (err) {
    console.error("[DB] Failed to save to KV:", err)
    success = false
  }

  if (!success) {
    throw new Error(
      `[DB] Failed to persist config to KV (${kvInfo.platform}); the change was NOT saved`,
    )
  }

  console.log(
    `[DB] Successfully persisted ${data.storages?.length || 0} storages to KV (${kvInfo.platform})`,
  )
  return true
}

export async function getKvStatus(envCtx?: any) {
  const kvInfo = await getKvBinding(envCtx)
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
