/**
 * JSON / KV / Blob 后端（默认后端）。
 *
 * 从原 db.ts 原样迁移：EdgeOne Blob SDK、Cloudflare/EdgeOne KV binding、
 * Cloudflare KV REST API、内存回退。行为与原实现完全一致。
 */
import type { StoreBackend } from "./types"

// ---- EdgeOne Blob SDK (HTTP API, avoids Redis RESP protocol crashes) ----
let _blobStore: any = null
let _blobChecked = false

async function getBlobStore(): Promise<any | null> {
  if (_blobChecked) return _blobStore
  _blobChecked = true
  try {
    // @ts-ignore
    const { getStore } = await import("@edgeone/pages-blob")
    // In Makers Functions, projectId/token are auto-injected by the runtime.
    // TypeScript types require them, but the SDK works without them inside Functions.
    _blobStore = getStore({
      name: "openlist_db",
      consistency: "strong",
    } as any)
  } catch {
    _blobStore = null
  }
  return _blobStore
}

// ---- Safety net: catch uncaught exceptions from KV binding RESP parser ----
// Only registered in EdgeOne environments (invoked by getKvBinding detection),
// so Cloudflare Workers / local Node.js keep their default global error behavior.
let _respSafetyNetInstalled = false
function installRespSafetyNet() {
  if (_respSafetyNetInstalled) return
  _respSafetyNetInstalled = true
  if (typeof process === "undefined" || typeof process.on !== "function") return
  process.on("uncaughtException", (err: any) => {
    if (
      err?.message?.includes("RESP") ||
      err?.message?.includes("Unknown type") ||
      err?.stack?.includes("processResponses")
    ) {
      console.error(
        "[KV/RESP] Caught uncaught exception from storage binding, continuing:",
        err.message,
      )
      // Do NOT re-throw — let the function instance survive.
      // Subsequent requests will fall back to memoryDb.
    }
    // All other errors: let Node.js default handler process them.
  })
}

// JSON 后端的模块级环境上下文（与 db.ts 的 globalEnvCtx 并行维护，由
// db.ts 的 setEnvCtx 同步写入）。
let jsonEnvCtx: any = null

export function setJsonEnvCtx(env: any) {
  if (env) jsonEnvCtx = env
}

/**
 * 读取 json 后端内的显式存储方案开关（DB_JSON_BACKEND）。
 *
 * 取值（大小写不敏感）：
 *   - "auto"（默认）：按 blob → kv → cf_rest → 内存 顺序自动检测
 *   - "blob"：强制使用 EdgeOne Blob（@edgeone/pages-blob）
 *   - "kv"：强制使用 KV namespace binding（含 "binding" 别名）
 *   - "cf_rest"：强制使用 Cloudflare KV REST API（含 "cf-rest"/"rest"/"api" 别名）
 *
 * 未知取值原样返回，由 getKvBinding 告警并回退到 auto。
 */
export function readJsonBackend(env?: any): string {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  const raw = String(e?.DB_JSON_BACKEND || "")
    .trim()
    .toLowerCase()
  if (!raw) return "auto"
  if (raw === "cf_rest" || raw === "cf-rest" || raw === "rest" || raw === "api")
    return "cf_rest"
  if (raw === "kv" || raw === "binding") return "kv"
  if (raw === "blob" || raw === "auto") return raw
  return raw
}

const JSON_BACKENDS = new Set(["auto", "blob", "kv", "cf_rest"])

/**
 * Universal KV / Blob Storage Adapter for EdgeOne Makers & Cloudflare Workers
 *
 * 可通过 DB_JSON_BACKEND 显式指定方案；默认（auto）按以下顺序检测：
 *   1. @edgeone/pages-blob SDK (EdgeOne — HTTP API, no RESP crashes)
 *   2. KV namespace binding (Cloudflare Workers native)
 *   3. CF REST API (env vars)
 *   4. None (memory fallback)
 */
