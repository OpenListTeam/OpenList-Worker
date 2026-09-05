# 安全漏洞修复实施方案

本文档提供详细的代码级修复方案，可直接执行。

---

## 阶段一：紧急修复（P0 - 24小时内完成）

### 修复 1: 登录爆破防护

**文件**: `src/backend/server/middlewares.ts`

在文件末尾添加：

```typescript
// ============ 登录限流机制 ============
interface LoginAttempt {
  count: number
  lockUntil?: number
  firstAttempt: number
}

const loginAttempts = new Map<string, LoginAttempt>()
const MAX_ATTEMPTS = 5
const LOCK_DURATION = 15 * 60 * 1000 // 15 分钟
const WINDOW_DURATION = 5 * 60 * 1000 // 5 分钟内最多尝试 5 次

// 定期清理过期记录（每小时）
setInterval(() => {
  const now = Date.now()
  for (const [ip, attempt] of loginAttempts.entries()) {
    if (attempt.lockUntil && attempt.lockUntil < now) {
      loginAttempts.delete(ip)
    } else if (now - attempt.firstAttempt > WINDOW_DURATION) {
      loginAttempts.delete(ip)
    }
  }
}, 60 * 60 * 1000)

export function getClientIP(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  )
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)

  if (!attempt) {
    return { allowed: true }
  }

  // 检查是否被锁定
  if (attempt.lockUntil && attempt.lockUntil > now) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((attempt.lockUntil - now) / 1000) 
    }
  }

  // 检查时间窗口
  if (now - attempt.firstAttempt > WINDOW_DURATION) {
    // 窗口过期，重置计数
    loginAttempts.delete(ip)
    return { allowed: true }
  }

  // 检查尝试次数
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockUntil = now + LOCK_DURATION
    return { 
      allowed: false, 
      retryAfter: Math.ceil(LOCK_DURATION / 1000) 
    }
  }

  return { allowed: true }
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)

  if (!attempt) {
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: now
    })
  } else {
    attempt.count++
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.lockUntil = now + LOCK_DURATION
    }
  }
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip)
}
```

**文件**: `src/backend/server/auth.ts`

修改登录处理函数：

```typescript
// 在文件顶部添加导入
import { 
  getClientIP, 
  checkLoginRateLimit, 
  recordLoginFailure, 
  clearLoginAttempts 
} from './middlewares'

// 修改 loginHash 函数（约第 120 行）
publicRouter.post("/auth/login-hash", async (c) => {
  const ip = getClientIP(c)
  
  // 检查限流
  const rateLimit = checkLoginRateLimit(ip)
  if (!rateLimit.allowed) {
    return c.json({
      code: 429,
      message: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
      data: null
    }, 429)
  }

  const { username, password, otp_code } = await c.req.json()

  if (!username || !password) {
    recordLoginFailure(ip)
    return c.json({ code: 400, message: "Username and password required" }, 400)
  }

  const db = await getDb(c.env)
  const user = db.users.find((u: any) => u.username === username)

  if (!user) {
    recordLoginFailure(ip)
    return c.json({ code: 401, message: "Invalid username or password" }, 401)
  }

  // 验证密码
  const isValid = await verifyPasswordHash(password, user.password)
  if (!isValid) {
    recordLoginFailure(ip)
    return c.json({ code: 401, message: "Invalid username or password" }, 401)
  }

  // TODO: 验证 2FA (otp_code)

  // 登录成功，清除失败记录
  clearLoginAttempts(ip)

  // 生成 token
  const token = await generateToken(user, c)
  return c.json({ code: 200, message: "Login successful", data: { token } })
})
```

---

### 修复 2: CORS 配置收紧

**文件**: `src/backend/server/router.ts`

修改 CORS 中间件（约第 145 行）：

