# OpenList-Worker-Next 迭代进度报告

> 更新日期：2026-09-03
> 主线决策：**方案 A** —— 以 `OpenList-Worker-Next`（openlistnext 基线）为迭代主线，TSWorker 仓库冻结，其独有特性作为增量模块移植。
> 参考仓库：Go 版 `OpenList/`、TSWorker `OpenList-TSWorker/`、官方前端 `OpenList-Frontend/`。
> 详细方案与评估见 [EVALUATION-AND-MIGRATION-PLAN.md](./EVALUATION-AND-MIGRATION-PLAN.md)。

---

## 一、总体进度概览

| 阶段   | 内容                                             | 状态      |
| ------ | ------------------------------------------------ | --------- |
| 阶段 0 | 评估与方案（驱动差异/代码评审/GO 对照/移植方案） | ✅ 完成   |
| 阶段 1 | P0 安全修复（5 项）                              | ✅ 完成   |
| 阶段 1 | 驱动移植（crypt / virtual）                      | ✅ 完成   |
| 阶段 2 | 接口对齐（9 项）                                 | ✅ 完成   |
| 阶段 2 | 安全加固（M4 / M5 / M8）                         | ✅ 完成   |
| 阶段 2 | 长尾驱动补齐                                     | ⏳ 待完成 |
| 阶段 3 | 特性移植（WebAuthn / 媒体库 / SQL）              | ⏳ 待完成 |
| 阶段 4 | 清理与长尾（死代码 / 架构性缺失）                | ⏳ 待完成 |

---

## 二、已完成工作 ✅

### 2.1 P0 安全修复（阶段 1）

| 编号 | 问题                                         | 修复                                                                | 文件                               |
| ---- | -------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| H1   | 网盘 token/密钥明文存 KV                     | 持久化边界字段级加密（`sealDb`/`unsealDb`，`enc:v1:` 前缀向后兼容） | `internal/model/db.ts`             |
| H2   | 阿里云盘 `api_url_address` SSRF + token 外泄 | fetch 前 `assertSafeUrl` 校验                                       | `drivers/aliyundrive_open/util.ts` |
| H3   | 代理下载响应头注入                           | 清洗 `Content-Disposition` 控制字符                                 | `server/raw.ts`                    |
| H4   | `resolvePath` root 挂载跳过 containment      | 物理路径拒绝任何 `..` 段                                            | `internal/model/db.ts`             |
| M1   | 下载签名非恒定时间比较                       | 改为恒定时间比较                                                    | `pkg/sign.ts`                      |

### 2.2 驱动移植（阶段 1）

| 驱动      | 说明                                                                                                                            | 文件                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `crypt`   | 加密目录（rclone crypt v1 兼容 AES-CTR 内容加密，off 文件名模式，scrypt 密钥派生，包装底层存储，下载解密走 `createReadStream`） | `drivers/crypt/cipher.ts` + `driver.ts` |
| `virtual` | 虚拟目录（随机占位文件/目录，压测用）                                                                                           | `drivers/virtual/driver.ts`             |

> 注：`115`/`123` 已通过别名覆盖（`115`→`Pan115Driver`、`123`→`Pan123Driver`），无需额外移植。

### 2.3 接口对齐（阶段 2，与 Go 版本一致）

| 接口                                  | 对齐的 Go 实现                                               |
| ------------------------------------- | ------------------------------------------------------------ |
| `POST /api/fs/batch_rename`           | `FsBatchRename`                                              |
| `POST /api/fs/regex_rename`           | `FsRegexRename`                                              |
| `POST /api/fs/recursive_move`         | `FsRecursiveMove`（含 `cancel`/`overwrite`/`skip` 冲突策略） |
| `POST /api/fs/remove_empty_directory` | `FsRemoveEmptyDirectory`                                     |
| `POST /api/fs/link`                   | `Link`（admin 权限）                                         |
| `POST /api/fs/get_direct_upload_info` | `FsGetDirectUploadInfo`                                      |
| `POST /admin/message/get` / `send`    | `message.HttpInstance`（进程内队列）                         |
| MCP `tools/call`                      | 实际执行 `list_files` / `get_system_info`                    |
| `logout` 真正失效 token               | JWT `jti` 黑名单（内存 + KV 尽力持久化）                     |

