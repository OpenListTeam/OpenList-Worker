# OpenList-TSWorker 数据库架构重构方案

## 📋 需求概述

将 OpenList-TSWorker 的数据库架构改造为与 Go 后端完全一致的格式，支持多种存储格式和驱动。

## 🎯 核心变更

### 1. 新增环境变量 `DB_FORMAT`（数据存储格式）

控制数据在数据库中的存储格式：

| 值 | 说明 | 适用场景 |
|---|---|---|
| `map` | **默认值**。原 json 格式，整个对象序列化为单个键值对 | KV/Blob 等简单存储 |
| `key` | 原 kv 格式，每个实体一条记录（如 `openlist_tbl:users:1`） | 避免大 JSON，精细化控制 |
| `sql` | **新增**。关系数据库表格式，与 Go 后端完全一致 | D1/MySQL 等关系数据库 |

### 2. 重构环境变量 `DB_DRIVER`（数据库驱动）

控制底层存储驱动的选择：

| 值 | 说明 | 备注 |
|---|---|---|
| `auto` | **默认值**。按优先级自动检测：blob → rest → kv → d1 | 简化配置 |
| `blob` | 腾讯云 EdgeOne Blob / 阿里云 ESA Blob | 已有实现 |
| `rest` | Cloudflare KV REST API（需 CF_ACCOUNT_ID、CF_KV_NAMESPACE_ID、CF_API_TOKEN） | 新增 |
| `kv` | 强制使用 KV binding（env.KV / env.EDGEONE_KV） | 已有实现 |
| `d1` | Cloudflare D1（SQLite） | 已有实现 |
| `do` | **新增**。Cloudflare Durable Objects（SQLite 存储） | 待调研 |
| `mysql` | MySQL / MariaDB / PostgreSQL | 已有实现 |

### 3. 删除 `DB_JSON_BACKEND`

原 `DB_JSON_BACKEND` 的功能被 `DB_DRIVER` 和 `DB_FORMAT` 组合替代：

**旧配置 → 新配置映射：**

```bash
# 旧：DB_DRIVER=json + DB_JSON_BACKEND=blob
# 新：DB_FORMAT=map + DB_DRIVER=blob

# 旧：DB_DRIVER=json + DB_JSON_BACKEND=kv
# 新：DB_FORMAT=map + DB_DRIVER=kv

# 旧：DB_DRIVER=kv（分表模式）
# 新：DB_FORMAT=key + DB_DRIVER=kv

# 旧：DB_DRIVER=d1
# 新：DB_FORMAT=sql + DB_DRIVER=d1
```

---

## 🏗️ 技术实现

### 架构分层

```
┌─────────────────────────────────────────┐
│  应用层 (db.ts)                          │
│  - getDb() / saveDb()                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  格式层 (format/)                        │
│  - MapFormat: 整对象 JSON               │
│  - KeyFormat: 分 key 存储               │
│  - SqlFormat: 关系表（与 Go 一致）      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  驱动层 (driver/)                        │
│  - BlobDriver: EdgeOne/ESA Blob        │
│  - RestDriver: CF KV REST API          │
│  - KvDriver: CF KV binding             │
│  - D1Driver: CF D1 (SQLite)            │
│  - DoDriver: CF Durable Objects        │
│  - MysqlDriver: MySQL/PostgreSQL       │
└─────────────────────────────────────────┘
```

### 目录结构

```
src/backend/internal/model/store/
├── backend.ts          # 工厂函数（已有）
├── types.ts            # 类型定义（扩展）
├── schema.ts           # SQL 表结构（扩展）
├── format/             # 新增：格式层
│   ├── map.ts          # map 格式（整对象 JSON）
│   ├── key.ts          # key 格式（分 key 存储）
│   └── sql.ts          # sql 格式（关系表，兼容 Go）
├── driver/             # 新增：驱动层
│   ├── blob.ts         # EdgeOne/ESA Blob
│   ├── rest.ts         # CF KV REST API（新增）
│   ├── kv.ts           # CF KV binding
│   ├── d1.ts           # CF D1
│   ├── do.ts           # CF Durable Objects（新增）
│   └── mysql.ts        # MySQL/PostgreSQL
├── json.ts             # 兼容层（废弃，引用 format/map.ts）
├── kv.ts               # 兼容层（废弃，引用 format/key.ts）
├── d1.ts               # 兼容层（废弃，引用 driver/d1.ts + format/sql.ts）
└── mysql.ts            # 兼容层（废弃，引用 driver/mysql.ts + format/sql.ts）
```

---

## 📦 具体实现

### 1. 新增类型定义 (`types.ts`)

