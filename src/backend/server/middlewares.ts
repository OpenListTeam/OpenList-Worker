import { Context } from "hono"
import { verify } from "hono/jwt"
import { checkAdminAuth, isStaticApiToken } from "../pkg/utils"
import { getDb, readPersistedSecret, ENCRYPTION_SECRET_KV_KEY } from "../internal/model/db"

// 不再硬编码 JWT 密钥。优先使用环境变量 JWT_SECRET（推荐在生产配置），
// 否则从持久化后端读取一个随机密钥（首次生成后复用，重启不失效），
// 开发环境（无持久化）回退到进程内随机密钥。
//
// 缓存粒度：**按 env 对象**，而不是单一的进程级变量。
//
// 为什么必须分 env：`env` 决定「去哪个后端读密钥」（driver 由 env 解析）。
// 一个进程若先后服务两套不同配置（多环境/多项目共用实例、本地同时连两套配置、
// 测试），单一进程级缓存会把先读到的那把密钥发给另一套环境，导致跨环境 token
// 可以互相验证。Go 版不存在这个问题——它是单进程单部署，密钥在启动时由
// `conf.Conf.JwtSecret` 一次性确定（server/router.go: common.SecretKey）；
// TS 版必须按 env 隔离才能保持同样的语义。
let cachedJwtSecret: string | null = null
let jwtSecretByEnv = new WeakMap<object, string>()
const JWT_SECRET_KV_KEY = "openlist_jwt_secret"

/** 记录某个 env 的密钥，并更新进程级 last-known 值（无 env 对象时的兜底）。 */
function rememberJwtSecret(env: any, secret: string): void {
  if (env && typeof env === "object") jwtSecretByEnv.set(env, secret)
  cachedJwtSecret = secret
}

/** 读取某个 env 的缓存密钥；没有 env 对象时退回进程级 last-known 值。 */
function readCachedJwtSecret(env: any): string | null {
  if (env && typeof env === "object") return jwtSecretByEnv.get(env) ?? null
  return cachedJwtSecret
}

/**
 * 清除 JWT secret 缓存（全部 env），用于强制下次调用重新解析密钥来源。
 *
 * 语义边界（与 Go 对齐，勿夸大）：
 *   - Go 的 `reset_token` 重置的是**链接签名密钥**，即 DB 里的 `token` 设置
 *     （internal/sign/sign.go: NewHMACSign(setting.GetStr(conf.Token))），
 *     并不更换 JWT 密钥（JWT 用 common.SecretKey = conf.Conf.JwtSecret）；
 *   - TS 的 JWT 密钥来自 env.JWT_SECRET 或持久化的 openlist_jwt_secret，清缓存
 *     后读到的是**同一把**密钥，因此已签发的 JWT **不会**失效——这与 Go 一致。
 * 若确实要求所有已签发 JWT 立即失效，必须更换密钥本身，而不是只清缓存。
 */
export function resetJwtSecretCache(): void {
  cachedJwtSecret = null
  // WeakMap 无法逐项清空，整体替换即可（旧条目随 env 一起被 GC）。
  jwtSecretByEnv = new WeakMap<object, string>()
}

function generateRandomSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

async function readKvSecret(env: any): Promise<string | null> {
  try {
    // 复用 store/json 的通用密钥读取（已支持 binding/blob/api/proxy 全模式）
    const { readPersistedSecret } = await import("../internal/model/db")
    return await readPersistedSecret(env, JWT_SECRET_KV_KEY)
  } catch (e) {
    console.warn("[JWT] Failed to read secret from KV:", e)
    return null
  }
}

async function writeKvSecret(env: any, secret: string): Promise<boolean> {
  try {
    const { writePersistedSecret } = await import("../internal/model/db")
    return await writePersistedSecret(env, JWT_SECRET_KV_KEY, secret)
  } catch (e) {
    console.warn("[JWT] Failed to persist secret to KV:", e)
    return false
  }
}

/**
 * 获取 JWT 签名密钥。
 * 优先级：env.JWT_SECRET > KV 持久化随机密钥 > 进程内随机密钥（仅开发环境）。
 */