export async function getKvBinding(envCtx?: any): Promise<{
  binding: any
  platform: string
  mode: "binding" | "blob" | "api" | "none"
}> {
  if (envCtx) {
    jsonEnvCtx = envCtx
  }
  const env =
    envCtx || jsonEnvCtx || (typeof process !== "undefined" ? process.env : {})
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {}

  const forcedRaw = readJsonBackend(env)
  const forced = JSON_BACKENDS.has(forcedRaw) ? forcedRaw : "auto"
  if (forced !== forcedRaw) {
    console.warn(
      `[DB] unknown DB_JSON_BACKEND "${forcedRaw}", falling back to auto detection`,
    )
  }

  // 1. EdgeOne Blob SDK (HTTP API — avoids RESP protocol crashes)
  if (forced === "auto" || forced === "blob") {
    try {
      const blobStore = await getBlobStore()
      if (blobStore) {
        // Blob SDK only initializes inside the EdgeOne Makers runtime
        installRespSafetyNet()
        return {
          binding: blobStore,
          platform: "EdgeOne Blob (@edgeone/pages-blob, strong consistency)",
          mode: "blob",
        }
      }
    } catch {}
    if (forced === "blob") {
      return {
        binding: null,
        platform:
          "EdgeOne Blob (unavailable — @edgeone/pages-blob not initialized outside Makers)",
        mode: "none",
      }
    }
  }

  // 2. KV namespace binding (Cloudflare Workers native — no RESP issues)
  if (forced === "auto" || forced === "kv") {
    const customKvName =
      (env && (env.EDGEONE_KV_NAME || env.KV_NAMESPACE || env.KV_NAME)) ||
      g.EDGEONE_KV_NAME ||
      g.KV_NAMESPACE

    const candidates = [
      ...(customKvName ? [{ key: customKvName, name: customKvName }] : []),
      { key: "EDGEONE_KV", name: "EDGEONE_KV" },
      { key: "EO_KV", name: "EO_KV" },
      { key: "KV", name: "KV" },
      { key: "CF_KV", name: "CF_KV" },
      { key: "DATABASE_KV", name: "DATABASE_KV" },
    ]

    for (const c of candidates) {
      const b = (env && env[c.key]) || g[c.key]
      if (
        b &&
        typeof b.get === "function" &&
        (typeof b.put === "function" || typeof b.set === "function")
      ) {
        const isEdgeOne =
          c.key.startsWith("EDGEONE") ||
          c.key.startsWith("EO") ||
          Boolean(env && (env.EDGEONE || env.EO_REGION || env.EDGEONE_KV_NAME)) ||
          Boolean(g.EDGEONE_KV || g.EO_KV)
        if (isEdgeOne) installRespSafetyNet()
        const platformName = isEdgeOne
          ? `EdgeOne KV (${c.name})`
          : `Cloudflare / EdgeOne KV (${c.name})`

        return {
          binding: b,
          platform: platformName,
          mode: "binding",
        }
      }
    }

    if (forced === "kv") {
      return {
        binding: null,
        platform: "KV namespace binding (not found)",
        mode: "none",
      }
    }
  }

  // 3. Cloudflare REST API 模式
  if (forced === "auto" || forced === "cf_rest") {
    const cfAccountId =
      env.CF_ACCOUNT_ID ||
      (typeof process !== "undefined" ? process.env.CF_ACCOUNT_ID : "")
    const cfNamespaceId =
      env.CF_KV_NAMESPACE_ID ||
      (typeof process !== "undefined" ? process.env.CF_KV_NAMESPACE_ID : "")
    const cfApiToken =
      env.CF_API_TOKEN ||
      (typeof process !== "undefined" ? process.env.CF_API_TOKEN : "")

    if (cfAccountId && cfNamespaceId && cfApiToken) {
      return {
        binding: {
          type: "cf_rest",
          accountId: cfAccountId,
          namespaceId: cfNamespaceId,
          token: cfApiToken,
        },
        platform: "Cloudflare KV (REST API)",
        mode: "api",
      }
    }

    if (forced === "cf_rest") {
      return {
        binding: null,
        platform:
          "Cloudflare KV (REST API) — missing CF_ACCOUNT_ID / CF_KV_NAMESPACE_ID / CF_API_TOKEN",
        mode: "none",
      }
    }
  }

  return { binding: null, platform: "Memory", mode: "none" }
}