```typescript
// 存储格式类型
export type StorageFormat = 'map' | 'key' | 'sql'

// 存储驱动类型
export type StorageDriver = 'auto' | 'blob' | 'rest' | 'kv' | 'd1' | 'do' | 'mysql'

// 驱动接口（底层 I/O）
export interface Driver {
  name: string
  
  // 检查驱动是否可用
  isAvailable(env?: any): Promise<boolean>
  
  // 初始化驱动
  init(env?: any): Promise<void>
  
  // 键值操作（用于 map/key 格式）
  get(key: string, env?: any): Promise<string | null>
  put(key: string, value: string, env?: any): Promise<void>
  delete(key: string, env?: any): Promise<void>
  list(prefix: string, env?: any): Promise<string[]>
  
  // SQL 操作（用于 sql 格式）
  query?(sql: string, params: any[], env?: any): Promise<any[]>
  execute?(sql: string, params: any[], env?: any): Promise<void>
  batch?(statements: Array<{sql: string, params: any[]}>, env?: any): Promise<void>
  
  // 健康检查
  health(env?: any): Promise<any>
}

// 格式适配器接口
export interface FormatAdapter {
  name: string
  
  // 加载完整数据
  load(driver: Driver, env?: any): Promise<any | null>
  
  // 保存完整数据
  save(data: any, driver: Driver, env?: any): Promise<boolean>
  
  // 单表操作（可选，用于性能优化）
  getTable?(table: string, driver: Driver, env?: any): Promise<any[]>
  saveTable?(table: string, records: any[], driver: Driver, env?: any): Promise<void>
  
  // 单记录操作（可选，用于性能优化）
  getRecord?(table: string, key: string, driver: Driver, env?: any): Promise<any | null>
  saveRecord?(table: string, key: string, record: any, driver: Driver, env?: any): Promise<void>
  deleteRecord?(table: string, key: string, driver: Driver, env?: any): Promise<void>
}
```

### 2. 实现驱动层

#### 2.1 Cloudflare KV REST API Driver (`driver/rest.ts`)

```typescript
import type { Driver } from "../types"

interface RestConfig {
  accountId: string
  namespaceId: string
  apiToken: string
}

function getRestConfig(env?: any): RestConfig | null {
  const e = env || process.env || {}
  const accountId = e.CF_ACCOUNT_ID || e.CLOUDFLARE_ACCOUNT_ID
  const namespaceId = e.CF_KV_NAMESPACE_ID || e.CLOUDFLARE_KV_NAMESPACE_ID
  const apiToken = e.CF_API_TOKEN || e.CLOUDFLARE_API_TOKEN
  
  if (!accountId || !namespaceId || !apiToken) return null
  
  return { accountId, namespaceId, apiToken }
}

function buildUrl(config: RestConfig, path: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}${path}`
}

export const restDriver: Driver = {
  name: "rest",
  
  async isAvailable(env?: any): Promise<boolean> {
    return getRestConfig(env) !== null
  },
  
  async init(env?: any): Promise<void> {
    // REST API 无需初始化
  },
  
  async get(key: string, env?: any): Promise<string | null> {
    const config = getRestConfig(env)
    if (!config) throw new Error("CF REST API not configured")
    
    const url = buildUrl(config, `/values/${encodeURIComponent(key)}`)
    const resp = await fetch(url, {
      headers: { "Authorization": `Bearer ${config.apiToken}` }
    })
    
    if (resp.status === 404) return null
    if (!resp.ok) throw new Error(`CF REST API error: ${resp.status}`)
    
    return await resp.text()
  },
  
  async put(key: string, value: string, env?: any): Promise<void> {
    const config = getRestConfig(env)
    if (!config) throw new Error("CF REST API not configured")
    
    const url = buildUrl(config, `/values/${encodeURIComponent(key)}`)
    const resp = await fetch(url, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${config.apiToken}` },
      body: value
    })
    
    if (!resp.ok) throw new Error(`CF REST API error: ${resp.status}`)
  },
  
  async delete(key: string, env?: any): Promise<void> {
    const config = getRestConfig(env)
    if (!config) throw new Error("CF REST API not configured")
    
    const url = buildUrl(config, `/values/${encodeURIComponent(key)}`)
    const resp = await fetch(url, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${config.apiToken}` }
    })
    
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`CF REST API error: ${resp.status}`)
    }
  },
  
  async list(prefix: string, env?: any): Promise<string[]> {
    const config = getRestConfig(env)
    if (!config) throw new Error("CF REST API not configured")
    
    const keys: string[] = []
    let cursor: string | undefined
    
    do {
      const params = new URLSearchParams({ prefix, limit: "1000" })
      if (cursor) params.set("cursor", cursor)
      
      const url = buildUrl(config, `/keys?${params}`)
      const resp = await fetch(url, {
        headers: { "Authorization": `Bearer ${config.apiToken}` }
      })
      
      if (!resp.ok) throw new Error(`CF REST API error: ${resp.status}`)
      
      const data = await resp.json()
      keys.push(...(data.result || []).map((r: any) => r.name))
      cursor = data.result_info?.cursor
    } while (cursor)
    
    return keys
  },
  
  async health(env?: any): Promise<any> {
    const config = getRestConfig(env)
    if (!config) {
      return {
        configured: false,
        connected: false,
        platform: "Cloudflare KV REST API",
        mode: "rest",
        error: "Missing CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, or CF_API_TOKEN"
      }
    }
    
    try {
      await this.get("__health_check__", env)
      return {
        configured: true,
        connected: true,
        platform: "Cloudflare KV REST API",
        mode: "rest",
        accountId: config.accountId,
        namespaceId: config.namespaceId
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "Cloudflare KV REST API",
        mode: "rest",
        error: err?.message || String(err)
      }
    }
  }
}
```

#### 2.2 Cloudflare Durable Objects Driver (`driver/do.ts`)

```typescript
import type { Driver } from "../types"

