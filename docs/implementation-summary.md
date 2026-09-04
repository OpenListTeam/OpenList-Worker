# Go ↔ TS 功能对齐实施总结

> 本次工程目标：将 OpenListNext（TSWorker / Cloudflare Workers）后端的功能对齐
> Go 版 OpenList，并统一前端到官方 OpenList-Frontend。本文档为最终实施总结。

---

## 1. 总体架构变更

### 1.1 前端统一

- 移除 TSWorker 内嵌前端源码（`src/` 前端部分 + `index.html` + `vite.config.ts` + 前端 CI）
- 前端统一由官方 `OpenList-Frontend` 提供（`feat/ts-backend-compat` 分支）
- 后端 `/api/public/settings` 返回 `backend: "ts-worker"`，前端运行时探测 GO/TS 模式
- `fetch-frontend.mjs` 从官方前端拉取构建产物（本地 dist / 本地仓库 / 同级探测 / git clone）

### 1.2 模式机制（`src/utils/backend.ts`，前端）

- `isTsWorker()` / `isGo()` 控制功能开关
- GO 模式：S3 设置、任务管理、multipart
- TS 模式：插件、会话分片（已统一为 multipart）、Face404

---

## 2. 已完成功能清单

### 2.1 认证（Auth）

| 功能               | 端点                                                        | 状态                                                       |
| ------------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| SSO 登录（6 平台） | `/api/auth/sso` + `/sso_callback`                           | ✅ 纯 fetch + Web Crypto，无依赖                           |
| WebAuthn / Passkey | `/api/authn/webauthn_*` + `getcredentials` + `delete_authn` | ✅ 手写 CBOR/COSE/签名验证                                 |
| LDAP               | `/api/auth/login/ldap`                                      | ⏸️ 已实现后撤销（Worker 无 TCP socket，Node 容器模式才有） |

### 2.2 文件系统（FS）

| 功能                 | 端点                | 状态         |
| -------------------- | ------------------- | ------------ | ------------ | ------------------------------------------------ | -------------------------------- | ----------------------- | --------------------- |
| 归档元数据/列表/解压 | `/fs/archive/meta   | list         | decompress`  | ✅ ZIP（DecompressionStream），rar/7z 返回不支持 |
| 分片上传（API 统一） | `/fs/multipart/init | chunk        | complete     | status`                                          | ✅ 契约对齐官方前端 multipart.ts |
| 批量操作             | `/fs/recursive_move | batch_rename | regex_rename | remove_empty_directory                           | link                             | get_direct_upload_info` | ✅ 已有（非本次新增） |

### 2.3 Admin

| 功能     | 端点                | 状态                             |
| -------- | ------------------- | -------------------------------- | --------- | ----- | --------- | --------------------- |
| 搜索索引 | `/admin/index/build | update                           | stop      | clear | progress` | ✅ 同步遍历 + KV 缓存 |
| 手动扫描 | `/admin/scan/start  | stop                             | progress` | ✅    |
| 后台任务 | —                   | ⏸️ 不做（Serverless 无常驻进程） |

### 2.4 协议服务

| 功能     | 端点                       | 状态                                                           |
| -------- | -------------------------- | -------------------------------------------------------------- |
| WebDAV   | `/dav/*`                   | ✅ PROPFIND/GET/PUT/MKCOL/DELETE/MOVE/COPY + Basic/Bearer 认证 |
| S3 网关  | `/s3/*`                    | ✅ ListBuckets/Get/Put/Head/DeleteObject（Bearer 认证）        |
| 品牌资源 | `/logo.png` + `/favicon.*` | ✅ 内嵌 SVG                                                    |

### 2.5 新增存储驱动（21 个）

| 驱动                          | 类型                                  | commit    |
| ----------------------------- | ------------------------------------- | --------- |
| 115（Open API）               | Bearer token                          | `0282f32` |
| cloudreve_v4                  | session token                         | `89d9ed5` |
| openlist（挂载实例）          | 对端 /api/fs 调用                     | `95ffbec` |
| teldrive                      | Bearer token                          | `2fb3788` |
| mediafire                     | session_token + form POST             | `1bb5245` |
| github_releases               | 只读发布源                            | `6825d76` |
| cnb_releases                  | 发布管理                              | `48ccfea` |
| kodbox                        | form POST + accessToken               | `7d19c42` |
| ipfs_api                      | HTTP JSON-RPC（ipfs/ipns/mfs）        | `ab45f57` |
| lenovonas_share               | 只读分享（stoken）                    | `59c1291` |
| misskey                       | JSON POST + Bearer                    | `2e47f91` |
| doubao（含 doubao_new/share） | Cookie + 签名                         | `2ee9a0e` |
| quark_open                    | SHA256 签名（x-pan-token）            | `0ef09d7` |
| quark_uc_tv（只读）           | SHA256+MD5 签名                       | `39a2f22` |
| 123_open                      | Bearer token                          | `f473d59` |
| teambition                    | Cookie                                | `944d0cd` |
| chaoxing（超星小组网盘）      | AES-CBC 登录 + Cookie                 | `4c51cc0` |
| google_photo                  | OAuth2 + REST                         | `a21b569` |
| febbox                        | OAuth2 client_credentials + multipart | `7873522` |
| degoo                         | GraphQL + JWT                         | `914f81e` |
| netease_music                 | weapi/linuxapi 加密                   | `c59c50b` |

