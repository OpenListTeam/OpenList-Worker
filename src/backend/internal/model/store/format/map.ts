/**
 * Map 格式适配器
 * 
 * 将整个数据对象序列化为单个 JSON 字符串，存储在单个键中。
 * 适用于 KV/Blob 等简单存储系统。
 * 
 * 存储格式：
 * - key: "openlist_config"
 * - value: JSON.stringify(data)
 */
import type { FormatAdapter, Driver } from "../types"

const CONFIG_KEY = "openlist_config"

export const mapFormat: FormatAdapter = {
  name: "map",

  async load(driver: Driver, env?: any): Promise<any | null> {
    const raw = await driver.get(CONFIG_KEY, env)
    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch (err) {
      console.error("[mapFormat] Failed to parse JSON:", err)
      return null
    }
  },

  async save(data: any, driver: Driver, env?: any): Promise<boolean> {
    const raw = JSON.stringify(data)
    await driver.put(CONFIG_KEY, raw, env)
    return true
  },
}
