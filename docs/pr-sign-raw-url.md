<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`
-->

`fix(sign): 修复 /fs/get raw_url 缺少下载签名导致的 401，并对齐 Go 的路径编码与过期语义`

> 本文档即 PR 正文（`docs/pr-sign-raw-url.md`），与 `.github/PULL_REQUEST_TEMPLATE.md` 对齐。

## Summary / 摘要

<!--
Briefly describe what changed and why.
简要说明改了什么，以及为什么需要改。
-->

本 PR 修复 **[#66](https://github.com/OpenListTeam/OpenList-Worker/issues/66) `[BUG] sign verify failed`**：下载始终 401，而预览看起来正常。

**根因**：`/api/fs/get` 返回的 `raw_url` 形如 `/api/p/<path>`，指向的正是需要验签的 `/p` 端点，但**从来不携带 `?sign=`**；而前端把 `raw_url` 原样当作下载地址使用，不会再自己拼签名：

```tsx
// OpenList-Frontend/src/pages/home/previews/download.tsx
<Button as="a" href={objStore.raw_url} target="_blank">
  {t("home.preview.download")}
</Button>
```

于是只要 `sign_all` / 存储级 `enable_sign` / 密码 meta 任一命中（即 `needDownloadSign() === true`），从预览页点「下载」就必然得到 `401 sign verify failed`。issue 里贴出的请求 `GET https://xxx/api/p/存储1/7z2602-x64.exe` **完全没有 `?sign=`**，与该链路完全吻合（`sign_all` 在 Go 版里默认就是 `true`，导入 Go 备份的部署必然踩中）。

Go 版是显式补签的：

```go
// server/handles/fsread.go FsGet（MCP 的 buildFSGetRawURL 同理）
query := ""
if isEncrypt(meta, reqPath) || setting.GetBool(conf.SignAll) {
    query = "?sign=" + sign.Sign(reqPath)
}
rawURL = fmt.Sprintf("%s/p%s%s", common.GetApiUrl(c), utils.EncodePath(reqPath, true), query)
```

第二个提交把该链路周边**与 Go 不一致的既有实现**一并对齐：下载路径编码、`link_expiration` 的单位与 0 语义、`down_proxy_url` 的补签条件、`/fs/link` 的签名。

<!--
- List user-visible behavior changes.
- List important implementation changes.
- Mention config, storage, API, or compatibility changes if any.

- 列出用户可感知的行为变化。
- 列出重要实现变化。
- 如涉及配置、存储、API 或兼容性变化，请明确说明。
-->

### 用户可感知的行为变化

- **修复**：`sign_all` / `enable_sign` / 密码 meta 生效时，预览页的「下载」按钮、图片/视频/PDF 预览、S3 网关与 WebDAV 的 302 目标不再返回 `401 sign verify failed`。
- **修复**：文件名含 `%` 时 `/p`、`/d` 下载**不再 500**（此前 `decodeURIComponent` 抛 `URIError`；现在返回 `400 Bad Request: malformed path encoding`）。
- **修复**：文件名含 `#` / `?` / 空格的下载链接不再被浏览器当成 fragment / query 截断成另一个路径。
- **行为变更**：`link_expiration` 的单位由「秒」改为 **小时**（与 Go 及官方文档一致），且 `0` 表示**永不过期**（不再回退到「24 小时」）。
- **行为变更**：`down_proxy_url` 的补签不再要求目标与请求同 host，只要未开启 `disable_proxy_sign` 就会带上签名（对齐 Go `GenerateDownProxyURL`）。
- **行为变更**：`/fs/link` 的兜底分支改为「路径编码 + 无条件携带签名」（对齐 Go `handles.Link`）。

### 重要实现变化

