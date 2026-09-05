# OpenList-TSWorker 安全修复检查清单

> 本清单提供分步骤的安全修复指南，可直接执行。建议按优先级依次完成。

---

## ✅ 阶段 P0: 紧急修复（24小时内）

### 任务 1: 环境变量泄漏检查 ⏱️ 10分钟

**检查步骤**:

```bash
# 1. 检查是否有 .env 文件被 Git 跟踪
cd G:/Codes/OpenListTeam/OpenList-TSWorker
git ls-files | grep "\.env$"

# 2. 检查 .gitignore 配置
cat .gitignore | grep -E "\.env|\.log|\.key"
```

**如果发现问题，执行修复**:

```bash
# 1. 更新 .gitignore
cat >> .gitignore << 'EOF'

# 环境变量（添加日期：2026-09-05）
.env
.env.local
.env.*.local
**/.env
pages/.env

# 敏感文件
*.key
*.pem
*.p12
*.pfx

# 日志文件
*.log
logs/
EOF

# 2. 从 Git 中移除已跟踪的敏感文件
git rm --cached pages/.env 2>/dev/null || echo "文件未被跟踪"
git rm --cached .env 2>/dev/null || echo "文件未被跟踪"

# 3. 提交变更
git add .gitignore
git commit -m "security: 防止敏感文件泄漏到版本控制"

# 4. 检查 Git 历史（如果曾提交过）
git log --all --full-history --oneline -- "*.env" "*.key"

# 如果历史中有敏感文件，需要清理历史（谨慎操作！）
# git filter-branch --force --index-filter \
#   "git rm --cached --ignore-unmatch pages/.env" \
#   --prune-empty --tag-name-filter cat -- --all
```

**验证**:
```bash
git ls-files | grep "\.env$" # 应该无输出
```

- [ ] ✅ .gitignore 已更新
- [ ] ✅ 敏感文件已从 Git 移除
- [ ] ✅ 历史中无敏感信息

---

### 任务 2: CORS 配置修复 ⏱️ 30分钟

**文件**: `src/backend/server/router.ts`

**步骤 1**: 在 `wrangler.toml` 或 `.env` 添加配置

```toml
# wrangler.toml
[vars]
ALLOWED_ORIGINS = "https://yourdomain.com,https://www.yourdomain.com"
```

**步骤 2**: 修改 CORS 中间件

找到约 145 行的 CORS 配置，替换为：

```typescript
// CORS Middleware - 修复日期：2026-09-05
const allowedOrigins = (env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// 开发环境默认值
if (allowedOrigins.length === 0) {
  console.warn('[Security] ALLOWED_ORIGINS not configured, using restrictive CORS policy')
  if (env.ENVIRONMENT === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000')
  }
}

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return origin // 同源请求
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === '*') return true
        if (allowed === origin) return true
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2)
          return origin.endsWith('.' + domain) || origin === 'https://' + domain
        }
        return false
      })
      
      if (!isAllowed) {
        console.warn(`[CORS] Rejected origin: ${origin}`)
        return allowedOrigins[0] || 'https://example.com'
      }
      
      return origin
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposeHeaders: ['Content-Length', 'Content-Range'],
    maxAge: 86400,
  }),
)
```

**步骤 3**: 移除其他文件中的硬编码 CORS

```bash
# 搜索并手动删除
grep -r "Access-Control-Allow-Origin" src/backend/server/
# 在 raw.ts 等文件中删除类似这样的行：
# c.header("Access-Control-Allow-Origin", "*")
```

**验证**:
```bash
# 测试非法源
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-worker.workers.dev/api/admin/settings

# 预期：Access-Control-Allow-Origin 不应为 https://evil.com
```

- [ ] ✅ CORS 配置已修改
- [ ] ✅ 硬编码的 CORS 头已移除
- [ ] ✅ 测试通过

---

### 任务 3: 添加登录限流 ⏱️ 2小时

**步骤 1**: 修改 `src/backend/server/middlewares.ts`

在文件末尾添加：