### 2.4 安全加固（阶段 2）

| 编号 | 内容                                                   | 文件                     |
| ---- | ------------------------------------------------------ | ------------------------ |
| M5   | 上传大小限制（put/form 25MB、分片单片 16MB，超限 413） | `server/fs.ts`           |
| M4   | legacy 弱 KDF 格式解密告警（sealDb 已自然升级）        | `pkg/crypto.ts`          |
| M8   | 驱动实例缓存 LRU 上限（100）                           | `internal/op/storage.ts` |

---

## 三、待完成工作 ⏳

### 3.1 长尾驱动补齐（约 48 个，从 Go / TSWorker 移植）

**高优先级（高频使用）**

| 驱动                                      | 来源                     | 状态      |
| ----------------------------------------- | ------------------------ | --------- |
| `123_open` / `123_link`                   | Go                       | 待移植    |
| `aliyundrive`（base）                     | Go / TSWorker `alicloud` | 待移植    |
| `quark_open` / `quark_uc` / `quark_uc_tv` | Go                       | 待移植    |
| `189_tv` / `189pc`                        | Go                       | 待移植    |
| `alist_v3`                                | Go                       | ✅ 已移植 |
| `url_tree`                                | Go                       | ✅ 已移植 |
| `azure_blob` / `uss`                      | Go                       | ✅ 已移植 |
| `strm`                                    | Go                       | ✅ 已移植 |

**中优先级**

| 驱动                                        | 来源                     | 状态   |
| ------------------------------------------- | ------------------------ | ------ |
| `cloudreve` / `cloudreve_v4`                | Go / TSWorker `cdrevev4` | 待移植 |
| `netease_music`                             | Go / TSWorker `neteases` | 待移植 |
| `doubao` / `doubao_new` / `doubao_share`    | Go                       | 待移植 |
| `teambition` / `kodbox` / `febbox`          | Go                       | 待移植 |
| `teldrive` / `thunderx` / `thunder_browser` | Go / TSWorker            | 待移植 |
| `openlist` / `openlist_share`               | Go / TSWorker            | 待移植 |

**低优先级（长尾）**

- `autoindex` / `cnb_releases` / `github_releases` / `ilanzou` / `mediafire` / `misskey` / `mopan` / `degoo` / `proton_drive` / `ipfs_api` / `chaoxing` / `lenovonas_share` / `baidu_photo` / `google_photo` / `halalcloud` / `halalcloud_open` 等

### 3.2 阶段 3 特性移植

| 特性                                      | 说明                                              | 优先级 |
| ----------------------------------------- | ------------------------------------------------- | ------ |
| crypt `standard` / `obfuscate` 文件名加密 | 需实现 AES-EME + base32 编码                      | 中     |
| crypt 流式解密                            | 当前整体读入内存，需 TransformStream 流式 AES-CTR | 中     |
| WebAuthn / FIDO2                          | 需外置 session/challenge 存储（KV）               | 中     |
| 媒体库                                    | 从 TSWorker 迁移 `media/` + `route/mediaApi.ts`   | 中     |
| SQL 持久化适配器                          | Prisma/D1 作为 KV 之外的可选后端                  | 低     |

### 3.3 代码评审遗留项（未处理）

| 编号 | 问题                                                     | 位置                           | 优先级 |
| ---- | -------------------------------------------------------- | ------------------------------ | ------ |
| M2   | TOTP 二维码经第三方 `api.qrserver.com` 生成，secret 外泄 | `pkg/totp.ts`                  | 中     |
| M6   | 限流/防爆破 Map 阈值以下不清理                           | `server/router.ts` / `auth.ts` | 低     |
| M7   | 客户端 IP 信任 `x-forwarded-for` 可伪造                  | `server/router.ts`             | 低     |
| L1   | 多处空 `catch {}` 静默吞错                               | 多处                           | 低     |
| L2   | `waitUntil` 吞错后 fallback await 行为不一致             | `storage.ts`                   | 低     |
| L3   | 初始管理员密码明文打印日志                               | `auth.ts`                      | 低     |
| L4   | `/api/debug/info` 未鉴权                                 | `server/debug.ts`              | 低     |
| L5   | 驱动层 fetch 外部直链未统一 SSRF 校验                    | 各驱动                         | 低     |
| L6   | `resolvePath` 全量 JSON.parse 开销                       | `db.ts`                        | 低     |
| L7   | 死代码（`pkg/cron.ts` setInterval、`task.ts` 占位）      | 多处                           | 低     |
| M3   | 密码 PBKDF2（因兼容性暂缓）                              | `auth.ts`                      | 暂缓   |

