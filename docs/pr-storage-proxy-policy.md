<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`
-->

`feat(storage): implement storage-level proxy policy and align drivers with Go behavior`

## Summary / 摘要

<!--
Briefly describe what changed and why.
简要说明改了什么，以及为什么需要改。
-->

本 PR 修复了存储级下载/代理配置在 TSWorker 后端**全部失效**的问题，并把四个此前只有数据库列与表单项、没有读取方的字段真正接入运行时，行为与 Go 版 OpenList 对齐。

**问题背景**：`web_proxy`、`webdav_policy`、`down_proxy_url`、`disable_proxy_sign`、`proxy_range`、`enable_sign`、`disable_index`、`custom_cache_policies` 这些字段在 TSWorker 中都能在后台填写、也能存入数据库，但后端**没有任何代码读取它们**。同时 `server/raw.ts` 用一段硬编码的驱动名单强制若干驱动走代理：

```ts
const needsProxy =
  isProxy ||
  normDriver === "webdav" ||
  normDriver === "sharepoint" ||
  normDriver === "onedrive" ||
  normDriver === "onedriveapp" ||
  normDriver === "weiyun" ||
  normDriver === "tencentweiyun"
```

因此 **OneDrive 无论后台怎么配置都无法使用 302 直链**，管理员在存储编辑页看到的所有代理选项实际上都是装饰。

<!--
- List user-visible behavior changes.
- List important implementation changes.
- Mention config, storage, API, or compatibility changes if any.

- 列出用户可感知的行为变化。
- 列出重要实现变化。
- 如涉及配置、存储、API 或兼容性变化，请明确说明。
-->

### 用户可感知的行为变化

- **OneDrive / OneDriveAPP 默认改为 302 直链下载**（对齐 Go 默认值 `302_redirect`）。此前被硬编码强制代理。如需保留代理行为，请将该存储的 `webdav_policy` 设为 `native_proxy`。
- `web_proxy`、`webdav_policy`、`down_proxy_url`、`disable_proxy_sign` 在后台的配置**从此真实生效**。
- 存储编辑表单新增四个字段：`proxy_range`、`enable_sign`、`disable_index`、`custom_cache_policies`。
- 存储表单按驱动能力差异化显示：Go 的 `MustProxy`（`OnlyProxy`/`NoLinkURL`）驱动不再出现 302 选项；`PreferProxy` 驱动的 `web_proxy` 默认勾选；`proxy_range` 仅对 Go 中声明 `ProxyRangeOption` 的驱动显示。
- `/fs/list` 对开启 `disable_index` 的存储返回 `403 {"message":"Index is disabled for this storage"}`。
- `/fs/list` 响应新增 `cache_expiration` 字段（路径级缓存策略计算后的分钟数）。
- **代理下载超过平台载荷上限时不再返回平台错误页**：EdgeOne 云函数对单次请求/响应 body 的上限为 6 MiB，原生代理超限时改为「降级 302 直链」或返回可读的 413（详见下方「平台载荷上限保护」）。

### 重要实现变化

- 新增 `internal/driver/proxy.ts`：统一的下载模式决策与驱动代理能力注册表，对齐 Go 的 `Config.MustProxy()` / `Config.DefaultProxy()` / `ShouldProxy()`。
- 新增 `internal/driver/storageopts.ts`：解析 `proxy_range` / `enable_sign` / `disable_index` / `cache_expiration` / `custom_cache_policies` 并提供 glob 匹配与缓存时长合成。
- `server/raw.ts`：用 `resolveProxyDecision()` 替换硬编码驱动名单；抽出 `proxyUpstream()`；实现 `use_proxy_url`（含 `$path` 替换与运行时补签）。
- `server/admin.ts`：新增 `buildProxyFields()` 复刻 Go `internal/op/driver.go` 的表单分支规则。
- `pkg/sign.ts`：`isEncryptPath` 增加存储级签名分支，判定顺序为「存储 `enable_sign` → meta 密码」。
- **修复 `getDownProxyUrl()`**：此前只读 `storage.addition`，而表单把 `down_proxy_url` 写在存储行**顶层**，导致 `use_proxy_url` 永远取不到值。

### 配置 / 存储 / API 变化

- 无数据库 schema 变更：所用列均已存在，本 PR 仅补上读取方。
- `/fs/list` 响应为**向后兼容的增量变更**（新增 `cache_expiration`，且开启 `disable_index` 时会新增 403 分支）。
- 新增 19 个单元测试。

- [ ] This PR has breaking changes.
      / 此 PR 包含破坏性变更。
- [x] This PR changes public API, config, storage format, or migration behavior.
      / 此 PR 修改了公开 API、配置、存储格式或迁移行为。
- [ ] This PR requires corresponding changes in related repositories.
      / 此 PR 需要关联仓库同步修改。

> 关于兼容性：本 PR **不含破坏性变更**，但存在**行为变更**——OneDrive 系列的默认下载模式由「强制代理」变为「302 直链」。这与 Go 版一致，但会改变既有 OneDrive 存储的实际表现：存量存储没有 `webdav_policy` 值，将解析为 `302_redirect`。若某些挂载依赖代理（例如直链在受限租户下不可用），请显式设置 `webdav_policy = native_proxy`。该行为变更已在下方「Testing」中说明，建议在 release note 中提示用户。

Related repository PRs / 关联仓库 PR:

- OpenList: N/A（本 PR 为对齐 Go 版既有行为，无需 Go 侧改动）
- OpenList-Docs:

## Related Issues / 关联 Issue

<!--
Use `Closes #123`, `Fixes #123`, or `Relates to #123`.
Remove this section if not applicable.
使用 `Closes #123`、`Fixes #123` 或 `Relates to #123`。
不适用时请删除本节。
-->

