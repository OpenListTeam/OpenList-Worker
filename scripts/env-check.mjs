/**
 * 本地诊断：打印 /public/env_check 在若干典型环境下的输出。
 *
 * 用途：部署前确认「数据格式 / 驱动 / 存储 / JWT 密钥」是否就绪，
 * 或复现「初始化后登录失败」类问题。
 *
 *   node scripts/env-check.mjs
 */
const MOD = "../src/backend/"

const { Hono } = await import("hono")
const { setupRouter } = await import(MOD + "server/router.ts")

const buildApp = () => {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

async function probe(name, env) {
  const res = await buildApp().request(
    "/api/public/env_check",
    { method: "GET" },
    env,
  )
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.log(`\n[${name}] status=${res.status} NON-JSON: ${text.slice(0, 120)}`)
    return null
  }
  const d = json.data
  console.log(`\n[${name}] status=${res.status}`)
  console.log(
    `  runtime      : serverless=${d.runtime.serverless} platform=${d.runtime.platform}`,
  )
  console.log(
    `  config       : format=${d.config.db_format}->${d.config.resolved_format} ` +
      `driver=${d.config.db_driver}->${d.config.resolved_driver}`,
  )
  console.log(
    `  storage      : available=${d.storage.available} memory=${d.storage.memory} connected=${d.storage.connected}`,
  )
  console.log(`  jwt          : ready=${d.jwt.ready} source=${d.jwt.source}`)
  console.log(`  ready        : ${d.ready}`)
  console.log(`  issues       : ${d.issues.length}`)
  for (const i of d.issues) {
    console.log(`    - [${i.level}] ${i.code}: ${i.message.slice(0, 80)}`)
    console.log(`      doc: ${i.docUrl}`)
  }
  return d
}

const webKv = {
  async get() {
    return null
  },
  async put() {
    return true
  },
  async delete() {},
  async list() {
    return { keys: [] }
  },
}

await probe("本地 / 无存储", { DB_FORMAT: "map", DB_DRIVER: "auto" })

await probe("serverless / 无存储", {
  DB_FORMAT: "map",
  DB_DRIVER: "auto",
  __requestOrigin: "https://x.edgeone.cool",
})

await probe("kv 代理 / 缺 JWT_SECRET", {
  DB_FORMAT: "key",
  DB_DRIVER: "kv",
  __requestOrigin: "https://x.edgeone.cool",
})

await probe("kv binding / 有 JWT_SECRET（健康）", {
  DB_FORMAT: "key",
  DB_DRIVER: "kv",
  JWT_SECRET: "0123456789abcdef0123456789abcdef",
  KV: webKv,
})
