/**
 * 内存驱动（模块级 Map，不持久化）。
 *
 * 作为 auto 检测失败时的最终回退，保证无任何存储绑定的环境下（本地开发、
 * 容器、CI）仍能正常读写配置（仅在单实例内存中生效，进程重启后丢失）。
 * 与旧版 json 后端的「无绑定 → 内存回退」行为一致。
 */
import type { Driver } from "../types"

const store = new Map<string, string>()

export const memoryDriver: Driver = {
  name: "memory",

  async isAvailable(): Promise<boolean> {
    return true
  },

  async init(): Promise<void> {
    // 无需初始化
  },

  async get(key: string): Promise<string | null> {
    return store.get(key) ?? null
  },

  async put(key: string, value: string): Promise<void> {
    store.set(key, value)
  },

  async delete(key: string): Promise<void> {
    store.delete(key)
  },

  async list(prefix: string): Promise<string[]> {
    return [...store.keys()].filter((k) => k.startsWith(prefix))
  },

  async health(): Promise<any> {
    return {
      configured: true,
      connected: true,
      platform: "Memory",
      mode: "memory",
      hasData: store.size > 0,
      error: null,
    }
  },
}
