# 前端统一方案：GO / TS 双后端兼容

> 目标：以官方前端 `OpenList-Frontend` 为基准，统一成**一套前端代码**，通过"后端模式"机制同时兼容
> **Go 版 OpenList 后端**（端口 5244）与 **OpenList 的 Hono 后端**（TSWorker），避免两套前端各自漂移。

---

## 1. 背景与目标

当前存在两份前端：

| 前端     | 仓库                                | 对接后端                           | 版本             |
| -------- | ----------------------------------- | ---------------------------------- | ---------------- |
| 官方前端 | `OpenList-Frontend`                 | Go 版 OpenList（`localhost:5244`） | 4.2.4 / MIT      |
| 当前前端 | `OpenList-TSWorker/src`（前端部分） | Hono 后端（内嵌 dev server）       | 4.2.3 / AGPL-3.0 |

两者已**双向分叉**：官方新增了 S3 设置、任务管理；TS 新增了插件、分片上传、中文翻译。

**目标**：把 TS 前端换成官方前端，并反向把 TS 独有功能合并进官方前端，最终通过运行时"模式探测"让同一份构建产物在两种后端下正确显示/屏蔽功能。

---

## 2. 差异分析

### 2.1 文件结构差异（前端 `src/`，排除 backend）

- 官方 243 文件，TS 前端 254 文件。
- 内容有差异的文件共 **108+ 个**：

```
app        : 5 文件   +233/-55
components : 10 文件  +399/-266
hooks      : 6 文件   +97/-96
pages      : 66 文件  +2887/-2776  ← 最大
store      : 3 文件   +96/-36
types      : 6 文件   +65/-6
utils      : 12 文件  +832/-64
```

### 2.2 官方独有（TS 无）

- `pages/manage/settings/S3.tsx`、`S3BucketItem.tsx`、`S3Buckets.tsx` — S3 设置
- `pages/manage/tasks/`（10 文件）— 任务管理 UI（Aria2/Qbit/离线下载/复制/移动/解压/上传）
- `lang/en/tasks.json`、`pages/test/index.tsx`

### 2.3 TS 独有（官方无）

- `lang/zh-CN/`（18 文件）— 中文翻译
- `pages/manage/plugins/`（4 文件）+ `types/plugin.ts` + `utils/plugin_engine.ts` + `utils/zip_plugin.ts` — 插件系统
- `pages/home/uploads/chunked.ts` — 分片上传
- `components/Face404.tsx`

### 2.4 关键契约差异

| 项            | 官方                     | TS                       |
| ------------- | ------------------------ | ------------------------ |
| 全局配置对象  | `window.OPENLIST_CONFIG` | `window.OPENLIST_CONFIG` |
| 后端 API 前缀 | `/api`（proxy → 5244）   | `/api`（内嵌 Hono）      |
| `r` 导出位置  | `~/utils`（index.ts）    | `~/utils/request.ts`     |
| 防缓存参数    | `openlist_ts`            | `openlist_ts`            |
| 默认语言      | `en`                     | `zh-CN`                  |

---

## 3. 模式机制设计（核心）

### 3.1 探测方式

**后端 `/api/public/settings` 返回里新增 `backend` 字段**，零额外请求：

- TS 后端：`backend: "ts-worker"`（见 `src/backend/server/public.ts`）
- GO 后端：不返回该字段（缺省视为 `"go"`）

前端在 `setSettings()` 里读取该字段，写入 `src/utils/backend.ts` 的单例状态。

### 3.2 API

```ts
// src/utils/backend.ts
export type BackendKind = "go" | "ts-worker"
export const setBackendKind = (k: BackendKind): void
export const getBackendKind = (): BackendKind       // 默认 "go"
export const isTsWorker = (): boolean
export const isGo = (): boolean
```

> 兜底：若 settings 未返回 `backend`，也可在 `detectBackendKind()` 里探测 TS 独有接口
> `/api/public/plugins`（存在即 `ts-worker`）。当前首选字段探测，接口探测作为回退。

### 3.3 使用方式

```tsx
// 菜单/路由里屏蔽
import { isTsWorker, isGo } from "~/utils/backend"

const items = baseItems.filter((item) => (item.tsOnly ? isTsWorker() : true))
```