- `server/fs.ts`：`/fs/get` 的 `raw_url` 按需补签，条件与验签侧 `needDownloadSign()` 完全对称；`/fs/link` 兜底分支补签 + 编码。
- `pkg/path.ts`（新增）：`encodeDownloadPath()`，逐段对齐 Go `utils.EncodePath(path, true)`。
- `internal/op/storage.ts`：`getItem()` 生成的 `rawUrl` 改走 `encodeDownloadPath()`（单点覆盖 `/fs/get`、S3、WebDAV、seed 的取址）。
- `pkg/sign.ts`：`link_expiration` 按小时换算；`expires === 0` 表示永不过期（签发与验签两侧都实现，对齐 Go `pkg/sign` 的 `expires != 0` 判定）。
- `server/raw.ts`：`down_proxy_url` 模板改用同一编码、补签条件对齐 Go；非法百分号转义回 400 而不是 500；修正「Go 支持 `$path` 占位符」的错误注释（Go 只是拼接 `EncodePath`）。
- `internal/driver/proxy.ts`：`getDownProxyUrl()` 多行只取第一行（对齐 Go `strings.Split(..., "\n")[0]`）。
- `server/webdav.ts` / `server/seed.ts`：`/api/p` 拼接改走同一编码函数。

### 配置 / 存储 / API 变化

- 无数据库 schema 变更、无新增配置项。
- **`link_expiration` 的取值单位语义发生变化**（秒 → 小时），且 `0` = 永不过期。详见下方兼容性说明。
- `/fs/get` 的 `raw_url` 在需要签名时会多一个 `?sign=` 查询参数（**签名本身不会二次拼**：已带 `sign` 的 URL 原样返回）。
- 新增 11 个测试用例（`server/sign_go_parity.test.ts` 7 个 + `server/fs_get_rawurl_sign.test.ts` 4 个）。

- [ ] This PR has breaking changes.
      / 此 PR 包含破坏性变更。
- [x] This PR changes public API, config, storage format, or migration behavior.
      / 此 PR 修改了公开 API、配置、存储格式或迁移行为。
- [ ] This PR requires corresponding changes in related repositories.
      / 此 PR 需要关联仓库同步修改。

> 关于兼容性：不涉及 API / 存储格式的破坏性变更，但存在两处**配置语义变更**，建议写入 release note：
>
> 1. `link_expiration` 由「秒」改为「小时」（Go 与 `OpenList-Document/pages/configuration/global.md` 的既有定义就是小时）。若管理员此前按本仓库旧文案（"Link Expiration in Seconds"）填过值，例如 `3600`，升级后会被解释为 3600 小时。
> 2. `link_expiration = 0`（默认）此前会签出 **24 小时**有效期的链接，现在表示**永不过期**（对齐 Go `NotExpired`）。需要限时的部署请显式填写小时数。
>
> 两处都是为了与 Go 版一致；分歧只存在于 TSWorker 侧，且此前无任何文档描述，视为实现偏差而非既有契约。

Related repository PRs / 关联仓库 PR:

- OpenList: N/A（本 PR 为对齐 Go 版既有行为，无需 Go 侧改动）
- OpenList-Docs: N/A（`link_expiration` 的单位在官方文档中已写明为小时）

## Related Issues / 关联 Issue

<!--
Use `Closes #123`, `Fixes #123`, or `Relates to #123`.
Remove this section if not applicable.
使用 `Closes #123`、`Fixes #123` 或 `Relates to #123`。
不适用时请删除本节。
-->

Fixes #66

> **与 #51 的区分**（两者都会报同一句 `sign verify failed`，但根因不同，可用于判断修复是否生效）：
>
> | 现象 | 根因 | 状态 |
> |---|---|---|
> | 请求 URL **没有** `?sign=` | `/fs/get` 的 `raw_url` 从未补签（**本 PR**） | 本 PR 修复 |
> | 请求 URL **有** `?sign=` 但仍 401 | 多实例间签名密钥不一致：`readPersistedSecret` 只探测 KV、无 D1/MySQL 分支，冷启动即换钥（#51） | 已由 #64 修复（`resolveSecretDriver` → `getStorageBackend()`，D1/MySQL/DO/KV/Blob 均可持久化） |
>
> 因此升级后若**仍**看到 401，请先确认地址里是否带 `?sign=`，再检查 `JWT_SECRET` / 持久化后端是否稳定。

