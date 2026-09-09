<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList is a directory listing tool that supports mounting multiple cloud drives, with support for dozens of cloud storage backends, file management, sharing and more.</em></p>

  <p>This repository is the official TypeScript + Serverless port of the <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> project.</p>
  <p>Runs on Cloudflare Workers / EdgeOne Cloud Function.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

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
> After deployment, visiting the site for the first time will automatically launch the **installation wizard** for initial setup:
>
> Optional environment variables / secrets:
> - `ENCRYPTION_SECRET`: static encryption key (recommended ≥16 characters; used to encrypt sensitive fields)
> - `JWT_SECRET`: JWT signing key (recommended; auto-generated and persisted to KV if not set)
> - `CRON_SECRET`: scheduled refresh task auth key (optional, only needed for EdgeOne scheduled tasks)

## Features

OpenList-Worker is a multi-storage aggregation file listing and management system running on edge computing platforms, unifying files scattered across different cloud drives, object storage and protocol services into one interface for browsing, previewing, downloading and managing.

### About the TS Port

OpenList-Worker is the TypeScript port of the official [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) project.

The backend has been rewritten from Go to a TypeScript service running on Workers, while the frontend keeps a consistent interface and interaction experience.

### Storage Aggregation

Built-in **80+ storage drivers**, ready to mount various storage backends out of the box:

| Category | Supported backends |
| :--- | :--- |
| Domestic cloud drives | Aliyundrive (Open/Share), Quark, Baidu Netdisk, 115, 123 Pan, Thunder, Tianyi Cloud (189), Tencent Weiyun, Lanzou, PikPak, UC Cloud, China Mobile Cloud, 139 Cloud, Doubao, Wopan, Tianyi Family Cloud, LeTV Cloud, etc. |
| International cloud drives | Google Drive, OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc. |
| Object storage | S3-compatible (AWS/OSS/COS/MinIO, etc.), WebDAV, FTP, SFTP, SMB, IPFS, Azure Blob, etc. |
| Code hosting | GitHub, GitHub Releases, CNB Releases |
| Cloud drive programs | OpenList / AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, etc. |
| Other drivers | Netease Music, Misskey, Emby, 115 Share, Aliyundrive Share, Quark Share, etc. |

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

### Deployment

- **Runtime platforms**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless and Node.js container environments.
- **Data storage**: Cloudflare D1 (SQLite) as primary, also supporting MySQL, MariaDB, PostgreSQL, SQL Server.
- **Persistent cache**: Cloudflare KV / EdgeOne Blob (optional) for config persistence and caching.
- **One-click deploy**: support one-click deployment buttons + initialization on EdgeOne, Cloudflare Workers and other platforms.

---

## Manual Deployment

### Prerequisites

- Node.js 18+
- A Cloudflare account (for deploying to Workers)

### Local Development

```bash
# 1. Install backend dependencies
npm install

# 2. Install frontend dependencies
npm run install:page

# 3. Configure wrangler.jsonc (fill in JWT_SECRET, KV/D1 bindings)

# 4. Start the backend dev server
npm run dev

# 5. Start the frontend dev server in another terminal
npm run dev:page
```

### Production Deployment

```bash
# One-click deploy (frontend build + backend deploy to Cloudflare Workers)
npm run deploy
```

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

## Documentation

- 📘 [Official docs](https://doc.oplist.org)
- 🌏 [China mirror](https://doc.oplist.org.cn)
- ⚖️ [Terms of use](https://doc.oplist.org/terms)
- 🔒 [Privacy policy](https://doc.oplist.org/privacy)

## Support

For general questions, please visit the [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) forum. **_Issues_ are only for bug reports and feature requests.**

## License

`OpenList` is open-source software licensed under [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

## Contact

- [@GitHub](https://github.com/OpenListTeam)
- [Telegram group](https://t.me/OpenListTeam)
- [Telegram channel](https://t.me/OpenListOfficial)

## Contributors

We sincerely thank the author of the original project [AlistGo/alist](https://github.com/AlistGo/alist), [Xhofe](https://github.com/Xhofe), and all other contributors.

Thanks to these wonderful people:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
