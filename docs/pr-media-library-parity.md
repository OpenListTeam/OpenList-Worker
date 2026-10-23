<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`
-->

`feat(media): complete media library, Emby and Subsonic parity with Go backend`

## Summary / 摘要

本 PR 把 Worker 版媒体库从「最小可跑闭环」补齐到与 Go 版 OpenList（`OpenList-Backends` 的 `dev-media`）功能对齐，覆盖扫描、刮削、媒体 API、Emby、Subsonic 五条链路，并同步了 Go 侧最近的协议与安全修复。

**问题背景**：此前的实现（`3638ad2`、`c2e4a6b`）只做到「能扫、能看、能播」：

- 音乐不解析 ID3/Vorbis，`album_artist` 恒为空，专辑/曲序/封面/歌词全部缺失；
- 缩略图接口恒 404，图片类型完全不刮削；
- 刮削全串行、每次重刮全库，没有 `scraped_at` 判据；
- `delete_invalid` 是空壳（只删隐藏项），导入不恢复扫描路径；
- 媒体库数据存在单个 JSON 文档里，一次播放进度上报就要全量重写；
- Emby 缺 Season 层级、`Sessions/Playing*` 不落进度、`PlaybackInfo` 返回本地文件路径导致客户端播放失败；
- Subsonic 只有约 18 个方法且恒返回 JSON，播放列表恒空。

## 用户可感知的行为变化

### 媒体库

- **音乐库可用**：扫描时读取 ID3v2.2/2.3/2.4、ID3v1、FLAC Vorbis Comment、M4A `ilst`，填充标题/艺术家/专辑/曲序/年份/流派/内嵌封面；优先读取同目录 `.lrc`，回退内嵌歌词。
- **扫描路径支持 `path_merge` 与 `enable_scrape`**：目录合并模式由每个扫描路径独立控制，不再对「视频目录 ≥2 个文件」硬编码聚合。
- **剧集集号/季号按真实文件名解析**：支持 `SxxExx`、`EPxx`、`第N集`（含中文数字）、开头数字；`1080p` 之类不再被误判为集号。
- **图片类型可刮削**：按文件头魔数校验真实格式（伪造扩展名的非图片文件不入库），并把原图缓存为缩略图。
- **书籍封面**：新增 EPUB / CBZ / **PDF** 内嵌封面提取（PDF 支持 DCTDecode 直出与 FlateDecode → PNG 转码）。
- **刮削并发**（默认 5，可配置）、只刮未刮削条目；TMDB 改为多候选 + 相似度打分 + 年份/类型加权，支持剧集单集信息。
- **进度语义对齐 Go**：播放到 90% 自动标记已看；重新播放（<5s）清除已看；记录 `last_played_at`。
- **收藏接口只返回条目级收藏**（排除选集收藏）。
- **`delete_invalid` 真实探测文件是否存在**，只删除确认不存在的记录；导入/导出支持 `scan_path` 范围与扫描路径 id 重映射。
- **STRM**：支持内容模板、覆盖开关、扫描后自动生成；输出 `Movie (Year)/`、`Series/Season 01/SxxExx`、`Artist/Album/` 目录结构。
- **普通用户可自助签发媒体应用密钥**：`/api/auth/me/appkey/*`（此前仅管理员可用）。

### Emby

- **`PlaybackInfo` 修复**：`Path` 与 `DirectStreamUrl` 改为带 `api_key` 的 HTTP 流地址（不再是本地文件路径），修复客户端 `Playback of this content is currently restricted` / 一直转圈。
- **封面端点允许匿名访问**（客户端图片 URL 不带 token），支持 `thumb:` / `data:` / 远程 URL / VFS 四种来源。
- **Series → Season → Episode 三层结构**，剧集按季归档。
- **`Sessions/Playing`、`Playing/Progress`、`Playing/Stopped` 真正落播放进度**，停止时按 90% 标记已看。
- 新增 FavoriteItems / PlayedItems / UserData 读写、`/Audio/:id/lyrics`（LRC 转 SRT 作为外挂字幕轨）。
- 补齐 Views / Items / Counts / Latest / Resume / Root / Shows / Artists / Search Hints / Library / DisplayPreferences 等端点。
- **Emby WebSocket**：Cloudflare Workers 下提供 `/@emby/embywebsocket`（`WebSocketPair` + `upgradeWebSocket`，30s 心跳）；其它运行时返回 426。

### Subsonic

- **默认输出 XML**，支持 `f=json` / `jsonp`，支持 POST 表单（formPost）。
- 方法覆盖从约 18 个扩展到约 35 个：`getIndexes`、`getMusicDirectory`、`getRandomSongs`、`getSongsByGenre`、`search2/3`、`getLyrics`、`getLyricsBySongId`、`setRating`、`scrobble`、播放列表 CRUD、`savePlayQueue/getPlayQueue`、`getGenres`、`getUsers`、`tokeninfo`、`startscan` 等。
- 播放列表、播放队列、评分按要求持久化。
- `media_subsonic_proxy_stream`、`media_subsonic_allow_password_auth`（默认关闭，对齐 Go）生效。
- 认证失败限流：IP + 用户名双维度，只有「带凭据但校验失败」才计数，锁定窗口不续期。

### 安全

- 封面代理改为**逐跳**重定向校验 + 域名白名单 + 图片魔数嗅探 + `nosniff` / CSP 响应头（此前只校验首跳并信任 `Content-Type`）。
- 媒体类型开关纳入条目级权限校验（`/fs/media/item/:id` 不再能读取已关闭类型的条目）。
- Emby / Subsonic 认证入口增加失败限流；应用密钥明文改为 AES-GCM 加密存储（旧 `plain` 字段仍兼容读取）。

### 转码

- **Worker 明确不支持转码**，设置被三层屏蔽：`/admin/setting/list` 过滤全部 `transcode_*`、`/admin/setting/save` 拒绝写入并强制落成 `false`、`getSettings()` 读取时强制关闭。
- `/api/fs/transcode/play` 返回 `transcode:false, supported:false, reason`，前端平滑降级直链。

## 重要实现变化

| 模块 | 变更 |
|---|---|
| `internal/media/model.ts` | 对齐 Go 字段：`mime_type / reviews / lyrics / video_type / is_folder / scraped_at`、`scan_path.path_merge / enable_scrape / last_scan_at`、`config.scraper_config / last_*_at`、`userdata.rating / last_played_at`、`MediaPlaylist / MediaPlaylistItem / MediaPlayQueue` |
| `internal/media/store.ts` | 单 JSON 文档改为分片持久化：`items` 按 `scan_path_id`、`user_data` 按 `user_id`、缩略图按 hash 分键；写入前按分片 diff，只写变化部分；首次读取自动迁移旧数据 |
| `internal/media/tag.ts`（新增） | ID3v2/Vorbis/M4A/LRC/EXIF/ZIP/PDF 解析，图片魔数嗅探 |
| `internal/media/thumb.ts`（新增） | 封面落盘（`thumb:<hash>`）、base64 内联、URL 解析、类型级 `scraper_config` 覆盖 |
| `internal/media/strm.ts`（新增） | STRM 目标计算、模板渲染、批量生成、扫描后自动生成 |
| `internal/media/ratelimit.ts`（新增） | Emby/Subsonic 认证限流（内存 + 持久化锁定） |
| `internal/model/transcode-guard.ts`（新增） | `transcode_*` 设置识别、过滤、强制禁用 |
| `internal/op/storage.ts` | 新增 `readFileRange()`：Range 请求、上游忽略 Range 时流式跳过、32MB 上限 |
| `server/media.ts` | 重写：进度语义、收藏过滤、`delete_invalid` 真实探测、导入导出 scope、`/me/appkey`、STRM、封面代理加固 |
| `server/emby.ts` | 重写：Emby 完整端点 + Season 层级 + Sessions 进度 + WebSocket；Subsonic XML/JSON/JSONP + 方法补齐 |
| `server/admin.ts` | 设置列表/保存接入转码守卫 |
| `server/router.ts` | 注册 `/auth/me/appkey`；转码请求明确 `supported:false` |
| `internal/model/db.ts` | 新增 `media_subsonic_allow_password_auth`、`media_cover_gateway`；`getSettings()` 接入转码守卫 |

## 兼容性 / 迁移

- **存储格式**：媒体库 meta 首次读取时自动把旧的单文档 `items` / `user_data` 拆分写入新分片键，无需人工迁移；旧键 `openlist_media_db_v1` 继续作为 meta 使用。
- **前端接口**：现有字段名不变，`cover` 字段可能返回 `data:`、`/api/public/media/thumb?path=...` 或远程 URL，前端按普通图片 URL 处理即可。
- **Emby / Subsonic**：ID 规则保持 `mv- / so- / ep- / sr- / sn- / al- / ar-`，并额外提供稳定的数字 ID 映射；旧客户端缓存的内嵌 ID 仍可解析。
- **行为变更**：`media_subsonic_allow_password_auth` 默认 **false**（对齐 Go），使用 `u+p` 的客户端需要改用 `apiKey` 或 `u+t+s`（应用密钥）认证；管理员可在设置中显式开启。
- **行为变更**：转码设置在 Worker 上不可见、不可写、不可启用。

## 已知限制（Worker 运行时）

- 无 ffmpeg：转码按上述方式屏蔽，播放降级直链。
- 无 sharp/canvas：缩略图为原图缓存（≤512KB），不做缩放。
- Emby WebSocket 仅 Cloudflare Workers 可用；Node/EdgeOne 返回 426。
- 扫描在请求内执行，受 CPU/时长约束：单路径最多 20000 条、深度 12。
- PDF 封面只支持 `DCTDecode` 与 `FlateDecode`（含 ASCII85 组合），`JPXDecode` / `JBIG2Decode` 跳过。

## Testing / 测试

```bash
# 类型检查
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit

# 媒体库 + 协议单测
node node_modules/tsx/dist/cli.mjs --test \
  src/backend/internal/media/media.test.ts \
  src/backend/server/emby_protocol.test.ts

# 回归（路由注册 / 公开设置）
node node_modules/tsx/dist/cli.mjs --test src/backend/server/index_cdn.test.ts
node node_modules/tsx/dist/cli.mjs --test src/backend/server/public_settings.test.ts
```

结果：

- `tsc --noEmit`：0 error
- 媒体 + 协议单测：**24 passed / 0 failed**，覆盖扩展名映射、查询过滤、多用户收藏隔离、集号/季号解析（含中文数字）、ID3v2、FLAC Vorbis、图片魔数、播放列表、PDF 封面（JPEG 直出 / Flate→PNG）、转码守卫、STRM 布局、Emby 公共端点、Subsonic XML/JSON/JSONP、XML 转义、数字 ID 稳定性
- `index_cdn.test.ts`（15）、`public_settings.test.ts`（7）：全部通过，无回归

手动验证建议：

- 扫描一个含 MP3/FLAC 的目录，确认专辑/艺术家/曲序/封面/歌词
- 扫描带 `SxxExx` 的剧集目录，确认 Emby 中 Season/Episode 层级
- 用 Infuse / VidHub / Feishin / Symfonium 各连接一次，确认浏览、封面、播放、进度同步
- 在管理端尝试保存 `transcode_enabled=true`，确认列表不显示、保存后值仍为 `false`

## Checklist / 检查清单

- [x] I have read [CONTRIBUTING](https://github.com/OpenListTeam/OpenList/blob/main/CONTRIBUTING.md).
- [x] I confirm this contribution follows the repository license, contribution policy, and code of conduct.
- [x] I have formatted the changed code with `prettier` where applicable.
- [ ] I have requested review from relevant maintainers or code owners where applicable.

## AI Disclosure / AI 使用声明

- [x] This PR includes AI-assisted content.

Tools used / 使用工具:

- [x] Other (please specify) / 其他（请注明）: CodeBuddy

Usage scope / 使用范围:

- [x] Code generation / 代码生成
- [x] Refactoring / 重构
- [x] Documentation / 文档
- [x] Tests / 测试
- [x] Review assistance / 审查辅助

- [x] I have reviewed and validated all AI-assisted content included in this PR.
- [x] I can reproduce all AI-assisted content included in this PR without any AI tools.
