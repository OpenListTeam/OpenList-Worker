# 贡献指南 (Contributing Guide)

感谢你对 **OpenListNext** 的关注与支持！🎉

OpenListNext 是一个基于 **SolidJS** + **Hono** + **TypeScript** 的现代化全栈文件列表与网盘管理系统。我们欢迎任何形式的贡献，包括但不限于报告 Bug、提出新功能建议、改进文档、参与国际化翻译以及提交代码。

---

## 目录

- [贡献方式](#-贡献方式)
- [本地开发环境](#-本地开发环境)
  - [环境要求](#环境要求)
  - [快速起步](#快速起步)
  - [常用脚本](#常用脚本)
- [核心架构与开发规范](#-核心架构与开发规范)
  - [全栈 Web 标准优先与边缘兼容（重要）](#全栈-web-标准优先与边缘兼容重要)
  - [添加新的存储驱动 (Storage Driver)](#添加新的存储驱动-storage-driver)
  - [前端开发规范 (SolidJS)](#前端开发规范-solidjs)
  - [国际化翻译 (i18n)](#国际化翻译-i18n)
- [Git 提交规范 (Commit Convention)](#-git-提交规范-commit-convention)
- [Pull Request (PR) 流程](#-pull-request-pr-流程)
  - [PR 准备与自检清单](#pr-准备与自检清单)
  - [AI 辅助使用声明 (AI Disclosure)](#ai-辅助使用声明-ai-disclosure)
- [行为准则与开源许可证](#-行为准则与开源许可证)

---

## 💡 贡献方式

### 1. 报告 Bug

如果您在使用过程中发现了 Bug，请通过 [GitHub Issues](https://github.com/openlistnext/openlistnext/issues) 提交：

- 检查是否已有相同或相似的 Issue。
- 详细描述问题发生的场景、复现步骤、预期行为与实际表现。
- 提供运行环境信息（部署方式如 Node.js 容器 / Cloudflare Workers / Vercel、Node 版本、浏览器版本等）。
- 附上相关的控制台日志或错误堆栈截图/文本。

### 2. 提出功能建议 (Feature Requests)

我们乐于听取各种创新的点子！提交功能建议前：

- 清晰阐述该功能的使用场景与价值。
- 简述预期的交互方式或技术实现构想。

### 3. 参与国际化翻译 (i18n)

项目使用 Crowdin 管理多语言翻译：

- 可通过运行 `pnpm run crowdin:download` 同步最新文案。
- 也欢迎在 [Crowdin 项目页面](https://openlistnext.org/) 或通过 PR 完善语言包。

### 4. 提交代码 (Code Contributions)

无论是修复 Bug、重构代码、新增网盘驱动还是优化 UI，我们都热烈欢迎！请参考下文的开发与提交规范。

---

## 🛠️ 本地开发环境

### 环境要求

- **Node.js**：`>= 18.0.0`（推荐 `22.x`）
- **包管理器**：推荐使用 **`pnpm`**（`>= 9.0.0`）

### 快速起步

1. **Fork 并克隆仓库**：

   ```bash
   git clone https://github.com/<your-username>/openlistnext.git
   cd openlistnext
   ```

2. **安装依赖**：

   ```bash
   pnpm install
   ```

3. **启动本地开发服务器**：

   ```bash
   pnpm run dev
   ```

   开发服务器将同时启动 Hono 后端 API 与 Vite 前端服务，默认访问地址：`http://localhost:3000`。

4. **Cloudflare Workers 边缘模拟调试（可选）**：
   ```bash
   pnpm run dev:worker
   ```

### 常用脚本

| 命令                  | 说明                                             |
| :-------------------- | :----------------------------------------------- |
| `pnpm run dev`        | 启动本地全栈开发环境（Vite + Hono）              |
| `pnpm run lint`       | 执行 TypeScript 类型检查 (`tsc --noEmit`)        |
| `pnpm run format`     | 使用 Prettier 格式化源码                         |
| `pnpm run build`      | 构建完整生产产物（前端静态资源 + Edge 后端脚本） |
| `pnpm run build:edge` | 使用 esbuild 单独打包无服务器/边缘后端脚本       |
| `pnpm run test:189`   | 运行 189Cloud 驱动单元测试                       |
| `pnpm run crowdin`    | 上传并下载 Crowdin 国际化翻译资源                |
| `pnpm run i18n:build` | 更新并编译国际化语言包                           |

---

## 🧱 核心架构与开发规范

```
openlistnext/
├── api/                   # 边缘 / Serverless 入口 ([...route].ts)
├── src/
│   ├── backend/           # 后端核心 (Hono)
│   │   ├── drivers/       # 各网盘存储驱动实现
│   │   ├── internal/      # 核心逻辑 (存储调度/数据库/操作层)
│   │   └── server/        # API 路由 (fs/auth/admin/share/task/mcp 等)
│   ├── components/        # SolidJS 通用前端组件
│   ├── pages/             # 前端页面 (浏览/管理后台/分享/登录等)
│   ├── store/             # 响应式状态管理
│   ├── types/             # 共享 TypeScript 类型定义
│   └── utils/             # 前端工具函数
```

### 全栈 Web 标准优先与边缘兼容（重要）

OpenListNext 的后端设计目标是**跨平台与边缘原生**（既能在 Node.js 容器运行，也能部署在 Cloudflare Workers、Vercel、AWS Lambda 等边缘无服务器环境）：

1. **必须使用标准 Web API**：
   - 使用 `fetch`、`Web Crypto` (`crypto.subtle`)、`ReadableStream`、`Headers`、`Response` 等标准 Web API。
2. **禁止在通用后端直接引入 Node.js 独占模块**：
   - 禁止在 `src/backend/server/` 或通用驱动中静态引入 `fs`、`path`、`net`、`child_process` 等 Node 原生包。
   - 如需仅限 Node.js 容器的功能（如本地文件系统驱动 `LocalDriver`），必须使用动态导入 `await import(...)` 并做好运行环境检测隔离。
   - 依赖 Node 原生二进制的驱动（当前为 `sftp` / `ftp`）会在边缘构建阶段被 [`scripts/build-edge.mjs`](../scripts/build-edge.mjs) 的 `emptyNodeDriverPlugin` 替换为空实现（构造时抛错）。**新增此类驱动时，必须同步把驱动目录与相关原生包加入该插件的依赖过滤规则**，否则边缘平台会因缺少 `.node` 文件 loader 而打包失败。
3. **数据持久化适配**：
   - 核心数据操作通过模型层抽象，支持 **Cloudflare KV**（边缘环境）与 **JSON 文件**（Node.js 容器环境）无缝适配。

### 添加新的存储驱动 (Storage Driver)

若需支持新的网盘或对象存储，请按以下步骤实现：

1. **在 `src/backend/drivers/<driver_name>/` 创建驱动目录**：
   - `types.ts`：定义该网盘的附加配置项（Addition）与 API 数据结构。
   - `util.ts`：封装与该网盘开放平台/接口交互的 Client 类。
   - `driver.ts`：实现 `StorageDriver` 接口（定义于 `src/backend/internal/driver/base.ts`）。
2. **实现 `StorageDriver` 接口方法**：
   - `list(virtualPath, physicalPath)`: 获取目录文件列表
   - `get(virtualPath, physicalPath)`: 获取单文件详情/下载直链
   - `mkdir(virtualPath, physicalPath)`: 创建目录
   - `rename(virtualPath, physicalPath, newName)`: 重命名
   - `remove(virtualPath, physicalPath, names)`: 删除文件/目录
   - `move` / `copy` / `put`（按网盘支持能力选择实现）
3. **注册驱动**：
   - 在 `src/backend/internal/op/storage.ts` 中引入并注册驱动实例获取逻辑。
   - 在 `src/backend/server/admin.ts` 中补充驱动配置项元数据（如需要后台驱动表单支持）。

### 前端开发规范 (SolidJS)

- UI 组件库使用 `@hope-ui/solid` 与原生 CSS，避免引入冗余庞大的样式库。
- 遵循 SolidJS 细粒度响应式最佳实践（正确使用 `createSignal`、`createMemo`、`createStore`，避免解构 props 导致丢失响应性）。
- 注意暗色模式 (Dark Mode) 与移动端响应式布局的适配。

---

## 📌 Git 提交规范 (Commit Convention)

提交信息请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，格式如下：

```
<type>(<scope>): <subject>
```

### 常用 Type 类型

- `feat`: 新增功能特性
- `fix`: 修复 Bug
- `docs`: 文档变动
- `style`: 代码格式调整（不影响逻辑的空格、分号等）
- `refactor`: 重构代码（既不修复 bug 也不添加新功能）
- `chore`: 构建过程、辅助工具或依赖项的变动
- `perf`: 性能优化

### 示例

- `feat(driver): add quark drive upload support`
- `fix(fs): resolve range header streaming issue`
- `docs(readme): update deployment instructions`
- `refactor(auth): simplify token verification flow`

---

## 🔀 Pull Request (PR) 流程

1. **创建分支**：从最新的 `main` 分支切出新分支：
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **编写代码与自测**：
   - 编写优雅、注释清晰的代码。
   - 在本地充分测试变更功能及周边逻辑。
3. **提交前自检**：

   ```bash
   # 1. 确保无 TypeScript 类型错误
   pnpm run lint

   # 2. 格式化代码
   pnpm run format

   # 3. 确保构建通过
   pnpm run build
   ```

4. **推送到远程并提交 PR**：
   - 将分支推送到你的 Fork 仓库并向 `main` 分支发起 PR。
   - 详细填写 PR 描述模板（参考项目提供的 [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)）。

### PR 准备与自检清单

- [ ] 代码已通过 `pnpm run lint` 类型检查。
- [ ] 代码已通过 `pnpm run format` 格式化。
- [ ] 已在本地测试通过（包括 Node.js 模式与边缘环境模式兼容性）。
- [ ] PR 标题符合 Conventional Commits 规范（包含必填的 `type(scope)`）。
- [ ] 如涉及破坏性变更或配置调整，已在 PR 摘要中明确说明。

### AI 辅助使用声明 (AI Disclosure)

OpenListNext 欢迎开发者合理使用 AI 工具提升开发效率。为了确保代码库的合规性与可维护性：

- 若 PR 中包含由 AI（如 ChatGPT、Claude、Copilot、Gemini 等）大量生成的代码或重构内容，请在 PR 模版中的 **AI Disclosure** 区域予以如实勾选与说明。
- 贡献者需自行审查并完全理解所提交的 AI 辅助内容，确保代码质量与安全性。

---

## 📜 行为准则与开源许可证

- **行为准则**：请保持友善、包容与互相尊重的沟通氛围。对技术实现有不同意见时，欢迎基于事实和规范进行建设性讨论。
- **开源许可证**：向本项目提交的所有贡献均默认遵循项目的 [AGPL-3.0 许可证](LICENSE)。在提交代码前，请确保你拥有提交该代码的版权或已取得合规授权。
