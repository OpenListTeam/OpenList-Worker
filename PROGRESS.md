# OpenListNext Refactoring Progress

## Core Features (核心功能)

- [x] 部署方便，开箱即用 (Deploy easily, out of the box) - _Supported via Node.js container backend_
- [x] 文件预览（PDF、markdown、代码、纯文本等） (File preview)
- [x] 画廊模式下的图片预览 (Gallery mode image preview)
- [x] 视频和音频预览，支持歌词和字幕 (Video/audio preview)
- [x] Office 文档预览 (docx, pptx, xlsx etc)
- [x] README.md 预览渲染 (README.md render)
- [x] 文件永久链接复制和直接文件下载 (File permalink copy and direct download)
- [x] 黑暗模式 (Dark mode)
- [x] 国际化 (i18n)
- [x] 受保护的路由（密码保护和认证） (Protected routes) - _Implemented for admin login_
- [x] WebDAV (WebDAV) - _Implemented with PROPFIND/MKCOL/PUT/DELETE/MOVE/COPY_
- [x] Docker 部署 (Docker deploy) - _Supported via container_
- [x] Cloudflare Workers / Vercel 代理 - _Supported via entrypoints_
- [x] 文件/文件夹打包下载 (File/folder archive download) - _Implemented via browser ZIP stream_
- [x] 网页上传、删除、新建文件夹、重命名、移动和复制 (Web upload, delete, create folder, rename, move, copy) - _Implemented for Local storage_
- [x] 离线下载 (Offline download) - _Basic implementation (Serverless mode limited)_
- [x] 跨存储复制文件 (Cross-storage file copy) - _Supported via /fs/copy API abstraction_
- [x] 单文件多线程下载/流式加速 (Multi-thread download/stream acceleration) - _Implemented HTTP Range requests support in backend_
- [x] 分享功能 (Shares) - _Full CRUD + /@s/{id} browse + /sd/{id} download + auto ID + copy URL_
- [x] 任务管理 (Task management) - _Full task API (list/retry/cancel/delete/clear)_
- [x] 备份/恢复 (Backup / Restore) - _JSON export/import with encryption, skip-existing logic_
- [x] 元数据管理 (Meta management) - _Full CRUD via /admin/meta/\*_
- [x] 目录树 (Folder tree) - _Via /fs/dirs endpoint_

## Storages (多种存储)

- [x] 本地存储 (Local storage) - _Node.js container; guarded in Edge runtime_
- [x] 阿里云盘 (Aliyundrive) - _Implemented + order settings_
- [x] OneDrive / Sharepoint - _Implemented + order settings_
- [x] GoogleDrive - _Implemented + order settings_
- [x] 123云盘 (123Pan) - _Implemented + CRC32 sign + token-first login (avoids overseas risk control)_
- [x] 夸克网盘 (Quark Drive) - _Implemented + download headers (Cookie/Referer)_
- [x] 百度网盘 (Baidu Netdisk) - _Re-ported from Go v4 driver (driver.go/util.go/types.go/meta.go): official/crack/crack_video download, chunked upload + rapid upload, MD5 obfuscation (EncryptMd5/DecryptMd5), vip slice sizes, dynamic upload domain, token persistence_
- [x] S3 - _Re-implemented with Web Crypto API (AWS Signature v4), supports AWS S3 / MinIO / R2 / OSS / COS_
  - 修复 SignatureDoesNotMatch: URL 双斜杠（`keyUrl('')` 尾部 `/` + `/?query`）→ 去掉多余 `/`
  - 修复 deleteObjects: canonical path 误含 `?delete`、query string 缺少 `=`
  - 重写 uriEncode 为 RFC 3986 规范（旧实现漏编码 `! ' ( )`）
  - 路径段编码改用 uriEncode 替代 encodeURIComponent
  - buildCanonicalQuery 排序改用 code-point 比较替代 localeCompare
