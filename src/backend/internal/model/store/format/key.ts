/**
 * Key 格式适配器
 *
 * 将数据按表拆分，每个实体一条记录：
 * - settings_<key>
 * - users_<id>
 * - storages_<id>
 * - shares_<id>
 * - metas_<id>
 * - plugins_<id>
 *
 * 避免大 JSON，适合频繁读写单条记录的场景。
 *
 * 键名约束：EdgeOne KV 只接受字母、数字和下划线，因此分隔符用 `_`
 * 而不是 `:`，且 id 中的非法字符（如 UUID 的 `-`）需转义。
 *
 * 转义方案无需反向解析：所有读写都是"构造键名"，实体的主键值一律
 * 来自记录 JSON 本身，key 只用作存储地址。
 */
import type { FormatAdapter, Driver } from "../types"
import { TABLE_NAMES, TABLE_KEY, type TableName } from "../schema"
import { entityKeyOf, tableKeyPrefix } from "../keycodec"

const INIT_MARK = "openlist_config"

/** 构造表前缀（使用共享键名编码，兼容 EdgeOne KV 字符集约束） */
function tablePrefix(table: string): string {
  return tableKeyPrefix(table)
}

/** 构造完整键名 */
function fullKeyOf(table: string, id: string): string {
  return entityKeyOf(table, id)
}

export const keyFormat: FormatAdapter = {
  name: "key",

  async load(driver: Driver, env?: any): Promise<any | null> {
    // 检查是否已初始化
    const mark = await driver.get(INIT_MARK, env)
    if (!mark) return null

    const out: Record<string, any> = {}

    for (const table of TABLE_NAMES) {
      const prefix = tablePrefix(table)
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
    // 先写新数据，**最后**清理陈旧键。
    //
    // 稳定性不变量：save 失败不得让「原有数据整体消失」。
    // 历史实现是「先删光所有前缀键，再写新数据」：一旦写入阶段失败（网络抖动、
    // 配额、实例被杀），旧记录已被删除、新记录尚未写入，数据库直接变成空表。
    // 故障注入实测：users 从 1 条变为 0 条 —— 这是数据丢失，不是「保存失败」。
    //
    // 改为先写后删后，失败时的最坏情况是**残留**旧键（可被下一次成功保存清理），
    // 而不会丢数据；正常成功路径的最终状态与原来完全一致。
    const liveKeys = new Set<string>()
    for (const table of TABLE_NAMES) {
      const keyCol = TABLE_KEY[table]
      const records = data?.[table] || []

      for (const record of records) {
        const id = String(record?.[keyCol] ?? "")
        if (!id) continue

        const key = fullKeyOf(table, id)
        liveKeys.add(key)
        const value = JSON.stringify(record)
        await driver.put(key, value, env)
      }
    }

    // 清理本快照中已不存在的键（删除的实体 / 改名的键）
    for (const table of TABLE_NAMES) {
      const prefix = tablePrefix(table)
      const keys = await driver.list(prefix, env)
      for (const key of keys) {
        if (liveKeys.has(key)) continue
        await driver.delete(key, env)
      }
    }

    // 标记已初始化
    await driver.put(INIT_MARK, String(Date.now()), env)
    return true
  },

  async getTable(table: string, driver: Driver, env?: any): Promise<any[]> {
    const prefix = tablePrefix(table)
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
    const prefix = tablePrefix(table)

    // 清空旧数据
    const oldKeys = await driver.list(prefix, env)
    for (const key of oldKeys) {
      await driver.delete(key, env)
    }

    // 写入新数据
    for (const record of records) {
      const id = String(record?.[keyCol] ?? "")
      if (!id) continue

      const key = fullKeyOf(table, id)
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
    const fullKey = fullKeyOf(table, key)
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
    const fullKey = fullKeyOf(table, key)
    const value = JSON.stringify(record)
    await driver.put(fullKey, value, env)
  },

  async deleteRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any
  ): Promise<void> {
    const fullKey = fullKeyOf(table, key)
    await driver.delete(fullKey, env)
  },
}