---

## 3. 验证状态

- `read_lints`：后端 0 错误（仅 db.ts 7 个 pre-existing 警告）
- `test:189`：20/20 通过
- 新增驱动单测：
  - `chaoxing/util.test.ts`：AES-CBC 登录加密与 Node crypto 一致（2 用例）
  - `netease_music/crypto.test.ts`：raw RSA 与 Node crypto 一致 + weapi/linuxapi 输出格式（3 用例）
- 冒烟测试（wrangler dev 实际启动）：
  - 认证端点（SSO/LDAP/WebAuthn）未启用时正确返回 403
  - S3 未认证 403、WebDAV 未认证 401
  - `/logo.png` / `/favicon.*` 返回 200 + image/svg+xml
  - multipart status 404 / init 403 权限校验正确

---

## 4. 剩余工作（未完成）

### 4.1 剩余缺失驱动（6 个）

| 分类               | 驱动            | 说明                                                                   |
| ------------------ | --------------- | ---------------------------------------------------------------------- |
| Worker 环境限制    | halalcloud      | gRPC + protobuf，需要 TCP socket（同 LDAP/SFTP/FTP），仅 Node 容器可用 |
| Worker 环境限制    | autoindex       | 用户自定义 XPath 解析 HTML，Worker 无 DOM/XPath 引擎                   |
| 高难度（交互登录） | 189_tv          | 二维码扫码登录 + HMAC 签名 + 批量任务 + 断点上传                       |
| 高难度（签名）     | halalcloud_open | open API，涉及签名 + 上传协议                                          |
| 高难度（SDK 逆向） | mopan           | mopan-sdk-go 逆向，登录含短信验证码                                    |
| 高难度（E2E 加密） | proton_drive    | Proton Drive E2E 加密（PGP/session key 协议）                          |

> 纯 REST、主流签名、AES/weapi/GraphQL 类驱动（doubao/quark_open/quark_uc_tv/123_open/teambition/chaoxing/google_photo/degoo/febbox/netease_music）已全部移植完成。

### 4.2 部署验证

- CF Worker / EdgeOne Pages 实际线上部署需真实云凭证，本地 `wrangler dev` 已验证可启动。

---

## 5. 关键设计决策

1. **分片上传**：前端统一用官方 multipart 协议（`/fs/multipart/*`），后端 API 一致、实现可不同（TS 内部桥接会话分片）。存储不支持分片时返回 `data:null`，前端自动回退流式上传。
2. **LDAP**：Worker Edge isolate 无原始 TCP socket（同 SFTP/FTP），LDAP 仅 Node 容器模式可用。
3. **归档**：仅 ZIP（Worker 内置 DecompressionStream），rar/7z 明确返回不支持。
4. **后台任务**：Serverless 无常驻进程，任务系统不做。
5. **安全增强**：SSRF 防护、CSP、限流等 TS 保留，Go 暂不合入。
6. **插件系统**：TS 保留，Go 暂不合入。

---

## 6. 提交历史（本次工程）

```
c59c50b feat(driver): add netease_music storage driver
914f81e feat(driver): add degoo storage driver
7873522 feat(driver): add febbox storage driver
a21b569 feat(driver): add google_photo storage driver
4c51cc0 feat(driver): add chaoxing storage driver
48ccfea feat(driver): add cnb_releases storage driver
6825d76 feat(driver): add github_releases storage driver
1bb5245 feat(driver): add mediafire storage driver
2fb3788 feat(driver): add teldrive storage driver
95ffbec feat(driver): add openlist storage driver
89d9ed5 feat(driver): add cloudreve_v4 storage driver
0282f32 feat(driver): add 115 storage driver
0851622 Revert LDAP
9f1e42e fix(s3): on('HEAD')
6c25421 feat(ldap): LDAP login
b9d0ee7 feat(s3): S3 gateway
e245c24 feat(webauthn): WebAuthn/Passkey
1136c4d feat(sso): SSO login
1e7d1a2 feat(fs): archive endpoints
a0ab9e5 feat(admin): index/scan
e206f34 feat(webdav): WebDAV service
b4b30b3 feat(upload): multipart protocol
6d7c5aa feat(assets): logo/favicon
0f61194 refactor: remove embedded frontend
```
