import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { hashPassword } from "./auth"

export const publicRouter = new Hono()

publicRouter.get("/settings", async (c) => {
  const db = await getDb(c.env)

  // Default settings aligned with Go backend InitialSettings()
  // Source: internal/bootstrap/data/setting.go + internal/conf/const.go
  const settingsObj: Record<string, string> = {
    // --- Site ---
    title: "OpenList",
    site_title: "OpenList",
    version: "v4.2.3",
    // 后端类型标识：前端据此在 GO / TS 模式间切换功能开关。
    // Go 版 OpenList 后端不返回此字段，前端缺省视为 "go"。
    backend: "ts-worker",
    announcement: "",
    pagination_type: "pagination",
    default_page_size: "20",
    allow_indexed: "false",
    allow_mounted: "true",
    robots_txt: "User-agent: *\nAllow: /",

    // --- Appearance ---
    logo: "/logo.png",
    favicon: "/favicon.png",
    main_color: "#1890ff",
    hide_storage_details: "false",
    hide_storage_details_in_manage_page: "false",
    customize_head: "",
    customize_body: "",

    // --- Preview types (must match Go defaults exactly) ---
    // text_types: file extensions that should open in text/code editor
    text_types:
      "txt,htm,html,xml,java,properties,sql,js,md,json,conf,ini,vue,php,py,bat,gitignore,yml,yaml,toml,Makefile,mk,dockerfile,sh,pub,lock,gradle,ts,tsx,jsx,go,rs,c,cpp,h,cs,rb,swift,kt,dart,r,m,pl,pm,lua,ex,exs",
    // audio_types: file extensions treated as audio
    audio_types: "mp3,flac,ogg,m4a,wav,opus,wma,aac,aiff,ape",
    // video_types: file extensions treated as video
    video_types: "mp4,mkv,avi,mov,rmvb,webm,flv,m3u8,ts,wmv,m2ts,mpg,mpeg,3gp",
    // image_types: file extensions treated as image
    image_types:
      "jpg,tiff,jpeg,png,gif,bmp,svg,ico,webp,avif,heic,heif,raw,cr2,nef,arw,dng",
    // proxy_types: file types that should be proxied through server (blank = none forced)
    proxy_types: "",
    // proxy_ignore_headers: headers to strip when proxying
    proxy_ignore_headers: "",

    // --- Preview behavior ---
    audio_autoplay: "false",
    video_autoplay: "false",
    readme_autorender: "true",
    filter_readme_scripts: "true",
    preview_download_by_default: "false",
    preview_archives_by_default: "false",
    share_preview_download_by_default: "false",
    share_preview_archives_by_default: "false",

    // --- Sharing ---
    // IMPORTANT: share_preview must be "true" — frontend blocks ALL previews when false
    share_preview: "true",
    share_archive_preview: "true",

    // --- Global ---
    hide_files: "/\\.DS_Store/i",
    link_expiration: "0",
    sign_all: "false",
    filename_char_mapping: "{}",
    forward_direct_link_params: "false",
    ignore_direct_link_params: "",
    package_download: "true",
    offline_download: "true",
    ocr_api: "",
    privacy_regs: "",

    // --- External / iframe previews (JSON map, default empty) ---
    // Format: {"ext1,ext2": {"preview_name": "https://example.com/?url=$url"}}
    iframe_previews: "{}",
    external_previews: "{}",

    // --- Security ---
    check_down_link: "false",
    check_update: "false",

    // --- Auth ---
    allow_guest: "true",
    webauthn_login_enabled: "false",
    sso_login_enabled: "false",
    sso_compatibility_mode: "false",
    ldap_login_enabled: "false",

    // --- Display ---
    show_disk_usage_in_plain_text: "false",
    non_efs_zip_encoding: "UTF-8",
  }

  // FIX(C-1 / F-14): explicit allowlist — this endpoint is unauthenticated.
  //
  // History: the handler used to echo every settings key, which leaked the
  // admin static API token (a match in isStaticApiToken() grants FULL admin).
  // An interim fix blocked credential-shaped keys with a regex; this upgrade
  // inverts the default so unknown keys fail closed: only keys listed here
  // are ever public. The list = the display defaults above + every key the
  // frontend actually reads (verified by scanning src/ for getSetting() /
  // settings["..."] usage — no dynamic key access exists; plugins read
  // settings through the admin endpoint instead).
  //
  // To publish a new setting, add its key here deliberately. Note the legacy
  // `Flag.PUBLIC/PRIVATE` field on setting items is NOT used as the boundary:
  // the `token` item carries flag:0 (it was meant as the 115/PikPak/Thunder
  // driver token, which collides with the admin API token key) — so that
  // field cannot be trusted as a security signal.
  const PUBLIC_SETTING_KEYS = new Set([
    ...Object.keys(settingsObj),
    // Keys read by the frontend beyond the defaults above:
    "audio_cover",
    "home_container",
    "ldap_login_tips",
    "search_index",
    "settings_layout",
    "share_icon",
    "share_summary_content",
    "sso_login_platform",
  ])

  // Second line of defense: even if a credential-shaped key is ever added to
  // the allowlist above by mistake, still refuse to echo it.
  const SENSITIVE_KEY =
    /(secret|password|passwd|pwd|cookie|token|credential|private[_-]?key|api[_-]?key|access[_-]?key|jwt|salt|signature|webhook)/i

  // Override with user-configured settings from database
  db.settings.forEach((s: any) => {
    if (s.key && s.value !== undefined) {
      if (!PUBLIC_SETTING_KEYS.has(s.key)) return
      if (SENSITIVE_KEY.test(s.key)) return
      settingsObj[s.key] = s.value
      // Handle legacy key alias
      if (s.key === "site_title") {
        settingsObj["title"] = s.value
      }
    }
  })

  // 动态检查是否存在且启用了 guest 账号
  const guest = (db.users || []).find((u: any) => u.username === "guest")
  const isGuestActive = Boolean(guest && !guest.disabled)
  if (!isGuestActive || settingsObj.allow_guest === "false") {
    settingsObj.allow_guest = "false"
  } else {
    settingsObj.allow_guest = "true"
  }

  return c.json({
    code: 200,
    message: "success",
    data: settingsObj,
  })
})

