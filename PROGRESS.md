# OpenList Refactoring Progress

## Core Features (核心功能)

- [x] 部署方便，开箱即用 (Deploy easily, out of the box) - *Supported via Node.js container backend*
- [x] 文件预览（PDF、markdown、代码、纯文本等） (File preview)
- [x] 画廊模式下的图片预览 (Gallery mode image preview)
- [x] 视频和音频预览，支持歌词和字幕 (Video/audio preview)
- [x] Office 文档预览 (docx, pptx, xlsx etc)
- [x] README.md 预览渲染 (README.md render)
- [x] 文件永久链接复制和直接文件下载 (File permalink copy and direct download)
- [x] 黑暗模式 (Dark mode)
- [x] 国际化 (i18n)
- [x] 受保护的路由（密码保护和认证） (Protected routes) - *Implemented for admin login*
- [ ] WebDAV (WebDAV) - *Not supported in JS backend yet*
- [x] Docker 部署 (Docker deploy) - *Supported via container*
- [x] Cloudflare Workers / Vercel 代理 - *Supported via entrypoints*
- [x] 文件/文件夹打包下载 (File/folder archive download) - *Implemented via browser ZIP stream*
- [x] 网页上传、删除、新建文件夹、重命名、移动和复制 (Web upload, delete, create folder, rename, move, copy) - *Implemented for Local storage*
- [x] 离线下载 (Offline download) - *Basic implementation for Local storage*
- [x] 跨存储复制文件 (Cross-storage file copy) - *Supported via /fs/copy API abstraction*
- [x] 单文件多线程下载/流式加速 (Multi-thread download/stream acceleration) - *Implemented HTTP Range requests support in backend*

## Storages (多种存储)

- [x] 本地存储 (Local storage) - *Implemented for Node.js container*
- [ ] 阿里云盘 (Aliyundrive)
- [ ] OneDrive / Sharepoint
- [ ] 天翼云盘 (189Cloud)
- [ ] GoogleDrive
- [ ] 123云盘 (123Pan)
- [ ] FTP / SFTP
- [ ] PikPak
- [ ] S3
- [ ] Seafile
- [ ] 又拍云对象存储 (Upyun)
- [ ] WebDAV
- [ ] Teambition
- [ ] MediaFire
- [ ] 分秒帧 (Fenmiao)
- [ ] ProtonDrive
- [ ] 和彩云 (Mcloud)
- [ ] YandexDisk
- [ ] 百度网盘 (Baidu Netdisk)
- [ ] Terabox
- [ ] UC网盘 (UC Drive)
- [ ] 夸克网盘 (Quark Drive)
- [ ] 迅雷网盘 (Xunlei Drive)

## Developer TODOs
- [x] Implement backend auth endpoints (/api/auth) correctly with JWT (using .env for credentials).
- [x] 后台管理功能 (Admin management): Implement basic Storage and Settings management via local JSON database.
- [x] Implement backend `fs` operations for `Local` driver mapping to container filesystem.
- [x] Implement storage management CRUD endpoints (list storages, update, delete).
