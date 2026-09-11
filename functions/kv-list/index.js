/**
 * GET /kv-list?prefix=xxx
 *
 * 列出 KV 键。需通过鉴权（内部调用标识 或 管理员 JWT）。
 *
 * EdgeOne KV list() 语义（依据官方 functions-kv 示例）：
 *   page.keys     -> [{ key, ttl, meta }]
 *   page.complete -> true 表示已到末页
 *   下一页 cursor 需手动取本页最后一个 key
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
    const keys = []
    let cursor = ""
    let complete = false
    let guard = 0

    // 安全阀：防止异常情况下无限循环
    while (!complete && guard < 1000) {
      guard += 1

      const page = await kv.list({ prefix, cursor, limit: 256 })
      const pageKeys = Array.isArray(page?.keys) ? page.keys : []

      for (const item of pageKeys) {
        if (item?.key) keys.push(item.key)
      }

      if (pageKeys.length > 0) {
        cursor = pageKeys[pageKeys.length - 1].key || ""
      }

      complete = Boolean(page?.complete) || pageKeys.length === 0
    }

    return json({ keys })
  } catch (err) {
    return json({ error: err?.message || String(err) }, 500)
  }
}
