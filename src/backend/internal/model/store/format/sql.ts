/**
 * SQL 格式适配器
 * 
 * 使用关系表存储，与 Go 后端完全一致的表结构：
 * - settings: key (PK), data (JSON)
 * - storages: id (PK), mount_path, data (JSON)
 * - users: id (PK), username, data (JSON)
 * - shares: id (PK), data (JSON)
 * - metas: id (PK), path, data (JSON)
 * - plugins: id (PK), data (JSON)
 * 
 * 适用于 D1、MySQL、PostgreSQL 等关系数据库。
 */
import type { FormatAdapter, Driver } from "../types"
import {
  TABLE_NAMES,
  TABLE_KEY,
  TABLE_EXTRA_COLUMNS,
  type TableName,
} from "../schema"

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
      const rows = await driver.query(`SELECT data FROM ${table}`, [], env)
      out[table] = rows.map((r: any) => JSON.parse(r.data))
    }

    return out
  },

  async save(data: any, driver: Driver, env?: any): Promise<boolean> {
    if (!driver.batch) {
      throw new Error(`Driver ${driver.name} does not support batch operations`)
    }

    const statements: Array<{ sql: string; params: any[] }> = []

    // 清空所有表
    for (const table of TABLE_NAMES) {
      statements.push({ sql: `DELETE FROM ${table}`, params: [] })
    }

    // 插入新数据
    for (const table of TABLE_NAMES) {
      const keyCol = TABLE_KEY[table]
      const extras = TABLE_EXTRA_COLUMNS[table] || []
      const cols = [keyCol, ...extras, "data"]
      const placeholders = cols.map(() => "?").join(", ")
      const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`

      for (const entity of data?.[table] || []) {
        const params: any[] = [
          String(entity?.[keyCol] ?? ""),
          ...extras.map((c: string) => String(entity?.[c] ?? "")),
          JSON.stringify(entity),
        ]
        statements.push({ sql, params })
      }
    }

    // 标记已初始化
    statements.push({
      sql: "INSERT OR REPLACE INTO schema_info (k, v) VALUES (?, ?)",
      params: ["openlist_config", String(Date.now())],
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

  async saveTable(
    table: string,
    records: any[],
    driver: Driver,
    env?: any
  ): Promise<void> {
    if (!driver.batch) {
      throw new Error(`Driver ${driver.name} does not support batch operations`)
    }

    const keyCol = TABLE_KEY[table as keyof typeof TABLE_KEY]
    const extras = TABLE_EXTRA_COLUMNS[table as keyof typeof TABLE_EXTRA_COLUMNS] || []
    const cols = [keyCol, ...extras, "data"]
    const placeholders = cols.map(() => "?").join(", ")

    const statements: Array<{ sql: string; params: any[] }> = [
      { sql: `DELETE FROM ${table}`, params: [] },
    ]

    const insertSql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
    for (const entity of records) {
      const params = [
        String(entity?.[keyCol] ?? ""),
        ...extras.map((c: string) => String(entity?.[c] ?? "")),
        JSON.stringify(entity),
      ]
      statements.push({ sql: insertSql, params })
    }

    await driver.batch(statements, env)
  },

  async getRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any
  ): Promise<any | null> {
    if (!driver.query) {
      throw new Error(`Driver ${driver.name} does not support SQL queries`)
    }

    const keyCol = TABLE_KEY[table as keyof typeof TABLE_KEY]
    const rows = await driver.query(
      `SELECT data FROM ${table} WHERE ${keyCol} = ?`,
      [key],
      env
    )

    return rows.length > 0 ? JSON.parse(rows[0].data) : null
  },

  async saveRecord(
    table: string,
    key: string,
    record: any,
    driver: Driver,
    env?: any
  ): Promise<void> {
    if (!driver.execute) {
      throw new Error(`Driver ${driver.name} does not support SQL execution`)
    }

    const keyCol = TABLE_KEY[table as keyof typeof TABLE_KEY]
    const extras = TABLE_EXTRA_COLUMNS[table as keyof typeof TABLE_EXTRA_COLUMNS] || []
    const cols = [keyCol, ...extras, "data"]
    const placeholders = cols.map(() => "?").join(", ")

    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
    const params = [
      key,
      ...extras.map((c: string) => String(record?.[c] ?? "")),
      JSON.stringify(record),
    ]

    await driver.execute(sql, params, env)
  },

  async deleteRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any
  ): Promise<void> {
    if (!driver.execute) {
      throw new Error(`Driver ${driver.name} does not support SQL execution`)
    }

    const keyCol = TABLE_KEY[table as keyof typeof TABLE_KEY]
    await driver.execute(`DELETE FROM ${table} WHERE ${keyCol} = ?`, [key], env)
  },
}
