/**
 * SQL 格式适配器（列式表，与 Go 后端完全一致）。
 *
 * 每个字段对应一列，表结构由 schema.ts 的 TABLES 定义。字段名对齐 Go 的
 * json tag，表名通过 TABLE_SQL_NAMES 映射为 Go 的复数名并加上 TABLE_PREFIX
 * 前缀（默认 x_），因此 D1 / MySQL 中的表结构与 Go 的 GORM 建表结果一致。
 */
import type { FormatAdapter, Driver } from "../types"
import {
  TABLE_NAMES,
  TABLE_KEY,
  TABLES,
  TableName,
  tableSqlName,
  rowToEntity,
  entityToRow,
} from "../schema"

const INIT_MARK = "openlist_config"

function quote(name: string): string {
  return "`" + name + "`"
}

/** 带前缀+复数的完整表名（含反引号）。 */
function qn(table: TableName, env?: any): string {
  return quote(tableSqlName(table, env))
}

/** 列名列表（含反引号）。 */
function cols(table: TableName): string {
  return TABLES[table].columns.map((c) => quote(c.name)).join(", ")
}

export const sqlFormat: FormatAdapter = {
  name: "sql",

  async load(driver: Driver, env?: any): Promise<any | null> {
    if (!driver.query) {
      throw new Error(`Driver ${driver.name} does not support SQL queries`)
    }

    // 检查是否已初始化（schema_info 为 TS 内部标记表，不加前缀）
    const marks = await driver.query(
      "SELECT v FROM schema_info WHERE k = ?",
      [INIT_MARK],
      env,
    )
    if (!marks || marks.length === 0) return null

    const out: Record<string, any> = {}

    for (const table of TABLE_NAMES) {
      const rows = await driver.query(`SELECT * FROM ${qn(table, env)}`, [], env)
      out[table] = rows.map((r: any) => rowToEntity(table, r))
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
      statements.push({ sql: `DELETE FROM ${qn(table, env)}`, params: [] })
    }

    // 插入新数据
    for (const table of TABLE_NAMES) {
      for (const entity of data?.[table] || []) {
        const { columns, values } = entityToRow(table, entity)
        const placeholders = columns.map(() => "?").join(", ")
        const sql = `INSERT INTO ${qn(table, env)} (${columns
          .map((c) => quote(c))
          .join(", ")}) VALUES (${placeholders})`
        statements.push({ sql, params: values })
      }
    }

    // 标记已初始化
    statements.push({
      sql: "INSERT OR REPLACE INTO schema_info (k, v) VALUES (?, ?)",
      params: [INIT_MARK, String(Date.now())],
    })

    await driver.batch(statements, env)
    return true
  },

  async getTable(table: string, driver: Driver, env?: any): Promise<any[]> {
    if (!driver.query) {
      throw new Error(`Driver ${driver.name} does not support SQL queries`)
    }
    const t = table as TableName
    const rows = await driver.query(`SELECT * FROM ${qn(t, env)}`, [], env)
    return rows.map((r: any) => rowToEntity(t, r))
  },

  async saveTable(
    table: string,
    records: any[],
    driver: Driver,
    env?: any,
  ): Promise<void> {
    if (!driver.batch) {
      throw new Error(`Driver ${driver.name} does not support batch operations`)
    }
    const t = table as TableName

    const statements: Array<{ sql: string; params: any[] }> = [
      { sql: `DELETE FROM ${qn(t, env)}`, params: [] },
    ]

    for (const entity of records) {
      const { columns, values } = entityToRow(t, entity)
      const placeholders = columns.map(() => "?").join(", ")
      const sql = `INSERT INTO ${qn(t, env)} (${columns
        .map((c) => quote(c))
        .join(", ")}) VALUES (${placeholders})`
      statements.push({ sql, params: values })
    }

    await driver.batch(statements, env)
  },

  async getRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any,
  ): Promise<any | null> {
    if (!driver.query) {
      throw new Error(`Driver ${driver.name} does not support SQL queries`)
    }
    const t = table as TableName
    const keyCol = TABLE_KEY[t]
    const rows = await driver.query(
      `SELECT * FROM ${qn(t, env)} WHERE ${quote(keyCol)} = ?`,
      [key],
      env,
    )
    return rows.length > 0 ? rowToEntity(t, rows[0]) : null
  },

  async saveRecord(
    table: string,
    key: string,
    record: any,
    driver: Driver,
    env?: any,
  ): Promise<void> {
    if (!driver.execute) {
      throw new Error(`Driver ${driver.name} does not support SQL execution`)
    }
    const t = table as TableName
    void key

    const { columns, values } = entityToRow(t, record)
    const placeholders = columns.map(() => "?").join(", ")
    const sql = `INSERT OR REPLACE INTO ${qn(t, env)} (${columns
      .map((c) => quote(c))
      .join(", ")}) VALUES (${placeholders})`

    await driver.execute(sql, values, env)
  },

  async deleteRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any,
  ): Promise<void> {
    if (!driver.execute) {
      throw new Error(`Driver ${driver.name} does not support SQL execution`)
    }
    const t = table as TableName
    const keyCol = TABLE_KEY[t]
    await driver.execute(
      `DELETE FROM ${qn(t, env)} WHERE ${quote(keyCol)} = ?`,
      [key],
      env,
    )
  },
}
