import test from "node:test"
import assert from "node:assert/strict"
import { DriverCnbReleases } from "./driver"

/**
 * CNB Releases 驱动回归测试：API 按 release/asset ID 操作，而 TS 链路传路径名，
 * 必须先解析出 ID（旧实现直接把路径段当 ID，进入 release 目录会 404）。
 */

const RELEASE = {
  id: "rel-1",
  name: "v1.0.0",
  tag_name: "v1.0.0",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  assets: [
    {
      id: "asset-1",
      name: "file.zip",
      size: 5,
      path: "/org/repo/-/releases/download/file.zip",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    },
  ],
}

const ADDITION = { repo: "org/repo", token: "tkn" }

function installFetch(): { calls: string[]; restore: () => void } {
  const original = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input)
    calls.push(`${init?.method || "GET"} ${url}`)
    if (url.includes("/org/repo/-/releases") && url.includes("/assets/")) {
      return new Response(null, { status: 204 })
    }
    if (url.endsWith("/org/repo/-/releases")) {
      return new Response(JSON.stringify([RELEASE]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    if (url.includes("/org/repo/-/releases/")) {
      return new Response(JSON.stringify(RELEASE), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    return new Response("", { status: 404 })
  }) as typeof fetch
  return {
    calls,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

test("CNB Releases 驱动 init 校验 repo/token", async () => {
  await assert.rejects(
    () => new DriverCnbReleases({ repo: "", token: "" }).init(),
    /repo is required/,
  )
  await assert.rejects(
    () => new DriverCnbReleases({ repo: "org/repo", token: "" }).init(),
    /token is required/,
  )
})

test("根目录列出 releases（目录 sign 为 release ID）", async () => {
  const { restore } = installFetch()
  try {
    const driver = new DriverCnbReleases(ADDITION)
    const items = await driver.list("", "/")
    assert.equal(items.length, 1)
    assert.equal(items[0].name, "v1.0.0")
    assert.equal(items[0].is_dir, true)
    assert.equal(items[0].sign, "rel-1")
    assert.equal(items[0].size, 5)
  } finally {
    restore()
  }
})

test("按 release 名称进入目录并列出资产", async () => {
  const { restore } = installFetch()
  try {
    const driver = new DriverCnbReleases(ADDITION)
    const items = await driver.list("/v1.0.0", "/v1.0.0")
    assert.equal(items.length, 1)
    assert.equal(items[0].name, "file.zip")
    assert.equal(items[0].is_dir, false)
    assert.equal(
      items[0].raw_url,
      "https://cnb.cool/org/repo/-/releases/download/file.zip",
    )
  } finally {
    restore()
  }
})

test("get：release 目录与资产文件都能按名称解析", async () => {
  const { restore } = installFetch()
  try {
    const driver = new DriverCnbReleases(ADDITION)

    const dir = await driver.get("/v1.0.0", "/v1.0.0")
    assert.equal(dir.is_dir, true)
    assert.equal(dir.name, "v1.0.0")

    const file = await driver.get("/v1.0.0/file.zip", "/v1.0.0/file.zip")
    assert.equal(file.is_dir, false)
    assert.equal(file.name, "file.zip")
    assert.equal(
      file.raw_url,
      "https://cnb.cool/org/repo/-/releases/download/file.zip",
    )
  } finally {
    restore()
  }
})

test("remove：按名称解析出 release/asset ID 后再调用删除接口", async () => {
  const { calls, restore } = installFetch()
  try {
    const driver = new DriverCnbReleases(ADDITION)
    await driver.remove("", "/v1.0.0/file.zip", ["file.zip"])
    assert.ok(
      calls.some(
        (c) =>
          c.startsWith("DELETE") &&
          c.includes("/org/repo/-/releases/rel-1/assets/asset-1"),
      ),
      `未按 ID 调用删除接口: ${JSON.stringify(calls)}`,
    )
  } finally {
    restore()
  }
})

test("use_tag_name 时目录名使用 tag 且不允许重命名", async () => {
  const { restore } = installFetch()
  try {
    const driver = new DriverCnbReleases({ ...ADDITION, use_tag_name: true })
    const items = await driver.list("", "/")
    assert.equal(items[0].name, "v1.0.0")
    await assert.rejects(
      () => driver.rename("", "/v1.0.0", "new"),
      /only release name can be renamed/,
    )
  } finally {
    restore()
  }
})

test("无状态环境下 put 直接报错", async () => {
  const driver = new DriverCnbReleases(ADDITION)
  await assert.rejects(() => driver.put(), /asset upload not supported/)
})
