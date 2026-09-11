/**
 * POST /kv-put
 * body: { key: string, value: string }
 *
 * 写入 KV。需通过鉴权（内部调用标识 或 管理员 JWT）。
 */
import { authorize, deny, json, kvMissing, resolveKv } from "../_kv-proxy.js"

export async function onRequestPost({ request, env }) {
  const auth = await authorize(request, env)
  if (!auth.ok) return deny(auth)

  const kv = resolveKv(env)
  if (!kv) return kvMissing()

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const { key, value } = body || {}
  if (!key || value === undefined || value === null) {
    return json({ error: "Missing key or value" }, 400)
  }

  try {
    await kv.put(String(key), String(value))
    return json({ success: true })
  } catch (err) {
    return json({ error: err?.message || String(err) }, 500)
  }
}

/** 非 POST 请求统一拒绝 */
export async function onRequest() {
  return json({ error: "Method not allowed, use POST" }, 405)
}
