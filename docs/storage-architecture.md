# 数据存储架构详解

本文档完整描述 OpenList-TSWorker 的数据存储模型：**存储什么、怎么存、存在哪、如何选**。

架构核心是**驱动层（Driver）与格式层（Format）正交分离**：

```
          ┌─────────────────────────────────────────────┐
          │              db.ts（业务层）                 │
          │  持有完整配置对象，负责敏感字段加解密           │
          └──────────────────────┬──────────────────────┘
                                 │ getStoreBackend(env)
          ┌──────────────────────▼──────────────────────┐
          │   backend.ts（工厂 + 自动探测 + 缓存）        │
          └───────────┬─────────────────────┬───────────┘
                      │                     │
          ┌───────────▼──────────┐  ┌───────▼────────────┐
          │  Format 格式层        │  │  Driver 驱动层      │
          │  map / key / sql      │  │  blob/cfkv/kv/d1/  │
          │  （决定"怎么存"）      │  │  do/mysql/memory   │
          │                      │  │  （决定"存在哪"）    │
          └──────────────────────┘  └────────────────────┘
```

- **格式层**决定数据如何切分与序列化（一个 JSON？一条记录一键？一张表一列？）
- **驱动层**决定底层 I/O 落在哪种存储媒介（KV / Blob / SQLite / MySQL / 内存）

两者通过 `Driver` 接口（`get/put/delete/list/batch/execute`）解耦，可自由组合：
`map + kv`、`key + blob`、`sql + d1`、`sql + mysql` …… 只要驱动具备所需能力。

---

## 一、存储了什么（数据模型）

上层由 `db.ts` 持有一个**完整配置对象**，包含以下部分：

| 逻辑分区 | 内容 | 敏感字段（加密） |
|---|---|---|
| `settings` | 系统设置键值对 | `token`、`sso_client_secret`、`sso_client_id`、`ldap_bind_password`、`ldap_bind_dn`、`ocr_api`、`handle_hook_after_writing` |
| `storages` | 存储驱动实例配置 | `addition`（网盘凭据，整体加密） |
| `users` | 用户账号 | `password`（二次加密）、`otp_secret`（2FA 密钥） |
| `shares` | 分享链接 | — |
| `metas` | 元数据（路径索引） | — |
| `plugins` | 插件（TS 独有，Go 无此表） | — |

> **SSH 公钥**在 TS 侧存于 `user.ssh_keys` 内，**不是**独立的顶层 `sshkeys` 分区。
> 详见 §五「与 Go 后端的兼容边界」。

### 加密边界（seal / unseal）

在**持久化边界**统一处理，格式层与驱动层完全无感知：

- 写入前 `sealDb()`：把敏感字段值替换为 `enc:v1:<salt>:<iv>:<ciphertext>`
- 读取后 `unsealDb()`：识别 `enc:v1:` 前缀并解密
- 算法：**AES-256-GCM**，密钥经 **PBKDF2** 从口令派生（`pkg/crypto.ts`）
- 幂等：已带 `enc:v1:` 前缀的值不会重复加密

### 加密密钥来源（`db.ts`）

优先级（`getEncryptionKey` 与 `ensureEncryptionSecret` **完全一致**，避免加解密分裂）：

1. **环境变量** `JWT_SECRET`（长度 ≥ 16 才生效）
2. **持久化密钥** `openlist_encryption_secret`（KV/Blob 中的一项），由 setup 阶段写入

关键约束：

- **只读不生成**：`getEncryptionKey` 绝不生成密钥，否则一次瞬时读取失败就会换钥，导致既有密文永久无法解密
- **只生成于 setup**：`ensureEncryptionSecret` 仅在初始化流程调用，且用**进程内单飞（inflight 合并）**防止并发 setup 各自生成密钥互相覆盖
- 环境变量存在时**永不写入持久化**，尊重运维显式配置

---

## 二、三种存储格式（Format）

格式层决定数据的**切分粒度**与**序列化形态**。由 `DB_FORMAT` 选择。

### 2.1 `map`（整库单键 / 宽表）

**把整个配置对象序列化为一个 JSON，存到单个键。**

| 项 | 值 |
|---|---|
| 键名 | `openlist_config` |
| 值 | `JSON.stringify(整个 db 对象)` |
| 读取 | 一次 `get` → `JSON.parse` |
| 写入 | 一次 `put` → `JSON.stringify` |

**优点**：实现最简单，读写各一次 I/O，天然原子。
**缺点**：数据量大时单键体积大；任一字段变更都要重写整个 JSON（写放大）。
**适用**：数据量小、部署简单优先、KV 单键大小充裕的场景。

```
openlist_config → {"settings":[...],"users":[...],"storages":[...],...}
```