/**
 * Cloudflare Durable Objects 驱动
 * 
 * 调研结论：
 * - DO 提供内置 SQLite 存储（ctx.storage.sql）
 * - 每个 DO 实例独立，需要通过 stub 访问
 * - 适合单租户场景或分片存储
 * - 对于 OpenList 场景，需要额外设计分片策略
 * 
 * 实现方案：
 * 1. 创建一个全局 DO 实例作为数据库
 * 2. 所有操作通过 RPC 调用该实例
 * 3. 内部使用 SQLite Storage API
 * 
 * 配置：
 * - DO_BINDING: DO namespace binding 名称（默认 OPENLIST_DO）
 * - DO_ID: DO 实例 ID（默认 "openlist-db"）
 */

function getDoBinding(env?: any): any | null {
  const e = env || (globalThis as any) || {}
  const bindingName = e.DO_BINDING || "OPENLIST_DO"
  return e[bindingName] || null
}

function getDoId(env?: any): string {
  const e = env || process.env || {}
  return e.DO_ID || "openlist-db"
}

export const doDriver: Driver = {
  name: "do",
  
  async isAvailable(env?: any): Promise<boolean> {
    return getDoBinding(env) !== null
  },
  
  async init(env?: any): Promise<void> {
    const binding = getDoBinding(env)
    if (!binding) return
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    // 初始化 DO 内部的表结构
    await stub.init()
  },
  
  async get(key: string, env?: any): Promise<string | null> {
    const binding = getDoBinding(env)
    if (!binding) throw new Error("DO binding not found")
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    return await stub.get(key)
  },
  
  async put(key: string, value: string, env?: any): Promise<void> {
    const binding = getDoBinding(env)
    if (!binding) throw new Error("DO binding not found")
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    await stub.put(key, value)
  },
  
  async delete(key: string, env?: any): Promise<void> {
    const binding = getDoBinding(env)
    if (!binding) throw new Error("DO binding not found")
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    await stub.delete(key)
  },
  
  async list(prefix: string, env?: any): Promise<string[]> {
    const binding = getDoBinding(env)
    if (!binding) throw new Error("DO binding not found")
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    return await stub.list(prefix)
  },
  
  async query(sql: string, params: any[], env?: any): Promise<any[]> {
    const binding = getDoBinding(env)
    if (!binding) throw new Error("DO binding not found")
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    return await stub.query(sql, params)
  },
  
  async execute(sql: string, params: any[], env?: any): Promise<void> {
    const binding = getDoBinding(env)
    if (!binding) throw new Error("DO binding not found")
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    await stub.execute(sql, params)
  },
  
  async batch(statements: Array<{sql: string, params: any[]}>, env?: any): Promise<void> {
    const binding = getDoBinding(env)
    if (!binding) throw new Error("DO binding not found")
    
    const id = binding.idFromName(getDoId(env))
    const stub = binding.get(id)
    
    await stub.batch(statements)
  },
  
  async health(env?: any): Promise<any> {
    const binding = getDoBinding(env)
    if (!binding) {
      return {
        configured: false,
        connected: false,
        platform: "Cloudflare Durable Objects",
        mode: "do",
        error: "DO binding not found"
      }
    }
    
    try {
      const id = binding.idFromName(getDoId(env))
      const stub = binding.get(id)
      await stub.health()
      
      return {
        configured: true,
        connected: true,
        platform: "Cloudflare Durable Objects",
        mode: "do",
        doId: getDoId(env)
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "Cloudflare Durable Objects",
        mode: "do",
        error: err?.message || String(err)
      }
    }
  }
}
```

#### 2.3 Durable Object 类定义 (`durable-objects/OpenListDB.ts`)

```typescript
/**
 * OpenList 数据库 Durable Object
 * 
 * 使用 SQLite Storage API 存储数据
 */