export async function getJwtSecret(c?: Context | any): Promise<string> {
  const env =
    c?.env || (typeof process !== "undefined" ? (process as any).env : {}) || {}

  // ── 长度策略：只要求「非空」，32 字符为**推荐值**（不强制）──
  //
  // 这里曾有三个互不相同的阈值：env 走 `>=16`、缓存走 `>=32`、持久化走
  // `>=32`。后果是 **自动生成/持久化的密钥会被读取路径判为无效**：
  //   setup 写入的密钥若不足 32 字符，第 2 步 `>=32` 判定失败 → 落到第 4 步
  //   **重新生成**一把新密钥 → 每次冷启动换钥 → 已签发的 token 全部失效、
  //   多实例间验签互相失败（表现为「登录成功后立刻 401」）。
  // 也就是说「自动生成」看着写了、实际没生效。现在统一为「非空即有效」，
  // 与 db.ts:readEnvEncryptionKey 完全一致，保证「写进去的」必定「读得出来」。
  const useSecret = (s: unknown): string | null =>
    typeof s === "string" && s.trim().length > 0 ? s : null

  // 1. 环境变量显式配置（最优先）
  const envSecret = useSecret(env.JWT_SECRET)
  if (envSecret) {
    return envSecret
  }

  // 2. 持久化密钥（跨实例/重启稳定），按 env 缓存
  // 性能修复：命中后直接返回缓存，避免每次调用都回源存储。
  // 修复前此分支只 `return kvSecret` 而不写缓存，导致
  // getUserFromContext / csrfProtection / checkAdminAuth 等每请求 2-4 次调用
  // 都会各自触发一次后端读取（KV/D1 后端下这是最贵的操作之一）。
  //
  // 缓存粒度按 env 隔离（readCachedJwtSecret/rememberJwtSecret，见文件头注释），
  // 判定统一走 useSecret（「非空即有效」），不再用长度阈值。
  const cached = readCachedJwtSecret(env)
  if (useSecret(cached)) {
    return cached as string
  }

  // 2a. 复用 setup 自动生成的加密密钥（openlist_encryption_secret）。
  //
  // 为什么必须放在这里：`ensureEncryptionSecret()` 在 setup 阶段把自动生成的
  // 密钥写进 **openlist_encryption_secret**，而本函数历史实现只找
  // **openlist_jwt_secret** —— 两个槽位名不同。于是「自动生成」的那把密钥
  // 对 JWT 侧**完全不可见**：本函数会再生成一把存到另一个槽位，
  // 造成同一部署里两把密钥各自漂移（多实例验签失败、冷启动即换钥）。
  // 约定 JWT 与字段加密共用同一把密钥（见 db.ts:1276 的注释），因此这里
  // 显式回退读取加密密钥槽位，保证「生成了一份」就等于「两边都可用」。
  try {
    const sharedSecret = useSecret(
      await readPersistedSecret(env, ENCRYPTION_SECRET_KV_KEY),
    )
    if (sharedSecret) {
      rememberJwtSecret(env, sharedSecret)
      return sharedSecret
    }
  } catch {
    // 读取失败按「无持久化密钥」处理，继续走下面的独立槽位
  }

  // 2b. 独立的 JWT 密钥槽位（历史部署可能已在此写入）
  const kvSecret = useSecret(await readKvSecret(env))
  if (kvSecret) {
    rememberJwtSecret(env, kvSecret)
    return kvSecret
  }

  // 3. 检查是否为生产环境
  const isProduction =
    env.NODE_ENV === "production" ||
    env.ENVIRONMENT === "production" ||
    env.CF_PAGES === "1" ||
    env.WORKERS_ENV === "production"

  // 4. 生成随机密钥并尝试持久化（开发 + 生产兼容）
  //
  // 以**当前 env** 的缓存值判断是否需要生成：同一 env 的重复/并发调用只生成
  // 一次（这里先同步 remember 再 await 持久化，避免并发各生成一把密钥，导致
  // 同一时刻签发的 token 互相验不过）。
  if (!readCachedJwtSecret(env)) {
    const generated = generateRandomSecret()
    rememberJwtSecret(env, generated)
    const persisted = await writeKvSecret(env, generated)
    
    if (isProduction) {
      console.error(
        "[JWT] ⚠️ 🔴 生产环境安全警告：JWT_SECRET 未配置！" +
        (persisted
          ? "\n✅ 已自动生成密钥并持久化到 KV。此密钥将持续使用，但强烈建议手动配置 JWT_SECRET 环境变量以提高安全性。"
          : "\n❌ 无法持久化密钥到 KV！密钥仅存于内存，重启后所有 token 将失效。请立即配置 JWT_SECRET 环境变量！") +
        "\n\n🔒 安全建议：生成密钥命令: openssl rand -hex 32"
      )
    } else {
      console.warn(
        "[JWT] ⚠️  开发环境警告：JWT_SECRET 未配置，使用临时随机密钥。" +
        (persisted
          ? "密钥已持久化到 KV，重启后保持有效。"
          : "密钥仅存于内存，重启后所有 token 将失效。") +
        "\n生产环境部署前，建议配置 32+ 字符的 JWT_SECRET 环境变量（推荐而非强制）。"
      )
    }
  }
  // 走到这里一定已有密钥：步骤 2 命中缓存，或步骤 4 刚生成并 remember。
  return readCachedJwtSecret(env) as string
}

