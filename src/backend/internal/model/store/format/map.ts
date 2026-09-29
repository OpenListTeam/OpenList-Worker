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
      // 关键：配置**损坏**绝不能等同于「没有数据」。
      //
      // 历史行为是打印一条日志后返回 null。但 loadDb() 用同一个 null 表示
      // 「后端为空（全新部署）」，两者无法区分，于是损坏的配置会被当成全新部署：
      // dbTrusted=false 且 getDbLoadError()=null → /api/public/init/setup 放行
      // → 无登录即可创建新管理员并把空壳写回，**覆盖真实配置**。
      // （实测：把持久化值改成非法 JSON 后，公开的初始化接口返回 200。）
      //
      // 这里改为抛错：loadDb() 会记录 dbLastLoadError 并保持 dbTrusted=false，
      // 初始化接口据此拒绝（返回 500 且不写入）。真正的空库不经过此分支，
      // 仍可正常初始化。
      throw new Error(
        `[mapFormat] persisted config is not valid JSON; refusing to treat it as an ` +
          `empty database. Restore or explicitly remove the "${CONFIG_KEY}" entry. ` +
          `Cause: ${(err as Error)?.message || String(err)}`,
      )
    }
  },

  async save(data: any, driver: Driver, env?: any): Promise<boolean> {
    const raw = JSON.stringify(data)
    await driver.put(CONFIG_KEY, raw, env)
    return true
  },
}