```typescript
// ============ 登录限流机制 ============
// 添加日期：2026-09-05

interface LoginAttempt {
  count: number
  lockUntil?: number
  firstAttempt: number
}

const loginAttempts = new Map<string, LoginAttempt>()
const MAX_ATTEMPTS = 5
const LOCK_DURATION = 15 * 60 * 1000 // 15 分钟
const WINDOW_DURATION = 5 * 60 * 1000 // 5 分钟窗口

// 定期清理过期记录
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

  if (attempt.lockUntil && attempt.lockUntil > now) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((attempt.lockUntil - now) / 1000) 
    }
  }

  if (now - attempt.firstAttempt > WINDOW_DURATION) {
    loginAttempts.delete(ip)
    return { allowed: true }
  }

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

**步骤 2**: 修改 `src/backend/server/auth.ts`

在文件顶部添加导入：

```typescript
import { 
  getClientIP, 
  checkLoginRateLimit, 
  recordLoginFailure, 
  clearLoginAttempts 
} from './middlewares'
```

找到 `/auth/login-hash` 路由（约第 120 行），在开头添加：

```typescript
publicRouter.post("/auth/login-hash", async (c) => {
  const ip = getClientIP(c)
  
  // 检查限流
  const rateLimit = checkLoginRateLimit(ip)
  if (!rateLimit.allowed) {
    return c.json({
      code: 429,
      message: `登录尝试次数过多，请 ${rateLimit.retryAfter} 秒后重试`,
      data: null
    }, 429)
  }

  const { username, password, otp_code } = await c.req.json()

  if (!username || !password) {
    recordLoginFailure(ip)
    return c.json({ code: 400, message: "用户名和密码不能为空" }, 400)
  }

  const db = await getDb(c.env)
  const user = db.users.find((u: any) => u.username === username)

  if (!user) {
    recordLoginFailure(ip)
    return c.json({ code: 401, message: "用户名或密码错误" }, 401)
  }

  // 验证密码（保持原有逻辑）
  const isValid = await verifyPasswordHash(password, user.password)
  if (!isValid) {
    recordLoginFailure(ip)
    return c.json({ code: 401, message: "用户名或密码错误" }, 401)
  }

  // 登录成功，清除失败记录
  clearLoginAttempts(ip)

  // ... 后续逻辑保持不变
})
```

**验证**:
```bash
# 测试脚本
for i in {1..6}; do
  echo "尝试 $i"
  curl -X POST http://localhost:8787/api/auth/login-hash \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
  echo ""
done

# 预期：第 6 次返回 429 状态码
```

- [ ] ✅ 限流逻辑已添加
- [ ] ✅ 登录接口已集成
- [ ] ✅ 测试通过（第 6 次登录被拒绝）

---

### 任务 4: 清理敏感日志 ⏱️ 1小时

**步骤 1**: 在 `middlewares.ts` 添加安全日志函数

```typescript
function isDevelopment(env?: any): boolean {
  return env?.ENVIRONMENT === 'development' || 
         env?.NODE_ENV === 'development'
}

function safeLog(
  level: 'log' | 'warn' | 'error', 
  message: string, 
  detail?: any, 
  env?: any
) {
  const isDev = isDevelopment(env)
  
  if (level === 'error') {
    console.error(message)
    if (isDev && detail) console.error('Detail:', detail)
  } else if (level === 'warn') {
    console.warn(message)
    if (isDev && detail) console.warn('Detail:', detail)
  } else {
    if (isDev) console.log(message, detail)
  }
}
```

**步骤 2**: 批量替换敏感日志

```bash
# 搜索所有 console.error 和 console.warn
grep -rn "console\.\(error\|warn\)" src/backend/server/ src/backend/internal/

# 手动检查并替换，特别注意：
# - middlewares.ts: 39, 63, 94, 180 行
# - db.ts: 所有 console.error
# - auth.ts: 错误日志
```

**示例替换**:

```typescript
// 替换前
console.warn("[JWT] Failed to read secret from KV:", e)

// 替换后
safeLog('warn', '[JWT] Failed to read secret from KV', e, c.env)
```

**步骤 3**: 统一错误响应

在 `src/backend/pkg/http.ts` 添加：

```typescript
export function errorResponse(
  c: Context,
  code: number,
  message: string,
  detail?: any
) {
  const isDev = c.env?.ENVIRONMENT === 'development'
  
  return c.json({
    code,
    message,
    ...(isDev && detail ? { detail } : {}),
    timestamp: new Date().toISOString()
  }, code)
}
```

- [ ] ✅ 安全日志函数已添加
- [ ] ✅ 敏感日志已替换
- [ ] ✅ 错误响应已统一

---

### 任务 5: 部署验证 ⏱️ 30分钟

```bash
# 1. 运行测试
npm test

# 2. 类型检查
npm run typecheck

# 3. 构建
npm run build

# 4. 本地测试
npm run dev

