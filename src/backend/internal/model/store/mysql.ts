/**
 * 外部 MySQL 后端（Node.js 容器模式）。
 *
 * 通过 mysql2/promise 动态加载，仅在 Node.js 运行时可用；Cloudflare Workers /
 * 边缘构建不打包该依赖、不执行该路径（与 SFTP/FTP/Local 驱动同模式）。
 * 保存走事务，保证全量替换的原子性。
 */
import type { StoreBackend } from "./types"
import {
  TABLE_NAMES,
  TABLE_KEY,
  TABLE_EXTRA_COLUMNS,
  MYSQL_SCHEMA,
} from "./schema"

function isNode(): boolean {
  return typeof process !== "undefined" && process.release?.name === "node"
}

function getMysqlConfig(env: any): any | null {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  const url = e?.MYSQL_URL || e?.DATABASE_URL
  if (url) return url

  const host = e?.MYSQL_HOST
  if (!host) return null
  return {
    host,
    port: Number(e?.MYSQL_PORT || 3306),
    user: e?.MYSQL_USER || "",
    password: e?.MYSQL_PASSWORD || "",
    database: e?.MYSQL_DATABASE || "",
  }
}

let _pool: any = null
let _poolKey: string | null = null

async function getPool(env: any): Promise<any | null> {
  const config = getMysqlConfig(env)
  if (!config) return null
  const key = JSON.stringify(config)
  if (_pool && _poolKey === key) return _pool
  // 用变量（而非字符串字面量）做动态 import，使打包器无法静态解析 mysql2，
  // 从而在 CF Workers / 边缘构建时不打包该依赖（其依赖 Node 内置模块）。
  // 该路径仅 Node.js 容器运行时（DB_DRIVER=mysql）会执行。
  const specifier = "mysql2/promise"
  const { createPool } = await import(specifier)
  _pool = createPool(config)
  _poolKey = key
  return _pool
}

let _schemaInited = false

async function ensureSchema(pool: any): Promise<void> {
  if (_schemaInited) return
  for (const ddl of MYSQL_SCHEMA) {
    await pool.query(ddl)
  }
  _schemaInited = true
}

const CONFIG_MARK = "openlist_config"

export const mysqlBackend: StoreBackend = {
  name: "mysql",

  async isConfigured(env?: any): Promise<boolean> {
    if (!isNode()) return false
    return getMysqlConfig(env) != null
  },

  async init(env?: any): Promise<void> {
    const pool = await getPool(env)
    if (pool) await ensureSchema(pool)
  },

  async load(env?: any): Promise<any | null> {
    if (!isNode()) return null
    const pool = await getPool(env)
    if (!pool) return null
    await ensureSchema(pool)

    const [rows]: any[] = await pool.query(
      "SELECT `v` FROM `schema_info` WHERE `k` = ?",
      [CONFIG_MARK],
    )
    if (!rows || rows.length === 0) return null

    const out: Record<string, any> = {}
    for (const table of TABLE_NAMES) {
      const [r]: any[] = await pool.query(`SELECT \`data\` FROM \`${table}\``)
      out[table] = (r || []).map((row: any) => JSON.parse(row.data))
    }
    return out
  },

  async save(data: any, env?: any): Promise<boolean> {
    if (!isNode()) return false
    const pool = await getPool(env)
    if (!pool) return false
    await ensureSchema(pool)

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      for (const table of TABLE_NAMES) {
        await conn.query(`DELETE FROM \`${table}\``)
      }
      for (const table of TABLE_NAMES) {
        const keyCol = TABLE_KEY[table]
        const extras = TABLE_EXTRA_COLUMNS[table]
        const cols = [keyCol, ...extras, "data"]
        const quotedCols = cols.map((c) => `\`${c}\``).join(", ")
        const placeholders = cols.map(() => "?").join(", ")
        const sql = `INSERT INTO \`${table}\` (${quotedCols}) VALUES (${placeholders})`
        for (const entity of data?.[table] || []) {
          const values = [
            String(entity?.[keyCol] ?? ""),
            ...extras.map((c) => String(entity?.[c] ?? "")),
            JSON.stringify(entity),
          ]
          await conn.query(sql, values)
        }
      }
      await conn.query(
        "INSERT INTO `schema_info` (`k`, `v`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `v` = VALUES(`v`)",
        [CONFIG_MARK, String(Date.now())],
      )
      await conn.commit()
      return true
    } catch (err) {
      try {
        await conn.rollback()
      } catch {}
      throw err
    } finally {
      conn.release()
    }
  },

  async health(env?: any): Promise<any> {
    if (!isNode()) {
      return {
        configured: false,
        connected: false,
        platform: "MySQL (mysql2)",
        mode: "mysql",
        hasData: false,
        error: "MySQL backend requires Node.js runtime",
      }
    }
    const config = getMysqlConfig(env)
    if (!config) {
      return {
        configured: false,
        connected: false,
        platform: "MySQL (mysql2)",
        mode: "mysql",
        hasData: false,
        error: "MySQL config not found (expected MYSQL_URL or MYSQL_HOST)",
      }
    }
    const pool = await getPool(env)
    try {
      await pool.query("SELECT 1")
      return {
        configured: true,
        connected: true,
        platform: "MySQL (mysql2)",
        mode: "mysql",
        hasData: true,
        error: null,
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "MySQL (mysql2)",
        mode: "mysql",
        hasData: false,
        error: err?.message || String(err),
      }
    }
  },
}