// ---- JWT 注销黑名单（尽力而为：进程内 Set + KV 持久化）----
// 说明：Serverless 多实例下各实例独立缓存，KV 持久化仅在冷启动时加载一次，
// 因此跨实例的「即时」失效不能保证精确，但能在单实例内立即生效，并随新实例
// 冷启动逐步收敛。exp 过期后条目自动清理，不会无限增长。
const REVOKED_KV_KEY = "openlist_revoked_tokens"
const revokedJtis = new Set<string>()
let revokedLoaded = false

async function ensureRevokedLoaded(env: any): Promise<void> {
  if (revokedLoaded) return
  revokedLoaded = true
  try {
    const { getKvBinding } = await import("../internal/model/db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return
    const { binding, mode } = kvInfo
    let val: any = null
    if (mode === "blob") {
      val = await binding.get(REVOKED_KV_KEY)
    } else {
      try {
        val = await binding.get(REVOKED_KV_KEY, "text")
      } catch {
        val = await binding.get(REVOKED_KV_KEY)
      }
    }
    if (val && typeof val.text === "function") val = await val.text()
    if (!val) return
    const arr = JSON.parse(String(val))
    const now = Math.floor(Date.now() / 1000)
    for (const item of arr) {
      if (item && item.jti && item.exp > now) revokedJtis.add(item.jti)
    }
  } catch {
    // 黑名单加载失败时降级为不拦截（不影响登录）
  }
}

export async function revokeToken(
  jti: string,
  exp: number,
  env: any,
): Promise<void> {
  if (!jti) return
  revokedJtis.add(jti)
  try {
    const { getKvBinding } = await import("../internal/model/db")
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return
    const { binding, mode } = kvInfo
    let arr: Array<{ jti: string; exp: number }> = []
    if (mode === "blob") {
      const val = await binding.get(REVOKED_KV_KEY)
      if (val) arr = typeof val === "string" ? JSON.parse(val) : val
    } else {
      try {
        const val = await binding.get(REVOKED_KV_KEY, "text")
        if (val) arr = JSON.parse(String(val))
      } catch {
        const val = await binding.get(REVOKED_KV_KEY)
        if (val) arr = typeof val === "string" ? JSON.parse(val) : val
      }
    }
    const now = Math.floor(Date.now() / 1000)
    arr = arr.filter((i) => i && i.exp > now)
    arr.push({ jti, exp })
    const payload = JSON.stringify(arr)
    if (mode === "blob") {
      if (typeof binding.set === "function")
        await binding.set(REVOKED_KV_KEY, payload)
      else if (typeof binding.put === "function")
        await binding.put(REVOKED_KV_KEY, payload)
    } else {
      if (typeof binding.put === "function")
        await binding.put(REVOKED_KV_KEY, payload)
      else if (typeof binding.set === "function")
        await binding.set(REVOKED_KV_KEY, payload)
    }
  } catch (e) {
    console.warn("[JWT] Failed to persist revoked token to KV:", e)
  }
}

export async function isTokenRevoked(jti: string, env: any): Promise<boolean> {
  if (!jti) return false
  await ensureRevokedLoaded(env)
  return revokedJtis.has(jti)
}

export async function adminAuthMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const isAdmin = await checkAdminAuth(c)
  if (!isAdmin) {
    return c.json(
      {
        code: 401,
        message: "Unauthorized admin privilege required",
        data: null,
      },
      401,
    )
  }
  await next()
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * 定时调度鉴权通道：EdgeOne Schedules 只能携带 path/method/payload，
 * 无法附加 Authorization 头。复用 JWT_SECRET 作为调度密钥，
 * 允许请求通过 query（?cron_secret=）、JSON body { cron_secret }
 * 或 X-Cron-Secret 头携带匹配值触发受保护的任务接口。
 */
export async function matchCronSecret(c: Context): Promise<boolean> {
  const env = (c as any)?.env || {}
  const secret =
    env.JWT_SECRET ||
    (typeof process !== "undefined" ? process.env?.JWT_SECRET : "")
  if (!secret || typeof secret !== "string") return false

  const header = c.req.header("x-cron-secret")
  if (header && timingSafeEqual(header, secret)) return true

  const query = c.req.query("cron_secret")
  if (query && timingSafeEqual(query, secret)) return true

  try {
    const body = await c.req.json()
    const provided = body?.cron_secret
    if (
      typeof provided === "string" &&
      provided.length > 0 &&
      timingSafeEqual(provided, secret)
    ) {
      return true
    }
  } catch {}

  return false
}

/**
 * 从请求上下文解析当前用户：
 * - 静态 API Token（与 adminAuthMiddleware 同源）→ 视为管理员
 * - JWT（Authorization header 或 query parameter token/access_token）→ 查 DB 用户
 * - 无凭证时，仅当数据库中存在且未禁用的 guest 用户时才返回该游客信息；
 * - 若 guest 用户不存在（被删除）或被禁用，则返回 null（未授权状态）。
 */
// ============ CSRF 防护 (添加日期: 2026-09-05) ============
/**
 * 生成 CSRF Token（短期有效，1小时过期）
 */
export async function generateCSRFToken(c: Context): Promise<string> {
  const { sign } = await import("hono/jwt")
  const secret = await getJwtSecret(c)
  const token = await sign(
    {
      type: "csrf",
      jti: crypto.randomUUID ? crypto.randomUUID() : generateRandomSecret().slice(0, 16),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 小时过期
    },
    secret,
  )
  return token
}

/**
 * CSRF 保护中间件：对 POST/PUT/DELETE/PATCH 请求验证 CSRF token
 * GET/HEAD/OPTIONS 请求豁免检查
 * 
 * 安全增强 (2026-09-08):
 * - 仅允许从 HTTP Header 获取 token（移除 Query 和 Body 获取）
 * - 防止 JSON 劫持和 URL 泄露攻击
 */
export async function csrfProtection(
  c: Context,
  next: () => Promise<void>,
) {
  const method = c.req.method.toUpperCase()

  // GET/HEAD/OPTIONS 请求无需 CSRF 验证
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next()
  }

  // 仅从 HTTP Header 获取 CSRF token（安全最佳实践）
  // 移除 Query 和 Body 获取以防止攻击者通过 JSON 劫持或 URL 泄露绕过 CSRF 防护
  const token = c.req.header("x-csrf-token") || c.req.header("X-CSRF-Token")

  if (!token) {
    return c.json(
      {
        code: 403,
        message: "CSRF token missing. Please include X-CSRF-Token header.",
        data: null,
      },
      403,
    )
  }

  try {
    const { verify } = await import("hono/jwt")
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")

    if (payload.type !== "csrf") {
      throw new Error("Invalid token type")
    }

    // Token 有效，继续处理
    await next()
  } catch (err: any) {
    return c.json(
      {
        code: 403,
        message: "Invalid or expired CSRF token",
        data: null,
      },
      403,
    )
  }
}

