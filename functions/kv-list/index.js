/**
 * GET /kv-list?prefix=xxx
 *
 * 列出 KV 键。需通过鉴权（内部调用标识 或 管理员 JWT）。
 *
 * EdgeOne KV list() 语义（依据官方 functions-kv 示例）：
 *   page.keys     -> [{ key, ttl, meta }]
 *   page.complete -> true 表示已到末页
 *   下一页 cursor 需手动取本页最后一个 key
 *
 * 分页加固：
 *   - 以本页最后一个 key 作为下一页 cursor（EdgeOne 约定）；
 *   - **重复页检测**：若本页首个 key 与上一页相同，说明 cursor 未生效
 *     （或平台语义变化），立即终止，避免返回大量重复项；
 *   - 结果去重，保证上游看到的键集合唯一。
 */
import { authorize, deny, json, kvMissing, resolveKv } from "../_kv-proxy.js"

export async function onRequest({ request, env }) {
  const auth = await authorize(request, env)
  if (!auth.ok) return deny(auth)

  const kv = resolveKv(env)
  if (!kv) return kvMissing()

  const { searchParams } = new URL(request.url)
  const prefix = searchParams.get("prefix") || ""

  try {
    const seen = new Set()
    let cursor = ""
    let complete = false
    let guard = 0
    let prevFirstKey = null

    // 安全阀：防止异常情况下无限循环
    while (!complete && guard < 1000) {
      guard += 1

      const page = await kv.list({ prefix, cursor, limit: 256 })
      const pageKeys = Array.isArray(page?.keys) ? page.keys : []

      if (pageKeys.length === 0) {
        complete = true
        break
      }

      const firstKey = pageKeys[0]?.key || null
      // 重复页检测：cursor 未推进（或平台语义变化）时立即终止
      if (firstKey !== null && firstKey === prevFirstKey) {
        console.warn(
          "[kv-list] repeated page detected; stopping pagination " +
            "to avoid returning duplicates",
        )
        break
      }
      prevFirstKey = firstKey

      for (const item of pageKeys) {
        if (item?.key) seen.add(item.key)
      }

      cursor = pageKeys[pageKeys.length - 1].key || ""
      complete = Boolean(page?.complete)
    }

    return json({ keys: [...seen] })
  } catch (err) {
    return json({ error: err?.message || String(err) }, 500)
  }
}
