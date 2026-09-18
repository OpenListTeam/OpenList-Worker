import { Hono } from "hono"
import {
  ensureEncryptionSecret,
  getDb,
  getDbLoadError,
  getStoreStatus,
  isDbTrusted,
  isEncryptionReady,
  saveDb,
} from "../internal/model/db"
import {
  getStoreConfigErrorDetail,
  isPersistentStorageAvailable,
  isServerlessRuntime,
  readDriver,
  readFormat,
} from "../internal/model/store/backend"
import { setUserPassword } from "../pkg/password"
// 脱敏 / 截断 / 摘要 / 建议组装：与全局 503 拦截（index.ts）共用同一套规则
import {
  reasonLines,
  redact,
  storageErrorSummary,
} from "./storage-error"

export const publicRouter = new Hono()

/** 文档基址（配置与存储说明） */
const DOC_BASE = "https://doc.oplist.org"
const DOC_STORAGE = `${DOC_BASE}/ecosystem/official_worker/guide_env`
const DOC_DRIVER = `${DOC_BASE}/ecosystem/official_worker/guide`

/**
 * 解析值归一：解析失败时内部会用 "none"/空串占位，界面上显示「do → none」
 * 只会造成困惑，因此统一归一为 null（前端只显示配置值）。
 */
function resolvedOrNull(value: any): string | null {
  const s = String(value ?? "").trim()
  return s && s !== "none" ? s : null
}

/**
 * 「没有可用存储后端」时的统一建议（单一来源）。
 *
 * ## 为什么不再提 `set DB_DRIVER=auto`
 *
 * 旧文案是「Bind a storage backend (D1 / KV / Blob) **or set DB_DRIVER=auto**」。
 * 后半句在**绝大多数真实场景下是循环建议**：用户看到这条 issue 时，`DB_DRIVER`
 * 往往**本来就是 auto**（CF / EdgeOne 部署的默认形态）。让他「去设置 auto」等于
 * 让他改一个已经正确的值，改完照旧报错，只会加深「这软件坏了」的印象。
 *
 * 准确的表述是：auto **已经把所有候选驱动探测过一遍且都不可用**，因此缺的是
 * **平台侧的绑定**，不是配置值。这里只说这件事。
 *
 * 若驱动解析器给出了更精确的 hint（如 `noStorageHint` 的逐平台文案），调用方
 * 会优先使用它，本函数只是兜底。
 */
