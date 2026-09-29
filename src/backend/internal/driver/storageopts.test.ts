import assert from "node:assert/strict"
import { test } from "node:test"
import {
  getProxyRange,
  getEnableSign,
  getDisableIndex,
  parseCustomCachePolicies,
  matchGlob,
  resolveCacheExpiration,
} from "./storageopts"
import { resolveProxyDecision, getDownProxyUrl } from "./proxy"

// ---- proxy_range ----

test("proxy_range: 显式为 true/false 时以其为准", () => {
  assert.equal(getProxyRange({ proxy_range: true }), true)
  assert.equal(getProxyRange({ proxy_range: "true" }), true)
  assert.equal(getProxyRange({ proxy_range: false }), false)
  assert.equal(getProxyRange({ proxy_range: "false" }), false)
})

test("proxy_range: 未配置时默认透传（对齐 Go 透明代理转发客户端头）", () => {
  assert.equal(getProxyRange({}), true)
  // 显式配置优先于默认值
  assert.equal(getProxyRange({ proxy_range: false }), false)
})

// ---- enable_sign / disable_index ----

test("enable_sign / disable_index: 解析字符串与布尔两种形式", () => {
  assert.equal(getEnableSign({ enable_sign: true }), true)
  assert.equal(getEnableSign({ enable_sign: "true" }), true)
  assert.equal(getEnableSign({ enable_sign: "false" }), false)
  assert.equal(getEnableSign({}), false)

  assert.equal(getDisableIndex({ disable_index: true }), true)
  assert.equal(getDisableIndex({ disable_index: "true" }), true)
  assert.equal(getDisableIndex({}), false)
})

// ---- custom_cache_policies ----

test("custom_cache_policies: 支持 JSON 数组形式", () => {
  const policies = parseCustomCachePolicies({
    custom_cache_policies:
      '[{"path":"/photos/*","cache_expiration":1440},{"path":"/tmp/**","cache_expiration":0}]',
  })
  assert.equal(policies.length, 2)
  assert.equal(policies[0].path, "/photos/*")
  assert.equal(policies[0].cacheExpiration, 1440)
  assert.equal(policies[1].path, "/tmp/**")
  assert.equal(policies[1].cacheExpiration, 0)
})

test("custom_cache_policies: 支持 max_age 别名", () => {
  const policies = parseCustomCachePolicies({
    custom_cache_policies: [{ path: "/a/*", max_age: 60 }],
  })
  assert.equal(policies.length, 1)
  assert.equal(policies[0].cacheExpiration, 60)
})

test("custom_cache_policies: 支持 key-value 映射形式", () => {
  const policies = parseCustomCachePolicies({
    custom_cache_policies: { "/x/*": 5, "/y/*": 10 },
  })
  assert.equal(policies.length, 2)
  const byPath = Object.fromEntries(
    policies.map((p) => [p.path, p.cacheExpiration]),
  )
  assert.equal(byPath["/x/*"], 5)
  assert.equal(byPath["/y/*"], 10)
})

test("custom_cache_policies: 空值与非法输入返回空数组而不抛错", () => {
  assert.deepEqual(parseCustomCachePolicies({}), [])
  assert.deepEqual(parseCustomCachePolicies({ custom_cache_policies: "" }), [])
  assert.deepEqual(
    parseCustomCachePolicies({ custom_cache_policies: "not-json" }),
    [],
  )
})

// ---- glob 匹配 ----

test("matchGlob: 单个 * 不跨目录分隔符", () => {
  assert.equal(matchGlob("/photos/*", "/photos/a.jpg"), true)
  assert.equal(matchGlob("/photos/*", "/photos/sub/a.jpg"), false)
})

test("matchGlob: ** 可跨目录分隔符", () => {
  assert.equal(matchGlob("/photos/**", "/photos/sub/deep/a.jpg"), true)
  assert.equal(matchGlob("/**", "/any/thing"), true)
})

test("matchGlob: 精确匹配与 ? 通配", () => {
  assert.equal(matchGlob("/a/b.txt", "/a/b.txt"), true)
  assert.equal(matchGlob("/a/?.txt", "/a/b.txt"), true)
})

