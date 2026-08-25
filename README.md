<div align="center">

<img src="/logo.png" width="128" alt="OpenListNext Logo" />

# OpenListNext

**一个现代化的全栈文件列表 / 网盘管理系统**

OpenListNext 是 [OpenList](https://github.com/OpenListTeam/OpenList) 的定制全栈分支，用轻量级 **Node.js (Hono + TypeScript)** 后端替代了原版 Go 后端，部署更轻量、启动更快、无需编译 Go 二进制。

<br/>

### 👥 贡献者 & 协作者

<a href="https://github.com/Polonium-salts"><img src="https://github.com/Polonium-salts.png" width="48" height="48" alt="Polonium-salts" style="border-radius: 50%; margin: 2px;" title="Polonium-salts" /></a>
<a href="https://github.com/Dummysky06"><img src="https://github.com/Dummysky06.png" width="48" height="48" alt="Dummysky06" style="border-radius: 50%; margin: 2px;" title="Dummysky06" /></a>
<a href="https://github.com/lie-jiu"><img src="https://github.com/lie-jiu.png" width="48" height="48" alt="lie-jiu (烈酒)" style="border-radius: 50%; margin: 2px;" title="lie-jiu (烈酒)" /></a>
<a href="https://github.com/Astroptis"><img src="https://github.com/Astroptis.png" width="48" height="48" alt="Astroptis" style="border-radius: 50%; margin: 2px;" title="Astroptis" /></a>
<a href="https://github.com/BAJJDY"><img src="https://github.com/BAJJDY.png" width="48" height="48" alt="BAJJDY" style="border-radius: 50%; margin: 2px;" title="BAJJDY" /></a>
<a href="https://github.com/chenyimaio"><img src="https://github.com/chenyimaio.png" width="48" height="48" alt="chenyimaio" style="border-radius: 50%; margin: 2px;" title="chenyimaio" /></a>

<br/><br/>

[技术架构](#-技术架构) · [快速开始](#-快速开始) · [部署方法](#-部署方法) · [贡献指南](CONTRIBUTING.md) · [原版项目](#-原版项目) · [许可证](#-许可证)

</div>

---

## ✨ 功能特性

- 📁 文件浏览、搜索、排序、分页
- 👁️ 多格式预览：PDF、Markdown、代码、Office、图片画廊、视频 / 音频（字幕 / 弹幕 / 歌词）
- 📥 上传 / 下载 / 删除 / 重命名 / 移动 / 复制，文件夹打包下载
- 🔗 文件永久链接、直链下载、分享链接（含提取码）
- 🌙 黑暗模式、国际化（中 / 英）
- 🔐 JWT 认证、密码保护、后台管理、双因素验证（TOTP 2FA）
- ☁️ 多网盘驱动：夸克网盘、阿里云盘、Google Drive、OneDrive、百度网盘、123 云盘、S3 兼容存储（AWS S3 / MinIO / R2 / OSS / COS）、WebDAV、本地文件系统
- ⚡ 边缘部署：Cloudflare Workers / Vercel / Serverless 开箱即用

---

## 🧱 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    前端 (SolidJS)                    │
│  SolidJS 1.9 · @hope-ui/solid · Vite 8 · TS 5.9     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP /api
┌──────────────────────▼──────────────────────────────┐
│                    后端 (Hono)                       │
│  Hono 4 · TypeScript · 无 Node.js 依赖（纯 Web 标准）│
│  ├── /api/fs     文件操作（列表/上传/下载/管理）      │
│  ├── /api/auth   JWT 认证                            │
│  ├── /api/admin  后台管理（存储/用户/元数据/分享）    │
│  ├── /api/share  分享管理                            │
│  ├── /api/task   任务管理                            │
│  ├── /api/raw · /d · /p · /sd  下载与代理            │
│  └── /api/mcp    MCP 协议支持                        │
└──────────────────────┬──────────────────────────────┘
                       │ 存储驱动接口 (StorageDriver)
┌──────────────────────▼──────────────────────────────┐
│     存储驱动层：Local · Quark · AliyundriveOpen ·    │
│           GoogleDrive · Onedrive · BaiduNetdisk      │
│          · 123Pan · S3 · WebDAV                      │
└──────────────────────┬──────────────────────────────┘
                       │ 持久化
        ┌──────────────┴───────────────┐
        ▼                              ▼
  Cloudflare KV (边缘)          public_data/db.json (容器)
```

### 核心设计

| 设计点               | 说明                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| **全栈 TypeScript**  | 前端与后端同语言，类型共享，无 Go 编译链                                                        |
| **纯 Web 标准**      | 后端只用 `fetch` / `Web Crypto` / `ReadableStream`，无 `fs` / `http` 等 Node.js 模块            |
| **驱动抽象**         | 统一的 `StorageDriver` 接口（list/get/mkdir/rename/remove/move/copy），接入新网盘只需实现一个类 |
| **多平台运行**       | 同一套代码可部署到 Node.js 容器、Cloudflare Workers、Vercel、AWS Lambda                         |
| **JSON / KV 持久化** | 配置、存储、用户、分享、任务全部存 JSON（容器）或 KV（边缘），无数据库依赖                      |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+（推荐 20+）
- 包管理器：`pnpm`（推荐）或 `npm`

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 本地开发

```bash
npm run dev
```

同时启动后端 API 与 Vite 前端开发服务器，访问 `http://localhost:3000`。

### 管理凭据（默认）

| 项     | 值      |
| ------ | ------- |
| 用户名 | `admin` |
| 密码   | `admin` |

> ⚠️ 首次部署后请务必在「用户管理」中修改默认密码。

### 本地文件系统（Mock / Local FS）

本地驱动将文件上传、读取、下载直接映射到 `public_data/` 目录；设置与存储配置持久化为 `public_data/db.json`。

---

## 📦 部署方法

### 方式一：Node.js 容器（Docker / 裸机）

```bash
# 生产构建（前端静态资源 + 后端 Serverless 入口）
npm run build

# 启动生产服务（内置 Hono 后端 + 静态资源）
npm run start
```

容器内将 `public_data/` 挂载为数据卷即可持久化。

### 方式二：Cloudflare Workers（推荐，免费边缘部署）

#### GitHub Action 自动部署（推荐）

推送代码到 `main` 分支后自动构建并部署到 Cloudflare Workers。

**1. Fork 项目到你的 GitHub 账号**

**2. 配置 GitHub Secrets**

进入仓库 → Settings → Secrets and variables → Actions → New repository secret，添加：

| Secret 名称             | 说明                                                                              |
| ----------------------- | --------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API 令牌（[创建地址](https://dash.cloudflare.com/profile/api-tokens)） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID（[查看地址](https://dash.cloudflare.com/）右下角）             |

> API Token 权限：选择 "Edit Cloudflare Workers" 模板，包含 Workers 和 KV 命名空间权限即可。

**3. 配置环境变量（可选）**

在 `wrangler.toml` 中修改 `[vars]` 下的默认凭据：

```toml
[vars]
ENVIRONMENT = "production"
ADMIN_USERNAME = "admin"    # 修改为你的管理员用户名
ADMIN_PASSWORD = "admin"    # 修改为你的管理员密码
```

或在 Cloudflare Dashboard → Workers → 你的 Worker → Settings → Variables 中设置加密环境变量。

**4. 推送触发部署**

```bash
git push origin main
```

查看部署状态：仓库 → Actions → "Deploy to Cloudflare Workers" 工作流。

#### 手动部署

```bash
# 登录 Cloudflare
npx wrangler login

# 一键部署（自动检测/创建 KV namespace + 构建 + 部署）
npm run deploy

# 本地预览
npm run dev:worker
```

> `wrangler.toml` 只声明 KV 绑定，由 wrangler 4.x 自动创建/关联 KV namespace，无需手动填写 id。

部署完成后静态资源由 Workers 的 `ASSETS` binding 托管，API 由 Hono 后端处理，配置数据持久化在 KV 中。

### 方式三：腾讯云 EdgeOne Makers / EdgeOne Pages

项目原生内置 `edgeone.json` 与 EdgeOne 边缘函数适配器：

1. **导入项目**：在腾讯云 [EdgeOne Makers 控制台](https://edgeone.ai/) 新建项目，关联 GitHub 仓库或直接上传项目代码。
2. **构建配置**：
   - 构建命令：`pnpm run build` 或 `npm run build`
   - 输出目录：`dist`
   - 安装命令：`pnpm install --no-frozen-lockfile`（EdgeOne 会自动读取 `edgeone.json`）。
3. **存储配置**：无需手动配置。后端使用 `@edgeone/pages-blob` SDK（HTTP API）自动持久化配置数据，避免 KV 命名空间绑定的 Redis RESP 协议崩溃问题。详见 [docs/edgeone.md](docs/edgeone.md)。

### 方式四：Vercel / 边缘 Serverless

```bash
# 构建（输出 dist/api/[...route].js Serverless 入口）
npm run build

# 由 Vercel 识别 vercel.json 自动部署
```

`api/[...route].ts` 导出 Vercel 规范句柄（`GET/POST/...`）与 EdgeOne `onRequest` 句柄，`edge-functions/[[default]].ts` 导出 EdgeOne Makers 边缘函数，`handler.ts` 导出 AWS Lambda 句柄，`wrangler.toml` 配置 Cloudflare Workers。

---

### 方式五：阿里云ESA边缘安全加速

1. **创建KV存储**：在阿里云ESA边缘安全加速(https://esa.console.aliyun.com/)主页/边缘计算和 AI/KV 存储中创建存储空间名称随意例如`openlistnext`。
2. **导入项目**：在阿里云ESA边缘安全加速(https://esa.console.aliyun.com/)主页/边缘计算和 AI/函数和 Pages中创建导入GitHub仓库。
3. **构建配置**：
   - 安装命令：`npm install` 默认即可。
   - 构建命令：`npm run build` 默认即可。
   - 高级配置/环境变量：`KV_NAMESPACE` 你KV存储的名称 `JWT_SECRET` 随机英文字符20位左右即可。

## 🔗 原版项目

OpenListNext 是以下项目的分支 / 衍生实现：

| 项目                  | 说明                                    | 链接                                                                         |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| **OpenList**          | 本项目的上游原版（Go 后端）             | [github.com/OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) |
| **OpenList Docs**     | 官方文档（配置 / 驱动 / FAQ）           | [doc.oplist.org](https://doc.oplist.org/)                                    |
| **AList**             | OpenList 的前身，开箱即用的文件列表程序 | [github.com/alist-org/alist](https://github.com/alist-org/alist)             |
| **OpenList 在线 API** | 部分网盘驱动的 token 获取服务           | [api.oplist.org](https://api.oplist.org/)                                    |

---

## 📄 许可证

[AGPL-3.0 License](LICENSE)

---

## 📝 更新日志

### v4.2.4

- **修复**：S3 对象存储二级文件夹打开失败，添加详细错误日志
- **修复**：WebDAV 下载返回 401 匿名访问错误，新增 `getFileStream` 流式传输支持
- **修复**：Guest 用户可被管理员删除/禁用导致匿名访问永久失效，新增 `ensureDefaultUsers` 自动恢复机制
- **新增**：双因素验证（TOTP 2FA）完整后端实现
  - `POST /auth/2fa/generate` — 生成 QR 码和密钥
  - `POST /auth/2fa/verify` — 验证并激活 2FA
  - `POST /admin/user/cancel_2fa` — 管理员取消用户 2FA
  - 登录流程支持 OTP 验证码输入
- **优化**：所有 fs API 错误添加 console.error 日志，便于排查问题

---

<div align="center">

**Powered by OpenListNext** · 由 [OpenList 社区](https://github.com/OpenListTeam/OpenList) 驱动

</div>