// ============ 审计日志中间件 (添加日期: 2026-09-05) ============
/**
 * 审计日志中间件：记录所有状态修改操作
 * 仅记录 POST/PUT/DELETE/PATCH 请求
 */
export async function auditMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  const startTime = Date.now()
  const method = c.req.method.toUpperCase()
  const path = c.req.path

  // 仅记录状态修改操作
  const shouldAudit = ["POST", "PUT", "DELETE", "PATCH"].includes(method)

  await next()

  if (shouldAudit) {
    try {
      const { logAudit } = await import("../internal/model/audit")
      const user = await getUserFromContext(c).catch(() => null)
      const duration = Date.now() - startTime
      const statusCode = c.res.status || 200
      const status = statusCode >= 200 && statusCode < 400 ? "success" : "failure"

      // 获取客户端 IP
      const ip =
        c.req.header("cf-connecting-ip") ||
        c.req.header("x-real-ip") ||
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"

      await logAudit(
        {
          user_id: user?.id,
          username: user?.username || "anonymous",
          ip,
          action: `${method} ${path}`,
          resource: path,
          method,
          status,
          status_code: statusCode,
          details: JSON.stringify({ duration_ms: duration }),
          user_agent: c.req.header("user-agent"),
          duration_ms: duration,
        },
        c.env,
      )
    } catch (err) {
      // 审计日志失败不影响业务流程
      console.warn("[Audit] Failed to log:", err)
    }
  }
}

