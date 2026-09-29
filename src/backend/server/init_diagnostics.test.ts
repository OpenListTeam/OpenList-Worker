import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { setupRouter } from "./router"
import { uiStorageError } from "./storage-error"
import {
  getStoreConfigErrorDetail,
  getStoreStatus,
} from "../internal/model/store/backend"

/**
 * 「问题必须能被用户看见」的回归测试。
 *
 * 历史现象：环境自检显示一切正常（ready=true），初始化却返回一个没有原因的
 * 500；用户既不知道是组合写错、绑定没配，还是后端读不到。
 *
 * 因此这里锁定三件事：
 *   1. 无效「驱动 × 格式」组合被识别为 INVALID_COMBINATION 并给出支持列表；
 *   2. 驱动不可用时错误里写明需要什么（逐驱动提示）；
 *   3. 这些原因通过 /env_check（issue + error_code）与 /init_status
 *      （storage_error / db_load_error）以及 /init/setup 的 data.code/reason
 *      透给前端。
 */

const JWT = "0123456789abcdef0123456789abcdef"

const buildApp = () => {
  const api = new Hono()
  setupRouter(api)
  const app = new Hono()
  app.route("/api", api)
  return app
}

const jsonPost = (body: any) =>
  ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as any

function fakeKv() {
  const store = new Map<string, string>()
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, String(v))
      return true
    },
    delete: async (k: string) => {
      store.delete(k)
    },
    list: async () => ({ keys: [...store.keys()] }),
  }
}

function fakeBlob() {
  const store = new Map<string, string>()
  return {
    get: async (k: string) => {
      const v = store.get(k)
      return v === undefined ? null : { text: async () => v }
    },
    put: async (k: string, v: string) => {
      store.set(k, String(v))
    },
    delete: async (k: string) => {
      store.delete(k)
    },
    head: async (k: string) => (store.has(k) ? { key: k } : null),
    list: async () => ({ keys: [...store.keys()].map((name) => ({ name })) }),
  }
}

test("无效组合：env_check 必须给出 STORAGE_INVALID_COMBINATION 与具体原因", async () => {
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "sql",
    JWT_SECRET: JWT,
    KV: fakeKv(),
  }

  // 解析阶段就该拒绝，并说明该驱动支持哪些格式
  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "INVALID_COMBINATION")
  assert.match(String(status.configError), /Invalid storage combination/)
  assert.match(String(status.configError), /DB_FORMAT="sql"/)
  assert.match(String(status.configError), /supports: map \| key/)
  // 只报错、不自愈：不得偷偷换成别的驱动或格式
  assert.equal(status.driver, "none", "非法组合不得被自动解析成其它驱动")
  assert.equal(status.format, "none", "非法组合不得被自动改成别的格式")

  const res = await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  const data = (await res.json()).data
  assert.equal(data.ready, false, "非法组合不得被报告为就绪")
  assert.equal(data.storage.available, false)
  assert.equal(data.storage.error_code, "INVALID_COMBINATION")
  assert.match(String(data.storage.error_message), /Invalid storage combination/)

  const issue = data.issues.find(
    (i: any) => i.code === "STORAGE_INVALID_COMBINATION",
  )
  assert.ok(issue, "必须给出专门的 issue 代码，而不是笼统的配置错误")
  assert.match(String(issue.message), /Unsupported storage combination/)
  assert.ok(String(issue.docUrl).startsWith("http"))
})

test("无效组合：init/setup 的 500 必须带上 code 与 reason（契约文案不变）", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "sql",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  const res = await buildApp().request(
    "/api/public/init/setup",
    jsonPost({ username: "admin", password: "admin1234" }),
    env,
  )
  assert.equal(res.status, 500)
  const json: any = await res.json()
  assert.equal(
    json.message,
    "database is not readable; refusing to initialize to avoid overwriting existing config",
    "对外 message 保持兼容",
  )
  assert.equal(json.data?.code, "INVALID_COMBINATION")
  assert.match(String(json.data?.reason), /Invalid storage combination/)
  assert.match(
    String(json.data?.reason),
    /d1 \| do \| mysql/,
    "reason 要包含可操作的修复方向",
  )

  // 前端还可以通过轮询 init_status 拿到同一原因
  const st = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.match(String(st.db_load_error), /Invalid storage combination/)
})

