/**
 * Key 格式适配器
 * 
 * 将数据按表拆分，每个实体一条记录，key 格式：
 * - openlist_tbl:settings:{key}
 * - openlist_tbl:users:{id}
 * - openlist_tbl:storages:{id}
 * - openlist_tbl:shares:{id}
 * - openlist_tbl:metas:{id}
 * - openlist_tbl:plugins:{id}
 * 
 * 避免大 JSON，适合频繁读写单条记录的场景。
 */
import type { FormatAdapter, Driver } from "../types"
import { TABLE_NAMES, TABLE_KEY, type TableName } from "../schema"

const PREFIX = "openlist_tbl:"
const INIT_MARK = "openlist_config"

export const keyFormat: FormatAdapter = {
  name: "key",

  async load(driver: Driver, env?: any): Promise<any | null> {
    // 检查是否已初始化
    const mark = await driver.get(INIT_MARK, env)
    if (!mark) return null

    const out: Record<string, any> = {}

    for (const table of TABLE_NAMES) {
      const keyCol = TABLE_KEY[table]
      const prefix = `${PREFIX}${table}:`
      const keys = await driver.list(prefix, env)

      const records = []
      for (const key of keys) {
        const raw = await driver.get(key, env)
        if (raw) {
          try {
            records.push(JSON.parse(raw))
          } catch (err) {
            console.warn(`[keyFormat] Failed to parse ${key}:`, err)
          }
        }
      }

      out[table] = records
    }

    return out
  },

  async save(data: any, driver: Driver, env?: any): Promise<boolean> {
    // 清空旧数据
    for (const table of TABLE_NAMES) {
      const prefix = `${PREFIX}${table}:`
      const keys = await driver.list(prefix, env)
      for (const key of keys) {
        await driver.delete(key, env)
      }
    }

    // 写入新数据
    for (const table of TABLE_NAMES) {
      const keyCol = TABLE_KEY[table]
      const records = data?.[table] || []

      for (const record of records) {
        const id = String(record?.[keyCol] ?? "")
        if (!id) continue

        const key = `${PREFIX}${table}:${id}`
        const value = JSON.stringify(record)
        await driver.put(key, value, env)
      }
    }

    // 标记已初始化
    await driver.put(INIT_MARK, String(Date.now()), env)
    return true
  },

  async getTable(table: string, driver: Driver, env?: any): Promise<any[]> {
    const prefix = `${PREFIX}${table}:`
    const keys = await driver.list(prefix, env)

    const records = []
    for (const key of keys) {
      const raw = await driver.get(key, env)
      if (raw) {
        try {
          records.push(JSON.parse(raw))
        } catch (err) {
          console.warn(`[keyFormat] Failed to parse ${key}:`, err)
        }
      }
    }

    return records
  },

  async saveTable(
    table: string,
    records: any[],
    driver: Driver,
    env?: any
  ): Promise<void> {
    const keyCol = TABLE_KEY[table as keyof typeof TABLE_KEY]
    const prefix = `${PREFIX}${table}:`

    // 清空旧数据
    const oldKeys = await driver.list(prefix, env)
    for (const key of oldKeys) {
      await driver.delete(key, env)
    }

    // 写入新数据
    for (const record of records) {
      const id = String(record?.[keyCol] ?? "")
      if (!id) continue

      const key = `${prefix}${id}`
      const value = JSON.stringify(record)
      await driver.put(key, value, env)
    }
  },

  async getRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any
  ): Promise<any | null> {
    const fullKey = `${PREFIX}${table}:${key}`
    const raw = await driver.get(fullKey, env)
    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch (err) {
      console.warn(`[keyFormat] Failed to parse ${fullKey}:`, err)
      return null
    }
  },

  async saveRecord(
    table: string,
    key: string,
    record: any,
    driver: Driver,
    env?: any
  ): Promise<void> {
    const fullKey = `${PREFIX}${table}:${key}`
    const value = JSON.stringify(record)
    await driver.put(fullKey, value, env)
  },

  async deleteRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any
  ): Promise<void> {
    const fullKey = `${PREFIX}${table}:${key}`
    await driver.delete(fullKey, env)
  },
}
