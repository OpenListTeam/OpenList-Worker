import assert from "node:assert/strict"
import { test } from "node:test"
import {
  driverMustProxy,
  driverPreferProxy,
  effectiveWebProxy,
  resolveProxyDecision,
} from "./proxy"

/**
 * 驱动代理能力表必须与 Go 各驱动的 meta.go 保持一致。
 *
 * Go: `Config.MustProxy() = OnlyProxy || NoLinkURL`、`Config.DefaultProxy() = PreferProxy`。
 * 这张表同时驱动三处行为，因此要锁住它，避免再次出现「表单说强制代理、
 * 运行时却走 302」这类两处不一致的问题：
 *   1. 运行时下载模式（resolveProxyDecision）
 *   2. 原生代理的上限兜底能否降级为直链（isAuthBoundDownload）
 *   3. 后台表单字段（admin.ts 的 buildProxyFields）
 */

test("MustProxy：只包含 Go 标了 OnlyProxy / NoLinkURL 的驱动", () => {
  const must = [
    "WeiYun",
    "SFTP",
    "FTP",
    "SMB",
    "Crypt",
    "Virtual",
    "Strm",
    "Mega_nz",
    "ProtonDrive",
    "Chunk",
    "GoogleDrive",
    "GooglePhoto",
    "QuarkOpen",
    "QuarkUC",
    "ChaoXing",
  ]
  for (const driver of must) {
    assert.equal(driverMustProxy(driver), true, `${driver} 应为 MustProxy`)
  }

  // Go 里只有 PreferProxy 或完全没有代理标记的驱动，不能当成 MustProxy
  const notMust = [
    "123Pan",
    "BaiduNetdisk",
    "123PanShare",
    "115Open",
    "189Cloud",
    "Terabox",
    "Onedrive",
    "AliyundriveOpen",
  ]
  for (const driver of notMust) {
    assert.equal(driverMustProxy(driver), false, `${driver} 不应为 MustProxy`)
  }
})

test("PreferProxy：与 Go 的 DefaultProxy() 一致", () => {
  for (const driver of [
    "WebDav",
    "BaiduNetdisk",
    "123Pan",
    "123PanShare",
    "123Open",
  ]) {
    assert.equal(driverPreferProxy(driver), true, `${driver} 应为 PreferProxy`)
  }
  for (const driver of ["Onedrive", "GoogleDrive", "S3", "Terabox"]) {
    assert.equal(
      driverPreferProxy(driver),
      false,
      `${driver} 不应为 PreferProxy`,
    )
  }
})

test("effectiveWebProxy：未配置时回退到驱动默认值，显式值优先", () => {
  // PreferProxy 驱动：表单默认勾选（等价 Go op/driver.go 的默认 true）
  assert.equal(effectiveWebProxy({}, "webdav"), true)
  // 管理员显式取消勾选时必须尊重（Go 的 ShouldProxy 只看该字段）
  assert.equal(effectiveWebProxy({ web_proxy: false }, "webdav"), false)
  assert.equal(effectiveWebProxy({ web_proxy: "false" }, "webdav"), false)
  // 非 PreferProxy 驱动：默认不代理
  assert.equal(effectiveWebProxy({}, "onedrive"), false)
  assert.equal(effectiveWebProxy({ web_proxy: true }, "onedrive"), true)
})

test("resolveProxyDecision：MustProxy 优先，显式 web_proxy=false 不被覆盖", () => {
  // 1) 驱动强制代理
  assert.equal(
    resolveProxyDecision({ web_proxy: false }, "weiyun", false).source,
    "force",
  )
  // 2) PreferProxy 驱动默认代理，但显式关闭后走直链（对齐 Go）
  assert.equal(resolveProxyDecision({}, "webdav", false).needsProxy, true)
  assert.equal(
    resolveProxyDecision({ web_proxy: false }, "webdav", false).needsProxy,
    false,
  )
  // 3) 普通驱动默认直链
  assert.equal(resolveProxyDecision({}, "onedrive", false).needsProxy, false)
  // 4) /p 前缀始终代理（对齐 Go 的 /p 路由）
  assert.equal(
    resolveProxyDecision({ web_proxy: false }, "onedrive", true).source,
    "proxy_path",
  )
  // 5) 存储级 webdav_policy 生效
  assert.equal(
    resolveProxyDecision({ webdav_policy: "use_proxy_url" }, "onedrive", false)
      .mode,
    "use_proxy_url",
  )
})
