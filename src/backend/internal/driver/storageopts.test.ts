import assert from "node:assert/strict"
import { test } from "node:test"
import { getProxyRange, getEnableSign, getDisableIndex } from "./storageopts"
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
