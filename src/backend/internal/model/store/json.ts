/**
 * JSON / KV / Blob 后端（默认后端）。
 *
 * 从原 db.ts 原样迁移：EdgeOne Blob SDK、Cloudflare/EdgeOne KV binding、
 * Cloudflare KV REST API、内存回退。行为与原实现完全一致。
 */
import type { StoreBackend } from "./types"

// ---- EdgeOne Blob SDK (HTTP API, avoids Redis RESP protocol crashes) ----
let _blobStore: any = null

/**
 * 探测次数上限。
 *
 * 只缓存「成功」结果，失败不缓存：
 * 冷启动早期 SDK 可能尚未就绪，若把失败也永久缓存，会导致整个实例
 * 生命周期内再也不会尝试，表现为「明明能用却一直报无持久化后端」。
 * 同时设上限避免每个请求都重复探测。
 */
let _blobProbeCount = 0

async function getBlobStore(): Promise<any | null> {
  if (_blobStore) return _blobStore // 成功过：直接复用
  if (_blobProbeCount >= 3) return null // 连续失败：不再重试
  _blobProbeCount++
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
    return null // 不缓存失败，允许后续请求重试
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
/**
 * 判断一个对象是否是「可用的 Web KV binding」。
 *
 * 这一校验必不可少：EdgeOne Node 云函数也会注入一个名为 `KV` 的绑定，
 * 但它走 RESP/Redis 协议（TCP socket），调用 get/put 会抛出
 * "cannot find the collection by name"，而不是提供 Web KV API。
 * 只有具备 get() 且具备 put()/set() 的对象才算可用。
 *
 * 同时排除字符串等原始值 —— 环境变量 `KV` 可能是绑定名（字符串），
 * 直接当绑定使用会得到 "kv.get is not a function"。
 */
export function isWebKv(b: any): boolean {
  if (!b || typeof b !== "object") return false
  // 属性访问可能触发异常 getter（代理对象、SDK 惰性初始化等），
  // 任何异常都视为「不是可用绑定」，避免让探测本身崩溃。
  try {
    if (typeof b.get !== "function") return false
    return typeof b.put === "function" || typeof b.set === "function"
  } catch {
    return false
  }
}

/**
 * 创建基于 HTTP 代理的 KV 适配器。
 *
 * 用于 EdgeOne Node 云函数：拿不到 KV binding，必须经 Edge Function
 * （functions/kv-*）代为访问。对外暴露与原生 binding 相同的接口，
 * 使调用方（middlewares/auth/admin）无需感知差异。
 */
function createProxyBinding(origin: string, env: any): any {
  const base = String(origin).replace(/\/$/, "")
  const headers = (): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    // 用密钥前 16 位作为内部调用标识（Edge Function 侧常量时间比对）
    const secret = env?.ENCRYPTION_SECRET || env?.JWT_SECRET
    if (typeof secret === "string" && secret.length >= 16) {
      h["X-Internal-Call"] = secret.slice(0, 16)
    }
    return h
  }

  const decode = (v: any): string | null => {
    if (v === null || v === undefined) return null
    return typeof v === "string" ? v : String(v)
  }

  return {
    async get(key: string): Promise<string | null> {
      const res = await fetch(`${base}/kv-get?key=${encodeURIComponent(key)}`, {
        method: "GET",
        headers: headers(),
      })
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error(`KV proxy get failed: HTTP ${res.status}`)
      }
      const body: any = await res.json().catch(() => ({}))
      return decode(body?.value)
    },

    async put(key: string, value: string): Promise<void> {
      const res = await fetch(`${base}/kv-put`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error(`KV proxy put failed: HTTP ${res.status}`)
    },

    async delete(key: string): Promise<void> {
      const res = await fetch(
        `${base}/kv-delete?key=${encodeURIComponent(key)}`,
        { method: "DELETE", headers: headers() },
      )
      if (!res.ok && res.status !== 404) {
        throw new Error(`KV proxy delete failed: HTTP ${res.status}`)
      }
    },

    async list(opts: { prefix?: string } = {}): Promise<{ keys: any[] }> {
      const prefix = opts?.prefix || ""
      const res = await fetch(
        `${base}/kv-list?prefix=${encodeURIComponent(prefix)}`,
        { method: "GET", headers: headers() },
      )
      if (!res.ok) throw new Error(`KV proxy list failed: HTTP ${res.status}`)
      const body: any = await res.json().catch(() => ({}))
      const keys = Array.isArray(body?.keys) ? body.keys : []
      // 兼容 binding 形态：调用方读取 k.name / k.key 两种写法
      return { keys: keys.map((name: string) => ({ name, key: name })) }
    },
  }
}

