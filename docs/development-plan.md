# 开发计划

> 依据 `feature-gap-analysis.md`。目标仓库：`OpenList-TSWorker/`（后端），`OpenList-Frontend/`（前端，仅在分片上传 API 对齐时可能无需改动）。

---

## Phase 0：修复 logo/favicon（前置，影响面小）

**任务**

- 后端新增 `/logo.png`、`/favicon.png`、`/favicon.ico`、`/favicon.svg` 路由，返回内嵌 OpenList 品牌 SVG（零外部依赖）。
- 校验 `public.ts` 的 `logo`/`favicon` 字段指向正确路径。

**文件**

- `src/backend/server/router.ts`（新增静态图标路由）
- 可能新增 `src/backend/server/assets.ts`

**验收**

- 访问 `/logo.png` 返回 200 + image/svg+xml；前端标题栏/收藏夹图标不再裂开。

---

## Phase 1：认证端点（LDAP / SSO / WebAuthn）

### 1.1 LDAP

**任务**：新增 `POST /api/auth/login/ldap`

- 复用现有 `ldap_login_enabled` 设置；实现 `HandleLdapLogin`（bind 校验）+ 失败自动注册 `LdapRegister`。
- 依赖：`ldapts`（纯 TS，兼容 Workers）。

**文件**：`src/backend/server/auth.ts`（新增端点）、`src/backend/internal/auth/ldap.ts`（新增）

### 1.2 SSO

**任务**：新增 `GET /api/auth/sso` + `GET /api/auth/sso_callback`

- 支持 Github / Microsoft / Google / Dingtalk / Casdoor / OIDC 六平台。
- OAuth2 授权码流 + OIDC discovery；`autoRegister` 自动注册；兼容模式 postMessage 回传 token/sso_id。
- 依赖：原生 fetch（不引入 oauth4webapi 亦可，需手动实现）。

**文件**：`src/backend/server/auth.ts`、`src/backend/internal/auth/sso.ts`（新增）

### 1.3 WebAuthn / Passkey

**任务**：新增 `/api/authn/webauthn_*` + `/getcredentials` + `/delete_authn`

- begin_login / finish_login / begin_registration / finish_registration + discoverable login。
- session 用 base64 头回传（与 Go 一致）。
- 依赖：`@simplewebauthn/server`（纯 TS，兼容 Workers）。

**文件**：`src/backend/server/authn.ts`（新增）、`src/backend/internal/auth/webauthn.ts`（新增）

**验收**：三个认证端点与 Go API 契约一致（见验收文档），前端登录页 SSO/WebAuthn 按钮可用。

---

## Phase 2：文件系统 + Admin + WebDAV + S3

### 2.1 归档 API

**任务**：新增 `/fs/archive/meta`、`/fs/archive/list`、`/fs/archive/decompress`

- 依赖归档解析库（TS 侧可用 `@ts-stack/archive` 或自行实现 zip 读取）。
- 注：Worker 环境内存受限，archive/decompress 大文件需评估可行性。

**文件**：`src/backend/server/fs.ts`、`src/backend/internal/archive/*`（新增）

### 2.2 批量操作

**任务**：新增递归移动 / 批量重命名 / 正则重命名

- `FsRecursiveMove`（src_dir/dst_dir/conflict_policy）
- `FsBatchRename`（rename_objects）
- `FsRegexRename`（src_name_regex/new_name_regex）
- 复用现有 `moveItems`/`renameItem` 基础能力。

**文件**：`src/backend/server/fs.ts`

### 2.3 Admin 索引/扫描

**任务**：新增 `/admin/index/build|update|stop|clear`、`/admin/scan/start|stop`

- Worker 无后台常驻，索引/扫描用"请求内同步 + KV 状态"实现，返回 progress。
- 需先补齐搜索索引的 KV 存储层。

**文件**：`src/backend/server/admin.ts`、`src/backend/internal/index/*`（新增）

### 2.4 WebDAV

**任务**：挂载现有 `internal/webdav/webdav.ts` 到 `/dav/*`

- 实现 WebDAVAuth：BasicAuth + Bearer token + LDAP 回退 + 权限细分（Read/Manage）。
- 支持 PROPFIND/MKCOL/LOCK/UNLOCK/PROPPATCH/COPY/MOVE。

**文件**：`src/backend/server/router.ts`（挂载）、`src/backend/server/webdav_auth.ts`（新增）

