/**
 * KV 分表后端（DB_DRIVER = "kv"）。
 *
 * 与 json 后端（整对象存单个 key）不同，本后端仿照 d1/mysql 的「分表」思想，
 * 把 6 张实体表拆成多条 KV 记录：每个实体一条，key 形如
 *   `openlist_tbl:<table>:<primaryKey>`
 * value 为该实体 JSON（敏感字段已由 db.ts 在持久化边界 seal 为 enc:v1:）。
 *
 * 收益：
 *   - 读写不再每次搬运整个大 JSON，降低 KV 读放大与请求体开销；
 *   - 单 key 更小，规避 KV 单 key 大小上限。
 *
 * 存储目标复用 store/json.ts 的 getKvBinding() 探测结果，支持：
 *   - KV namespace binding（Cloudflare KV / EdgeOne KV）
 *   - EdgeOne Blob（@edgeone/pages-blob，同样具备 list/delete 能力）
 * 不支持的 mode（CF REST API / 无绑定）视为未配置。
 *
 * 已知边界：KV 无事务与强一致 list，save 采用「list 前缀 → 删除旧 key → 写入
 * 全部实体」的全量替换，极端并发下可能出现短暂的中间态（见文档 1-00001）。
 */
import type { StoreBackend } from "./types"
import { getKvBinding } from "./json"
import { TABLE_NAMES, keyOf } from "./schema"

/** 所有分表 key 的统一前缀，避免与 openlist_config / openlist_jwt_secret 冲突。 */
const KEY_PREFIX = "openlist_tbl:"
/** 初始化标记 key：存在即视为「已写入过配置」，避免空库被误判为已配置。 */
const MARK_KEY = `${KEY_PREFIX}schema_info`

function tablePrefix(table: string): string {
  return `${KEY_PREFIX}${table}:`
}

function entityKey(table: string, id: string): string {
  return `${tablePrefix(table)}${id}`
}

/** 从 getKvBinding 探测结果中提取可用的 list/delete/get/put 适配层。 */
async function getKvAdapter(env?: any): Promise<{
  mode: "binding" | "blob"
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  listKeys(prefix: string): Promise<string[]>
} | null> {
  const info = await getKvBinding(env)
  const { binding, mode } = info
  if (mode === "none" || mode === "api" || !binding) return null

  if (mode === "blob") {
    return {
      mode: "blob",
      get: async (key) => {
        const v = await binding.get(key)
        if (v == null) return null
        return typeof v === "string" ? v : JSON.stringify(v)
      },
      put: async (key, value) => {
        await binding.set(key, value)
      },
      delete: async (key) => {
        await binding.delete(key)
      },
      listKeys: async (prefix) => {
        // pages-blob Store.list: { blobs: [{ key }] }，paginate 默认 true 返回全部
        const res = await binding.list({ prefix, paginate: true })
        return (res.blobs || []).map((b: any) => b.key)
      },
    }
  }

  // KV namespace binding（Cloudflare KV / EdgeOne KV）
  return {
    mode: "binding",
    get: async (key) => {
      let v: any = null
      try {
        v = await binding.get(key, "text")
      } catch {
        v = await binding.get(key)
      }
      if (v == null) return null
      return typeof v === "string" ? v : JSON.stringify(v)
    },
    put: async (key, value) => {
      if (typeof binding.put === "function") await binding.put(key, value)
      else if (typeof binding.set === "function") await binding.set(key, value)
    },
    delete: async (key) => {
      if (typeof binding.delete === "function") await binding.delete(key)
      else if (typeof binding.remove === "function") await binding.remove(key)
    },
    listKeys: async (prefix) => {
      // Cloudflare KV list({ prefix }) -> { keys: [{ name }], list_complete, cursor }
      const out: string[] = []
      let cursor: string | undefined
      do {
        const res: any = await binding.list({ prefix, ...(cursor ? { cursor } : {}) })
        const names: string[] = (res.keys || []).map((k: any) => k.name)
        out.push(...names)
        cursor = res.cursor || undefined
        if (res.list_complete === false && cursor) continue
        break
      } while (cursor)
      return out
    },
  }
}

export const kvBackend: StoreBackend = {
  name: "kv",

  async isConfigured(env?: any): Promise<boolean> {
    return (await getKvAdapter(env)) != null
  },

  async load(env?: any): Promise<any | null> {
    const kv = await getKvAdapter(env)
    if (!kv) return null

    const mark = await kv.get(MARK_KEY)
    if (!mark) return null

    const out: Record<string, any> = {}
    for (const table of TABLE_NAMES) {
      const keys = await kv.listKeys(tablePrefix(table))
      const rows: any[] = []
      for (const k of keys) {
        const raw = await kv.get(k)
        if (raw == null) continue
        try {
          rows.push(JSON.parse(raw))
        } catch (err) {
          console.error(`[KV Store] Failed to parse entity ${k}:`, err)
        }
      }
      out[table] = rows
    }
    return out
  },

  async save(data: any, env?: any): Promise<boolean> {
    const kv = await getKvAdapter(env)
    if (!kv) return false

    // 全量替换：先删旧 key，再写全部实体（KV 无事务，见文件头说明）。
    for (const table of TABLE_NAMES) {
      const prefix = tablePrefix(table)
      const existing = await kv.listKeys(prefix)
      for (const k of existing) {
        await kv.delete(k)
      }
      for (const entity of data?.[table] || []) {
        await kv.put(entityKey(table, keyOf(table, entity)), JSON.stringify(entity))
      }
    }
    // 最后写初始化标记（与实体写入无事务，但写入顺序保证 load 侧标记存在时实体已写入）。
    await kv.put(MARK_KEY, String(Date.now()))
    return true
  },

  async health(env?: any): Promise<any> {
    const info = await getKvBinding(env)
    const kv = await getKvAdapter(env)
    if (!kv) {
      return {
        configured: false,
        connected: false,
        platform: info.platform,
        mode: "kv",
        hasData: false,
        error: "KV 分表后端需要 KV binding 或 Blob 存储（当前 mode: " + info.mode + "）",
      }
    }
    try {
      const mark = await kv.get(MARK_KEY)
      return {
        configured: true,
        connected: true,
        platform: info.platform,
        mode: "kv",
        hasData: !!mark,
        error: null,
      }
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        platform: info.platform,
        mode: "kv",
        hasData: false,
        error: err?.message || String(err),
      }
    }
  },
}