# 5. 测试 P0 修复
# - 尝试 6 次错误登录（应该被限流）
# - 尝试跨域请求（应该被拒绝）
# - 检查日志输出（不应泄漏敏感信息）

# 6. 部署到测试环境
npm run deploy:staging

# 7. 生产部署（确认无误后）
npm run deploy
```

- [ ] ✅ 所有测试通过
- [ ] ✅ 本地验证成功
- [ ] ✅ 已部署到生产环境

---

## ✅ 阶段 P1: 重要修复（1周内）

### 任务 6: 实现 CSRF 防护 ⏱️ 4小时

**步骤 1**: 安装依赖（如果需要）

```bash
# Hono 已内置 JWT 支持，无需额外安装
```

**步骤 2**: 在 `middlewares.ts` 添加 CSRF 功能

```typescript
import { sign, verify } from 'hono/jwt'

export async function generateCSRFToken(c: Context): Promise<string> {
  const secret = await getJwtSecret(c)
  const token = await sign(
    {
      type: 'csrf',
      jti: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    secret
  )
  return token
}

export async function csrfProtection(c: Context, next: () => Promise<void>) {
  const method = c.req.method.toUpperCase()
  
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next()
  }

  const token = c.req.header('x-csrf-token') || 
                c.req.query('csrf_token')

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

**步骤 3**: 应用到路由 (`router.ts`)

```typescript
import { csrfProtection } from './middlewares'

// 对所有修改操作应用 CSRF 保护
app.use('/api/admin/*', csrfProtection)
app.use('/api/fs/put', csrfProtection)
app.use('/api/fs/rename', csrfProtection)
app.use('/api/fs/remove', csrfProtection)
app.use('/api/fs/mkdir', csrfProtection)
```

**步骤 4**: 添加 CSRF token 获取接口 (`auth.ts`)

```typescript
adminRouter.get('/auth/csrf', async (c) => {
  const token = await generateCSRFToken(c)
  return c.json({ code: 200, data: { csrf_token: token } })
})
```

**验证**:
```bash
# 无 token 应该失败
curl -X POST http://localhost:8787/api/admin/settings \
  -H "Authorization: Bearer valid-token" \
  -d '{"key":"value"}'
# 预期：403 CSRF token missing
```

- [ ] ✅ CSRF 功能已实现
- [ ] ✅ 路由已保护
- [ ] ✅ 测试通过

---

### 任务 7: 升级密码哈希 ⏱️ 4小时

**步骤 1**: 安装 bcrypt

```bash
npm install @node-rs/bcrypt
```

**步骤 2**: 在 `crypto.ts` 添加新函数

```typescript
import { hash, verify } from '@node-rs/bcrypt'

const BCRYPT_ROUNDS = 12

export async function hashPasswordBcrypt(password: string): Promise<string> {
  return await hash(password, BCRYPT_ROUNDS)
}

export async function verifyPasswordBcrypt(password: string, hash: string): Promise<boolean> {
  try {
    return await verify(password, hash)
  } catch {
    return false
  }
}

export async function verifyPasswordUnified(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return await verifyPasswordBcrypt(password, storedHash)
  } else if (storedHash.length === 64 && /^[0-9a-f]+$/i.test(storedHash)) {
    const sha256Hash = await hashPassword(password)
    return sha256Hash === storedHash
  } else {
    return false
  }
}
```

**步骤 3**: 更新登录逻辑 (`auth.ts`)

```typescript
// 替换密码验证
const isValid = await verifyPasswordUnified(password, user.password)
```

**步骤 4**: 添加迁移逻辑

```typescript
// 登录成功后检查是否需要迁移
if (isValid && user.password.length === 64) {
  // 旧的 SHA256 哈希，升级为 bcrypt
  console.log(`[Security] Migrating password hash for user: ${user.username}`)
  user.password = await hashPasswordBcrypt(password)
  
  const db = await getDb(c.env)
  const userIndex = db.users.findIndex((u: any) => u.id === user.id)
  if (userIndex >= 0) {
    db.users[userIndex] = user
    await saveDb(db, c.env)
  }
}
```

- [ ] ✅ bcrypt 已安装
- [ ] ✅ 新哈希函数已添加
- [ ] ✅ 登录逻辑已更新
- [ ] ✅ 迁移逻辑已实现

---

### 任务 8: 添加输入验证 ⏱️ 4小时

**步骤 1**: 安装 zod

```bash
npm install zod
```

**步骤 2**: 创建验证器 (`src/backend/pkg/validators.ts`)

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(6).max(128),
  otp_code: z.string().length(6).regex(/^\d+$/).optional()
})