```typescript
// CORS Middleware
const allowedOrigins = (env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// 如果未配置，使用安全默认值
if (allowedOrigins.length === 0) {
  console.warn('[Security] ALLOWED_ORIGINS not configured, using restrictive CORS policy')
  allowedOrigins.push('https://localhost:3000') // 仅开发环境
}

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      // 无 origin 表示同源请求或非浏览器客户端
      if (!origin) return origin

      // 检查是否在白名单
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === '*') return true // 显式配置为 * 时才允许
        if (allowed === origin) return true
        // 支持子域名通配符: *.example.com
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2)
          return origin.endsWith('.' + domain) || origin === 'https://' + domain
        }
        return false
      })

      if (!isAllowed) {
        console.warn(`[CORS] Rejected origin: ${origin}`)
        return allowedOrigins[0] // 返回默认源而非拒绝，避免暴露配置
      }

      return origin
    },
    credentials: true, // 允许携带凭证
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposeHeaders: ['Content-Length', 'Content-Range'],
    maxAge: 86400, // 24 小时
  }),
)
```

**文件**: `src/backend/server/raw.ts`

移除硬编码的 `Access-Control-Allow-Origin: *`（第 192、272、329 行）：

```typescript
// 删除这些行：
// c.header("Access-Control-Allow-Origin", "*")

// 改为依赖全局 CORS 中间件
// （无需额外代码，删除即可）
```

---

### 修复 3: 清理错误日志泄漏

**文件**: `src/backend/server/middlewares.ts`

在文件顶部添加：

```typescript
function isDevelopment(env?: any): boolean {
  const e = env || (typeof process !== 'undefined' ? process.env : {})
  return e?.ENVIRONMENT === 'development' || e?.NODE_ENV === 'development'
}

function safeLog(level: 'log' | 'warn' | 'error', message: string, detail?: any, env?: any) {
  const isDev = isDevelopment(env)
  
  if (level === 'error') {
    console.error(message)
    if (isDev && detail) {
      console.error('Detail:', detail)
    }
  } else if (level === 'warn') {
    console.warn(message)
    if (isDev && detail) {
      console.warn('Detail:', detail)
    }
  } else {
    if (isDev) {
      console.log(message, detail)
    }
  }
}
```

批量替换所有 `console.warn` 和 `console.error`：

```bash
# 使用 sed 或手动替换
# 示例（需要根据实际情况调整）：
# console.warn("[JWT] Failed to read secret from KV:", e)
# 改为：
# safeLog('warn', '[JWT] Failed to read secret from KV', e, env)
```

**关键位置**：
- `middlewares.ts`: 39, 63, 94, 180 行
- `db.ts`: 所有 console.error
- `server/*.ts`: 所有错误输出

---

### 修复 4: 环境变量泄漏检查

**文件**: `.gitignore`

确保包含：

```gitignore
# 环境变量
.env
.env.local
.env.*.local
**/.env
pages/.env

# 日志
*.log
logs/

# 临时文件
*.tmp
*.temp

# 密钥
*.key
*.pem
*.p12
*.pfx

# 数据库
*.db
*.sqlite
*.sqlite3
```

**立即执行**：

```bash
# 1. 检查是否有 .env 文件被跟踪
git ls-files | grep "\.env$"

# 2. 如果有，移除跟踪
git rm --cached pages/.env
git rm --cached .env

# 3. 检查 Git 历史（如果曾提交过）
git log --all --full-history -- "*.env"

# 4. 如果历史中有，使用 BFG Repo-Cleaner 清理
# https://rtyley.github.io/bfg-repo-cleaner/
```

---

## 阶段二：重要修复（P1 - 1周内完成）

### 修复 5: CSRF 防护

**文件**: `src/backend/server/middlewares.ts`

