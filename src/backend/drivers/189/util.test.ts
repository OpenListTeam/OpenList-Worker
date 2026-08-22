import assert from "node:assert/strict"
import { generateKeyPairSync } from "node:crypto"
import { afterEach, test } from "node:test"

import { Cloud189Driver } from "./driver"
import { Pan189Client } from "./util"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
}

function mockResponse(
  url: string,
  body: unknown,
  init: ResponseInit = {},
): Response {
  const response = new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    init,
  )
  Object.defineProperty(response, "url", { value: url })
  return response
}

test("login preserves cookies from intermediate redirects", async () => {
  const loginUrl =
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action"
  const authUrl =
    "https://open.e.189.cn/api/logbox/oauth2/separate/auth/unifyAccountLogin.do?appId=cloud"
  const mainUrl = "https://cloud.189.cn/web/main"
  const cookiesSent: string[] = []

  globalThis.fetch = (async (input, init) => {
    const url = requestUrl(input)
    cookiesSent.push(new Headers(init?.headers).get("cookie") || "")

    if (url === loginUrl) {
      return mockResponse(url, "", {
        status: 302,
        headers: { location: authUrl },
      })
    }
    if (url === authUrl) {
      return mockResponse(url, "", {
        status: 302,
        headers: {
          location: mainUrl,
          "set-cookie": "LT=token; Path=/, GUID=device; Path=/",
        },
      })
    }
    if (url === mainUrl) {
      return mockResponse(url, "", { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "existing=value",
  })

  await client.login()

  assert.equal(cookiesSent.length, 3)
  assert.match(cookiesSent[2], /(?:^|; )LT=token(?:;|$)/)
  assert.match(cookiesSent[2], /(?:^|; )GUID=device(?:;|$)/)
  assert.match(client.getCookie(), /(?:^|; )LT=token(?:;|$)/)
  assert.match(client.getCookie(), /(?:^|; )GUID=device(?:;|$)/)
})

test("login rejects redirects to untrusted hosts before sending cookies", async () => {
  const loginUrl =
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action"
  const cookiesSent: string[] = []

  globalThis.fetch = (async (input, init) => {
    const url = requestUrl(input)
    cookiesSent.push(new Headers(init?.headers).get("cookie") || "")
    if (url === loginUrl) {
      return mockResponse(url, "", {
        status: 302,
        headers: { location: "https://attacker.example/collect" },
      })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "session=secret",
  })

  await assert.rejects(() => client.login(), /不受信任的登录重定向地址/)
  assert.deepEqual(cookiesSent, ["session=secret"])
})

test("login rejects trusted-host redirects that downgrade to HTTP", async () => {
  const loginUrl =
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action"

  globalThis.fetch = (async (input) => {
    if (requestUrl(input) === loginUrl) {
      return mockResponse(loginUrl, "", {
        status: 302,
        headers: { location: "http://cloud.189.cn/web/main" },
      })
    }
    throw new Error(`unexpected fetch: ${requestUrl(input)}`)
  }) as typeof fetch

  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "session=secret",
  })

  await assert.rejects(() => client.login(), /HTTPS/)
})

test("OAuth requests use cookies refreshed by the previous response", async () => {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 })
  const pubKey = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64")
  const loginUrlPrefix = "https://cloud.189.cn/api/portal/loginUrl.action"
  const loginUrl =
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action"
  const authUrl =
    "https://open.e.189.cn/login?lt=lt-value&reqId=req-value&appId=cloud"
  let encryptConfCookie = ""

  globalThis.fetch = (async (input, init) => {
    const url = requestUrl(input)
    const requestCookie = new Headers(init?.headers).get("cookie") || ""
    if (url.startsWith(loginUrlPrefix)) {
      return mockResponse(url, "", {
        status: 302,
        headers: { location: authUrl },
      })
    }
    if (url === authUrl) {
      // Some Worker runtimes expose the original URL on the final Response.
      return mockResponse(loginUrl, "", { status: 200 })
    }
    if (url.endsWith("/oauth2/appConf.do")) {
      return mockResponse(
        url,
        {
          result: "0",
          msg: "",
          data: {
            accountType: "01",
            appKey: "cloud",
            clientType: 10010,
            isOauth2: false,
            mailSuffix: "@189.cn",
            paramId: "param",
            returnUrl: "https://cloud.189.cn/main.action",
          },
        },
        { status: 200, headers: { "set-cookie": "oauth=refreshed; Path=/" } },
      )
    }
    if (url.endsWith("/config/encryptConf.do")) {
      encryptConfCookie = requestCookie
      return mockResponse(
        url,
        { result: 0, data: { pre: "", pubKey } },
        { status: 200 },
      )
    }
    if (url.endsWith("/oauth2/loginSubmit.do")) {
      return mockResponse(
        url,
        { result: 1, msg: "expected test stop" },
        { status: 200 },
      )
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const client = new Pan189Client({
    username: "13800138000",
    password: "password",
    cookie: "session=initial",
  })

  await assert.rejects(() => client.login(), /expected test stop/)
  assert.match(encryptConfCookie, /(?:^|; )oauth=refreshed(?:;|$)/)
})

test("API requests wait for refreshed cookies to be persisted", async () => {
  let releasePersistence!: () => void
  const persistenceGate = new Promise<void>((resolve) => {
    releasePersistence = resolve
  })

  globalThis.fetch = (async (input) =>
    mockResponse(
      requestUrl(input),
      {
        res_code: 0,
        res_message: "",
        fileListAO: { count: 0, fileList: [], folderList: [] },
      },
      { status: 200, headers: { "set-cookie": "session=next; Path=/" } },
    )) as typeof fetch

  const client = new Pan189Client(
    { username: "", password: "", cookie: "session=old" },
    async () => persistenceGate,
  )
  const request = client.getFiles("-11")

  const state = await Promise.race([
    request.then(() => "resolved"),
    new Promise<"pending">((resolve) =>
      setTimeout(() => resolve("pending"), 0),
    ),
  ])
  assert.equal(state, "pending")

  releasePersistence()
  assert.deepEqual(await request, { files: [], folders: [] })
})

test("persistent InvalidSessionKey is reported instead of an empty directory", async () => {
  const loginUrlPrefix = "https://cloud.189.cn/api/portal/loginUrl.action"

  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    if (url.startsWith(loginUrlPrefix)) {
      return mockResponse("https://cloud.189.cn/web/main", "", { status: 200 })
    }
    return mockResponse(
      url,
      {
        errorCode: "InvalidSessionKey",
        errorMsg: "cookieUserSession is null or invalid",
        success: null,
      },
      { status: 400, headers: { "content-type": "application/json" } },
    )
  }) as typeof fetch

  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "expired=value",
  })

  await assert.rejects(
    () => client.getFiles("-11"),
    /cookieUserSession is null or invalid/,
  )
})