export async function getUserFromContext(c: Context): Promise<{
  id?: number
  role: number
  permission: number
  disabled?: boolean
  username?: string
  base_path?: string
  sso_id?: string
  allow_ldap?: boolean
  otp_secret?: string
} | null> {
  // 仅静态 API token（settings.token）命中才视为匿名管理员；
  // JWT 管理员走下方正常解析，避免用户名被硬编码成 "api-token"。
  if (await isStaticApiToken(c)) {
    return {
      role: 2,
      permission: 0,
      disabled: false,
      username: "api-token",
      base_path: "/",
    }
  }

  let authHeader = c.req.header("Authorization")
  if (!authHeader) {
    const queryToken = c.req.query("token") || c.req.query("access_token")
    if (queryToken) {
      authHeader = `Bearer ${queryToken}`
    }
  }

  // 无 Authorization header：尝试使用 guest 用户作为后备
  // 注意：guest 不可用时返回 null 是合理的，调用方应该正确处理
  if (!authHeader) {
    try {
      const db = await getDb(c.env)
      const guest = (db.users || []).find((u: any) => u.username === "guest")
      if (guest && !guest.disabled) {
        return {
          id: guest.id,
          role: guest.role ?? 1,
          permission: guest.permission ?? 0,
          disabled: !!guest.disabled,
          username: guest.username,
          base_path: guest.base_path || "/",
          sso_id: guest.sso_id || "",
          allow_ldap: !!guest.allow_ldap,
          otp_secret: guest.otp_secret,
        }
      }
    } catch {}
    // guest 不存在或被禁用，返回 null
    // 调用方应该检查是否有其他方式获取用户（如 query token）
    return null
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  try {
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret, "HS256")
    if (await isTokenRevoked(payload?.jti, c.env)) return null
    const db = await getDb(c.env)
    const user = (db.users || []).find(
      (u: any) => u.id === payload.id || u.username === payload.username,
    )
    if (!user || user.disabled) return null
    return {
      id: user.id,
      role: user.role,
      permission: user.permission ?? 0,
      disabled: !!user.disabled,
      username: user.username,
      base_path: user.base_path || "/",
      sso_id: user.sso_id || "",
      allow_ldap: !!user.allow_ldap,
      otp_secret: user.otp_secret,
    }
  } catch {
    return null
  }
}
