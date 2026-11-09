<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList 是一個多功能的目錄列表工具，支援數十種網盤檔案掛載和檔案預覽/下載/分享等功能</em></p>
  <p>本倉庫是官方 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> 專案的 TypeScript + Serverless 架構移植版</p>
  <p>基於 Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA 運行</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

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


| EdgeOne Makers · 國際站 | EdgeOne Makers · 中國站 | Cloudflare Workers · 全球站 | 阿里雲 ESA · 中國站 |
| :---: | :---: | :---: | :---: |
| [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![使用 EdgeOne 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![使用阿里雲 ESA 部署](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - 若 Cloudflare 提示`無法取得儲存庫內容`，則您需要先 [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) 本專案，再透過連接到 Github 倉庫功能部署
> - 阿里雲 ESA 請在控制台「邊緣運算和 AI → 函數和 Pages」中匯入本儲存庫
> - 部署時請填寫 `JWT_SECRET`（≥16 字元），用於 JWT 簽章與加密
> - 資料儲存預設自動選擇平台內建的持久化後端（`DB_DRIVER=auto`），無需設定；其餘變數見 [設定變數](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - 部署完成後首次造訪站點，依**安裝精靈**在瀏覽器中設定管理員帳號與密碼即可完成初始化；如需跳過精靈，可設定 `ADMIN_PASS`


## 功能簡介

OpenList 是一個運行於邊緣運算平台的多儲存聚合檔案列表與管理系統，可將分散在不同網盤、物件儲存與協定服務中的檔案統一到一個介面，進行瀏覽、預覽、下載與管理。

OpenList-Worker 是官方 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) 專案的 TypeScript + Serverless 移植版，後端由 Go 重寫為運行於 Workers 的 TypeScript 服務，前端保持一致的介面與互動體驗。

### 儲存聚合

內建 **78 個儲存驅動**，開箱即用地掛載各類儲存後端：

- **國內網盤**：阿里雲盤（開放平台/分享）、夸克網盤（開放平台/UC TV 版）、百度網盤（相簿）、115 網盤（開放平台/分享）、123 雲盤（開放平台/分享）、天翼雲盤（189/PC/TV）、中國移動雲盤（139/和彩雲）、沃家雲盤、迅雷雲盤、騰訊微雲、藍奏雲、PikPak（分享）、豆包網盤、光亞盤、超星小組網盤、聯想 NAS 分享、Teambition 網盤、WPS 網盤、阿里文件、HalalCloud、MediaTrack 等
- **國際網盤**：Google Drive（相簿）、OneDrive（應用/分享連結）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox 等
- **物件儲存**：S3 相容（AWS/OSS/COS/MinIO 等）、Cloudflare R2（Workers Binding 直連或 S3 API）、又拍雲 USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS 等
- **程式碼託管**：GitHub、GitHub Releases、CNB Releases
- **網盤程式**：OpenList（分享）、AList V3、Cloudreve V3/V4、Kodbox（可道雲）、Seafile、Teldrive、Febbox 等
- **其他驅動**：網易雲音樂、Misskey、Emby、Cloudflare 圖床等

除上述真實儲存外，還提供 `Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` 等虛擬/功能型驅動，可用於本地掛載、位址別名、URL 列表、加密儲存與分片等場景。

### 核心能力

- **檔案管理**：統一目錄樹瀏覽，圖片 / 影片 / 音訊 / 文件 / 程式碼 / 壓縮檔線上預覽；跨儲存上傳、批次下載、串流傳輸與直鏈跳轉；帶有效期、密碼與權限控制的分享連結。
- **檢索與任務**：已索引儲存的全文搜尋；後台任務佇列支援批次與非同步處理。
- **外部介面**：WebDAV、S3 相容協定，以及可供 AI 助手整合的 MCP 端點。
- **權限與認證**：RBAC（使用者分組、目錄級讀寫權限、配額），帳號密碼 + TOTP / WebAuthn / SSO / LDAP。
- **安全與維運**：JWT 會話、CSRF、點擊劫持（X-Frame-Options）與 CSP 防護，`/health`、`/healthz` 健康探針。
- **並行去重**：相同目錄列表 / 中繼資料請求只向上游網盤發起一次，其餘請求重用結果，減少限流與 CPU 消耗。
- **執行平台**：Cloudflare Workers、騰訊雲 EdgeOne Makers、阿里雲 ESA、Vercel / AWS Lambda 與 Node.js 容器。
- **資料儲存**：Cloudflare D1（SQLite）為主，也支援 KV / Blob / Durable Objects 與外部 MySQL / MariaDB。
- **一鍵部署**：支援 EdgeOne、Cloudflare Workers、阿里雲 ESA 部署按鈕 + 安裝精靈。

---

## 手動部署

<details>
<summary>展開查看前置要求、本地開發與生產部署</summary>

### 前置要求

- Node.js 18+（推薦使用 pnpm）
- Cloudflare 帳號（用於部署到 Workers）

### 本地開發

```bash
# 1. 安裝依賴
pnpm install

# 2. 按需設定 wrangler.jsonc 中的綁定與變數（JWT_SECRET 見 .dev.vars.example）

# 3. 啟動開發伺服器（自動拉取官方前端並運行 Worker）
pnpm run dev:unified

# 或僅運行 Worker（不拉取前端）
pnpm run dev:worker
```

### 生產部署

```bash
# 一鍵部署：建置前端產物 → 部署到 Cloudflare Workers（KV 綁定由 wrangler 自動預配）
pnpm run deploy

# 或直接部署 Worker（跳過前端建置）
pnpm run deploy:worker
```

</details>

---

## 技術架構

### 後端

- **運行環境**：Cloudflare Workers / EdgeOne 雲函數 / 阿里雲 ESA（Edge Computing）
- **Web 框架**：Hono.js
- **資料庫**：Cloudflare D1（SQLite）/ KV / Blob / Durable Objects，或外部 MySQL / MariaDB
- **語言**：TypeScript
- **建置工具**：Wrangler、esbuild

### 前端

- **框架**：SolidJS + TypeScript（官方 [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend)）
- **UI 庫**：Hope UI
- **建置工具**：Vite

---

## 部署設定

部署完成後請設定如下變數：

| 變數 | 預設值 | 說明 |
| :--- | :--- | :--- |
| `JWT_SECRET` | (無) | JWT 令牌簽章金鑰（≥16 字元） |
| `DB_FORMAT` | `map` | `map`（JSON）/ `key`（分 key）/ `sql`（關聯表） |
| `DB_DRIVER` | `auto` | 可選 `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | 敏感欄位落盤演算法，如 `aes-256-gcm` |

完整環境變數，請參閱[設定變數](https://doc.oplist.org/ecosystem/official_worker/guide_env)

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
