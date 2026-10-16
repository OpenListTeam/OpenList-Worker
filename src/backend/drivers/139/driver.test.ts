import test from "node:test"
import assert from "node:assert/strict"
import { Yun139Driver } from "./driver"
import { Yun139Addition } from "./types"
import { calSign, Yun139ApiClient } from "./util"

test("Yun139 calculation and signing", () => {
  const sign = calSign("{}", "2026-08-24 16:00:00", "1234567890abcdef")
  assert.ok(sign)
  assert.equal(typeof sign, "string")
  assert.equal(sign.length, 32)
})

test("Yun139Driver instantiation and methods", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|1780000000000",
    ).toString("base64"),
    type: "personal_new",
  }

  const driver = new Yun139Driver(addition)
  assert.ok(driver)

  // Mock listFiles
  ;(driver as any).client.listFiles = async (catalogId: string) => {
    return {
      folders: [
        {
          catalogID: "cat_101",
          catalogName: "photos",
          updateTime: "2026-08-24T12:00:00Z",
        },
      ],
      files: [
        {
          contentID: "cnt_201",
          contentName: "photo.jpg",
          contentSize: 500000,
          updateTime: "2026-08-24T12:00:00Z",
        },
      ],
    }
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "photos")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "photo.jpg")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 500000)

  // Mock getDownloadUrl
  ;(driver as any).client.getDownloadUrl = async (contentId: string) =>
    "https://download.yun.139.com/photo.jpg"

  const link = await driver.link("/photo.jpg", "/photo.jpg")
  assert.equal(link.url, "https://download.yun.139.com/photo.jpg")
})