### 2.2 `key`（分表分键 / 行式）

**按表拆分，每条记录单独存一个键。**

| 项 | 值 |
|---|---|
| 键名 | `<table>_<primaryKey>`，如 `users_1`、`settings_site_title` |
| 值 | `JSON.stringify(单条记录)` |
| 初始化标记 | `openlist_config`（存在即视为已初始化） |

键名约束与转义（`keycodec.ts`）：EdgeOne KV **只允许 `[A-Za-z0-9_]`**，因此

- `[A-Za-z0-9_]` 原样保留（下划线合法）
- 其余字符按 UTF-8 逐字节转义为 `xHH`（如 UUID 的 `-` → `x2d`）
- 空主键映射为 `0`，避免产生 `users_` 这种与表前缀无法区分的键

> 键名**无需反向解析**：所有读写都是「构造键名」，主键值一律取自记录 JSON 本身，
> key 只作存储地址。`decodeKeyPart` 仅供排查问题时人工阅读。

**优点**：避免大 JSON，单条记录读写不放大；适合频繁改单条的场景。
**缺点**：`save` 为「list 前缀 → 删旧键 → 写全部」的全量替换，I/O 次数多；
KV 无事务，极端并发下可能出现短暂中间态。
**适用**：KV / Blob，记录数中等、需降低读写放大。

```
users_1            → {"id":1,"username":"admin",...}
settings_site_title → {"key":"site_title","value":"OpenList"}
storages_1         → {"id":1,"mount_path":"/x",...}
```

### 2.3 `sql`（列式表，与 Go 后端一致）

**每个字段独立成列，表结构对齐 Go 后端的 GORM 建表结果。**

| 项 | 值 |
|---|---|
| 表名 | 固定前缀 `x_` + Go 复数名，如 `x_users`、`x_setting_items` |
| 列名 | 对齐 Go 的 json tag（snake_case），如 `mount_path`、`read_users` |
| 初始化标记 | `schema_info` 表（`INIT_MARK = "openlist_config"`） |

表名映射（`TABLE_SQL_NAMES`）：

| 逻辑表 | SQL 表名（含 `x_` 前缀） |
|---|---|
| `settings` | `x_setting_items` |
| `storages` | `x_storages` |
| `users` | `x_users` |
| `shares` | `x_sharing_dbs` |
| `metas` | `x_metas` |
| `plugins` | `x_plugins`（TS 独有） |

**优点**：真正的列式结构，可与 **Go 后端共享同一物理数据库**；单字段可增量更新。
**缺点**：需要 SQL 能力（D1 / DO / MySQL），有方言差异需处理。
**适用**：需要与 Go 后端共享数据、或需 SQL 查询能力的场景。

> **方言兼容**：`sql.ts` 的 `upsertSql()` 按 `driver.name` 分支——
> SQLite（d1 / do）用 `INSERT OR REPLACE`，MySQL 用 `ON DUPLICATE KEY UPDATE`。

---

## 三、七种存储驱动（Driver）

驱动层决定底层 I/O 媒介。由 `DB_DRIVER` 选择。

| 驱动 | 底层存储 | 运行平台 | 具备能力 | 典型配置 |
|---|---|---|---|---|
| `blob` | EdgeOne Blob（SDK）/ ESA Blob（binding） | EdgeOne、阿里云 ESA | get/put/delete/list | 零配置（EdgeOne 自动提供） |
| `cfkv` | Cloudflare KV REST API | 任意（远程访问） | get/put/delete/list | `CF_ACCOUNT_ID`+`CF_KV_NAMESPACE_ID`+`CF_API_TOKEN` |
| `kv` | KV binding / EdgeOne KV 代理 | Cloudflare、EdgeOne | get/put/delete/list | 绑定 KV namespace + `JWT_SECRET` |
| `d1` | Cloudflare D1（SQLite） | Cloudflare Workers | SQL | 绑定 D1 database |
| `do` | Durable Object SQLite | Cloudflare Workers | SQL | 绑定 DO namespace |
| `mysql` | MySQL / TiDB | 任意（长连接） | SQL | `MYSQL_DSN` 或 `SQL_DSN` |
| `memory` | 模块级 `Map` | 仅本地/容器 | get/put/delete/list | 无需配置（**不持久化**） |

### 3.1 `blob`

- **EdgeOne Blob**：通过 SDK `@edgeone/pages-blob` 的 `getStore()` 访问（非 binding）
- **ESA Blob**：通过 `env.ESA_BLOB` / `globalThis.ESA_BLOB` binding 访问
- 绑定探测做 `isBlobLike()` 接口校验（`get` + `put`/`set`），避免把「绑定名字符串」误当绑定对象

