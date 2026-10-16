<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList is a feature-rich directory listing tool that supports mounting dozens of cloud drives with file preview, download, sharing and more</em></p>
  <p>This repository is the official TypeScript + Serverless port of <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Runs on Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
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
| [![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - If Cloudflare prompts `cannot fetch repository content`, [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) this project first, then deploy by connecting to the GitHub repository
> - Set `JWT_SECRET` during deployment (a random string of ≥16 chars, e.g. `openssl rand -hex 32`): it signs JWTs and encrypts data; if unset, it is generated and persisted during initialization
> - Storage automatically uses the platform's built-in persistent backend (`DB_DRIVER=auto`) — no configuration needed; for other variables see [Environment Variables](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - After deployment, the first visit opens the **install wizard**: set the admin account and password in the browser to finish initialization; set `ADMIN_PASS` to skip the wizard


## Features

OpenList is a multi-storage aggregation file listing and management system running on edge computing platforms. It unifies files scattered across different cloud drives, object storage and protocol services into a single interface for browsing, previewing, downloading and managing.

OpenList-Worker is the official TypeScript + Serverless port of [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). The backend has been rewritten from Go to a TypeScript service running on Workers, while the frontend keeps a consistent interface and interaction experience.

### Storage Aggregation

Built-in **78 storage drivers**, ready to mount various storage backends out of the box:

- **Domestic cloud drives**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Album), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, etc.
- **International cloud drives**: Google Drive (Album), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc.
- **Object storage**: S3-compatible (AWS/OSS/COS/MinIO, etc.), Cloudflare R2 (Workers binding or S3 API), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, etc.
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

- Node.js 18+ (pnpm recommended)
- A Cloudflare account (for deploying to Workers)

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure wrangler.toml (fill in JWT_SECRET, KV/D1 bindings)

# 3. Start the dev server (auto-fetches the official frontend and runs the Worker)
pnpm run dev:unified

# Or run the Worker only (without fetching the frontend)
pnpm run dev:worker
```

### Production Deployment

```bash
# One-click deploy: ensure the KV namespace exists → fetch the official frontend → deploy to Cloudflare Workers
pnpm run deploy

# Or deploy the Worker directly (skip KV check and frontend build)
pnpm run deploy:worker
```

---

## Tech Stack

### Backend

- **Runtime**: Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA (Edge Computing)
- **Web framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite) / KV / Blob / Durable Objects, or external MySQL / MariaDB
- **Language**: TypeScript
- **Build tools**: Wrangler, esbuild

### Frontend

- **Framework**: SolidJS + TypeScript (official [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend))
- **UI library**: Hope UI
- **Build tool**: Vite

---


## Configuration

The **install wizard** appears automatically on the first visit — set the admin account and password in the browser to finish initialization. To skip the wizard, set `ADMIN_PASS` and the admin is initialized automatically.

Most deployments need **no extra configuration**: storage defaults to `DB_DRIVER=auto`, which picks an available persistent backend (Cloudflare Workers → KV / D1 / DO, EdgeOne / ESA → Blob). The only variable worth setting explicitly is:

| Variable | Description |
| :--- | :--- |
| `JWT_SECRET` | JWT signing key (≥16 chars, e.g. `openssl rand -hex 32`), also used for cron task auth. Auto-generated and persisted during initialization when unset |

> Configure `JWT_SECRET` as a **Secret** (not a plain variable): plain variables can be overwritten by the repository config on redeploy, secrets are not.

All other variables have sensible defaults:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ADMIN_PASS` | — | Skip the install wizard and auto-initialize the admin |
| `DB_FORMAT` | `map` | Storage format: `map` (whole JSON) / `key` (per-key) / `sql` (relational, Go-compatible) |
| `DB_DRIVER` | `auto` | Storage driver: `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql`; an explicit driver is never replaced automatically |
| `DB_CIPHER` | `none` | At-rest cipher for sensitive fields (no encryption by default), e.g. `aes-256-gcm` |
| `CACHE_ENABLED` / `CACHE_DRIVER` | `true` / `db` | File-tree & download-link caches, reusing the data backend by default |
| `ALLOW_URLS` | — | Comma-separated CORS allowlist (same-origin only when unset) |
| `MAX_UPLOAD` / `MAX_UPPART` | 26214400 / 16777216 | Max size (bytes) for a whole upload / a multipart chunk |
| `ASSET_URLS` | — | Frontend asset CDN base URL, supports the `$version` placeholder |

For the full variable list (cache `CACHE_*`, field encryption `DB_CIPHER`, concurrency dedup `SINGLEFLIGHT`, `cfkv` / MySQL settings, …) and per-platform deployment steps, see the documentation site:

- [Environment Variables](https://doc.oplist.org/ecosystem/official_worker/guide_env)
- [Deployment](https://doc.oplist.org/ecosystem/official_worker/guide)
- [FAQ](https://doc.oplist.org/ecosystem/official_worker/about)

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
