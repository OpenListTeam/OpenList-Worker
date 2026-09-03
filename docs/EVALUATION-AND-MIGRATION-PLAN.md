# OpenListNext 迭代 & TSWorker 特性移植 — 综合评估与执行方案

> 生成时间：2026-09-03
> 主线决策：**方案 A** —— 以 `OpenList-Worker-Next`（openlistnext 基线）为迭代主线，TSWorker 仓库冻结（保留 `legacy-react` 分支），其独有特性（加密/权限/SQL/WebAuthn/媒体库）作为增量模块逐个移植。
> 参考仓库：Go 版 `OpenList/`、TSWorker `OpenList-TSWorker/`、官方前端 `OpenList-Frontend/`。

---

## 1. 驱动差异清单（第 1 步：先修补 next 的驱动）

### 1.1 数量对比

| 来源                                   | 驱动数量                                             | 说明           |
| -------------------------------------- | ---------------------------------------------------- | -------------- |
| Go 版（`OpenList/drivers/`）           | ~82 个（含 `crypt`/`virtual`/`url_tree` 等特殊驱动） | 全量基准       |
| OpenListNext（`src/backend/drivers/`） | 35 个                                                | 覆盖核心 ~40%  |
| TSWorker（`src/drive/`）               | ~22 个                                               | 有少量独有驱动 |

### 1.2 next 缺失的驱动（Go 有、next 无，约 48 个）

**可直接从 TSWorker 移植（降低工作量）**：

| 驱动             | Go 名称         | TSWorker 目录 | 优先级 |
| ---------------- | --------------- | ------------- | ------ |
| 115 网盘         | `115`           | `cloud115/`   | 高     |
| 123 云盘（base） | `123`           | `cloud123/`   | 高     |
| 阿里云盘（base） | `aliyundrive`   | `alicloud/`   | 中     |
| Cloudreve v4     | `cloudreve_v4`  | `cdrevev4/`   | 中     |
| 网易云音乐       | `netease_music` | `neteases/`   | 中     |
| OpenList 分享    | `openlist`      | `openlist/`   | 中     |
| TelDrive         | `teldrive`      | `teldrive/`   | 低     |
| 迅雷 X           | `thunderx`      | `thunderx/`   | 低     |
| 光宇盘（独有）   | —（Go 也没有）  | `guangyapan/` | 低     |

**需从 Go 移植（TSWorker 也没有）**：

| 驱动                                                                                                                                                                                                          | 优先级 | 备注                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| `crypt`（加密目录）                                                                                                                                                                                           | **高** | 与 TSWorker 的 `crypt/` 模块相关，见第 4 节 |
| `virtual`（虚拟目录）                                                                                                                                                                                         | 高     | 常用                                        |
| `alias`（别名目录，next 已有）                                                                                                                                                                                | —      | 已有                                        |
| `url_tree`                                                                                                                                                                                                    | 中     | 常用                                        |
| `alist_v3`                                                                                                                                                                                                    | 中     | AList 旧版兼容                              |
| `azure_blob`                                                                                                                                                                                                  | 中     | 对象存储                                    |
| `115`（base）、`123_link`、`123_open`                                                                                                                                                                         | 高     | 123/115 系列补全                            |
| `189_tv`、`189pc`                                                                                                                                                                                             | 低     | 189 系列                                    |
| `aliyundrive`（base）                                                                                                                                                                                         | 中     | 阿里系列补全                                |
| `autoindex`、`cloudreve`、`cnb_releases`、`github_releases`、`kodbox`、`teambition`、`febbox`、`mopan`、`degoo`、`mediafire`、`misskey`、`proton_drive`、`ipfs_api`、`chaoxing`、`lenovonas_share`、`ilanzou` | 低     | 长尾网盘，按需                              |
| `doubao`、`doubao_new`、`doubao_share`                                                                                                                                                                        | 中     | 豆包网盘                                    |
| `baidu_photo`、`google_photo`                                                                                                                                                                                 | 低     | 相册类                                      |
| `halalcloud`、`halalcloud_open`                                                                                                                                                                               | 低     |                                             |
| `quark_open`、`quark_uc`、`quark_uc_tv`                                                                                                                                                                       | 中     | 夸克系列补全                                |
| `strm`                                                                                                                                                                                                        | 中     | 流媒体列表                                  |
| `uss`（又拍云 USS）                                                                                                                                                                                           | 中     | 对象存储                                    |
| `thunder_browser`                                                                                                                                                                                             | 低     | 迅雷浏览器                                  |

