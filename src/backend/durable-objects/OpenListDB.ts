/**
 * OpenList 数据库 Durable Object（SQLite 存储后端）。
 *
 * 调研结论（2026-09）：
 * - Durable Objects 提供内置 SQLite 存储（`ctx.storage.sql`），自 2024 年 GA，
 *   需要 `wrangler.toml` 的 migrations 声明 `new_sqlite_classes = ["OpenListDB"]`。
 * - 强一致性 + 事务，适合需要一致性的单租户部署。
 * - 限制：单 DO 实例有 CPU/内存/存储上限，高吞吐场景需自行分片；按计算与
 *   SQL 读写计费，成本高于 D1/KV。
 * - 与 D1 相比：D1 是无服务器的全局 SQLite，DO 是「有状态对象 + 内嵌 SQLite」。
 *   本项目的键值/列式两种格式 DO 均可支持。
 *
 * 通过 RPC 调用（stub.kvGet / sqlQuery 等），每个实例用 `idFromName` 定位到
 * 固定实例，保证数据持久在同一 DO 实例。
 */
import { D1_SCHEMA, KV_SCHEMA_SQLITE } from "../internal/model/store/schema"

export class OpenListDB {
  private state: any

  constructor(state: any) {
    this.state = state
  }

  /** SQLite Storage API（仅 SQLite 后端的 DO 可用）。 */
  private get sql(): any {
    return (this.state.storage as any).sql
  }

  /** 建表（幂等）：KV 表（map/key 格式）+ 列式表（sql 格式）。 */
  private ensureSchema(): void {
    for (const ddl of [...KV_SCHEMA_SQLITE, ...D1_SCHEMA]) {
      this.sql.exec(ddl)
    }
  }

  async init(): Promise<void> {
    this.ensureSchema()
  }

  // ---- 键值操作（map/key 格式）----

  async kvGet(key: string): Promise<string | null> {
    this.ensureSchema()
    const rows = this.sql
      .exec("SELECT value FROM kv WHERE key = ?", key)
      .toArray()
    return rows[0]?.value ?? null
  }

  async kvPut(key: string, value: string): Promise<void> {
    this.ensureSchema()
    this.sql.exec(
      "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)",
      key,
      value,
    )
  }

  async kvDelete(key: string): Promise<void> {
    this.ensureSchema()
    this.sql.exec("DELETE FROM kv WHERE key = ?", key)
  }

  async kvList(prefix: string): Promise<string[]> {
    this.ensureSchema()
    const rows = this.sql
      .exec("SELECT key FROM kv WHERE key LIKE ? ORDER BY key", `${prefix}%`)
      .toArray()
    return rows.map((r: any) => r.key)
  }

  // ---- SQL 操作（sql 格式）----

  async sqlQuery(sql: string, params: any[]): Promise<any[]> {
    this.ensureSchema()
    return this.sql.exec(sql, ...params).toArray()
  }

  async sqlExecute(sql: string, params: any[]): Promise<void> {
    this.ensureSchema()
    this.sql.exec(sql, ...params)
  }

  async sqlBatch(
    statements: Array<{ sql: string; params: any[] }>,
  ): Promise<void> {
    this.ensureSchema()
    // 事务内批量执行，保证「清空 + 重写」的原子性
    ;(this.state.storage as any).transactionSync(() => {
      for (const { sql, params } of statements) {
        this.sql.exec(sql, ...params)
      }
    })
  }

  async health(): Promise<void> {
    this.ensureSchema()
    this.sql.exec("SELECT 1")
  }
}
