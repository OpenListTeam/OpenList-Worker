# PR: 配置精简与密钥统一

**分支**：`feat/edgeone-kv-proxy` → `main`
**类型**：`refactor` + `fix`（含破坏性配置变更）
**范围**：36 个文件，+310 / −545 行（净减 235 行）

---

## 一、摘要

本次改动聚焦三件事：

1. **统一密钥**：`JWT_SECRET` 一个变量承担签名、字段加密、定时任务鉴权三重职责
2. **精简配置**：删除 5 个废弃/冗余环境变量，收敛 4 组绑定名别名
3. **修复缺陷**：MySQL 方言崩溃、`sshkeys` 表数据丢失、Edge 代理缓存失效、并发密钥重复生成

目标：**用户最少只需配置 1 个变量**（`JWT_SECRET`），其余全部有合理默认值。

---

## 二、环境变量变更总览

### 2.1 新增/合并（用户侧）

| 变量 | 状态 | 说明 |
|---|---|---|
| `JWT_SECRET` | **合并承担** | 签名 + 字段加密 + 定时任务鉴权（≥16 字符） |
| `ADMIN_PASS` | 重命名 | 原 `ADMIN_PASSWORD`，跳过安装向导自动初始化 admin |
| `ALLOW_URLS` | 重命名 | 原 `ALLOWED_ORIGINS`，CORS 白名单 |

### 2.2 删除

| 变量 | 替代方案 |
|---|---|
| `ENCRYPTION_SECRET` | 用 `JWT_SECRET` |
| `CRON_SECRET` | 用 `JWT_SECRET` |
| `DATABASE_JSON` | 已移除（仅测试用途，改用公开 API 写入内存库） |
| `TABLE_PREFIX` | 表前缀**固定为 `x_`**，不可再配置 |
| `DB_JSON_BACKEND` | 用 `DB_DRIVER` |
| `DATABASE_URL` | 用 `MYSQL_URL` |

### 2.2b 变量名长度统一（>10 → 10）

所有超过 10 字符的环境变量统一缩写为 10 字符，不足 10 的保持不变：

| 旧名 | 新名 |
|---|---|
| `MAX_UPLOAD_SIZE` | `MAX_UPLOAD` |
| `MAX_PART_SIZE` | `MAX_UPPART` |
| `CDN_URL` | `ASSET_URLS` |
| `SEED_SOURCE_ALLOWED_HOSTS` | `ALLOW_SEED` |
| `MYSQL_PASSWORD` | `MYSQL_PASS` |
| `MYSQL_DATABASE` | `MYSQL_NAME` |
| `CF_ACCOUNT_ID` | `CF_ACCOUNT` |
| `CF_KV_NAMESPACE_ID` | `CF_KV_UUID` |
| `CF_API_TOKEN` | `CF_API_KEY` |

### 2.3 绑定名收敛（固定名）

| 原先识别的名称 | 现在 |
|---|---|
| `EDGEONE_KV` / `EO_KV` / `KV` / `CF_KV` / `DATABASE_KV` / `EDGEONE_KV_NAME` / `KV_NAMESPACE` / `KV_NAME` | **`KV`** |
| `DO_BINDING` / `DO` | **`DO`** |
| `SCF_FUNCTIONNAME` / `TENCENTCLOUD_SCF_FUNCTIONNAME` | **`TENCENTCLOUD_SCF_FUNCTIONNAME`**（平台注入） |

