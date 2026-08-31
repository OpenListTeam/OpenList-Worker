# Cloudflare Workers 部署指南

OpenListNext 基于 [Hono](https://hono.dev/) 框架构建后端 API，天然支持运行在 Cloudflare Workers 等边缘 Serverless 平台上。本文将指引你如何将 OpenListNext 部署到 Cloudflare Workers。

---

## 目录

- [前置准备](#前置准备)
- [配置文件说明](#配置文件说明)
- [创建与绑定 Cloudflare KV](#创建与绑定-cloudflare-kv)
- [构建与打包](#构建与打包)
- [本地预览与调试](#本地预览与调试)
- [部署到 Cloudflare Workers](#部署到-cloudflare-workers)
- [配置自定义域名与 Secrets 密钥](#配置自定义域名与-secrets-密钥)
- [注意事项与常见问题](#注意事项与常见问题)

---

## 前置准备

1. **环境要求**：
   - Node.js 18.0 或更高版本
   - 包管理器：`pnpm` (推荐, `v9+`) 或 `npm` / `yarn`

2. **Cloudflare 账号**：
   - 注册并登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)

3. **登录 Wrangler CLI**：
   项目已内置 `wrangler` 依赖，你可以通过 `npx wrangler` 调用：
   ```bash
   npx wrangler login
   ```
   浏览器会自动打开并要求授权登录你的 Cloudflare 账号。

---

## 配置文件说明

项目根目录下的 [wrangler.toml](../wrangler.toml) 是 Cloudflare Workers 的核心配置文件：

```toml
name = "openlistnext"
main = "src/backend/worker.ts"
compatibility_date = "2026-08-04"
compatibility_flags = ["nodejs_compat"]
workers_dev = false
preview_urls = false

[assets]
directory = "./dist"
binding = "ASSETS"

[vars]
ENVIRONMENT = "production"
VITE_API_URL = "/api"

[[kv_namespaces]]
binding = "OPENLISTNEXT_KV"
```

- **`main`**: 指定 Worker 入口文件，OpenListNext 导出 Worker 标准 `fetch` 接口的入口为 [src/backend/worker.ts](../src/backend/worker.ts)。
- **`compatibility_flags = ["nodejs_compat"]`**: 开启 Node.js 兼容层（必需）。
- **`workers_dev = false`**: 禁用默认的 `*.workers.dev` 子域名，仅通过自定义域名访问。
- **`[assets]`**: 配置前端静态资源托管，构建产物从 `dist/` 目录提供。
- **`[[kv_namespaces]]`**: 用于数据库与配置在边缘侧的持久化存储。

### 关于 KV 命名空间绑定

wrangler.toml 中的 `[[kv_namespaces]]` **不需要填写 `id`**。Wrangler 4.x 支持 Automatic Provisioning——部署时会自动检测或创建名为 `OPENLISTNEXT_KV` 的命名空间并关联绑定。你只需在 Makers 控制台或 Cloudflare Dashboard 中确保该命名空间存在，或让 Wrangler 自动处理。

若需手动创建命名空间（可选）：

```bash
npx wrangler kv:namespace create OPENLISTNEXT_KV
```

> [!NOTE]
> 即使手动创建了命名空间，wrangler.toml 中也无需填入 `id`，Wrangler 会根据名称自动关联。

---

## 创建与绑定 Cloudflare KV

OpenListNext 在 Serverless 环境中使用 Cloudflare KV 来存储配置数据和数据库记录（替代本地 `public_data/db.json` 文件）。

**推荐方式：Automatic Provisioning（无需手动配置）**

Wrangler 4.x 支持自动配置——部署时会自动检测或创建名为 `OPENLISTNEXT_KV` 的命名空间并关联绑定。你只需：

1. 确保 wrangler.toml 中有 `[[kv_namespaces]]` 配置（已内置）
2. 直接运行 `npx wrangler deploy`，Wrangler 会自动处理命名空间创建和关联

**可选方式：手动创建命名空间**

如果你想手动控制命名空间的创建：

```bash
npx wrangler kv:namespace create OPENLISTNEXT_KV
```

命令行将输出类似以下的信息：

```text
🌀 Creating namespace with title "openlistnext-OPENLISTNEXT_KV"
✨ Success! Created namespace openlistnext-OPENLISTNEXT_KV with ID "a1b2c3d4e5f67890abcdef1234567890"
```

> [!NOTE]
> 即使手动创建了命名空间，wrangler.toml 中也无需填入 `id`。Wrangler 4.x 会根据绑定名称 `OPENLISTNEXT_KV` 自动关联正确的命名空间。

---

## 构建与打包

在部署 Worker 之前，需要先构建前端静态文件与 Edge 后端代码：

```bash
# 1. 安装项目依赖
pnpm install

# 2. 打包项目 (同时打包 Vite 前端与 Edge 后端)
pnpm build
```

---

## 本地预览与调试

在将应用部署到线上之前，你可以在本地模拟 Cloudflare Workers 运行环境：

```bash
pnpm dev:worker
```

该命令会调用 `wrangler dev`，在本地启动 Workers 运行时与模拟 KV 数据库。

---

## 部署到 Cloudflare Workers

执行部署脚本将应用一键上传发布至 Cloudflare 全球边缘网络：

```bash
pnpm deploy:worker
```

或者直接运行：

```bash
npx wrangler deploy
```

部署完成后，命令行会返回分配的默认访问域名（如 `https://openlistnext.<your-subdomain>.workers.dev`）。

---

## 配置自定义域名与 Secrets 密钥

### 1. 配置自定义环境变量 / Secrets

生产环境敏感配置推荐使用 Secrets 安全存储：

```bash
# 设置管理员密码（首次部署必须，否则系统生成随机密码并打印到日志）
npx wrangler secret put ADMIN_PASSWORD

# 设置 JWT 签名密钥
npx wrangler secret put JWT_SECRET
```

系统会提示你输入 Secret 值。

> [!IMPORTANT]
> 如果不设置 `ADMIN_PASSWORD`，系统会在首次启动时生成一个随机密码并打印到启动日志。请务必查看日志获取初始密码，登录后立即修改。

### 2. 绑定自定义域名

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 导航至 **Workers & Pages** -> 选择你的 Worker (`openlistnext`)。
3. 进入 **Settings** -> **Triggers** -> **Custom Domains**。
4. 点击 **Add Custom Domain**，输入你在 Cloudflare 解析的自定义域名（例如 `openlist.example.com`）并确认。

---

## 注意事项与常见问题

> [!IMPORTANT]
> **Serverless 无状态特性说明**：
> Cloudflare Workers 运行在无状态边缘计算节点上，因此：
>
> 1. 本地硬盘存储驱动 (`Local` Driver) 在 Worker 部署环境下无法作为长期存储使用，推荐配置并使用对象存储（如 **AWS S3 / Cloudflare R2 / 阿里云 OSS / WebDAV** 等云存储驱动）。
> 2. 系统配置及用户状态会自动持久化到绑定的 `OPENLISTNEXT_KV` 数据库中。

> [!TIP]
> **资源配额**：
> Cloudflare Workers 免费版计划每日包含 100,000 次免费请求，并支持最多 1,000 次 KV 写操作与 100,000 次 KV 读操作。

## 网盘驱动与 Cloudflare Workers 出口 IP 风控

> [!WARNING]
> **123 云盘（123Pan）在 CF Workers 上的登录风控**：
> 123 云盘官方禁止在数据中心/陌生设备 IP 上挂载账号，其**登录接口**会对
> Cloudflare Workers 的境外数据中心出口 IP 触发风控：
>
> ```
> 当前账号存在境外登录风险，请使用短信验证码或者微信进行登录。
> ```
>
> **这是 123 服务端策略，Go 原版 OpenList 部署到 CF Workers 同样会触发**
> （OpenList 官方文档也提示该驱动"需要开启本地代理以防止反盗链检测"）。

### 可靠方案（按推荐顺序）

1. **使用有效 access_token（推荐）**：
   - 在**本机浏览器**登录 https://www.123pan.com/（本机 IP 不受风控）
   - 打开开发者工具（F12）→ Network → 任意 API 请求 → 复制请求头中的
     `Authorization: Bearer <token>` 值
   - 填入存储设置的 **access_token** 字段（令牌有效期内 API 请求不受登录风控影响）
2. **部署到境内服务器**：使用 `npm run build && npm run start`（Node 容器模式）
   部署到境内 VPS/家用主机，出口 IP 为境内宽带，账号密码可直接登录
3. 若账号曾触发风控：先在 https://www.123pan.com/ 登录一次或修改密码解除账号风险

> [!NOTE]
> 其他驱动（夸克、阿里云盘、OneDrive、Google Drive、115、百度网盘）的 token 类
> 凭证不受登录 IP 风控影响，CF Workers 部署可直接使用。
