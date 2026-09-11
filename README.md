<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList 是一个多功能的目录列表工具，支持数十种网盘文件挂载和文件预览/下载/分享等功能</em></p>
  <p>本仓库是官方 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> 项目的 TypeScript + Serverless 架构移植版</p>
  <p>基于 Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA 运行</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

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


| EdgeOne Makers · 国际站 | EdgeOne Makers · 中国站 | Cloudflare Workers · 全球站 |
| :---: | :---: | :---: |
| [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - 若Cloudflare提示`无法获取存储库内容`，则您需要先[Fork](https://github.com/OpenListTeam/OpenList-Worker/fork)本项目，再通过连接到Github仓库功能部署
> - 部署完成后配置环境变量： **EdgeOne**：[国际站](https://console.edgeone.ai/makers) · [中国站](https://console.cloud.tencent.com/edgeone/makers)；**Cloudflare**：[Worker 后台](https://dash.cloudflare.com/)，环境变量：
>   - `DB_FORMAT`: 数据存储格式：`map` (默认，整对象JSON) / `key` (分key存储) / `sql` (关系表，与Go后端一致)
>   - `DB_DRIVER`: 数据库驱动：`auto` (默认，自动检测) / `blob` (EdgeOne Blob) / `cfkv` (CF KV API) / `kv` (KV binding) / `d1` (Cloudflare D1) / `mysql`
>   - 其余可选变量参考**详细部署指南**：[Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## 功能简介

OpenList 是一个运行于边缘计算平台的多存储聚合文件列表与管理系统，可将分散在不同网盘、对象存储与协议服务中的文件统一到一个界面，进行浏览、预览、下载与管理。

OpenList-Worker 是官方 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) 项目的 TypeScript + Serverless 移植版，后端由 Go 重写为运行于 Workers 的 TypeScript 服务，前端保持一致的界面与交互体验。

### 存储聚合

内置 **78 个存储驱动**，开箱即用地挂载各类存储后端：

- **国内网盘**：阿里云盘（开放平台/分享）、夸克网盘（开放平台/UC TV 版）、百度网盘（相册）、115 网盘（开放平台/分享）、123 云盘（开放平台/分享）、天翼云盘（189/PC/TV）、中国移动云盘（139/和彩云）、沃家云盘、迅雷云盘、腾讯微云、蓝奏云、PikPak（分享）、豆包网盘、光亚盘、超星小组网盘、联想 NAS 分享、Teambition 网盘、WPS 网盘、阿里文档、HalalCloud、MediaTrack 等
- **国际网盘**：Google Drive（相册）、OneDrive（应用/分享链接）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox 等
- **对象存储**：S3 兼容（AWS/OSS/COS/MinIO 等）、又拍云 USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS 等
- **代码托管**：GitHub、GitHub Releases、CNB Releases
- **网盘程序**：OpenList（分享）、AList V3、Cloudreve V3/V4、Kodbox（可道云）、Seafile、Teldrive、Febbox 等
- **其他驱动**：网易云音乐、Misskey、Emby、Cloudflare 图床等

除上述真实存储外，还提供 `Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` 等虚拟/功能型驱动，可用于本地挂载、地址别名、URL 列表、加密存储与分片等场景。

### 核心能力

- **文件浏览**：统一的目录树浏览，支持图片、视频、音频、文档、代码、压缩包等格式在线预览。
- **上传下载**：跨存储的上传、批量下载、流式传输与直链跳转。
- **文件分享**：生成带有效期、密码与权限控制的分享链接，支持匿名访问与目录分享。
- **全文搜索**：在已索引的存储中快速检索文件。
- **离线任务**：后台任务队列，支持批量操作与异步处理。
- **外部接口**：将聚合存储以 WebDAV 或 S3 兼容协议对外暴露，便于挂载到第三方工具。
- **MCP 服务**：提供 Model Context Protocol 端点，可被 AI 助手等客户端集成调用。

### 权限管理

- **权限管理**：基于角色的访问控制（RBAC），支持用户分组、目录级读写权限与配额。
- **认证方式**：内置账号密码，支持TOTP验证、WebAuthn/FIDO登录、SSO单点登录与 LDAP 目录认证。
- **安全加固**：JWT 会话、CSRF 防护、点击劫持防护（X-Frame-Options）、内容安全策略（CSP）。
- **健康检查**：提供 `/health` 存活探针与 `/healthz` 就绪探针，可用于监控与告警。

### 平台部署

- **运行平台**：Cloudflare Workers、腾讯云 EdgeOne Makers、Vercel、Serverless  及 Node.js 容器环境。
- **数据存储**：Cloudflare D1（SQLite）为主，同时支持 MySQL、MariaDB、PostgreSQL、SQL Server。
- **持久缓存**：Cloudflare KV / EdgeOne Blob（可选），用于配置持久化与缓存。
- **一键部署**：支持 EdgeOne、Cloudflare Workers 等平台的一键部署按钮+初始化。

---

## 手动部署

### 前置要求

- Node.js 22.12+ 和项目指定的 pnpm 9.15.4
- Cloudflare 账号（用于部署到 Workers）

### 本地开发

```bash
# 1. 安装依赖
pnpm install --frozen-lockfile

# 2. 按需调整 wrangler.jsonc；Secret 使用 .dev.vars 或云端运行时配置

# 3. 启动开发服务器（自动拉取官方前端并运行 Worker）
pnpm run dev:unified

# 已有前端产物时，仅运行 Worker
pnpm run dev:worker
```

### 生产部署

```bash
# 获取前端，再由 Wrangler 打包、部署并配置资源
pnpm run deploy

# 已有前端产物时直接部署
pnpm run deploy:worker
```

默认 KV 绑定无需填写 ID，Wrangler 在本地提供本地 KV，在部署时自动创建或关联云端资源。项目通过 pnpm 的依赖补丁处理同名 namespace 冲突：创建返回 10014 时，Wrangler 使用自己的分页查询找到同名资源并继续绑定。已有绑定和显式配置的 id 仍按 Wrangler 原有规则处理。

请使用 pnpm 安装依赖，以应用锁文件中记录的 Wrangler 补丁。补丁同时覆盖正式部署和预览上传，无需手动填写 namespace ID。升级 Wrangler 时应重新检查补丁；上游修复此问题后可移除补丁。

JWT_SECRET、ENCRYPTION_SECRET 等凭据应在 Cloudflare Dashboard 的 Runtime Variables and Secrets 中配置为 Secret；本地使用未纳入 Git 的 .dev.vars。不要在 Wrangler 的 vars 中定义这些密钥，包括空字符串。Workers Builds 的构建变量不能代替 Worker 运行时 Secret。

DB_DRIVER 和 DB_FORMAT 使用代码默认值 auto 和 map，可通过 Dashboard 的运行时变量覆盖。keep_vars 保留云端普通变量；配置文件中显式声明的同名变量仍然优先。

Cloudflare Workers Builds 可以保留默认部署命令：

| 设置 | 命令 |
| --- | --- |
| 构建命令 | `pnpm run build:worker` |
| 生产分支部署命令 | `npx wrangler deploy` |
| 非生产分支部署命令 | `npx wrangler versions upload` |

构建阶段获取前端并执行 Wrangler dry run，不创建云端资源。现有的 `pnpm run build` 也可继续使用，它还构建其他平台产物。非生产分支上传版本，不切换正式服务的流量；全新 Worker 应先完成一次生产部署。命令和分支行为见 [Workers Builds 配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)。

`dev:worker` 和 `deploy:worker` 需要已有前端产物。可先运行 fetch:frontend，或通过 FRONTEND_DIST 提供已构建的前端以跳过前端依赖安装和构建。`deploy --skip-build` 同样复用现有产物。旧的 --kv 模式已移除，资源由 Wrangler 部署流程统一管理。

---

## 技术架构

### 后端

- **运行环境**：Cloudflare Workers（Edge Computing）
- **Web 框架**：Hono.js
- **数据库**：Cloudflare D1（SQLite）/ 支持 MySQL、MariaDB、PostgreSQL、SQL Server
- **缓存**：Cloudflare KV（可选）
- **语言**：TypeScript
- **构建工具**：Wrangler、esbuild

### 前端

- **框架**：React 19 + TypeScript
- **UI 库**：Ant Design / Material-UI
- **构建工具**：Vite

---


## 配置

### 环境变量

#### 数据库配置

**DB_FORMAT**（数据存储格式）
- `map`（默认）：整对象 JSON 格式，适用于 KV/Blob 等简单存储
- `key`：分 key 存储格式，每个实体一条记录（如 `openlist_tbl:users:1`），避免大 JSON
- `sql`：关系数据库表格式，与 Go 后端完全一致，适用于 D1/MySQL

**DB_DRIVER**（数据库驱动）
- `auto`（默认）：自动检测可用驱动（优先级：blob → cfkv → kv → d1）
- `blob`：腾讯云 EdgeOne Blob / 阿里云 ESA Blob
- `cfkv`：Cloudflare KV REST API（需配置 `CF_ACCOUNT_ID`、`CF_KV_NAMESPACE_ID`、`CF_API_TOKEN`）
- `kv`：Cloudflare KV binding
- `d1`：Cloudflare D1（SQLite）
- `mysql`：MySQL / PostgreSQL（仅 Node.js 容器）

**推荐配置组合：**
```bash
# Cloudflare Workers + D1（推荐）
DB_FORMAT=sql
DB_DRIVER=d1

# EdgeOne + Blob
DB_FORMAT=map
DB_DRIVER=blob

# Cloudflare KV（高频读写）
DB_FORMAT=key
DB_DRIVER=kv

# 远程访问 Cloudflare KV
DB_FORMAT=key
DB_DRIVER=cfkv
CF_ACCOUNT_ID=your_account_id
CF_KV_NAMESPACE_ID=your_namespace_id
CF_API_TOKEN=your_api_token
```

**向后兼容：**
- `DB_DRIVER=json` 自动转换为 `DB_FORMAT=map` + 自动检测驱动
- `DB_JSON_BACKEND` 已废弃，会自动转换为 `DB_DRIVER`

**表名对齐（仅 SQL 格式）：**
`sql` 格式采用列式表，命名策略与 Go 后端的 GORM 一致（snake_case + 复数表名 + 前缀）：

| Go 结构体     | 表名                |
| :------------ | :------------------ |
| `SettingItem` | `x_setting_items`   |
| `SharingDB`   | `x_sharing_dbs`     |
| `Storage`     | `x_storages`        |
| `User`        | `x_users`           |
| `Meta`        | `x_metas`           |
| （仅 TS）     | `x_plugins`         |

前缀默认为 `x_`，由 `TABLE_PREFIX` 环境变量控制（与 Go 后端一致）。要与 Go 后端共享同一物理数据库，保持默认值即可。

#### 安全配置

- `ENCRYPTION_SECRET`: 敏感字段加密密钥，生产环境建议显式配置；缺省时尝试使用 JWT_SECRET。
- `JWT_SECRET`: JWT 签名密钥，推荐至少 32 字符；缺省时尝试持久化到 KV。没有 KV/Blob 时，应显式配置以保持会话稳定。
- `ADMIN_PASSWORD`: 可选的初始管理员密码。

以上值使用运行时 Secret 配置，不写入 Wrangler 的 vars。

#### 其他配置

详细配置说明请参考 [官方文档](https://doc.oplist.org/guide/configuration)

---


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
