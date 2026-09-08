# 189Cloud 稳定性重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 让 Cloudflare Workers 上的 189Cloud 驱动使用可复用会话、受控请求重试和真正按需的目录分页，减少首页转圈和 522。

**Architecture:** 在 189 客户端内部建立认证 Promise 锁和统一 API 请求层；在 StorageDriver 列表调用中增加可选分页参数，189 驱动优先使用按页请求，旧驱动继续使用兼容默认值。所有重试只作用于幂等 GET，认证失败与网络故障严格分离。

**Tech Stack:** TypeScript, Cloudflare Workers Fetch API, Node test runner, tsx。

**Spec:** `docs/superpowers/specs/2026-09-08-189cloud-stability-design.md`

## Global Constraints

- 不新增运行时依赖或外部 KV 配置。
- POST 写请求不得因网络错误自动重放。
- 单次 Worker 调用的 189 子请求预算保持低于 50。
- 其他网盘驱动的旧 `list` 调用必须保持兼容。

---

### Task 1: 扩展可选列表分页接口

**Files:**
- Modify: `src/backend/internal/driver/base.ts`
- Modify: `src/backend/internal/op/storage.ts`
- Modify: `src/backend/server/fs.ts`
- Test: `src/backend/internal/op/storage.test.ts`

- [ ] 为 `StorageDriver.list` 增加可选 `page`、`perPage` 参数。
- [ ] 让 `/api/fs/list` 将前端分页参数传递到 `listItems`。
- [ ] 对未实现分页的驱动保持旧的完整列表行为。
- [ ] 添加兼容性测试。

### Task 2: 重构 189 认证与请求生命周期

**Files:**
- Modify: `src/backend/drivers/189/util.ts`
- Test: `src/backend/drivers/189/util.test.ts`

- [ ] 添加会话校验方法与初始化 Promise 锁。
- [ ] 将 OAuth 请求接入统一超时控制。
- [ ] 仅在明确会话失效时重新登录。
- [ ] 对 GET 网络/网关错误做一次有限重试，POST 不重试。
- [ ] 添加失败测试并验证通过。

### Task 3: 实现 189 按需分页

**Files:**
- Modify: `src/backend/drivers/189/driver.ts`
- Modify: `src/backend/drivers/189/util.ts`
- Test: `src/backend/drivers/189/util.test.ts`

- [ ] 让 189 `list` 接收可选分页参数。
- [ ] 有分页参数时只请求目标页。
- [ ] 无分页参数时使用不超过 3 个并发分页请求并遵守预算。
- [ ] 保留路径查找的提前终止逻辑。
- [ ] 添加分页请求数量和排序回归测试。

### Task 4: 全量验证与提交

- [ ] 运行 189 驱动测试。
- [ ] 运行格式检查、`git diff --check` 和 TypeScript 检查。
- [ ] 检查变更范围和工作区状态。
- [ ] 使用中文提交信息提交并推送 `189` 分支。