test("驱动不可用：错误必须写明该驱动需要什么（d1 示例）", async () => {
  const env: any = { DB_DRIVER: "d1", DB_FORMAT: "map", JWT_SECRET: JWT }

  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "DRIVER_UNAVAILABLE")
  // 逐驱动的前置条件（需要 d1_databases 绑定）写在完整文案里
  assert.match(String(status.configError), /d1_databases/)
  assert.match(
    String(status.configError),
    /^DB_DRIVER is set to "d1", but that driver is not available in this runtime\.$/m,
    "首行必须是一句完整的短原因：界面只展示这一行",
  )

  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.storage.error_code, "DRIVER_UNAVAILABLE")
  assert.equal(
    data.storage.summary,
    `DB_DRIVER is set to "d1", but that driver is not available in this runtime.`,
    "summary 是给界面的一行短句",
  )
  // 接口只透传前 3 行，因此这 3 行必须是「原因 + 不回退 + 怎么做」
  assert.match(
    String(data.storage.error_message),
    /No fallback is performed for an explicitly configured driver/,
  )
  assert.match(String(data.storage.error_message), /Check the binding\/credentials/)
  assert.ok(
    data.issues.some((i: any) => i.code === "STORAGE_CONFIG_ERROR"),
    "驱动不可用仍归为配置错误",
  )
})

test("驱动不可用：错误里必须给出「auto 会选谁」的可操作答案", async () => {
  // kv 不可用，但 Blob 可用：显式配置不回退，但必须说清「改成什么」。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  const status = await getStoreStatus(env)
  assert.equal(status.configErrorCode, "DRIVER_UNAVAILABLE")
  assert.match(
    String(status.configError),
    /Auto-detection would pick: DB_DRIVER=blob/,
    "必须告诉用户改成什么（而不是让他自己猜）",
  )
})

test("驱动不可用：截断展示的文案里也必须保留「改成什么」+ 结构化建议", async () => {
  // 前端只拿到截断后的 error_message / issue.message（见 server/storage-error.ts
  // 的 reasonLines：配置类错误只透传前 3 行）。若「Auto-detection would pick」
  // 被排在 message 末尾，用户看到的仍是一段被砍断的说明 —— 这正是「提示不友好」
  // 的根因，因此这里同时锁定顺序与建议字段。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data

  assert.match(
    String(data.storage.error_message),
    /Auto-detection would pick: DB_DRIVER=blob/,
    "答案必须落在被透传的前 3 行里，否则前端看到的还是一段被砍断的说明",
  )
  assert.match(String(data.storage.suggestion), /DB_DRIVER=blob/)

  const issue = data.issues.find((i: any) => i.code === "STORAGE_CONFIG_ERROR")
  assert.ok(issue)
  assert.match(
    String(issue.suggestion),
    /DB_DRIVER=blob/,
    "issue 必须带可展示的一行建议",
  )
  assert.ok(
    !String(issue.suggestion).includes("\n"),
    "建议必须是单行短句，否则又变成一段长文",
  )

  // 安装向导只有 init_status 可用（其余接口被 503 拦截），它也要带上建议
  const st = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.match(String(st.storage_suggestion), /DB_DRIVER=blob/)
})

test("503 拦截层：文案形状为「截断原因 + 单行建议」", async () => {
  // 全局中间件用 uiStorageError 组装 data.reason / data.suggestion，
  // 与诊断接口共用同一套截断规则，避免两处粒度漂移。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }
  const detail = await getStoreConfigErrorDetail(env, { silent: true })
  const ui = uiStorageError(detail)

  assert.match(String(ui.reason), /Auto-detection would pick: DB_DRIVER=blob/)
  assert.match(String(ui.suggestion), /DB_DRIVER=blob/)
})

