<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`

推荐标题：`fix(init): simplify env check messages and refresh README`
-->

`fix(init): simplify env check messages and refresh README`

## Summary / 摘要

本 PR 包含四组互相独立的改动：

1. **初始化环境检查文案**：安装向导里的环境变量报错改为「一行中文 + 一行英文」的短文案，详细排查信息仍保留在日志字段中。
2. **README 改版**：补充阿里云 ESA 部署入口与 Star / Fork 徽章，折叠手动部署步骤，合并精简「核心能力 / 权限管理 / 平台部署」，配置章节改为精简表格。
3. **多语言同步**：12 个语言版本 README 应用与主文件相同的结构。
4. **wrangler 配置注释精简**：删除冗长注释，保留实际生效的绑定与变量说明。

## Motivation / 背景

- 安装向导只展示 `issues[].summary` 与 `issues[].suggestion`，原文案为多行英文，信息密度低，中文用户难以快速定位问题。
- README 缺少阿里云 ESA 的部署入口，仓库热度信息（Star / Fork）也没有展示。
- `wrangler.jsonc` 中大量历史注释已与当前实现脱节（缓存、旧加密算法、手动 KV 创建等），维护成本高。

## Changes / 改动内容

### 1. 初始化诊断文案（`src/backend/server/public.ts`）

新增 `initIssueText()`，按错误码输出精简的中英双语 `summary` / `suggestion`：

| code | 示例 summary |
| --- | --- |
| `JWT_SECRET_MISSING` | 未配置 JWT_SECRET（可留空，初始化时自动生成）/ JWT_SECRET is not set (optional; generated at setup) |
| `NO_STORAGE` | 没有可用的存储后端 / No storage backend available |
| `INVALID_COMBINATION` | 存储组合无效：DB_FORMAT=sql 与 DB_DRIVER=blob 不兼容 / Invalid storage combination… |
| `DRIVER_UNAVAILABLE` | 存储驱动不可用：DB_DRIVER=kv / Storage driver unavailable: DB_DRIVER=kv |
| `PROXY_CONFIG` | KV 代理配置错误 / KV proxy configuration error |
| `UNKNOWN_DRIVER` | 未知的存储驱动：DB_DRIVER=xxx / Unknown DB_DRIVER: xxx |
| `STORAGE_READ_FAILED` | 存储读取失败，已中止初始化 / Storage is not readable; initialization was aborted |
| `STORAGE_UNHEALTHY` | 存储驱动连接失败：d1 / Storage driver is configured but unreachable: d1 |
| `STORAGE_MEMORY_ONLY` | 仅内存存储，实例销毁后数据丢失 / In-memory storage only; data is lost… |

- 驱动不可用时，建议仍给出可抄写的答案：`改为 DB_DRIVER=blob（或 auto）/ Set DB_DRIVER=blob (or auto)`。
- 详细原因仍保留在 `message`、`reason`、`db_load_error` 中，接口字段不变，仅展示值变短。
- 同步修正 `/public/init_status` 与 `/public/init/setup` 的 `storage_error` / `suggestion`。

### 2. JWT_SECRET 自动生成说明

已核实：未配置 `JWT_SECRET` 时，`/public/init/setup` 会调用 `ensureEncryptionSecret()`，生成随机密钥并写入持久化后端（`openlist_encryption_secret`），写入后带退避重试回读校验，`getJwtSecret()` 与字段加密复用同一把密钥。因此安装向导文案明确「可留空，初始化时自动生成并持久化」；README 顶部仍以「部署时填写」作为推荐做法。

### 3. README（主文件与 12 个语言版本）

- 一键部署表格新增第 4 列「阿里云 ESA · 中国站」，徽章使用仓库内 `readmes/assets/esa-deploy.svg`。
- 顶部徽章新增 Star 与 Fork 数量。
- `## 手动部署` 的前置要求、本地开发、生产部署折叠进 `<details>`。
- 「核心能力 / 权限管理 / 平台部署」合并为一节「核心能力」，压缩为 9 条。
- 配置章节改为精简的「部署配置」表格（`JWT_SECRET` / `DB_FORMAT` / `DB_DRIVER` / `DB_CIPHER`）。
- 补充 ESA 导入仓库的注意事项。

### 4. 多语言 README 同步（`readmes/*.md`）

12 个语言版本已与主 README 保持相同结构：

- 相同的 5 个顶部徽章（含 Stars / Forks）。
- 相同的 4 列一键部署表格（含阿里云 ESA）。
- 相同的 16 个二/三级标题：折叠的手动部署、合并后的「核心能力」（9 条）、精简的「部署配置」。
- 相同的 4 行环境变量表与文档链接。

### 5. wrangler.jsonc

- 删除与当前实现不符的历史注释（持久缓存、旧加密算法、手动创建 KV 等）。
- `keep_vars`、`run_worker_first`、`assets` 等实际生效配置保持不变。
- 仅注释与排版调整，不改变运行时行为。

## Testing / 验证

```bash
# 初始化诊断与存储策略
npx tsx --test src/backend/server/storage_policy.test.ts src/backend/server/init_diagnostics.test.ts
# 16 passed / 0 failed

# 类型检查
npx tsc -p tsconfig.json --noEmit
# 无报错
```

测试已同步更新：

- `storage_policy.test.ts`：断言 JWT 提示明确「可留空、初始化自动生成」，并保留 `openssl rand -hex 32` 建议。
- `init_diagnostics.test.ts`：断言 summary 为双语短句，`init_status.storage_error` 使用新文案；详细 `reason` / `db_load_error` 仍包含原始英文排查信息。

## Compatibility / 兼容性

- 无数据库结构变更、无环境变量新增。
- `/public/env_check`、`/public/init_status`、`/public/init/setup` 的响应字段不变，仅文本值变短且双语。
- 依赖原始英文长文案做字符串匹配的外部工具需改为匹配 `code` 字段（`code` 未变）。
- 前端无需改动：安装页直接展示 `summary` / `suggestion`。

## Known boundaries / 已知边界

- 阿里云 ESA 没有 Cloudflare / EdgeOne 那样的官方仓库部署按钮 URL，按钮指向 ESA 控制台「函数和 Pages」创建入口，仓库内 `esa.jsonc` 接管构建配置。

## Checklist

- [x] 文案改动有测试覆盖
- [x] `tsc --noEmit` 通过
- [x] 无新增环境变量 / 数据库迁移
- [x] 接口字段保持兼容
- [x] README 徽章与按钮链接可用
