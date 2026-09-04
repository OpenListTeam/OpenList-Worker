# 多数据库后端支持（JSON/KV · Cloudflare D1 · MySQL）

> 状态：已实现
> 目标：在保留现有 JSON/KV/Blob 存储路径的前提下，为 OpenList-TSWorker 增加 Cloudflare D1 与外部 MySQL 两种可选持久化后端，通过环境变量切换。

---

## 1. 改造方案

### 1.1 背景与现状

当前数据层集中在 `src/backend/internal/model/db.ts`，本质是 Alist 风格的「单 JSON 对象数据库」：

- 一个 `defaultDb` 对象包含 6 个实体数组：`settings` / `storages` / `users` / `shares` / `metas` / `plugins`
- `getDb()` 从 KV/Blob 按 `openlist_config` 单 key 读出整个 JSON → 解密 → 缓存
- 业务层拿到整个对象 → 内存改数组 → `saveDb()` 整体加密 → 写回单 key
- 调用点约 100+ 处，集中在 `admin.ts` / `storage.ts` / `share.ts` / `user.ts` / `auth.ts` 等

关键约束：**所有实体的字段都是动态的**（对象用 `...s` 展开、`addition` 是 JSON 字符串、字段可随时增删）。这决定了 SQL 后端不能做「每字段一列」的强类型表，否则字段一变就要改 DDL，维护脆弱。

### 1.2 核心决策

**保留 `getDb()` / `saveDb()` 的「整对象」业务契约不变，在其下插入「持久化后端适配器」层。**

```
业务层 (server/*.ts, internal/op/*.ts)
        │  只调 getDb() / saveDb() / resolvePath()，契约不变（零改动）
        ▼
db.ts   ── 加密边界(sealDb/unsealDb) + 缓存(dbCache/dbInflight) ──
        │
        ▼  委托给后端
store/backend.ts  ── 工厂：按 DB_DRIVER 选择后端（单例） ──
        ├── json.ts   (默认) 现有 KV/Blob/CF-REST/内存逻辑原样迁移
        ├── d1.ts     Cloudflare D1 分表存储
        └── mysql.ts  MySQL 分表存储 (mysql2, 动态 import)
```

收益：

- 业务层 100+ 调用点**零改动**，回归风险最小
- 三个后端各自独立文件，互不侵入，新增 PG 等只需再加一个文件
- 加密、缓存、默认值迁移（`ensureDefault*`）对所有后端统一生效

### 1.3 后端接口

```ts
export interface StoreBackend {
  readonly name: string // "json" | "d1" | "mysql"
  load(env?: any): Promise<any | null> // 返回完整配置（已加密）或 null
  save(data: any, env?: any): Promise<boolean> // 写入完整配置（已加密）
  isConfigured?(env?: any): Promise<boolean> // 是否配置了真实持久化目标
  init?(env?: any): Promise<void> // 建表/迁移（D1、MySQL）
  health?(env?: any): Promise<any> // 健康检查
}
```

- 加密（`sealDb`/`unsealDb`，`enc:v1:` 前缀）保持在 `db.ts` 持久化边界，**后端收到/返回的都是已加密数据**，加密能力不因切换后端而失效。
- `db.ts` 的 `loadDb` / `saveDb` 改为委托后端；`getKvBinding` / `getKvStatus` 从 `store/json.ts` 迁移并由 `db.ts` re-export，保持 `middlewares.ts`（JWT secret / 注销黑名单）与 `router.ts` 兼容。

### 1.4 表结构设计

由于字段动态，采用 **「主键列 + 一个 `data` JSON 列」的宽表**。主键列仅作冗余索引（方便 SQL 查询与唯一约束），`data` 列存该行实体的**完整 JSON**，`load` 时直接 `JSON.parse(data)` 还原，字段增删无需改 DDL。

| 表名          | 主键列（TEXT） | 附加索引列         | data 内容    |
| ------------- | -------------- | ------------------ | ------------ |
| `schema_info` | `k`            | —                  | 版本号等单值 |
| `settings`    | `key`          | —                  | setting 对象 |
| `storages`    | `id`           | `mount_path`       | storage 对象 |
| `users`       | `id`           | `username`(UNIQUE) | user 对象    |
| `shares`      | `id`           | —                  | share 对象   |
| `metas`       | `id`           | `path`             | meta 对象    |
| `plugins`     | `id`           | —                  | plugin 对象  |

> 主键列统一存 `String(entity.id)`（或 `settings.key`），`data` 列保留原始字段与类型（数字 id 在 JSON 中仍是数字），因此 `s.id === 1` 等严格比较在 load 后依然成立。

### 1.5 读写策略

