/**
 * Blob 驱动：腾讯云 EdgeOne Blob / 阿里云 ESA Blob
 * 
 * 环境变量：
 * - EDGEONE_BLOB (EdgeOne binding)
 * - ESA_BLOB (ESA binding)
 */
import type { Driver } from "../types"

/**
 * 检测 Blob binding（EdgeOne 或 ESA）
 */
function getBlobBinding(env?: any): any | null {
  const e = env || (globalThis as any) || {}
  return e?.EDGEONE_BLOB || e?.ESA_BLOB || null
}

export const blobDriver: Driver = {
  name: "blob",

  async isAvailable(env?: any): Promise<boolean> {
    return getBlobBinding(env) !== null
  },

  async init(env?: any): Promise<void> {
    // Blob 无需初始化
  },

  async get(key: string, env?: any): Promise<string | null> {
    const blob = getBlobBinding(env)
    if (!blob) throw new Error("Blob binding not found")

    try {
      const obj = await blob.get(key)
      if (!obj) return null
      return await obj.text()
    } catch (err) {
      console.warn(`[Blob] get key="${key}" failed:`, err)
      return null
    }
  },

  async put(key: string, value: string, env?: any): Promise<void> {
    const blob = getBlobBinding(env)
    if (!blob) throw new Error("Blob binding not found")

    await blob.put(key, value)
  },

  async delete(key: string, env?: any): Promise<void> {
    const blob = getBlobBinding(env)
    if (!blob) throw new Error("Blob binding not found")

    await blob.delete(key)
  },

  async list(prefix: string, env?: any): Promise<string[]> {
    const blob = getBlobBinding(env)
    if (!blob) throw new Error("Blob binding not found")

    const result = await blob.list({ prefix })
    return (result?.objects || []).map((obj: any) => obj.key)
  },

  async health(env?: any): Promise<any> {
    const blob = getBlobBinding(env)
    if (!blob) {
      return {
        configured: false,
        connected: false,
        platform: "Blob (EdgeOne/ESA)",
        mode: "blob",
        error: "Blob binding not found",
      }
    }

    try {
      await blob.head("__health_check__")
      return {
        configured: true,
        connected: true,
        platform: blob.constructor?.name?.includes("ESA") ? "Alibaba ESA Blob" : "Tencent EdgeOne Blob",
        mode: "blob",
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: "Blob (EdgeOne/ESA)",
        mode: "blob",
        error: err?.message || String(err),
      }
    }
  },
}