test("a successful response without fileListAO is not treated as empty", async () => {
  globalThis.fetch = (async (input) =>
    mockResponse(
      requestUrl(input),
      { res_code: 0, res_message: "" },
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch

  const client = new Pan189Client({ username: "", password: "" })

  await assert.rejects(() => client.getFiles("-11"), /fileListAO/)
})

test("malformed fileListAO is rejected instead of becoming an empty directory", async () => {
  globalThis.fetch = (async (input) =>
    mockResponse(
      requestUrl(input),
      { res_code: 0, res_message: "", fileListAO: { count: 1 } },
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch

  const client = new Pan189Client({ username: "", password: "" })

  await assert.rejects(() => client.getFiles("-11"), /fileListAO.*数组/)
})

test("large 189Cloud file and folder ids are preserved exactly", async () => {
  const folderId = "925521251969871401"
  const fileId = "925521251969871402"

  const body = `{"res_code":0,"res_message":"","fileListAO":{"count":2,"fileList":[{"id":${fileId},"name":"测试.txt","size":15,"lastOpTime":"2026-08-23 10:14:24"}],"folderList":[{"id":${folderId},"name":"Openlist","lastOpTime":"2026-08-23 10:15:00"}]}}`
  globalThis.fetch = (async (input) =>
    mockResponse(requestUrl(input), body, {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch

  const client = new Pan189Client({ username: "", password: "" })
  const result = await client.getFiles("-11")

  assert.equal(result.files[0].id, fileId)
  assert.equal(result.folders[0].id, folderId)
})

test("null file counts are rejected instead of becoming zero", async () => {
  globalThis.fetch = (async (input) =>
    mockResponse(
      requestUrl(input),
      {
        res_code: 0,
        res_message: "",
        fileListAO: { count: null, fileList: [], folderList: [] },
      },
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch

  const client = new Pan189Client({ username: "", password: "" })

  await assert.rejects(() => client.getFiles("-11"), /fileListAO.*数组/)
})

test("driver initialization verifies that the root directory is readable", async () => {
  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    if (url.includes("/api/portal/loginUrl.action")) {
      return mockResponse("https://cloud.189.cn/web/main", "", { status: 200 })
    }
    return mockResponse(
      url,
      {
        errorCode: "AccessDenied",
        errorMsg: "root directory is not readable",
        success: null,
      },
      { status: 403, headers: { "content-type": "application/json" } },
    )
  }) as typeof fetch

  const driver = new Cloud189Driver({
    username: "",
    password: "",
    cookie: "invalid=value",
  })

  await assert.rejects(() => driver.init(), /root directory is not readable/)
})
