<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList is a feature-rich directory listing tool that supports mounting dozens of cloud drives with file preview, download, sharing and more</em></p>
  <p>This repository is the official TypeScript + Serverless port of <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Runs on Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

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


| EdgeOne Makers · International | EdgeOne Makers · China | Cloudflare Workers · Global | Alibaba Cloud ESA · China |
| :---: | :---: | :---: | :---: |
| [![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Deploy to Alibaba Cloud ESA](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - If Cloudflare prompts `cannot fetch repository content`, [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) this project first, then deploy by connecting to the GitHub repository
> - For Alibaba Cloud ESA, import this repository from **Edge Computing and AI → Functions and Pages** in the console
> - Set `JWT_SECRET` during deployment (≥16 random chars) for JWT signing and encryption
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

- **File management**: unified directory tree browsing with online preview for images, videos, audio, documents, code and archives; cross-storage upload, batch download, streaming and direct-link redirect; share links with expiry, password and permission control.
- **Search & tasks**: full-text search across indexed storages; background task queue for batch and async processing.
- **External interfaces**: WebDAV, S3-compatible protocol, and an MCP endpoint for AI assistants.
- **Guest access**: fresh installs require sign-in by default (the `guest` account is disabled). To allow anonymous read-only browsing, enable the `guest` user; existing deployments keep their current behavior. Anonymous access is controlled solely by the guest account state (same as the Go backend) — there is no extra site setting, and it is not a Cloudflare environment variable.
- **Access & auth**: RBAC (user groups, directory-level read/write permissions, quotas), account passwords plus TOTP / WebAuthn / SSO / LDAP.
- **Security & ops**: JWT sessions, CSRF, clickjacking (X-Frame-Options) and CSP protection, `/health` and `/healthz` probes.
- **Concurrency deduplication**: identical directory listing / metadata requests hit the upstream drive only once; the rest reuse the result, reducing rate limits and CPU usage.
- **Runtime platforms**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Alibaba Cloud ESA, Vercel / AWS Lambda and Node.js containers.
- **Data storage**: Cloudflare D1 (SQLite) as primary, plus KV / Blob / Durable Objects and external MySQL / MariaDB.
- **One-click deploy**: EdgeOne, Cloudflare Workers and Alibaba Cloud ESA deploy buttons + install wizard.

---

## Manual Deployment

<details>
<summary>Expand prerequisites, local development and production deployment</summary>

### Prerequisites

- Node.js 18+ (pnpm recommended)
- A Cloudflare account (for deploying to Workers)

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure bindings and variables in wrangler.jsonc as needed (see .dev.vars.example for JWT_SECRET)

# 3. Start the dev server (auto-fetches the official frontend and runs the Worker)
pnpm run dev:unified

# Or run the Worker only (without fetching the frontend)
pnpm run dev:worker
```

### Production Deployment

```bash
# One-click deploy: build the frontend → deploy to Cloudflare Workers (KV bindings are provisioned automatically by wrangler)
pnpm run deploy

# Or deploy the Worker directly (skip the frontend build)
pnpm run deploy:worker
```

</details>

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


## Deployment Configuration

After deployment, set the following variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | (none) | JWT signing key (≥16 chars) |
| `DB_FORMAT` | `map` | `map` (JSON) / `key` (per key) / `sql` (relational) |
| `DB_DRIVER` | `auto` | `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | At-rest cipher for sensitive fields, e.g. `aes-256-gcm` |

For the full variable list, see [Configuration variables](https://doc.oplist.org/ecosystem/official_worker/guide_env).

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
