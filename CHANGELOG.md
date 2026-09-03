# 变更日志 (CHANGELOG)

## v0.2.0 - 基础设施与功能对齐里程碑 (2026-08-04)

### 与 Go 版 OpenList-Backends 功能对齐进度：约 55%

#### 新增模块

| 模块 | 文件 | 说明 |
|------|------|------|
| **统一响应层** | `src/types/HttpResponse.ts` | 追加 ErrCode 常量、快捷响应方法（ok/fail/unauthorized/forbidden 等）、路径安全校验 |
| **权限中间件** | `src/route/index.ts` | 权限掩码常量 Permission、permissionRequired 高阶中间件、rateLimitMiddleware、Guest 只读拦截、结构化日志 |
| **公开路由** | `src/route/public.ts` | `/api/public/settings/offline_download_tools/archive_extensions` |
| **SSH Key** | `src/route/auth.ts` | `/api/me/sshkey/{list,add,delete}` |
| **归档模块** | `src/files/archive/` | ZipProvider（EOCD+CD+LFH 解析、DEFLATE 解压）、ArchiveManager |
| **归档路由** | `src/route/fsArchive.ts` | `/api/fs/archive/{meta,list,decompress}`、`/ae/*path` 提取下载 |
| **保留驱动** | `src/drive/reserved/{aliquark,aliucyun,dropboxs,megadisk,thunders}/` | 5 个骨架驱动及 DriveSelect 注册 |
| **任务系统** | `src/tasks/TaskManager.ts` | 统一任务队列（D1 持久化、submit/query/cancel/retry/recoverStale）、IDownloadTool 接口 |
| **搜索服务** | `src/search/SearchService.ts` | D1 FTS5 / SQL LIKE 双模式搜索、索引构建/更新/清空 |
| **Torrent 解析** | `src/torrent/TorrentParser.ts` | 纯 TS Bencode 解析器、磁力链解析 |
| **消息中心** | `src/message/MessageCenter.ts` | SSE 流式推送、消息存储/查询/标记已读 |

#### 增强功能

- **authMiddleware**: 支持 guest 用户只读拦截、权限掩码解析
- **loggerMiddleware**: 结构化 JSON 日志（request_id/user/path/status/duration_ms）
- **errorMiddleware**: 带堆栈日志的统一异常响应（含 request_id）
- **loginRateLimit**: 登录接口 60 秒 10 次限流

#### API 对齐进度

| 路由域 | Go 端点总数 | 已对齐 | 进度 |
|--------|-----------|--------|------|
| `/api/auth/*` | 10 | 9 | 90% |
| `/api/fs/*` | 18 | 16 | 89% |
| `/api/admin/*` | 25+ | 15 | 60% |
| `/api/share/*` | 6 | 6 | 100% |
| `/api/public/*` | 3 | 3 | 100% |
| `/dav/*` | 完整 WebDAV | 基础版 | 60% |
| 归档 `/ad/*` `/ae/*` | 3 | 3 | 100% |
| Torrent `/api/fs/torrent/*` | 4 | 4 (解析器) | 80% |
| 搜索 `/api/fs/search` | 1 | 1 | 100% |
| S3 `/s3/*` | 待定 | 骨架 | 30% |
| 消息 `/api/admin/message/*` | 2 | 2 | 100% |

### 待完成（后续版本）

- [ ] S3 网关完整实现（SigV4 签名校验、XML 响应）
- [ ] SSO / WebAuthn / LDAP 完整端点
- [ ] 5 个 reserved 驱动的完整 implementation
- [ ] 离线下载工具（aria2/qbit/tr）RPC 适配
- [ ] WebDAV LOCK/UNLOCK/If 完整语义
- [ ] 内嵌前端 Indexes/Messenger/WebAuthn/2FA 页面
- [ ] FileManager 状态重构与 UI 美化
- [ ] Vitest 端到端测试用例