### 1.3 驱动移植规范

所有新驱动必须实现 next 的统一接口 `src/backend/internal/driver/base.ts` 的 `StorageDriver`：

```ts
interface StorageDriver {
  init?(): Promise<void>
  list(virtualPath, physicalPath): Promise<FileItem[]>
  get(virtualPath, physicalPath): Promise<FileItem>
  mkdir / rename / remove / move / copy / put
}
```

- 纯 HTTP 协议驱动（绝大多数）：**容易**，直接照 Go 驱动逻辑翻译。
- 依赖 Node 专属模块的驱动（SFTP/FTP/SMB）：按 next 现有方式，边缘构建时替换为空实现。
- 移植时统一走 `pkg/http.ts` 的 `assertSafeUrl()` 做 SSRF 防护（对齐 raw.ts）。

---

## 2. next 代码评审报告（第 2 步：评估漏洞与合理性）

### 2.1 高风险（P0，必须修）

| 编号 | 问题                                                                            | 位置                                                 | 建议                                                                               |
| ---- | ------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| H1   | 管理员凭证/网盘 token（refresh_token/secret_access_key/SSH 私钥）明文存 KV/Blob | `internal/model/db.ts`、`internal/op/storage.ts:170` | 落盘前用 `pkg/crypto.ts` 的 `encrypt()` 加密敏感字段，密钥来自 `ENCRYPTION_SECRET` |
| H2   | 阿里云盘 `api_url_address` 可被配置成任意 URL，导致 SSRF + refresh_token 外泄   | `drivers/aliyundrive_open/util.ts:92`                | fetch 前 `assertSafeUrl()`，限制 https + 白名单域名                                |
| H3   | 代理下载上游响应头未过滤，存在响应头注入                                        | `server/raw.ts:160`                                  | 响应头白名单，剥离 Set-Cookie/Location                                             |
| H4   | `resolvePath` 对 `root_folder_path=/` 的存储跳过 containment 校验               | `internal/model/db.ts:1318`                          | 即使 root=/ 也确保物理路径无 `..` 段                                               |

### 2.2 中风险（P1）

| 编号 | 问题                                                     | 位置                                       | 建议                                        |
| ---- | -------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| M1   | 下载签名 HMAC 用 `===` 非恒定时间比较                    | `pkg/sign.ts:69`                           | 复用 `timingSafeEqual`                      |
| M2   | TOTP 二维码经第三方 `api.qrserver.com` 生成，secret 外泄 | `pkg/totp.ts:139`                          | 改为前端本地生成 QR                         |
| M3   | 密码固定 salt + 单次 SHA-256                             | `server/auth.ts:71`                        | 改 PBKDF2 ≥100k + 随机 salt，保留旧哈希迁移 |
| M4   | `crypto.ts` legacy 解密 1 次迭代 + 静态 salt             | `pkg/crypto.ts:213`                        | 检测到 legacy 时主动重加密                  |
| M5   | 上传请求体无大小上限，`arrayBuffer()` 全量读入内存       | `server/fs.ts:632/667/756`                 | 校验 Content-Length，超限 413               |
| M6   | 限流/防爆破 Map 阈值以下不清理                           | `server/router.ts:25`、`server/auth.ts:24` | 定时清理过期项                              |
| M7   | 客户端 IP 信任 `x-forwarded-for` 可伪造绕过限流          | `server/router.ts:28`                      | 仅在可信平台信任转发头                      |
| M8   | 驱动 `pathFileIdCache`/`driverCache` 无限增长            | `internal/op/storage.ts:80`                | 加 LRU/容量上限                             |

### 2.3 低风险（P2/P3）

- L1：多处空 `catch {}` 静默吞错（`pkg/utils.ts:50`、`internal/op/share.ts:88` 等）。
- L3：初始管理员密码明文打印到日志（`server/auth.ts:111/168`）。
- L4：`/api/debug/info` 未鉴权泄露运行时信息（`server/debug.ts:7`）。
- L7：死代码 —— `pkg/cron.ts` 的 `CronManager`（`setInterval` 常驻，与 Serverless 相悖）、`server/task.ts` 占位 handler 伪装成功。

### 2.4 正面确认（已正确，无需改）

- 路径穿越：`resolvePath` 规范化 + `..` 钳制 + share 路径 containment 校验均正确。
- SSRF：`pkg/http.ts` 的 `isSafeUrl` 覆盖 localhost/RFC1918/云元数据端点/整数 IP。
- `/public/settings` 白名单 + 敏感键正则双防线。
- `adminRouter` 统一鉴权，默认凭据已废弃。