publicRouter.get("/archive_extensions", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: [
      "zip",
      "rar",
      "7z",
      "tar",
      "gz",
      "bz2",
      "xz",
      "tar.gz",
      "tar.bz2",
      "tar.xz",
    ],
  })
})

publicRouter.get("/offline_download_tools", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: [], // Serverless environment: no background download tools
  })
})

publicRouter.get("/plugins", async (c) => {
  const db = await getDb(c.env)
  const plugins = db.plugins || []
  const activePlugins = plugins.filter((p: any) => p.enabled)
  return c.json({
    code: 200,
    message: "success",
    data: activePlugins,
  })
})

// 系统是否已初始化：存在已设置密码的管理员账号即为已初始化。
publicRouter.get("/init_status", async (c) => {
  const db = await getDb(c.env)
  const admin = (db.users || []).find((u: any) => u.role === 2)
  const initialized = Boolean(
    admin && String(admin.password || "").trim() !== "",
  )
  return c.json({
    code: 200,
    message: "success",
    data: { initialized },
  })
})

// 执行系统初始化：创建管理员账号并设置站点名称等初始参数。
publicRouter.post("/init/setup", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = String(body.username || "admin").trim()
  const password = String(body.password || "").trim()
  const siteTitle = String(body.site_title || "").trim()

  if (!username) {
    return c.json({ code: 400, message: "username is required", data: null }, 400)
  }
  if (!password) {
    return c.json({ code: 400, message: "password is required", data: null }, 400)
  }
  if (password.length < 4) {
    return c.json(
      { code: 400, message: "password must be at least 4 characters", data: null },
      400,
    )
  }

  const db = await getDb(c.env)
  if (!db.users) db.users = []
  const hashed = await hashPassword(password)
  const existing = db.users.find((u: any) => u.role === 2)

  if (existing && String(existing.password || "").trim() !== "") {
    return c.json(
      { code: 400, message: "system has already been initialized", data: null },
      400,
    )
  }

  if (existing) {
    // admin 账号已存在但尚未设置密码（未初始化）：直接更新
    existing.username = username
    existing.password = hashed
    existing.pwd_update_at = new Date().toISOString()
  } else {
    // 首次创建 admin 账号
    db.users.push({
      id: 1,
      username,
      password: hashed,
      role: 2,
      permission: 0,
      base_path: "/",
      disabled: false,
      sso_id: "",
      allow_ldap: false,
      pwd_update_at: new Date().toISOString(),
    })
  }

  if (siteTitle) {
    if (!db.settings) db.settings = []
    const site = db.settings.find((s: any) => s.key === "site_title")
    if (site) {
      site.value = siteTitle
    } else {
      db.settings.push({
        key: "site_title",
        value: siteTitle,
        type: "string",
        help: "Site Title",
        group: 1,
        flag: 0,
      })
    }
  }

  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})
