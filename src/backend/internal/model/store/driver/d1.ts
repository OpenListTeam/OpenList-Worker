/**
 * Cloudflare D1 驱动（SQLite）
 * 
 * 环境变量：
 * - DB (Cloudflare D1 binding)
 * - OPENLIST_DB (别名)
 */
import type { Driver } from "../types"
import { buildDdl, KV_SCHEMA_SQLITE } from "../schema"

/**
 * 判断对象是否具备 D1 绑定接口形态。
 *
 * 必须校验：环境变量 `DB` 可能只是「绑定名」字符串，而非绑定对象，
 * 直接使用会得到 "db.prepare is not a function"。
 */
function isD1Like(b: any): boolean {
  if (!b || typeof b !== "object") return false
  try {
    return typeof b.prepare === "function"
  } catch {
    return false
  }
}

/**
 * 获取 D1 绑定。
 *
 * env 与 globalThis 独立检查：env 为真值时不阻断对 globalThis 的探测
 * （EdgeOne Edge Functions 会把绑定注入为全局标识符）。
 */
function getD1(env?: any): any | null {
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {}

  for (const name of ["DB", "OPENLIST_DB"]) {
    const fromEnv = env?.[name]
    if (isD1Like(fromEnv)) return fromEnv
    const fromGlobal = g?.[name]
    if (isD1Like(fromGlobal)) return fromGlobal
  }

  return null
}

const d1Inited = new WeakMap<object, boolean>()

async function ensureSchema(db: any, env?: any): Promise<void> {
  if (d1Inited.get(db)) return
  // KV 表（map/key 格式）+ 列式表（sql 格式）一并创建
  for (const ddl of [...KV_SCHEMA_SQLITE, ...buildDdl("sqlite", env)]) {
    await db.prepare(ddl).run()
  }
  d1Inited.set(db, true)
}

export const d1Driver: Driver = {
  name: "d1",

  async isAvailable(env?: any): Promise<boolean> {
    return getD1(env) != null
  },

  async init(env?: any): Promise<void> {
    const db = getD1(env)
    if (db) await ensureSchema(db)
  },

  async get(key: string, env?: any): Promise<string | null> {
    const db = getD1(env)
    if (!db) throw new Error("D1 binding not found")

    await ensureSchema(db, env)
    const result = await db
      .prepare("SELECT value FROM kv WHERE key = ?")
      .bind(key)
      .first()
    return result?.value || null
  },

  async put(key: string, value: string, env?: any): Promise<void> {
    const db = getD1(env)
    if (!db) throw new Error("D1 binding not found")

    await ensureSchema(db, env)
    await db
      .prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)")
      .bind(key, value)
      .run()
  },

  async delete(key: string, env?: any): Promise<void> {
    const db = getD1(env)
    if (!db) throw new Error("D1 binding not found")

    await ensureSchema(db, env)
    await db.prepare("DELETE FROM kv WHERE key = ?").bind(key).run()
  },

  async list(prefix: string, env?: any): Promise<string[]> {
    const db = getD1(env)
    if (!db) throw new Error("D1 binding not found")

    await ensureSchema(db, env)
    const result = await db
      .prepare("SELECT key FROM kv WHERE key LIKE ? ORDER BY key")
      .bind(`${prefix}%`)
      .all()
    return (result.results || []).map((r: any) => r.key)
  },

  async query(sql: string, params: any[], env?: any): Promise<any[]> {
    const db = getD1(env)
    if (!db) throw new Error("D1 binding not found")

    await ensureSchema(db, env)
    const stmt = db.prepare(sql)
    const result = await stmt.bind(...params).all()
    return result.results || []
  },

  async execute(sql: string, params: any[], env?: any): Promise<void> {
    const db = getD1(env)
    if (!db) throw new Error("D1 binding not found")

    await ensureSchema(db, env)
    const stmt = db.prepare(sql)
    await stmt.bind(...params).run()
  },

  async batch(
    statements: Array<{ sql: string; params: any[] }>,
    env?: any
  ): Promise<void> {
    const db = getD1(env)
    if (!db) throw new Error("D1 binding not found")

    await ensureSchema(db, env)

    // D1 batch 单次语句数上限约 100，必须分批提交。
    //
    // 语义边界（重要，不要误以为这里提供整体事务）：**片内原子，跨片不原子**。
    // D1 没有跨 batch 调用的事务，因此语句数 >100 时，后续片失败**不会**回滚
    // 已提交的片。要让整体操作可恢复，依赖两点：
    //   ① 上层 format/sql 生成的是幂等 UPSERT + 末位 DELETE NOT IN，整体重跑可收敛；
    //   ② 这里对**单片的瞬时失败**做有限重试，避免一次网络抖动就留下半成品。
    // 重试仍失败时，错误信息带上「已提交片数」，供调用方判断是否需要整体重跑。
    const BATCH = 100
    const MAX_RETRY = 2
    const stmts = statements.map((s) => db.prepare(s.sql).bind(...s.params))

    let committed = 0
    for (let i = 0; i < stmts.length; i += BATCH) {
      const chunk = stmts.slice(i, i + BATCH)
      let lastErr: any = null
      for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
        try {
          await db.batch(chunk)
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          if (attempt < MAX_RETRY) {
            await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
          }
        }
      }
      if (lastErr) {
        throw new Error(
          `D1 batch failed at chunk ${Math.floor(i / BATCH) + 1} ` +
            `(statements ${i}-${i + chunk.length - 1} of ${stmts.length}); ` +
            `${committed} statement(s) were already committed by earlier chunks and ` +
            `D1 cannot roll them back across batches. The save is idempotent, so ` +
            `retrying the whole operation converges. Cause: ${lastErr?.message || lastErr}`,
        )
      }
      committed += chunk.length
    }
  },

  async health(env?: any): Promise<any> {
    const db = getD1(env)
    if (!db) {
      return {
        configured: false,
        connected: false,
        platform: "Cloudflare D1",
        mode: "d1",
        error: "D1 binding not found (expected env.DB or env.OPENLIST_DB)",
      }
    }

    try {
      await db.prepare("SELECT 1").first()
      return {
        configured: true,
        connected: true,
        platform: "Cloudflare D1",
        mode: "d1",
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "Cloudflare D1",
        mode: "d1",
        error: err?.message || String(err),
      }
    }
  },
}