## Testing / 测试

<!--
Describe commands, platforms, and manual checks.
If not tested, explain why.

说明执行过的命令、测试平台和手动验证。
如果未测试，请说明原因。
-->

- [ ] `go test ./...`（本项目为 TypeScript，不适用；替代命令见下）
- [x] Manual test / 手动测试:

本项目使用的等价命令：

```bash
npx tsx --test "src/backend/server/*.test.ts"                       # 116 例 / 112 通过
npx tsx --test src/backend/internal/op/storage.test.ts \
                src/backend/internal/model/store/store.test.ts \
                src/backend/internal/driver/storageopts.test.ts     # 47 例 / 47 通过
```

**结果是确定性的**：`src/backend/server/*.test.ts` 失败的 4 例是**既有问题，与本 PR 无关**——用 `git stash` 暂存本 PR 的两个提交后跑同一套命令，失败集合完全一致（`init_setup_guard` / `init_setup_blob` 的 3 个初始化用例 + `CAS codec matches casmeta base64 JSON field names`）。这些用例单独运行时全部通过，属进程内的既有耦合问题。

**反证（证明回归测试真的盯住了本 bug）**：把 `fs.ts` 的修复临时改回 `raw_url: rawUrl`，新测试立刻失败并打印出与 issue 完全同形的地址：

```
not ok 1 - fs/get: raw_url 自带签名，且该签名能通过 /p 验签（Issue #66）
  error: 'raw_url must carry the download sign, got /api/p/local/a.exe'
```

新增测试覆盖：

- `server/fs_get_rawurl_sign.test.ts`（4 例）：真实 Local 存储 + `sign_all`，走 `/api/fs/get` 断言 `raw_url` 带签名、`sign` 字段与 URL 内一致、`verifyDownloadSign` 通过、**直接请求该 `raw_url` 不再 401**；另加「篡改签名必 401」对照与「无需签名时不追加 `sign`」。
- `server/sign_go_parity.test.ts`（7 例）：
  - 编码字符集合与 Go `EncodePath(path, true)` 一致（`100%.txt → 100%25.txt`、`a?b.txt → a%3Fb.txt`、`a#b.txt → a%23b.txt`、`a b.txt → a%20b.txt`、`存储1 → %E5%AD%98%E5%82%A81`，`$&+,:;=@` 保留）；
  - 含 `%` / `#` / 中文 的文件名端到端可用（`/fs/get` → 直接请求 `raw_url` 非 401、非 500）；
  - `/p` 对非法百分号转义返回 400；
  - `link_expiration = 24` → 有效期 `86400` 秒（`*-time.Hour`）；
  - `sign_all` + `link_expiration = 0` → 签名 `expire` 字段为 `0` 且可验签（Go `NotExpired`）；
  - 负数有效期仍视为已过期（Go 传负 duration 的行为）。

> **未做的验证**：未在真实 Cloudflare Workers / EdgeOne 上做端到端回归。建议合并前手动确认一次：开启 `sign_all` → 打开任意 `.exe`（无内容预览的文件）的预览页 → 点「下载」→ 应正常下载；再用 `curl -i '<origin>/api/fs/get' -H 'Content-Type: application/json' -d '{"path":"/..."}'` 确认 `raw_url` 里带 `?sign=`。产物需重新执行 `node scripts/build-edge.mjs` 生成。

## Checklist / 检查清单

