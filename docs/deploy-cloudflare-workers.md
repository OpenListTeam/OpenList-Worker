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

项目根目录下的 [wrangler.toml](file:///c:/Users/aaajn/Documents/GitHub/openlistnext/wrangler.toml) 是 Cloudflare Workers 的核心配置文件：

```toml
name = "openlistnext"
main = "src/backend/worker.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "OPENLIST_KV"
id = "OPENLIST_KV_ID"
```

- **`main`**: 指定 Worker 入口文件，OpenListNext 导出 Worker 标准 `fetch` 接口的入口为 [src/backend/worker.ts](file:///c:/Users/aaajn/Documents/GitHub/openlistnext/src/backend/worker.ts)。
- **`compatibility_flags = ["nodejs_compat"]`**: 开启 Node.js 兼容层（必需）。
- **`[[kv_namespaces]]`**: 用于数据库与配置在边缘侧的持久化存储。

若要同时托管前端静态资源，可以在 `wrangler.toml` 中开启静态资源配置：
```toml
assets = { directory = "./dist" }
```

---

## 创建与绑定 Cloudflare KV

OpenListNext 在 Serverless 环境中使用 Cloudflare KV 来存储配置数据和数据库记录（替代本地 `public_data/db.json` 文件）。

1. **创建生产环境 KV 命名空间**：
   运行以下命令创建用于 OpenListNext 的 KV 空间：
   ```bash
   npx wrangler kv:namespace create OPENLIST_KV
   ```

   命令行将输出类似以下的信息：
   ```text
   🌀 Creating namespace with title "openlistnext-OPENLIST_KV"
   ✨ Success! Created namespace openlistnext-OPENLIST_KV with ID "a1b2c3d4e5f67890abcdef1234567890"
   ```

2. **更新 `wrangler.toml`**：
   将获取到的 `ID` 填入 [wrangler.toml](file:///c:/Users/aaajn/Documents/GitHub/openlistnext/wrangler.toml) 文件中：
   ```toml
   [[kv_namespaces]]
   binding = "OPENLIST_KV"
   id = "a1b2c3d4e5f67890abcdef1234567890" # 替换为你自己的 KV Namespace ID
   ```

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

生产环境敏感配置（如 JWT 签名私钥等）推荐使用 Secrets 安全存储：

```bash
npx wrangler secret put JWT_SECRET
```
系统会提示你输入 Secret 值。

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
> 1. 本地硬盘存储驱动 (`Local` Driver) 在 Worker 部署环境下无法作为长期存储使用，推荐配置并使用对象存储（如 **AWS S3 / Cloudflare R2 / 阿里云 OSS / WebDAV** 等云存储驱动）。
> 2. 系统配置及用户状态会自动持久化到绑定的 `OPENLIST_KV` 数据库中。

> [!TIP]
> **资源配额**：
> Cloudflare Workers 免费版计划每日包含 100,000 次免费请求，并支持最多 1,000 次 KV 写操作与 100,000 次 KV 读操作。
