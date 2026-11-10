<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`
-->

`fix(webdav): sign the download redirect so playback stops returning 401`

## Summary / 摘要

本 PR 修复「WebDAV 挂载后能列目录、能看文件，一点播放就 401」的问题（Issue #175）。

**根因**：WebDAV 的 `GET` / `HEAD` 只把 `getItem()` 返回的 raw 链接（`/api/p/<path>` 或 `/api/d/<path>`）302 出去，**从不补签名**：

```ts
return c.redirect(rawUrl || `/api/d${encodeDownloadPath(actualPath)}`, 302)
```

而 `/d`、`/p` 设计上是**没有 Auth 中间件的公开下载端点**（播放器、`<video src>` 无法携带 Authorization），能否放行只取决于 `needDownloadSign()`：`sign_all`、`link_expiration`、存储级 `enable_sign`、密码 meta 任一命中就必须带 `?sign=`，否则直接返回 `401 sign verify failed`。

因此 Infuse 拿到 302 后跳转到的裸链接被拒，正是 issue 日志里的：

```
http request https://example.com/dav/r2/example.mp4 failure, status: 401
response: sign verify failed
```

该缺陷与 Issue #66（`/fs/get` 的 `raw_url` 缺签名）同源：当时修了 `/fs/get`，但 WebDAV、S3 这两个同样「服务端自己生成 raw 链接再交给客户端」的网关漏掉了。Go 版没有此问题，因为它的 WebDAV GET 直接 302 到网盘直链或服务端代理流，从不重定向到自己的 `/d`。

## 用户可感知的行为变化

- 开启 `sign_all` / `link_expiration` / 存储级 `enable_sign` / 密码 meta 时，WebDAV 客户端（Infuse、rclone、Windows 资源管理器等）的 `GET`、`HEAD` 可以正常拉流：支持在线播放、拖动进度（Range）与断点读取。
- 未启用上述任何限制时行为不变：重定向目标仍是不带签名的裸链接（公开直链语义）。
- S3 网关的 `GetObject` 重定向同样修正（同类问题，见下）。

## 重要实现变化

- `src/backend/pkg/sign.ts`
  - 新增 `appendDownloadSignToRawUrl(c, rawUrl, virtualPath)`：幂等（已带 `sign` 时原样返回）、复用 `needDownloadSign` / `getSignExpiresIn` / `signDownloadPath`，语义与 `/fs/get` 现有的「必要时追加 `?sign=`」一致。
- `src/backend/server/webdav.ts`
  - `GET` / `HEAD` 在 302 之前对目标链接签名；签名路径使用 `actualPath`（已套用用户 `base_path`），与 raw 端点验签时的路径完全同源。
- `src/backend/server/s3.ts`
  - `GetObject` 的 302 同样经该 helper 签名。S3 网关与 WebDAV 面对的是同一类端点，缺签名时表现完全相同。

### 与 Go 版对齐

| 环节 | Go | 本 PR 后的 TSWorker |
| --- | --- | --- |
| WebDAV GET | `Webdav302()` 直连网盘链接，或 `common.Proxy` 服务端代理，不经自身 `/d` | 302 到自身 `/d`、`/p` 时自带签名 |
| 签名语义 | `sign_all` / `link_expiration` / meta 密码 | 同一套 `needDownloadSign` 判定，路径一致 |

> 说明：TS 选择「302 到 raw 端点」而非在 WebDAV 内直接代理，是为了复用 raw 路由已有的驱动下载协议、Range、SSRF 防护与平台载荷上限保护；代价是必须自己补签名。

## Related Issues / 关联 Issue

Fixes #175

Relates to #66（同一根因，此前只修了 `/fs/get`）

## Testing / 测试

```bash
npx tsx --test src/backend/server/webdav_get_sign.test.ts   # 5/5 通过
npm run test:server                                         # 225/225 通过
npm run test:drivers                                        # 197/197 通过
npm run lint                                                # tsc --noEmit，exit 0
```

新增 `src/backend/server/webdav_get_sign.test.ts`，用真实 `webdavRouter` + `rawRouter` 与临时目录 Local 存储，复刻 issue 场景（一般用户、仅 `WEBDAV_READ`、`base_path` 受限、`sign_all=true`）：

- `GET /dav/a.mp4` → 302 且 `Location` 带 `sign`，签名能用 `verifyDownloadSign(env, "/local/a.mp4", ...)` 验过；跟随重定向后不再是 401。
- `HEAD /dav/a.mp4` → 同样带签名（播放器常先探测）。
- 未开启签名策略 → 重定向不带 `sign`（公开直链语义不变）。
- 篡改签名 → raw 端点仍返回 401（对照用例，证明断言有效）。

**修复前基线**：临时回退 `webdav.ts` 的改动后，前两个用例失败、其余通过（`2 fail / 3 pass`），说明测试确实锁定了本 bug。

> **未做的验证**：未在真实 Infuse / rclone 客户端上跑端到端播放，也未用真实 R2 存储验证。S3 网关的签名重定向只做了类型检查与既有测试回归，未单独补用例（S3 需 SigV4 签名构造，改动本身复用同一 helper）。

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