---

## 4. 功能对照与屏蔽策略

| 功能                | GO 模式        | TS 模式        | 处理                                                                 |
| ------------------- | -------------- | -------------- | -------------------------------------------------------------------- |
| 插件（plugins）     | 隐藏           | 显示           | TS 独有，合并进统一前端，GO 模式屏蔽                                 |
| 分片上传（chunked） | 隐藏/回退      | 显示           | 两边都支持，都保留；TS 用会话分片，GO 用流式。文档注明以 GO 接口为准 |
| S3 设置             | 显示           | 隐藏           | GO 独有，TS 模式屏蔽                                                 |
| 任务管理（tasks）   | 显示           | 隐藏           | GO 独有，TS 模式屏蔽（TS 后端无后台任务）                            |
| Face404             | 隐藏           | 显示           | TS 独有，GO 模式屏蔽                                                 |
| 中文翻译（zh-CN）   | 用官方自动翻译 | 用官方自动翻译 | 去除本地手写 zh-CN，走官方 crowdin 流程                              |

### 4.1 屏蔽实现点

- `pages/manage/sidemenu_items.tsx`：按 `isTsWorker()`/`isGo()` 过滤菜单项。
- `pages/manage/routes.tsx`：按模式过滤路由。
- 上传入口：根据模式选择 `ChunkedUpload` 或 `StreamUpload`。

---

## 5. 分阶段实施计划

1. **阶段 0 — 基础设施**（低风险）
   - [x] 后端 `/public/settings` 增加 `backend` 字段
   - [x] 新增 `src/utils/backend.ts` 模式模块
   - [x] `setSettings` 接入模式写入
   - [x] 本方案文档
2. **阶段 1 — 以官方前端为基准同步**（高风险，需逐步 + 编译验证）
   - 用官方前端 `src/`（app/components/hooks/pages/store/types/utils/lang）覆盖 TS 对应目录
   - 保留 TS 独有目录：`pages/manage/plugins/`、`utils/plugin_engine.ts`、`utils/zip_plugin.ts`、`types/plugin.ts`、`pages/home/uploads/chunked.ts`、`components/Face404.tsx`
   - 适配 `vite.config.ts`（保留 TS 的 `@hono/vite-dev-server`，叠加官方的 `dynamicBase` 等）
3. **阶段 2 — 模式屏蔽**：菜单/路由/上传入口按模式开关
4. **阶段 3 — 翻译**：去除 `lang/zh-CN`，接入官方 crowdin（或拉取官方翻译产物）
5. **阶段 4 — 插件调整**：复核插件引擎在统一前端下的可用性（接口/权限模型）

---

## 6. 翻译方案

- 官方采用 crowdin 自动翻译（`lang/en` 为源，其他语言由 CI 生成）。
- TS 本地手写的 `lang/zh-CN` 将被**移除**，改由官方翻译流程产出。
- 过渡期：若 crowdin 尚未产出中文，可临时保留 zh-CN 字典作为 fallback，但标记为待废弃。

---

## 7. 插件调整（TS 独有，保留）

- 插件系统（`plugin_engine.ts` + `pages/manage/plugins`）整体保留，仅 TS 模式启用。
- 需复核：统一前端后 `r`、`bus`、`notify` 的导入路径；插件权限模型与后端 `/api/public/plugins`、`/api/admin/plugin/*` 的契约。
- 实现方式后续可能调整（对齐 GO 后端若将来引入插件能力）。

---

## 8. 以 GO 为准的原则

- **分片上传 / S3**：两边都实现时，统一后以 **GO 后端的接口与逻辑为准**；TS 后端逐步对齐 GO 接口。
- 后续新增能力，优先遵循 GO 版 OpenList 的 API 契约，TS 后端适配之。

---

## 9. 风险与回滚

- 覆盖 100+ 文件，务必在 git 干净状态下分阶段提交，每阶段 `npm run lint` + `npm run build` 验证。
- 保留 TS 独有目录，避免功能丢失。
- `window.OPENLIST_CONFIG` 与 `OPENLIST_CONFIG` 统一：保留官方名 `OPENLIST_CONFIG`，TS 的 `index.html` 同步改名。