// ---- glob DoS 防护 ----

test("matchGlob: 超长模式被拒绝（长度上限）", () => {
  const huge = "/" + "a".repeat(5000)
  assert.equal(matchGlob(huge, "/a"), false)
})

test("matchGlob: 大量 ** 段仍能快速返回（不再依赖段数截断）", () => {
  // 200 个 ** 段在语义上确实应匹配任意多级路径；
  // 防护改由 DP 的 O(段数×段数) 复杂度和长度上限提供，
  // 这里断言结果正确且耗时可控。
  const pattern = "/" + "**/".repeat(200) + "z"
  const t0 = performance.now()
  const got = matchGlob(pattern, "/a/b/c/z")
  const elapsed = performance.now() - t0
  assert.equal(got, true)
  assert.ok(elapsed < 500, `耗时 ${elapsed.toFixed(1)}ms，疑似复杂度过高`)
})

test("matchGlob: 相邻通配符折叠后仍可正确匹配", () => {
  // 折叠不应破坏语义：*** 等价于 **
  assert.equal(matchGlob("/a/**/b", "/a/x/y/b"), true)
  assert.equal(matchGlob("/a/*/b", "/a/x/b"), true)
  assert.equal(matchGlob("/a/*/b", "/a/x/y/b"), false)
})

test("matchGlob: 恶意回溯模式能在合理时间内返回（不挂起）", () => {
  // 关键回归：多个相邻 .* 曾可能触发灾难性回溯。
  // 这里断言匹配失败时的耗时可控，防止未来退化。
  const pattern = "/" + "**/".repeat(20) + "z"
  const target = "/" + "ab/".repeat(40) + "x"
  const t0 = performance.now()
  const result = matchGlob(pattern, target)
  const elapsed = performance.now() - t0
  assert.equal(result, false)
  assert.ok(
    elapsed < 1000,
    `glob 匹配耗时 ${elapsed.toFixed(1)}ms，疑似回溯失控`,
  )
})

test("matchGlob: 正常规则不受防护影响", () => {
  assert.equal(matchGlob("/photos/*", "/photos/a.jpg"), true)
  assert.equal(matchGlob("/photos/**", "/photos/a/b/c.jpg"), true)
  assert.equal(matchGlob("/data/**/*.log", "/data/a/b/c.log"), true)
})

// ---- 双星 + 单星组合（双回溯点回归）----

test("matchGlob: 双星后跟单星可正确回退", () => {
  // 关键回归：双星先吞掉 /a/b，遇到单星不匹配时须退回双星
  assert.equal(matchGlob("/data/**/*.log", "/data/a/b/c.log"), true)
  assert.equal(matchGlob("/data/**/*.log", "/data/c.log"), true)
  assert.equal(matchGlob("/x/**/*/y", "/x/a/b/c/y"), true)
  // 扩展名不匹配时必须为 false
  assert.equal(matchGlob("/data/**/*.log", "/data/a/b/c.txt"), false)
})

test("matchGlob: 单星不得跨目录，双星可以", () => {
  assert.equal(matchGlob("/a/*/b", "/a/x/b"), true)
  assert.equal(matchGlob("/a/*/b", "/a/x/y/b"), false)
  assert.equal(matchGlob("/a/**/b", "/a/x/y/b"), true)
  // 双星可匹配 0 段
  assert.equal(matchGlob("/a/**/b", "/a/b"), true)
})

test("matchGlob: 仅由星号组成的段才跨级，混杂字符的段不跨级", () => {
  // `**b` 是段内通配（对齐 doublestar：只有整段为 ** 时才跨目录）
  assert.equal(matchGlob("/a/**b", "/a/x/y/b"), false)
  assert.equal(matchGlob("/a/**b", "/a/xyb"), true)
  assert.equal(matchGlob("/a/*b", "/a/xyb"), true)
  assert.equal(matchGlob("/a/*b", "/a/x/yb"), false)
})