Relates to #51

> 说明：本 PR **不修复** #51 的根因。`enable_sign` 会走 `getJwtSecret`，而 `readPersistedSecret` 只探测 KV、没有 D1 分支，因此在 D1 多实例部署下仍会遇到签名密钥不稳定。`enable_sign=false` 可作为临时绕过手段，但密钥持久化需要单独修复。

## Testing / 测试

<!--
Describe commands, platforms, and manual checks.
If not tested, explain why.

说明执行过的命令、测试平台和手动验证。
如果未测试，请说明原因。
-->

- [ ] `go test ./...`（本项目为 TypeScript，不适用；替代命令见下）
- [ ] Manual test / 手动测试:

本项目使用的等价命令：

```bash
npx tsc --noEmit -p tsconfig.json        # 类型检查：exit 0，无错误
node --import tsx --test "src/backend/**/*.test.ts"
```

测试结果（已合并 `origin/main`，即 main 上的 `9b9c243`）：**276 个测试，271 通过**。

其中 5 个失败为**既有问题，与本 PR 无关**——在**纯净的 `origin/main` 上跑同一套命令得到完全相同的 5 个失败**（基线为 200 个测试 / 195 通过 / 5 失败）：

- `server/default_credentials.test.ts` — 默认凭据 / ADMIN_PASS 初始化与重置
  （`Initialization: a fresh deployment stays uninitialized without ADMIN_PASS`、
  `Initialization: an empty admin password stays empty (uninitialized), not a random one`、
  `Security(F-11): ADMIN_PASS still forces an explicit reset (to salted double-SHA256)`）
- `server/seed.test.ts` — `CAS codec matches casmeta base64 JSON field names`

新增 `server/proxy_request.test.ts` 的平台载荷上限用例（21 个，该文件累计 36 个），覆盖：

