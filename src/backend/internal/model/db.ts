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
      value: "all",
      type: "select",
      options: "all,pagination,load_more",
      help: "Pagination Type",
      group: 1,
      flag: 0,
    },
    {
      key: "default_page_size",
      value: "30",
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
      value: "",
      type: "string",
      help: "Site Logo URL",
      group: 2,
      flag: 0,
    },
    {
      key: "favicon",
      value: "",
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
      value: "hope_container",
      type: "select",
      options: "hope_container,max_980px",
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
    {
      key: "customize_head",
      value: "",
      type: "text",
      help: "Custom Head HTML/CSS",
      group: 2,
      flag: 0,
    },
    {
      key: "customize_body",
      value: "",
      type: "text",
      help: "Custom Body Script",
      group: 2,
      flag: 0,
    },

    // Group 3: PREVIEW
    {
      key: "video_autoplay",
      value: "false",
      type: "bool",
      help: "Autoplay Video",
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

    // Group 4: GLOBAL
    {
      key: "auto_update_index",
      value: "false",
      type: "bool",
      help: "Auto Update Search Index",
      group: 4,
      flag: 0,
    },
    {
      key: "hide_files",
      value: "",
      type: "text",
      help: "Files Regex to Hide",
      group: 4,
      flag: 0,
    },
    {
      key: "pagination",
      value: "false",
      type: "bool",
      help: "Enable Pagination",
      group: 4,
      flag: 0,
    },
    {
      key: "default_page_size",
      value: "50",
      type: "number",
      help: "Default Page Size",
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

    // Group 11: TRAFFIC
    {
      key: "traffic_limit",
      value: "0",
      type: "number",
      help: "Traffic Limit in MB",
      group: 11,
      flag: 0,
    },
    {
      key: "ip_limit",
      value: "0",
      type: "number",
      help: "IP Rate Limit Per Minute",
      group: 11,
      flag: 0,
    },

    // Group 9: S3
    {
      key: "s3_access_key_id",
      value: "",
      type: "string",
      help: "S3 Access Key ID",
      group: 9,
      flag: 0,
    },
    {
      key: "s3_secret_access_key",
      value: "",
      type: "string",
      help: "S3 Secret Access Key",
      group: 9,
      flag: 0,
    },
    {
      key: "s3_buckets",
      value: "[]",
      type: "text",
      help: "S3 Buckets",
      group: 9,
      flag: 0,
    },

    // Group 14: OTHER
    {
      key: "package_download_disabled",
      value: "false",
      type: "bool",
      help: "Disable Package Download",
      group: 14,
      flag: 0,
    },
  ],
  storages: [
    {
      id: 1,
      mount_path: "/s3",
      driver: "S3",
      addition: '{"s3_bucket_name":"my-bucket"}',
      disabled: false,
      modified: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: 1,
      username: "admin",
      role: 2,
      permission: 0,
      disabled: false,
      sso_id: "",
      pwd_update_at: new Date().toISOString(),
    },
  ],
  metas: [],
}

let memoryDb: any = null

/**
 * Universal KV Storage Adapter for Cloudflare Workers
 */
export function getKvBinding(envCtx?: any): {
  binding: any
  platform: string
  mode: "binding" | "api" | "none"
} {
  const env = envCtx || (typeof process !== "undefined" ? process.env : {})
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {}

  const candidates = [
    { key: "OPENLIST_KV", name: "OPENLIST_KV" },
    { key: "OPENLIST_KV_ID", name: "OPENLIST_KV_ID" },
    { key: "KV", name: "KV" },
    { key: "CF_KV", name: "CF_KV" },
    { key: "DATABASE_KV", name: "DATABASE_KV" },
  ]

  for (const c of candidates) {
    const b = (env && env[c.key]) || g[c.key]
    if (b && typeof b.get === "function" && typeof b.put === "function") {
      return {
        binding: b,
        platform: "Cloudflare Workers KV (Binding)",
        mode: "binding",
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
  key = "openlist_config",
): Promise<any | null> {
  const { binding, mode } = kvInfo
  if (mode === "none" || !binding) return null

  try {
    if (mode === "binding") {
      const val = await binding.get(key, "text")
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

const ensureDefaultSettings = (db: any) => {
  if (!db) return
  if (!db.settings) {
    db.settings = []
  }
  let modified = false
  for (const defSetting of defaultDb.settings) {
    const exists = db.settings.some((s: any) => s.key === defSetting.key)
    if (!exists) {
      db.settings.push(JSON.parse(JSON.stringify(defSetting)))
      modified = true
    }
  }
  if (modified) {
    saveDb(db).catch(() => {})
  }
}

const ensureDefaultStorages = (db: any) => {
  if (!db) return
  if (!db.storages) {
    db.storages = []
  }
}

export const getDb = async (envCtx?: any) => {
  if (memoryDb) {
    ensureDefaultSettings(memoryDb)
    ensureDefaultStorages(memoryDb)
    return memoryDb
  }

  // Priority 1: Cloudflare KV Namespace Storage
  const kvInfo = getKvBinding(envCtx)
  if (kvInfo.mode !== "none") {
    try {
      console.log(
        `[DB] Attempting to load config from KV Namespace (${kvInfo.platform})...`,
      )
      const kvConfig = await readFromKv(kvInfo, "openlist_config")
      if (kvConfig) {
        console.log(`[DB] Config successfully loaded from ${kvInfo.platform}.`)
        memoryDb = kvConfig
        ensureDefaultSettings(memoryDb)
        ensureDefaultStorages(memoryDb)
        return memoryDb
      }
    } catch (err) {
      console.error("[DB] Error reading config from KV:", err)
    }
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
      return memoryDb
    } catch (err) {
      console.error("Failed to parse DATABASE_JSON env variable:", err)
    }
  }

  // Priority 3: In-Memory DB
  memoryDb = JSON.parse(JSON.stringify(defaultDb))
  ensureDefaultStorages(memoryDb)
  return memoryDb
}

export const saveDb = async (data: any, envCtx?: any) => {
  memoryDb = data

  // Save to KV Namespace
  const kvInfo = getKvBinding(envCtx)
  if (kvInfo.mode !== "none") {
    saveToKv(kvInfo, "openlist_config", data).catch((err) => {
      console.error("[DB] Failed to save to KV:", err)
    })
  }
}

export async function getKvStatus(envCtx?: any) {
  const kvInfo = getKvBinding(envCtx)
  const isConfigured = kvInfo.mode !== "none"
  let connected = false
  let error: string | null = null

  if (isConfigured) {
    try {
      const testVal = await readFromKv(kvInfo, "openlist_config")
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
        .filter(Boolean)
      const physicalPath =
        "/" + parts.join("/").split("/").filter(Boolean).join("/")

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
