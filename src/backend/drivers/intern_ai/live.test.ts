import test from "node:test"
import assert from "node:assert/strict"
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

/**
 * 真实网关完整读写 e2e：mkdir → put → list → 下载校验 → rename →
 * mkdir sub → move → copy → 清理。
 * 仅当 INTERN_AI_LIVE=1 且 INTERN_AI_E2E=1 且提供真实 token 时运行，
 * 常规 CI 永远不会写入云盘。
 */
test("live write e2e: 完整读写链路（真实网关）", async (t) => {
  if (
    process.env.INTERN_AI_LIVE !== "1" ||
    process.env.INTERN_AI_E2E !== "1"
  ) {
    t.skip(
      "set INTERN_AI_LIVE=1 INTERN_AI_E2E=1 with a real token to run the write e2e",
    )
    return
  }
  const token = process.env.INTERN_AI_TOKEN || ""
  if (!token || token.startsWith("fake")) {
    t.skip("live write e2e needs a real token")
    return
  }
  const d = new DriverInternAI({
    token,
    api_base: "https://discovery.intern-ai.org.cn",
    page_size: 50,
  } as any)
  await d.init()

  const work = `/openlist-worker-e2e-${Date.now()}`
  const cleanup = async () => {
    try {
      await d.remove("/e2e-cleanup", work, [])
    } catch (e) {
      t.diagnostic(`cleanup failed for ${work}: ${String(e)}`)
    }
  }
  t.after(cleanup)

  // 1. mkdir 工作区
  await d.mkdir("/e2e-v", work)

  // 2. put 文件
  const content = Buffer.from(
    `openlist-worker live e2e ${new Date().toISOString()}`,
  )
  await d.put("/e2e-v", `${work}/hello.txt`, content)

  // 3. list 并验证
  const items = await d.list("/e2e-v", work)
  assert.equal(items.length, 1)
  assert.equal(items[0]!.name, "hello.txt")
  assert.equal(items[0]!.size, content.byteLength)
  assert.notEqual(items[0]!.modified, "1970-01-01T00:00:00.000Z")

  // 4. get 下载链接 + 内容回读
  const got = await d.get("/e2e-v", `${work}/hello.txt`)
  assert.ok(got.raw_url, "download url should be resolved")
  const resp = await fetch(got.raw_url)
  assert.equal(resp.status, 200)
  const body = Buffer.from(await resp.arrayBuffer())
  assert.ok(body.equals(content), "download content should round-trip")

  // 5. rename
  await d.rename("/e2e-v", `${work}/hello.txt`, "renamed.txt")

  // 6. mkdir sub + move
  await d.mkdir("/e2e-v", `${work}/sub`)
  await d.move("/e2e-v", `${work}/sub`, ["x"], `${work}/renamed.txt`, `${work}/sub/renamed.txt`)

  // 7. copy 回工作区根
  await d.copy("/e2e-v", work, ["x"], `${work}/sub/renamed.txt`, `${work}/renamed.txt`)

  // 8. 验证副本存在
  const finalItems = await d.list("/e2e-v", work)
  assert.ok(finalItems.some((i) => i.name === "renamed.txt"))

  t.diagnostic(`live write e2e ok (workspace ${work} created and cleaned)`)
})
