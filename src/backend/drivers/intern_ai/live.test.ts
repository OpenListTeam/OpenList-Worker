import test from "node:test"
import { DriverInternAI } from "./driver"

/**
 * 真实网关冒烟测试（对 discovery.intern-ai.org.cn）。
 * 仅当 INTERN_AI_LIVE=1 时运行，CI 不依赖外部服务：
 *  - 无 token            → 必须报 token is required
 *  - fake 开头的占位 token → 平台必须拒绝（HTTP 401）且驱动给出可读错误
 *  - 真实 token          → 列目录 + 解析下载链接（可选）
 */
test("live gateway: token 校验与 401 错误路径", async (t) => {
  if (process.env.INTERN_AI_LIVE !== "1") {
    t.skip("set INTERN_AI_LIVE=1 to run the live gateway smoke test")
    return
  }
  const token = process.env.INTERN_AI_TOKEN || ""
  const d = new DriverInternAI({
    token,
    api_base: "https://discovery.intern-ai.org.cn",
    page_size: 50,
  } as any)

  if (!token) {
    await t.assert.rejects(() => d.init(), /token is required/)
    return
  }
  if (token.startsWith("fake")) {
    await t.assert.rejects(
      () => d.init(),
      /invalid or expired token/,
    )
    return
  }

  await d.init()
  const items = await d.list("/live-v", "/")
  t.diagnostic(`live list returned ${items.length} entries`)
  for (const item of items.slice(0, 10)) {
    t.diagnostic(
      `  ${item.name} (dir=${item.is_dir} size=${item.size})`,
    )
  }
  const file = items.find((i) => !i.is_dir)
  if (file) {
    const got = await d.get("/live-v", `/${file.name}`)
    t.diagnostic(`link ${file.name} -> ${String(got.raw_url).slice(0, 80)}`)
  }
})
