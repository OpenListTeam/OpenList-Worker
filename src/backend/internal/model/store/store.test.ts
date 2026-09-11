import assert from "node:assert/strict"
import { test } from "node:test"
import type { Driver } from "./types"
import { readDriver, readFormat, getStoreBackend } from "./backend"
import { mapFormat } from "./format/map"
import { keyFormat } from "./format/key"
import { sqlFormat } from "./format/sql"
import {
  TABLE_NAMES,
  DDL_TABLE_NAMES,
  TABLE_KEY,
  keyOf,
  TABLES,
  TABLE_SQL_NAMES,
  getTablePrefix,
  tableSqlName,
  D1_SCHEMA,
  MYSQL_SCHEMA,
  serializeColumn,
  deserializeColumn,
  rowToEntity,
  entityToRow,
} from "./schema"

/** 基于局部 Map 的内存 KV 驱动（隔离测试）。 */
function createMockKvDriver(): Driver {
  const store = new Map<string, string>()
  return {
    name: "mock-kv",
    isAvailable: async () => true,
    init: async () => {},
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => {
      store.set(key, value)
    },
    delete: async (key) => {
      store.delete(key)
    },
    list: async (prefix) =>
      [...store.keys()].filter((k) => k.startsWith(prefix)),
    health: async () => ({ connected: true }),
  }
}

