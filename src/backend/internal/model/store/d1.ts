/**
 * Cloudflare D1 后端（SQLite 方言）。
 *
 * 通过 wrangler 的 `d1_databases` 绑定 `DB`（兼容别名 `OPENLIST_DB`）访问，
 * 零额外 npm 依赖。使用「主键列 + data JSON 列」宽表，见 schema.ts。
 */
import type { StoreBackend } from "./types"
import {
  TABLE_NAMES,
  TABLE_KEY,
  TABLE_EXTRA_COLUMNS,
  D1_SCHEMA,
} from "./schema"

function getD1(env: any): any | null {
  const e =
    env || (typeof globalThis !== "undefined" ? (globalThis as any) : {})
  return e?.DB || e?.OPENLIST_DB || null
}

const d1Inited = new WeakMap<object, boolean>()

async function ensureSchema(db: any): Promise<void> {
  if (d1Inited.get(db)) return
  for (const ddl of D1_SCHEMA) {
    await db.prepare(ddl).run()
  }
  d1Inited.set(db, true)
}

const CONFIG_MARK = "openlist_config"

export const d1Backend: StoreBackend = {
  name: "d1",

  async isConfigured(env?: any): Promise<boolean> {
    return getD1(env) != null
  },

  async init(env?: any): Promise<void> {
    const db = getD1(env)
    if (db) await ensureSchema(db)
  },

  async load(env?: any): Promise<any | null> {
    const db = getD1(env)
    if (!db) return null
    await ensureSchema(db)

    // 以 schema_info 中的标记判断是否已初始化，避免把「空库」误判为已配置
    const mark = await db
      .prepare("SELECT v FROM schema_info WHERE k = ?")
      .bind(CONFIG_MARK)
      .first()
    if (!mark) return null

    const out: Record<string, any> = {}
    for (const table of TABLE_NAMES) {
      const res = await db.prepare(`SELECT data FROM ${table}`).all()
      out[table] = (res.results || []).map((r: any) => JSON.parse(r.data))
    }
    return out
  },

  async save(data: any, env?: any): Promise<boolean> {
    const db = getD1(env)
    if (!db) return false
    await ensureSchema(db)

    const stmts: any[] = []
    for (const table of TABLE_NAMES) {
      stmts.push(db.prepare(`DELETE FROM ${table}`))
    }
    for (const table of TABLE_NAMES) {
      const keyCol = TABLE_KEY[table]
      const extras = TABLE_EXTRA_COLUMNS[table]
      const cols = [keyCol, ...extras, "data"]
      const placeholders = cols.map(() => "?").join(", ")
      const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
      for (const entity of data?.[table] || []) {
        const values = [
          String(entity?.[keyCol] ?? ""),
          ...extras.map((c) => String(entity?.[c] ?? "")),
          JSON.stringify(entity),
        ]
        stmts.push(db.prepare(sql).bind(...values))
      }
    }
    // 标记已初始化（写在最后一并提交，保证与实体写入同批）
    stmts.push(
      db
        .prepare("INSERT OR REPLACE INTO schema_info (k, v) VALUES (?, ?)")
        .bind(CONFIG_MARK, String(Date.now())),
    )

    // D1 batch 单次语句数上限约 100，分批提交
    const BATCH = 100
    for (let i = 0; i < stmts.length; i += BATCH) {
      await db.batch(stmts.slice(i, i + BATCH))
    }
    return true
  },

  async health(env?: any): Promise<any> {
    const db = getD1(env)
    if (!db) {
      return {
        configured: false,
        connected: false,
        platform: "Cloudflare D1 (binding DB)",
        mode: "d1",
        hasData: false,
        error: "D1 binding not found (expected env.DB or env.OPENLIST_DB)",
      }
    }
    try {
      await db.prepare("SELECT 1").first()
      return {
        configured: true,
        connected: true,
        platform: "Cloudflare D1 (binding DB)",
        mode: "d1",
        hasData: true,
        error: null,
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "Cloudflare D1 (binding DB)",
        mode: "d1",
        hasData: false,
        error: err?.message || String(err),
      }
    }
  },
}
