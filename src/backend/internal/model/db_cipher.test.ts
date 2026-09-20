import assert from "node:assert/strict"
import { test } from "node:test"
import {
  DB_CIPHER_VALUES,
  cipherPrefix,
  createFieldCipher,
  deriveConfigEncryptionKey,
  detectCipherPrefix,
  encrypt,
  encryptConfigValue,
  isSealedCiphertext,
  resolveDbCipher,
} from "../../pkg/crypto"
import { readCipher } from "./store/backend"
import { memoryDriver } from "./store/driver/memory"
import { mapFormat } from "./store/format/map"

/**
 * DB_CIPHER 回归测试。
 *
 * 锁定三条核心不变量：
 *   1. **默认不加密**（DB_CIPHER 缺省 = none）：敏感字段明文落盘；
 *   2. **解密由密文前缀驱动**，与当前配置无关：换算法 / 关加密都不会让既有密文
 *      无法读取（否则升级会把「登录密码」变成谁也解不开的乱码）；
 *   3. **DB_CIPHER=none 不影响 JWT 共享密钥**：密钥的生成与持久化照旧。
 */

const SECRET = "test-shared-secret-0123456789abcdef"

/** 三个真实算法（none 之外） */
const SECRET_CIPHERS = [
  "aes-256-gcm",
  "aes-256-gcm-pbkdf2",
  "aes-256-cbc-hmac",
] as const

function envFor(cipher?: string): any {
  const env: any = {
    DB_DRIVER: "memory",
    DB_FORMAT: "map",
    JWT_SECRET: SECRET,
  }
  if (cipher !== undefined) env.DB_CIPHER = cipher
  return env
}

function sampleDb() {
  return {
    settings: [
      { key: "site_title", value: "OpenList" },
      { key: "token", value: "tok-123" },
    ],
    users: [
      {
        id: 1,
        username: "admin",
        role: 2,
        permission: 0,
        base_path: "/",
        disabled: false,
        password: "hash-abc",
        otp_secret: "OTP-SECRET",
      },
    ],
    storages: [
      {
        id: 1,
        mount_path: "/drive",
        driver: "local",
        addition: JSON.stringify({ token: "drive-token" }),
      },
    ],
    shares: [],
    metas: [],
    plugins: [],
  }
}

const rawUser = (raw: any) => raw.users.find((u: any) => u.username === "admin")
const rawSetting = (raw: any, key: string) =>
  raw.settings.find((s: any) => s.key === key)
/** 读取**存储中的原始内容**（未经 unseal），用于断言落盘形态 */
const rawStored = (env: any) => mapFormat.load(memoryDriver, env)

// ─── 配置解析 ────────────────────────────────────────────────────────────────

test("readCipher：默认 none，别名可用，非法值回退 none", () => {
  assert.equal(readCipher({}), "none", "缺省必须为 none（默认不加密）")
  assert.equal(readCipher({ DB_CIPHER: "" }), "none")
  assert.equal(readCipher({ DB_CIPHER: "  none  " }), "none")
  assert.equal(readCipher({ DB_CIPHER: "off" }), "none")

  assert.equal(readCipher({ DB_CIPHER: "AES-256-GCM" }), "aes-256-gcm")
  assert.equal(readCipher({ DB_CIPHER: "gcm" }), "aes-256-gcm")
  assert.equal(readCipher({ DB_CIPHER: "v2" }), "aes-256-gcm")
  assert.equal(readCipher({ DB_CIPHER: "pbkdf2" }), "aes-256-gcm-pbkdf2")
  assert.equal(readCipher({ DB_CIPHER: "v1" }), "aes-256-gcm-pbkdf2")
  assert.equal(readCipher({ DB_CIPHER: "v3" }), "aes-256-cbc-hmac")

  // 拼错不得静默启用某个算法
  assert.equal(readCipher({ DB_CIPHER: "rot13" }), "none")
  assert.equal(resolveDbCipher("rot13").known, false)
  assert.equal(resolveDbCipher("aes-256-gcm").known, true)

  for (const cipher of DB_CIPHER_VALUES) {
    assert.equal(readCipher({ DB_CIPHER: cipher }), cipher)
  }
})

