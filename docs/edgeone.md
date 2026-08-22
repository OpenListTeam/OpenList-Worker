# 腾讯云 EdgeOne Makers 部署指南

本文档介绍如何将 OpenListNext 部署到 [腾讯云 EdgeOne Makers](https://edgeone.ai/)（边缘函数 / 边缘全栈托管平台）。

---

## 架构适配特性

- **前端托管**：基于 SolidJS + Vite 打包输出到 `dist/`，通过 EdgeOne 边缘 CDN 全球加速。
- **后端执行**：由 Edge Functions (`edge-functions/[[default]].js` / `api/[...route].js`) 在边缘节点运行，毫秒级冷启动。
- **配置持久化**：
  - **KV 存储**：自动适配 `OPENLISTNEXT_KV` / `EDGEONE_KV` / `EO_KV` 命名空间。
  - **Blob 存储**：支持通过 `openlistnext_db` Blob 存储实现单项最大 25MB 的大配置/文件元数据持久化。
- **定时任务 (Schedules)**：已内置 `/api/task/refresh` 定时调度（每天凌晨 2:00 自动刷新一次已启用的网盘 Token，完全兼容 EdgeOne 免费版定时任务规则；并在每次实际请求时结合按需检测保障 Token 实时有效）。

---

## 部署步骤

### 方式一：EdgeOne Makers 控制台 Git 导入（推荐）

1. **导入仓库**：登录 [EdgeOne Makers 控制台](https://console.edgeone.ai/makers)，点击 **新建项目** -> **导入 Git 仓库**。
2. **构建设置**（平台将自动读取项目根目录的 `edgeone.json`）：
   - **Node 版本**：`22.11.0`
   - **安装命令**：`pnpm install --no-frozen-lockfile`
   - **构建命令**：`pnpm run build`
   - **输出目录**：`dist`
3. **绑定 KV 命名空间**：
   - 在控制台侧边栏进入 **KV 存储**，创建一个命名空间（例如 `openlistnext-kv`）。
   - 在项目的 **设置 -> 函数设置 -> KV 命名空间绑定** 中，添加绑定：
     - **变量名**：`OPENLISTNEXT_KV`（或 `EDGEONE_KV`）
     - **命名空间**：选择刚创建的 `openlistnext-kv`。
4. **点击部署**：构建完成后即可通过 EdgeOne 分配的 `*.edgeone.cool` 域名直接访问，默认管理账号为 `admin` / `admin`。

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
    "timezone": "Asia/Shanghai"
  }
]
```

> 💡 **免费版配额说明**：EdgeOne Makers 免费版定时任务最小执行间隔为 1 天（86400 秒），故配置为每天凌晨 2:00（`0 2 * * *`）执行一次。OpenListNext 网盘驱动均支持在请求时自动按需换新 Access Token，双重保障网盘连接永不断流。
