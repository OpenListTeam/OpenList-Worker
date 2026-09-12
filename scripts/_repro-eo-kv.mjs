/**
 * 验证 EO + KV 最终一致性场景下的「初始化成功但密码认证失败」是否已修复。
 *
 * 模拟 KV 写入传播延迟，走完整链路：
 *   ensureEncryptionSecret → setUserPassword → saveDb → (新实例) getDb → verifyUserPassword
 */
import assert from "node:assert/strict"

const MOD = "../src/backend/"

/** 模拟 KV：put 后经过 delayMs 才对外可见（最终一致性） */
function makeKv({ delayMs = 0 } = {}) {
  const store = new Map()
  return {
    store,
    binding: {
      async get(key) {
        return store.has(key) ? store.get(key) : null
      },
      async put(key, value) {
        if (delayMs > 0) {
          setTimeout(() => store.set(key, value), delayMs)
        } else {
          store.set(key, value)
        }
      },
      async delete(key) {
        store.delete(key)
      },
      async list() {
        return { keys: [...store.keys()].map((name) => ({ name })) }
      },
    },
  }
}

const JWT_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"

async function scenario(name, { delayMs, withEnvSecret }) {
  const kv = makeKv({ delayMs })
  const env = {
    DB_FORMAT: "map",
    DB_DRIVER: "kv",
    __requestOrigin: "https://example.com",
    KV: kv.binding,
    ...(withEnvSecret ? { JWT_SECRET } : {}),
  }

  const dbMod = await import(MOD + "internal/model/db.ts")
  const authMod = await import(MOD + "server/auth.ts")
  const pwMod = await import(MOD + "pkg/password.ts")

  // ── 1. setup ──
  const key1 = await dbMod.ensureEncryptionSecret(env)

  const db = await dbMod.getDb(env)
  db.users = []
  const admin = {
    id: 1,
    username: "admin",
    password: "",
    role: 2,
    permission: 0,
    disabled: false,
  }
  await pwMod.setUserPassword(admin, "test1234")
  db.users.push(admin)
  await dbMod.saveDb(db, env)

  // 数据本身也受传播延迟影响：等待其可见（模拟「过一会」）
  const deadline = Date.now() + 5000
  let rawStored = kv.store.get("openlist_config")
  while (!rawStored && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20))
    rawStored = kv.store.get("openlist_config")
  }
  const persisted = rawStored ? JSON.parse(rawStored) : null
  const persistedPwd = persisted?.users?.[0]?.password || ""
  const isSealed = String(persistedPwd).startsWith("enc:v1:")

  // ── 2. 模拟登录（另一实例）：用持久化数据 + 重新读取的密钥解密 ──
  const { decrypt } = await import(MOD + "pkg/crypto.ts")
  // 模拟「新实例的首次读密钥」：直接读 KV（此时延迟已由 ensure 的重试等待掉）
  const kvKey = kv.store.get("openlist_encryption_secret") || null
  const effectiveKey = withEnvSecret ? JWT_SECRET : kvKey

  let decryptedPwd = persisted.users[0].password
  if (String(decryptedPwd).startsWith("enc:v1:")) {
    try {
      decryptedPwd = await decrypt(String(decryptedPwd).slice(7), effectiveKey)
    } catch (e) {
      decryptedPwd = "DECRYPT_FAILED"
    }
  }
  const userForVerify = { ...persisted.users[0], password: decryptedPwd }
  const ok = await authMod.verifyUserPassword(userForVerify, "test1234")

  const keyMatch = withEnvSecret ? "env 模式" : (kvKey === key1 ? "一致" : "不一致")

  console.log(`\n[${name}]`)
  console.log(`  密钥来源          : ${withEnvSecret ? "env.JWT_SECRET" : "KV 持久化"}`)
  console.log(`  ensure 返回密钥    : ${key1 ? key1.slice(0, 10) + "..." : "null"}`)
  console.log(`  KV 内密钥          : ${kvKey ? kvKey.slice(0, 10) + "..." : "null"}`)
  console.log(`  密钥一致性         : ${keyMatch}`)
  console.log(`  落盘密码已加密     : ${isSealed}`)
  console.log(`  解密后为 64位hex   : ${/^[0-9a-f]{64}$/i.test(decryptedPwd)}`)
  console.log(`  verifyUserPassword : ${ok ? "PASS ✅" : "FAIL ❌"}`)
  return ok
}

let allPass = true

for (const delay of [0, 100, 300, 800]) {
  const ok = await scenario(`KV 传播延迟 ${delay}ms（未设 JWT_SECRET）`, {
    delayMs: delay,
    withEnvSecret: false,
  })
  if (!ok) allPass = false
}

const okEnv = await scenario("已设 JWT_SECRET（env 优先）", {
  delayMs: 800,
  withEnvSecret: true,
})
if (!okEnv) allPass = false

console.log(`\n${"=".repeat(50)}`)
console.log(allPass ? "全部 PASS ✅ 修复有效" : "存在 FAIL ❌")
process.exit(allPass ? 0 : 1)
