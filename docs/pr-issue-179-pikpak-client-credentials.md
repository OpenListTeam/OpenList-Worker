<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`
-->

`fix(pikpak): restore built-in client credentials and fix 4126 login failure`

## Summary / 摘要

本 PR 修复 PikPak 存储在 TSWorker 中**只能填账号密码却永远添加失败**的问题（Issue #179），以及恢复内置凭据后仍然出现的 `PikPak login failed (4126): AccessProhibited`。

**根因一（Issue #179）**：`a316fb9 security: remove hardcoded credentials and mask sensitive fields` 把 PikPak 三个平台的 `client_id` / `client_secret` 默认值整段删除，构造器改为 `overrideClientId || ""`，而 PikPak 的表单里**没有** `client_id` 字段可供填写。于是每次添加 PikPak 存储，`init()` → `login()` / `refreshToken()` → `captcha/init` 与 `auth/signin` 都会以**空 client_id** 发请求，被服务端拒绝，存储初始化失败；未挂载成功时访问 `/pikpak` 就返回 404 —— 与该 issue 里的日志一致。

**根因二（4126）**：登录流程与 Go 版 / Web 端不一致，导致验证码 token 被判为无效：

1. `login()` 只在 `captchaTokenVal` 为空时才申请验证码。而 `captcha_token` 会在上次登录后持久化进 addition，第二次起就复用**已过期**的 token 去 signin。
2. 登录前的 `captcha/init` 缺少 `client_version` / `package_name` / `timestamp` / `captcha_sign`，服务端只下发「未签名」的 token。
3. `auth/signin` 带了原生 SDK 才有的 `X-Device-ID` / `X-Captcha-Token` 头；web 凭据 + 原生头的组合会被判为 `AccessProhibited`。
4. `auth/token`（refresh_token 换发）带了浏览器 UA 与 `X-Device-ID`。

Go 版 OpenList（`OpenList-Backends/drivers/pikpak/util.go`，上游 `e73a80c7`）与 NextList 都内置了同一组官方客户端标识，且登录流程满足上面四点，因此「只填用户名密码」即可成功，这正是 issue 中「隔壁能加、这里不行」的差异来源。


## 用户可感知的行为变化

- PikPak 存储**只需填写用户名 + 密码**（或已有 `refresh_token`）即可添加，不再要求 `client_id` / `client_secret`。
- 存储编辑页新增两个**可选**字段 `client_id` / `client_secret`，仅用于自有 PikPak 应用场景；留空即使用内置默认值。
- 登录不再受「上次持久化的验证码 token 已过期」影响；`4126` 时会用新验证码 token 再试一次，仍失败才报错并给出排查提示。

## 重要实现变化

- `src/backend/drivers/pikpak/util.ts`
  - 恢复 `ANDROID_CLIENT_ID/SECRET`、`WEB_CLIENT_ID/SECRET`、`PC_CLIENT_ID/SECRET` 常量，并按平台作为默认值使用。
  - 覆盖值改为 `trim()` 后判断，避免表单把空白字符串写进 addition 时反而清空凭据。
  - 常量处补充注释，说明这是**官方客户端内置、全网共用的应用标识**，而非可申请替换的用户私有凭据（与 `189_tv` / `thunder` / `pikpak_share` 中保留协议级固定密钥的注释口径一致）。
  - `login()` 改为**每次**都重新申请 captcha token，并在开始前清空旧 access token（对齐 Go 版 `e73a80c7`）。
  - `refreshCaptchaTokenInLogin()` 补齐 `client_version` / `package_name` / `timestamp` / `captcha_sign` metas。
  - `auth/signin` 只保留 `Content-Type` 与 `User-Agent`，去掉 `X-Device-ID` / `X-Captcha-Token`。
  - `auth/token` 改为空 `User-Agent` 且不带 `X-Device-ID`。
  - `captcha/init` 补上 `X-Captcha-Token` 请求头；`4126` 时用新验证码 token 重试一次（最多两轮，避免触发风控）。
  - `refreshToken()` 的 `4126` 分支与 Go 版一致：有账号密码才自动重登，否则提示「请重新提供 refresh_token」。
  - 新增 `skip_verification`（对齐 Go 版同名选项）：默认把 captcha 接口返回的验证链接视为失败，显式开启后忽略。
  - 服务端返回空 token 时直接报错，避免把空 token 持久化。
- `src/backend/server/admin.ts`
  - PikPak 表单新增 `client_id` / `client_secret`（`required: false`），并写明留空使用内置默认值。
  - PikPak 表单新增 `skip_verification`（`type: bool`，默认 `false`）。


### 与 Go 版对齐

| 平台 | client_id | 与 Go 常量 |
| --- | --- | --- |
| web | `YUMx5nI8ZU8Ap8pm` | `WebClientID` ✅ |
| android | `YNxT9w7GMdWvEOKa` | `AndroidClientID` ✅ |
| pc | `YvtoWO6GNHiuCl7x` | `PCClientID` ✅ |

client_secret 同样与 Go 的 `WebClientSecret` / `AndroidClientSecret` / `PCClientSecret` 逐字一致。

登录/换号链路逐点对照（Go 侧为 `OpenList-Backends/drivers/pikpak/util.go`，上游提交 `e73a80c7`）：

| 行为 | Go 版 | 本 PR |
| --- | --- | --- |
| 登录前刷新验证码 | `login()` 无条件调用 `RefreshCaptchaTokenInLogin`（注释：token 可能已过期） | ✅ 每次都刷新，不再复用持久化的旧 token |
| 清掉旧 Bearer | `d.AccessToken = ""`，注释：避免验证码请求带失效 bearer | ✅ `this.accessToken = ""` |
| 登录 metas | `email/phone_number/username` + `client_version` + `package_name` + `timestamp` + `captcha_sign` | ✅ 同 |
| signin 请求头 | resty 默认 UA + JSON body，无 `X-Device-ID` / `X-Captcha-Token` | ✅ 仅 `Content-Type` + `User-Agent` |
| 换发 refresh_token | `SetHeader("user-agent", "")`，无 device 头 | ✅ 空 UA、无 `X-Device-ID` |
| 空 token 校验 | `login`/`refreshToken` 返回空 token 即报错 | ✅ 同 |
| `4126` 处理 | 有账号密码 → `login()`；否则提示重新提供 refresh_token | ✅ 同（并额外用新验证码 token 重试一次） |
| 验证链接 | `resp.Url != "" && !SkipVerification` 才报错 | ✅ `skip_verification` |
| `init()` 后的 captcha 刷新 | 失败直接中止 `Init()` | 仍为「记录告警后继续」，留给后续错误码 9 的刷新重试兜底 |

> 唯一保留的差异：Go 在 `Init()` 里把登录后的验证码刷新失败当作致命错误；TS 侧保持宽容（仅告警），避免一次临时失败就让整块存储挂载失败，真正的过期会由请求错误码 9 触发刷新重试。


## Related Issues / 关联 Issue

Fixes #179

## Testing / 测试

```bash
npx tsx --test "src/backend/drivers/pikpak/*.test.ts"   # 15/15 通过
npm run test:drivers                                    # 207/207 通过
npm run test:server                                     # 220/220 通过
npm run lint                                            # tsc --noEmit，exit 0
```

新增 `src/backend/drivers/pikpak/util.test.ts`（10 个用例）：

- 未提供 `client_id` 时，web / android / pc 三个平台分别落到对应的内置凭据。
- 空白覆盖值（`"   "`、`""`）回退默认值；显式覆盖值优先生效。
- **回归主用例**：`init()` 在只有用户名密码的情况下完成登录 —— 校验 `captcha/init` 与 `auth/signin` 的 query 与 body 都带上了非空 `client_id` / `client_secret`，并回调持久化 token。
- 新增：addition 里已有旧 `captcha_token` 时，登录仍会重新申请并只用新 token 去 signin。
- 新增：登录前的 `captcha/init` meta 带 `client_version` / `package_name` / `timestamp` / `captcha_sign`。
- 新增：`auth/signin` 不带 `X-Device-ID` / `X-Captcha-Token`，只带 web UA。
- 新增：首次 signin 返回 `4126` 时，会用第二个验证码 token 重试并成功。
- 新增：`auth/token` 的 UA 为空且不带 `X-Device-ID`。
- 新增：`captcha/init` 返回验证链接时默认报错，`skip_verification: true` 时放行。
- 新增：`auth/token` 返回 `4126` 时有账号密码自动重登（signin 一次），没有则提示重新提供 refresh_token（不发起 signin）。

> **未做的验证**：未使用真实 PikPak 账号跑端到端登录（CI 环境无凭据，且登录会触发风控/验证码）。建议合并前用测试账号手动添加一次存储并浏览目录。
> 若真实账号仍返回 `4126`，说明是出口 IP 被 PikPak 风控（Cloudflare Workers 数据中心 IP 常见），与本次代码无关，可改用 `refresh_token` 或更换出口网络复测。


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