### 3.2 `cfkv`（Cloudflare KV REST）

通过 REST API 远程访问，**无需 Worker binding**，适合外部服务 / CI / 跨账号。
需要 `CF_ACCOUNT_ID`、`CF_KV_NAMESPACE_ID`、`CF_API_TOKEN` 三者齐全。

### 3.3 `kv`

两种子模式：

- **Binding 模式**：直接使用 KV namespace binding
- **代理模式**：EdgeOne KV 经 Edge Function 转发（`functions/kv-*.js`）
  - 需 `JWT_SECRET` 用于 `X-Internal-Call` 头部鉴权
  - Edge 侧**不缓存密钥**，每次直读 env → KV，避免 Node 侧写入新密钥后 Edge 持有旧值

`get()` 对 `get(key, "text")`（Cloudflare）与 `get(key, {type:"text"})`（EdgeOne）
做**双签名兼容**，并把对象返回值归一化为 string，保持 `Driver.get` 契约。

### 3.4 `d1` / 3.5 `do`（SQLite 系）

- D1 通过 `batch()` 100 条一批（符合 D1 上限）
- DO 使用 Durable Object 内嵌 SQLite
- 均使用 SQLite 方言；`list()` 通过 SQL 查询模拟
- 表创建幂等（`CREATE TABLE IF NOT EXISTS`）

### 3.6 `mysql`

- DSN 来源：`MYSQL_DSN` 优先，回退 `SQL_DSN`
- `batch()` 使用事务 + 失败 rollback
- 方言为 MySQL，upsert 用 `ON DUPLICATE KEY UPDATE`

### 3.7 `memory`

- 模块级 `Map`，**进程重启即丢失**
- 仅作为 `auto` 探测失败时的**本地开发回退**
- **serverless 环境永不使用**：`resolveDriver` 与 `autoDetectDriver` 双重拦截，
  避免「写入成功但数据丢失」的静默故障

---

## 四、格式 × 驱动 兼容矩阵

不是所有组合都可用——驱动必须具备格式所需的能力。

