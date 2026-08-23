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

    if (url.startsWith(loginUrl)) {
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

  await client.login({ force: true })

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
    if (url.startsWith(loginUrl)) {
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

  await assert.rejects(
    () => client.login({ force: true }),
    /不受信任的登录重定向地址/,
  )
  assert.deepEqual(cookiesSent, ["session=secret"])
})

test("login rejects trusted-host redirects that downgrade to HTTP", async () => {
  const loginUrl =
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action"

  globalThis.fetch = (async (input) => {
    if (requestUrl(input).startsWith(loginUrl)) {
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

  await assert.rejects(() => client.login({ force: true }), /HTTPS/)
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

  await assert.rejects(
    () => client.login({ force: true }),
    /expected test stop/,
  )
  assert.match(encryptConfCookie, /(?:^|; )oauth=refreshed(?:;|$)/)
})

test("login retries a transient redirect without OAuth parameters", async () => {
  const loginUrlPrefix =
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL="
  const validUrl =
    "https://open.e.189.cn/api/logbox/separate/web/index.html?appId=cloud&lt=lt-value&reqId=req-value"
  let loginAttempts = 0

  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    if (url.startsWith(loginUrlPrefix)) {
      loginAttempts++
      if (loginAttempts === 1) {
        return mockResponse(url, "", { status: 200 })
      }
      return mockResponse(url, "", {
        status: 302,
        headers: {
          location: "https://open.e.189.cn/redirect-without-params",
        },
      })
    }
    if (url.endsWith("/redirect-without-params")) {
      return mockResponse(url, "", {
        status: 302,
        headers: { location: validUrl },
      })
    }
    if (url === validUrl) return mockResponse(url, "", { status: 200 })
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const client = new Pan189Client({ username: "", password: "" })
  const resolved = await (client as any).resolveLoginUrl(
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action",
    { "User-Agent": "test" },
  )

  assert.equal(loginAttempts, 2)
  assert.match(resolved, /[?&]lt=lt-value/)
  assert.match(resolved, /[?&]reqId=req-value/)
})

test("login accepts a final Response.url when Worker hides the Location header", async () => {
  const loginUrlPrefix =
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL="
  const finalUrl =
    "https://open.e.189.cn/api/logbox/separate/web/index.html?appId=cloud&lt=lt-worker&reqId=req-worker"

  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    if (url.startsWith(loginUrlPrefix)) {
      return mockResponse(finalUrl, "", { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const client = new Pan189Client({ username: "", password: "" })
  const resolved = await (client as any).resolveLoginUrl(
    "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https%3A%2F%2Fcloud.189.cn%2Fmain.action",
    { "User-Agent": "test" },
  )

  assert.equal(resolved, finalUrl)
})

test("API requests do not wait for refreshed Cookie persistence", async () => {
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

  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "session=old",
  })
  const request = client.getFiles("-11")

  const state = await Promise.race([
    request.then(() => "resolved"),
    new Promise<"pending">((resolve) =>
      setTimeout(() => resolve("pending"), 50),
    ),
  ])
  assert.equal(state, "resolved")
  assert.deepEqual(await request, { files: [], folders: [] })
  assert.equal(client.consumePendingCookie(), "session=next")
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

test("download headers include the current 189Cloud session cookie", () => {
  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "cookieUserSession=session-value",
  })

  assert.equal(
    client.getDownloadHeaders().Cookie,
    "cookieUserSession=session-value",
  )
  assert.equal(client.getDownloadHeaders().Referer, "https://cloud.189.cn/")
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

test("driver initialization does not preflight the root directory", async () => {
  const calls: string[] = []
  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    calls.push(url)
    if (url.includes("/api/portal/loginUrl.action")) {
      return mockResponse("https://cloud.189.cn/web/main", "", { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const driver = new Cloud189Driver({
    username: "",
    password: "",
    cookie: "valid=value",
  })

  await driver.init()
  assert.equal(calls.length, 0)
})

test("valid configured Cookie skips login URL during initialization", async () => {
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    throw new Error("login URL must not be requested")
  }) as typeof fetch

  const client = new Pan189Client({
    username: "13800138000",
    password: "password",
    cookie: "cookieUserSession=valid",
  })

  await client.login()
  assert.equal(calls, 0)
})

test("Cookie updates are exposed once for deferred persistence", async () => {
  globalThis.fetch = (async (input) =>
    mockResponse(
      requestUrl(input),
      { res_code: 0 },
      {
        status: 200,
        headers: { "set-cookie": "cookieUserSession=next; Path=/" },
      },
    )) as typeof fetch

  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "cookieUserSession=old",
  })

  await client.request("https://cloud.189.cn/api/test")
  assert.equal(client.consumePendingCookie(), "cookieUserSession=next")
  assert.equal(client.consumePendingCookie(), null)
})

test("189Cloud chunked upload asks the browser for an MD5 before creating a session", async () => {
  let fetches = 0
  globalThis.fetch = (async () => {
    fetches++
    throw new Error("upload API must not be called without an MD5")
  }) as typeof fetch

  const driver = new Cloud189Driver({ username: "", password: "" })
  const info = await (driver as any).createUploadSession(
    "/",
    "/",
    "large.bin",
    20 * 1024 * 1024,
    "",
  )

  assert.equal(info.requiresMd5, true)
  assert.equal(fetches, 0)
})

test("189Cloud chunked upload creates a portable encrypted session", async () => {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 })
  const pubKey = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64")
  const calls: string[] = []

  globalThis.fetch = (async (input, init) => {
    const url = requestUrl(input)
    calls.push(url)
    if (url.includes("/v2/getUserBriefInfo.action")) {
      return mockResponse(url, { res_code: 0, sessionKey: "session-key" })
    }
    if (url.includes("/api/security/generateRsaKey.action")) {
      return mockResponse(url, {
        res_code: 0,
        pubKey,
        pkId: "pk-id",
        expire: Date.now() + 60_000,
      })
    }
    if (url.startsWith("https://upload.cloud.189.cn/person/initMultiUpload?")) {
      assert.equal(new Headers(init?.headers).get("SessionKey"), "session-key")
      return mockResponse(url, {
        code: "SUCCESS",
        data: { uploadFileId: "upload-id", fileDataExists: 0 },
      })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const driver = new Cloud189Driver({ username: "", password: "" })
  const info = await (driver as any).createUploadSession(
    "/",
    "/",
    "large.bin",
    20 * 1024 * 1024,
    "0123456789abcdef0123456789abcdef",
  )
  assert.equal(info.reuse, false)
  assert.equal(info.partCount, 2)
  assert.equal(info.chunkSize, 10 * 1024 * 1024)
  const session = JSON.parse(
    Buffer.from(info.session, "base64").toString("utf8"),
  )
  assert.equal(session.uploadFileId, "upload-id")
  assert.equal(session.sessionKey, "session-key")
  assert.ok(calls.some((url) => url.includes("/person/initMultiUpload?")))
})

test("189Cloud chunked upload forwards each part and commits its checksums", async () => {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 })
  const pubKey = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64")
  let signedPutHeaders: Headers | undefined
  const calls: string[] = []
  globalThis.fetch = (async (input, init) => {
    const url = requestUrl(input)
    calls.push(url)
    if (url.includes("/v2/getUserBriefInfo.action")) {
      return mockResponse(url, { res_code: 0, sessionKey: "session-key" })
    }
    if (url.includes("/api/security/generateRsaKey.action")) {
      return mockResponse(url, {
        res_code: 0,
        pubKey,
        pkId: "pk-id",
        expire: Date.now() + 60_000,
      })
    }
    if (url.startsWith("https://upload.cloud.189.cn/person/initMultiUpload?")) {
      return mockResponse(url, {
        code: "SUCCESS",
        data: { uploadFileId: "upload-id", fileDataExists: 0 },
      })
    }
    if (
      url.startsWith("https://upload.cloud.189.cn/person/getMultiUploadUrls?")
    ) {
      return mockResponse(url, {
        code: "SUCCESS",
        uploadUrls: {
          partNumber_1: {
            requestURL: "https://cdn.example/upload-part-1",
            requestHeader:
              "Content-Type=application/octet-stream&X-Test=ok%20value",
          },
        },
      })
    }
    if (url === "https://cdn.example/upload-part-1") {
      signedPutHeaders = new Headers(init?.headers)
      return mockResponse(url, "", { status: 200 })
    }
    if (
      url.startsWith(
        "https://upload.cloud.189.cn/person/commitMultiUploadFile?",
      )
    ) {
      assert.equal(new Headers(init?.headers).get("SessionKey"), "session-key")
      return mockResponse(url, { code: "SUCCESS" })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const driver = new Cloud189Driver({ username: "", password: "" })
  const info = await (driver as any).createUploadSession(
    "/",
    "/",
    "small.txt",
    5,
    "5d41402abc4b2a76b9719d911017c592",
  )
  const part = await (driver as any).uploadPart(
    info.session,
    1,
    Buffer.from("hello"),
  )
  assert.equal(part.partMd5, "5d41402abc4b2a76b9719d911017c592")
  assert.equal(signedPutHeaders?.get("X-Test"), "ok value")

  await (driver as any).completeUploadSession(info.session, [part.partMd5])
  assert.ok(
    calls.some((url) =>
      url.startsWith(
        "https://upload.cloud.189.cn/person/commitMultiUploadFile?",
      ),
    ),
  )
})

test("189Cloud retries init without MD5 when the API security check blacklists it", async () => {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 })
  const pubKey = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64")
  const initParams: string[] = []
  let initAttempts = 0

  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    if (url.includes("/v2/getUserBriefInfo.action")) {
      return mockResponse(url, { res_code: 0, sessionKey: "session-key" })
    }
    if (url.includes("/api/security/generateRsaKey.action")) {
      return mockResponse(url, {
        res_code: 0,
        pubKey,
        pkId: "pk-id",
        expire: Date.now() + 60_000,
      })
    }
    if (url.startsWith("https://upload.cloud.189.cn/person/initMultiUpload?")) {
      initAttempts++
      initParams.push(new URL(url).searchParams.get("params") || "")
      if (initAttempts === 1) {
        return mockResponse(
          url,
          {
            code: "InfoSecurityErrorCode",
            msg: "file md5 is in black list,security check not pass",
          },
          { status: 403 },
        )
      }
      return mockResponse(url, {
        code: "SUCCESS",
        data: { uploadFileId: "upload-id", fileDataExists: 0 },
      })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const client = new Pan189Client({ username: "", password: "" })
  const result = await client.createMultiUpload(
    "-11",
    "blocked.apk",
    10,
    "0123456789abcdef0123456789abcdef",
  )

  assert.equal(result.uploadFileId, "upload-id")
  assert.equal(initAttempts, 2)
  assert.match(initParams[0], /^[0-9a-f]+$/)
  assert.match(initParams[1], /^[0-9a-f]+$/)
})
