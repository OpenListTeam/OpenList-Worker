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
- 🔐 JWT 认证、密码保护、后台管理
- ☁️ 34 种网盘驱动：夸克网盘、阿里云盘、百度网盘、123 云盘、天翼云盘、OneDrive、Google Drive、Dropbox、115 网盘、PikPak、迅雷、腾讯微云、189 云盘、又拍云、S3、WebDAV、SMB、FTP、SFTP、GitHub、本地文件系统等
- ⚡ 边缘部署：Cloudflare Workers / Vercel / Serverless 开箱即用（SFTP / FTP 等 Node 专属驱动除外，见 [核心设计](#核心设计)）

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
│  Hono 4 · TypeScript · Web 标准优先（fetch / Streams）│
│  ├── /api/fs     文件操作（列表/上传/下载/管理）      │
│  ├── /api/auth   JWT 认证                            │
│  ├── /api/admin  后台管理（存储/用户/元数据/分享）    │
│  ├── /api/share  分享管理                            │
│  ├── /api/task   任务管理                            │
│  ├── /api/raw · /d · /p · /sd  下载与代理            │
│  ├── /api/mcp    MCP 协议支持                        │
│  └── /healthz    就绪探针（检查 KV 持久化状态）      │
└──────────────────────┬──────────────────────────────┘
                       │ 存储驱动接口 (StorageDriver)
┌──────────────────────▼──────────────────────────────┐
│     存储驱动层：Local · Quark · Aliyundrive · OneDrive ·    │
│           GoogleDrive · BaiduNetdisk · 123Pan · S3 ·       │
│        WebDAV · SFTP · FTP · SMB · PikPak · 189 · ...     │
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
| **Web 标准优先**     | 后端主体只用 `fetch` / `Web Crypto` / `ReadableStream`，不依赖 `fs` / `http` 等 Node.js 模块    |
| **Node 专属驱动**    | SFTP / FTP 依赖 `ssh2`、`node:net` 等 Node 模块，边缘构建时替换为空实现，仅完整 Node 环境可用   |
| **驱动抽象**         | 统一的 `StorageDriver` 接口（list/get/mkdir/rename/remove/move/copy），接入新网盘只需实现一个类 |
| **多平台运行**       | 同一套代码可部署到 Node.js 容器、Cloudflare Workers、Vercel、AWS Lambda                         |
| **JSON / KV 持久化** | 配置、存储、用户、分享、任务全部存 JSON（本地）或 KV（边缘），无数据库依赖                      |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+（推荐 22+）
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

### 管理凭据

| 项     | 值       |
| ------ | -------- |
| 用户名 | `admin`  |
| 密码   | 随机生成 |

首次启动时，如果没有配置 `ADMIN_PASSWORD` 环境变量，系统会生成一个随机密码并打印到启动日志。请查看日志获取初始密码，登录后立即修改。

可通过环境变量预设密码（推荐）：

```bash
# Cloudflare Workers
npx wrangler secret put ADMIN_PASSWORD

# EdgeOne：在控制台环境变量中设置 ADMIN_PASSWORD
```

### 本地文件系统（Mock / Local FS）

本地驱动将文件上传、读取、下载直接映射到 `public_data/` 目录；设置与存储配置持久化为 `public_data/db.json`。

---

## 📦 部署方法

### 方式一：Cloudflare Workers（推荐，免费边缘部署）

项目内置 [wrangler.toml](wrangler.toml) 与 [部署指南](docs/deploy-cloudflare-workers.md)。

```bash
# 一键部署（自动检测/创建 KV namespace 并写入 wrangler.toml，无需手动填 id）
npm run deploy

# 或分步执行：
# 1) 登录 Cloudflare
npx wrangler login
# 2) 确保 KV 绑定（自动检测/创建，无需手动编辑 wrangler.toml）
node scripts/deploy.js --kv
# 3) 部署
npm run deploy:worker
# 本地预览
npm run dev:worker   # wrangler dev
```

`npm run deploy` 会自动完成：检测 `OPENLISTNEXT_KV` namespace（不存在则自动创建）→ 构建前端 → `wrangler deploy`。`wrangler.toml` 只声明绑定、**不存储 KV id**，由 wrangler 4.x 的 Automatic provisioning 在部署时自动创建/关联同名 namespace——全程无需手动填写 KV id。

部署完成后静态资源由 Workers 的 `ASSETS` binding 托管，API 由 Hono 后端处理，配置数据持久化在 KV 中。

### 方式二：腾讯云 EdgeOne Makers / EdgeOne Pages

1. **导入项目**：在 [EdgeOne Makers 控制台](https://edgeone.ai/) 新建项目，关联 GitHub 仓库。控制台会自动读取项目根目录的 `edgeone.json`，无需手动配置构建命令。
2. **存储配置**：无需手动配置。后端使用 `@edgeone/pages-blob` SDK 自动持久化。详见 [docs/edgeone.md](docs/edgeone.md)。
3. **定时任务（可选）**：已内置每天凌晨 2:00 自动刷新网盘 Token，需在控制台设置 `CRON_SECRET` 环境变量。⚠️ 公开 fork 请勿提交真实密钥。详见 [docs/edgeone.md](docs/edgeone.md#定时任务与长时任务-schedules)。

### 方式三：Vercel / 边缘 Serverless

```bash
# 构建（输出 dist-server/api/[...route].js Serverless 入口）
npm run build

# 由 Vercel 识别 vercel.json 自动部署
```

`api/[...route].ts` 导出 Vercel Serverless 句柄（`GET/POST/...`）、EdgeOne `onRequest` 句柄与 Cloudflare Workers 原生 `fetch` 句柄，`handler.ts` 导出 AWS Lambda 句柄，`wrangler.toml` 配置 Cloudflare Workers。

### 方式四：阿里云 ESA 边缘安全加速

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

<div align="center">

**Powered by OpenListNext** · 由 [OpenList 社区](https://github.com/OpenListTeam/OpenList) 驱动

</div>
