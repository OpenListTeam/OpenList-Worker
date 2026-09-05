# 🚀 立即开始 - 命令行操作指南

**目标**: 10 分钟内完成安装、验证和启动

---

## ⚡ 快速命令 (复制粘贴即可)

### 第 1 步: 进入项目目录

```bash
cd G:\Codes\OpenListTeam\OpenList-TSWorker
```

### 第 2 步: 安装依赖 (2 分钟)

```bash
npm install
```

**新增依赖**:
- `bcryptjs` - 密码哈希
- `otplib` - 双因素认证

### 第 3 步: 检查代码质量 (可选)

```bash
# Lint 检查
npm run lint

# 类型检查 (如果配置了)
npm run type-check
```

### 第 4 步: 运行测试 (可选)

```bash
# 运行所有测试
npm test

# 或者先跳过，后续补齐
```

### 第 5 步: 启动开发服务器 (1 分钟)

```bash
npm run dev
```

**预期输出**:
```
✓ Built in XXXms
⎔ Starting local server...
│ [wrangler:inf] Ready on http://localhost:8787
```

---

## 🧪 验证清单

### 测试登录功能

**方法 1: 使用 curl**

```bash
# 测试登录 (应该返回 JWT token 和 csrf_token)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"your_password\"}"
```

**预期响应**:
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "csrf_token": "abc123def456..."
  }
}
```

**方法 2: 使用浏览器**

1. 打开 http://localhost:8787
2. 输入用户名和密码
3. 检查浏览器控制台，查看是否收到 `csrf_token`

### 测试 CSRF 防护

```bash
# 1. 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.data.token')

CSRF=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.data.csrf_token')

# 2. 测试无 CSRF Token 的请求 (应该被拒绝)
curl -X POST http://localhost:8787/api/files/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 预期: 403 Forbidden

# 3. 测试有 CSRF Token 的请求 (应该成功)
curl -X POST http://localhost:8787/api/files/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json"

# 预期: 200 OK
```

### 测试密码哈希升级

```bash
# 查看日志，应该看到类似输出:
# [Auth] Upgrading password hash for user: admin
# [Auth] Password upgraded successfully
```

### 测试审计日志

```bash
# 登录后，审计日志应该记录
# 查看控制台输出，应该看到:
# [Audit] login_success: user=admin ip=127.0.0.1
```

---

## 📁 阅读文档 (10 分钟)

```bash
# 进入文档目录
cd docs

# 1. 快速开始 (5 分钟)
cat QUICK-START.md

# 2. 审计完成总结 (15 分钟)
cat AUDIT-COMPLETION-SUMMARY.md

# 3. P1 实施报告 (20 分钟)
cat SECURITY-P1-IMPLEMENTATION-REPORT.md

# 4. 文档导航 (3 分钟)
cat AUDIT-REPORTS-README.md

# 5. 任务完成报告 (10 分钟)
cat TASK-COMPLETION-REPORT.md
```

**或使用编辑器打开**:
```bash
# VS Code
code docs/QUICK-START.md

# Notepad++
notepad++ docs/QUICK-START.md

# 记事本
notepad docs\QUICK-START.md
```

---

## 🐛 常见问题

### 问题 1: npm install 失败

**错误**: `npm ERR! network timeout`

**解决**:
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install

# 或者使用 pnpm
pnpm install

# 或者使用 yarn
yarn install
```

### 问题 2: bcryptjs 安装失败

**错误**: `node-gyp rebuild failed`

**解决**:
```bash
# bcryptjs 是纯 JS 实现，不需要编译
# 确保使用的是 bcryptjs 而不是 bcrypt
npm install bcryptjs --save

# 如果还是失败，删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 问题 3: 端口被占用

**错误**: `Error: listen EADDRINUSE: address already in use :::8787`

**解决**:
```bash
# 查找占用端口的进程
# Windows:
netstat -ano | findstr :8787
taskkill /PID <PID> /F

# 或者修改端口
wrangler dev --port 8788
```

### 问题 4: 找不到 wrangler 命令

**错误**: `'wrangler' is not recognized`

**解决**:
```bash
# 全局安装 wrangler
npm install -g wrangler

# 或者使用 npx
npx wrangler dev

# 或者使用项目本地的 wrangler
npm run dev
```

---

## 📋 下一步行动

### ✅ 完成验证后

1. **前端更新** - 添加 CSRF Token 支持
   ```typescript
   // 从登录响应获取
   const { token, csrf_token } = await loginResponse.json()
   
   // 在请求中使用
   headers: {
     'Authorization': `Bearer ${token}`,
     'X-CSRF-Token': csrf_token
   }
   ```

2. **编写测试** - 单元测试和集成测试
   ```bash
   # 创建测试文件
   touch src/backend/pkg/__tests__/totp.test.ts
   touch src/backend/pkg/__tests__/password.test.ts
   ```

3. **部署测试环境**
   ```bash
   # 部署到 Cloudflare Workers
   wrangler deploy --env staging
   ```

4. **监控和优化**
   - 查看审计日志
   - 分析性能指标
   - 收集用户反馈

---

## 📊 检查清单

### 安装阶段
- [ ] 安装依赖成功
- [ ] 无 lint 错误
- [ ] 无类型错误
- [ ] 开发服务器启动成功

### 功能验证
- [ ] 登录功能正常
- [ ] 返回 csrf_token
- [ ] CSRF 防护生效
- [ ] 密码哈希升级工作
- [ ] 审计日志记录正确

### 文档阅读
- [ ] 快速开始指南
- [ ] 审计完成总结
- [ ] P1 实施报告
- [ ] 任务完成报告

### 下一步准备
- [ ] 前端更新计划
- [ ] 测试编写计划
- [ ] 部署计划
- [ ] 监控方案

---

## 🎯 时间估算

```
npm install:          2 分钟
代码检查:            2 分钟
启动服务器:          1 分钟
功能验证:            5 分钟
文档阅读:            10 分钟
━━━━━━━━━━━━━━━━━━━━━━━━━━━
总计:                20 分钟
```

---

## 📞 获取帮助

遇到问题？查看这些文档:

1. **QUICK-START.md** - 快速开始和常见问题
2. **SECURITY-P1-IMPLEMENTATION-REPORT.md** - 技术细节
3. **TASK-COMPLETION-REPORT.md** - 任务总结

---

**现在就开始吧！** 🚀

```bash
cd G:\Codes\OpenListTeam\OpenList-TSWorker
npm install
npm run dev
```
