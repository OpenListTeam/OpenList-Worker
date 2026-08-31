# 腾讯云 EdgeOne Makers 部署指南

本文档介绍如何将 OpenListNext 部署到 [腾讯云 EdgeOne Makers](https://edgeone.ai/)（边缘函数 / 边缘全栈托管平台）。

---

## 架构适配特性

- **前端托管**：基于 SolidJS + Vite 打包输出到 `dist/`，通过 EdgeOne 边缘 CDN 全球加速。
- **后端执行**：由 **Cloud Functions（Node.js）** 承载，`scripts/build-edge.mjs` 在构建期将 `api/_makers.ts` 打包为仓库根 **`cloud-functions/[[default]].js`**（⚠️ Makers 在检出仓库时即扫描该文件决定是否启用 Node 函数，因此产物必须提交进仓库；若缺失，CLI 会报 `No server-handler detected` 并退化为纯静态项目），以 Handler 模式包裹 Hono 应用统一处理 `/api`、`/d`、`/p`、`/sd`、`/health` 等请求；根路径与前端路由由根级 **`middleware.js`** 将浏览器导航请求（Accept: text/html 且非后端路径）透明改写为 `/index.html`，命中静态 CDN 的 SPA fallback。
- **SPA 兜底双保险**：Node 云函数内没有 `ASSETS` 绑定，因此构建时会把 `dist/index.html` 内联进函数包——即使边缘中间件未生效、或请求直达云函数，前端路由（如 `/add`、`/@manage/*`）也会由函数直接返回页面壳（`Cache-Control: no-cache`），不会再出现整站 404。
- **配置持久化**：
  - **Blob 存储**（推荐）：自动使用 `@edgeone/pages-blob` SDK（HTTP API），无需手动配置，避免 Redis RESP 协议崩溃。
  - **KV 存储**（兼容）：自动适配 `OPENLISTNEXT_KV` / `EDGEONE_KV` / `EO_KV` 命名空间（仅 Cloudflare 环境）。
- **定时任务 (Schedules)**：已内置 `/api/task/refresh` 定时调度（每天凌晨 2:00 自动刷新一次已启用的网盘 Token，完全兼容 EdgeOne 免费版定时任务规则；并在每次实际请求时结合按需检测保障 Token 实时有效）。调度请求需通过 `CRON_SECRET` 环境变量鉴权，配置方法见下文「定时任务与长时任务」。

---

## 部署步骤

### 方式一：EdgeOne Makers 控制台 Git 导入（推荐）

1. **导入仓库**：登录 [EdgeOne Makers 控制台](https://console.edgeone.ai/makers)，点击 **新建项目** -> **导入 Git 仓库**。
2. **构建设置**（平台将自动读取项目根目录的 `edgeone.json`）：
   - **Node 版本**：`22.11.0`
   - **安装命令**：`pnpm install --no-frozen-lockfile`
   - **构建命令**：`pnpm run build`
   - **输出目录**：`dist`
3. **存储配置**：无需手动配置。Blob 存储会自动初始化（使用 `@edgeone/pages-blob` SDK），配置数据持久化在 `openlistnext_db` 命名空间中。
4. **点击部署**：构建完成后即可通过 EdgeOne 分配的 `*.edgeone.cool` 域名直接访问。首次启动会生成随机管理密码，请查看部署日志获取初始密码，登录后立即修改。也可在环境变量中设置 `ADMIN_PASSWORD` 预设密码。

---

### 方式二：EdgeOne CLI 部署

```bash
# 全局安装 EdgeOne CLI
npm install -g edgeone

# 登录账户
edgeone login

# 本地调试开发
edgeone makers dev

# 构建并部署到生产
edgeone makers deploy
```

---

## 定时任务与长时任务 (Schedules)

`edgeone.json` 中配置了定时任务规则：

```json
"schedules": [
  {
    "name": "token-refresh",
    "cron": "0 2 * * *",
    "path": "/api/task/refresh",
    "method": "POST",
    "payload": { "cron_secret": "<与 CRON_SECRET 环境变量一致的值>" },
    "timezone": "Asia/Shanghai"
  }
]
```

**鉴权说明**：`/api/task/refresh` 受管理员鉴权保护，而 EdgeOne Schedules 只能携带 `path/method/payload`，无法附加 `Authorization` 头。因此需要：

1. 在 Makers 控制台 **项目设置 - 环境变量** 中添加 `CRON_SECRET`（自定义随机长字符串）；
2. 将相同值填入上方 `payload.cron_secret`（或改用路径参数 `/api/task/refresh?cron_secret=<值>`）。

两者匹配即可触发；未设置 `CRON_SECRET` 时该接口仍仅接受管理员凭证。除 payload 外也支持 `X-Cron-Secret` 请求头携带密钥（适用于可自定义请求头的调度系统）。

> ⚠️ **公开仓库勿提交真实密钥**：本仓库是开源项目，`edgeone.json` 中的占位值 `"cron_secret": ""` 请保持为空直接部署——此时定时任务会触发但因鉴权失败被拒绝（无害，网盘 Token 由请求时按需刷新兜底）。若要真正启用自动刷新，请只在**你自己控制的私有配置/私有 fork** 中填入真实值；公开仓库中提交真实密钥等于向所有人公开该接口的触发凭证。

**验证方法**：手动模拟一次调度请求（与平台调度器行为一致）：

```bash
curl -X POST "https://你的域名/api/task/refresh" \
  -H "Content-Type: application/json" \
  -d '{"cron_secret":"<你设置的值>"}'
```

返回 `{"code":200,"message":"token refresh executed",...}` 即配置成功；也可次日到控制台「可观测性 → 日志分析」查看凌晨 2:00 的触发记录。

> 💡 **免费版配额说明**：EdgeOne Makers 免费版定时任务最小执行间隔为 1 天（86400 秒），故配置为每天凌晨 2:00（`0 2 * * *`）执行一次。OpenListNext 网盘驱动均支持在请求时自动按需换新 Access Token，双重保障网盘连接永不断流。