export async function getKvBinding(envCtx?: any): Promise<{
  binding: any
  platform: string
  mode: "binding" | "blob" | "api" | "proxy" | "none"
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

  /**
   * 原生 KV binding 探测。
   *
   * 两点必须注意：
   *  1. env 与 globalThis 需独立检查 —— env 为真值时不会回退到 globalThis，
   *     而 EdgeOne Edge Functions 把绑定名注入为全局标识符。
   *  2. 必须做接口形态校验 —— EdgeOne Node 云函数也会注入名为 `KV` 的绑定，
   *     但它走 RESP/Redis 协议（TCP socket），调用 put/get 会抛
   *     "cannot find the collection by name"，而非提供 Web KV API。
   *     只有具备 get/put(或 set) 的对象才算可用的 KV binding。
   */
  let nativeKv: any = null
  for (const name of [
    "EDGEONE_KV",
    "EO_KV",
    "KV",
    "CF_KV",
    "DATABASE_KV",
  ]) {
    const fromEnv = env?.[name]
    if (isWebKv(fromEnv)) {
      nativeKv = fromEnv
      break
    }
    const fromGlobal = g?.[name]
    if (isWebKv(fromGlobal)) {
      nativeKv = fromGlobal
      break
    }
  }

  // 0. EdgeOne Node 云函数：显式 DB_DRIVER=kv 且无原生 binding → 走 HTTP 代理。
  //    放在 Blob 之前，确保用户显式选择的 KV 优先于自动探测出的 Blob。
  const kvPreferred =
    String(env?.DB_DRIVER || "").trim().toLowerCase() === "kv" || forced === "kv"
  if (kvPreferred && !nativeKv) {
    let origin: any
    try {
      origin = env?.EDGE_KV_BASE_URL || env?.__requestOrigin
    } catch {
      origin = undefined
    }
    if (typeof origin === "string" && origin.startsWith("http")) {
      console.log("[DB] getKvBinding: using EdgeOne KV via Edge Function proxy")
      return {
        binding: createProxyBinding(origin, env),
        platform: "EdgeOne KV (via Edge Function proxy)",
        mode: "proxy",
      }
    }
    console.warn(
      "[DB] getKvBinding: KV proxy requested but no origin available " +
        "(set EDGE_KV_BASE_URL or ensure request origin is injected)",
    )
  }

  // 1. EdgeOne Blob SDK (HTTP API — avoids RESP protocol crashes)
  if (forced === "auto" || forced === "blob") {
    try {
      const blobStore = await getBlobStore()
      if (blobStore) {
        // Blob SDK only initializes inside the EdgeOne Makers runtime
        installRespSafetyNet()
        console.log("[DB] getKvBinding: using EdgeOne Blob storage")
        return {
          binding: blobStore,
          platform: "EdgeOne Blob (@edgeone/pages-blob, strong consistency)",
          mode: "blob",
        }
      }
    } catch (err: any) {
      console.error(
        `[DB] getKvBinding: EdgeOne Blob init failed: ${err?.message || err}`,
        `stack=${err?.stack?.substring(0, 300) || ""}`,
      )
    }
    if (forced === "blob") {
      console.warn("[DB] getKvBinding: blob mode forced but unavailable")
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
      // env 与 globalThis 必须独立判断：
      // 若 env[c.key] 存在但是 RESP 客户端（不满足接口形态），
      // `(env && env[key]) || g[key]` 的写法会短路，导致永不去检查
      // globalThis 上真正可用的绑定。
      const fromEnv = env && env[c.key]
      const fromGlobal = g[c.key]
      const b = isWebKv(fromEnv) ? fromEnv : isWebKv(fromGlobal) ? fromGlobal : null
      if (b) {
        const isEdgeOne =
          c.key.startsWith("EDGEONE") ||
          c.key.startsWith("EO") ||
          Boolean(env && (env.EDGEONE || env.EO_REGION || env.EDGEONE_KV_NAME)) ||
          Boolean(g.EDGEONE_KV || g.EO_KV)
        if (isEdgeOne) installRespSafetyNet()
        const platformName = isEdgeOne
          ? `EdgeOne KV (${c.name})`
          : `Cloudflare / EdgeOne KV (${c.name})`

        console.log(`[DB] getKvBinding: found KV binding: ${platformName}`)
        return {
          binding: b,
          platform: platformName,
          mode: "binding",
        }
      }
    }

    if (forced === "kv") {
      console.error(
        `[DB] getKvBinding: KV mode forced but no binding found. Checked candidates:`,
        candidates.map(c => c.key).join(", "),
        `env keys:`,
        Object.keys(env || {}).filter(k => k.includes("KV") || k.includes("EO")).join(", ") || "none",
        `globalThis keys:`,
        Object.keys(g).filter(k => k.includes("KV") || k.includes("EO")).join(", ") || "none",
      )
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
      console.log("[DB] getKvBinding: using Cloudflare KV REST API")
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
      console.error(
        `[DB] getKvBinding: cf_rest mode forced but missing credentials:`,
        `CF_ACCOUNT_ID=${!!cfAccountId}`,
        `CF_KV_NAMESPACE_ID=${!!cfNamespaceId}`,
        `CF_API_TOKEN=${!!cfApiToken}`,
      )
      return {
        binding: null,
        platform:
          "Cloudflare KV (REST API) — missing CF_ACCOUNT_ID / CF_KV_NAMESPACE_ID / CF_API_TOKEN",
        mode: "none",
      }
    }
  }

  console.warn(
    `[DB] getKvBinding: no KV storage found, using memory-only mode (data will not persist)`,
    `forced=${forced}`,
  )
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
    } else if (mode === "binding" || mode === "proxy") {
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
  if (mode === "none" || !binding) {
    console.warn(`[KV/Blob Store] saveToKv: mode="${mode}", binding=${!!binding}, skipping write`)
    return false
  }

  const valStr = JSON.stringify(data)
  console.log(`[KV/Blob Store] saveToKv: key="${key}", mode="${mode}", size=${valStr.length} bytes`)

  try {
    if (mode === "blob") {
      // @edgeone/pages-blob SDK: setJSON(key, value) for structured data
      if (typeof binding.setJSON === "function") {
        const result = (await binding.setJSON(key, data)) !== false
        console.log(`[KV/Blob Store] blob.setJSON result=${result}`)
        return result
      }
      // Fallback: set(key, stringified)
      if (typeof binding.set === "function") {
        const result = (await binding.set(key, valStr)) !== false
        console.log(`[KV/Blob Store] blob.set result=${result}`)
        return result
      }
    } else if (mode === "binding" || mode === "proxy") {
      // NOTE: only an explicit `false` counts as failure. Cloudflare KV's
      // put() resolves to void, so `undefined` must stay a success —
      // otherwise every normal write would be reported as failed.
      // proxy 模式复用同一分支：适配器已实现 put/get/delete/list。
      if (typeof binding.put === "function") {
        const putResult = await binding.put(key, valStr)
        const result = putResult !== false
        console.log(`[KV/Blob Store] binding.put result=${putResult}, success=${result}`)
        return result
      }
      if (typeof binding.set === "function") {
        const result = (await binding.set(key, valStr)) !== false
        console.log(`[KV/Blob Store] binding.set result=${result}`)
        return result
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
      console.log(`[KV/Blob Store] cf_rest PUT status=${res.status}`)
      return res.ok
    }
  } catch (err: any) {
    console.error(
      `[KV/Blob Store] Error writing key="${key}", mode="${mode}", dataSize=${valStr.length}:`,
      err?.message || err,
      `stack=${err?.stack?.substring(0, 300) || ""}`,
    )
  }
  console.warn(`[KV/Blob Store] saveToKv: no valid method found for mode="${mode}"`)
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

// ───────────────────────── 持久化密钥管理 ─────────────────────────
//
// 密钥（JWT 签名密钥、字段加密密钥）需要跨实例、跨冷启动保持一致，
// 因此必须持久化。设计原则：
//
//   1. 生成只发生在初始化（setup）阶段，且仅当键不存在时。
//   2. 一旦写入，永不覆盖 —— 覆盖会导致已加密数据无法解密。
//   3. 非初始化阶段只读；读不到就是故障，绝不重新生成。
//   4. 判定依据是「键是否存在」，而不是「读取是否成功」。
//
// 键名与数据库中的实体隔离，避免被通用 list(prefix) 误扫。

/** 从持久化后端读取密钥，不存在或失败返回 null */
export async function readPersistedSecret(
  env: any,
  key: string,
): Promise<string | null> {
  try {
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) return null
    const { binding, mode } = kvInfo

    let val: any = null
    if (mode === "blob") {
      val = await binding.get(key)
    } else {
      try {
        val = await binding.get(key, "text")
      } catch {
        val = await binding.get(key)
      }
    }
    if (val && typeof val.text === "function") val = await val.text()
    if (val === null || val === undefined) return null
    const str = String(val).trim()
    return str || null
  } catch (e) {
    console.warn(`[Secret] read "${key}" failed:`, e)
    return null
  }
}

/**
 * 写入密钥。
 *
 * 调用方需自行保证「仅在不存在时调用」，本函数不检查现有值
 * （见上方设计原则第 2 条）。
 */
export async function writePersistedSecret(
  env: any,
  key: string,
  secret: string,
): Promise<boolean> {
  try {
    const kvInfo = await getKvBinding(env)
    if (kvInfo.mode === "none" || !kvInfo.binding) {
      console.warn(
        `[Secret] cannot persist "${key}": no storage backend available`,
      )
      return false
    }
    const { binding, mode } = kvInfo

    if (mode === "blob") {
      if (typeof binding.set === "function") await binding.set(key, secret)
      else if (typeof binding.put === "function") await binding.put(key, secret)
      else return false
    } else {
      if (typeof binding.put === "function") await binding.put(key, secret)
      else if (typeof binding.set === "function") await binding.set(key, secret)
      else return false
    }
    return true
  } catch (e) {
    console.warn(`[Secret] write "${key}" failed:`, e)
    return false
  }
}

/**
 * 生成一个 64 位十六进制随机密钥，与 middlewares.ts 中的生成方式一致。
 */
export function generateSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}
