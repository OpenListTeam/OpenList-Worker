<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList 是一个多功能的目录列表工具，支持数十种网盘文件挂载和文件预览/下载/分享等功能</em></p>
  <p>本仓库是官方 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> 项目的 TypeScript + Serverless 架构移植版</p>
  <p>基于 Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA 运行</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>


📘 [使用文档](https://doc.oplist.org) · 🌏 [使用文档（中国大陆）](https://doc.oplist.org.cn)  · ⚖️ [使用条款](https://doc.oplist.org/terms)  · 🔒 [隐私政策](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](readmes/README_en.md) | 简体中文 | [繁體中文](readmes/README_zh-TW.md) | [日本語](readmes/README_ja.md) | [한국어](readmes/README_ko.md) | [Français](readmes/README_fr.md) | [Deutsch](readmes/README_de.md) 

[Português](readmes/README_pt.md) | [Русский](readmes/README_ru.md) | [العربية](readmes/README_ar.md) | [Italiano](readmes/README_it.md) | [हिन्दी](readmes/README_hi.md) | [Español](readmes/README_es.md)

[上游项目](https://github.com/OpenListTeam/OpenList) · [贡献指南](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [行为准则](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [许可证](./LICENSE)

[🌎 全球 Demo](https://new.oplist.org) 　|　 [🇨🇳 中国 Demo](https://new.oplist.org.cn)

</div>

---

## 一键部署

点击下方按钮，即可将本项目一键部署到对应平台：
<div align="center">


| EdgeOne Makers · 国际站 | EdgeOne Makers · 中国站 | Cloudflare Workers · 全球站 | 阿里云 ESA · 中国站 |
| :---: | :---: | :---: | :---: |
| [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![使用阿里云 ESA 部署](readmes/assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - 在 Cloudflare 平台部署，您需要先 [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) 本项目，再连接到仓库部署
> - 阿里云 ESA 请在控制台边缘计算和 AI → 函数和 Pages导入本仓库
> - 部署时请填写 `JWT_SECRET`（≥16 随机串，用于 JWT 签名与加密）
> - 数据存储默认自动选择平台自带的持久化后端，其余变量见 [配置变量](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - 部署完成后首次访问站点，通过**安装向导**完成初始化并设置账号密码


## 功能简介

OpenList 是一个运行于边缘计算平台的多存储聚合文件列表与管理系统，可将分散在不同网盘、对象存储与协议服务中的文件统一到一个界面，进行浏览、预览、下载与管理。

OpenList-Worker 是官方 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) 项目的 TypeScript + Serverless 移植版，后端由 Go 重写为运行于 Workers 的 TypeScript 服务，前端保持一致的界面与交互体验。

### 存储聚合

内置 **78 个存储驱动**，开箱即用地挂载各类存储后端：

- **国内网盘**：阿里云盘（开放平台/分享）、夸克网盘（开放平台/UC TV 版）、百度网盘（相册）、115 网盘（开放平台/分享）、123 云盘（开放平台/分享）、天翼云盘（189/PC/TV）、中国移动云盘（139/和彩云）、沃家云盘、迅雷云盘、腾讯微云、蓝奏云、城通网盘、PikPak（分享）、豆包网盘、光鸭云盘、超星小组网盘、联想 NAS 分享、Teambition 网盘、WPS 网盘、阿里文档、HalalCloud、MediaTrack 等
- **国际网盘**：Google Drive（相册）、OneDrive（应用/分享链接）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox 等
- **对象存储**：S3 兼容（AWS/OSS/COS/MinIO 等）、Cloudflare R2（Workers Binding 直连或 S3 API）、又拍云 USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS 等
- **代码托管**：GitHub、GitHub Releases、CNB Releases
- **网盘程序**：OpenList（分享）、AList V3、Cloudreve V3/V4、Kodbox（可道云）、Seafile、Teldrive、Febbox 等
- **其他驱动**：网易云音乐、Misskey、Emby、Cloudflare 图床等

除上述真实存储外，还提供 `Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` 等虚拟/功能型驱动，可用于本地挂载、地址别名、URL 列表、加密存储与分片等场景。

### 核心能力

- **文件管理**：统一目录树浏览，图片 / 视频 / 音频 / 文档 / 代码 / 压缩包在线预览；跨存储上传、批量下载、流式传输与直链跳转；带有效期、密码与权限控制的分享链接。
- **检索与任务**：已索引存储的全文搜索，后台任务队列支持批量与异步处理。
- **外部接口**：WebDAV、S3 兼容协议，以及可被 AI 助手集成的 MCP 端点。
- **访客访问**：新装默认要求登录（`guest` 账号默认禁用）。需要匿名只读时，在「用户管理」里启用 `guest` 即可；存量部署升级后保持原状。是否允许匿名只取决于 guest 账号本身是否启用（与 Go 版一致），没有额外的站点开关，也不是 Cloudflare 控制台的环境变量。
- **权限与认证**：RBAC（用户分组、目录级读写权限、配额），账号密码 + TOTP / WebAuthn / SSO / LDAP。
- **安全与运维**：JWT 会话、CSRF、点击劫持（X-Frame-Options）与 CSP 防护，`/health`、`/healthz` 健康探针。
- **并发去重**：相同目录列表 / 元信息请求只向上游网盘发起一次，其余请求复用结果，减少限流与 CPU 消耗。
- **运行平台**：Cloudflare Workers、腾讯云 EdgeOne Makers、阿里云 ESA、Vercel / AWS Lambda 与 Node.js 容器。
- **数据存储**：Cloudflare D1（SQLite）为主，也支持 KV / Blob / Durable Objects 与外部 MySQL / MariaDB。
- **一键部署**：支持 EdgeOne、Cloudflare Workers、阿里云 ESA 部署按钮 + 安装向导。

---

## 手动部署

<details>
<summary>展开查看前置要求、本地开发与生产部署</summary>

### 前置要求

- Node.js 18+（推荐使用 pnpm）
- Cloudflare 账号（用于部署到 Workers）

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 按需配置 wrangler.jsonc 中的绑定与变量（JWT_SECRET 见 .dev.vars.example）

# 3. 启动开发服务器（自动拉取官方前端并运行 Worker）
pnpm run dev:unified

# 或仅运行 Worker（不拉取前端）
pnpm run dev:worker
```

### 生产部署

```bash
# 一键部署：构建前端产物 → 部署到 Cloudflare Workers（KV 绑定由 wrangler 自动预配）
pnpm run deploy

# 或直接部署 Worker（跳过前端构建）
pnpm run deploy:worker
```

</details>

---

## 技术架构

### 后端

- **运行环境**：Cloudflare Workers / EdgeOne 云函数 / 阿里云 ESA（Edge Computing）
- **Web 框架**：Hono.js
- **数据库**：Cloudflare D1（SQLite）/ KV / Blob / Durable Objects，或外部 MySQL / MariaDB
- **语言**：TypeScript
- **构建工具**：Wrangler、esbuild

### 前端

- **框架**：SolidJS + TypeScript（官方 [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend)）
- **UI 库**：Hope UI
- **构建工具**：Vite

---


## 部署配置

部署完成后请设置如下变量：

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `JWT_SECRET` | (无) | JWT 令牌签名密钥（≥16 字符） |
| `DB_FORMAT` | `map` | `map`（Json）/ `key`（分 key）/ `sql`（关系表） |
| `DB_DRIVER` | `auto` | 可选 `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | 敏感字段落盘算法，如 `aes-256-gcm` |



完整环境变量，请参阅[配置变量](https://doc.oplist.org/ecosystem/official_worker/guide_env)


## 帮助支持

在使用过程中遇到问题，可通过以下渠道获取帮助：

- 🐛 **提交 Bug 或功能请求**：请前往 [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **一般性问题与交流**：请前往 [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) 讨论区

## 开源许可

`OpenList` 是基于 [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) 许可证的开源软件。


## 联系我们

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Telegram 交流群](https://t.me/OpenListTeam) · ✈️ [Telegram 频道](https://t.me/OpenListOfficial)

## 贡献列表

感谢以下项目及其贡献者：

- [Alist](https://github.com/AlistGo/alist) 项目作者及全体贡献者
- [OpenList](https://github.com/OpenListTeam/OpenList)（Go 版）项目作者及全体贡献者
- 本项目全体贡献者：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