- **load**：6 张实体表并行/顺序读取 → 全部空则返回 `null`（触发默认值兜底）→ 否则组装成 `{ settings, storages, users, shares, metas, plugins }`。
- **save**：全量替换 —— 每张表 `DELETE` 后逐行 `INSERT`（幂等 upsert）。
  - D1：用 `db.batch()` 批量执行（≤100 条/批）。
  - MySQL：用事务 `beginTransaction` → 执行 → `commit`（真原子）。
- **init**：幂等 `CREATE TABLE IF NOT EXISTS`，每个后端实例首次 load/save 前执行一次。

### 1.6 环境变量

| 变量                                                                             | 取值                                                 | 说明                                    |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `DB_DRIVER`                                                                      | `json`（默认）\| `d1` \| `mysql`                     | 后端开关                                |
| —（json）                                                                        | —                                                    | 走现有 KV/Blob/CF REST/内存，无需新变量 |
| （d1）                                                                           | wrangler 绑定名 `DB`（标准），兼容别名 `OPENLIST_DB` | `env.DB`                                |
| `MYSQL_URL`                                                                      | `mysql://user:pass@host:3306/db`                     | 或拆成下列分项                          |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | —                                                    | MySQL 分项配置                          |

### 1.7 依赖与运行时

- **D1**：零新增依赖，通过 `env.DB`（`D1Database`）访问，使用 `prepare().bind().all/first/run/batch`。
- **MySQL**：新增 `mysql2` 依赖，通过 `await import("mysql2/promise")` **动态加载**，且仅在 `process.release?.name === "node"` 时触发；CF Workers/边缘构建该路径不执行、不进产物（与 SFTP/FTP/Local 驱动同模式）。

### 1.8 已知边界

- JWT 签名密钥与注销黑名单（`middlewares.ts`）仍走 KV 持久化（`getKvBinding`），不随主配置后端切换。D1/MySQL 模式下若未同时配置 KV，则退回进程内随机密钥（冷启动变化）。后续可将其一并纳入 `store` 后端。

---

## 2. 执行步骤

1. 新增 `store/types.ts`：`StoreBackend` 接口。
2. 新增 `store/schema.ts`：D1 / MySQL 两套 DDL。
3. 新增 `store/json.ts`：从 `db.ts` 原样迁移 KV/Blob/CF REST 逻辑（`getBlobStore` / `installRespSafetyNet` / `getKvBinding` / `readFromKv` / `saveToKv` / `getKvStatus`），并实现 `jsonBackend`。
4. 新增 `store/d1.ts`：D1 后端（建表 / load / save / health）。
5. 新增 `store/mysql.ts`：MySQL 后端（建表 / load / save / health，动态 import mysql2）。
6. 新增 `store/backend.ts`：按 `DB_DRIVER` 选择后端的工厂 + 单例缓存 + `getStoreStatus`。
7. 改造 `db.ts`：`loadDb` / `saveDb` 委托后端；re-export `getKvBinding` / `getKvStatus`；`setEnvCtx` 同步 json 后端上下文；导出 `getStoreStatus`。
8. `package.json` 增加 `mysql2`。
9. `wrangler.toml` 增加 `d1_databases` 绑定示例（注释，按需启用）。
10. `debug.ts` / `admin.ts` 的 `/kv/status` 展示当前后端与健康状态。
11. 补测试：json / d1 / mysql 后端往返测试。

---

## 3. 验收标准

1. **默认不回归**：`DB_DRIVER` 未设置或为 `json` 时，`getDb()` / `saveDb()` 行为与改造前完全一致（现有 `*.test.ts` 全绿）。
2. **D1 后端**：
   - 配置 `DB_DRIVER=d1` 且绑定 `DB` 后，站点配置/存储/用户/分享的增删改查可持久化；
   - 冷启动后 `getDb()` 能从 D1 读回完整配置；
   - 6 张实体表 + `schema_info` 自动建表。
3. **MySQL 后端**：
   - `DB_DRIVER=mysql` + 连接串（Node 容器模式）下，读写往返正确；
   - 保存走事务，失败不残留半写数据；
   - 无 `mysql2` 依赖的 CF/边缘构建不报错（动态 import 路径不触发）。
4. **加密兼容**：`ENCRYPTION_SECRET`/`JWT_SECRET` 存在时，敏感字段在 D1/MySQL 落盘为 `enc:v1:` 密文，读回后内存为明文。
5. **接口兼容**：`getKvBinding` / `getKvStatus` / `resolvePath` / `setEnvCtx` / `defaultDb` / `User` 导出不变，业务层零改动。
6. **可观测**：`/api/debug/info` 与 `/api/admin/kv/status` 能返回当前后端名与连接状态。