- 上限解析：EdgeOne 运行时默认 6 MiB（含 SCF / Blob 判据）、`RAW_PROXY_MAX_BYTES` 覆盖与置 0 关闭、非法值回退默认
- 运行时判定：`__requestOrigin` 不构成 EdgeOne 判据（该值在所有平台都会注入，不能用来判平台）
- 超限判定：等于上限不算超限、Range 分片按分片大小、大小未知不拦截
- 决策：未超限照常代理、超限且可直连时降级 302、超限且必须带私有鉴权头时返回可读 413
- 串联 `resolveProxyDecision()`：`web_proxy=true` 的 OneDrive 大文件降级 302；带 `Authorization` 的 WebDAV 大文件返回可读 413
- **Range + 签名 + 上限的交互**（响应评审意见）：`upstreamBodySize()` 解析 Content-Length / Content-Range；412 兜底重试后上游回整份文件时按实际大小降级 302（签名 URL 无需重算）；正常 206 分片不被误伤；必须带鉴权头时返回可读 413
- **私有头判定**：`X-Emby-Token` / `X-Amz-Security-Token` / `X-Session-Id` 视为私有头；`User-Agent` / `Referer` / `Origin` / `Content-Type` 不算（与仓库内 33 处 `raw_url_headers` 的实际用法一致）

新增 `internal/driver/storageopts.test.ts`（19 个用例），覆盖：

- `proxy_range`：未配置时默认透传（对齐 Go 的透明代理）、显式 true/false 优先
- `enable_sign` / `disable_index`：字符串与布尔两种存储形式
- `custom_cache_policies`：JSON 数组、对象映射、`max_age` 别名、非法输入不抛错
- glob 匹配：`*` 不跨目录分隔符、`**` 可跨、`?` 通配
- 缓存时长合成：命中覆盖、未命中用基础值、值为 0 表示不缓存、多规则最后一条优先、非法/负数回退默认
- 代理决策协同：默认驱动走 302、开启代理后 `proxy_range` 决定是否透传 Range、`down_proxy_url` 多写法解析

> **未做的验证**：未在真实 Cloudflare Workers / EdgeOne 环境跑端到端下载。`use_proxy_url` 的运行时补签路径、以及 Range 透传在中转场景下的实际表现建议在合并前手动回归。产物需重新执行 `node scripts/build-edge.mjs` 生成。

## Checklist / 检查清单

