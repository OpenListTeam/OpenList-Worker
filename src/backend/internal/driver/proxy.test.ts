import assert from "node:assert/strict"
import { test } from "node:test"
import {
  canUseProxyEndpoint,
  driverMustProxy,
  driverMustProxyForStorage,
  driverPreferProxy,
  effectiveWebProxy,
  extensionOf,
  normalizeExtList,
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

// ---------------------------------------------------------------------------
// proxy_types / proxy_ignore_headers / text_types（对齐 Go ShouldProxy & canProxy）
// ---------------------------------------------------------------------------

test("extensionOf / normalizeExtList：与 Go utils.Ext 语义一致", () => {
  assert.equal(extensionOf("/a/b/File.MP4"), "mp4")
  assert.equal(extensionOf("/a/b/README"), "")
  // Go 的 path.Ext(".gitignore") 会给出隐藏文件后缀，text_types 默认值里也有 gitignore
  assert.equal(extensionOf("/a/.gitignore"), "gitignore")
  assert.equal(extensionOf(""), "")

  assert.deepEqual(normalizeExtList("m3u8, .URL ,,md"), ["m3u8", "url", "md"])
  assert.deepEqual(normalizeExtList(["a", "b"]), ["a", "b"])
  assert.deepEqual(normalizeExtList(undefined), [])
})

test("resolveProxyDecision：proxy_types 命中的扩展名由服务端代理（Go ShouldProxy 第三条）", () => {
  const hit = resolveProxyDecision({ driver: "Onedrive" }, "onedrive", false, {
    filename: "/x/live.m3u8",
    proxyTypes: ["m3u8", "url"],
  })
  assert.equal(hit.mode, "native_proxy")
  assert.equal(hit.source, "proxy_types")

  // 未命中的扩展名仍走 302
  const miss = resolveProxyDecision({ driver: "Onedrive" }, "onedrive", false, {
    filename: "/x/movie.mp4",
    proxyTypes: ["m3u8", "url"],
  })
  assert.equal(miss.mode, "302_redirect")
})

test("driverMustProxyForStorage：bunny_storage 按 CDN 配置条件判定", () => {
  const withZoneNoCdn = {
    driver: "BunnyStorage",
    addition: JSON.stringify({
      storage_zone_name: "zone1",
      cdn_base_url: "",
    }),
  }
  const withCdn = {
    driver: "BunnyStorage",
    addition: JSON.stringify({
      storage_zone_name: "zone1",
      cdn_base_url: "https://cdn.example.com",
    }),
  }
  // 对齐 Go：StorageZoneName != "" && CDNBaseURL == "" → OnlyProxy + PreferProxy
  assert.equal(driverMustProxyForStorage(withZoneNoCdn), true)
  assert.equal(driverMustProxyForStorage(withCdn), false)
  // 其它驱动不受 addition 影响
  assert.equal(
    driverMustProxyForStorage({ driver: "Onedrive", addition: "{}" }),
    false,
  )
  // 本地驱动在 Go 里是 OnlyProxy（TS 走本地文件分支，但 /p 判定需要算它允许代理）
  assert.equal(driverMustProxyForStorage({ driver: "local" }), true)
})

test("canUseProxyEndpoint：对齐 Go canProxy（/p 端点准入）", () => {
  const storage = { driver: "Onedrive", addition: "{}" }
  const gate = (over: any = {}) =>
    canUseProxyEndpoint({
      storage,
      driver: "Onedrive",
      filename: "/x/movie.mp4",
      proxyTypes: ["m3u8", "url"],
      textTypes: ["txt", "md", "srt", "lrc"],
      ...over,
    })

  // 未开启代理 + 非文本扩展名 → 不允许（Go 会返回 403 proxy not allowed）
  assert.equal(gate(), false)
  // text_types：前端 Readme / 字幕 / 歌词等文本预览必须能走 /p
  assert.equal(gate({ filename: "/x/readme.md" }), true)
  assert.equal(gate({ filename: "/x/sub.srt" }), true)
  assert.equal(gate({ filename: "/x/lyric.lrc" }), true)
  // proxy_types
  assert.equal(gate({ filename: "/x/live.m3u8" }), true)
  // 存储开启了 web_proxy
  assert.equal(gate({ storage: { driver: "Onedrive", web_proxy: true } }), true)
  // 驱动 MustProxy
  assert.equal(gate({ storage: { driver: "WeiYun" }, driver: "WeiYun" }), true)
  // webdav_policy=use_proxy_url（Go canProxy 显式包含 WebdavProxyURL）
  assert.equal(
    gate({ storage: { driver: "Onedrive", webdav_policy: "use_proxy_url" } }),
    true,
  )
  // 无扩展名（如目录式路径）不允许
  assert.equal(gate({ filename: "/x/noext" }), false)
})
