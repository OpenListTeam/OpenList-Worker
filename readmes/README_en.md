<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList is a feature-rich directory listing tool that supports mounting dozens of cloud drives with file preview, download, sharing and more</em></p>
  <p>This repository is the official TypeScript + Serverless port of <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Runs on Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [Docs](https://doc.oplist.org) · 🌏 [Docs (China mainland)](https://doc.oplist.org.cn)  · ⚖️ [Terms of use](https://doc.oplist.org/terms)  · 🔒 [Privacy policy](https://doc.oplist.org/privacy)

</div>

<div align="center">

English | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Upstream project](https://github.com/OpenListTeam/OpenList) · [Contributing](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Code of conduct](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [License](../LICENSE)

[🌎 Global Demo](https://new.oplist.org) 　|　 [🇨🇳 China Demo](https://new.oplist.org.cn)

</div>

---

## One-click Deploy

Click the button below to deploy this project to the corresponding platform with one click:
<div align="center">


| EdgeOne Makers · International | EdgeOne Makers · China | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - If Cloudflare prompts `cannot fetch repository content`, [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) this project first, then deploy by connecting to the GitHub repository
> - After deployment, configure environment variables: **EdgeOne**: [International console](https://console.edgeone.ai/makers) · [China console](https://console.cloud.tencent.com/edgeone/makers); **Cloudflare**: [Worker dashboard](https://dash.cloudflare.com/). Environment variables:
>   - `DB_FORMAT`: data storage format: `map` (default, whole object JSON) / `key` (per-key storage) / `sql` (relational tables, compatible with Go backend)
>   - `DB_DRIVER`: database driver: `auto` (default, auto-detect) / `blob` (EdgeOne Blob) / `cfkv` (CF KV API) / `kv` (KV binding) / `d1` (Cloudflare D1) / `mysql`
>   - For other optional variables, see the **detailed deployment guide**: [Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## Features

OpenList is a multi-storage aggregation file listing and management system running on edge computing platforms. It unifies files scattered across different cloud drives, object storage and protocol services into a single interface for browsing, previewing, downloading and managing.

OpenList-Worker is the official TypeScript + Serverless port of [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). The backend has been rewritten from Go to a TypeScript service running on Workers, while the frontend keeps a consistent interface and interaction experience.

### Storage Aggregation

Built-in **78 storage drivers**, ready to mount various storage backends out of the box:

- **Domestic cloud drives**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Album), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, etc.
- **International cloud drives**: Google Drive (Album), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc.
- **Object storage**: S3-compatible (AWS/OSS/COS/MinIO, etc.), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, etc.
- **Code hosting**: GitHub, GitHub Releases, CNB Releases
- **Cloud drive programs**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, etc.
- **Other drivers**: Netease Music, Misskey, Emby, Cloudflare Image Hosting, etc.

In addition to the real storages above, virtual/functional drivers such as `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` and `Chunk` are also provided for local mounts, address aliases, URL lists, encrypted storage and chunking scenarios.

### Core Capabilities

- **File browsing**: unified directory tree browsing, with online preview of images, videos, audio, documents, code, archives and more.
- **Upload & download**: cross-storage upload, batch download, streaming and direct-link redirect.
- **File sharing**: generate share links with expiry, password and permission control, supporting anonymous access and directory sharing.
- **Full-text search**: quickly search files in indexed storages.
- **Offline tasks**: background task queue supporting batch operations and async processing.
- **External interfaces**: expose aggregated storage via WebDAV or S3-compatible protocol for mounting into third-party tools.
- **MCP service**: provide a Model Context Protocol endpoint that can be integrated and called by AI assistants and other clients.

### Access Control

- **Permissions**: role-based access control (RBAC), supporting user groups, directory-level read/write permissions and quotas.
- **Authentication**: built-in account passwords with TOTP verification, WebAuthn/FIDO login, SSO single sign-on and LDAP directory authentication.
- **Security hardening**: JWT sessions, CSRF protection, clickjacking protection (X-Frame-Options), Content Security Policy (CSP).
- **Health checks**: provide `/health` liveness probe and `/healthz` readiness probe for monitoring and alerting.

### Platform Deployment

- **Runtime platforms**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless and Node.js container environments.
- **Data storage**: Cloudflare D1 (SQLite) as primary, also supporting MySQL, MariaDB, PostgreSQL, SQL Server.
- **Persistent cache**: Cloudflare KV / EdgeOne Blob (optional) for config persistence and caching.
- **One-click deploy**: support one-click deploy buttons + initialization on EdgeOne, Cloudflare Workers and other platforms.

---

## Manual Deployment

### Prerequisites

- Node.js 22.12+ and the project's pinned pnpm 9.15.4
- A Cloudflare account (for deploying to Workers)

### Local Development

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Review optional wrangler.jsonc settings; use .dev.vars or runtime secrets

# 3. Start the dev server (auto-fetches the official frontend and runs the Worker)
pnpm run dev:unified

# Run only the Worker when frontend assets already exist
pnpm run dev:worker
```

### Production Deployment

```bash
# Fetch the frontend, then let Wrangler bundle, deploy, and provision resources
pnpm run deploy

# Deploy directly when frontend assets already exist
pnpm run deploy:worker
```

The default KV binding needs no ID. Wrangler provides local KV during development. Deployment scripts reuse the Worker's current KV binding first, then look for Wrangler's default namespace title, and create a namespace only if neither exists. They restore the source config after deployment. Explicit IDs take precedence, and existing KV data is never deleted.

Configure JWT_SECRET, ENCRYPTION_SECRET, and other credentials as Secret values in the Cloudflare Dashboard under Runtime Variables and Secrets. Use an untracked .dev.vars file locally. Never declare these secrets in Wrangler vars, even as empty strings. Workers Builds variables do not replace Worker runtime secrets.

DB_DRIVER and DB_FORMAT use the code defaults auto and map and can be overridden with Dashboard runtime variables. keep_vars preserves remote variables; values explicitly declared in the configuration still take precedence.

Configure Cloudflare Workers Builds as follows:

| Setting | Command |
| --- | --- |
| Build command | `pnpm run build:worker` |
| Production branch deploy command | `pnpm run deploy:worker` |
| Non-production branch deploy command | `pnpm run upload:worker` |

The build fetches the frontend and runs Wrangler in dry-run mode without provisioning remote resources. The generic build command also builds artifacts for other platforms. Non-production branches upload versions without switching production traffic. A new Worker must complete a production deployment first.

Both deployment commands resolve KV through the project script. The default `npx wrangler versions upload` bypasses this handling. When Wrangler 4.118.0 cannot inherit a KV binding, it may attempt to create an existing namespace title and fail with 10014. Do not delete existing KV data to fix this error. See the [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and the related upstream discussion in [workers-sdk #8721](https://github.com/cloudflare/workers-sdk/issues/8721).

`dev:worker`, `deploy:worker`, and `upload:worker` require existing frontend assets. Run fetch:frontend first, or provide a previously built frontend through FRONTEND_DIST to skip frontend dependency installation and compilation. `deploy --skip-build` also reuses existing assets. The old --kv mode has been removed. Log in with Wrangler before deploying locally; Workers Builds uses its configured deployment credentials.

---

## Tech Stack

### Backend

- **Runtime**: Cloudflare Workers (Edge Computing)
- **Web framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite) / supports MySQL, MariaDB, PostgreSQL, SQL Server
- **Cache**: Cloudflare KV (optional)
- **Language**: TypeScript
- **Build tools**: Wrangler, esbuild

### Frontend

- **Framework**: React 19 + TypeScript
- **UI libraries**: Ant Design / Material-UI
- **Build tool**: Vite

---


## Configuration

### Environment Variables

#### Database Configuration

**DB_FORMAT** (Data Storage Format)
- `map` (default): Whole object JSON format, suitable for KV/Blob simple storage
- `key`: Per-key storage format, each entity as a separate record (e.g., `openlist_tbl:users:1`), avoids large JSON
- `sql`: Relational database table format, fully compatible with Go backend, suitable for D1/MySQL

**DB_DRIVER** (Database Driver)
- `auto` (default): Auto-detect available drivers (priority: blob → cfkv → kv → d1)
- `blob`: Tencent EdgeOne Blob / Alibaba ESA Blob
- `cfkv`: Cloudflare KV REST API (requires `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN`)
- `kv`: Cloudflare KV binding
- `d1`: Cloudflare D1 (SQLite)
- `mysql`: MySQL / PostgreSQL (Node.js container only)

**Recommended Configurations:**
```bash
# Cloudflare Workers + D1 (recommended)
DB_FORMAT=sql
DB_DRIVER=d1

# EdgeOne + Blob
DB_FORMAT=map
DB_DRIVER=blob

# Cloudflare KV (high-frequency read/write)
DB_FORMAT=key
DB_DRIVER=kv

# Remote Cloudflare KV access
DB_FORMAT=key
DB_DRIVER=cfkv
CF_ACCOUNT_ID=your_account_id
CF_KV_NAMESPACE_ID=your_namespace_id
CF_API_TOKEN=your_api_token
```

**Backward Compatibility:**
- `DB_DRIVER=json` auto-converts to `DB_FORMAT=map` + auto-detect driver
- `DB_JSON_BACKEND` is deprecated and auto-converts to `DB_DRIVER`

**Table Naming (SQL format only):**
The `sql` format uses columnar tables with the same naming strategy as the Go backend's GORM (snake_case + pluralized names + prefix):

| Go struct     | Table name         |
| :------------ | :----------------- |
| `SettingItem` | `x_setting_items`  |
| `SharingDB`   | `x_sharing_dbs`    |
| `Storage`     | `x_storages`       |
| `User`        | `x_users`          |
| `Meta`        | `x_metas`          |
| (TS only)     | `x_plugins`        |

The prefix defaults to `x_` and is controlled by the `TABLE_PREFIX` env var (matching the Go backend). Keep the default to share the same physical database with the Go backend.

#### Security Configuration

- `ENCRYPTION_SECRET`: Sensitive-field encryption key; explicitly configure it in production. Falls back to JWT_SECRET when absent.
- `JWT_SECRET`: JWT signing key; at least 32 characters is recommended. If absent, the Worker attempts to persist a generated key in KV. Without KV/Blob, configure it explicitly to keep sessions stable.
- `ADMIN_PASSWORD`: Optional initial admin password.

Configure these values as runtime secrets, not as Wrangler vars.

#### Other Configuration

For detailed configuration, please refer to the [official documentation](https://doc.oplist.org/guide/configuration)

---


## Support

If you run into any issues, help is available through the following channels:

- 🐛 **Bug reports or feature requests**: please visit [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **General questions and discussion**: please visit the [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) forum

## License

`OpenList` is open-source software licensed under [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).


## Contact

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Telegram group](https://t.me/OpenListTeam) · ✈️ [Telegram channel](https://t.me/OpenListOfficial)

## Contributors

Thanks to the following projects and their contributors:

- The author and all contributors of [Alist](https://github.com/AlistGo/alist)
- The author and all contributors of [OpenList](https://github.com/OpenListTeam/OpenList) (Go version)
- All contributors of this project:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