- [ ] 天翼云盘 (189Cloud)
- [ ] FTP / SFTP
- [ ] PikPak
- [ ] Seafile
- [ ] 又拍云对象存储 (Upyun)
- [x] WebDAV - _Implemented with PROPFIND/MKCOL/PUT/DELETE/MOVE/COPY_
  - 修复路径嵌套重复: addressPath 用 `cleanPath()` 去掉前导 `/`，导致 self-entry 过滤失败，子目录列表出现多余父目录名
  - 修复: addressPath 改用 `u.pathname` 保留前导 `/`
- [ ] Teambition
- [ ] MediaFire
- [ ] 分秒帧 (Fenmiao)
- [ ] ProtonDrive
- [ ] 和彩云 (Mcloud)
- [ ] YandexDisk
- [ ] Terabox
- [ ] UC网盘 (UC Drive)
- [ ] 迅雷网盘 (Xunlei Drive)

## Cloudflare Workers 兼容性

- [x] 无 Node.js 模块依赖（纯 fetch / Web Crypto / ReadableStream）
- [x] KV 持久化（OPENLISTNEXT_KV binding，wrangler.toml 已配置）
- [x] 动态 base 移除（静态资源 /assets/\* 直接由 ASSETS binding 提供）
- [x] 回归测试：scripts/test-workers-env.mts (11 项)
- [x] 驱动注册：Local（守卫）/ Quark / BaiduNetdisk / 123Pan / Onedrive / AliyundriveOpen / GoogleDrive / S3 / WebDAV

## Developer TODOs

- [x] Implement backend auth endpoints (/api/auth) correctly with JWT (using .env for credentials).
- [x] 后台管理功能 (Admin management): Implement basic Storage and Settings management via local JSON database.
- [x] Implement backend `fs` operations for `Local` driver mapping to container filesystem.
- [x] Implement storage management CRUD endpoints (list storages, update, delete, get).
- [x] 分享管理 CRUD (/api/share/\*) + 分享访问 (/@s/ 浏览、/sd/ 下载、密码/过期/禁用校验、虚拟列表)
- [x] 任务管理 API (/api/task/\*) — list/retry/cancel/delete/clear
- [x] 元数据管理 API (/api/admin/meta/\*) — CRUD
- [x] 目录树 API (/api/fs/dirs)
- [x] 123Pan 驱动 (types/util/driver + 注册 + 配置表单)
- [x] 所有网盘驱动统一 order_by/order_direction 排列设置（共享 sortFileItems）
- [x] 品牌统一 OpenList → OpenListNext（站点标题/图标/标识符/KV 名称）
- [x] 移除 S3 全部功能（驱动/路由/设置/前端菜单）
- [x] 重新实现 S3 驱动（Web Crypto AWS Signature v4，兼容 Cloudflare Workers）
- [x] 中英文语言 JSON 完善（15 个文件 key 完全一致 + 代码引用 0 缺失）
- [x] 生产构建修复（移除 vite-plugin-dynamic-base，资源路径恢复正常）
- [x] 关于页面改为本地打包 README（离线可用）

## Changelog

### 2026-08-22

- **fix(s3)**: 修复 SignatureDoesNotMatch (403)
  - URL 构造双斜杠: `keyUrl('')` 返回 `.../bucket/`，`/?query` 再拼 `/` → `.../bucket//?query`，实际请求路径与签名路径不一致
  - deleteObjects: canonical path 误含 `?delete`，query string `delete` 缺少 `=`
  - uriEncode 重写为 RFC 3986 规范（旧 `encodeURIComponent` 漏编码 `! ' ( )`）
  - 路径段编码统一用 `uriEncode` 替代 `encodeURIComponent`
  - buildCanonicalQuery 排序从 `localeCompare` 改为 code-point 比较
- **fix(webdav)**: 修复路径嵌套重复（Koofr/Koofr 双层文件夹）
  - `addressPath` getter 用 `cleanPath()` 去掉前导 `/`，与服务器 href（始终以 `/` 开头）前缀匹配失败，self-entry 泄漏为子项
  - 修复: `addressPath` 改用 `u.pathname` 保留前导 `/`