```typescript
import { sign, verify } from 'hono/jwt'

// CSRF Token 生成
export async function generateCSRFToken(c: Context): Promise<string> {
  const secret = await getJwtSecret(c)
  const token = await sign(
    {
      type: 'csrf',
      jti: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 小时
    },
    secret
  )
  return token
}

// CSRF 验证中间件
export async function csrfProtection(c: Context, next: () => Promise<void>) {
  const method = c.req.method.toUpperCase()
  
  // GET/HEAD/OPTIONS 请求无需 CSRF 验证
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next()
  }

  // 获取 CSRF token
  const token = c.req.header('x-csrf-token') || 
                c.req.query('csrf_token') ||
                (await c.req.json().catch(() => ({})))?.csrf_token

  if (!token) {
    return c.json({
      code: 403,
      message: 'CSRF token missing',
      data: null
    }, 403)
  }

  try {
    const secret = await getJwtSecret(c)
    const payload: any = await verify(token, secret)
    
    if (payload.type !== 'csrf') {
      throw new Error('Invalid token type')
    }

    // Token 有效，继续处理
    await next()
  } catch (err) {
    return c.json({
      code: 403,
      message: 'Invalid or expired CSRF token',
      data: null
    }, 403)
  }
}
```

**应用到路由**：

```typescript
// router.ts
import { csrfProtection } from './middlewares'

// 对所有修改操作应用 CSRF 保护
app.use('/api/admin/*', csrfProtection)
app.use('/api/fs/put', csrfProtection)
app.use('/api/fs/rename', csrfProtection)
app.use('/api/fs/remove', csrfProtection)
// ... 其他需要保护的路由
```

**前端集成**：

```typescript
// 登录后获取 CSRF token
const response = await fetch('/api/auth/csrf', {
  credentials: 'include'
})
const { csrf_token } = await response.json()

// 存储到 localStorage
localStorage.setItem('csrf_token', csrf_token)

// 所有请求自动附加
fetch('/api/admin/settings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': localStorage.getItem('csrf_token')
  },
  body: JSON.stringify(data)
})
```

---

### 修复 6: 密码哈希升级

**安装依赖**：

```bash
npm install @node-rs/bcrypt
```

**文件**: `src/backend/pkg/crypto.ts`

添加新的密码哈希函数：

```typescript
import { hash, verify } from '@node-rs/bcrypt'

const BCRYPT_ROUNDS = 12 // 根据性能调整，推荐 10-14

/**
 * 使用 bcrypt 哈希密码（新版本）
 */
export async function hashPasswordBcrypt(password: string): Promise<string> {
  return await hash(password, BCRYPT_ROUNDS)
}

/**
 * 验证 bcrypt 密码
 */
export async function verifyPasswordBcrypt(password: string, hash: string): Promise<boolean> {
  try {
    return await verify(password, hash)
  } catch {
    return false
  }
}

/**
 * 统一密码验证入口（兼容旧的 SHA256）
 */
export async function verifyPasswordUnified(password: string, storedHash: string): Promise<boolean> {
  // 检测哈希类型
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    // bcrypt 哈希
    return await verifyPasswordBcrypt(password, storedHash)
  } else if (storedHash.length === 64 && /^[0-9a-f]+$/i.test(storedHash)) {
    // SHA256 哈希（旧版本）
    const sha256Hash = await hashPassword(password) // 使用现有的 SHA256 函数
    return sha256Hash === storedHash
  } else {
    // 未知格式
    return false
  }
}

/**
 * 密码迁移：检测旧哈希并升级
 */
export async function migratePasswordIfNeeded(
  user: any,
  plainPassword: string,
  saveCallback: (user: any) => Promise<void>
): Promise<void> {
  // 如果是旧的 SHA256 哈希，升级为 bcrypt
  if (user.password.length === 64 && /^[0-9a-f]+$/i.test(user.password)) {
    console.log(`[Security] Migrating password hash for user: ${user.username}`)
    user.password = await hashPasswordBcrypt(plainPassword)
    await saveCallback(user)
  }
}
```

**更新登录逻辑**：

