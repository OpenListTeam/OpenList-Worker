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
- [ ] WebDAV (WebDAV) - _Not supported in JS backend yet_
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
- [x] ~~S3~~ - **_Removed by request_**
- [ ] 天翼云盘 (189Cloud)
- [x] 联通网盘 (WoPan) - _Implemented (Re-ported from Go wopan driver + wopan-sdk-go: AES-128-CBC encryption, MD5 sign, token refresh, list/get/mkdir/rename/remove/move/copy, 8MB chunked upload2C, personal & family spaces)_
- [ ] FTP / SFTP
- [ ] PikPak
- [ ] Seafile
- [ ] 又拍云对象存储 (Upyun)
- [x] WebDAV - _Implemented (PROPFIND/MKCOL/MOVE/COPY/DELETE/PUT/GET, Basic/Digest/SharePoint SAML auth)_
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
- [x] 驱动注册：Local（守卫）/ Quark / BaiduNetdisk / 123Pan / Onedrive / AliyundriveOpen / GoogleDrive

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
- [x] 中英文语言 JSON 完善（15 个文件 key 完全一致 + 代码引用 0 缺失）
- [x] 生产构建修复（移除 vite-plugin-dynamic-base，资源路径恢复正常）
- [x] 关于页面改为本地打包 README（离线可用）
- [x] TOTP 两步验证 (2FA) (RFC 6238 纯 Web Crypto 实现：密钥生成、二维码、登录拦截、动态校验与管理解除)
- [x] SSH 密钥管理 (OpenSSH 公钥解析、SHA256 指纹计算、用户密钥列表与删除)
- [x] 跨存储多级全局递归搜索 (`/api/fs/search`)
- [x] 存储全量并发预热与装配 (`/api/admin/storage/load_all`)
- [x] 后台“其他设置”页面与全局 Token 重置 (`Other.tsx` + `/admin/setting/reset_token`)