### 3.4 阶段 4 清理

- [ ] 清理死代码：`pkg/cron.ts` 的 `CronManager`（`setInterval` 常驻，与 Serverless 相悖）、`server/task.ts` 占位 handler、`fs.ts` 注释掉的 offline download 死代码
- [ ] 占位 task 端点返回明确「not implemented」而非伪装成功

---

## 四、架构性缺失（Serverless 限制，需外部服务承接）

以下功能与「Hono + CF Serverless」架构本质冲突，**不建议在 Worker 内实现**，应改用外部服务：

| 功能                                                      | 建议方案                               |
| --------------------------------------------------------- | -------------------------------------- |
| 归档解压（`/ad` `/ap` `/ae` `/sad` `archive/decompress`） | 压缩库 + 流式解压，或独立长驻服务      |
| 离线下载（aria2/qbit/transmission + 网盘离线）            | 独立自托管 aria2 / qBittorrent         |
| 任务系统（7 类任务管理器）                                | Cloudflare Queues / Durable Objects    |
| LDAP / SSO / WebAuthn                                     | 外部目录 / 身份平台                    |
| WebDAV / S3 网关 / FTP / SFTP 服务端                      | 独立长驻 Go 服务或自托管反代           |
| index/scan 真实执行                                       | 外部搜索引擎（Meilisearch）+ Cron 触发 |

---

## 五、修改文件清单

### 新增文件

| 文件                                                    | 说明                         |
| ------------------------------------------------------- | ---------------------------- |
| `docs/EVALUATION-AND-MIGRATION-PLAN.md`                 | 综合评估与执行方案           |
| `docs/PROGRESS-REPORT.md`                               | 本进度报告                   |
| `src/backend/drivers/crypt/cipher.ts`                   | crypt 加密算法               |
| `src/backend/drivers/crypt/driver.ts`                   | crypt 驱动                   |
| `src/backend/drivers/virtual/driver.ts`                 | virtual 驱动                 |
| `src/backend/drivers/alist_v3/types.ts` + `driver.ts`   | AList V3 驱动（HTTP 客户端） |
| `src/backend/drivers/url_tree/types.ts` + `driver.ts`   | UrlTree 驱动（URL 树）       |
| `src/backend/drivers/strm/types.ts` + `driver.ts`       | Strm 驱动（流媒体链接）      |
| `src/backend/drivers/azure_blob/types.ts` + `driver.ts` | Azure Blob 驱动              |
| `src/backend/drivers/uss/types.ts` + `driver.ts`        | USS 又拍云驱动               |

### 修改文件

| 文件                                           | 改动                          |
| ---------------------------------------------- | ----------------------------- |
| `src/backend/internal/model/db.ts`             | H1 静态加密 + H4 路径防御     |
| `src/backend/pkg/crypto.ts`                    | M4 legacy 告警                |
| `src/backend/pkg/sign.ts`                      | M1 恒时比较                   |
| `src/backend/drivers/aliyundrive_open/util.ts` | H2 SSRF 防护                  |
| `src/backend/server/raw.ts`                    | H3 响应头清洗                 |
| `src/backend/server/fs.ts`                     | 接口补齐（6 项）+ M5 上传限制 |
| `src/backend/server/admin.ts`                  | 驱动配置 + message            |
| `src/backend/internal/op/storage.ts`           | 驱动注册 + M8 LRU             |
| `src/backend/internal/mcp/mcp.ts`              | MCP tools/call                |
| `src/backend/server/mcp.ts`                    | await 异步化                  |
| `src/backend/server/middlewares.ts`            | logout 黑名单                 |
| `src/backend/server/auth.ts`                   | JWT jti + logout 失效         |