function bindBackendSuggestion(): string {
  return (
    "No storage binding was detected (auto probes every driver). " +
    "Bind one and redeploy — Cloudflare: D1 or KV namespace; " +
    "EdgeOne: Blob; ESA: ESA_BLOB."
  )
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

  // ── 可用性判定：**复用** isPersistentStorageAvailable（单一来源）──
  //
  // 以前这里把判定公式（有驱动 && 非内存 && 无配置错误 && 驱动自报可用）
  // 在本文件里重抄了一遍，与 store/backend.ts 的 isPersistentStatus 逐条等价。
  // 两处独立维护意味着任何一方新增条件（例如将来加「驱动已废弃」）都会造成
  // 「503 拦截层」与「安装向导是否放行」判定不一致，且症状极难定位。
  //
  // isPersistentStorageAvailable 内部就是 getStoreStatus + isPersistentStatus，
  // 因此这里复用不会多一次探测（getStorageBackend 内部已按 env 指纹缓存）。
  const storageAvailable = await isPersistentStorageAvailable(env)

  // 以下中间量仅用于**挑选 issue 文案**（哪个 code / 哪句话），不再参与可用性计算。
  // 内存模式在 serverless 下不可接受（实例短暂、多租户，写入会静默丢失）。
  const resolvedDriver = String(storage?.driver ?? "none")
  const isMemory = resolvedDriver === "memory"
  const hasDriver = resolvedDriver !== "none" && resolvedDriver !== ""
  const hasConfigError = Boolean(storage?.configError)

  // 配置齐全但驱动自检失败（如 KV 代理 401、数据库连不上）。
  // 注意：storageAvailable 为 false 且并无上述三类原因时，就落在这里。
  const driverHealthy = storage?.available !== false

  // ── JWT 密钥就绪（真实来源，绕过缓存）──
  const jwtReady = await isEncryptionReady(env).catch(() => false)

  // ── 问题清单（可操作提示 + 文档链接）──
  const issues: {
    code: string
    level: "error" | "warning"
    /**
     * 给界面的一行短原因（**应为完整的一句话**）。
     *
     * 界面只展示这一行 + suggestion，开发者排查用的长篇说明放在 message 里，
     * 避免出现「半句话 + 省略号」这种读不懂的提示。
     */
    summary: string
    /** 完整说明（多行、已脱敏）：只给日志/工具用，界面不展示 */
    message: string
    docUrl: string
    /** 一句话修复建议（「改什么」） */
    suggestion?: string | null
  }[] = []
  /** 配置错误的分类码 + 短摘要 + 完整说明 + 修复建议（均脱敏） */
  let storageDetail: {
    code: string | null
    summary: string | null
    message: string | null
    suggestion: string | null
  } = {
    code: null,
    summary: null,
    message: null,
    suggestion: null,
  }

  if (hasConfigError) {
    const detail = await getStoreConfigErrorDetail(env, { silent: true })
    storageDetail = {
      code: detail.code,
      summary: storageErrorSummary(detail.message),
      message: detail.message,
      suggestion: detail.suggestion,
    }
  }

  if (hasConfigError && storageDetail.code === "NO_STORAGE") {
    // 一个可选后端都没有：这类错误本身就是「没有可用的存储」，用一条通用提示
    // 说清即可，不必再叠一条内容相同的配置错误（两条 issue 说同一件事只会让
    // 用户以为出了两个问题）。
    issues.push({
      code: "STORAGE_UNAVAILABLE",
      level: "error",
      summary: "No storage backend available.",
      message: "No storage backend available.",
      docUrl: DOC_STORAGE,
      suggestion: storageDetail.suggestion || bindBackendSuggestion(),
    })
  } else if (hasConfigError) {
    // 配置错误：界面只给「一行短原因 + 一行怎么改」；完整排查说明留在 message /
    // storage.error_message 里，由日志与工具消费。
    const isInvalidCombination = storageDetail.code === "INVALID_COMBINATION"
    const reason = redact(
      storageDetail.message || storage?.configError,
      reasonLines(storageDetail.code),
    )
    issues.push({
      code: isInvalidCombination
        ? "STORAGE_INVALID_COMBINATION"
        : "STORAGE_CONFIG_ERROR",
      level: "error",
      summary:
        storageDetail.summary ||
        (isInvalidCombination
          ? "Unsupported storage combination."
          : "Storage driver is not configured correctly."),
      message: isInvalidCombination
        ? `Unsupported storage combination: ${reason}`
        : `Storage driver is not configured correctly: ${reason}`,
      docUrl: DOC_DRIVER,
      suggestion: storageDetail.suggestion,
    })
  } else if (isMemory) {
    issues.push({
      code: "STORAGE_MEMORY_ONLY",
      level: serverless ? "error" : "warning",
      summary: serverless
        ? "In-memory storage only; data will be lost immediately."
        : "In-memory storage only; data will be lost on restart (fine for local dev).",
      message: serverless
        ? "In-memory storage only; data will be lost immediately."
        : "In-memory storage only; data will be lost on restart (fine for local dev).",
      docUrl: DOC_STORAGE,
      suggestion: bindBackendSuggestion(),
    })
  } else if (!hasDriver) {
    issues.push({
      code: "STORAGE_UNAVAILABLE",
      level: "error",
      summary: "No storage backend available.",
      message: "No storage backend available.",
      docUrl: DOC_STORAGE,
      suggestion: bindBackendSuggestion(),
    })
  }

  // 配置齐全但驱动自检失败（如 KV 代理 401、数据库连不上）
  if (hasDriver && !isMemory && !hasConfigError && !driverHealthy) {
    const unreachable =
      `Storage driver "${resolvedDriver}" is configured but not reachable` +
      `${storage.error ? ": " + redact(storage.error) : ""}.`
    issues.push({
      code: "STORAGE_UNHEALTHY",
      level: "error",
      summary: unreachable,
      message: unreachable,
      docUrl: DOC_DRIVER,
      // 注意：这里**不**再建议「set DB_DRIVER=auto」。
      // 能走到这里说明驱动已成功解析（binding/凭据都齐），只是自检不通
      // （如 KV 代理 401）。此时改回 auto 没有任何帮助 —— auto 会解析出同一个
      // 驱动、撞上同一个错误，属于把用户支去绕圈。真正要做的是修凭据/绑定。
      suggestion:
        `Check the credentials/bindings for "${resolvedDriver}" ` +
        "(it resolved, but its health check failed).",
    })
  }

  if (!jwtReady) {
    issues.push({
      code: "JWT_SECRET_MISSING",
      // 一律 warning：存储可用时 setup 会自动生成并持久化密钥，缺它不是
      // 「装不了」，只是「少了一层显式配置的确定性」。不再升级为 error，
      // 否则会出现「报错说缺密钥 → 但生成密钥只能靠安装 → 安装又被报错拦住」。
      level: "warning",
      // 密钥支持**自动生成 + 持久化**（见 ensureEncryptionSecret），所以文案
      // 不说「必须手动配置」，而是同时给出「也可留空让 setup 自动生成」这条路，
      // 避免用户以为这是个必填项而无谓地卡在向导里。
      summary: "JWT_SECRET is not set.",
      message:
        "JWT_SECRET is not set. If storage is available, a secret is generated " +
        "and persisted automatically during setup; setting it explicitly is " +
        "recommended so that all instances and cold starts share one key.",
      docUrl: DOC_STORAGE,
      suggestion:
        "Set JWT_SECRET (32+ chars recommended, `openssl rand -hex 32`) in your " +
        "deployment variables — or leave it empty and let setup generate one " +
        "(requires working storage).",
    })
  }

  // ── 综合就绪：只取决于「存储可用」──
  //
  // 这里曾写成 `storageAvailable && jwtReady`，会造成**自死锁**：
  //   1. 未配置 JWT_SECRET 时 jwtReady=false → ready=false；
  //   2. 前端 `canProceed()` 依赖 ready，于是初始化向导卡在第 1 步；
  //   3. 而密钥的自动生成 `ensureEncryptionSecret()` 恰恰只在**提交初始化
  //      （/public/init）时**才会执行（见下方 init 路由）。
  //   4. 结果：向导永远进不到能触发自动生成的那一步 → 「自动生成 JWT 未生效」。
  //
  // 语义上二者本就该分开：
  //   - `ready` 表示「存储就绪、可以开始安装」——这是**能否初始化**的前提；
  //   - `jwtReady` 表示「密钥已就绪」——它可以是安装的**结果**（自动生成），
  //     而不是安装的前提。
  // 前端仍会把 jwt.ready=false 作为提示展示（并允许用户选择手动配置），
  // 但不再因此阻断向导。
  const ready = storageAvailable

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
        // 实际解析值（auto 探测后的结果）；解析失败时后端内部是 "none"，
        // 对界面没有意义且会显示成「do → none」，这里统一归一为 null。
        resolved_driver: resolvedOrNull(storage?.driver),
        resolved_format: resolvedOrNull(storage?.format),
      },
      storage: {
        available: storageAvailable,
        configured: storage?.configured ?? null,
        connected: storage?.connected ?? null,
        platform: storage?.platform ?? null,
        /** 是否处于内存兜底模式（重启即失，serverless 下不可接受） */
        memory: isMemory,
        /**
         * 配置错误的机器可读分类（无错误时为 null）：
         * INVALID_COMBINATION / DRIVER_UNAVAILABLE / NO_STORAGE /
         * PROXY_CONFIG / UNKNOWN_DRIVER / HEALTH_ERROR / DRIVER_ERROR
         */
        error_code: storageDetail.code,
        /** 一行短原因（界面展示这个） */
        summary: storageDetail.summary,
        /**
         * 完整原因（已脱敏、按分类限行）。
         *
         * 只给日志与工具用：界面展示它会出现「半句话 + 省略号」。
         */
        error_message:
          storageDetail.message !== null
            ? redact(storageDetail.message, reasonLines(storageDetail.code))
            : null,
        /** 一句话修复建议（「改什么」），无错误时为 null */
        suggestion: storageDetail.suggestion,
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

// 是否配置了 ADMIN_PASS（跳过安装向导、自动初始化 admin）。
//
// 注意 env 与 process.env 都要看：Cloudflare Workers 走 env，本地/容器走
// process.env；两者优先级与 auth.ts 的 getOrInitUsers 保持一致。
function adminPassConfigured(env: any): boolean {
  const fromEnv = env?.ADMIN_PASS
  const fromProc =
    typeof process !== "undefined" ? (process as any).env?.ADMIN_PASS : ""
  return String(fromEnv || fromProc || "").trim() !== ""
}

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
    // ADMIN_PASS 自动初始化：安装页只轮询本接口，从不调用登录接口。
    // 若只把 getOrInitUsers() 挂在登录路径上，配置了 ADMIN_PASS 的新部署会
    // 永远停在「未初始化 → 跳 /@init → 永远不初始化」的死循环里。
    //
    // 仅当运维显式配置了 ADMIN_PASS 时才触发（那是「请自动初始化」的明确
    // 意图）：未配置时不调用，避免每次轮询都尝试写入一份未初始化的占位库。
    // getOrInitUsers 本身是幂等的：已初始化（admin 密码已是合法哈希）时
    // 不做任何写入。
    if (adminPassConfigured(c.env)) {
      try {
        const { getOrInitUsers } = await import("./auth")
        await getOrInitUsers(c.env)
      } catch (err: any) {
        console.warn(
          "[DB] init_status: ADMIN_PASS auto-initialization failed: " +
            (err?.message || err),
        )
      }
    }

    const db = await getDb(c.env)
    const admin = (db.users || []).find((u: any) => u.role === 2)
    initialized = Boolean(admin && String(admin.password || "").trim() !== "")
  }

  // 就绪判定：加密密钥在**真实来源**（env 或 KV）可读。
  // 前端据此轮询等待，避免 KV 最终一致性导致的「刚初始化完登录失败」。
  const ready = initialized ? await isEncryptionReady(c.env) : false

  // ── 把「为什么不能初始化」透给前端 ──
  //
  // 安装向导只能看到本接口，因此这里必须给出可展示的原因，否则用户只会拿到
  // 一个 500 或一句「未初始化」，无从判断是绑定缺失、组合写错还是密钥缺失。
  // 两类原因都返回（已脱敏）：
  //   storage_error      一行短原因（界面直接展示，故取首行摘要）
  //   storage_suggestion 一句话修复建议（「改什么」）
  //   db_load_error      上一次从持久化后端读取失败的原因（运行期故障）
  let storageError: string | null = null
  let storageSuggestion: string | null = null
  if (!storageReady) {
    const detail = await getStoreConfigErrorDetail(c.env, { silent: true })
    storageError = storageErrorSummary(detail.message)
    storageSuggestion = detail.suggestion
  }
  const dbLoadError = getDbLoadError()

  return c.json({
    code: 200,
    message: "success",
    data: {
      initialized,
      ready,
      db_trusted: isDbTrusted(),
      storage_error: storageError,
      storage_suggestion: storageSuggestion,
      db_load_error: dbLoadError ? redact(dbLoadError, 1) : null,
    },
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
  // 安全护栏：只在「读取持久化后端**失败**」时拒绝初始化。
  //
  // loadDb() 对两种「db 不可信」给出了不同信号，必须分别对待：
  //   1. getDbLoadError() !== null —— 读取抛错（binding 未注入、后端不可达、
  //      鉴权失败等）。此时内存里只是兜底空壳，继续初始化会把空库写回存储、
  //      覆盖真实配置（即「数据库被清空」的根因）→ 必须拒绝。
  //   2. getDbLoadError() === null 且 !isDbTrusted() —— 读取**成功但后端为空**，
  //      即全新部署 / 换到新库后的首次初始化。这正是 setup 存在的意义。
  //      若也一并拒绝，就会出现「读不到 → 不许初始化 → 永远读不到」的死锁，
  //      让全新空存储永远无法安装（issue #62 现象 3）。
  const loadError = getDbLoadError()
  if (loadError) {
    console.error(
      "[DB] init/setup rejected: database could not be loaded from the persistence backend: " +
        loadError,
    )
    // 对外文案保持不变（兼容既有前端/客户端），但把「具体原因 + 分类码」放进
    // data，让安装向导能直接展示，而不是只给用户一个通用 500。
    const detail = await getStoreConfigErrorDetail(c.env, { silent: true })
    const code = detail.code || "STORAGE_READ_FAILED"
    return c.json(
      {
        code: 500,
        message:
          "database is not readable; refusing to initialize to avoid overwriting existing config",
        data: {
          code,
          // 界面展示 summary（完整一句）；reason 保留给工具/日志阅读
          summary: storageErrorSummary(loadError),
          reason: redact(loadError, reasonLines(code)),
          // 一句话修复建议：有配置原因时优先用它（如「改成 DB_DRIVER=d1」），
          // 否则向导只能展示一段原因，用户仍不知道下一步做什么。
          suggestion: detail.suggestion,
        },
      },
      500,
    )
  }

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

  // 初始化是唯一允许「在一次成功读取（确认存储为空）之后写入空壳」的场景，
  // 因此显式 force；此时 db 已包含新建的管理员用户，本身也不再是空壳。
  await saveDb(db, c.env, { force: true })
  return c.json({ code: 200, message: "success", data: null })
})