/** 基于局部 Map 的简易 SQL 驱动（隔离测试，支持 sqlFormat 用到的 SQL）。 */
function createMockSqlDriver(name = "mock-sql"): Driver {
  // table -> rows (对象数组)
  const tables = new Map<string, any[]>()
  // schema_info: k -> v
  const schemaInfo = new Map<string, string>()

  const ensureTable = (name: string) => {
    if (!tables.has(name)) tables.set(name, [])
    return tables.get(name)!
  }

  return {
    name,
    isAvailable: async () => true,
    init: async () => {},
    get: async () => null,
    put: async () => {},
    delete: async () => {},
    list: async () => [],
    async query(sql: string, params: any[]): Promise<any[]> {
      const trimmed = sql.trim()
      // SELECT v FROM schema_info WHERE k = ?
      if (/^SELECT v FROM schema_info WHERE k = \?/i.test(trimmed)) {
        const k = String(params[0])
        return schemaInfo.has(k) ? [{ v: schemaInfo.get(k) }] : []
      }
      // SELECT * FROM `table`
      const m = trimmed.match(/^SELECT \* FROM `?(\w+)`?/i)
      if (m) return ensureTable(m[1]).map((r) => ({ ...r }))
      throw new Error(`mock-sql unsupported query: ${sql}`)
    },
    async execute(_sql: string, _params: any[]): Promise<void> {
      // 单条 execute 在测试中不直接调用，保留空实现
    },
    async batch(
      statements: Array<{ sql: string; params: any[] }>,
    ): Promise<void> {
      for (const { sql, params } of statements) {
        const trimmed = sql.trim()
        // DELETE FROM `table`
        const m = trimmed.match(/^DELETE FROM `?(\w+)`?/i)
        if (m) {
          tables.set(m[1], [])
          continue
        }
        // schema_info 的 UPSERT 必须先于通用 INSERT 匹配，否则会被当作数据行。
        // SQLite 方言：INSERT OR REPLACE INTO `schema_info` (`k`, `v`) VALUES (?, ?)
        if (/^INSERT OR REPLACE INTO `?schema_info`?/i.test(trimmed)) {
          schemaInfo.set(String(params[0]), String(params[1]))
          continue
        }
        // MySQL 方言：INSERT INTO `schema_info` (...) VALUES (...) ON DUPLICATE KEY UPDATE ...
        if (
          /^INSERT INTO `?schema_info`?/i.test(trimmed) &&
          /ON DUPLICATE KEY UPDATE/i.test(trimmed)
        ) {
          schemaInfo.set(String(params[0]), String(params[1]))
          continue
        }
        // 通用数据行：INSERT INTO `table` (`c1`, `c2`, ...) VALUES (?, ?, ...)
        const ins = trimmed.match(
          /^INSERT INTO `?(\w+)`? \(([^)]+)\) VALUES \(([^)]+)\)/i,
        )
        if (ins) {
          const table = ins[1]
          const cols = ins[2].split(",").map((c) => c.trim().replace(/`/g, ""))
          const row: any = {}
          cols.forEach((c, i) => {
            row[c] = params[i]
          })
          ensureTable(table).push(row)
          continue
        }
        throw new Error(`mock-sql unsupported statement: ${sql}`)
      }
    },
    health: async () => ({ connected: true }),
  }
}

const SAMPLE_DB = {
  settings: [{ key: "site_title", value: "OpenList" }],
  storages: [{ id: 1, mount_path: "/x", driver: "local" }],
  users: [
    { id: 1, username: "admin", role: 2, permission: 0, disabled: false },
  ],
  shares: [],
  metas: [{ id: 1, path: "/a", read_users: [1, 2], read_users_sub: false }],
  plugins: [],
}

test("schema: columnar tables match Go backend structure", () => {
  // 往返表 6 张（sshkeys 不参与，避免清空 Go 的 x_ssh_public_keys）
  assert.equal(TABLE_NAMES.length, 6)
  // DDL 表 7 张（含 sshkeys，保持与 Go 共享库的结构一致）
  assert.equal(DDL_TABLE_NAMES.length, 7)
  assert.equal(TABLE_KEY.settings, "key")
  assert.equal(TABLE_KEY.users, "id")
  assert.equal(keyOf("settings", { key: "site_title" }), "site_title")
  assert.equal(keyOf("users", { id: 2 }), "2")

  // 列式表：每个字段独立成列，不再是「data JSON」宽表
  assert.ok(TABLES.users.columns.some((c) => c.name === "username"))
  assert.ok(TABLES.users.columns.some((c) => c.name === "base_path"))
  assert.ok(TABLES.storages.columns.some((c) => c.name === "mount_path"))
  assert.ok(TABLES.metas.columns.some((c) => c.name === "read_users"))
  assert.ok(TABLES.plugins.columns.some((c) => c.name === "script_content"))
  assert.ok(TABLES.sshkeys.columns.some((c) => c.name === "key_str"))
  // 不应再有宽表的 data 列
  assert.ok(!TABLES.users.columns.some((c) => c.name === "data"))
  // DDL 幂等生成（schema_info + 7 张业务表）
  assert.ok(D1_SCHEMA.length >= 8)
  assert.ok(MYSQL_SCHEMA.length >= 8)
})

test("schema: SQL table names align with Go GORM naming", () => {
  // 复数名映射（对齐 Go 的 GORM snake_case + 复数）
  assert.equal(TABLE_SQL_NAMES.settings, "setting_items")
  assert.equal(TABLE_SQL_NAMES.shares, "sharing_dbs")
  assert.equal(TABLE_SQL_NAMES.storages, "storages")
  assert.equal(TABLE_SQL_NAMES.users, "users")
  assert.equal(TABLE_SQL_NAMES.metas, "metas")

  // 表前缀固定 x_（对齐 Go 的默认值）
  assert.equal(getTablePrefix({}), "x_")
  assert.equal(getTablePrefix({ TABLE_PREFIX: "abc_" }), "x_")

  // 完整表名 = 前缀 + 复数名
  assert.equal(tableSqlName("settings", {}), "x_setting_items")
  assert.equal(tableSqlName("shares", {}), "x_sharing_dbs")
  assert.equal(tableSqlName("settings", { TABLE_PREFIX: "abc_" }), "x_setting_items")

  // DDL 里应包含带前缀的复数表名
  assert.ok(D1_SCHEMA.some((d) => d.includes("x_setting_items")))
  assert.ok(D1_SCHEMA.some((d) => d.includes("x_sharing_dbs")))
})

test("schema: column serialization roundtrip", () => {
  const boolCol = { name: "disabled", type: "bool" as const }
  assert.equal(serializeColumn(boolCol, true), 1)
  assert.equal(deserializeColumn(boolCol, 1), true)
  assert.equal(deserializeColumn(boolCol, 0), false)

  const numCol = { name: "id", type: "number" as const }
  assert.equal(deserializeColumn(numCol, "42"), 42)

  const jsonCol = { name: "read_users", type: "json" as const }
  assert.deepEqual(
    deserializeColumn(jsonCol, serializeColumn(jsonCol, [1, 2])),
    [1, 2],
  )

  const entity = { id: 1, username: "admin", read_users: [1, 2] }
  const { columns, values } = entityToRow("users", entity)
  assert.ok(columns.includes("username"))
  const row: any = {}
  columns.forEach((c, i) => (row[c] = values[i]))
  assert.equal(rowToEntity("users", row).username, "admin")
})

test("backend factory: readDriver/readFormat backward compat", () => {
  assert.equal(readDriver({}), "auto")
  assert.equal(readDriver({ DB_DRIVER: "d1" }), "d1")
  assert.equal(readDriver({ DB_DRIVER: "MYSQL" }), "mysql")
  assert.equal(readDriver({ DB_DRIVER: "cfkv" }), "cfkv")
  // DB_DRIVER=json → auto（旧整对象语义）
  assert.equal(readDriver({ DB_DRIVER: "json" }), "auto")

  // 默认格式 map
  assert.equal(readFormat({}), "map")
  assert.equal(readFormat({ DB_FORMAT: "sql" }), "sql")
  assert.equal(readFormat({ DB_FORMAT: "KEY" }), "key")
})

test("backend factory: auto detection falls back to memory", async () => {
  const b = await getStoreBackend({})
  assert.equal(b.name, "memory")
})

test("map format: roundtrip via mock KV driver", async () => {
  const driver = createMockKvDriver()
  assert.equal(await mapFormat.save(SAMPLE_DB, driver), true)
  assert.deepEqual(await mapFormat.load(driver), SAMPLE_DB)
})

test("key format: roundtrip via mock KV driver (per-table keys)", async () => {
  const driver = createMockKvDriver()
  assert.equal(await keyFormat.save(SAMPLE_DB, driver), true)
  assert.deepEqual(await keyFormat.load(driver), SAMPLE_DB)
})

test("sql format: roundtrip via mock SQL driver (columnar)", async () => {
  const driver = createMockSqlDriver()
  assert.equal(await sqlFormat.save(SAMPLE_DB, driver), true)
  assert.deepEqual(await sqlFormat.load(driver), SAMPLE_DB)
})

test("sql format: MySQL dialect uses ON DUPLICATE KEY UPDATE (no INSERT OR REPLACE)", async () => {
  // 回归防护：MySQL 不支持 INSERT OR REPLACE，若方言分支失效，
  // mock 驱动会在收到该语句时抛错，从而让本测试失败。
  const driver = createMockSqlDriver("mysql")
  assert.equal(await sqlFormat.save(SAMPLE_DB, driver), true)
  assert.deepEqual(await sqlFormat.load(driver), SAMPLE_DB)
})
