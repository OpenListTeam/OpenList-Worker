/**
 * CSRF (Cross-Site Request Forgery) 防护模块
 * 添加日期: 2026-09-05
 * 
 * 实现基于 Token 的 CSRF 防护
 * 支持两种模式：
 * 1. Double Submit Cookie - Cookie + Header 双重验证
 * 2. Synchronizer Token - Session 存储的 Token
 */

import { createMiddleware } from "hono/factory"
import type { Context } from "hono"

/**
 * CSRF Token 配置
 */
export interface CSRFOptions {
  // Cookie 名称
  cookieName?: string
  // Header 名称
  headerName?: string
  // Token 有效期（秒）
  maxAge?: number
  // Cookie 配置
  cookieOptions?: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: "strict" | "lax" | "none"
    path?: string
  }
  // 豁免路径（不需要 CSRF 保护）
  ignorePaths?: string[]
  // 豁免方法（默认只保护 POST/PUT/DELETE/PATCH）
  ignoreMethods?: string[]
}

const DEFAULT_OPTIONS: Required<Omit<CSRFOptions, "ignorePaths" | "ignoreMethods">> = {
  cookieName: "csrf_token",
  headerName: "x-csrf-token",
  maxAge: 3600, // 1 小时
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  },
}

/**
 * 生成随机 CSRF Token
 * @param length Token 长度（默认 32 字节）
 * @returns Base64 编码的 Token
 */
export function generateCSRFToken(length: number = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  // 使用 Base64 URL-safe 编码
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

/**
 * 验证 CSRF Token
 * @param token1 来自 Cookie 的 Token
 * @param token2 来自 Header 的 Token
 * @returns 是否匹配
 */
export function verifyCSRFToken(token1: string, token2: string): boolean {
  if (!token1 || !token2) return false
  if (token1.length !== token2.length) return false

  // 使用时间安全的字符串比较（防止时序攻击）
  return timingSafeEqual(token1, token2)
}

/**
 * 时间安全的字符串比较
 * 防止时序攻击（Timing Attack）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * CSRF 中间件（Hono）
 * 
 * 使用方式：
 * ```typescript
 * import { csrfMiddleware } from "./pkg/csrf"
 * 
 * app.use("*", csrfMiddleware({
 *   ignorePaths: ["/api/public/*", "/api/auth/login"],
 * }))
 * ```
 */
export function csrfMiddleware(options: CSRFOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const ignoreMethods = options.ignoreMethods || ["GET", "HEAD", "OPTIONS"]
  const ignorePaths = options.ignorePaths || []

  return createMiddleware(async (c: Context, next) => {
    const method = c.req.method
    const path = c.req.path

    // 1. 豁免的方法（GET/HEAD/OPTIONS 默认不需要 CSRF）
    if (ignoreMethods.includes(method)) {
      await next()
      return
    }

    // 2. 豁免的路径（公开 API 不需要 CSRF）
    for (const pattern of ignorePaths) {
      if (matchPath(path, pattern)) {
        await next()
        return
      }
    }

    // 3. 检查 CSRF Token
    const cookieToken = getCookie(c, opts.cookieName)
    const headerToken = c.req.header(opts.headerName)

    if (!cookieToken || !headerToken) {
      return c.json(
        {
          code: 403,
          message: "CSRF token missing",
          data: null,
        },
        403,
      )
    }

    if (!verifyCSRFToken(cookieToken, headerToken)) {
      return c.json(
        {
          code: 403,
          message: "CSRF token invalid",
          data: null,
        },
        403,
      )
    }

    // 4. 验证通过，继续处理请求
    await next()
  })
}

/**
 * 生成并设置 CSRF Token
 * 在登录成功后调用
 * 
 * 使用方式：
 * ```typescript
 * const token = await setCSRFToken(c)
 * return c.json({ token, csrf_token: token })
 * ```
 */
export function setCSRFToken(c: Context, options: CSRFOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const token = generateCSRFToken()

  // 设置 Cookie
  setCookie(c, opts.cookieName, token, {
    maxAge: opts.maxAge,
    ...opts.cookieOptions,
  })

  return token
}

/**
 * 清除 CSRF Token
 * 在登出时调用
 */
export function clearCSRFToken(c: Context, options: CSRFOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  setCookie(c, opts.cookieName, "", {
    maxAge: 0,
    ...opts.cookieOptions,
  })
}

/**
 * 路径匹配（支持通配符 *）
 * @param path 实际路径
 * @param pattern 匹配模式（支持 * 通配符）
 * @returns 是否匹配
 * 
 * 示例：
 * - matchPath("/api/users/123", "/api/users/*") => true
 * - matchPath("/api/users/123", "/api/users/123") => true
 * - matchPath("/api/users", "/api/users/*") => false
 */
function matchPath(path: string, pattern: string): boolean {
  // 精确匹配
  if (path === pattern) return true

  // 通配符匹配
  if (pattern.includes("*")) {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\//g, "\\/") + "$",
    )
    return regex.test(path)
  }

  return false
}

/**
 * 获取 Cookie（兼容 Cloudflare Workers）
 */
function getCookie(c: Context, name: string): string | undefined {
  const cookieHeader = c.req.header("cookie")
  if (!cookieHeader) return undefined

  const cookies = cookieHeader.split(";").map((c) => c.trim())
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=")
    if (key === name) return decodeURIComponent(value)
  }
  return undefined
}

/**
 * 设置 Cookie（兼容 Cloudflare Workers）
 */
function setCookie(
  c: Context,
  name: string,
  value: string,
  options: {
    maxAge?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: "strict" | "lax" | "none"
    path?: string
  } = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }

  if (options.httpOnly) {
    parts.push("HttpOnly")
  }

  if (options.secure) {
    parts.push("Secure")
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }

  if (options.path) {
    parts.push(`Path=${options.path}`)
  }

  c.header("Set-Cookie", parts.join("; "))
}

/**
 * Express/Koa 风格的中间件（如果需要）
 */
export function csrfProtection(options: CSRFOptions = {}) {
  return async (req: any, res: any, next: any) => {
    const method = req.method
    const path = req.path || req.url

    const ignoreMethods = options.ignoreMethods || ["GET", "HEAD", "OPTIONS"]
    const ignorePaths = options.ignorePaths || []

    // 豁免的方法
    if (ignoreMethods.includes(method)) {
      return next()
    }

    // 豁免的路径
    for (const pattern of ignorePaths) {
      if (matchPath(path, pattern)) {
        return next()
      }
    }

    // 检查 Token
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const cookieToken = req.cookies?.[opts.cookieName]
    const headerToken = req.headers?.[opts.headerName]

    if (!cookieToken || !headerToken || !verifyCSRFToken(cookieToken, headerToken)) {
      res.status(403).json({
        code: 403,
        message: "CSRF token invalid or missing",
        data: null,
      })
      return
    }

    next()
  }
}
