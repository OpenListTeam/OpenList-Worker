/**
 * 回归验证：本轮全部改动
 */
import http from "node:http"

const proxy = await import("../functions/_kv-proxy.js")
const backendMod = await import("../src/backend/internal/model/store/backend.ts")
const dbMod = await import("../src/backend/internal/model/db.ts")
const kvDrv = await import("../src/backend/internal/model/store/driver/kv.ts")
const codec = await import("../src/backend/internal/model/store/keycodec.ts")
const keyFormat = await import("../src/backend/internal/model/store/format/key.ts")
const { encrypt, decrypt } = await import("../src/backend/pkg/crypto.ts")

const JWT_SECRET = "jwt-secret-32-characters-long!!"
const ENC_PREFIX = "enc:v1:"
const KV_RE = /^[A-Za-z0-9_]+$/
const results = []
const check = (n, ok, d = "") => {
  results.push({ n, ok })
  if (!ok) console.log(`FAIL  ${n}${d ? `  ${d}` : ""}`)
}

const store = new Map()
function readBody(req) {
  return new Promise((r) => {
    let b = ""
    req.on("data", (c) => (b += c))
    req.on("end", () => r(b))
  })
}
const server = http.createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, "http://x")
  const raw = await readBody(req)
  const request = {
    url: `http://x${req.url}`,
    method: req.method,
    headers: { get: (k) => req.headers[String(k).toLowerCase()] ?? null },
    json: async () => JSON.parse(raw || "{}"),
  }
  const auth = await proxy.authorize(request, { JWT_SECRET })
  let status = 200
  let body
  if (!auth.ok) {
    status = 401
    body = { error: auth.reason }
  } else if (pathname === "/kv-get") {
    const k = searchParams.get("key")
    body = { value: store.has(k) ? store.get(k) : null }
  } else if (pathname === "/kv-put") {
    const { key, value } = JSON.parse(raw || "{}")
    if (!KV_RE.test(key)) {
      status = 400
      body = { error: "Key can only contain letters, numbers, and underscores" }
    } else {
      store.set(key, String(value))
      body = { success: true }
    }
  } else if (pathname === "/kv-list") {
    const prefix = searchParams.get("prefix") || ""
    body = { keys: [...store.keys()].filter((k) => k.startsWith(prefix)) }
  } else if (pathname === "/kv-delete") {
    store.delete(searchParams.get("key"))
    body = { success: true }
  } else {
    status = 404
    body = { error: "nf" }
  }
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(JSON.stringify(body))
})
await new Promise((r) => server.listen(0, r))
const origin = `http://127.0.0.1:${server.address().port}`

const respClient = { status: "ready", send() { throw new Error("cannot find the collection by name") } }