test("密文前缀与算法一一对应（v1=PBKDF2 / v2=HKDF / v3=CBC-HMAC）", () => {
  assert.equal(cipherPrefix("none"), "")
  assert.equal(cipherPrefix("aes-256-gcm-pbkdf2"), "enc:v1:")
  assert.equal(cipherPrefix("aes-256-gcm"), "enc:v2:")
  assert.equal(cipherPrefix("aes-256-cbc-hmac"), "enc:v3:")

  assert.equal(detectCipherPrefix("hash-abc"), null)
  assert.equal(detectCipherPrefix("enc:v9:abc"), null, "未知版本不得被识别")
  assert.equal(detectCipherPrefix("enc:v1:aa:bb:cc")?.cipher, "aes-256-gcm-pbkdf2")
  assert.equal(detectCipherPrefix("enc:v2:aa:bb")?.cipher, "aes-256-gcm")
  assert.equal(detectCipherPrefix("enc:v3:aa:bb:cc")?.cipher, "aes-256-cbc-hmac")
  assert.equal(isSealedCiphertext("enc:v2:aa:bb"), true)
  assert.equal(isSealedCiphertext("plain"), false)
})

// ─── 算法层 ──────────────────────────────────────────────────────────────────

test("各算法加密→解密往返一致（含空串与多字节）", async () => {
  const samples = [
    "",
    "a",
    "hash-abc",
    "中文 / emoji 😀 / 换行\n换行",
    "x".repeat(5000),
  ]
  for (const cipher of SECRET_CIPHERS) {
    const fc = await createFieldCipher(cipher, SECRET)
    for (const plain of samples) {
      const body = await fc.encrypt(plain)
      const sealed = cipherPrefix(cipher) + body
      assert.notEqual(body, plain, `${cipher} 必须产生密文`)
      assert.equal(detectCipherPrefix(sealed)?.cipher, cipher)
      assert.equal(await fc.decrypt(sealed), plain)
    }
  }
})

test("解密由前缀驱动：一种写入算法能解开全部历史版本的密文", async () => {
  // 三种算法分别由不同的写入器产生，再用同一个（写 v3 的）解密器读取。
  const v1 = "enc:v1:" + (await encrypt("v1-secret", SECRET))
  const v2 =
    "enc:v2:" +
    (await encryptConfigValue(
      "v2-secret",
      await deriveConfigEncryptionKey(SECRET),
    ))
  const v3fc = await createFieldCipher("aes-256-cbc-hmac", SECRET)
  const v3 = "enc:v3:" + (await v3fc.encrypt("v3-secret"))

  const reader = await createFieldCipher("aes-256-cbc-hmac", SECRET)
  assert.equal(await reader.decrypt(v1), "v1-secret")
  assert.equal(await reader.decrypt(v2), "v2-secret")
  assert.equal(await reader.decrypt(v3), "v3-secret")
  // 明文原样返回
  assert.equal(await reader.decrypt("plain-value"), "plain-value")

  // #69 写入的 v2 密文必须与「写 v2 的实现」互相兼容（同一密钥、同一 HKDF 参数）
  const v2fc = await createFieldCipher("aes-256-gcm", SECRET)
  const v2Fresh = await v2fc.encrypt("v2-fresh")
  assert.equal(
    await v2fc.decrypt("enc:v2:" + v2Fresh),
    "v2-fresh",
    "v2 写入/读取必须与 #69 的 envelope 自洽",
  )
})

