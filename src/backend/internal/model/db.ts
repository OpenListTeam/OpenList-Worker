import fs from "fs/promises"
import path from "path"

const DB_PATH = path.join(process.cwd(), "public_data", "db.json")

export const defaultDb = {
  settings: [
    // Group 1: SITE
    { key: "site_title", value: "OpenList", type: "string", help: "The title of the site", group: 1, flag: 0 },
    { key: "logo", value: "https://res.oplist.org/logo/logo.svg", type: "string", help: "The logo URL of the site", group: 1, flag: 0 },
    { key: "favicon", value: "https://res.oplist.org/logo/logo.svg", type: "string", help: "The favicon URL of the site", group: 1, flag: 0 },
    { key: "announcement", value: "欢迎使用 OpenList!", type: "text", help: "Announcement shown on the homepage", group: 1, flag: 0 },
    { key: "robots_txt", value: "User-agent: *\nAllow: /", type: "text", help: "robots.txt content", group: 1, flag: 0 },
    { key: "version", value: "v4.2.3", type: "string", help: "Current version", group: 1, flag: 2 },

    // Group 2: STYLE
    { key: "main_color", value: "#1890ff", type: "string", help: "Main accent color", group: 2, flag: 0 },
    { key: "home_container", value: "hope_container", type: "select", options: "hope_container,max_980px", help: "Style of the home page container", group: 2, flag: 0 },
    { key: "home_icon", value: "openlist", type: "string", help: "Home icon styling", group: 2, flag: 0 },
    { key: "settings_layout", value: "simple", type: "select", options: "simple,comprehensive", help: "Layout of the settings page", group: 2, flag: 0 },
    { key: "hide_files", value: "", type: "text", help: "Regular expressions to hide files, one per line", group: 2, flag: 0 },
    { key: "privacy_regs", value: "", type: "text", help: "Regular expressions to hide private details", group: 2, flag: 0 },

    // Group 3: PREVIEW
    { key: "audio_autoplay", value: "false", type: "bool", help: "Autoplay audio", group: 3, flag: 0 },
    { key: "audio_cover", value: "", type: "string", help: "Default audio cover image", group: 3, flag: 0 },
    { key: "audio_types", value: "mp3,m4a,wav,ogg,flac", type: "string", help: "Supported audio extensions", group: 3, flag: 0 },
    { key: "image_types", value: "jpg,jpeg,png,gif,webp,bmp,svg", type: "string", help: "Supported image extensions", group: 3, flag: 0 },
    { key: "video_autoplay", value: "false", type: "bool", help: "Autoplay video", group: 3, flag: 0 },
    { key: "video_types", value: "mp4,mkv,webm,avi,mov,flv", type: "string", help: "Supported video extensions", group: 3, flag: 0 },
    { key: "text_types", value: "txt,md,js,ts,css,json,html,xml,yaml,yml,ini,conf,log", type: "string", help: "Supported text extensions", group: 3, flag: 0 },
    { key: "preview_archives_by_default", value: "true", type: "bool", help: "Preview archive files directly", group: 3, flag: 0 },
    { key: "preview_download_by_default", value: "false", type: "bool", help: "Download file instead of previewing by default", group: 3, flag: 0 },
    { key: "share_archive_preview", value: "true", type: "bool", help: "Allow previewing archives in shares", group: 3, flag: 0 },
    { key: "share_preview", value: "true", type: "bool", help: "Allow previewing files in shares", group: 3, flag: 0 },
    { key: "share_preview_archives_by_default", value: "true", type: "bool", help: "Preview archives in shares by default", group: 3, flag: 0 },
    { key: "share_preview_download_by_default", value: "false", type: "bool", help: "Download in shares by default", group: 3, flag: 0 },
    { key: "share_force_proxy", value: "false", type: "bool", help: "Force proxy for share downloads", group: 3, flag: 0 },
    { key: "share_summary_content", value: "true", type: "bool", help: "Show file summary in shares", group: 3, flag: 0 },
    { key: "share_icon", value: "", type: "string", help: "Custom share icon", group: 3, flag: 0 },

    // Group 4: GLOBAL
    { key: "package_download", value: "true", type: "bool", help: "Allow packing files for downloading", group: 4, flag: 0 },
    { key: "offline_download", value: "true", type: "bool", help: "Allow offline downloading", group: 4, flag: 0 },
    { key: "copy_task_threads_num", value: "4", type: "number", help: "Number of copy task threads", group: 4, flag: 0 },
    { key: "upload_task_threads_num", value: "4", type: "number", help: "Number of upload task threads", group: 4, flag: 0 },
    { key: "decompress_download_task_threads_num", value: "4", type: "number", help: "Number of download threads during decompression", group: 4, flag: 0 },
    { key: "decompress_upload_task_threads_num", value: "4", type: "number", help: "Number of upload threads during decompression", group: 4, flag: 0 },
    { key: "offline_download_task_threads_num", value: "4", type: "number", help: "Number of offline download task threads", group: 4, flag: 0 },
    { key: "offline_download_transfer_task_threads_num", value: "4", type: "number", help: "Number of transfer threads for offline downloads", group: 4, flag: 0 },
    { key: "hide_storage_details", value: "false", type: "bool", help: "Hide storage details on homepage", group: 4, flag: 0 },
    { key: "hide_storage_details_in_manage_page", value: "false", type: "bool", help: "Hide storage details in manage pages", group: 4, flag: 0 },
    { key: "default_page_size", value: "30", type: "number", help: "Default items per page", group: 4, flag: 0 },
    { key: "pagination_type", value: "pagination", type: "select", options: "all,auto_load_more,load_more,pagination", help: "Style of list pagination", group: 4, flag: 0 },
    { key: "ignore_system_files", value: "true", type: "bool", help: "Ignore system garbage files", group: 4, flag: 0 },
    { key: "ignore_paths", value: "", type: "text", help: "Paths to ignore, one per line", group: 4, flag: 0 },
    { key: "non_efs_zip_encoding", value: "GBK", type: "string", help: "Alternative ZIP file text encoding", group: 4, flag: 0 },
    { key: "filename_char_mapping", value: "", type: "string", help: "Filename character mapping", group: 4, flag: 0 },
    { key: "forward_direct_link_params", value: "false", type: "bool", help: "Forward query parameters on direct links", group: 4, flag: 0 },
    { key: "ignore_direct_link_params", value: "false", type: "bool", help: "Ignore direct link query parameters", group: 4, flag: 0 },
    { key: "link_expiration", value: "1440", type: "number", help: "Expiration time of direct links (minutes)", group: 4, flag: 0 },
    { key: "proxy_types", value: "", type: "string", help: "Proxy types", group: 4, flag: 0 },
    { key: "proxy_ignore_headers", value: "", type: "string", help: "Headers ignored by proxy", group: 4, flag: 0 },
    { key: "handle_hook_after_writing", value: "false", type: "bool", help: "Execute hook after writing files", group: 4, flag: 0 },
    { key: "handle_hook_rate_limit", value: "60", type: "number", help: "Hook rate limit (seconds)", group: 4, flag: 0 },

    // Group 5: ARIA2
    { key: "aria2_uri", value: "http://localhost:6800/jsonrpc", type: "string", help: "Aria2 JSON-RPC endpoint", group: 5, flag: 0 },
    { key: "aria2_secret", value: "", type: "string", help: "Aria2 RPC secret token", group: 5, flag: 0 },
    { key: "qbittorrent_url", value: "http://localhost:8080", type: "string", help: "qBittorrent Web UI URL", group: 5, flag: 0 },
    { key: "qbittorrent_seedtime", value: "0", type: "number", help: "qBittorrent seeding time", group: 5, flag: 0 },
    { key: "transmission_uri", value: "http://localhost:9091/transmission/rpc", type: "string", help: "Transmission RPC endpoint", group: 5, flag: 0 },
    { key: "transmission_seedtime", value: "0", type: "number", help: "Transmission seeding time", group: 5, flag: 0 },

    // Group 6: INDEX
    { key: "auto_update_index", value: "false", type: "bool", help: "Enable auto update of search indexes", group: 6, flag: 0 },
    { key: "max_index_depth", value: "20", type: "number", help: "Max scanning depth of index", group: 6, flag: 0 },
    { key: "search_index", value: "none", type: "select", options: "none,database,database_non_full_text,bleve,meilisearch", help: "Selected search indexing engine", group: 6, flag: 0 },
    { key: "index_progress", value: "idle", type: "string", help: "Current indexing progress", group: 6, flag: 2 },

    // Group 7: SSO
    { key: "sso_login_enabled", value: "false", type: "bool", help: "Enable Single Sign-On (SSO) logins", group: 7, flag: 0 },
    { key: "sso_login_platform", value: "Github", type: "select", options: "Casdoor,Dingtalk,Github,Google,Microsoft,OIDC", help: "Selected SSO identity platform", group: 7, flag: 0 },
    { key: "sso_client_id", value: "", type: "string", help: "SSO application Client ID", group: 7, flag: 0 },
    { key: "sso_client_secret", value: "", type: "string", help: "SSO application Client Secret", group: 7, flag: 0 },
    { key: "sso_organization_name", value: "", type: "string", help: "SSO organization name (if required)", group: 7, flag: 0 },
    { key: "sso_application_name", value: "", type: "string", help: "SSO application registration name", group: 7, flag: 0 },
    { key: "sso_endpoint_name", value: "", type: "string", help: "SSO server base URL or endpoint", group: 7, flag: 0 },
    { key: "sso_auto_register", value: "true", type: "bool", help: "Auto-create a user on successful SSO", group: 7, flag: 0 },
    { key: "sso_compatibility_mode", value: "false", type: "bool", help: "Enable SSO compatibility mode", group: 7, flag: 0 },
    { key: "sso_default_dir", value: "/", type: "string", help: "Default root directory path for SSO users", group: 7, flag: 0 },
    { key: "sso_default_permission", value: "0", type: "number", help: "Default permissions flag for auto-created users", group: 7, flag: 0 },
    { key: "sso_jwt_public_key", value: "", type: "text", help: "SSO JWT public signing key", group: 7, flag: 0 },
    { key: "sso_oidc_username_key", value: "preferred_username", type: "string", help: "The attribute key in OIDC token representing username", group: 7, flag: 0 },
    { key: "sso_extra_scopes", value: "", type: "string", help: "Comma-separated extra OAuth scope requests", group: 7, flag: 0 },

    // Group 8: LDAP
    { key: "ldap_login_enabled", value: "false", type: "bool", help: "Enable LDAP user authentication logins", group: 8, flag: 0 },
    { key: "ldap_server", value: "ldap://localhost:389", type: "string", help: "LDAP Server URL", group: 8, flag: 0 },
    { key: "ldap_manager_dn", value: "", type: "string", help: "Manager DN used for searching directory", group: 8, flag: 0 },
    { key: "ldap_manager_password", value: "", type: "string", help: "Manager password used for searching", group: 8, flag: 0 },
    { key: "ldap_user_search_base", value: "", type: "string", help: "The DN branch from which user search begins", group: 8, flag: 0 },
    { key: "ldap_user_search_filter", value: "(uid={username})", type: "string", help: "Search filter used for users", group: 8, flag: 0 },
    { key: "ldap_default_dir", value: "/", type: "string", help: "Default root directory path for LDAP users", group: 8, flag: 0 },
    { key: "ldap_default_permission", value: "0", type: "number", help: "Default permissions flag for auto-created users", group: 8, flag: 0 },
    { key: "ldap_skip_tls_verify", value: "false", type: "bool", help: "Skip TLS validation of LDAP connection", group: 8, flag: 0 },
    { key: "ldap_login_tips", value: "使用企业账号登录", type: "string", help: "Tips displayed on LDAP login input", group: 8, flag: 0 },

    // Group 9: S3
    { key: "s3_access_key_id", value: "", type: "string", help: "AWS S3 Access Key ID", group: 9, flag: 0 },
    { key: "s3_secret_access_key", value: "", type: "string", help: "AWS S3 Secret Access Key", group: 9, flag: 0 },
    { key: "s3_buckets", value: "[]", type: "text", help: "S3 config buckets array (JSON)", group: 9, flag: 0 },

    // Group 10: FTP
    { key: "ftp_public_host", value: "", type: "string", help: "Public hostname/IP address of FTP server", group: 10, flag: 0 },
    { key: "ftp_pasv_port_map", value: "", type: "string", help: "FTP passive port maps", group: 10, flag: 0 },
    { key: "ftp_mandatory_tls", value: "false", type: "bool", help: "Require SSL/TLS encryption for all FTP connections", group: 10, flag: 0 },
    { key: "ftp_implicit_tls", value: "false", type: "bool", help: "Use implicit SSL/TLS instead of explicit", group: 10, flag: 0 },
    { key: "ftp_tls_private_key_path", value: "", type: "string", help: "Path to Private Key file for TLS", group: 10, flag: 0 },
    { key: "ftp_tls_public_cert_path", value: "", type: "string", help: "Path to Public Certificate file for TLS", group: 10, flag: 0 },

    // Group 11: TRAFFIC
    { key: "max_client_download_speed", value: "0", type: "number", help: "Max download speed for clients (0 is unlimited)", group: 11, flag: 0 },
    { key: "max_client_upload_speed", value: "0", type: "number", help: "Max upload speed for clients (0 is unlimited)", group: 11, flag: 0 },
    { key: "max_server_download_speed", value: "0", type: "number", help: "Max download speed for server (0 is unlimited)", group: 11, flag: 0 },
    { key: "max_server_upload_speed", value: "0", type: "number", help: "Max upload speed for server (0 is unlimited)", group: 11, flag: 0 },

    // Group 0: SINGLE
    { key: "token", value: "", type: "string", help: "API access authorization token", group: 0, flag: 0 },
    { key: "ocr_api", value: "", type: "string", help: "Endpoint URL for OCR image scanning", group: 0, flag: 0 },
    { key: "webauthn_login_enabled", value: "false", type: "bool", help: "Allow users to log in using biometric WebAuthn credentials", group: 0, flag: 0 },
    { key: "sftp_disable_password_login", value: "false", type: "bool", help: "Disable standard password login for SFTP", group: 0, flag: 0 },
  ],
  storages: [],
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

export const getDb = async () => {
  if (memoryDb) {
    ensureDefaultSettings(memoryDb)
    return memoryDb
  }

  if (process.env.DATABASE_JSON) {
    try {
      memoryDb = JSON.parse(process.env.DATABASE_JSON)
      ensureDefaultSettings(memoryDb)
      return memoryDb
    } catch (err) {
      console.error("Failed to parse DATABASE_JSON env variable:", err)
    }
  }

  try {
    const data = await fs.readFile(DB_PATH, "utf-8")
    memoryDb = JSON.parse(data)
    ensureDefaultSettings(memoryDb)
    return memoryDb
  } catch (e) {
    try {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
      await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2))
      memoryDb = JSON.parse(JSON.stringify(defaultDb))
      return memoryDb
    } catch (writeErr) {
      const tmpDbPath = path.join("/tmp", "db.json")
      try {
        const tmpData = await fs.readFile(tmpDbPath, "utf-8")
        memoryDb = JSON.parse(tmpData)
        ensureDefaultSettings(memoryDb)
        return memoryDb
      } catch (tmpReadErr) {
        try {
          await fs.writeFile(tmpDbPath, JSON.stringify(defaultDb, null, 2))
          memoryDb = JSON.parse(JSON.stringify(defaultDb))
          return memoryDb
        } catch (tmpWriteErr) {
          memoryDb = JSON.parse(JSON.stringify(defaultDb))
          return memoryDb
        }
      }
    }
  }
}