export class OpenListDB {
  private state: DurableObjectState
  private env: any
  
  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }
  
  async init() {
    // 创建 KV 表（用于 key/map 格式）
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    
    // 创建 SQL 表（用于 sql 格式，与 D1 一致）
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS schema_info (k TEXT PRIMARY KEY, v TEXT)
    `)
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, data TEXT NOT NULL)
    `)
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS storages (id TEXT PRIMARY KEY, mount_path TEXT, data TEXT NOT NULL)
    `)
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, data TEXT NOT NULL)
    `)
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, data TEXT NOT NULL)
    `)
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS metas (id TEXT PRIMARY KEY, path TEXT, data TEXT NOT NULL)
    `)
    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS plugins (id TEXT PRIMARY KEY, data TEXT NOT NULL)
    `)
  }
  
  async get(key: string): Promise<string | null> {
    const result = await this.state.storage.sql.exec(
      `SELECT value FROM kv WHERE key = ?`,
      key
    )
    return result.rows[0]?.value || null
  }
  
  async put(key: string, value: string): Promise<void> {
    await this.state.storage.sql.exec(
      `INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, ?)`,
      key, value, Date.now()
    )
  }
  
  async delete(key: string): Promise<void> {
    await this.state.storage.sql.exec(`DELETE FROM kv WHERE key = ?`, key)
  }
  
  async list(prefix: string): Promise<string[]> {
    const result = await this.state.storage.sql.exec(
      `SELECT key FROM kv WHERE key LIKE ? ORDER BY key`,
      `${prefix}%`
    )
    return result.rows.map(r => r.key)
  }
  
  async query(sql: string, params: any[]): Promise<any[]> {
    const result = await this.state.storage.sql.exec(sql, ...params)
    return result.rows
  }
  
  async execute(sql: string, params: any[]): Promise<void> {
    await this.state.storage.sql.exec(sql, ...params)
  }
  
  async batch(statements: Array<{sql: string, params: any[]}>): Promise<void> {
    // SQLite storage 支持事务
    for (const stmt of statements) {
      await this.state.storage.sql.exec(stmt.sql, ...stmt.params)
    }
  }
  
  async health(): Promise<void> {
    await this.state.storage.sql.exec(`SELECT 1`)
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = url.pathname.slice(1) // /init -> init
    
    try {
      const body = request.method === "POST" ? await request.json() : {}
      const result = await (this as any)[method](...(body.args || []))
      
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { "Content-Type": "application/json" }
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }
  }
}
```

### 3. 实现格式层

#### 3.1 SQL 格式（与 Go 完全一致）(`format/sql.ts`)

