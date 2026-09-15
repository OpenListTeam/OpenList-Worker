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

test("proxy_range: 未配置时回退驱动默认值（对齐 Go 139Yun 的 d.ProxyRange = true）", () => {
  assert.equal(getProxyRange({}), false)
  assert.equal(getProxyRange({ __driverProxyRangeDefault: true }), true)
  // 显式配置优先于驱动默认
  assert.equal(
    getProxyRange({ proxy_range: false, __driverProxyRangeDefault: true }),
    false,
  )
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
  const byPath = Object.fromEntries(policies.map((p) => [p.path, p.cacheExpiration]))
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
  assert.equal(getDownProxyUrl({ addition: '{"proxy_url":"https://z/w"}' }), "https://z/w")
  assert.equal(getDownProxyUrl({}), "")
})
