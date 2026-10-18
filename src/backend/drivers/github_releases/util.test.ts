import test from "node:test"
import assert from "node:assert/strict"
import { ClientGithubReleases } from "./util"

function clientWith(ghProxy?: string): ClientGithubReleases {
  return new ClientGithubReleases({
    repo_structure: "example/repo",
    ...(ghProxy !== undefined ? { gh_proxy: ghProxy } : {}),
  })
}

function proxyOf(additionGhProxy: string | undefined, url: string): string {
  const client = clientWith(additionGhProxy)
  // proxy() 为私有方法，测试中通过索引访问
  return (client as unknown as { proxy: (u: string) => string }).proxy(url)
}

test("gh_proxy 已配置时替换 https://github.com 前缀（对齐 Go Link）", () => {
  const url = "https://github.com/example/repo/releases/download/v1.0.0/app.zip"
  // 文档推荐写法（meta.go 的 help）：值本身包含 https://github.com，
  // 替换后等价于「代理前缀 + 原始链接」
  assert.equal(
    proxyOf("https://gh-proxy.com/https://github.com", url),
    "https://gh-proxy.com/" + url,
  )
  // 裸域名写法：按 Go strings.Replace 的语义，只把 https://github.com 这一段整体换掉
  // （此前断言写成 proxy + 完整 url，与实现/Go 语义不符）
  assert.equal(
    proxyOf("https://mirror.example.com", url),
    "https://mirror.example.com" + url.slice("https://github.com".length),
  )
})

test("gh_proxy 未配置时保持原链接不变", () => {
  const url = "https://github.com/example/repo/releases/download/v1.0.0/app.zip"
  assert.equal(proxyOf(undefined, url), url)
  assert.equal(proxyOf("", url), url)
})

test("gh_proxy 已配置但链接非 http 开头时不加前缀（对齐上游 Go 版语义）", () => {
  assert.equal(
    proxyOf("https://mirror.example.com", "/relative/path"),
    "/relative/path",
  )
})