- [ ] I have read [CONTRIBUTING](https://github.com/OpenListTeam/OpenList/blob/main/CONTRIBUTING.md).
      / 我已阅读 [CONTRIBUTING](https://github.com/OpenListTeam/OpenList/blob/main/CONTRIBUTING.md)。
- [x] I confirm this contribution follows the repository license, contribution policy, and code of conduct.
      / 我确认此贡献符合仓库许可证、贡献规范和行为准则。
- [x] I have formatted the changed code with `gofmt`, `go fmt`, or `prettier` where applicable.
      / 我已按适用情况使用 `gofmt`、`go fmt` 或 `prettier` 格式化变更代码。
- [ ] I have requested review from relevant maintainers or code owners where applicable.
      / 我已在适用情况下请求相关维护者或代码所有者审查。

## AI Disclosure / AI 使用声明

<!--
Please disclose any substantial AI assistance used in this PR.
Minor AI assistance, such as typo fixes, autocomplete, formatting suggestions,
or wording polish, does not need to be disclosed.
Remove this section if not applicable.

请披露此 PR 中使用的重要 AI 辅助内容。
轻微 AI 辅助，例如拼写修正、自动补全、格式建议或文字润色，无需披露。
如不适用，请删除本节。

Deliberate non-disclosure may be treated as a trust and compliance issue.

故意隐瞒 AI 使用情况可能被视为信任与合规问题。
-->

- [x] This PR includes AI-assisted content.
      / 此 PR 包含 AI 辅助内容。

Tools used / 使用工具:

- [ ] ChatGPT
- [ ] Codex
- [ ] GitHub Copilot
- [ ] Claude
- [ ] Gemini
- [x] Other (please specify) / 其他（请注明）: CodeBuddy (DeepSeek-V4.1-Flash)

Usage scope / 使用范围:

- [x] Code generation / 代码生成
- [x] Refactoring / 重构
- [x] Documentation / 文档
- [x] Tests / 测试
- [ ] Translation / 翻译
- [x] Review assistance / 审查辅助

- [x] I have reviewed and validated all AI-assisted content included in this PR.
      / 我已审核并验证此 PR 中的所有 AI 辅助内容。
- [ ] I have ensured that all AI-assisted commits include `Co-Authored-By` attribution.
      / 我已确保所有 AI 辅助提交都包含 `Co-Authored-By` 归属信息。
- [x] I can reproduce all AI-assisted content included in this PR without any AI tools.
      / 我可以在没有任何 AI 工具的情况下重现此 PR 中包含的所有 AI 辅助内容。

> **待处理**：本分支当前的两个提交**尚未**带 `Co-Authored-By: CodeBuddy <noreply@codebuddy.ai>` trailer。若维护者要求与仓库既有做法一致，需要 rebase 补 trailer 后 `--force-with-lease` 更新分支（文件树不变，提交哈希会变）。

## Implementation Notes / 实现说明

### 为什么会「预览正常、下载 401」

| 前端动作 | 使用的 URL | 是否自行拼 `sign` | 结果 |
|---|---|---|---|
| 文件列表里下载 / 复制链接 | `useLink()` 组装的 `/d`、`/p` 链接 | 会（用 `/fs/list` 返回的 `sign`） | 正常 |
| 预览页「下载」按钮 | `<a href={objStore.raw_url}>` | **不会** | 需要签名时 401 |
| 图片 / 视频 / PDF 预览 | `<img>/<video>/pdf.js` 的 `src={objStore.raw_url}` | **不会** | 需要签名时同样 401（破图 / 黑屏） |

issue 报告者用的是 `.exe`——这类文件没有内容预览，预览页只渲染元信息 + 下载按钮，所以「预览正常」而「下载 401」。**问题比报告的更普遍**：任何有内容预览的文件在同样配置下连预览都会坏。这也解释了为什么仓库用例 `signed_link_auth.test.ts` 一直没覆盖到——它只测了 `/p/*` 端点本身，没测「服务端返回给前端的 URL」是否合法。

### 与 Go 的对齐清单

已对齐（本 PR 修复）：

| 环节 | Go | TS（本 PR 后） |
|---|---|---|
| 是否需要给 `raw_url` 补签 | `isEncrypt(meta, path) \|\| SignAll` | `signPolicy.enabled \|\| isEncryptPath()`（同一判定，`needDownloadSign()` 与验签侧共用） |
| 补签位置 | `{apiUrl}/p{EncodePath(path, true)}{query}` | `/api/p{encodeDownloadPath(path)}{query}` |
| 路径编码 | `utils.EncodePath(path, true)` | `pkg/path.encodeDownloadPath()`（字符集合一致） |
| `link_expiration` 单位 / 0 | 小时；0 = `NotExpired` | 小时；`expire === 0` 且验签跳过超期判定 |
| `down_proxy_url` 补签 | 只看 `disable_proxy_sign` | 只看 `disable_proxy_sign`（不再要求同 host） |
| `getDownProxyUrl` 多行 | `strings.Split(..., "\n")[0]` | 取第一行 |
| `/fs/link` | `EncodePath` + 无条件 `sign` | 同（`?d` 无对应语义，未追加） |

有意保留的差异（不改，理由如下）：

| 差异 | Go | TS | 不对齐的理由 |
|---|---|---|---|
| `sign_all` 默认值 | `true`（`internal/bootstrap/data/setting.go`） | `false`（`internal/model/db.ts`） | 属产品级默认值：改为 `true` 会让所有新装部署立即全站要求签名，而 `s3.ts` / `webdav.ts` / `seed.ts` 三处 raw_url 出口目前**只编码、未补签**，必须同批处理。建议单独 PR 决策。 |
| `raw_url` 前缀 | `GetApiUrl(ctx)` = `site_url`，返回**绝对**地址 | 请求相对的 `/api/p/...` | TS 侧无对等配置（`seed_site_url` 语义是 transfer seed 源），且前端被强制同源部署（`scripts/fetch-frontend.mjs` 固定 `VITE_API_URL=/`），相对地址等价且不需要额外配置。 |
| 非代理存储 | 返回驱动真直链（`model.GetUrl` / `fs.Link`） | 统一走 `/api/p` | TS 有意为之：worker/edge 上大量驱动的直链必须带私有鉴权头（`isAuthBoundDownload` / `raw_url_headers` 即为它存在），且要处理 CORS 与平台 302/载荷限制。改成 Go 的行为会把这些问题重新引入。 |
| 签名串格式 / 密钥来源 | `base64url(hmac) + ":" + expire`，密钥 `conf.Token` | `expire.hex(hmac)`，密钥 `JWT_SECRET` | 两者本就不互通，换密钥无法获得互认收益；TS 侧 `JWT_SECRET` 已走 KV/D1 持久化。 |

### 未一并修复的同类出口（建议后续）

`getItem()` 的 `rawUrl` 还被 S3 网关与 WebDAV 用作 302 目标、被 `seed.ts` 用于服务端自取文件。本 PR 已统一它们的**路径编码**，但**没有补签**（S3/WebDAV 的客户端会跟随 302 到 `/api/p`，`sign_all` 开启时仍会 401）。根治办法是把补签下沉到 `getItem()`（需要把 `env` 传进 `StorageRequestContext`），会改动共享路径，故留给后续 PR。

## Commits / 提交

- `acc8446` — `fix(sign): /fs/get raw_url 缺少下载签名导致下载 401 (#66)`
  （根因修复 + `raw.ts` `buildDownProxyUrl` 判定对齐 + `server/fs_get_rawurl_sign.test.ts`）
- `058290c` — `fix(sign): 对齐 Go 的下载路径编码与 link_expiration 语义`
  （`pkg/path.ts`、`getItem`/WebDAV/seed 编码、`link_expiration` 小时与永久语义、`down_proxy_url` 补签条件与多行解析、`/fs/link` 补签、`server/sign_go_parity.test.ts`）