export const saveDb = async (data: any) => {
  memoryDb = data
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2))
  } catch (e) {
    try {
      const tmpDbPath = path.join("/tmp", "db.json")
      await fs.writeFile(tmpDbPath, JSON.stringify(data, null, 2))
    } catch (tmpErr) {
      // ignore
    }
  }
}

export async function resolvePath(virtualPath: string) {
  const db = await getDb()
  
  let cleanPath = "/" + virtualPath.split("/").filter(Boolean).join("/")
  if (cleanPath === "") {
    cleanPath = "/"
  }

  const activeStorages = (db.storages || [])
    .filter((s: any) => !s.disabled)

  if (activeStorages.length === 0) {
    throw new Error("failed get storage: storage not found; please add a storage first")
  }

  const sortedStorages = [...activeStorages].sort((a: any, b: any) => {
    const aMount = "/" + a.mount_path.split("/").filter(Boolean).join("/")
    const bMount = "/" + b.mount_path.split("/").filter(Boolean).join("/")
    return bMount.length - aMount.length
  })

  // 1. Try to find a real storage matching cleanPath or its prefix
  for (const storage of sortedStorages) {
    const mount = "/" + storage.mount_path.split("/").filter(Boolean).join("/")
    const isRootMount = mount === "/"
    const isMatch = isRootMount || cleanPath === mount || cleanPath.startsWith(mount + "/")
    
    if (isMatch) {
      let relPath = cleanPath
      if (!isRootMount) {
        relPath = cleanPath.slice(mount.length)
      }
      if (!relPath.startsWith("/")) {
        relPath = "/" + relPath
      }
      
      const addition = JSON.parse(storage.addition || "{}")
      const rootFolder = addition.root_folder_path || path.join(process.cwd(), "public_data")
      const physicalPath = path.join(rootFolder, relPath)
      
      return {
        storage,
        relative: relPath,
        physical: physicalPath,
        rootFolder,
        cleanPath,
        isVirtual: false
      }
    }
  }

  // 2. Check if cleanPath is a parent folder of any active storage mount_path (virtual directory)
  let isVirtual = false
  for (const storage of activeStorages) {
    const mount = "/" + storage.mount_path.split("/").filter(Boolean).join("/")
    if (mount !== "/" && mount.startsWith(cleanPath === "/" ? "/" : cleanPath + "/")) {
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
      isVirtual: true
    }
  }

  // 3. Neither matches real storage nor a virtual path parent
  throw new Error("failed get storage: storage not found")
}
