import test from "node:test"
import assert from "node:assert/strict"
import { ClientGithubReleases } from "./util"
import { DriverGithubReleases } from "./driver"

/**
 * GitHub Releases 驱动回归测试（Issue #107）：repo_structure 解析、根/嵌套挂载、
 * gh_proxy、show_all_version 目录与文件判定、per_page/max_page 分页。
 */

const release = (tag: string, assetName: string) => ({
  tag_name: tag,
  created_at: "2026-01-01T00:00:00Z",
  published_at: "2026-01-02T00:00:00Z",
  html_url: `https://github.com/OpenListTeam/OpenList/releases/tag/${tag}`,
  zipball_url: `https://github.com/OpenListTeam/OpenList/archive/refs/tags/${tag}.zip`,
  tarball_url: `https://github.com/OpenListTeam/OpenList/archive/refs/tags/${tag}.tar.gz`,
  assets: [
    {
      name: assetName,
      size: 1024,
      created_at: "2026-01-02T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      browser_download_url: `https://github.com/OpenListTeam/OpenList/releases/download/${tag}/${assetName}`,
    },
  ],
})

const LATEST = release("v1.0.0", "openlist-linux-amd64.tar.gz")
const ALL = [LATEST, release("v0.9.0", "openlist-v0.9.0.tar.gz")]

const CONTENTS = [
  {
    name: "README.md",
    size: 10,
    download_url:
      "https://raw.githubusercontent.com/OpenListTeam/OpenList/main/README.md",
  },
  {
    name: "LICENSE",
    size: 20,
    download_url:
      "https://raw.githubusercontent.com/OpenListTeam/OpenList/main/LICENSE",
  },
  {
    name: "src",
    size: 0,
    download_url:
      "https://raw.githubusercontent.com/OpenListTeam/OpenList/main/src",
  },
]

type Routes = Array<[string, any]>

