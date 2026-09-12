import { Hono } from "hono"
import {
  ensureEncryptionSecret,
  getDb,
  getStoreStatus,
  isEncryptionReady,
  saveDb,
} from "../internal/model/db"
import {
  isPersistentStorageAvailable,
  isServerlessRuntime,
  readDriver,
  readFormat,
} from "../internal/model/store/backend"
import { setUserPassword } from "../pkg/password"

export const publicRouter = new Hono()

/** 文档基址（配置与存储说明） */
const DOC_BASE = "https://doc.oplist.org"
const DOC_STORAGE = `${DOC_BASE}/ecosystem/official_worker/guide_env`
const DOC_DRIVER = `${DOC_BASE}/ecosystem/official_worker/guide`

/**
 * 对错误文本做脱敏，供免鉴权接口使用。
 *
 * 目标：保留「问题类别」的可操作性，同时抹掉可能泄漏实现细节的部分：
 *   - 只取第一行（去掉多行堆栈）
 *   - 抹除形如 `scheme://user:pass@host` 的连接串凭据
 *   - 截断长度，避免回显大段内部信息
 */
function redact(raw: any): string {
  if (raw === null || raw === undefined) return "unknown error"
  let s = String(raw)
  // 仅保留首行
  s = s.split("\n")[0].trim()
  // 抹除连接串中的凭据（如 mysql://user:pass@host）
  s = s.replace(/(\w+:\/\/)[^/@\s]+@/g, "$1***@")
  // 抹除常见的 key=value 形式的令牌
  s = s.replace(
    /\b(token|secret|password|passwd|pwd|api[_-]?key)\s*[=:]\s*\S+/gi,
    "$1=***",
  )
  // 截断
  const MAX = 160
  return s.length > MAX ? s.slice(0, MAX) + "…" : s
}

/**
 * 初始化前的环境自检。
 *
 * 该接口**无需鉴权**（初始化页在未登录时就需要它），且**不泄露任何敏感值**：
 * 只报告「配置了什么」「是否就绪」「哪里不对」，绝不回显密钥或 DSN 原文。
 *
 * 返回：
 *   - config：DB_FORMAT / DB_DRIVER 的配置值与实际解析值
 *   - storage：驱动可用性、健康状态、连接错误
 *   - jwt：签名/加密密钥是否就绪
 *   - ready：综合就绪判定（数据库 + 密钥都就绪）
 *   - issues：问题清单，每项含 code / level / message / docUrl
 */
