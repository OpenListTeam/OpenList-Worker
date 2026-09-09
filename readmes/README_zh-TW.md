<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList 是一個多功能的目錄列表工具，支援數十種網盤檔案掛載和檔案預覽/下載/分享等功能</em></p>
  <p>本倉庫是官方 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> 專案的 TypeScript + Serverless 架構移植版</p>
  <p>基於 Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA 運行</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [使用文件](https://doc.oplist.org) · 🌏 [使用文件（中國大陸）](https://doc.oplist.org.cn)  · ⚖️ [使用條款](https://doc.oplist.org/terms)  · 🔒 [隱私政策](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | 繁體中文 | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[上游專案](https://github.com/OpenListTeam/OpenList) · [貢獻指南](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [行為準則](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [許可證](./LICENSE)

[🌎 全球 Demo](https://new.oplist.org) 　|　 [🇨🇳 中國 Demo](https://new.oplist.org.cn)

</div>

---

## 一鍵部署

點擊下方按鈕，即可將本專案一鍵部署到對應平台：
<div align="center">


| EdgeOne Makers · 國際站 | EdgeOne Makers · 中國站 | Cloudflare Workers · 全球站 |
| :---: | :---: | :---: |
| [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - 若 Cloudflare 提示`無法取得儲存庫內容`，則您需要先 [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) 本專案，再透過連接到 Github 倉庫功能部署
> - 部署完成後配置環境變數： **EdgeOne**：[國際站](https://console.edgeone.ai/makers) · [中國站](https://console.cloud.tencent.com/edgeone/makers)；**Cloudflare**：[Worker 後台](https://dash.cloudflare.com/)，環境變數：
>   - `DB_DRIVER`: 資料保存方式：`json` (預設) / `d1` (Cloudflare) / `kv` / `mysql`
>   - `DB_JSON_BACKEND`: 選擇`json`格式所使用的後端: `blob` (預設) / `kv` / `cf_rest`
>   - 其餘可選變數參考**詳細部署指南**：[Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## 功能簡介

OpenList 是一個運行於邊緣運算平台的多儲存聚合檔案列表與管理系統，可將分散在不同網盤、物件儲存與協定服務中的檔案統一到一個介面，進行瀏覽、預覽、下載與管理。

OpenList-Worker 是官方 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) 專案的 TypeScript + Serverless 移植版，後端由 Go 重寫為運行於 Workers 的 TypeScript 服務，前端保持一致的介面與互動體驗。

### 儲存聚合

內建 **78 個儲存驅動**，開箱即用地掛載各類儲存後端：

- **國內網盤**：阿里雲盤（開放平台/分享）、夸克網盤（開放平台/UC TV 版）、百度網盤（相簿）、115 網盤（開放平台/分享）、123 雲盤（開放平台/分享）、天翼雲盤（189/PC/TV）、中國移動雲盤（139/和彩雲）、沃家雲盤、迅雷雲盤、騰訊微雲、藍奏雲、PikPak（分享）、豆包網盤、光亞盤、超星小組網盤、聯想 NAS 分享、Teambition 網盤、WPS 網盤、阿里文件、HalalCloud、MediaTrack 等
- **國際網盤**：Google Drive（相簿）、OneDrive（應用/分享連結）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox 等
- **物件儲存**：S3 相容（AWS/OSS/COS/MinIO 等）、又拍雲 USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS 等
- **程式碼託管**：GitHub、GitHub Releases、CNB Releases
- **網盤程式**：OpenList（分享）、AList V3、Cloudreve V3/V4、Kodbox（可道雲）、Seafile、Teldrive、Febbox 等
- **其他驅動**：網易雲音樂、Misskey、Emby、Cloudflare 圖床等

除上述真實儲存外，還提供 `Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` 等虛擬/功能型驅動，可用於本地掛載、位址別名、URL 列表、加密儲存與分片等場景。

### 核心能力

- **檔案瀏覽**：統一的目錄樹瀏覽，支援圖片、影片、音訊、文件、程式碼、壓縮檔等格式線上預覽。
- **上傳下載**：跨儲存的上傳、批次下載、串流傳輸與直鏈跳轉。
- **檔案分享**：生成帶有效期、密碼與權限控制的分享連結，支援匿名存取與目錄分享。
- **全文搜尋**：在已索引的儲存中快速檢索檔案。
- **離線任務**：後台任務佇列，支援批次操作與非同步處理。
- **外部介面**：將聚合儲存以 WebDAV 或 S3 相容協定對外暴露，便於掛載到第三方工具。
- **MCP 服務**：提供 Model Context Protocol 端點，可被 AI 助手等客戶端整合呼叫。

### 權限管理

- **權限管理**：基於角色的存取控制（RBAC），支援使用者分組、目錄級讀寫權限與配額。
- **認證方式**：內建帳號密碼，支援 TOTP 驗證、WebAuthn/FIDO 登入、SSO 單點登入與 LDAP 目錄認證。
- **安全加固**：JWT 會話、CSRF 防護、點擊劫持防護（X-Frame-Options）、內容安全策略（CSP）。
- **健康檢查**：提供 `/health` 存活探針與 `/healthz` 就緒探針，可用於監控與告警。

### 平台部署

- **運行平台**：Cloudflare Workers、騰訊雲 EdgeOne Makers、Vercel、Serverless 及 Node.js 容器環境。
- **資料儲存**：Cloudflare D1（SQLite）為主，同時支援 MySQL、MariaDB、PostgreSQL、SQL Server。
- **持久快取**：Cloudflare KV / EdgeOne Blob（可選），用於配置持久化與快取。
- **一鍵部署**：支援 EdgeOne、Cloudflare Workers 等平台的一鍵部署按鈕+初始化。

---

## 手動部署

### 前置要求

- Node.js 18+（推薦使用 pnpm）
- Cloudflare 帳號（用於部署到 Workers）

### 本地開發

```bash
# 1. 安裝依賴
pnpm install

# 2. 配置 wrangler.toml（填寫 JWT_SECRET、KV/D1 綁定）

# 3. 啟動開發伺服器（自動拉取官方前端並運行 Worker）
pnpm run dev:unified

# 或僅運行 Worker（不拉取前端）
pnpm run dev:worker
```

### 生產部署

```bash
# 一鍵部署：確保 KV namespace 存在 → 拉取官方前端 → 部署到 Cloudflare Workers
pnpm run deploy

# 或直接部署 Worker（跳過 KV 檢查與前端建置）
pnpm run deploy:worker
```

---

## 技術架構

### 後端

- **運行環境**：Cloudflare Workers（Edge Computing）
- **Web 框架**：Hono.js
- **資料庫**：Cloudflare D1（SQLite）/ 支援 MySQL、MariaDB、PostgreSQL、SQL Server
- **快取**：Cloudflare KV（可選）
- **語言**：TypeScript
- **建置工具**：Wrangler、esbuild

### 前端

- **框架**：React 19 + TypeScript
- **UI 庫**：Ant Design / Material-UI
- **建置工具**：Vite

---


## 幫助支援

在使用過程中遇到問題，可透過以下管道取得幫助：

- 🐛 **提交 Bug 或功能請求**：請前往 [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **一般性問題與交流**：請前往 [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) 討論區

## 開源許可

`OpenList` 是基於 [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) 許可證的開源軟體。


## 聯絡我們

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Telegram 交流群](https://t.me/OpenListTeam) · ✈️ [Telegram 頻道](https://t.me/OpenListOfficial)

## 貢獻列表

感謝以下專案及其貢獻者：

- [Alist](https://github.com/AlistGo/alist) 專案作者及全體貢獻者
- [OpenList](https://github.com/OpenListTeam/OpenList)（Go 版）專案作者及全體貢獻者
- 本專案全體貢獻者：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