```typescript
// auth.ts
import { verifyPasswordUnified, migratePasswordIfNeeded } from '../pkg/crypto'

// 在登录验证中
const isValid = await verifyPasswordUnified(password, user.password)
if (!isValid) {
  recordLoginFailure(ip)
  return c.json({ code: 401, message: "Invalid username or password" }, 401)
}

// 登录成功后检查是否需要迁移
await migratePasswordIfNeeded(user, password, async (updatedUser) => {
  const db = await getDb(c.env)
  const userIndex = db.users.findIndex((u: any) => u.id === updatedUser.id)
  if (userIndex >= 0) {
    db.users[userIndex] = updatedUser
    await saveDb(db, c.env)
  }
})
```

---

### 修复 7: 输入验证

**安装依赖**：

```bash
npm install zod
```

**文件**: `src/backend/pkg/validators.ts` (新文件)

```typescript
import { z } from 'zod'

// 用户登录
export const loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(6).max(128),
  otp_code: z.string().length(6).regex(/^\d+$/).optional()
})

// 用户注册/更新
export const userSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number'
  ).optional(),
  role: z.number().int().min(0).max(2),
  base_path: z.string().max(500),
  disabled: z.boolean().optional()
})

// 存储配置
export const storageSchema = z.object({
  mount_path: z.string().min(1).max(500).startsWith('/'),
  driver: z.string().min(1).max(50),
  order: z.number().int().min(0),
  disabled: z.boolean().optional(),
  cache_expiration: z.number().int().min(0).optional(),
  addition: z.string().max(10000) // JSON string
})

// 文件路径验证
export const filePathSchema = z.string()
  .max(2000)
  .regex(/^[^<>:"|?*\x00-\x1F]*$/, 'Invalid characters in path')
  .refine(path => !path.includes('..'), 'Path traversal not allowed')

// 设置键值
export const settingSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  value: z.string().max(10000),
  type: z.enum(['string', 'number', 'bool', 'text', 'select']),
  options: z.string().optional(),
  group: z.number().int().min(1).max(20),
  flag: z.number().int().min(0).max(2)
})

// 验证辅助函数
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Validation failed: ${errors}`)
  }
  return result.data
}
```

**应用验证**：

```typescript
// auth.ts
import { loginSchema, validateOrThrow } from '../pkg/validators'

publicRouter.post("/auth/login-hash", async (c) => {
  try {
    const body = await c.req.json()
    const data = validateOrThrow(loginSchema, body)
    
    // 使用验证后的 data.username, data.password
    // ...
  } catch (err: any) {
    return c.json({ 
      code: 400, 
      message: err.message || 'Invalid input',
      data: null 
    }, 400)
  }
})
```

---

### 修复 8: 审计日志系统

**文件**: `src/backend/internal/model/audit.ts` (新文件)

```typescript
export interface AuditLog {
  id?: number
  timestamp: string
  user_id?: number
  username: string
  ip: string
  action: string
  resource: string
  details: string
  status: 'success' | 'failure'
  user_agent?: string
}

let auditLogs: AuditLog[] = []
const MAX_MEMORY_LOGS = 1000

/**
 * 记录审计日志
 */
export async function logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  const log: AuditLog = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...entry
  }

  // 内存存储（生产环境应写入数据库）
  auditLogs.push(log)
  
  // 防止内存溢出
  if (auditLogs.length > MAX_MEMORY_LOGS) {
    auditLogs = auditLogs.slice(-MAX_MEMORY_LOGS)
  }

  // TODO: 写入 D1/MySQL
  // await writeToDatabase(log)
  
  // 控制台输出（可选）
  console.log(`[AUDIT] ${log.username} ${log.action} ${log.resource} from ${log.ip} - ${log.status}`)
}

/**
 * 查询审计日志
 */
