# 前端统一：OpenListNext 后端使用官方前端产物

> 目标：OpenListNext（TSWorker / Cloudflare Workers）后端**不再维护内嵌前端源码**，
> 前端统一由官方仓库 `OpenList-Frontend` 提供，通过后端 `/api/public/settings` 返回的
> `backend` 字段在运行时探测 **GO / TS 模式**，同一份前端产物兼容两种后端。

---

## 1. 架构

```
┌─────────────────────────────────────────────────────────┐
│  官方前端 OpenList-Frontend（唯一前端源码）              │
│  · src/utils/backend.ts   运行时探测 GO/TS 模式          │
│  · 构建产物 dist/ 是通用的                                │
└────────────────────────┬────────────────────────────────┘
                         │ 构建产物 dist/
                         ▼
┌─────────────────────────────────────────────────────────┐
│  OpenListNext (TSWorker) 后端                            │
│  · src/backend/   Hono worker（自包含，不依赖前端源码）   │
│  · dist/          前端静态资源（由 fetch-frontend 拉取）  │
│  · build-edge.mjs esbuild 打包后端 + 内联 dist/index.html │
└─────────────────────────────────────────────────────────┘
```

### 模式探测

后端 `/api/public/settings` 返回 `backend: "ts-worker"`（Go 后端不返回该字段，前端缺省视为 `"go"`）。

- **TS 模式**：启用插件、会话分片上传、Face404；屏蔽 S3 设置、任务管理、multipart。
- **GO 模式**：启用 S3、任务管理、multipart；屏蔽插件、会话分片上传、Face404。

---

## 2. 前端产物获取（`scripts/fetch-frontend.mjs`）

优先级（高 → 低）：

| 来源           | 环境变量                                   | 说明                                                  |
| -------------- | ------------------------------------------ | ----------------------------------------------------- |
| 本地已构建产物 | `FRONTEND_DIST=/path/to/dist`              | 最快，CI 缓存场景                                     |
| 本地前端仓库   | `FRONTEND_REPO=/path/to/OpenList-Frontend` | 显式指定，自动 `install + build`                      |
| 同级目录探测   | （自动）                                   | `../OpenList-Frontend`，monorepo 布局自动复用         |
| Git 克隆       | （默认兜底）                               | 克隆 `OpenListTeam/OpenList-Frontend.git#main` 并构建 |

```bash
# 使用本地官方前端仓库（开发常用，显式指定）
FRONTEND_REPO=../OpenList-Frontend npm run fetch:frontend

# 或直接用已构建好的产物
FRONTEND_DIST=../OpenList-Frontend/dist npm run fetch:frontend

# 或什么都不指定：自动探测同级 ../OpenList-Frontend，否则 Git 克隆 main
npm run fetch:frontend

# CI/部署：指定官方前端分支（例如功能未合并进 main 时）
FRONTEND_GIT_REF=feat/ts-backend-compat npm run fetch:frontend
```

> 注意：`fetch-frontend.mjs` 始终以仓库根目录为基准（基于 `__dirname`），
> 与调用时的 cwd 无关，因此 `deploy.js` 通过 `run()` 调用时也能正确工作。

---

## 3. 构建流程

```bash
npm run build          # fetch-frontend + build-edge（新流程，后端 + 官方前端）
npm run build:edge     # 仅 esbuild 打包后端（假设 dist/ 已就绪）
npm run build:local    # 旧流程（本地 vite build 前端 + build-edge），过渡期回退
```

### 部署

```bash
npm run deploy          # scripts/deploy.js：确保 KV + fetch-frontend + wrangler deploy
npm run deploy:worker   # 直接 wrangler deploy（跳过 KV 确保与前端构建）
node scripts/deploy.js --skip-build   # 跳过前端获取（dist/ 已就绪时）
```

> `deploy.js` 已从前端迁移前的老前端构建（`npx vite build`）切换为
> `fetch-frontend.mjs`（官方前端产物）。老前端源码仍保留在 `src/`，供 `build:local` 回退。

`build-edge.mjs` 输出：

- `dist-server/api/[...route].js`（EdgeOne / Vercel / Serverless）
- `cloud-functions/[[default]].js`（内联 `dist/index.html` 作 SPA 兜底）
- `dist/esa-entry.js`（阿里云 ESA，若 `esa-entry.ts` 存在）

`wrangler.toml` 的 `[assets] directory = "./dist"` 直接提供前端静态资源，无需改动。

---

## 4. 开发（dev）流程

### 方式 A：后端一体化（`dev:unified`）

```bash
npm run dev:unified   # fetch-frontend + wrangler dev（serve dist + worker，默认 8787）
```

### 方式 B：前后端分离（前端热更新）

```bash
# 终端 1：后端
npm run dev:worker    # wrangler dev，监听 8787

# 终端 2：官方前端（在 OpenList-Frontend 仓库）
DEV_PROXY_TARGET=http://localhost:8787 pnpm dev   # vite dev，/api 代理到 TS 后端
```

> 官方前端 `vite.config.ts` 已支持 `DEV_PROXY_TARGET`；不设置时默认代理到 Go 后端 `5244`。

---

## 5. 以 GO 为准的原则

- **分片上传 / S3**：两边都实现时，统一后以 **Go 后端的接口与逻辑为准**；TS 后端逐步对齐。
  - Go：`multipart.ts`（MultipartUpload）
  - TS：`chunked.ts`（ChunkedUpload，会话式，为 Workers 环境设计）
- 新增能力优先遵循 Go 版 API 契约，TS 后端适配之。

---

## 6. 待办（渐进迁移）

> 老前端源码（`src/` 前端部分 + `index.html` + `vite.config.ts` + `build.sh` + 前端发布 CI）
> **暂时保留**作为回退，待官方前端产物在线上稳定运行后再移除。

- [ ] 前端源码移除（`src/` 中除 `backend/` 外的文件、`index.html`）
- [ ] 移除前端发布 CI（`build_pr.yml` / `build_rolling.yml` / `build_release.yml`）与 `build.sh`
- [ ] 移除 `vite.config.ts` 前端插件与 `build:local` / `build:lite`（过渡期后）
- [ ] 翻译：官方 crowdin 流程产出，TS 后端不再本地维护 `lang/zh-CN`
- [ ] CI 部署时设置 `FRONTEND_GIT_REF`（或 `FRONTEND_REPO`），确保拉取含双后端兼容的官方前端版本

---

## 7. 测试清单

```bash
# 1. 官方前端：类型检查 + 构建
cd OpenList-Frontend
pnpm install
pnpm run lint        # tsc --noEmit
pnpm run build       # 产出 dist/

# 2. 后端：拉取前端产物 + 打包后端
cd ../OpenList-TSWorker
pnpm install
FRONTEND_REPO=../OpenList-Frontend npm run fetch:frontend
npm run build:edge

# 3. 本地端到端（Cloudflare Workers 模拟）
npm run dev:worker   # wrangler dev → http://localhost:8787
#   浏览器打开，验证：登录、文件浏览、上传（会话分片）、插件菜单（TS 模式）
#   并确认 S3 / 任务管理菜单在 TS 模式下被隐藏

# 4. 单元测试
npm run test:189
```
