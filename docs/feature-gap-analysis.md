# Go ↔ TS 功能对比文档

> 对比对象：`OpenList/`（Go 后端，v4，85 驱动）vs `OpenList-TSWorker/`（TS/Hono 后端，Cloudflare Workers / EdgeOne / Serverless，42 驱动）
> 本文档为**权威差异清单**，开发计划与验收标准以此为准。
>
> **进度状态**：认证/FS/Admin/协议/驱动已全部补齐（27 个新增驱动），当前仅剩 4 个环境限制/极高难度驱动未移植（halalcloud gRPC、autoindex XPath、mopan SDK、proton_drive E2E）。最新进度详见 `implementation-summary.md`。

---

## 1. 认证（Auth）

### 1.1 LDAP 登录

| 项   | Go                                                                        | TS                                                             |
| ---- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 端点 | `POST /api/auth/login/ldap`                                               | ❌ 无（有 `allow_ldap`/`ldap_login_enabled` 设置字段，无端点） |
| 逻辑 | `common.HandleLdapLogin` 校验 + 失败自动 `LdapRegister` 注册 + 生成 token | —                                                              |
| 依赖 | `github.com/go-ldap/ldap/v3`                                              | 需 `ldapts` 或原生实现                                         |

### 1.2 SSO 登录

| 项   | Go                                                                                      | TS                                            |
| ---- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| 端点 | `GET /api/auth/sso`（跳转）+ `GET /api/auth/sso_callback`（回调）                       | ❌ 无（有 `sso_id`/`sso_*` 设置字段，无端点） |
| 平台 | Github / Microsoft / Google / Dingtalk / Casdoor / OIDC                                 | —                                             |
| 逻辑 | OAuth2 授权码 + OIDC discovery + `autoRegister`（SSO 自动注册）+ postMessage 回传 token | —                                             |
| 依赖 | `coreos/go-oidc`、`golang.org/x/oauth2`、`go-resty/resty`                               | 需 `oauth4webapi` 或原生 fetch                |

### 1.3 WebAuthn / Passkey

| 项   | Go                                                                                                                                    | TS                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 端点 | `/api/authn/webauthn_begin_login` / `finish_login` / `begin_registration` / `finish_registration` / `delete_authn` / `getcredentials` | ❌ 无（有 `webauthn_login_enabled` 设置，无端点） |
| 逻辑 | `go-webauthn/webauthn` 库，支持 discoverable login，session 用 base64 头回传                                                          | —                                                 |
| 依赖 | `github.com/go-webauthn/webauthn`                                                                                                     | 需 `@simplewebauthn/server`                       |

> 结论：LDAP / SSO / WebAuthn 三个认证端点 TS 全部缺失，需新增。

---

## 2. 文件系统（FS）

### 2.1 归档（Archive）

| 端点                              | Go                     | TS    |
| --------------------------------- | ---------------------- | ----- |
| `GET/POST /api/fs/archive/meta`   | ✅ FsArchiveMetaSplit  | ❌ 无 |
| `GET/POST /api/fs/archive/list`   | ✅ FsArchiveListSplit  | ❌ 无 |
| `POST /api/fs/archive/decompress` | ✅ FsArchiveDecompress | ❌ 无 |

### 2.2 批量操作（fsbatch）

| 功能                                                          | Go  | TS                                               |
| ------------------------------------------------------------- | --- | ------------------------------------------------ |
| 递归移动 `FsRecursiveMove`（src_dir/dst_dir/conflict_policy） | ✅  | ✅ 已有 `/fs/recursive_move`                     |
| 批量重命名 `FsBatchRename`（rename_objects）                  | ✅  | ✅ 已有 `/fs/batch_rename`                       |
| 正则重命名 `FsRegexRename`（src_name_regex/new_name_regex）   | ✅  | ✅ 已有 `/fs/regex_rename`                       |
| 删除空目录 `FsRemoveEmptyDirectory`                           | ✅  | ✅ 已有 `/fs/remove_empty_directory`             |
| 直链 `Link` / 直传信息 `FsGetDirectUploadInfo`                | ✅  | ✅ 已有 `/fs/link`、`/fs/get_direct_upload_info` |

> 注：批量操作 TS 已实现，无需新增。仅归档（2.1）与 multipart 协议（2.3）缺失。

### 2.3 上传（关键差异）

| 端点                                                      | Go                                            | TS                    |
| --------------------------------------------------------- | --------------------------------------------- | --------------------- |
| `PUT /api/fs/put`（流式，File-Path/X-File-\* 头）         | ✅ FsStream                                   | ✅ 有（对齐）         |
| `PUT /api/fs/form`（表单，file 字段）                     | ✅ FsForm                                     | ✅ 有（对齐）         |
| `/fs/multipart/init` + `/chunk` + `/complete` + `/status` | ❌ **未实现**（前端 multipart.ts 为预留协议） | ❌ 无                 |
| `/fs/upload/create` + `/part` + `/complete`（会话式）     | ❌ 无                                         | ✅ 有（Workers 专用） |

