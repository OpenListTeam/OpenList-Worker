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

test("gh_proxy 已配置时为 http(s) 下载链接加代理前缀", () => {
  const url = "https://github.com/example/repo/releases/download/v1.0.0/app.zip"
  assert.equal(
    proxyOf("https://mirror.example.com", url),
    "https://mirror.example.com" + url,
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