publicRouter.get("/env_check", async (c) => {
  const env = c.env as any
  const driverCfg = readDriver(env)
  const formatCfg = readFormat(env)
  const serverless = isServerlessRuntime(env)

  // ── 存储状态（不抛错，内部已做容错）──
  const storage: any = await getStoreStatus(env).catch((err: any) => ({
    driver: "none",
    format: "none",
    available: false,
    configError: String(err?.message || err),
  }))

  // 驱动名可用于判定「真实持久化」与「内存兜底」。
  // 内存模式在 serverless 下不可接受（实例短暂、多租户，写入会静默丢失）。
  const resolvedDriver = String(storage?.driver ?? "none")
  const isMemory = resolvedDriver === "memory"
  const hasDriver = resolvedDriver !== "none" && resolvedDriver !== ""
  const hasConfigError = Boolean(storage?.configError)

  // 可用 = 有驱动 && 非内存 && 无配置错误 && 驱动自报可用。
  // getStoreStatus 在健康检查失败时会带 available:false（例如 KV 代理 401、
  // 数据库连接失败），此时即便配置齐全也不能视为可用。
  const driverHealthy = storage?.available !== false

  const storageAvailable =
    hasDriver && !isMemory && !hasConfigError && driverHealthy

  // ── JWT 密钥就绪（真实来源，绕过缓存）──
  const jwtReady = await isEncryptionReady(env).catch(() => false)

  // ── 问题清单（可操作提示 + 文档链接）──
  const issues: {
    code: string
    level: "error" | "warning"
    message: string
    docUrl: string
  }[] = []

  if (isMemory) {
    issues.push({
      code: "STORAGE_MEMORY_ONLY",
      level: serverless ? "error" : "warning",
      message: serverless
        ? "This serverless runtime fell back to in-memory storage. Data will " +
          "be lost immediately. Configure DB_DRIVER (blob / kv / cfkv / d1 / do) " +
          "or bind a KV namespace."
        : "No persistent storage configured — data is kept in memory and " +
          "will be lost on restart. Fine for local development only.",
      docUrl: DOC_STORAGE,
    })
  } else if (!hasDriver) {
    issues.push({
      code: "STORAGE_UNAVAILABLE",
      level: "error",
      message:
        "No storage backend is available. Configure DB_DRIVER " +
        "(blob / kv / cfkv / d1 / do) or bind a KV namespace.",
      docUrl: DOC_STORAGE,
    })
  }

  if (hasConfigError) {
    issues.push({
      code: "STORAGE_CONFIG_ERROR",
      level: "error",
      // 该接口免鉴权，因此不返回原始错误文本（可能含内部 DSN、主机名或堆栈），
      // 仅回第一行摘要并截断，保留可操作性的同时降低信息暴露面。
      message: redact(storage.configError),
      docUrl: DOC_DRIVER,
    })
  }

  // 配置齐全但驱动自检失败（如 KV 代理 401、数据库连不上）
  if (hasDriver && !isMemory && !hasConfigError && !driverHealthy) {
    issues.push({
      code: "STORAGE_UNHEALTHY",
      level: "error",
      message:
        `Storage driver "${resolvedDriver}" is configured but not reachable` +
        `${storage.error ? ": " + redact(storage.error) : ""}. ` +
        `Verify credentials and bindings.`,
      docUrl: DOC_DRIVER,
    })
  }

  if (!jwtReady) {
    issues.push({
      code: "JWT_SECRET_MISSING",
      level: serverless ? "error" : "warning",
      message:
        "JWT_SECRET is not set. It signs tokens and encrypts sensitive fields " +
        "(drive credentials, 2FA secrets). Without it, data may be stored in " +
        "plaintext and tokens cannot be verified across instances.",
      docUrl: DOC_STORAGE,
    })
  }

  // ── 综合就绪：数据库可用 + 密钥就绪 ──
  // 内存模式（本地开发）允许初始化，但会带 warning。
  const ready = storageAvailable && jwtReady

  return c.json({
    code: 200,
    message: "success",
    data: {
      runtime: {
        serverless,
        platform: storage?.platform ?? null,
      },
      config: {
        // 配置值（用户显式设置，或默认值）
        db_format: formatCfg,
        db_driver: driverCfg,
        // 实际解析值（auto 探测后的结果）
        resolved_driver: storage?.driver ?? null,
        resolved_format: storage?.format ?? null,
      },
      storage: {
        available: storageAvailable,
        configured: storage?.configured ?? null,
        connected: storage?.connected ?? null,
        platform: storage?.platform ?? null,
        /** 是否处于内存兜底模式（重启即失，serverless 下不可接受） */
        memory: isMemory,
      },
      jwt: {
        ready: jwtReady,
        // 仅告知来源类型，不回显任何值
        source: jwtReady ? "env-or-persisted" : "none",
      },
      ready,
      issues,
      docUrl: DOC_STORAGE,
    },
  })
})

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
    logo: "https://res.oplist.org/logo/logo.svg",
    favicon: "https://res.oplist.org/logo/logo.svg",
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
//
// 「可持久化存储可用」是「已初始化」的前提，而不是并列的另一个检查：
// 初始化结果必须能被持久化才算真正完成。若存储不可用，getDb() 只能退回
// 内存，此刻即便读到了管理员账号，也无法证明它会被保存下来 —— 重启即丢。
// 因此这里把存储不可用直接判为 initialized=false，让前端停留在初始化向导
// （那是唯一能提示用户去修配置的地方），而不是欢快地跳去登录页。
//
// 本接口已在 index.ts 的诊断豁免名单中，不会被存储配置错误中间件拦截，
// 否则它在最需要报告问题的场景下反而拿不到任何信息。
publicRouter.get("/init_status", async (c) => {
  const storageReady = await isPersistentStorageAvailable(c.env)

  // 存储不可用时不再尝试读库：此时 getDb() 只会返回内存副本，
  // 据此得出的 initialized=true 是假象。
  let initialized = false
  if (storageReady) {
    const db = await getDb(c.env)
    const admin = (db.users || []).find((u: any) => u.role === 2)
    initialized = Boolean(admin && String(admin.password || "").trim() !== "")
  }

  // 就绪判定：加密密钥在**真实来源**（env 或 KV）可读。
  // 前端据此轮询等待，避免 KV 最终一致性导致的「刚初始化完登录失败」。
  const ready = initialized ? await isEncryptionReady(c.env) : false

  return c.json({
    code: 200,
    message: "success",
    data: { initialized, ready },
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
  const existing = db.users.find((u: any) => u.role === 2)

  if (existing && String(existing.password || "").trim() !== "") {
    return c.json(
      { code: 400, message: "system has already been initialized", data: null },
      400,
    )
  }

  // 初始化阶段：确保加密密钥存在。
  //
  // 只在 setup 中生成 —— 且仅当持久化键不存在时。一旦写入永不覆盖，
  // 否则既有加密数据将无法解密。其他任何阶段都只读不生成。
  await ensureEncryptionSecret(c.env)

  if (existing) {
    // admin 账号已存在但尚未设置密码（未初始化）：直接更新
    existing.username = username
    await setUserPassword(existing, password)
  } else {
    // 首次创建 admin 账号（Go User.SetPassword 双层哈希）
    const admin: any = {
      id: 1,
      username,
      password: "",
      role: 2,
      permission: 0,
      base_path: "/",
      disabled: false,
      sso_id: "",
      allow_ldap: false,
      pwd_update_at: new Date().toISOString(),
    }
    await setUserPassword(admin, password)
    db.users.push(admin)
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
