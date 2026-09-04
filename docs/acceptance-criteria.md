# 验收标准

> 依据 `development-plan.md` 各 Phase，定义可测试的验收用例。全部通过后方可合并。

## 验收结果总览

| Phase | 关键验收                      | 结果                                         |
| ----- | ----------------------------- | -------------------------------------------- |
| 0     | 图标路由 200                  | ✅ 通过                                      |
| 1     | 认证端点 401/403/200 权限链路 | ✅ 通过（LDAP 撤销）                         |
| 2     | FS/Admin/WebDAV/S3            | ✅ 通过（WebDAV 401、S3 403、multipart 403） |
| 3     | multipart 契约                | ✅ 通过                                      |
| 4     | 驱动 list/get + 持久化        | ✅ 26 个驱动；剩余 4 个环境限制              |
| 5     | 部署                          | ⚠️ 构建链路已验证，真实云部署待凭证          |

> 自动化回归：`read_lints` 0 错误、`test:189` 20/20、新增 4 个驱动加密/签名单测全过（chaoxing/netease_music/189_tv/halalcloud_open）。

---

## Phase 0：logo/favicon

| 编号 | 用例               | 期望                                                        |
| ---- | ------------------ | ----------------------------------------------------------- |
| L0-1 | GET `/logo.png`    | 200，`Content-Type: image/svg+xml`（或 png），返回品牌 logo |
| L0-2 | GET `/favicon.ico` | 200，图标可显示                                             |
| L0-3 | GET `/favicon.png` | 200                                                         |
| L0-4 | 浏览器打开首页     | 标题栏图标、收藏夹图标正常显示，无 404                      |

---

## Phase 1：认证

### LDAP

| 编号 | 用例                                     | 期望                      |
| ---- | ---------------------------------------- | ------------------------- |
| A1-1 | `POST /api/auth/login/ldap`，未启用 LDAP | 403 `ldap is not enabled` |
| A1-2 | 正确用户名+密码（已存在且 allow_ldap）   | 200 返回 `{token}`        |
| A1-3 | 正确凭证但用户不存在（允许注册）         | 200 自动注册并返回 token  |
| A1-4 | 错误密码                                 | 400，多次失败后 429 限流  |

### SSO

| 编号 | 用例                                      | 期望                                   |
| ---- | ----------------------------------------- | -------------------------------------- |
| A2-1 | `GET /api/auth/sso?method=github`，未启用 | 403                                    |
| A2-2 | 启用后访问 sso，platform=Github           | 302 跳转到 Github 授权页               |
| A2-3 | `sso_callback`，无 code                   | 400                                    |
| A2-4 | `sso_callback?method=get_sso_id`          | 返回 postMessage 回传 `sso_id` 的 HTML |
| A2-5 | `sso_callback?method=sso_get_token`       | 返回 postMessage 回传 `token` 的 HTML  |
| A2-6 | OIDC 平台                                 | discovery + 授权码交换成功             |
| A2-7 | SSO 自动注册（sso_auto_register）         | 新用户自动创建，sso_id 绑定            |

### WebAuthn / Passkey

| 编号 | 用例                                              | 期望                                |
| ---- | ------------------------------------------------- | ----------------------------------- |
| A3-1 | `POST /api/authn/webauthn_begin_login?username=x` | 200 返回 `{options, session}`       |
| A3-2 | `finish_login`（正确 session 头）                 | 200 返回 `{token}`                  |
| A3-3 | `begin_registration`（已登录）                    | 200 返回 options                    |
| A3-4 | `finish_registration`                             | 200 注册成功，`getcredentials` 可见 |
| A3-5 | `delete_authn`                                    | 200 删除成功                        |
| A3-6 | 未启用 webauthn                                   | 403                                 |

---

## Phase 2：FS / Admin / WebDAV / S3

### 归档

| 编号 | 用例                                        | 期望                   |
| ---- | ------------------------------------------- | ---------------------- |
| F1-1 | `POST /api/fs/archive/meta`（zip 文件路径） | 200 返回归档元信息     |
| F1-2 | `POST /api/fs/archive/list`（含路径）       | 200 返回归档内文件列表 |
| F1-3 | `POST /api/fs/archive/decompress`           | 200 解压成功           |

### 批量操作