- [ ] I have read [CONTRIBUTING](https://github.com/OpenListTeam/OpenList/blob/main/CONTRIBUTING.md).
      / 我已阅读 [CONTRIBUTING](https://github.com/OpenListTeam/OpenList/blob/main/CONTRIBUTING.md)。
- [ ] I confirm this contribution follows the repository license, contribution policy, and code of conduct.
      / 我确认此贡献符合仓库许可证、贡献规范和行为准则。
- [ ] I have formatted the changed code with `gofmt`, `go fmt`, or `prettier` where applicable.
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
- [x] Gemini
- [x] Other (please specify) / 其他（请注明）: CodeBuddy (DeepSeek-V4.1-Flash)

Usage scope / 使用范围:

- [x] Code generation / 代码生成
- [x] Refactoring / 重构
- [ ] Documentation / 文档
- [x] Tests / 测试
- [ ] Translation / 翻译
- [x] Review assistance / 审查辅助

- [x] I have reviewed and validated all AI-assisted content included in this PR.
      / 我已审核并验证此 PR 中的所有 AI 辅助内容。
- [x] I have ensured that all AI-assisted commits include `Co-Authored-By` attribution.
      / 我已确保所有 AI 辅助提交都包含 `Co-Authored-By` 归属信息。
- [x] I can reproduce all AI-assisted content included in this PR without any AI tools.
      / 我可以在没有任何 AI 工具的情况下重现此 PR 中包含的所有 AI 辅助内容。

> **已处理（响应评审 P0）**：本分支的全部提交都已在提交信息中带上 `Co-Authored-By: CodeBuddy <noreply@codebuddy.ai>`。此前缺少该 trailer 的三个提交通过 `git cherry-pick` + `git commit --amend --trailer` 重放补上（文件树与重写前完全一致，`git diff` 为空），因此分支历史被重写并 `--force-with-lease` 更新，提交哈希已变化（见下方「Commits / 提交」）。

## Implementation Notes / 实现说明

### 决策顺序（对齐 Go）

`resolveProxyDecision()` 的判定顺序与 Go 的优先级一致：

| 顺序 | 条件 | 结果 | 来源标记 |
|---|---|---|---|
| 1 | 驱动强制代理（`MustProxy`） | `native_proxy` | `force` |
| 2 | 存储 `web_proxy = true` | `native_proxy` | `web_proxy` |
| 3 | 请求命中 `/p`、`/sd` 等代理前缀 | `native_proxy` | `proxy_path` |
| 4 | 存储 `webdav_policy` 已配置 | 按配置值 | `storage_policy` |
| 5 | 驱动默认（`PreferProxy`，如 WebDav） | `native_proxy` | `driver_default` |
| 6 | 兜底 | `302_redirect` | `driver_default` |

第 3 项保留了原有的 `isProxy` 路径判断作为显式入参，确保 `/p` 端点行为不发生回归。

### 驱动表单分支（对齐 Go `internal/op/driver.go`）

- **15 个 `MustProxy`（`OnlyProxy`/`NoLinkURL`）驱动**（WeiYun、SFTP、FTP、SMB、Crypt、Virtual、Strm、Mega_nz、ProtonDrive、Chunk、GoogleDrive、GooglePhoto、QuarkOpen、QuarkUC、ChaoXing）：策略选项为 `use_proxy_url,native_proxy`，默认 `native_proxy`，**不提供 302**。清单由 `internal/driver/proxy.ts` 单点提供，`admin.ts` 不再另抄一份（此前 123Pan / BaiduNetdisk / 115Open / 189Cloud / Terabox / 123PanShare 被误标为 `only_proxy`，而 Go 里它们只有 `PreferProxy` 或没有任何标记）
- **WebDav**：`web_proxy` 默认 `true`，策略默认 `native_proxy`（对应 Go `PreferProxy: true`）
- **Onedrive / OnedriveAPP**：默认 `302_redirect`
- **`proxy_range`**：仅对 Go 中声明 `ProxyRangeOption: true` 的 4 个驱动开放（139Yun、Alias、AListV3、OpenList）。语义为「是否透传客户端 Range」，**默认 `true`**：Go 的透明代理本就转发客户端请求头（`internal/net/serve.go` 的 `ProcessHeader`），默认关闭会让代理模式下的 seek / 断点续传静默退化；上游拒绝或忽略 Range 时由 `shouldRetryWithoutRange()` 兜底

### `use_proxy_url` 的签名处理

`down_proxy_url` 模板由管理员配置、不携带实例密钥，因此无法在模板中预置签名。本 PR 在运行时判定：当目标地址指向本站（相对路径或同 host）且未设置 `disable_proxy_sign` 时，自动补上 `sign` 查询参数，避免代理端点因缺少签名被拒。构造出的 URL 仍会经过 `assertSafeUrl` 做 SSRF 校验。

### 平台载荷上限保护（EdgeOne 云函数 6 MiB）

`native_proxy` 会把整份文件当作云函数响应体回传，而 EdgeOne Makers 的 Cloud Functions 对「函数的请求/响应 body」有 **6 MiB** 硬上限，超限时平台在**网关层**直接返回 `413 CLOUD_FUNCTION_PAYLOAD_TOO_LARGE`（Powered by Tencent EdgeOne Makers 的错误页）。请求根本到不了本服务，应用侧的 CORS 头、Range 处理、错误提示一律不会执行。

这也是 issue 中「EdgeOne + OneDrive 下载报 413」的直接原因：OneDrive 此前被硬编码强制代理；上一提交只把**默认值**改成 302，任何**仍走代理**的路径（`web_proxy`、`/p`、`webdav_policy=native_proxy`、`PreferProxy`/`MustProxy` 驱动）都依旧会把整份文件塞进云函数响应体。

`server/proxy_request.ts` 新增上限决策 `decideProxyPayloadAction()`，在 `proxyUpstream()` 与两处服务端字节流分支（`driver.createReadStream`、本地文件回退）之前执行：

| 情形 | 结果 |
|---|---|
| 未超限 / 平台不限制（非 EdgeOne 且未设置 `RAW_PROXY_MAX_BYTES`） | 正常原生代理 |
| 超限 + `raw_url` 可被浏览器直连（预授权直链） | 降级 302 直链，下载仍然可用 |
| 超限 + 无法降级（`driverMustProxy`，或直链需要 `Authorization`/`Cookie`） | 返回可读的 413，而不是平台错误页 |

Range 只回传一个分片时按**分片大小**判断，视频拖动进度与断点续传不受影响；`proxy_range` 关闭时上游返回完整文件，因此按完整大小判断。

**二次校验（响应评审意见）**：前置判断用的是「客户端请求的分片大小」，但 `shouldRetryWithoutRange()` 会删掉 Range 重试、上游也可能忽略 Range 直接回 200——这两种情况下游回传的是**整份文件**，仅靠前置判断会漏放。因此 `proxyUpstream()` 在上游响应到达后再用 `upstreamBodySize()`（Content-Length，缺省回退 Content-Range 分段长度）复核一次实际大小，超限则取消上游 body 并降级 302 / 返回可读 413；206 分片与签名 URL 均不受影响（签名绑定 URL，重试无需重算）。

新增环境变量：

| 变量 | 默认 | 说明 |
|---|---|---|
| `RAW_PROXY_MAX_BYTES` | EdgeOne 运行时 6 MiB；其他平台不限制 | 平台单次请求/响应上限（字节），设为 `0` 关闭限制（自托管恢复「永远代理」） |

**运行时判定（`isEdgeOneRuntime()`）**：EdgeOne Node 云函数跑在腾讯 SCF 上，平台会注入 `TENCENTCLOUD_SCF_FUNCTIONNAME`（与本仓库 `internal/model/store/backend.ts` 的 `isServerlessRuntime()` 判据一致），因此以该变量 + `EDGEONE_BLOB` / 全局 `EdgeOne` 作为 EdgeOne 特征。**刻意不用 `__requestOrigin`**：它由本仓库 `src/backend/index.ts` 中间件在所有平台上注入，拿它判 EdgeOne 会把 Cloudflare / 自托管一起误判，反而让本可正常代理的大文件被降级成 302。Cloudflare Workers / 阿里云 ESA 不套用 6 MiB；若这些平台也有同类上限，用 `RAW_PROXY_MAX_BYTES` 显式声明即可。

### 已知限制

`custom_cache_policies` 目前**只在 `/fs/list` 响应中回传计算结果**，并未真正改变对象缓存的读写行为——TSWorker 的缓存层尚无「按路径取过期时长」的入口。要做到 Go 那样真正影响缓存，需要接入缓存层，属后续独立工作。

## Commits / 提交

- `8c0a88d` — `feat(proxy): align OneDrive and other drivers with Go 302/proxy policy`
- `7a9bcfc` — `feat(storage): implement proxy_range, enable_sign, disable_index and cache policies`
- `954ebff` — `fix(proxy): remove glob catastrophic backtracking and cover Range+sign interactions`
- `e5cbb9d` — `fix(proxy): fall back to 302 when the platform payload limit blocks native proxy`
- `cc896eb` — `docs(pr): document the platform payload-limit guard for the storage proxy policy PR`
- `cb4051f` — `fix(proxy): bound the upstream body size after a Range retry`
- `47d70d3` — `fix(proxy): detect EdgeOne runtimes by the SCF and Blob markers`
- `23a957e` — `refactor(proxy)!: align driver proxy capabilities with Go meta.go`
- `2e913e6` — `docs(pr): record the Go alignment pass`
- `8454f76` — `feat(proxy): honour proxy_types, text_types and proxy_ignore_headers`
- `38ed5de` — `docs(pr): document extension proxying and the /p gate`
- `6d38353` — `Merge remote-tracking branch 'origin/main' into feat/storage-proxy-policy`
  （解决 `internal/model/db.ts` 的 `unsealDb` 并行解密与 `server/raw.ts` 的下载路径
  mount name 剥离两处冲突，均取 main 的实现 + 保留本 PR 的 `/p` 端点判定）
- `c2fad5a` — `chore(edgeone): refresh cloud-functions artifact`
  （分支上的 `cloud-functions/[[default]].js` 早于本 PR 的改动，曾不含 payload 上限保护
  与 `/p` 准入等代码；此处按仓库既有约定重建）
- （本条 docs 提交）— `docs(pr): sync the commit list and the test baseline after the main merge`

（哈希随本 PR 的最新提交更新；完整 diff 规模以 GitHub PR 页面为准。）

> **破坏性行为变更（第二处）**：`PreferProxy` 驱动的「未配置 `web_proxy`」仍默认代理；但
> **显式设置 `web_proxy=false` 的 WebDav / 123Pan / BaiduNetdisk 存储会从「代理」变为「302 直链」**
> （与 Go 一致）。同理，此前被误标为强制代理的 115Open / 189Cloud / Terabox / 123PanShare
> 现在可以走直链；GoogleDrive / GooglePhoto / QuarkOpen / QuarkUC / ChaoXing 则改为强制代理。

## 评审意见处理

| 评审项 | 处理 |
|---|---|
| P0 提交缺少 `Co-Authored-By` 归属 | 已重写分支历史为全部 6 个提交补上 trailer（见上方「AI 使用声明」） |
| P1 `matchGlob()` 递归无深度限制可能 DoS | **已在 `954ebff` 修复**：`matchGlob()` 不再使用正则（旧实现把 glob 翻成正则，多个通配符产生相邻贪婪量词，实测单次匹配 508 秒 CPU），现为「按段切分 + 动态规划」，无递归、无指数回溯，并有模式/目标长度上限；已有 200 段 `**` 与恶意回溯模式的耗时回归测试。评审建议的 `MAX_GLOB_DEPTH = 10` 会误伤合法模式（如连续 200 个 `**/`），不是合适的修法 |
| P1 Range + 签名交互测试覆盖不足 | 已在 `954ebff` 抽出 `server/proxy_request.ts` 并补 17 个测试（Range 透传不改签名、412/200 兜底后无需重签、206 不重试等）；本次 `cb4051f` 进一步补上「兜底重试后上游回整份文件」的二次大小校验与 4 个用例 |
| P2 驱动能力映射缺少文档注释 | **已在 `954ebff` 补上**：`internal/driver/proxy.ts` 顶部有驱动 ↔ Go `drivers/*/meta.go` 的完整映射表 |
| P2 未在真实环境端到端验证 | 仍需手动回归（见上方「未做的验证」） |
| **自审追加**：运行时判据写错，守卫在 EdgeOne 上不会生效 | **已在 `47d70d3` 修复**：原先只查 `EDGEONE` / `EO_REGION`，而 EdgeOne Node 云函数的平台特征是 `TENCENTCLOUD_SCF_FUNCTIONNAME`（见 `internal/model/store/backend.ts`），会导致 6 MiB 守卫在目标平台上静默失效；现补上 SCF / `EDGEONE_BLOB` 判据，并明确不采用 `__requestOrigin` |
| **自审追加**：私有头判定过于复杂 | 先在 `47d70d3` 改成「鉴权语义模式 + 白名单」，随后对比 Go 后**退回精确名单**（`Authorization` / `Cookie`）：仓库内 33 处 `raw_url_headers` 只用这两种鉴权头，驱动若引入新头名应按 Go 的 `meta.go` 登记为 `MustProxy`，而不是在下载层猜头名 |
| **自审追加**：413 文案把平台写死 | **已在 `47d70d3` 修正**：改为中性表述，并提示限制也可能来自 `RAW_PROXY_MAX_BYTES` |

## 与 Go 版逐项对齐（对比 `OpenList-Backends` 后修正）

| 项 | Go 的事实 | 本 PR 的处理 |
|---|---|---|
| 强制代理清单 | `Config.MustProxy() = OnlyProxy \|\| NoLinkURL`，实际为 WeiYun、SFTP、FTP、SMB、Crypt、Virtual、Strm、Mega、ProtonDrive、Chunk、GoogleDrive、GooglePhoto、QuarkOpen、UC、ChaoXing（`local` 不在本 PR 的下载链路内；`bunny_storage` 是运行时条件） | 按此重写 `DRIVER_FORCE_PROXY`；删掉误标的 123Pan / BaiduNetdisk / 115Open / 189Cloud，补上缺失的 GoogleDrive / GooglePhoto / QuarkOpen / QuarkUC / ChaoXing / Chunk |
| 驱动能力的两份真相 | 能力声明只在各驱动 `meta.go`，`op/driver.go` 据此生成表单 | `admin.ts` 的 `buildProxyFields()` 改为按驱动名从 `internal/driver/proxy.ts` 派生（22 处调用点不再传 `only_proxy/prefer` 布尔值），并删除 `registerDriverProxyCapability()` 这类重复登记入口 |
| `PreferProxy` 的用途 | 只用于**表单默认值**（`op/driver.go`），运行时 `ShouldProxy` 只看 `MustProxy \|\| WebProxy` | `resolveProxyDecision()` 不再在运行时强制 `PreferProxy` 驱动代理，改为「`web_proxy` 未配置时回退到驱动默认值」（`effectiveWebProxy()`），显式 `web_proxy=false` 会被尊重 |
| `proxy_range` | 透明代理**默认转发客户端头（含 Range）**；`proxy_range` 只是额外启用驱动的 RangeReader 路径（`internal/net/serve.go`、`internal/stream/util.go`） | 默认改为**透传 Range**，`proxy_range=false` 才丢弃；保留 `shouldRetryWithoutRange()` 作为上游拒绝 Range 的兜底 |
| 未实现的 Go 特性 | `proxy_types` / `text_types` 扩展名代理、`/p` 的 403 限制、`proxy_ignore_headers` | **已实现**（见下方「扩展名代理与 /p 准入」），默认值对齐 Go 的 `internal/bootstrap/data/setting.go` |

### 扩展名代理与 /p 准入（对齐 Go 的 proxy_types / text_types / canProxy）

- **`proxy_types`（默认 `m3u8,url`）**：命中的扩展名一律由服务端代理——`.m3u8` / `.url`
  内部含相对引用，只有经本服务转发才能被正确解析。作用于 `/d`、`/sd` 与 `/p`
  （即 Go `ShouldProxy` 的第三条）。
- **`text_types`（默认值取 Go 与 TSWorker 既有默认的并集）**：`/p` 端点用它放行文本类
  预览（README、歌词 `.lrc`、字幕 `.srt` / `.ass` / `.vtt`、弹幕等），即使存储没有开启
  `web_proxy`。历史默认值会由 `LEGACY_SETTING_MIGRATIONS` 自动迁移，避免升级后字幕/歌词
  预览被 403。
- **`/p` 准入检查（Go `canProxy`）**：命中
  `MustProxy || web_proxy || webdav_policy=use_proxy_url || proxy_types || text_types`
  才放行，否则 **403 `proxy not allowed`**。`/d`、`/sd` 不做该限制（Go 里它们走
  `ShouldProxy`）。WebDAV 协议端点（`/dav/*`）的 GET/HEAD 会按同一判据选择
  `/api/p` 或 `/api/d`，避免 WebDAV 客户端拿到 403。
- **`proxy_ignore_headers`（默认 `authorization,referer`）**：作用于本服务转发给上游的
  **客户端头**（Range、兜底 User-Agent）；驱动自己声明的头不受影响——与 Go 的
  `ProcessHeader` 一致（先过滤客户端头，再套驱动 override）。注意 TS 只转发这几个必要
  的头，不会像 Go 那样把客户端全部请求头转发给上游（避免 Cookie/Authorization 泄漏给
  第三方上游）。
- **`bunny_storage` 的条件能力**：对齐 Go `drivers/bunny_storage/driver.go` 的 `Config()`
  ——配置了 `storage_zone_name` 但未绑定 `cdn_base_url` 时视为 `MustProxy`（此时只有
  Storage API 可读，浏览器直连会 401）；绑定 CDN 后按普通驱动处理。
| 平台载荷上限守卫（本 PR 新增） | Go 无常驻进程内的大小限制（由 nginx 等外部配置负责） | 属 EdgeOne 等 Serverless 平台的适配层，非照搬 Go；已删掉其中无 Go 对应、也无实际需求的 `RAW_PROXY_OVERFLOW` 开关 |