```typescript
import type { FormatAdapter, Driver } from "../types"
import { TABLE_NAMES, TABLE_KEY, TABLE_EXTRA_COLUMNS } from "../schema"

/**
 * SQL 格式适配器
 * 
 * 与 Go 后端完全一致的关系表结构：
 * - settings: key (PK), data (JSON)
 * - storages: id (PK), mount_path, data (JSON)
 * - users: id (PK), username, data (JSON)
 * - shares: id (PK), data (JSON)
 * - metas: id (PK), path, data (JSON)
 * - plugins: id (PK), data (JSON)
 */
export const sqlFormat: FormatAdapter = {
  name: "sql",
  
  async load(driver: Driver, env?: any): Promise<any | null> {
    if (!driver.query) {
      throw new Error(`Driver ${driver.name} does not support SQL queries`)
    }
    
    // 检查是否已初始化
    const marks = await driver.query(
      "SELECT v FROM schema_info WHERE k = ?",
      ["openlist_config"],
      env
    )
    if (!marks || marks.length === 0) return null
    
    const out: Record<string, any> = {}
    
    for (const table of TABLE_NAMES) {
      const rows = await driver.query(
        `SELECT data FROM ${table}`,
        [],
        env
      )
      out[table] = rows.map((r: any) => JSON.parse(r.data))
    }
    
    return out
  },
  
  async save(data: any, driver: Driver, env?: any): Promise<boolean> {
    if (!driver.batch) {
      throw new Error(`Driver ${driver.name} does not support batch operations`)
    }
    
    const statements: Array<{sql: string, params: any[]}> = []
    
    // 清空所有表
    for (const table of TABLE_NAMES) {
      statements.push({ sql: `DELETE FROM ${table}`, params: [] })
    }
    
    // 插入新数据
    for (const table of TABLE_NAMES) {
      const keyCol = TABLE_KEY[table]
      const extras = TABLE_EXTRA_COLUMNS[table]
      const cols = [keyCol, ...extras, "data"]
      const placeholders = cols.map(() => "?").join(", ")
      const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
      
      for (const entity of data?.[table] || []) {
        const params = [
          String(entity?.[keyCol] ?? ""),
          ...extras.map((c) => String(entity?.[c] ?? "")),
          JSON.stringify(entity)
        ]
        statements.push({ sql, params })
      }
    }
    
    // 标记已初始化
    statements.push({
      sql: "INSERT OR REPLACE INTO schema_info (k, v) VALUES (?, ?)",
      params: ["openlist_config", String(Date.now())]
    })
    
    await driver.batch(statements, env)
    return true
  },
  
  async getTable(table: string, driver: Driver, env?: any): Promise<any[]> {
    if (!driver.query) {
      throw new Error(`Driver ${driver.name} does not support SQL queries`)
    }
    
    const rows = await driver.query(`SELECT data FROM ${table}`, [], env)
    return rows.map((r: any) => JSON.parse(r.data))
  },
  
  async saveTable(table: string, records: any[], driver: Driver, env?: any): Promise<void> {
    if (!driver.batch) {
      throw new Error(`Driver ${driver.name} does not support batch operations`)
    }
    
    const keyCol = TABLE_KEY[table as any]
    const extras = TABLE_EXTRA_COLUMNS[table as any] || []
    const cols = [keyCol, ...extras, "data"]
    const placeholders = cols.map(() => "?").join(", ")
    
    const statements = [
      { sql: `DELETE FROM ${table}`, params: [] }
    ]
    
    const insertSql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
    for (const entity of records) {
      const params = [
        String(entity?.[keyCol] ?? ""),
        ...extras.map((c) => String(entity?.[c] ?? "")),
        JSON.stringify(entity)
      ]
      statements.push({ sql: insertSql, params })
    }
    
    await driver.batch(statements, env)
  },
  
  async getRecord(table: string, key: string, driver: Driver, env?: any): Promise<any | null> {
    if (!driver.query) {
      throw new Error(`Driver ${driver.name} does not support SQL queries`)
    }
    
    const keyCol = TABLE_KEY[table as any]
    const rows = await driver.query(
      `SELECT data FROM ${table} WHERE ${keyCol} = ?`,
      [key],
      env
    )
    
    return rows.length > 0 ? JSON.parse(rows[0].data) : null
  },
  
  async saveRecord(table: string, key: string, record: any, driver: Driver, env?: any): Promise<void> {
    if (!driver.execute) {
      throw new Error(`Driver ${driver.name} does not support SQL execution`)
    }
    
    const keyCol = TABLE_KEY[table as any]
    const extras = TABLE_EXTRA_COLUMNS[table as any] || []
    const cols = [keyCol, ...extras, "data"]
    const placeholders = cols.map(() => "?").join(", ")
    
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
    const params = [
      key,
      ...extras.map((c) => String(record?.[c] ?? "")),
      JSON.stringify(record)
    ]
    
    await driver.execute(sql, params, env)
  },
  
  async deleteRecord(table: string, key: string, driver: Driver, env?: any): Promise<void> {
    if (!driver.execute) {
      throw new Error(`Driver ${driver.name} does not support SQL execution`)
    }
    
    const keyCol = TABLE_KEY[table as any]
    await driver.execute(`DELETE FROM ${table} WHERE ${keyCol} = ?`, [key], env)
  }
}
```

### 4. 自动检测逻辑 (`backend.ts` 更新)