async function readFromKv(
  kvInfo: Awaited<ReturnType<typeof getKvBinding>>,
  key = "openlist_config",
): Promise<any | null> {
  const { binding, mode } = kvInfo
  if (mode === "none" || !binding) return null

  try {
    if (mode === "blob") {
      // @edgeone/pages-blob SDK: get(key, { type: "json" }) returns parsed object
      const val = await binding.get(key, { type: "json" })
      if (val) return val
      // Fallback: get as text and parse
      const text = await binding.get(key)
      if (text) {
        return typeof text === "string" ? JSON.parse(text) : text
      }
    } else if (mode === "binding") {
      let val: any = null
      try {
        // Cloudflare KV 支持 (key, "text")，EdgeOne KV 支持 (key)
        val = await binding.get(key, "text")
      } catch {
        val = await binding.get(key)
      }
      if (val === undefined || val === null) {
        val = await binding.get(key)
      }
      if (val) {
        return typeof val === "string" ? JSON.parse(val) : val
      }
    } else if (binding.type === "cf_rest") {
      const url = `https://api.cloudflare.com/client/v4/accounts/${binding.accountId}/storage/kv/namespaces/${binding.namespaceId}/values/${key}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${binding.token}` },
      })
      if (res.ok) {
        const text = await res.text()
        return JSON.parse(text)
      }
    }
  } catch (err) {
    console.error("[KV/Blob Store] Error reading key:", key, err)
  }
  return null
}

async function saveToKv(
  kvInfo: Awaited<ReturnType<typeof getKvBinding>>,
  key: string,
  data: any,
): Promise<boolean> {
  const { binding, mode } = kvInfo
  if (mode === "none" || !binding) return false

  const valStr = JSON.stringify(data)

  try {
    if (mode === "blob") {
      // @edgeone/pages-blob SDK: setJSON(key, value) for structured data
      if (typeof binding.setJSON === "function") {
        return (await binding.setJSON(key, data)) !== false
      }
      // Fallback: set(key, stringified)
      if (typeof binding.set === "function") {
        return (await binding.set(key, valStr)) !== false
      }
    } else if (mode === "binding") {
      // NOTE: only an explicit `false` counts as failure. Cloudflare KV's
      // put() resolves to void, so `undefined` must stay a success —
      // otherwise every normal write would be reported as failed.
      if (typeof binding.put === "function") {
        return (await binding.put(key, valStr)) !== false
      }
      if (typeof binding.set === "function") {
        return (await binding.set(key, valStr)) !== false
      }
    } else if (binding.type === "cf_rest") {
      const url = `https://api.cloudflare.com/client/v4/accounts/${binding.accountId}/storage/kv/namespaces/${binding.namespaceId}/values/${key}`
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${binding.token}`,
          "Content-Type": "text/plain",
        },
        body: valStr,
      })
      return res.ok
    }
  } catch (err) {
    console.error("[KV/Blob Store] Error writing key:", key, err)
  }
  return false
}

export async function getKvStatus(envCtx?: any) {
  const kvInfo = await getKvBinding(envCtx)
  const isConfigured = kvInfo.mode !== "none"
  let connected = false
  let error: string | null = null

  if (isConfigured) {
    try {
      const testVal = await readFromKv(kvInfo, "openlist_config")
      connected = true
      return {
        configured: true,
        connected: true,
        platform: kvInfo.platform,
        mode: kvInfo.mode,
        hasData: !!testVal,
        error: null,
      }
    } catch (err: any) {
      error = err.message || String(err)
    }
  }

  return {
    configured: isConfigured,
    connected,
    platform: kvInfo.platform,
    mode: kvInfo.mode,
    hasData: false,
    error,
  }
}

/** 默认后端：JSON / KV / Blob。 */
export const jsonBackend: StoreBackend = {
  name: "json",

  async load(env?: any): Promise<any | null> {
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none") return null
    return readFromKv(kvInfo, "openlist_config")
  },

  async save(data: any, env?: any): Promise<boolean> {
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none") return false
    const ok = await saveToKv(kvInfo, "openlist_config", data)
    if (!ok) {
      throw new Error(`Failed to persist config to KV (${kvInfo.platform})`)
    }
    return true
  },

  async isConfigured(env?: any): Promise<boolean> {
    const kvInfo = await getKvBinding(env)
    return kvInfo.mode !== "none"
  },

  async health(env?: any): Promise<any> {
    return getKvStatus(env)
  },
}
