/**
 * MySQL 驱动（Node.js 容器模式）
 * 
 * 通过 mysql2/promise 动态加载，仅在 Node.js 运行时可用。
 * 
 * 环境变量：
 * - MYSQL_URL（优先）
 * - MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASS, MYSQL_NAME
 */
import type { Driver } from "../types"
import { buildDdl, getTablePrefix, KV_SCHEMA_MYSQL } from "../schema"

function isNode(): boolean {
  return typeof process !== "undefined" && process.release?.name === "node"
}

function getMysqlConfig(env: any): any | null {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  const url = e?.MYSQL_URL
  if (url) return url

  const host = e?.MYSQL_HOST
  if (!host) return null
  return {
    host,
    port: Number(e?.MYSQL_PORT || 3306),
    user: e?.MYSQL_USER || "",
    password: e?.MYSQL_PASS || "",
    database: e?.MYSQL_NAME || "",
  }
}

let _pool: any = null
let _poolKey: string | null = null

async function getPool(env: any): Promise<any | null> {
  const config = getMysqlConfig(env)
  if (!config) return null
  const key = JSON.stringify(config)
  if (_pool && _poolKey === key) return _pool
  
  // 动态 import，避免打包到 Workers
  const specifier = "mysql2/promise"
  const { createPool } = await import(specifier)
  _pool = createPool(config)
  _poolKey = key
  return _pool
}

let _schemaInitedPrefix: string | null = null

async function ensureSchema(pool: any, env?: any): Promise<void> {
  const prefix = getTablePrefix(env)
  if (_schemaInitedPrefix === prefix) return
  // KV 表（map/key 格式）+ 列式表（sql 格式）一并创建
  for (const ddl of [...KV_SCHEMA_MYSQL, ...buildDdl("mysql", env)]) {
    await pool.query(ddl)
  }
  _schemaInitedPrefix = prefix
}

export const mysqlDriver: Driver = {
  name: "mysql",

  async isAvailable(env?: any): Promise<boolean> {
    if (!isNode()) return false
    return getMysqlConfig(env) != null
  },

  async init(env?: any): Promise<void> {
    const pool = await getPool(env)
    if (pool) await ensureSchema(pool)
  },

  async get(key: string, env?: any): Promise<string | null> {
    const pool = await getPool(env)
    if (!pool) throw new Error("MySQL pool not available")

    await ensureSchema(pool, env)
    const [rows]: any[] = await pool.query(
      "SELECT `value` FROM `kv` WHERE `key` = ?",
      [key]
    )
    return rows?.[0]?.value || null
  },

  async put(key: string, value: string, env?: any): Promise<void> {
    const pool = await getPool(env)
    if (!pool) throw new Error("MySQL pool not available")

    await ensureSchema(pool, env)
    await pool.query(
      "INSERT INTO `kv` (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [key, value]
    )
  },

  async delete(key: string, env?: any): Promise<void> {
    const pool = await getPool(env)
    if (!pool) throw new Error("MySQL pool not available")

    await ensureSchema(pool, env)
    await pool.query("DELETE FROM `kv` WHERE `key` = ?", [key])
  },

  async list(prefix: string, env?: any): Promise<string[]> {
    const pool = await getPool(env)
    if (!pool) throw new Error("MySQL pool not available")

    await ensureSchema(pool, env)
    const [rows]: any[] = await pool.query(
      "SELECT `key` FROM `kv` WHERE `key` LIKE ? ORDER BY `key`",
      [`${prefix}%`]
    )
    return (rows || []).map((r: any) => r.key)
  },

  async query(sql: string, params: any[], env?: any): Promise<any[]> {
    const pool = await getPool(env)
    if (!pool) throw new Error("MySQL pool not available")

    await ensureSchema(pool, env)
    const [rows]: any[] = await pool.query(sql, params)
    return rows || []
  },

  async execute(sql: string, params: any[], env?: any): Promise<void> {
    const pool = await getPool(env)
    if (!pool) throw new Error("MySQL pool not available")

    await ensureSchema(pool, env)
    await pool.query(sql, params)
  },

  async batch(
    statements: Array<{ sql: string; params: any[] }>,
    env?: any
  ): Promise<void> {
    const pool = await getPool(env)
    if (!pool) throw new Error("MySQL pool not available")

    await ensureSchema(pool, env)
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      for (const stmt of statements) {
        await conn.query(stmt.sql, stmt.params)
      }
      await conn.commit()
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
        error: "MySQL config not found (expected MYSQL_URLS or MYSQL_HOST)",
      }
    }
    
    try {
      const pool = await getPool(env)
      await pool.query("SELECT 1")
      return {
        configured: true,
        connected: true,
        platform: "MySQL (mysql2)",
        mode: "mysql",
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "MySQL (mysql2)",
        mode: "mysql",
        error: err?.message || String(err),
      }
    }
  },
}