test("Yun139 refreshes a near-expiry token with no Cookie header", async () => {
  const expiresAt = Date.now() + 5 * 24 * 60 * 60 * 1000
  const oldToken = `old-token|1|RCS|${expiresAt}|opaque`
  const newToken = `new-token|1|RCS|${Date.now() + 30 * 24 * 60 * 60 * 1000}|opaque`
  const account = "13800138000"
  const addition: Yun139Addition = {
    authorization: Buffer.from(`pc:${account}:${oldToken}`).toString("base64"),
    user_domain_id: "test-user-domain",
    type: "personal_new",
  }
  // Simulate a legacy config containing PC cookies; the refresh request must ignore them.
  ;(addition as any).pc_cloud_cookies =
    "mc_at=must-not-send; mc_bt=must-not-send"

  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; init?: RequestInit }> = []
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input)
    calls.push({ url, init })

    if (url === "https://user-njs.yun.139.com/user/auth/refreshToken") {
      return new Response(
        JSON.stringify({
          success: true,
          code: "0000",
          message: "请求成功",
          data: { token: newToken, expireTime: 2592000 },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      )
    }

    if (url === "https://user-njs.yun.139.com/user/route/qryRoutePolicy") {
      // personal_new 的 init() 现在对"拿不到路由 personal host"硬失败
      // （issue #112 根因修复），mock 必须下发一个非默认域的 host。
      return new Response(
        JSON.stringify({
          success: true,
          code: "0000",
          data: {
            routePolicyList: [
              {
                modName: "personal",
                httpsUrl: "https://personal-kd-njs.yun.139.com/hcy",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const refreshedAuthorizations: string[] = []
    const client = new Yun139ApiClient(addition, async (authorization) => {
      refreshedAuthorizations.push(authorization)
    })
    await client.init()

    assert.equal(
      calls[0]?.url,
      "https://user-njs.yun.139.com/user/auth/refreshToken",
    )
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      userDomainId: "test-user-domain",
    })

    const sentHeaders = calls[0]?.init?.headers as Record<string, string>
    assert.equal(
      sentHeaders.authorization,
      `Basic ${Buffer.from(`pc:${account}:${oldToken}`).toString("base64")}`,
    )
    assert.equal(
      Object.keys(sentHeaders).some((key) => key.toLowerCase() === "cookie"),
      false,
    )
    assert.equal(calls[0]?.init?.credentials, "omit")
    assert.equal(sentHeaders.app_cp, "1")
    assert.equal(sentHeaders["x-yun-api-version"], "v1")
    assert.equal(sentHeaders["x-yun-app-channel"], "10200153")
    assert.equal(sentHeaders["x-yun-market-source"], "1")
    assert.equal(sentHeaders["x-yun-module-type"], "1")
    assert.equal(sentHeaders["x-yun-client-info"], "PC")
    assert.equal(
      Object.keys(sentHeaders).some((key) => key.toLowerCase() === "x-yun-uni"),
      false,
    )
    assert.equal(
      Object.keys(sentHeaders).some(
        (key) => key.toLowerCase() === "x-deviceinfo",
      ),
      false,
    )

    assert.equal(
      Buffer.from(addition.authorization, "base64").toString("utf8"),
      `pc:${account}:${newToken}`,
    )
    assert.deepEqual(refreshedAuthorizations, [addition.authorization])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139Driver lists subdir contents; file path must not degrade to parent (issue #112)", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|99999999999999",
    ).toString("base64"),
    type: "personal_new",
  }
  const driver = new Yun139Driver(addition)
  const table: Record<string, { folders: any[]; files: any[] }> = {
    "/": {
      folders: [{ catalogID: "d_soft", catalogName: "手机软件" }],
      files: [
        { contentID: "f_root", contentName: "root.txt", contentSize: 10 },
      ],
    },
    d_soft: {
      folders: [],
      files: [
        { contentID: "f_apk", contentName: "阅读.apk", contentSize: 20485008 },
      ],
    },
  }
  ;(driver as any).client.listFiles = async (catalogId: string) =>
    table[catalogId] || { folders: [], files: [] }

  // 根目录正常列出
  const rootItems = await driver.list("/", "/")
  assert.deepEqual(
    rootItems.map((i) => i.name),
    ["手机软件", "root.txt"],
  )

  // 症状1：访问子目录必须返回子目录内容，而不是根目录内容
  const subItems = await driver.list("/手机软件", "/手机软件")
  assert.deepEqual(
    subItems.map((i) => i.name),
    ["阅读.apk"],
  )

  // 症状2（套娃）：文件路径不能被当作目录列出父级内容
  await assert.rejects(
    () => driver.list("/手机软件/阅读.apk", "/手机软件/阅读.apk"),
    /folder not found/,
  )

  // 不存在的目录必须显式报错，而不是静默回退到根目录
  await assert.rejects(
    () => driver.list("/不存在的目录", "/不存在的目录"),
    /folder not found/,
  )
})

test("Yun139Driver name matching tolerates Unicode normalization differences", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|99999999999999",
    ).toString("base64"),
    type: "personal_new",
  }
  const driver = new Yun139Driver(addition)
  const nfdName = "café" // NFD：e + 组合重音
  const nfcPath = "/café" // NFC：预组合 é
  const table: Record<string, { folders: any[]; files: any[] }> = {
    "/": {
      folders: [{ catalogID: "d_cafe", catalogName: nfdName }],
      files: [],
    },
    d_cafe: {
      folders: [],
      files: [{ contentID: "f", contentName: "inside.txt", contentSize: 1 }],
    },
  }
  ;(driver as any).client.listFiles = async (catalogId: string) =>
    table[catalogId] || { folders: [], files: [] }

  const items = await driver.list(nfcPath, nfcPath)
  assert.deepEqual(
    items.map((i) => i.name),
    ["inside.txt"],
  )
})

test("Yun139 personal_new list follows data.nextPageCursor pagination", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|99999999999999",
    ).toString("base64"),
    type: "personal_new",
  }

  const originalFetch = globalThis.fetch
  const bodies: any[] = []
  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const body = JSON.parse(String(init?.body))
    bodies.push(body)
    const cursor = String(body.pageInfo?.pageCursor || "")
    const page =
      cursor === ""
        ? [
            { fileId: "f1", name: "a.txt", type: "file", size: 1 },
            { fileId: "d1", name: "子目录", type: "folder" },
          ]
        : [{ fileId: "f2", name: "b.txt", type: "file", size: 2 }]
    const next = cursor === "" ? "CUR1" : ""
    return new Response(
      JSON.stringify({
        success: true,
        code: "0000",
        data: { items: page, nextPageCursor: next },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )
  }) as typeof fetch

  try {
    const client = new Yun139ApiClient(addition)
    // 本用例绕过 init：personal_new 禁止使用默认域，显式给定路由 host
    client.personalHost = "https://personal-kd-njs.yun.139.com/hcy"
    const res = await client.listFiles("/")
    assert.equal(bodies.length, 2)
    assert.equal(bodies[0].pageInfo.pageCursor, "")
    assert.equal(bodies[1].pageInfo.pageCursor, "CUR1")
    assert.deepEqual(
      res.files.map((f) => f.contentName),
      ["a.txt", "b.txt"],
    )
    assert.deepEqual(
      res.folders.map((f) => f.catalogName),
      ["子目录"],
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 folder id falls back to catalogId/catalogID; missing id fails loudly (issue #112)", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|99999999999999",
    ).toString("base64"),
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  let mode: "union" | "noid" = "union"
  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const body = JSON.parse(String(init?.body))
    const parent = String(body.parentFileId || "")
    let items: any[] = []
    if (mode === "union") {
      // 目录项没有 fileId，只带 catalogId（小写 d）——社区实现
      // gaozhangmin/boxplayer 的字段并集回退要覆盖的目标形态
      items =
        parent === "/"
          ? [
              {
                catalogId: "d_soft",
                name: "手机软件",
                type: "folder",
                updatedAt: "2026-10-04T19:47:40.056+08:00",
              },
            ]
          : parent === "d_soft"
            ? [
                {
                  fileId: "f_apk",
                  name: "阅读.apk",
                  type: "file",
                  size: 20485008,
                },
              ]
            : []
    } else {
      // 目录项完全没有 id 字段：必须显式报错而不是静默列出根目录
      items =
        parent === "/"
          ? [
              {
                name: "手机软件",
                type: "folder",
                updatedAt: "2026-10-04T19:47:40.056+08:00",
              },
            ]
          : []
    }
    return new Response(
      JSON.stringify({ success: true, code: "0000", data: { items } }),
      { status: 200, headers: { "content-type": "application/json" } },
    )
  }) as typeof fetch

  try {
    const driver = new Yun139Driver(addition)
    ;(driver as any).client.personalHost =
      "https://personal-kd-njs.yun.139.com/hcy"

    // 并集回退后能用 catalogId 解析子目录并列出真实内容
    const sub = await driver.list("/手机软件", "/手机软件")
    assert.deepEqual(
      sub.map((i) => i.name),
      ["阅读.apk"],
    )

    // 任何 id 都拿不到时抛出明确错误，而不是 parentFileId="/" 静默列根目录
    mode = "noid"
    await assert.rejects(
      () => driver.list("/手机软件", "/手机软件"),
      /has no catalog id/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 init fails loudly when personal route is unavailable (issue #112)", async () => {
  const authorization = Buffer.from(
    "Basic:13800138000:token123|1|1|99999999999999",
  ).toString("base64")
  const originalFetch = globalThis.fetch
  let routeMode: "error" | "empty" | "ok" = "error"
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    if (url.includes("qryRoutePolicy")) {
      if (routeMode === "error") {
        return new Response("boom", { status: 500 })
      }
      if (routeMode === "empty") {
        return new Response(
          JSON.stringify({
            success: true,
            code: "0000",
            data: { routePolicyList: [] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response(
        JSON.stringify({
          success: true,
          code: "0000",
          data: {
            routePolicyList: [
              {
                modName: "personal",
                httpsUrl: "https://personal-kd-njs.yun.139.com/hcy",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    // personal_new + 路由查询失败 → 显式初始化失败（携带原始错误）
    const d1 = new Yun139Driver({ authorization, type: "personal_new" })
    await assert.rejects(
      () => d1.init(),
      /failed to resolve personal cloud host.*boom/,
    )

    // personal_new + 路由返回空 personal → 同样失败，禁止回退默认域
    routeMode = "empty"
    const d2 = new Yun139Driver({ authorization, type: "personal_new" })
    await assert.rejects(
      () => d2.init(),
      /failed to resolve personal cloud host/,
    )

    // 旧版个人云走 /orchestration 硬编码路径，不依赖路由 → 仅告警不失败
    routeMode = "error"
    const d3 = new Yun139Driver({ authorization, type: "personal" })
    await d3.init()

    // 路由正常 → 初始化成功且 host 生效
    routeMode = "ok"
    const d4 = new Yun139Driver({ authorization, type: "personal_new" })
    await d4.init()
    assert.equal(
      (d4 as any).client.personalHost,
      "https://personal-kd-njs.yun.139.com/hcy",
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 request URL candidates and route-not-found retry semantics", async () => {
  const authorization = Buffer.from(
    "Basic:13800138000:token123|1|1|99999999999999",
  ).toString("base64")
  const originalFetch = globalThis.fetch

  try {
    const client = new Yun139ApiClient({ authorization, type: "personal_new" })

    // personal_new 禁止使用默认域（legacy /file/list 会忽略 parentFileId）
    assert.throws(
      () => (client as any).buildRequestUrls("/file/list"),
      /routed personal host unavailable/,
    )

    // /hcy host：顺序 = 现网已工作的直拼形态 → /hcy+/orchestration →
    // 去掉 /hcy 的 orchestration 形态 → 去掉 /hcy 的直拼形态
    client.personalHost = "https://personal-kd-njs.yun.139.com/hcy"
    assert.deepEqual((client as any).buildRequestUrls("/file/list"), [
      "https://personal-kd-njs.yun.139.com/hcy/file/list",
      "https://personal-kd-njs.yun.139.com/hcy/orchestration/file/list",
      "https://personal-kd-njs.yun.139.com/orchestration/file/list",
      "https://personal-kd-njs.yun.139.com/file/list",
    ])

    // 裸 host：先补 /orchestration 前缀（社区实现规则），再尝试直拼
    client.personalHost = "https://example.com"
    assert.deepEqual((client as any).buildRequestUrls("/file/list"), [
      "https://example.com/orchestration/file/list",
      "https://example.com/file/list",
    ])

    // 已带 /orchestration：单候选，不重复拼接
    client.personalHost = "https://x.example.com/orchestration"
    assert.deepEqual((client as any).buildRequestUrls("/file/list"), [
      "https://x.example.com/orchestration/file/list",
    ])

    // 404 / route not found → 回退第二候选；其余错误原样抛出且不重试
    client.personalHost = "https://personal-kd-njs.yun.139.com/hcy"
    const urls: string[] = []
    let primaryStatus = 404
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input)
      urls.push(url)
      if (url.includes("/hcy/file/list")) {
        if (primaryStatus === 404) {
          return new Response(JSON.stringify({ message: "route not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          })
        }
        return new Response("internal error", { status: 500 })
      }
      return new Response(
        JSON.stringify({ success: true, code: "0000", data: { items: [] } }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }) as typeof fetch

    await client.request("/file/list", { parentFileId: "/" })
    assert.deepEqual(urls, [
      "https://personal-kd-njs.yun.139.com/hcy/file/list",
      "https://personal-kd-njs.yun.139.com/hcy/orchestration/file/list",
    ])

    // 非路由类错误（500）不触发回退，错误信息带上请求 URL
    urls.length = 0
    primaryStatus = 500
    await assert.rejects(
      () => client.request("/file/list", { parentFileId: "/" }),
      /139 Cloud API error \(500\) \[https:\/\/personal-kd-njs\.yun\.139\.com\/hcy\/file\/list\]/,
    )
    assert.equal(urls.length, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 retries the next candidate URL when the server ignores parentFileId (#112)", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|99999999999999",
    ).toString("base64"),
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  const rootItems = [
    {
      fileId: "d_backup",
      name: "手机备份",
      type: "folder",
      updatedAt: "2026-10-15T00:00:00.000+08:00",
    },
  ]
  const childItems = [
    { fileId: "f_1", name: "photo.jpg", type: "file", size: 10 },
  ]

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input)
    calls.push(url)
    const body = JSON.parse(String(init?.body))
    const parent = String(body.parentFileId || "")
    // 只有 host 直拼形态（/hcy/file/list）会忽略 parentFileId 恒返回根内容
    const ignoresParent = url.endsWith("/hcy/file/list")
    const items =
      ignoresParent && parent !== "/"
        ? rootItems
        : parent === "/"
          ? rootItems
          : childItems
    return new Response(
      JSON.stringify({ success: true, code: "0000", data: { items } }),
      { status: 200, headers: { "content-type": "application/json" } },
    )
  }) as typeof fetch

  try {
    const driver = new Yun139Driver(addition)
    ;(driver as any).client.personalHost =
      "https://personal-kd-njs.yun.139.com/hcy"

    const items = await driver.list("/手机备份", "/手机备份")
    assert.deepEqual(
      items.map((i) => i.name),
      ["photo.jpg"],
    )
    // 先打了会忽略 parentFileId 的候选，再自动换到下一个候选
    assert.ok(
      calls.some((u) => u.endsWith("/hcy/file/list")),
      calls.join(", "),
    )
    assert.ok(
      calls.some((u) => u.endsWith("/hcy/orchestration/file/list")),
      calls.join(", "),
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 fails loudly with every candidate URL when all of them ignore parentFileId (#112)", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|99999999999999",
    ).toString("base64"),
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const rootItems = [{ fileId: "d_backup", name: "手机备份", type: "folder" }]
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        success: true,
        code: "0000",
        data: { items: rootItems },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch

  try {
    const driver = new Yun139Driver(addition)
    ;(driver as any).client.personalHost =
      "https://personal-kd-njs.yun.139.com/hcy"

    await assert.rejects(
      () => driver.list("/手机备份", "/手机备份"),
      (err: any) => {
        const msg = String(err?.message || err)
        assert.match(msg, /contains the requested folder itself/)
        assert.match(msg, /tried: .*\/hcy\/file\/list/)
        assert.match(msg, /\/hcy\/orchestration\/file\/list/)
        assert.match(msg, /\/orchestration\/file\/list/)
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 keeps using only the first candidate URL when the listing is plausible", async () => {
  const addition: Yun139Addition = {
    authorization: Buffer.from(
      "Basic:13800138000:token123|1|1|99999999999999",
    ).toString("base64"),
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input)
    calls.push(url)
    const body = JSON.parse(String(init?.body))
    const parent = String(body.parentFileId || "")
    const items =
      parent === "/"
        ? [{ fileId: "d_backup", name: "手机备份", type: "folder" }]
        : [{ fileId: "f_1", name: "photo.jpg", type: "file", size: 10 }]
    return new Response(
      JSON.stringify({ success: true, code: "0000", data: { items } }),
      { status: 200, headers: { "content-type": "application/json" } },
    )
  }) as typeof fetch

  try {
    const driver = new Yun139Driver(addition)
    ;(driver as any).client.personalHost =
      "https://personal-kd-njs.yun.139.com/hcy"

    const items = await driver.list("/手机备份", "/手机备份")
    assert.deepEqual(
      items.map((i) => i.name),
      ["photo.jpg"],
    )
    // 健康账号不应产生额外候选请求（避免回归成"每次都打好几个 URL"）
    assert.deepEqual(calls, [
      "https://personal-kd-njs.yun.139.com/hcy/file/list",
      "https://personal-kd-njs.yun.139.com/hcy/file/list",
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})