test("matchGlob: 通配符在开头与结尾", () => {
  assert.equal(matchGlob("*.log", "a.log"), true)
  assert.equal(matchGlob("*.log", "a.txt"), false)
  assert.equal(matchGlob("/a/*", "/a/b"), true)
  assert.equal(matchGlob("/a/*", "/a/b/c"), false)
  assert.equal(matchGlob("/a/**", "/a/b/c"), true)
})

test("matchGlob: 目标已耗尽时模式剩余必须全是星号", () => {
  assert.equal(matchGlob("/a/b*", "/a/b"), true)
  assert.equal(matchGlob("/a/b**", "/a/b"), true)
  assert.equal(matchGlob("/a/bc", "/a/b"), false)
  assert.equal(matchGlob("/a/b?d", "/a/b"), false)
})

test("matchGlob: 连续多个星号等价于双星", () => {
  assert.equal(matchGlob("/a/***/b", "/a/x/y/b"), true)
  assert.equal(matchGlob("/a/*****/b", "/a/x/y/b"), true)
})

test("matchGlob: 空模式与空目标", () => {
  assert.equal(matchGlob("", "/a"), false)
  assert.equal(matchGlob("/a", ""), false)
})

// ---- 缓存时长合成 ----

test("resolveCacheExpiration: 无自定义策略时使用存储基础值", () => {
  assert.equal(resolveCacheExpiration({ cache_expiration: 15 }, "/a/b.txt"), 15)
})

test("resolveCacheExpiration: 未配置时回退默认 30", () => {
  assert.equal(resolveCacheExpiration({}, "/a/b.txt"), 30)
})

test("resolveCacheExpiration: 命中规则时覆盖基础值，未命中用基础值", () => {
  const storage = {
    cache_expiration: 30,
    custom_cache_policies: '[{"path":"/photos/*","cache_expiration":1440}]',
  }
  assert.equal(resolveCacheExpiration(storage, "/photos/a.jpg"), 1440)
  assert.equal(resolveCacheExpiration(storage, "/docs/a.txt"), 30)
})

test("resolveCacheExpiration: 规则值为 0 表示不缓存", () => {
  const storage = {
    cache_expiration: 30,
    custom_cache_policies: '[{"path":"/tmp/*","cache_expiration":0}]',
  }
  assert.equal(resolveCacheExpiration(storage, "/tmp/x.bin"), 0)
})

test("resolveCacheExpiration: 多条规则命中时最后一条优先", () => {
  const storage = {
    custom_cache_policies:
      '[{"path":"/a/**","cache_expiration":10},{"path":"/a/b/*","cache_expiration":20}]',
  }
  assert.equal(resolveCacheExpiration(storage, "/a/b/c.txt"), 20)
})

test("resolveCacheExpiration: 非法或负数回退默认值", () => {
  assert.equal(resolveCacheExpiration({ cache_expiration: -5 }, "/a"), 30)
  assert.equal(resolveCacheExpiration({ cache_expiration: "abc" }, "/a"), 30)
})

// ---- 与代理决策协同 ----

test("proxy 决策: 默认驱动走 302", () => {
  const d = resolveProxyDecision({}, "onedrive", false)
  assert.equal(d.mode, "302_redirect")
  assert.equal(d.needsProxy, false)
})

test("proxy 决策: 开启代理后 proxy_range 决定是否透传 Range", () => {
  const storage = { webdav_policy: "native_proxy", proxy_range: true }
  const d = resolveProxyDecision(storage, "webdav", false)
  assert.equal(d.needsProxy, true)
  assert.equal(getProxyRange(storage), true)
})

test("down_proxy_url: 直接字段与 addition 别名均可解析", () => {
  assert.equal(
    getDownProxyUrl({ down_proxy_url: "https://p.example.com/d?path=$path" }),
    "https://p.example.com/d?path=$path",
  )
  assert.equal(
    getDownProxyUrl({ addition: '{"down_proxy_url":"https://x/y"}' }),
    "https://x/y",
  )
  assert.equal(
    getDownProxyUrl({ addition: '{"proxy_url":"https://z/w"}' }),
    "https://z/w",
  )
  assert.equal(getDownProxyUrl({}), "")
})