| 格式 \ 驱动 | blob | cfkv | kv | d1 | do | mysql | memory |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `map`（单键） | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `key`（分键） | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sql`（列式） | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

- `map` / `key` 只需 `get/put/delete/list` 键值能力 → 所有 KV/Blob 类驱动均可
- `sql` 需 `batch` + `execute` SQL 能力 → 仅 D1 / DO / MySQL

---

## 五、与 Go 后端的兼容边界

TS 后端可与 Go 后端**共享同一物理数据库**（通过 `sql` 格式 + `DB_DRIVER=mysql/d1`），
但需注意以下边界：

### 5.1 `sshkeys` 表：只建表，不读写

- Go 后端把 SSH 公钥存在独立的 `x_ssh_public_keys` 表
- TS 侧把公钥存在 `user.ssh_keys` 字段内，**从不读写顶层 `sshkeys` 分区**
- 若把 `sshkeys` 纳入数据往返，`sqlFormat.save()` 会执行
  `DELETE FROM x_ssh_public_keys` 再写入空数组，**清空 Go 写入的 SSH 公钥**
- 因此拆分为两个表名列表：
  - `TABLE_NAMES`（6 张）：参与 `load/save` 往返
  - `DDL_TABLE_NAMES`（7 张）：仅用于建表，含 `sshkeys`，保证与 Go 共享库时结构一致

### 5.2 表前缀

固定为 `x_`（对齐 Go 后端默认值）；`plugins` 为 TS 独有（Go 无此表）。

### 5.3 旧版配置映射（向后兼容）

| 旧配置 | 新等价配置 |
|---|---|
| `DB_DRIVER=json` | `DB_FORMAT=map` + 自动探测驱动 |
| `DB_DRIVER=kv`（未指定格式） | `DB_FORMAT=key` |

---

## 六、驱动选择逻辑

### 6.1 `DB_DRIVER=auto`（默认）

按优先级依次探测，**首个可用者胜出**：

```
blob → cfkv → kv → d1
```

全部不可用时：

- **本地 / 容器**：回退 `memory`（便于开发，日志告警）
- **Serverless / Worker**：**抛错**，返回 `NO_STORAGE_MESSAGE` 引导配置

### 6.2 显式指定驱动（如 `DB_DRIVER=kv`）

**不回退**。若该驱动在当前运行时不可用，直接报错。

> 这是刻意设计：避免用户以为在用 KV、实际却落到别的后端或内存里。
> 例外：`memory` 驱动在 serverless 环境**永不接受**（数据会随实例消亡）。

### 6.3 运行时识别（`isServerlessRuntime`）

判定依据全部为**运行时特征**（不依赖用户配置），命中任一即成立：

1. **通用**：注入型请求上下文（`__requestOrigin` / `__requestContext` / `__makersContext`）
2. **EdgeOne**：`EDGEONE_BLOB`、`EdgeOne` 全局对象、`TENCENTCLOUD_SCF_FUNCTIONNAME`
3. **Cloudflare Workers**：`WebSocketPair`、`caches.default`
4. **阿里云 ESA**：`ESA_BLOB` / `ESA` 全局对象

### 6.4 缓存（`getStorageBackend`）

驱动 + 格式的解析结果会缓存，缓存键为：

```
<driver>:<format>:<runtimeTag>:<envFingerprint>
```

- `runtimeTag`：`sl`（serverless）/ `local`
- `envFingerprint`：`env` 对象的稳定自增 ID（WeakMap）

> 为什么需要 `envFingerprint`：`auto` 模式下驱动探测结果取决于「该 env 里有哪些绑定」。
> 若仅用 `driver:format` 作键，同一进程内先后出现两个不同 env 时会串味。

---

## 七、配置速查

| 环境变量 | 取值 | 默认 | 说明 |
|---|---|---|---|
| `DB_DRIVER` | `auto`/`blob`/`cfkv`/`kv`/`d1`/`do`/`mysql` | `auto` | 底层存储驱动 |
| `DB_FORMAT` | `map`/`key`/`sql` | `map` | 数据存储格式 |
| `JWT_SECRET` | ≥16 字符 | — | JWT 签名 / 字段加密 / 定时任务鉴权（三合一） |
| `ADMIN_PASS` | 字符串 | — | 跳过安装向导，自动初始化 admin |
| `ALLOW_URLS` | Host 列表 | — | CORS 白名单（逗号分隔） |
| `MAX_UPLOAD_SIZE` | 字节 | `26214400` | 整体上传上限（25MB） |
| `MAX_PART_SIZE` | 字节 | `16777216` | 分片单片上限（16MB） |
| `CDN_URL` | URL | — | 前端静态资源 CDN（支持 `$version`） |
| `SEED_SOURCE_ALLOWED_HOSTS` | Host 列表 | — | 种子数据来源白名单 |
| `MYSQL_URL` / `DATABASE_URL` | DSN 字符串 | — | MySQL 连接串（优先） |
| `MYSQL_HOST`/`MYSQL_PORT`/`MYSQL_USER`/`MYSQL_PASSWORD`/`MYSQL_DATABASE` | 字符串 | — | MySQL 分项配置 |
| `CF_ACCOUNT_ID` / `CF_KV_NAMESPACE_ID` / `CF_API_TOKEN` | 字符串 | — | Cloudflare KV REST |

### 各平台推荐组合

| 平台 | 推荐配置 | 说明 |
|---|---|---|
| EdgeOne（Node 云函数） | `DB_DRIVER=blob`，`DB_FORMAT=map` | Blob 零配置；KV binding 不会注入到 Node 云函数 |
| EdgeOne（边缘函数） | `DB_DRIVER=kv`，`DB_FORMAT=key` + `JWT_SECRET` | KV binding 可用 |
| Cloudflare Workers | `DB_DRIVER=d1`，`DB_FORMAT=sql` 或 `DB_DRIVER=kv` | D1 与 Go 共享库 |
| 阿里云 ESA | `DB_DRIVER=blob` | ESA Blob binding |
| 本地 / 容器 | `DB_DRIVER=mysql`，`DB_FORMAT=sql` | 持久化；无配置则回退 memory |
| 与 Go 共享库 | `DB_DRIVER=mysql`，`DB_FORMAT=sql` | 表结构与 Go 一致 |

---

## 八、代码索引

| 文件 | 职责 |
|---|---|
| `store/backend.ts` | 工厂：解析配置、自动探测、缓存、组装 StoreBackend |
| `store/types.ts` | `Driver` / `FormatAdapter` / `StoreBackend` 接口定义 |
| `store/schema.ts` | 列式表定义、主键映射、DDL 生成、行↔对象转换 |
| `store/keycodec.ts` | KV 键名编码（EdgeOne 字符集约束） |
| `store/format/map.ts` | 整库单键格式 |
| `store/format/key.ts` | 分表分键格式 |
| `store/format/sql.ts` | 列式表格式（含方言兼容 UPSERT） |
| `store/driver/*.ts` | 各驱动实现 |
| `store/json.ts` | KV/Blob 绑定探测 + 持久化密钥读写 |
| `db.ts` | 业务层：持有配置对象、seal/unseal、密钥管理 |
| `pkg/crypto.ts` | AES-256-GCM + PBKDF2 加解密 |
| `functions/kv-*.js` | EdgeOne KV 代理（Edge Function 侧） |