export const userSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128).optional(),
  role: z.number().int().min(0).max(2),
  base_path: z.string().max(500),
  disabled: z.boolean().optional()
})

export const filePathSchema = z.string()
  .max(2000)
  .regex(/^[^<>:"|?*\x00-\x1F]*$/)
  .refine(path => !path.includes('..'), 'Path traversal not allowed')

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Validation failed: ${errors}`)
  }
  return result.data
}
```

**步骤 3**: 应用到登录接口 (`auth.ts`)

```typescript
import { loginSchema, validateOrThrow } from '../pkg/validators'

publicRouter.post("/auth/login-hash", async (c) => {
  try {
    const body = await c.req.json()
    const data = validateOrThrow(loginSchema, body)
    
    // 使用 data.username, data.password
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

- [ ] ✅ zod 已安装
- [ ] ✅ 验证器已创建
- [ ] ✅ 关键接口已应用验证

---

### 任务 9: 实现审计日志 ⏱️ 1天

**步骤 1**: 创建审计日志模块 (`src/backend/internal/model/audit.ts`)

参考 SECURITY-FIX-PLAN.md 中的完整代码。

**步骤 2**: 添加审计中间件 (`middlewares.ts`)

```typescript
import { logAudit } from '../internal/model/audit'

export async function auditMiddleware(c: Context, next: () => Promise<void>) {
  const method = c.req.method
  const shouldAudit = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

  await next()

  if (shouldAudit) {
    const user = await getUserFromContext(c).catch(() => null)
    
    await logAudit({
      user_id: user?.id,
      username: user?.username || 'anonymous',
      ip: getClientIP(c),
      action: `${method} ${c.req.path}`,
      resource: c.req.path,
      details: JSON.stringify({ status: c.res.status }),
      status: c.res.status < 400 ? 'success' : 'failure',
      user_agent: c.req.header('user-agent')
    })
  }
}
```

**步骤 3**: 应用到路由

```typescript
app.use('/api/admin/*', auditMiddleware)
app.use('/api/fs/*', auditMiddleware)
```

- [ ] ✅ 审计日志模块已创建
- [ ] ✅ 中间件已实现
- [ ] ✅ 已应用到关键路由

---

## ✅ 阶段 P2: 功能完善（2周内）

### 任务 10: 实现 2FA ⏱️ 3天

参考 SECURITY-FIX-PLAN.md 中的详细步骤。

### 任务 11: 完善测试 ⏱️ 1周

```bash
# 创建测试文件
# src/backend/server/auth.test.ts
# src/backend/pkg/crypto.test.ts
# src/backend/pkg/validators.test.ts
```

### 任务 12: 更新文档 ⏱️ 2天

- [ ] ✅ README 更新
- [ ] ✅ API 文档完善
- [ ] ✅ 部署指南更新
- [ ] ✅ 安全最佳实践文档

---

## 📊 进度跟踪

### P0 进度

- [ ] 任务 1: 环境变量检查
- [ ] 任务 2: CORS 修复
- [ ] 任务 3: 登录限流
- [ ] 任务 4: 日志清理
- [ ] 任务 5: 部署验证

**预计完成时间**: ___________  
**实际完成时间**: ___________

### P1 进度

- [ ] 任务 6: CSRF 防护
- [ ] 任务 7: 密码哈希升级
- [ ] 任务 8: 输入验证
- [ ] 任务 9: 审计日志

**预计完成时间**: ___________  
**实际完成时间**: ___________

### P2 进度

- [ ] 任务 10: 2FA
- [ ] 任务 11: 测试完善
- [ ] 任务 12: 文档更新

**预计完成时间**: ___________  
**实际完成时间**: ___________

---

## 🚨 注意事项

1. **备份数据** - 修改前请备份数据库
2. **测试环境** - 先在测试环境验证
3. **分支管理** - 每个任务使用独立分支
4. **代码审查** - 关键修改需要 peer review
5. **用户通知** - 部署后通知用户修改密码

---

## 📞 遇到问题？

- 查看 **SECURITY-FIX-PLAN.md** 获取详细代码
- 查看 **SECURITY-AUDIT-REPORT.md** 了解漏洞详情
- 联系安全团队获取支持

---

**检查清单版本**: 1.0  
**最后更新**: 2026-09-05