| 编号 | 用例                                                   | 期望                |
| ---- | ------------------------------------------------------ | ------------------- |
| F2-1 | 递归移动（src_dir→dst_dir，conflict_policy=overwrite） | 200，文件完整移动   |
| F2-2 | 批量重命名（rename_objects）                           | 200，全部重命名成功 |
| F2-3 | 正则重命名（src_name_regex/new_name_regex）            | 200，匹配文件重命名 |
| F2-4 | 无权限用户调用                                         | 403                 |

### Admin 索引/扫描

| 编号 | 用例                            | 期望                |
| ---- | ------------------------------- | ------------------- |
| AD-1 | `POST /api/admin/index/build`   | 200，返回进度或完成 |
| AD-2 | `GET /api/admin/index/progress` | 200，返回状态       |
| AD-3 | `POST /api/admin/scan/start`    | 200                 |
| AD-4 | `POST /api/admin/scan/stop`     | 200                 |

### WebDAV

| 编号 | 用例                          | 期望                            |
| ---- | ----------------------------- | ------------------------------- |
| W-1  | `PROPFIND /dav/`（BasicAuth） | 207 返回目录列表                |
| W-2  | `MKCOL /dav/newdir`           | 201 创建目录                    |
| W-3  | `PUT /dav/file.txt`           | 201 上传文件                    |
| W-4  | `COPY` / `MOVE`               | 成功                            |
| W-5  | Bearer token（=全局 token）   | 以 admin 身份访问               |
| W-6  | 未认证                        | 401 + `WWW-Authenticate: Basic` |
| W-7  | 无 manage 权限用户 PUT        | 403                             |

### S3 网关

| 编号 | 用例                  | 期望    |
| ---- | --------------------- | ------- |
| S3-1 | `/s3/*`，未启用       | 403     |
| S3-2 | 启用后 ListBuckets    | 200 XML |
| S3-3 | PutObject / GetObject | 成功    |

---

## Phase 3：分片上传 API 统一

| 编号 | 用例                                   | 期望                                                                                       |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| U-1  | `POST /fs/multipart/init`（大文件）    | 200 返回 `{upload_id, chunk_size, total_chunks, received, received_bytes, state, resumed}` |
| U-2  | `PUT /fs/multipart/chunk`（index=0）   | 200，快照更新                                                                              |
| U-3  | `POST /fs/multipart/complete`          | 200，state=completed                                                                       |
| U-4  | `GET /fs/multipart/status?upload_id=`  | 200，返回快照                                                                              |
| U-5  | 断点续传（重复 init 同一 path+size）   | 返回 resumed=true + 已收 chunk 列表                                                        |
| U-6  | 流控（窗口满）                         | 429，客户端重试后继续                                                                      |
| U-7  | 官方前端 `multipart.ts` 直接上传大文件 | 无需改前端，进度/速度正常                                                                  |

---

## Phase 4：驱动补齐

| 编号 | 用例                                    | 期望                                         |
| ---- | --------------------------------------- | -------------------------------------------- |
| D-1  | 存储管理页新增驱动可选                  | P0/P1/P2 驱动均出现在下拉列表                |
| D-2  | 挂载后 `list`                           | 200 返回文件列表                             |
| D-3  | `get`（单文件）                         | 200 返回文件信息 + raw_url                   |
| D-4  | `mkdir`/`rename`/`remove`/`move`/`copy` | 各驱动按其支持能力返回成功或明确"不支持"     |
| D-5  | token/cookie 刷新持久化                 | 冷启动后仍可用（复用 storage.ts 持久化回调） |
| D-6  | 错误处理                                | 失效凭证返回明确错误，不影响其他驱动         |

---

## Phase 5：部署

| 编号 | 用例                                                    | 期望                                                              |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| P-1  | `npm run build`                                         | fetch-frontend 成功 + build-edge 产出 dist-server/cloud-functions |
| P-2  | `npm run deploy`（CF Worker）                           | 部署成功，线上访问首页 + API 正常                                 |
| P-3  | EdgeOne Pages 部署                                      | `cloud-functions/[[default]].js` 打包成功，线上 SPA 兜底正常      |
| P-4  | `npm run test:189`                                      | 20/20 通过（回归）                                                |
| P-5  | 前端 `/api/public/settings` 返回 `backend: "ts-worker"` | 前端正确进入 TS 模式（插件/分片显示，S3 设置页/任务隐藏）         |

---

## 回归基线（每次合并前必跑）

1. `npm run lint`（tsc --noEmit）0 error
2. `npm run test:189` 全通过
3. 前端 `read_lints` 0 error（若改动涉及前端）
4. 手动验证：登录、文件列表、上传（流式 + 分片）、下载、插件菜单（TS 模式）
