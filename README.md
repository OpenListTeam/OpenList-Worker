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
| [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

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

- Node.js 18+（推荐使用 pnpm）
- Cloudflare 账号（用于部署到 Workers）

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 编辑 wrangler.jsonc / .env，配置 JWT_SECRET 与存储（KV/D1 在控制台绑定）

# 3. 启动开发服务器（自动拉取官方前端并运行 Worker）
pnpm run dev:unified

# 或仅运行 Worker（不拉取前端）
pnpm run dev:worker
```

### 生产部署

```bash
# 一键部署：确保 KV namespace 存在 → 拉取官方前端 → 部署到 Cloudflare Workers
pnpm run deploy

# 或直接部署 Worker（跳过 KV 检查与前端构建）
pnpm run deploy:worker
```

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
- `key`：分 key 存储格式，每个实体一条记录（如 `users_1`），避免大 JSON
- `sql`：关系数据库表格式，与 Go 后端完全一致，适用于 D1/MySQL

**DB_DRIVER**（数据库驱动）
- `auto`（默认）：自动检测可用驱动（优先级：mysql → d1 → kv → cfkv → blob → do）
- `blob`：EdgeOne Blob Storage（SDK）/ ESA Blob（binding）
- `cfkv`：Cloudflare KV REST API（需配置 `CF_ACCOUNT`、`CF_KV_UUID`、`CF_API_KEY`）
- `kv`：KV 存储（binding 名固定为 `KV`；EdgeOne Node 云函数自动走 HTTP 代理模式）
- `d1`：Cloudflare D1（SQLite）
- `do`：Cloudflare Durable Objects（SQLite）
- `mysql`：MySQL（仅 Node.js 容器）

**DB_CIPHER**（敏感字段落盘算法，**默认不加密**）
- `none`（默认）：不加密，敏感字段与普通 JSON 一样明文落盘
- `aes-256-gcm`：HKDF-SHA256 派生一把 AES-256-GCM 密钥（`enc:v2:`）
  —— 既有加密部署写入的形态，开销最低，开启加密时**推荐**
- `aes-256-gcm-pbkdf2`：AES-256-GCM，密钥由 PBKDF2-SHA256（10 万次迭代）逐字段派生
  （历史 `enc:v1:` envelope，抗弱口令但每次读写都很慢，仅建议用于兼容）
- `aes-256-cbc-hmac`：AES-256-CBC + HMAC-SHA256（`enc:v3:`，Encrypt-then-MAC）
- `chacha20-poly1305`：ChaCha20-Poly1305（`enc:v4:`，RFC 8439，纯 JS 实现；
  WebCrypto 全平台都没有 ChaCha20，故自带实现并通过 RFC 官方向量验证）
- `des-cbc-hmac` / `3des-cbc-hmac`：DES / 3DES-CBC + HMAC-SHA256（`enc:v5:` / `enc:v6:`）
  —— **仅用于兼容/互操作**：单 DES 有效密钥只有 56-bit（可被暴力破解），3DES 已被
  NIST SP 800-131A 弃用（64-bit 分组 + Sweet32）。选用时后端会打印一次性告警，
  请勿用它们保护真实数据。
- 别名（大小写无关）：`gcm`/`hkdf`/`v2`、`pbkdf2`/`v1`、`cbc`/`v3`、`chacha20`/`v4`、
  `des`/`v5`、`3des`/`tripledes`/`v6`、`off`/`plain`；无法识别时告警并回退 `none`

**几种算法的 CPU 特性（实测，120 字节字段，Node 22）**

| 算法 | 单字段耗时 | 说明 |
| :-- | --: | :-- |
| `aes-256-gcm` | ~30 µs | WebCrypto 原生（调用开销为主） |
| `chacha20-poly1305` | ~18 µs | 纯 JS，小字段下反而更快 |
| `aes-256-cbc-hmac` | ~60 µs | 两次 WebCrypto 调用（加密 + HMAC） |
| `des-cbc-hmac` / `3des-cbc-hmac` | ~0.26 ms | 纯 JS（crypto-js） |
| `aes-256-gcm-pbkdf2` | ~27 ms | 每字段 10 万次 PBKDF2（历史包袱） |

为此后端内置两项优化（对功能无影响）：① 密钥派生结果在**进程内缓存**，同一
isolate 只派生一次；② **未变化字段跳过重新加密** —— 明文、算法、密钥都没变时
直接复用上次的密文，因此「改一个设置」不会触发全库重新加密（对 PBKDF2/DES
这类昂贵算法尤为明显）。

**推荐配置组合：**
```bash
# Cloudflare Workers + D1（推荐）
DB_FORMAT=sql        # 也可用 map / key
DB_DRIVER=d1         # 需在 wrangler.jsonc 的 d1_databases 里绑定名为 DB

# EdgeOne + Blob（推荐，零配置）
DB_FORMAT=map        # 或 key
DB_DRIVER=blob

# Cloudflare Workers + KV（必须先绑定 KV，见下方【方案 A】）
DB_FORMAT=map        # 或 key
DB_DRIVER=kv         # 需打开 wrangler.jsonc 的 kv_namespaces，绑定名必须恰好是 KV；
                     # 未绑定却显式写 kv 会直接报错（不做回退）

# EdgeOne Node 云函数 + KV（还需额外部署 Edge Function 代理）
DB_FORMAT=map        # 或 key
DB_DRIVER=kv
EO_KV_URLS=https://<你的部署域名>   # 代理地址（也可由请求 origin 自动注入）
JWT_SECRET=<32 字符以上>           # 代理鉴权，需与 Edge Function 侧一致

# 远程访问 Cloudflare KV（HTTP API，无需 binding）
DB_FORMAT=key
DB_DRIVER=cfkv
CF_ACCOUNT=your_account_id
CF_KV_UUID=your_namespace_id
CF_API_KEY=your_api_token
```

> 不确定用哪个就保持 `DB_DRIVER=auto`（默认，自动探测）。
> 显式指定驱动时**不做回退**：该驱动不可用会直接拒绝请求并给出可操作原因（含
> 「自动探测会选哪个驱动」，照抄即可），`/api/public/env_check` 与
> `/api/public/init_status` 也会显示同样的原因和一行修复建议，
> 避免「以为在用 KV、实际写进了别的后端」。
> 非法「驱动 × 格式」组合（如 `DB_FORMAT=sql` + `DB_DRIVER=kv`）同样只报错，
> 不会自动改驱动或格式。

**关于 DB_CIPHER 的补充说明：**
- 加密只作用于 `storages[].addition`（网盘凭据）、敏感 `settings`、`users[].password`、
  `users[].otp_secret`；内存中始终为明文，其余逻辑（驱动、路径解析、管理接口）不受影响。
- **`none` 只表示「不加密数据库字段」，不影响其它任何行为**：JWT 令牌签名仍需一把
  跨实例/跨冷启动一致的共享密钥，若未通过环境变量 `JWT_SECRET` 提供，安装向导仍会
  自动生成并持久化 `openlist_encryption_secret`（与加密是否启用无关）。
- 密文带版本前缀（`enc:v1:` ~ `enc:v6:`），**读取时按前缀自动识别算法**，
  与当前配置无关。因此：
  - 从加密切回 `none`（或升级后不再配置 `DB_CIPHER`）：既有密文仍能正常解密，
    并在**下一次配置保存**时自动转为明文（逐字段迁移，无需任何手动步骤）；
  - 更换算法：既有密文按旧算法解开，下次写入按新算法落盘；
  - 既有的明文数据（无前缀）原样返回，升级不会丢数据。
- 加密算法选择是**正交的一维**，不改变 `DB_DRIVER` / `DB_FORMAT` 的语义。
- 取值无法识别时回退 `none` 并在日志告警（不会静默启用某个算法）；
  `/api/public/env_check` 的 `config.db_cipher` 会回显当前生效值。
- AES 三种算法基于 WebCrypto（各平台原生）；`chacha20-poly1305` 与 `des/3des` 因
  WebCrypto 不提供对应算法而使用纯 JS 实现 —— 全部在 Cloudflare Workers /
  EdgeOne Node 云函数 / ESA / Node.js 上行为一致（不依赖 `node:crypto`）。

**向后兼容：**
- `DB_DRIVER=json` 自动转换为 `DB_FORMAT=map` + 自动检测驱动
- 未配置 `DB_CIPHER` 时**不再对敏感字段加密**（旧版本默认加密）。升级已有部署时：
  存储中的 `enc:v1:`（PBKDF2）与 `enc:v2:`（HKDF）密文仍会按前缀自动解密、保持可读，
  并在**下一次配置保存**时自动转为明文；如需继续加密，显式设置 `DB_CIPHER` 即可
  （`DB_CIPHER=aes-256-gcm` 与既有加密部署的写入形态一致）。

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

前缀固定为 `x_`（与 Go 后端默认值一致）。要与 Go 后端共享同一物理数据库，无需额外配置。

#### 安全配置

- `JWT_SECRET`：JWT 令牌签名密钥（必填），**同时用作可选的字段加密密钥**与定时任务鉴权
- `DB_CIPHER`：敏感字段落盘算法（可选，默认 `none` 不加密）：`none` / `aes-256-gcm`
  （推荐）/ `aes-256-gcm-pbkdf2` / `aes-256-cbc-hmac` / `chacha20-poly1305` /
  `des-cbc-hmac` / `3des-cbc-hmac`（后两者仅兼容用途，不安全）
- `ADMIN_PASS`：初始管理员密码（可选，设置后跳过安装向导自动初始化 admin）

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