---

## 3. GO 功能对照与实现可行性（第 3 步）

### 3.1 总体结论

next 已覆盖 **文件 CRUD、认证主流程、管理 CRUD、分享、下载代理** 等核心路径，按功能项计约 **60-65%**。缺口集中在两类：

1. **依赖长驻进程/队列**（离线下载、任务系统、索引构建、扫描）—— 与 Serverless 架构冲突，属「架构性缺失」。
2. **完整协议服务**（WebDAV/S3 网关/FTP/SFTP 服务端）—— 需 TCP 长连接监听，Serverless 不支持。

### 3.2 缺口与可行性分档

**第一批（容易，高价值，建议尽快补齐）**

| 功能                                 | 可行性 | 说明                             |
| ------------------------------------ | ------ | -------------------------------- |
| `fs/batch_rename`、`fs/regex_rename` | 容易   | 纯同步逻辑，封装现有 list/rename |
| `fs/remove_empty_directory`          | 容易   | 同步                             |
| `fs/recursive_move`                  | 中等   | 跨目录移动，可同步实现           |
| `fs/link`（获取直链）                | 容易   | 复用 `driver.get()→raw_url`      |
| MCP `tools/call` 实际执行            | 容易   | 补齐 list_files 到真实调用       |
| `admin/message`（get/send）          | 容易   | HTTP 推送，无状态                |
| `logout` 真正失效 token              | 中等   | KV 存 JWT 黑名单                 |

**第二批（中等，需评估外部依赖）**

| 功能                              | 可行性    | 说明                                  |
| --------------------------------- | --------- | ------------------------------------- |
| 搜索索引（meilisearch）           | 中等      | 接外部 Meilisearch，cron 端点触发构建 |
| `get_direct_upload_info` 独立路由 | 中等      | 从 `other` 拆出                       |
| 驱动补齐（高频项）                | 容易~中等 | 见第 1 节                             |

**第三批（困难，建议暂缓或改用外部服务）**

| 功能                                               | 说明                                        |
| -------------------------------------------------- | ------------------------------------------- |
| 离线下载全套（aria2/qbit/transmission + 网盘离线） | 用 Cloudflare Queues/Cron + 外部下载器      |
| 归档解压（archive meta/list/decompress）           | 压缩库 + 流式解压，内存受限                 |
| 任务系统（7 类任务管理器）                         | 用 Cloudflare Queues / Durable Objects 重建 |
| LDAP / SSO / WebAuthn                              | 需服务端状态或外部目录/平台                 |
| WebDAV / S3 网关 / FTP / SFTP 服务                 | 需 TCP 长连接，建议独立长驻服务承担         |

---

## 4. TSWorker 特性移植方案（第 4 步）

> 原则：TSWorker 特性作为「可选模块」移植到 next，默认关闭，不破坏 openlistnext 的核心架构。

| 特性                                 | TSWorker 位置                            | Go 是否有                            | 移植难度 | 建议                                                                             |
| ------------------------------------ | ---------------------------------------- | ------------------------------------ | -------- | -------------------------------------------------------------------------------- |
| **加密驱动/加密存储**                | `src/crypt/`                             | ✅（`drivers/crypt`）                | 中等     | 优先移植；做成独立 driver，复用 next 的 `StorageDriver` 接口                     |
| **路径级权限（group/mates/mount）**  | `src/group/`、`src/mates/`、`src/mount/` | ✅（`internal/model` 有 meta/mount） | 高       | next 现有 mount（storage mount_path）+ 无 meta；需扩展 db 模型，建议作为独立模块 |
| **SQL 持久化（Prisma/D1/MySQL/PG）** | `src/saves/`、`prisma/`                  | ❌（Go 用 SQLite/bbolt）             | 高       | 做成 KV/JSON 之外的「可选存储后端适配器」，不替换默认路径                        |
| **WebAuthn/FIDO2**                   | `src/route/webauthn.ts`                  | ✅（`webauthn.go`）                  | 中       | next 缺失；需外置 session/challenge 存储（KV）                                   |
| **媒体库**                           | `src/media/`、`route/mediaApi.ts`        | ❌                                   | 中       | next 独有增值功能；可整体迁移为独立路由组                                        |
| **离线下载（fetch/）**               | `src/fetch/`                             | ✅                                   | 困难     | 依赖长驻队列，见第 3 节第三批                                                    |
| **torrent 种子解析**                 | `src/torrent/`                           | ✅（部分）                           | 中       | 官方前端有 `/fs/torrent/*` 契约，建议补齐                                        |