test("密钥不匹配时必须解密失败，而不是返回乱码", async () => {
  const wrong = "another-secret-0123456789abcdefgh"
  for (const cipher of SECRET_CIPHERS) {
    const fc = await createFieldCipher(cipher, SECRET)
    const sealed = cipherPrefix(cipher) + (await fc.encrypt("secret-value"))
    // 同密钥正常
    assert.equal(await fc.decrypt(sealed), "secret-value")
    // 换密钥必须抛错（AES-GCM 认证失败 / CBC-HMAC 验签失败）
    const wrongFc = await createFieldCipher(cipher, wrong)
    await assert.rejects(
      () => wrongFc.decrypt(sealed),
      `换密钥后 ${cipher} 必须解密失败`,
    )
  }
})

test("v3 为 Encrypt-then-MAC：篡改密文必须被完整性校验拦下", async () => {
  const fc = await createFieldCipher("aes-256-cbc-hmac", SECRET)
  const prefix = cipherPrefix("aes-256-cbc-hmac")
  const parts = (await fc.encrypt("secret-value")).split(":")
  const flipped = parts[1][0] === "0" ? "1" : "0"
  const tampered = `${prefix}${parts[0]}:${flipped}${parts[1].slice(1)}:${parts[2]}`
  await assert.rejects(() => fc.decrypt(tampered))
})

// ─── 持久化边界 ──────────────────────────────────────────────────────────────

test("DB_CIPHER 缺省：敏感字段明文落盘（默认不加密）", async () => {
  const db = await import("./db")
  db.__resetDbCacheForTest()
  const env = envFor() // 不设置 DB_CIPHER

  assert.equal(await db.saveDb(sampleDb(), env, { force: true }), true)

  const raw: any = await rawStored(env)
  assert.equal(rawUser(raw).password, "hash-abc")
  assert.equal(rawUser(raw).otp_secret, "OTP-SECRET")
  assert.equal(rawSetting(raw, "token").value, "tok-123")
  assert.equal(raw.storages[0].addition, JSON.stringify({ token: "drive-token" }))
  assert.equal(isSealedCiphertext(rawUser(raw).password), false)

  // 读回同样为明文
  db.__resetDbCacheForTest()
  const loaded: any = await db.getDb(env)
  assert.equal(rawUser(loaded).password, "hash-abc")
})

test("DB_CIPHER 非 none：敏感字段按所选算法落盘，读回自动解密", async () => {
  for (const cipher of SECRET_CIPHERS) {
    const db = await import("./db")
    db.__resetDbCacheForTest()
    const env = envFor(cipher)

    assert.equal(await db.saveDb(sampleDb(), env, { force: true }), true)

    const raw: any = await rawStored(env)
    for (const sealed of [
      rawUser(raw).password,
      rawUser(raw).otp_secret,
      rawSetting(raw, "token").value,
      raw.storages[0].addition,
    ]) {
      assert.equal(detectCipherPrefix(sealed)?.cipher, cipher, `${cipher} 应落盘为密文`)
    }
    assert.notEqual(rawUser(raw).password, "hash-abc")
    // 非敏感设置不应被加密（避免无谓开销）
    assert.equal(rawSetting(raw, "site_title").value, "OpenList")

    // 冷启动重新加载（绕过内存快照）→ 必须自动解密
    db.__resetDbCacheForTest()
    const loaded: any = await db.getDb(env)
    assert.equal(rawUser(loaded).password, "hash-abc", `${cipher} 读回必须是明文`)
    assert.equal(rawUser(loaded).otp_secret, "OTP-SECRET")
    assert.equal(rawSetting(loaded, "token").value, "tok-123")
    assert.equal(
      loaded.storages[0].addition,
      JSON.stringify({ token: "drive-token" }),
    )
  }
})