### 2.4 完整可选变量清单

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DB_DRIVER` | `auto` | `auto`/`blob`/`cfkv`/`kv`/`d1`/`do`/`mysql` |
| `DB_FORMAT` | `map` | `map`/`key`/`sql` |
| `MAX_UPLOAD` | `26214400`（25MB） | 整体上传上限（字节） |
| `MAX_UPPART` | `16777216`（16MB） | 分片单片上限（字节） |
| `ASSET_URLS` | — | 前端资源 CDN，支持 `$version` 占位符 |
| `ALLOW_SEED` | — | 种子数据来源主机白名单 |
| `MYSQL_URL` | — | MySQL 连接串（优先） |
| `MYSQL_HOST` 等 5 项 | — | MySQL 分项配置 |
| `CF_ACCOUNT` / `CF_KV_UUID` / `CF_API_KEY` | — | Cloudflare KV REST |

> 完整说明见 `wrangler.toml` 与 `docs/storage-architecture.md`。

---

## 三、缺陷修复

### 3.1 MySQL 方言导致的运行时崩溃

`format/sql.ts` 使用 SQLite 专属语法 `INSERT OR REPLACE`，在 MySQL 上必然报语法错误。

**修复**：新增 `upsertSql()`，按 `driver.name` 分支——SQLite 用 `INSERT OR REPLACE`，MySQL 用 `ON DUPLICATE KEY UPDATE`。覆盖 `saveRecord()` 与 `schema_info` 初始化标记两处。并新增回归测试（mock 驱动名设为 `mysql`，若方言分支失效则测试失败）。

### 3.2 `sshkeys` 表清空 Go 后端数据（数据丢失）

TS 侧把 SSH 公钥存在 `user.ssh_keys` 内，从不写顶层 `db.sshkeys`；但 Go 后端将其存在独立的 `x_ssh_public_keys` 表。当 `DB_FORMAT=sql` 且与 Go 共享同一物理库时，`sqlFormat.save()` 会执行 `DELETE FROM x_ssh_public_keys` 再写入空数组，**清空 Go 写入的 SSH 公钥**。

**修复**：拆分表名列表——
- `TABLE_NAMES`（6 张）：参与 `load/save` 往返
- `DDL_TABLE_NAMES`（7 张）：仅用于建表，含 `sshkeys`，保证与 Go 共享库时结构一致

### 3.3 Edge KV 代理密钥缓存失效

`functions/_kv-proxy.js` 的 `cachedSecret` 是模块级常量且**永不失效**。Node 侧生成/轮换密钥并写入 KV 后，Edge 实例仍持有旧值（可能长达数小时），导致 `X-Internal-Call` 鉴权全部 401。

**修复**：**彻底删除缓存**。每次直读 `env.JWT_SECRET` → 回退 KV。env 读取开销可忽略，KV 读取仅在未配置 env 时发生。用最简单的实现换取"永不失效"。

### 3.4 并发场景加密密钥重复生成

`ensureEncryptionSecret` 存在"读-写竞态"：Cloudflare KV 等最终一致存储存在写入传播延迟，两次并发 setup（如双击提交）可能都读到空值并各自生成密钥，后者覆盖前者，导致先前用旧密钥加密的数据永久无法解密。

**修复**：加入**进程内单飞（inflight 合并）**，同一实例内的并发调用共享同一次生成结果。

### 3.5 驱动缓存串味

`getStorageBackend` 的缓存键仅为 `driver:format:runtime`。`auto` 模式下驱动探测结果取决于「该 env 里有哪些绑定」，同一进程内先后出现两个不同 env 时会返回错误驱动。

**修复**：缓存键加入 `envFingerprint`（env 对象的 WeakMap 自增 ID）。

### 3.6 KV `get()` 签名不兼容

Cloudflare KV 使用 `get(key, "text")`，EdgeOne KV 使用 `get(key, {type:"text"})`。

**修复**：按序尝试两种签名，并把对象返回值归一化为 string，保持 `Driver.get` 契约。

### 3.7 缺失的类型定义

`driver/kv.ts` 引用了 `types.ts` 从未导出的 `EnvContext`，导致 `tsc` 一直报错。

**修复**：补充类型定义。

---

## 四、其他改进

- **删除死代码**：`d1Backend` / `mysqlBackend` / `jsonBackend` 兼容分支、`readJsonBackend`、`TABLE_EXTRA_COLUMNS`、`StoreDriver` 类型、`keyCol` 死变量
- **修复乱码文档**：`keycodec.ts`、`format/key.ts`、`README.md` 等处仍写 `openlist_tbl_*` 前缀（实际已移除）
- **修正文档错误**：`docs/storage-architecture.md` 中 MySQL 变量名（原误写 `MYSQL_DSN`/`SQL_DSN`）、运行时探测项
- **`wrangler.toml`**：清理废弃项，补充全部可选变量注释模板

---

## 五、验证结果

```
tsc --noEmit         → 0 错误
store.test.ts        → 9/9 通过
storage.test.ts      → 4/4 通过
scripts/_regress.mjs → ALL PASS（48 项）
build-edge.mjs       → 产物已重新生成，无旧变量残留
```

> 备注：`default_credentials.test.ts` 有 2 个用例失败，经 `git stash` 验证**在本次改动前即已失败**（`getDb` 按 env 对象缓存导致的测试隔离问题），与本次改动无关。

---

## 六、⚠️ 老用户迁移指南

本次包含**破坏性配置变更**。请按下表逐一核对现有部署的环境变量。

### 6.1 必做：密钥变量合并

**如果你当前设置了 `ENCRYPTION_SECRET`：**

```
# 旧配置
ENCRYPTION_SECRET=abc123...
JWT_SECRET=xyz789...

