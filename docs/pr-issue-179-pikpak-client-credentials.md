<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`
-->

`fix(pikpak): restore built-in client credentials so PikPak can be added without client_id`

## Summary / 摘要

本 PR 修复 PikPak 存储在 TSWorker 中**只能填账号密码却永远添加失败**的问题（Issue #179）。

**根因**：`a316fb9 security: remove hardcoded credentials and mask sensitive fields` 把 PikPak 三个平台的 `client_id` / `client_secret` 默认值整段删除，构造器改为 `overrideClientId || ""`，而 PikPak 的表单里**没有** `client_id` 字段可供填写。于是每次添加 PikPak 存储，`init()` → `login()` / `refreshToken()` → `captcha/init` 与 `auth/signin` 都会以**空 client_id** 发请求，被服务端拒绝，存储初始化失败；未挂载成功时访问 `/pikpak` 就返回 404 —— 与该 issue 里的日志一致。

Go 版 OpenList（`OpenList-Backends/drivers/pikpak/util.go`）与 NextList 都内置了同一组官方客户端标识，因此「只填用户名密码」即可成功，这正是 issue 中「隔壁能加、这里不行」的差异来源。

## 用户可感知的行为变化

- PikPak 存储**只需填写用户名 + 密码**（或已有 `refresh_token`）即可添加，不再要求 `client_id` / `client_secret`。
- 存储编辑页新增两个**可选**字段 `client_id` / `client_secret`，仅用于自有 PikPak 应用场景；留空即使用内置默认值。

## 重要实现变化

- `src/backend/drivers/pikpak/util.ts`
  - 恢复 `ANDROID_CLIENT_ID/SECRET`、`WEB_CLIENT_ID/SECRET`、`PC_CLIENT_ID/SECRET` 常量，并按平台作为默认值使用。
  - 覆盖值改为 `trim()` 后判断，避免表单把空白字符串写进 addition 时反而清空凭据。
  - 常量处补充注释，说明这是**官方客户端内置、全网共用的应用标识**，而非可申请替换的用户私有凭据（与 `189_tv` / `thunder` / `pikpak_share` 中保留协议级固定密钥的注释口径一致）。
- `src/backend/server/admin.ts`
  - PikPak 表单新增 `client_id` / `client_secret`（`required: false`），并写明留空使用内置默认值。

### 与 Go 版对齐

| 平台 | client_id | 与 Go 常量 |
| --- | --- | --- |
| web | `YUMx5nI8ZU8Ap8pm` | `WebClientID` ✅ |
| android | `YNxT9w7GMdWvEOKa` | `AndroidClientID` ✅ |
| pc | `YvtoWO6GNHiuCl7x` | `PCClientID` ✅ |

client_secret 同样与 Go 的 `WebClientSecret` / `AndroidClientSecret` / `PCClientSecret` 逐字一致。

## Related Issues / 关联 Issue

Fixes #179

## Testing / 测试

```bash
npx tsx --test "src/backend/drivers/pikpak/*.test.ts"   # 8/8 通过
npm run test:drivers                                    # 200/200 通过
npm run test:server                                     # 220/220 通过
npm run lint                                            # tsc --noEmit，exit 0
```

新增 `src/backend/drivers/pikpak/util.test.ts`（3 个用例）：

- 未提供 `client_id` 时，web / android / pc 三个平台分别落到对应的内置凭据。
- 空白覆盖值（`"   "`、`""`）回退默认值；显式覆盖值优先生效。
- **回归主用例**：`init()` 在只有用户名密码的情况下完成登录 —— 校验 `captcha/init` 与 `auth/signin` 的 query 与 body 都带上了非空 `client_id` / `client_secret`，并回调持久化 token。

> **未做的验证**：未使用真实 PikPak 账号跑端到端登录（CI 环境无凭据，且登录会触发风控/验证码）。建议合并前用测试账号手动添加一次存储并浏览目录。

## Checklist / 检查清单

- [x] I have read [CONTRIBUTING](https://github.com/OpenListTeam/OpenList/blob/main/CONTRIBUTING.md).
      / 我已阅读 CONTRIBUTING。
- [x] I confirm this contribution follows the repository license, contribution policy, and code of conduct.
      / 我确认此贡献符合仓库许可证、贡献规范和行为准则。
- [x] I have formatted the changed code with `prettier` where applicable.
      / 我已按适用情况使用 prettier 格式化变更代码。
- [ ] I have requested review from relevant maintainers or code owners where applicable.
      / 我已在适用情况下请求相关维护者或代码所有者审查。

- [ ] This PR has breaking changes. / 此 PR 包含破坏性变更。
- [ ] This PR changes public API, config, storage format, or migration behavior. / 此 PR 修改了公开 API、配置、存储格式或迁移行为。
- [ ] This PR requires corresponding changes in related repositories. / 此 PR 需要关联仓库同步修改。

## AI Disclosure / AI 使用声明

- [x] This PR includes AI-assisted content. / 此 PR 包含 AI 辅助内容。

Tools used / 使用工具:

- [x] Other (please specify) / 其他（请注明）: CodeBuddy（DeepSeek-V4.1-Flash）

Usage scope / 使用范围:

- [x] Code generation / 代码生成
- [x] Tests / 测试
- [x] Documentation / 文档

- [x] I have reviewed and validated all AI-assisted content included in this PR.
- [x] I have ensured that all AI-assisted commits include `Co-Authored-By` attribution.
- [x] I can reproduce all AI-assisted content included in this PR without any AI tools.