test("旧部署迁移：DB_CIPHER=none 仍能读加密数据，并在下次保存转为明文", async () => {
  const db = await import("./db")

  // 1) 模拟 #69 的既有部署：DB_CIPHER 未配置时期望写入 v2 密文
  const legacyEnv = envFor("aes-256-gcm")
  db.__resetDbCacheForTest()
  assert.equal(await db.saveDb(sampleDb(), legacyEnv, { force: true }), true)
  const legacyRaw: any = await rawStored(legacyEnv)
  assert.equal(isSealedCiphertext(legacyRaw.users[0].password), true)
  assert.equal(
    detectCipherPrefix(legacyRaw.users[0].password)?.cipher,
    "aes-256-gcm",
  )

  // 2) 升级后默认 DB_CIPHER=none：同一份存储必须仍可解密（否则登录直接坏掉）
  const plainEnv = envFor()
  db.__resetDbCacheForTest()
  const loaded: any = await db.getDb(plainEnv)
  assert.equal(rawUser(loaded).password, "hash-abc", "关掉加密后旧密文必须仍能解开")
  assert.equal(rawUser(loaded).otp_secret, "OTP-SECRET")

  // 3) 下一次保存 → 自动转为明文（逐字段迁移，无需手动步骤）
  assert.equal(await db.saveDb(loaded, plainEnv), true)
  const raw: any = await rawStored(plainEnv)
  assert.equal(rawUser(raw).password, "hash-abc")
  assert.equal(isSealedCiphertext(rawUser(raw).password), false)
})

test("旧部署迁移：PBKDF2（enc:v1:）密文在 none 下同样可读", async () => {
  const db = await import("./db")
  const env = envFor()

  // 直接向存储写入一份「历史 v1 加密」的库（模拟 pre-#69 的部署数据）
  const legacy = sampleDb()
  legacy.users[0].password = "enc:v1:" + (await encrypt("hash-abc", SECRET))
  legacy.users[0].otp_secret = "enc:v1:" + (await encrypt("OTP-SECRET", SECRET))
  legacy.settings[1].value = "enc:v1:" + (await encrypt("tok-123", SECRET))
  await mapFormat.save(legacy, memoryDriver, env)

  db.__resetDbCacheForTest()
  const loaded: any = await db.getDb(env)
  assert.equal(rawUser(loaded).password, "hash-abc")
  assert.equal(rawUser(loaded).otp_secret, "OTP-SECRET")
  assert.equal(rawSetting(loaded, "token").value, "tok-123")
})

test("更换算法：旧密文按前缀解密，新写入使用新算法", async () => {
  const db = await import("./db")

  const v2Env = envFor("aes-256-gcm")
  db.__resetDbCacheForTest()
  assert.equal(await db.saveDb(sampleDb(), v2Env, { force: true }), true)

  const v3Env = envFor("aes-256-cbc-hmac")
  db.__resetDbCacheForTest()
  const loaded: any = await db.getDb(v3Env)
  assert.equal(rawUser(loaded).password, "hash-abc", "旧 v2 密文必须能被 v3 配置读取")

  assert.equal(await db.saveDb(loaded, v3Env), true)
  const raw: any = await rawStored(v3Env)
  assert.equal(
    detectCipherPrefix(rawUser(raw).password)?.cipher,
    "aes-256-cbc-hmac",
  )
  assert.equal(
    detectCipherPrefix(rawUser(raw).otp_secret)?.cipher,
    "aes-256-cbc-hmac",
  )
})

test("DB_CIPHER=none 不影响共享密钥的生成与持久化（JWT 仍需密钥）", async () => {
  const db = await import("./db")
  const env = {
    DB_DRIVER: "memory",
    DB_FORMAT: "map",
    DB_CIPHER: "none",
  }
  db.__resetDbCacheForTest()

  const key = await db.ensureEncryptionSecret(env)
  assert.equal(typeof key, "string", "无 JWT_SECRET 时必须自动生成共享密钥")
  assert.ok((key as string).length >= 16)
  assert.equal(await db.isEncryptionReady(env), true, "生成后任意实例都能读到密钥")
})