export function queryAuditLogs(filters?: {
  username?: string
  action?: string
  startDate?: string
  endDate?: string
  limit?: number
}): AuditLog[] {
  let results = auditLogs

  if (filters?.username) {
    results = results.filter(log => log.username === filters.username)
  }

  if (filters?.action) {
    results = results.filter(log => log.action.includes(filters.action))
  }

  if (filters?.startDate) {
    results = results.filter(log => log.timestamp >= filters.startDate!)
  }

  if (filters?.endDate) {
    results = results.filter(log => log.timestamp <= filters.endDate!)
  }

  const limit = filters?.limit || 100
  return results.slice(-limit).reverse()
}
```

**集成到中间件**：

```typescript
// middlewares.ts
import { logAudit } from '../internal/model/audit'
import { getUserFromContext, getClientIP } from './middlewares'

export async function auditMiddleware(c: Context, next: () => Promise<void>) {
  const startTime = Date.now()
  const method = c.req.method
  const path = c.req.path

  // 仅记录状态修改操作
  const shouldAudit = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

  await next()

  if (shouldAudit) {
    const user = await getUserFromContext(c).catch(() => null)
    const duration = Date.now() - startTime
    const status = c.res.status >= 200 && c.res.status < 400 ? 'success' : 'failure'

    await logAudit({
      user_id: user?.id,
      username: user?.username || 'anonymous',
      ip: getClientIP(c),
      action: `${method} ${path}`,
      resource: path,
      details: JSON.stringify({ duration, status_code: c.res.status }),
      status,
      user_agent: c.req.header('user-agent')
    })
  }
}
```

**应用到路由**：

```typescript
// router.ts
import { auditMiddleware } from './middlewares'

app.use('/api/admin/*', auditMiddleware)
app.use('/api/fs/*', auditMiddleware)
```

**查询接口**：

```typescript
// admin.ts
import { queryAuditLogs } from '../internal/model/audit'

adminRouter.get('/audit/logs', async (c) => {
  const { username, action, start_date, end_date, limit } = c.req.query()
  
  const logs = queryAuditLogs({
    username,
    action,
    startDate: start_date,
    endDate: end_date,
    limit: limit ? parseInt(limit) : 100
  })

  return c.json({ code: 200, message: 'success', data: logs })
})
```

---

## 阶段三：功能补全（P2 - 2周内完成）

### 实现 9: 双因素认证 (2FA)

**安装依赖**：

```bash
npm install otplib qrcode
```

**文件**: `src/backend/pkg/totp.ts` (新文件)

```typescript
import * as OTPAuth from 'otplib'
import QRCode from 'qrcode'

// 配置 TOTP
OTPAuth.authenticator.options = {
  window: 1, // 允许前后 30 秒误差
  step: 30   // 30 秒更新一次
}

/**
 * 生成 2FA 密钥
 */
export function generateTOTPSecret(): string {
  return OTPAuth.authenticator.generateSecret()
}

/**
 * 生成 QR 码 URL
 */
export async function generateQRCode(username: string, secret: string, issuer: string = 'OpenList'): Promise<string> {
  const otpauth = OTPAuth.authenticator.keyuri(username, issuer, secret)
  return await QRCode.toDataURL(otpauth)
}