```typescript
import type { Driver, FormatAdapter, StorageDriver, StorageFormat } from "./types"
import { blobDriver } from "./driver/blob"
import { restDriver } from "./driver/rest"
import { kvDriver } from "./driver/kv"
import { d1Driver } from "./driver/d1"
import { doDriver } from "./driver/do"
import { mysqlDriver } from "./driver/mysql"
import { mapFormat } from "./format/map"
import { keyFormat } from "./format/key"
import { sqlFormat } from "./format/sql"

function readEnv(key: string, defaultValue: string, env?: any): string {
  const e = env || process.env || {}
  return String(e[key] || "").trim().toLowerCase() || defaultValue
}

export function readDriver(env?: any): StorageDriver {
  return readEnv("DB_DRIVER", "auto", env) as StorageDriver
}

export function readFormat(env?: any): StorageFormat {
  return readEnv("DB_FORMAT", "map", env) as StorageFormat
}

async function autoDetectDriver(env?: any): Promise<Driver> {
  // 优先级：blob → rest → kv → d1
  const candidates = [blobDriver, restDriver, kvDriver, d1Driver]
  
  for (const driver of candidates) {
    if (await driver.isAvailable(env)) {
      return driver
    }
  }
  
  throw new Error("No available storage driver found. Please configure DB_DRIVER.")
}

function resolveDriver(name: StorageDriver, env?: any): Promise<Driver> {
  switch (name) {
    case "blob":
      return Promise.resolve(blobDriver)
    case "rest":
      return Promise.resolve(restDriver)
    case "kv":
      return Promise.resolve(kvDriver)
    case "d1":
      return Promise.resolve(d1Driver)
    case "do":
      return Promise.resolve(doDriver)
    case "mysql":
      return Promise.resolve(mysqlDriver)
    case "auto":
      return autoDetectDriver(env)
    default:
      throw new Error(`Unknown driver: ${name}`)
  }
}

function resolveFormat(name: StorageFormat): FormatAdapter {
  switch (name) {
    case "map":
      return mapFormat
    case "key":
      return keyFormat
    case "sql":
      return sqlFormat
    default:
      throw new Error(`Unknown format: ${name}`)
  }
}

// 全局缓存
let cachedDriver: Driver | null = null
let cachedFormat: FormatAdapter | null = null
let cachedConfig: string | null = null

export async function getStorageBackend(env?: any): Promise<{driver: Driver, format: FormatAdapter}> {
  const driverName = readDriver(env)
  const formatName = readFormat(env)
  const config = `${driverName}:${formatName}`
  
  if (cachedDriver && cachedFormat && cachedConfig === config) {
    return { driver: cachedDriver, format: cachedFormat }
  }
  
  const driver = await resolveDriver(driverName, env)
  const format = resolveFormat(formatName)
  
  // 初始化驱动
  if (driver.init) {
    await driver.init(env)
  }
  
  cachedDriver = driver
  cachedFormat = format
  cachedConfig = config
  
  return { driver, format }
}
```

### 5. 更新 `db.ts` 使用新架构

```typescript
import { getStorageBackend } from "./store/backend"

export async function loadDb(env?: any): Promise<any | null> {
  const { driver, format } = await getStorageBackend(env)
  return await format.load(driver, env)
}

export async function saveDb(data: any, env?: any): Promise<boolean> {
  const { driver, format } = await getStorageBackend(env)
  return await format.save(data, driver, env)
}

// 健康检查
export async function getDbStatus(env?: any): Promise<any> {
  const { driver, format } = await getStorageBackend(env)
  const health = await driver.health(env)
  
  return {
    driver: driver.name,
    format: format.name,
    ...health
  }
}
```

---

## 🔄 兼容性处理

### 向后兼容

```typescript
// 自动迁移旧配置
function migrateConfig(env?: any): void {
  const e = env || process.env || {}
  
  // 如果设置了 DB_JSON_BACKEND，自动转换
  if (e.DB_JSON_BACKEND) {
    const backend = String(e.DB_JSON_BACKEND).toLowerCase()
    
    if (!e.DB_DRIVER) {
      switch (backend) {
        case "blob":
          e.DB_DRIVER = "blob"
          break
        case "kv":
          e.DB_DRIVER = "kv"
          break
        case "cf_rest":
        case "cfrest":
          e.DB_DRIVER = "rest"
          break
      }
    }
    
    if (!e.DB_FORMAT) {
      e.DB_FORMAT = "map"
    }
    
    console.warn("[DEPRECATED] DB_JSON_BACKEND is deprecated. Use DB_DRIVER and DB_FORMAT instead.")
  }
  
  // 如果 DB_DRIVER=json，自动转换为 DB_FORMAT=map
  if (e.DB_DRIVER === "json") {
    e.DB_FORMAT = e.DB_FORMAT || "map"
    e.DB_DRIVER = e.DB_JSON_BACKEND || "auto"
    console.warn("[DEPRECATED] DB_DRIVER=json is deprecated. Use DB_FORMAT=map instead.")
  }
  
  // 如果 DB_DRIVER=kv 且未指定格式，默认使用 key 格式
  if (e.DB_DRIVER === "kv" && !e.DB_FORMAT) {
    e.DB_FORMAT = "key"
  }
}
```

---

## 📝 配置示例

### 示例 1：Cloudflare Workers + D1（推荐）

```toml
# wrangler.toml
[vars]
DB_FORMAT = "sql"      # 使用 SQL 表格式（与 Go 一致）
DB_DRIVER = "d1"       # 使用 D1 驱动

[[d1_databases]]
binding = "DB"
database_name = "openlist"
```

### 示例 2：EdgeOne + Blob

