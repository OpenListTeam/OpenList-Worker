/**
 * SQL 格式适配器（列式表，与 Go 后端完全一致）。
 *
 * 每个字段对应一列，表结构由 schema.ts 的 TABLES 定义。字段名对齐 Go 的
 * json tag，表名通过 TABLE_SQL_NAMES 映射为 Go 的复数名并加上固定前缀 "x_"
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

/**
 * 生成 UPSERT 语句。
 *
 * SQLite（D1 / DO）与 MySQL 语法不同，必须按方言分支：
 *   - SQLite: INSERT OR REPLACE INTO ...
 *   - MySQL:  INSERT INTO ... ON DUPLICATE KEY UPDATE ...
 *
 * 驱动名即方言标识：d1 / do 为 SQLite，mysql 为 MySQL。
 */
function upsertSql(
  table: string,
  columns: string[],
  params: any[],
  driver: Driver,
): { sql: string; params: any[] } {
  const cols = columns.map((c) => quote(c)).join(", ")
  const placeholders = columns.map(() => "?").join(", ")

  if (driver.name === "mysql") {
    // MySQL 无 INSERT OR REPLACE；用 ON DUPLICATE KEY UPDATE 覆盖全部非主键列。
    // 主键列不参与 UPDATE（写回自身无意义），其余列以 VALUES(col) 覆盖。
    const updates = columns
      .slice(1)
      .map((c) => `${quote(c)} = VALUES(${quote(c)})`)
      .join(", ")
    const sql = updates
      ? `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`
      : `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`
    return { sql, params }
  }

  return {
    sql: `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`,
    params,
  }
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

    // 标记已初始化（方言兼容的 UPSERT）
    statements.push(
      upsertSql(
        quote("schema_info"),
        ["k", "v"],
        [INIT_MARK, String(Date.now())],
        driver,
      ),
    )

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
    // 方言兼容的 UPSERT（SQLite: INSERT OR REPLACE / MySQL: ON DUPLICATE KEY UPDATE）
    const { sql } = upsertSql(qn(t, env), columns, values, driver)

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