test("显式配置的驱动不可用：绝不回退（即使 auto 能选到别的后端）", async () => {
  // 复现 issue #62 核心场景：CF 上写了 DB_DRIVER=kv 却没绑 KV namespace，
  // 而 Blob 是可用的。按设计：**不回退**（否则数据会落到用户没指定的后端），
  // 判为配置错误 —— 依赖存储的 API 会被 503 拦截，但必须把「改成什么」讲清楚。
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }

  // 1) 仍然是配置错误：不得被自动切到 Blob
  const detail = await getStoreConfigErrorDetail(env, { silent: true })
  assert.equal(detail.code, "DRIVER_UNAVAILABLE")
  assert.match(
    String(detail.message),
    /No fallback is performed for an explicitly configured driver/,
  )
  const status = await getStoreStatus(env)
  assert.equal(status.driver, "none", "不得解析到其它驱动")
  assert.notEqual(status.driver, "blob", "绝不回退到 auto 会选中的后端")
  assert.equal(
    (status as any).fallback,
    undefined,
    "不得存在任何「降级/回退」状态字段",
  )

  // 2) 但原因与建议必须可展示：答案排进前 3 行 + 结构化 suggestion
  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.ready, false, "配置不可用时不得报 ready")
  assert.equal(data.storage.available, false)
  assert.equal(data.storage.error_code, "DRIVER_UNAVAILABLE")
  assert.match(String(data.storage.error_message), /Auto-detection would pick: DB_DRIVER=blob/)
  assert.match(String(data.storage.suggestion), /DB_DRIVER=blob/)
  assert.equal(
    data.storage.fallback_to,
    undefined,
    "诊断响应里也不该出现回退字段",
  )

  const issue = data.issues.find((i: any) => i.code === "STORAGE_CONFIG_ERROR")
  assert.ok(issue)
  assert.equal(issue.level, "error")
  assert.match(String(issue.suggestion), /DB_DRIVER=blob/)

  // 3) 安装向导（只有 init_status 可用）同样拿得到建议
  const st = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.equal(st.initialized, false)
  assert.match(String(st.storage_error), /not available in this runtime/)
  assert.match(String(st.storage_suggestion), /DB_DRIVER=blob/)
})

test("CF 场景：DB_DRIVER=kv 但只绑了 D1 —— 不回退，但明确告诉用户改成 d1", async () => {
  // 用户实际报的场景（只配 DB_DRIVER/DB_FORMAT/JWT_SECRET，D1 是绑好的）：
  // 结论是「报错 + 指路」，不是「偷偷改用 D1」。用户改一个变量即可恢复，
  // 而数据始终落在他指定的后端上。
  const fakeD1 = {
    prepare: () => ({
      first: async () => ({ "1": 1 }),
      run: async () => ({}),
      all: async () => ({ results: [] }),
      bind: () => ({ first: async () => ({}), run: async () => ({}) }),
    }),
    batch: async () => [],
    exec: async () => ({}),
  }
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    DB: fakeD1,
  }

  const detail = await getStoreConfigErrorDetail(env, { silent: true })
  assert.equal(detail.code, "DRIVER_UNAVAILABLE")
  assert.match(
    String(detail.suggestion),
    /Set DB_DRIVER=d1/,
    "必须直接给出可抄写的答案",
  )
  assert.match(
    String(detail.message),
    /Auto-detection would pick: DB_DRIVER=d1/,
    "答案要落在被透传的前 3 行里",
  )

  const data = (await (
    await buildApp().request("/api/public/env_check", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.storage.available, false, "不得回退到 D1")
  assert.match(String(data.storage.suggestion), /DB_DRIVER=d1/)
  assert.ok(
    data.issues.some((i: any) => i.code === "STORAGE_CONFIG_ERROR"),
    "必须是 error 级问题（这件事需要用户处理，不能被当成警告略过）",
  )
})

test("init_status：存储配置错误时必须返回 storage_error，而不是无声的 false", async () => {
  const env: any = {
    DB_DRIVER: "blob",
    DB_FORMAT: "sql",
    JWT_SECRET: JWT,
    ESA_BLOB: fakeBlob(),
  }
  const data = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data

  assert.equal(data.initialized, false)
  assert.equal(data.ready, false)
  assert.match(
    String(data.storage_error),
    /Invalid storage combination/,
    "前端据此解释「为什么不能初始化」",
  )
})

test("init_status：存储正常时 storage_error 必须为 null（不产生误导）", async () => {
  const env: any = {
    DB_DRIVER: "kv",
    DB_FORMAT: "map",
    JWT_SECRET: JWT,
    KV: fakeKv(),
  }
  const data = (await (
    await buildApp().request("/api/public/init_status", { method: "GET" }, env)
  ).json()).data
  assert.equal(data.storage_error, null)
})