### 2.5 S3 网关

**任务**：新增 `/s3/*` S3 协议服务器

- 需 `conf.S3.Enable` 开关 + Port 判断。
- 依赖：`@aws-sdk/client-s3` 或实现 S3 REST 协议。
- 注：S3 网关在 Serverless 下性能受限，优先保证 API 契约一致。

**文件**：`src/backend/server/s3.ts`（新增）、`src/backend/internal/s3/*`（新增）

---

## Phase 3：分片上传 API 统一（前端以 Go 为准）

**目标**：TS 后端新增 `/fs/multipart/*`，API 契约与官方前端 `multipart.ts` **完全一致**，内部复用 TS 会话分片逻辑（`/fs/upload/*`）。

**任务**

- 新增 `POST /fs/multipart/init`：请求头 `File-Path`/`X-File-Size`/`X-Chunk-Size`/`X-File-Md5|Sha1|Sha256`/`Last-Modified`/`Password`/`Overwrite`；返回 `{upload_id, chunk_size, total_chunks, received, received_bytes, state, resumed}`。
- 新增 `PUT /fs/multipart/chunk`：请求头 `X-Upload-Id`/`X-Chunk-Index`；支持 429 流控 + 409 重试。
- 新增 `POST /fs/multipart/complete`：请求头 `X-Upload-Id`。
- 新增 `GET /fs/multipart/status?upload_id=`：返回快照。
- 内部：upload_id 映射到 TS 现有 upload session；chunk 复用 `/fs/upload/part` 逻辑；state 机对齐 `receiving/completed/failed_retriable/failed_permanent/aborted`。

**文件**

- `src/backend/server/fs.ts`（新增 4 路由）
- `src/backend/internal/upload/multipart.ts`（新增，适配层）

**验收**：官方前端 `multipart.ts`（`isGo()` 分支改为通用，或前端去除 backend 分流）在 TS 后端直接工作，无需改前端。

---

## Phase 4：驱动补齐（43 个）

**分三批**：

- **P0（13）**：115、123_link、123_open、doubao、doubao_share、doubao_new、quark_open、quark_uc_tv、mediafire、cloudreve、cloudreve_v4、thunder_browser、thunderx
- **P1（10）**：aliyundrive、baidu_photo、chaoxing、google_photo、ilanzou、kodbox、teambition、proton_drive、github_releases、cnb_releases
- **P2（20）**：189_tv、189pc、degoo、febbox、halalcloud、halalcloud_open、ipfs_api、lenovonas_share、misskey、mopan、netease_music、teldrive、openlist、openlist_share、autoindex、chunk 等

**每个驱动**

- 参考 Go `drivers/<name>/` 移植到 TS `src/backend/drivers/<name>/`。
- 在 `src/backend/internal/op/storage.ts` 的 `createDriver` 注册 + 别名映射。
- 实现 `StorageDriver` 接口（list/get/mkdir/rename/move/copy/remove/put + init）。

**文件**：每驱动新增目录 + `storage.ts` 注册

**验收**：新增驱动在存储管理页可选、可挂载、可 list/get（见验收文档）。

---

## Phase 5：部署流程实际验证

**任务**

- CF Worker：`npm run build` → `npm run deploy` 跑通，线上访问验证。
- EdgeOne Pages：`cloud-functions/[[default]].js` 打包 + EdgeOne CLI 部署验证。
- 验证删除前端源码后（当前状态），`fetch-frontend.mjs` 正确拉取官方前端产物。

**文件**：`wrangler.toml`、`scripts/deploy.js`、EdgeOne 配置（如需要）

---

## 依赖关系

```
Phase 0 (logo) ────────────── 独立，先做
Phase 1 (认证) ────────────── 独立
Phase 2 (FS/Admin/WebDAV/S3) ─ 依赖现有 fs/admin 基础
Phase 3 (分片统一) ────────── 依赖 Phase 0 后前端可测
Phase 4 (驱动) ────────────── 独立，工作量大，可并行
Phase 5 (部署验证) ────────── 依赖 Phase 0（前端产物就绪）
```

## 建议执行顺序

1. Phase 0（快赢）→ 2. Phase 5（先验证部署链路）→ 3. Phase 3（分片统一，前端即可全功能）→ 4. Phase 1（认证）→ 5. Phase 2（FS/Admin/WebDAV/S3）→ 6. Phase 4（驱动，P0→P1→P2）