/**
 * 验证 TOTP 代码
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return OTPAuth.authenticator.verify({ token, secret })
  } catch {
    return false
  }
}

/**
 * 生成备用恢复码（8 位数字，10 个）
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString()
    codes.push(code)
  }
  return codes
}
```

**API 实现**：

```typescript
// auth.ts
import { generateTOTPSecret, generateQRCode, verifyTOTP, generateRecoveryCodes } from '../pkg/totp'

// 生成 2FA 设置
adminRouter.post('/auth/2fa/generate', async (c) => {
  const user = await getUserFromContext(c)
  
  if (!user || user.role !== 2) {
    return c.json({ code: 403, message: 'Admin only' }, 403)
  }

  const secret = generateTOTPSecret()
  const qrcode = await generateQRCode(user.username!, secret)
  const recoveryCodes = generateRecoveryCodes()

  // 临时存储（等待用户验证后才正式启用）
  // TODO: 存储到临时表或 KV
  
  return c.json({
    code: 200,
    message: 'success',
    data: {
      secret,
      qrcode,
      recovery_codes: recoveryCodes
    }
  })
})

// 启用 2FA
adminRouter.post('/auth/2fa/enable', async (c) => {
  const user = await getUserFromContext(c)
  const { secret, token } = await c.req.json()

  if (!verifyTOTP(token, secret)) {
    return c.json({ code: 400, message: 'Invalid verification code' }, 400)
  }

  // 更新用户
  const db = await getDb(c.env)
  const userIndex = db.users.findIndex((u: any) => u.id === user!.id)
  if (userIndex >= 0) {
    db.users[userIndex].otp_secret = secret
    await saveDb(db, c.env)
  }

  return c.json({ code: 200, message: '2FA enabled successfully' })
})

// 禁用 2FA
adminRouter.post('/auth/2fa/disable', async (c) => {
  const user = await getUserFromContext(c)
  const { password } = await c.req.json()

  // 验证密码
  const db = await getDb(c.env)
  const dbUser = db.users.find((u: any) => u.id === user!.id)
  
  if (!await verifyPasswordUnified(password, dbUser.password)) {
    return c.json({ code: 401, message: 'Invalid password' }, 401)
  }

  // 移除 2FA
  const userIndex = db.users.findIndex((u: any) => u.id === user!.id)
  if (userIndex >= 0) {
    db.users[userIndex].otp_secret = ''
    await saveDb(db, c.env)
  }

  return c.json({ code: 200, message: '2FA disabled' })
})
```

**登录流程集成**：

```typescript
// 在 login-hash 中添加 2FA 验证
if (user.otp_secret) {
  if (!otp_code) {
    return c.json({
      code: 402,
      message: '2FA code required',
      data: { requires_2fa: true }
    }, 402)
  }

  if (!verifyTOTP(otp_code, user.otp_secret)) {
    recordLoginFailure(ip)
    return c.json({
      code: 401,
      message: 'Invalid 2FA code',
      data: null
    }, 401)
  }
}
```

---

## 执行检查清单

### 第一天（P0）

- [ ] 实施登录爆破防护
- [ ] 修复 CORS 配置
- [ ] 清理错误日志泄漏
- [ ] 检查环境变量泄漏
- [ ] 运行安全测试

### 第一周（P1）

- [ ] 实施 CSRF 防护
- [ ] 升级密码哈希
- [ ] 集成输入验证
- [ ] 实现审计日志
- [ ] 添加安全响应头

### 第二周（P2）

- [ ] 实现 2FA
- [ ] 完善测试覆盖
- [ ] 更新文档
- [ ] 部署到测试环境
- [ ] 渗透测试

---

## 验证方法

### 测试登录限流

```bash
# 多次错误登录
for i in {1..6}; do
  curl -X POST https://your-worker.workers.dev/api/auth/login-hash \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done

# 预期：第 6 次返回 429 Too Many Requests
```

### 测试 CORS

```bash
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-worker.workers.dev/api/admin/settings

# 预期：Access-Control-Allow-Origin 不应为 https://evil.com
```

### 测试 CSRF

```bash
# 无 CSRF token
curl -X POST https://your-worker.workers.dev/api/admin/settings \
  -H "Authorization: Bearer valid-token" \
  -d '{"key":"value"}'

# 预期：403 CSRF token missing
```

---

## 回滚计划

如果修复导致问题：

```bash
# 1. 检查 Git 状态
git status

# 2. 回滚特定文件
git checkout HEAD -- src/backend/server/middlewares.ts

# 3. 或回滚整个提交
git revert <commit-hash>

# 4. 重新部署
npm run deploy
```

---

**修复完成后请重新运行完整的安全审计。**