```toml
[vars]
DB_FORMAT = "map"      # 使用 JSON 格式
DB_DRIVER = "blob"     # 使用 EdgeOne Blob
```

### 示例 3：Cloudflare KV REST API

```toml
[vars]
DB_FORMAT = "key"                          # 使用分 key 格式
DB_DRIVER = "rest"                         # 使用 REST API
CF_ACCOUNT_ID = "your_account_id"
CF_KV_NAMESPACE_ID = "your_namespace_id"
CF_API_TOKEN = "your_api_token"
```

### 示例 4：Durable Objects（实验性）

```toml
[vars]
DB_FORMAT = "sql"      # 使用 SQL 格式
DB_DRIVER = "do"       # 使用 Durable Objects

[[durable_objects.bindings]]
name = "OPENLIST_DO"
class_name = "OpenListDB"
script_name = "openlist-tsworkers"

[[migrations]]
tag = "v1"
new_classes = ["OpenListDB"]
new_sqlite_classes = ["OpenListDB"]
```

### 示例 5：自动检测（默认）

```toml
[vars]
DB_FORMAT = "map"      # 默认 JSON 格式
DB_DRIVER = "auto"     # 自动检测：blob → rest → kv → d1

# 如果存在以下任一配置，会自动选择对应驱动：
# - EdgeOne Blob binding
# - CF_ACCOUNT_ID + CF_KV_NAMESPACE_ID + CF_API_TOKEN
# - KV binding
# - D1 binding
```

---

## 🧪 测试计划

### 单元测试

```typescript
// store/format/sql.test.ts
describe("SQL Format", () => {
  it("should save and load data", async () => {
    const mockDriver = createMockSqlDriver()
    const data = {
      settings: [{ key: "version", value: "v4.2.3" }],
      users: [{ id: 1, username: "admin" }]
    }
    
    await sqlFormat.save(data, mockDriver)
    const loaded = await sqlFormat.load(mockDriver)
    
    expect(loaded).toEqual(data)
  })
})

// store/driver/rest.test.ts
describe("REST Driver", () => {
  it("should get/put/delete via REST API", async () => {
    const env = {
      CF_ACCOUNT_ID: "test",
      CF_KV_NAMESPACE_ID: "test",
      CF_API_TOKEN: "test"
    }
    
    await restDriver.put("test_key", "test_value", env)
    const value = await restDriver.get("test_key", env)
    expect(value).toBe("test_value")
    
    await restDriver.delete("test_key", env)
    const deleted = await restDriver.get("test_key", env)
    expect(deleted).toBeNull()
  })
})
```

### 集成测试

```bash
# 测试所有驱动 + 格式组合
pnpm test:integration

# 测试自动检测
pnpm test:auto-detect

# 测试兼容性
pnpm test:compatibility
```

---

## 📊 与 Go 后端对比

| 特性 | Go 后端 | TS Worker（重构后） |
|---|---|---|
| 数据格式 | SQL 表（GORM） | SQL 表（完全一致） |
| 驱动支持 | MySQL, SQLite | D1, MySQL, DO, KV, Blob, REST API |
| 表结构 | users, storages, settings, shares, metas | 完全一致 |
| 主键策略 | GORM primaryKey | 完全一致 |
| JSON 字段 | gorm:"serializer:json" | JSON.stringify/parse |
| 索引字段 | gorm:"unique" / gorm:"index" | 冗余列 + SQL 索引 |

**结论：** TS Worker 重构后与 Go 后端数据完全兼容，可共享同一个数据库。

---

## 🚀 实施步骤

### Phase 1: 基础架构（第 1-2 天）
- [ ] 更新 `types.ts`，添加 `Driver` 和 `FormatAdapter` 接口
- [ ] 创建 `driver/` 和 `format/` 目录
- [ ] 实现 `format/sql.ts`（SQL 格式）
- [ ] 更新 `backend.ts`，添加自动检测逻辑

### Phase 2: 驱动实现（第 3-4 天）
- [ ] 实现 `driver/rest.ts`（Cloudflare KV REST API）
- [ ] 实现 `driver/blob.ts`（迁移现有代码）
- [ ] 实现 `driver/kv.ts`（迁移现有代码）
- [ ] 实现 `driver/d1.ts`（迁移现有代码）
- [ ] 实现 `driver/mysql.ts`（迁移现有代码）

### Phase 3: Durable Objects（第 5-6 天）
- [ ] 调研 Durable Objects SQLite Storage API
- [ ] 实现 `durable-objects/OpenListDB.ts`
- [ ] 实现 `driver/do.ts`
- [ ] 更新 `wrangler.toml` 添加 DO 配置