# 迁移后（关键：让 JWT_SECRET 保持为原 ENCRYPTION_SECRET 的值）
JWT_SECRET=abc123...
# 删除 ENCRYPTION_SECRET
```

> **为什么？** 字段加密密钥的来源已统一为 `JWT_SECRET`。你已有的网盘凭据、OTP 密钥等敏感数据是用 `ENCRYPTION_SECRET` 加密的。若直接把 `JWT_SECRET` 改成原来的 `JWT_SECRET` 值，这些数据将**无法解密**。
>
> **安全说明**：若解密失败，`unsealValue` 会**保留原始密文不丢数据**（敏感字段会显示为 `enc:v1:...` 形式）。此时把 `JWT_SECRET` 改回原 `ENCRYPTION_SECRET` 的值即可恢复。

**如果你只设置了 `JWT_SECRET`（未设 `ENCRYPTION_SECRET`）：**

无需任何操作，行为完全不变。

**如果你两个都没设：**

系统会自动生成并持久化密钥，无需操作。

### 6.2 必做：删除已废弃变量

以下变量已不再读取，**请从部署配置中删除**（保留无害，但会造成误解）：

- `CRON_SECRET` → 定时任务现复用 `JWT_SECRET`。**注意**：EdgeOne Schedules 的请求需改用 `?cron_secret=<你的 JWT_SECRET>`（参数名保留，值改为 JWT_SECRET）。
- `DATABASE_JSON` → 已移除
- `TABLE_PREFIX` → 表前缀固定 `x_`，**不可再配置**。若你之前设了非 `x_` 的前缀，需要手动重命名数据库表（见 6.4）
- `DB_JSON_BACKEND` → 改用 `DB_DRIVER`

### 6.3 必做：变量重命名

| 旧名 | 新名 |
|---|---|
| `ADMIN_PASSWORD` | `ADMIN_PASS` |
| `ALLOWED_ORIGINS` | `ALLOW_URLS` |

### 6.4 按需：表前缀变更（仅 `DB_FORMAT=sql` 且自定义过前缀）

若你之前设置了 `TABLE_PREFIX="custom_"`，现在需要把表重命名为 `x_` 前缀（或保持数据不动、接受两种前缀无法兼容）：

```sql
-- 示例（MySQL / D1），按需调整
RENAME TABLE custom_setting_items TO x_setting_items;
RENAME TABLE custom_sharing_dbs   TO x_sharing_dbs;
RENAME TABLE custom_storages      TO x_storages;
RENAME TABLE custom_users         TO x_users;
RENAME TABLE custom_metas         TO x_metas;
RENAME TABLE custom_plugins       TO x_plugins;
```

> 若你从未设置过 `TABLE_PREFIX`（即一直用默认 `x_`），**无需任何操作**。

### 6.5 按需：KV / DO 绑定名

本次把绑定名固定为 `KV` 与 `DO`，不再支持自定义名称。

- **若你的绑定名已经是 `KV` / `DO`**：无需操作
- **若你用了自定义绑定名**（如 `EDGEONE_KV_NAME=MY_KV`）：请在 `wrangler.toml` 或控制台把绑定名改为 `KV`

### 6.6 按需：MySQL 变量

若你设置了 `MYSQL_DSN` / `SQL_DSN`，请改用 `MYSQL_URL`，或使用 `MYSQL_HOST` 等分项配置。

### 6.7 迁移速查表

| 你的旧配置 | 需要做什么 |
|---|---|
| 只设 `JWT_SECRET` | ✅ 无需操作 |
| 设了 `ENCRYPTION_SECRET` | ⚠️ 把 `JWT_SECRET` 值改为原 `ENCRYPTION_SECRET` 值，删除 `ENCRYPTION_SECRET` |
| 设了 `CRON_SECRET` | ⚠️ 删除它；调度请求改用 `?cron_secret=<JWT_SECRET>` |
| 设了 `ADMIN_PASSWORD` | ⚠️ 重命名为 `ADMIN_PASS` |
| 设了 `ALLOWED_ORIGINS` | ⚠️ 重命名为 `ALLOW_URLS` |
| 设了 `TABLE_PREFIX` | ⚠️ 删除它；如为非 `x_` 需迁移表名 |
| 设了 `DATABASE_JSON` | ⚠️ 删除它 |
| 设了 `DB_JSON_BACKEND` | ⚠️ 改用 `DB_DRIVER` |
| 自定义 KV/DO 绑定名 | ⚠️ 改为 `KV` / `DO` |
| 用 `MYSQL_DSN`/`SQL_DSN` | ⚠️ 改用 `MYSQL_URL` |

### 6.8 变量名统一为不超过 10 字符

本次把所有**超过 10 字符**的环境变量缩写为 10 字符（不足 10 的保持不变）。如你用到以下变量，请改名：

| 旧名 | 长度 | 新名 |
|---|---|---|
| `MAX_UPLOAD_SIZE` | 15 | `MAX_UPLOAD` |
| `MAX_PART_SIZE` | 13 | `MAX_UPPART` |
| `CDN_URL` | 7 | `ASSET_URLS` |
| `SEED_SOURCE_ALLOWED_HOSTS` | 25 | `ALLOW_SEED` |
| `MYSQL_PASSWORD` | 14 | `MYSQL_PASS` |
| `MYSQL_DATABASE` | 14 | `MYSQL_NAME` |
| `CF_ACCOUNT_ID` | 13 | `CF_ACCOUNT` |
| `CF_KV_NAMESPACE_ID` | 18 | `CF_KV_UUID` |
| `CF_API_TOKEN` | 12 | `CF_API_KEY` |

> 保持不变（原本就 ≤10）：`DB_FORMAT`(9)、`DB_DRIVER`(9)、`MYSQL_URL`(9)、`JWT_SECRET`(10)、`ADMIN_PASS`(10)、`ALLOW_URLS`(10)、`MYSQL_HOST`(10)、`MYSQL_PORT`(10)、`MYSQL_USER`(10)、`KV_NAMESPACE`(12，未改名)、`EDGE_KV_BASE_URL`(16，未改名)、`ENVIRONMENT`(11，平台变量，未改名)

---

## 七、测试建议（Reviewer）

```bash
pnpm install
npx tsc --noEmit -p tsconfig.json        # 0 错误
npx tsx --test src/backend/internal/model/store/store.test.ts
npx tsx --test src/backend/internal/op/storage.test.ts
npx tsx scripts/_regress.mjs             # ALL PASS
node scripts/build-edge.mjs              # 重新生成 EdgeOne 产物
```

重点验证：
1. MySQL 环境下 `DB_FORMAT=sql` 读写不再报语法错误
2. 与 Go 后端共享库时，TS 保存不再清空 `x_ssh_public_keys`
3. EdgeOne KV 代理在密钥轮换后不再出现持续 401