/** 按 URL 包含关系匹配的 fetch mock；返回恢复函数 */
function installFetch(routes: Routes): () => void {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: any) => {
    const url = String(input)
    const match = routes.find(([key]) => url.includes(key))
    if (!match) return new Response("", { status: 404 })
    return new Response(JSON.stringify(match[1]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

const defaultRoutes: Routes = [
  ["/releases/latest", LATEST],
  ["/releases?", ALL],
  ["/contents", CONTENTS],
]

test("repo_structure 必填，缺失时 init 报错", async () => {
  const client = new ClientGithubReleases({})
  await assert.rejects(() => client.init(), /repo_structure is required/)
})

test("repo_structure 解析：单行 / 多行 / 分号", async () => {
  const restore = installFetch(defaultRoutes)
  try {
    const root = new ClientGithubReleases({
      repo_structure: "OpenListTeam/OpenList",
    })
    await root.init()

    // 挂载点根目录直接展示 release 资产（对齐 Go）
    const files = await root.list("/")
    assert.ok(files.some((f) => f.name === "openlist-linux-amd64.tar.gz"))

    // 多行（Go 写法）+ 分号（历史写法）都能解析出嵌套挂载点
    const multi = new ClientGithubReleases({
      repo_structure: "repos:OpenListTeam/OpenList\nother:OpenListTeam/Other",
    })
    await multi.init()
    const atRoot = await multi.list("/")
    assert.deepEqual(atRoot.map((f) => f.name).sort(), ["other", "repos"])

    // 分号分隔：根挂载点直接在 "/" 展示内容，嵌套挂载点合成为目录 "a"
    const semicolon = new ClientGithubReleases({
      repo_structure: "a:OpenListTeam/OpenList;OpenListTeam/Other",
    })
    await semicolon.init()
    const second = await semicolon.list("/")
    const secondNames = second.map((f) => f.name)
    assert.ok(secondNames.includes("a"))
    assert.ok(secondNames.includes("openlist-linux-amd64.tar.gz"))
  } finally {
    restore()
  }
})

test("非法 repo_structure（多个冒号）直接报错", () => {
  assert.throws(
    () => new ClientGithubReleases({ repo_structure: "x:y:z" }),
    /invalid format/,
  )
})

test("挂载点根目录列出最新版本资产 + README/LICENSE + 源码包", async () => {
  const restore = installFetch(defaultRoutes)
  try {
    const client = new ClientGithubReleases({
      repo_structure: "OpenListTeam/OpenList",
      show_readme: true,
      show_source_code: true,
    })
    await client.init()

    const files = await client.list("/")
    const names = files.map((f) => f.name).sort()
    assert.deepEqual(names, [
      "LICENSE",
      "README.md",
      "Source code (tar.gz)",
      "Source code (zip)",
      "openlist-linux-amd64.tar.gz",
    ])

    const asset = files.find((f) => f.name === "openlist-linux-amd64.tar.gz")!
    assert.equal(
      asset.url,
      "https://github.com/OpenListTeam/OpenList/releases/download/v1.0.0/openlist-linux-amd64.tar.gz",
    )
    // raw.githubusercontent.com 不是 github.com 前缀，不应被改写
    const readme = files.find((f) => f.name === "README.md")!
    assert.equal(
      readme.url,
      "https://raw.githubusercontent.com/OpenListTeam/OpenList/main/README.md",
    )
    assert.equal(await client.isDirectory("/"), true)
    assert.equal(await client.isDirectory("/README.md"), false)
  } finally {
    restore()
  }
})

test("gh_proxy 只替换 github.com 前缀（对齐 Go Link）", async () => {
  const restore = installFetch(defaultRoutes)
  try {
    const client = new ClientGithubReleases({
      repo_structure: "OpenListTeam/OpenList",
      show_readme: true,
      show_source_code: true,
      gh_proxy: "https://ghproxy.net/https://github.com",
    })
    await client.init()

    const files = await client.list("/")
    const asset = files.find((f) => f.name === "openlist-linux-amd64.tar.gz")!
    assert.equal(
      asset.url,
      "https://ghproxy.net/https://github.com/OpenListTeam/OpenList/releases/download/v1.0.0/openlist-linux-amd64.tar.gz",
    )
    const zip = files.find((f) => f.name === "Source code (zip)")!
    assert.equal(
      zip.url,
      "https://ghproxy.net/https://github.com/OpenListTeam/OpenList/archive/refs/tags/v1.0.0.zip",
    )
    const readme = files.find((f) => f.name === "README.md")!
    assert.equal(
      readme.url,
      "https://raw.githubusercontent.com/OpenListTeam/OpenList/main/README.md",
    )
  } finally {
    restore()
  }
})

test("嵌套挂载点：逐级合成目录并进入挂载点根目录", async () => {
  const restore = installFetch(defaultRoutes)
  try {
    const client = new ClientGithubReleases({
      repo_structure: "repos:OpenListTeam/OpenList",
    })
    await client.init()

    const root = await client.list("/")
    assert.deepEqual(
      root.map((f) => f.name),
      ["repos"],
    )
    assert.equal(root[0].isDir, true)

    assert.equal(await client.isDirectory("/repos"), true)
    const mountRoot = await client.list("/repos")
    assert.ok(mountRoot.some((f) => f.name === "openlist-linux-amd64.tar.gz"))

    const url = await client.getDownloadUrl(
      "/repos/openlist-linux-amd64.tar.gz",
    )
    assert.equal(
      url,
      "https://github.com/OpenListTeam/OpenList/releases/download/v1.0.0/openlist-linux-amd64.tar.gz",
    )
  } finally {
    restore()
  }
})

test("show_all_version：版本目录、目录判定与版本内文件下载", async () => {
  const restore = installFetch(defaultRoutes)
  try {
    const client = new ClientGithubReleases({
      repo_structure: "OpenListTeam/OpenList",
      show_all_version: true,
      show_readme: true,
      show_source_code: true,
    })
    await client.init()

    const root = await client.list("/")
    const dirs = root
      .filter((f) => f.isDir)
      .map((f) => f.name)
      .sort()
    assert.deepEqual(dirs, ["v0.9.0", "v1.0.0"])
    assert.equal(await client.isDirectory("/v1.0.0"), true)
    assert.equal(await client.isDirectory("/not-a-tag"), false)

    const tag = await client.list("/v1.0.0")
    const names = tag.map((f) => f.name).sort()
    assert.deepEqual(names, [
      "Source code (tar.gz)",
      "Source code (zip)",
      "openlist-linux-amd64.tar.gz",
    ])

    // 版本目录内的文件不能被误判为目录
    const fileUrl = await client.getDownloadUrl(
      "/v1.0.0/openlist-linux-amd64.tar.gz",
    )
    assert.equal(
      fileUrl,
      "https://github.com/OpenListTeam/OpenList/releases/download/v1.0.0/openlist-linux-amd64.tar.gz",
    )
    const driver = new DriverGithubReleases({
      repo_structure: "OpenListTeam/OpenList",
      show_all_version: true,
    })
    const item = await driver.get(
      "/v1.0.0/openlist-linux-amd64.tar.gz",
      "/v1.0.0/openlist-linux-amd64.tar.gz",
    )
    assert.equal(item.is_dir, false)
    assert.match(item.raw_url || "", /releases\/download\/v1\.0\.0/)
  } finally {
    restore()
  }
})

test("per_page / max_page 控制分页拉取（对齐 Go getAllReleases）", async () => {
  const calls: string[] = []
  const original = globalThis.fetch
  const all = [release("v3", "a"), release("v2", "b"), release("v1", "c")]
  globalThis.fetch = (async (input: any) => {
    const url = String(input)
    calls.push(url)
    if (url.includes("/releases?")) {
      const parsed = new URL(url)
      const page = Number(parsed.searchParams.get("page") || "1")
      const perPage = Number(parsed.searchParams.get("per_page") || "30")
      const slice = all.slice((page - 1) * perPage, page * perPage)
      return new Response(JSON.stringify(slice), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    if (url.includes("/releases/latest")) {
      return new Response(JSON.stringify(LATEST), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as typeof fetch
  try {
    const client = new ClientGithubReleases({
      repo_structure: "OpenListTeam/OpenList",
      show_all_version: true,
      per_page: 2,
      max_page: 2,
      show_readme: false,
    })
    await client.init()
    const files = await client.list("/")
    assert.deepEqual(files.map((f) => f.name).sort(), ["v1", "v2", "v3"])
    assert.ok(
      calls.some((u) => u.includes("per_page=2") && u.includes("page=1")),
    )
    assert.ok(
      calls.some((u) => u.includes("per_page=2") && u.includes("page=2")),
    )
    assert.ok(!calls.some((u) => u.includes("page=3")))

    calls.length = 0
    const limited = new ClientGithubReleases({
      repo_structure: "OpenListTeam/OpenList",
      show_all_version: true,
      per_page: 1,
      max_page: 1,
      show_readme: false,
    })
    await limited.init()
    const limitedFiles = await limited.list("/")
    assert.deepEqual(
      limitedFiles.map((f) => f.name),
      ["v3"],
    )
    assert.ok(!calls.some((u) => u.includes("page=2")))
  } finally {
    globalThis.fetch = original
  }
})

test("驱动为只读：写操作全部抛错", async () => {
  const driver = new DriverGithubReleases({
    repo_structure: "OpenListTeam/OpenList",
  })
  await assert.rejects(() => driver.mkdir(), /read-only/)
  await assert.rejects(() => driver.put(), /read-only/)
  await assert.rejects(() => driver.remove(), /read-only/)
  await assert.rejects(() => driver.move(), /read-only/)
  await assert.rejects(() => driver.copy(), /read-only/)
  await assert.rejects(() => driver.rename(), /read-only/)
})