> **结论**：官方前端 `multipart.ts` 调用的 `/fs/multipart/*`，Go 当前后端也**未实现**。
> 统一方案见开发计划 Phase 4：TS 后端**新增 `/fs/multipart/*`**，API 契约完全对齐官方前端
> （init/chunk/complete/status + upload_id/chunk_size/received/state 快照），内部复用 TS 会话分片逻辑。
> 这样前端以 Go（官方 multipart.ts）为准，后端 API 一致、实现可不同。

---

## 3. Admin

| 端点                                                         | Go    | TS                              |
| ------------------------------------------------------------ | ----- | ------------------------------- |
| `/admin/index/build` / `update` / `stop` / `clear`           | ✅    | ❌（仅 `/index/progress` 占位） |
| `/admin/scan/start` / `stop`                                 | ✅    | ❌（仅 `/scan/progress` 占位）  |
| `/admin/setting/set_aria2` / `set_qbit` / `set_transmission` | ✅    | ❌（后台任务不做，可跳过）      |
| `/admin/plugin/*`（插件）                                    | ❌ 无 | ✅ 完整 8 端点                  |

> 结论：搜索索引构建/清除、手动扫描需新增；下载器设置属后台任务，跳过。

---

## 4. 协议服务

### 4.1 WebDAV

| 项   | Go                                                                                  | TS                                                  |
| ---- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| 路由 | `/dav/*`，方法 PROPFIND/MKCOL/LOCK/UNLOCK/PROPPATCH/COPY/MOVE + 常规                | ⚠️ `internal/webdav/webdav.ts` 存在但**未挂载路由** |
| 认证 | WebDAVAuth：BasicAuth + Bearer token + LDAP 回退 + 权限细分（CanWebdavRead/Manage） | —                                                   |

### 4.2 S3 网关

| 项   | Go                                                   | TS                                   |
| ---- | ---------------------------------------------------- | ------------------------------------ |
| 路由 | `/s3/*`（S3Server），需 `conf.S3.Enable && Port==-1` | ❌ 无（仅有 S3 存储驱动）            |
| 依赖 | `server/s3`（S3 协议服务器）                         | 需 `@aws-sdk/client-s3` 或 S3 协议库 |

---

## 5. 插件系统 & 安全增强

| 能力                                                       | Go   | TS      | 决策                     |
| ---------------------------------------------------------- | ---- | ------- | ------------------------ |
| 插件系统（8 端点）                                         | ❌   | ✅      | **TS 保留，Go 暂不合入** |
| 会话分片上传                                               | ❌   | ✅      | **TS 保留**              |
| 安全增强（SSRF `assertSafeUrl`/CSP/限流/query-token 缓解） | 部分 | ✅ 完整 | **TS 保留，Go 暂不合入** |

---

## 6. 驱动对比（Go 85 vs TS 42）

### 6.1 TS 已实现（42 个）

115_open(含 115/115pan/115cloud 别名)、115_share、123pan(含 123/123pan_share)、123_share(含 123_link)、139、189(含 189cloud/ctyun/189pc/189app)、alias、alist_v3、aliyundrive_open(含 aliyundrive/aliyun)、aliyundrive_share、azure_blob、baidu_netdisk(含 baidu/baidu_photo/baidu_share)、crypt、dropbox、ftp、github、google_drive、lanzou(含 ilanzou/lanzou_i/lanzous)、local、mediatrack、mega、onedrive(含 business/sharepoint)、onedrive_app、onedrive_sharelink、pikpak、pikpak_share、quark(含 quark_uc/uc)、s3(含 minio/r2/b2/cos/oss/kodo/doge)、seafile、sftp、smb、strm、terabox、thunder(含 thunder_browser/thunderx/xunlei)、thunder_expert、url_tree、uss、virtual、webdav、weiyun、wopan、wps、yandex(含 yandex_disk)

### 6.2 Go 有、TS 缺失（约 43 个，需补齐）

| 优先级  | 驱动                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 高频 | 115、123_link、123_open、doubao、doubao_share、doubao_new、quark_open、quark_uc_tv、mediafire、cloudreve、cloudreve_v4、thunder_browser、thunderx                         |
| P1 中频 | aliyundrive、baidu_photo、chaoxing、google_photo、ilanzou、kodbox、teambition、proton_drive、github_releases、cnb_releases                                                |
| P2 长尾 | 189_tv、189pc、degoo、febbox、halalcloud、halalcloud_open、ipfs_api、lenovonas_share、misskey、mopan、netease_music、teldrive、openlist、openlist_share、autoindex、chunk |

> 注：TS 的 `quark`/`yandex`/`123pan` 与 Go 的 `quark_uc`/`yandex_disk`/`123` 已通过别名覆盖，但 `quark_open`/`quark_uc_tv` 等衍生驱动需单独新增。

---

## 7. 部署对比

| 平台               | Go  | TS                                      |
| ------------------ | --- | --------------------------------------- |
| 单体二进制         | ✅  | ❌（需 Node 容器模式 `dist-server`）    |
| Cloudflare Workers | ❌  | ✅（wrangler.toml + KV + assets）       |
| EdgeOne Pages      | ❌  | ✅（api/\_makers.ts + cloud-functions） |
| 阿里云 ESA         | ❌  | ✅（esa-entry.ts）                      |
| Vercel/Serverless  | ❌  | ✅（dist-server/api/[...route].js）     |