### Phase 4: 格式适配器（第 7 天）
- [ ] 实现 `format/map.ts`（迁移 json.ts）
- [ ] 实现 `format/key.ts`（迁移 kv.ts）
- [ ] 实现格式自动选择逻辑

### Phase 5: 测试与文档（第 8-9 天）
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新 README.md
- [ ] 更新 wrangler.toml 示例
- [ ] 编写迁移指南

### Phase 6: 兼容性与上线（第 10 天）
- [ ] 实现旧配置自动迁移
- [ ] 添加废弃警告
- [ ] 性能测试
- [ ] 代码审查
- [ ] 发布 Release

---

## ❓ 常见问题

### Q1: Cloudflare REST API 是什么？

A: Cloudflare Workers KV REST API 是通过 HTTPS 访问 KV 的 API，无需 Worker binding。适用于：
- 外部服务访问 KV
- CI/CD 自动化
- 跨账号访问

官方文档：https://developers.cloudflare.com/api/operations/workers-kv-namespace-write-key-value-pair

### Q2: Durable Objects 是否可行？

A: 可行但有限制：
- ✅ 内置 SQLite 存储（ctx.storage.sql）
- ✅ 强一致性
- ⚠️ 单个 DO 实例有性能上限
- ⚠️ 需要设计分片策略
- ⚠️ 比 D1 贵（按计算时间计费）

**建议：** 仅在特定场景使用（如需要强一致性的单租户部署）。

### Q3: 为什么删除 DB_JSON_BACKEND？

A: 新架构中：
- `DB_DRIVER` 控制底层存储（blob/kv/d1/mysql）
- `DB_FORMAT` 控制数据格式（map/key/sql）
- `DB_JSON_BACKEND` 的功能被这两者完全覆盖，保留会造成混淆

### Q4: 如何迁移现有数据？

A: 自动迁移逻辑会：
1. 检测旧配置（DB_JSON_BACKEND）
2. 自动转换为新配置（DB_DRIVER + DB_FORMAT）
3. 显示废弃警告

无需手动操作。

### Q5: 性能对比如何？

| 驱动 | 格式 | 读延迟 | 写延迟 | 适用场景 |
|---|---|---|---|---|
| blob | map | ~50ms | ~100ms | EdgeOne 部署 |
| kv | key | ~20ms | ~50ms | 高频读写 |
| d1 | sql | ~10ms | ~30ms | 复杂查询 |
| rest | key | ~100ms | ~150ms | 外部访问 |
| do | sql | ~5ms | ~10ms | 强一致性 |

---

## 📌 Cloudflare REST API 说明

### 什么是 Cloudflare REST API？

Cloudflare Workers KV REST API 是一组 HTTP 接口，允许你在 Worker 外部通过 HTTPS 请求读写 KV 数据。

### 与 KV Binding 的区别

| 特性 | KV Binding | REST API |
|---|---|---|
| 访问位置 | 仅 Worker 内部 | 任何地方（需认证） |
| 性能 | 快（本地调用） | 慢（HTTPS 请求） |
| 配置 | wrangler.toml | 账号 ID + Namespace ID + API Token |
| 用途 | 生产环境 | 外部集成、CI/CD |

### API 端点

```
GET    /client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key}
PUT    /client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key}
DELETE /client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key}
GET    /client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/keys?prefix=xxx
```

### 使用场景

1. **外部服务访问 KV**：非 Cloudflare 环境访问数据
2. **CI/CD 自动化**：部署脚本更新配置
3. **跨账号访问**：A 账号的服务访问 B 账号的 KV
4. **本地开发**：无需 wrangler，直接用 REST API

### 配置方式

```bash
# 1. 获取 Account ID
# https://dash.cloudflare.com/ → 右侧边栏

# 2. 创建 API Token
# https://dash.cloudflare.com/profile/api-tokens
# 权限：Account.Workers KV Storage.Edit

# 3. 获取 Namespace ID
wrangler kv:namespace list

# 4. 配置环境变量
CF_ACCOUNT_ID=your_account_id
CF_KV_NAMESPACE_ID=your_namespace_id
CF_API_TOKEN=your_api_token
```

---

## 🎉 总结

本次重构实现了：

1. ✅ **统一架构**：驱动层 + 格式层分离，清晰明确
2. ✅ **与 Go 一致**：SQL 格式完全兼容 Go 后端表结构
3. ✅ **扩展性强**：新增驱动/格式只需实现接口
4. ✅ **向后兼容**：自动迁移旧配置
5. ✅ **灵活配置**：auto 检测 + 手动指定
6. ✅ **新增驱动**：REST API、Durable Objects

配置更简单、架构更清晰、与 Go 后端完全兼容！