### 4.1 建议移植顺序

1. **加密驱动（crypt）** —— 价值最高、与 next 驱动接口契合。
2. **WebAuthn** —— 认证安全刚需，Go 也有，工作量可控。
3. **媒体库** —— next 独有卖点。
4. **路径级权限/meta** —— 需扩展 db 模型，最后做。

---

## 5. 分阶段执行计划

### 阶段 0（已完成）

- [x] 决策主线（方案 A）
- [x] 驱动差异清单、代码评审、GO 功能对照、TSWorker 移植方案

### 阶段 1（P0，安全修复 + 高频驱动）

- [x] H1 敏感字段加密落盘（`internal/model/db.ts` 新增 sealDb/unsealDb，持久化边界加密 storages.addition / settings.token|sso_client_secret / users.otp_secret，`enc:v1:` 前缀向后兼容）
- [x] H2 阿里云盘 SSRF 修复（`drivers/aliyundrive_open/util.ts` 对 api_url_address 与绝对 URL 走 assertSafeUrl）
- [x] H3 代理下载响应头清洗（`server/raw.ts` 清洗 Content-Disposition 控制字符）
- [x] H4 resolvePath 纵深防御（`internal/model/db.ts` 物理路径拒绝 `..` 段）
- [x] M1 下载签名恒时比较（`pkg/sign.ts`）
- [x] 移植 `crypt` 加密驱动（`drivers/crypt/`，rclone crypt v1 兼容 AES-CTR 内容加密，off 文件名模式）
- [x] 移植 `virtual` 虚拟目录驱动（`drivers/virtual/`）
- [~] `115`/`123` 已通过别名覆盖（`115`→`Pan115Driver`、`123`→`Pan123Driver`），无需额外移植

### 阶段 2（P1，接口补齐 + 中风险）

- [x] M1 下载签名恒时比较（已在阶段1完成）
- [x] `batch_rename`/`regex_rename`/`recursive_move`/`remove_empty_directory`（`fs.ts`，对齐 Go fsbatch.go）
- [x] `link`/`get_direct_upload_info`（`fs.ts`，对齐 Go fsmanage.go/direct_upload.go）
- [x] MCP `tools/call` 实际执行（`internal/mcp/mcp.ts` 支持 list_files/get_system_info）
- [x] `admin/message/get|send`（`admin.ts`，进程内队列，对齐 Go message/http.go）
- [x] `logout` 真正失效 token（JWT jti 黑名单，`middlewares.ts` + `auth.ts`）
- [x] M5 上传大小上限（`fs.ts` put/form/upload/part 校验 Content-Length，超限 413）
- [x] M4 legacy 弱 KDF 提示（`crypto.ts`；sealDb 始终用强格式，任何保存自然升级）
- [x] M8 驱动缓存 LRU 上限（`storage.ts`）
- [~] M3 密码 PBKDF2：暂不改动（AList SHA-256 格式是与 Go 兼容的关键，改 PBKDF2 会破坏官方前端 `login/hash` 流程与 Go 迁移兼容）
- [ ] 补齐 `123_open`/`123_link`/`aliyundrive`/`quark_*`/`189_*`/`alist_v3`/`azure_blob`/`url_tree`/`uss`/`strm` 等驱动

### 阶段 3（P2，架构级特性）

- [ ] WebAuthn 移植
- [ ] 媒体库迁移
- [ ] 加密驱动完善（TSWorker crypt 特性对齐）
- [ ] SQL 持久化适配器（可选后端）

### 阶段 4（P3，长尾 + 清理）

- [ ] 长尾驱动按需补齐
- [ ] 清理死代码（cron.ts/task.ts 占位）
- [ ] 离线下载/任务系统走外部队列方案评估

---

## 6. 附：TSWorker 代码评审（原仓库，仅记录不再主改）

> 若未来需要回滚或参考，记录 TSWorker 已发现的问题（详见此前评审）：
>
> 1. `/api/fs/dirs` 用 GET，与官方前端/Go/next 的 POST 不一致。
> 2. `toObjResp` 冗余 `hashinfo`/`hash_info` 字段。
> 3. `provider: 'unknown'` 硬编码。
> 4. `canWrite` 只看 `isAdmin`，未按权限掩码。
> 5. `/fs/get` 通过列父目录 find，O(n) 低效。
> 6. `getFileType` 扩展名表简略。
> 7. CORS 白名单每次查库，性能隐患。
> 8. `BasicDriver` 接口太薄，驱动命名不统一。