try {
  console.log("=== A. 键名编码 ===")
  check("users_1", codec.entityKeyOf("users", "1") === "users_1", codec.entityKeyOf("users", "1"))
  check("下划线不转义", codec.entityKeyOf("settings", "site_title") === "settings_site_title")
  check("无 xx 冗余", !codec.entityKeyOf("settings", "site_title").includes("xx"))
  check("无历史前缀", !codec.entityKeyOf("users", "1").includes("openlist_tbl"))
  const uuid = "550e8400-e29b-41d4-a716-446655440000"
  check("UUID 合法", KV_RE.test(codec.entityKeyOf("users", uuid)))
  check("UUID 可逆", codec.decodeKeyPart(codec.encodeKeyPart(uuid)) === uuid)
  for (const s of ["a:b", "a/b", "a b", "用户", "emoji-😀", "a.b-c_d"]) {
    check(`"${s}" 合法`, KV_RE.test(codec.encodeKeyPart(s)), codec.encodeKeyPart(s))
    check(`"${s}" 可逆`, codec.decodeKeyPart(codec.encodeKeyPart(s)) === s)
  }
  check("空串 -> 0", codec.encodeKeyPart("") === "0")

  console.log("=== B. 分表往返（严格键名）===")
  const strict = {
    name: "s",
    async isAvailable() { return true },
    async init() {},
    async get(k) { return store.has(k) ? store.get(k) : null },
    async put(k, v) {
      if (!KV_RE.test(k)) throw new Error("Key can only contain letters, numbers, and underscores")
      store.set(k, String(v))
    },
    async delete(k) { store.delete(k) },
    async list(p) { return [...store.keys()].filter((k) => k.startsWith(p)) },
    async health() { return { connected: true } },
  }
  store.clear()
  await keyFormat.keyFormat.save(
    {
      users: [{ id: 1, username: "admin" }, { id: uuid, username: "u2" }],
      storages: [{ id: "s-1" }],
      settings: [{ key: "site_title", value: "OpenList" }],
      shares: [{ id: "a/b" }], metas: [], plugins: [],
    },
    strict, {},
  )
  const back = await keyFormat.keyFormat.load(strict, {})
  check("users 读回 2 条", back?.users?.length === 2, String(back?.users?.length))
  check("数字主键", back?.users?.[0]?.username === "admin")
  check("UUID 主键", back?.users?.[1]?.id === uuid)
  let allLegal = true
  for (const k of store.keys()) if (!KV_RE.test(k)) allLegal = false
  check("全部键名合法", allLegal)
  console.log("   键名:", [...store.keys()].slice(0, 3).join(" | "))

  console.log("=== C. 密钥一致性 ===")
  store.clear()
  const envJwt = { DB_DRIVER: "kv", JWT_SECRET, __requestOrigin: origin }
  check("env 有密钥 → 直接用", (await dbMod.ensureEncryptionSecret(envJwt)) === JWT_SECRET)
  check("不写持久化", store.size === 0)

  console.log("=== D. 加解密对称 ===")
  const hashed = "a".repeat(64)
  const sealed = ENC_PREFIX + (await encrypt(hashed, JWT_SECRET))
  check("同密钥可解", (await decrypt(sealed.slice(ENC_PREFIX.length), JWT_SECRET)) === hashed)
  let threw = false
  try { await decrypt(sealed.slice(ENC_PREFIX.length), "other-key-32-characters-xxxx") } catch { threw = true }
  check("异密钥失败", threw)

  console.log("=== E. worker 禁内存 ===")
  for (const [n, e] of [
    ["__requestOrigin", { __requestOrigin: origin }],
    ["EDGEONE_BLOB", { EDGEONE_BLOB: {} }],
    ["ESA_BLOB", { ESA_BLOB: {} }],
    ["TENCENTCLOUD_SCF_FUNCTIONNAME", { TENCENTCLOUD_SCF_FUNCTIONNAME: "f" }],
  ]) check(`识别 ${n}`, backendMod.isServerlessRuntime(e) === true)
  check("本地不误判", backendMod.isServerlessRuntime({}) === false)
  let e1 = false
  try { await backendMod.getStorageBackend({ __requestOrigin: origin }) } catch (x) { e1 = String(x.message).includes("No storage backend is available") }
  check("worker 无存储抛错", e1)

  console.log("=== F. 显式驱动不回退 ===")
  let e2 = false
  try { await backendMod.getStorageBackend({ DB_DRIVER: "blob" }) } catch (x) { e2 = String(x.message).includes("No fallback") }
  check("显式 blob 不可用 → 抛错", e2)
  let e3 = false
  try { await backendMod.getStorageBackend({ DB_DRIVER: "bogus" }) } catch (x) { e3 = String(x.message).includes("Unknown DB_DRIVER") }
  check("未知驱动 → 抛错", e3)
  const ok = await backendMod.getStorageBackend({ DB_DRIVER: "kv", DB_FORMAT: "key", JWT_SECRET, __requestOrigin: origin })
  check("显式 kv 可用 → 成功", ok.driver.name === "kv")

  console.log("=== G. 代理端到端（RESP 陷阱）===")
  const envP = { DB_DRIVER: "kv", DB_FORMAT: "key", KV: respClient, JWT_SECRET, __requestOrigin: origin }
  const st = await backendMod.getStoreStatus(envP)
  check("driver=kv format=key", st.driver === "kv" && st.format === "key")
  check("无 configError", !st.configError)
  store.clear()
  const b2 = await backendMod.getStoreBackend(envP)
  await b2.save({ users: [{ id: 1, username: "admin" }], storages: [], settings: [], shares: [], metas: [], plugins: [] }, envP)
  const ld = await b2.load(envP)
  check("代理 save/load 正常", ld?.users?.[0]?.username === "admin")

  console.log("=== H. 配置错误透出 ===")
  const ce1 = await backendMod.getStoreConfigError({ __requestOrigin: origin })
  check("worker 无存储错误", typeof ce1 === "string" && ce1.includes("No storage backend"))
  const ce2 = await backendMod.getStoreConfigError({ DB_DRIVER: "kv", KV: respClient })
  check("KV 缺密钥错误（精确）", typeof ce2 === "string" && ce2.includes("JWT_SECRET"), String(ce2).slice(0, 50))
  const ce3 = await backendMod.getStoreConfigError({ DB_DRIVER: "kv", KV: respClient, JWT_SECRET, __requestOrigin: origin })
  check("配置完整 → null", ce3 === null)

  console.log("=== I. 绑定形态 ===")
  check("RESP 不算 binding", kvDrv.checkProxyConfig({ DB_DRIVER: "kv", KV: respClient }) !== null)
  check("字符串不算", kvDrv.checkProxyConfig({ DB_DRIVER: "kv", KV: "n" }) !== null)
  check("空对象不算", kvDrv.checkProxyConfig({ DB_DRIVER: "kv", KV: {} }) !== null)
  check("Web KV 算", kvDrv.checkProxyConfig({ DB_DRIVER: "kv", KV: { async get() {}, async put() {} } }) === null)

  console.log("=== J. 密钥就绪仲裁（KV 最终一致性）===")
  // 模拟写入延迟传播的 KV：put 后 delayMs 才对 get 可见
  function makeDelayedKv(delayMs) {
    const s = new Map()
    return {
      store: s,
      binding: {
        async get(k) { return s.has(k) ? s.get(k) : null },
        async put(k, v) { setTimeout(() => s.set(k, v), delayMs) },
        async delete(k) { s.delete(k) },
        async list() { return { keys: [...s.keys()].map((name) => ({ name })) } },
      },
    }
  }

  // 未初始化（无 env 密钥、KV 无持久化密钥）→ ready=false
  const dkv0 = makeDelayedKv(0)
  const envR0 = { DB_DRIVER: "kv", DB_FORMAT: "map", KV: dkv0.binding, __requestOrigin: origin }
  check("无密钥 → 未就绪", (await dbMod.isEncryptionReady(envR0)) === false)

  // 有 env 密钥 → 立即就绪（不依赖 KV）
  check("env 密钥 → 就绪", (await dbMod.isEncryptionReady({ ...envR0, JWT_SECRET })) === true)

  // 写入延迟 200ms：ensureEncryptionSecret 应通过回读重试等到可读
  const dkv1 = makeDelayedKv(200)
  const envR1 = { DB_DRIVER: "kv", DB_FORMAT: "map", KV: dkv1.binding, __requestOrigin: origin }
  const genKey = await dbMod.ensureEncryptionSecret(envR1)
  check("延迟 KV 下生成成功", typeof genKey === "string" && genKey.length >= 16)
  check("生成后 KV 内可读", dkv1.store.get("openlist_encryption_secret") === genKey)
  check("生成后判定就绪", (await dbMod.isEncryptionReady(envR1)) === true)

  // 幂等：再次调用复用同一密钥，不覆盖
  const again = await dbMod.ensureEncryptionSecret(envR1)
  check("幂等复用同密钥", again === genKey)
} catch (err) {
  check("测试执行", false, err.message)
  console.error(err)
} finally {
  server.close()
}

const p = results.filter((x) => x.ok).length
console.log(`\n${"=".repeat(44)}\n结果: ${p}/${results.length} 通过`)
console.log(results.every((x) => x.ok) ? "ALL PASS" : "SOME FAILED")
process.exit(results.every((x) => x.ok) ? 0 : 1)
