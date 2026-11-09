import test from "node:test"
import assert from "node:assert/strict"
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto"
import CryptoJS from "crypto-js"
import { Yun139Addition } from "./types"
import { Yun139ApiClient } from "./util"
import {
  aesCbcDecrypt,
  aesCbcEncrypt,
  aesEcbDecrypt,
  aesEcbEncrypt,
  loginWithCredentials,
  rsaEncryptPKCS1v15,
  sortedJsonStringify,
  Yun139SmsRequiredError,
} from "./login"

const KEY_HEX_1 = "73634235495062495331515373756c734e7253306c673d3d"
const KEY_HEX_2 = "7150714477323633586746674c337538"
const MAIL_PASSWORD_URL = "https://mail.10086.cn/Login/Login.ashx"
const SSO_LOGIN_URL = "https://user-njs.yun.139.com/user/thirdlogin"
const ROUTE_POLICY_URL =
  "https://user-njs.yun.139.com/user/route/qryRoutePolicy"

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function encryptCbcBase64(plaintext: string, keyHex: string): string {
  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(plaintext),
    CryptoJS.enc.Hex.parse(keyHex),
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return CryptoJS.enc.Base64.stringify(iv.clone().concat(encrypted.ciphertext))
}

function encryptedStep3Response(payload: any): string {
  const finalJson = JSON.stringify(payload)
  const inner = bytesToHex(aesEcbEncrypt(finalJson, KEY_HEX_2))
  return encryptCbcBase64(JSON.stringify({ data: inner }), KEY_HEX_1)
}

function routePolicyResponse(): Response {
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

test("Yun139 sorted JSON matches Go sortedJsonStringify", () => {
  assert.equal(
    sortedJsonStringify({
      z: true,
      a: { d: "x", c: [2, 1], e: null },
      n: 3,
    }),
    '{"a":{"c":[2,1],"d":"x","e":null},"n":3,"z":true}',
  )
})

test("Yun139 AES CBC/ECB roundtrip", () => {
  const { iv, ciphertext } = aesCbcEncrypt("hello 139", KEY_HEX_1)
  assert.equal(aesCbcDecrypt(ciphertext, KEY_HEX_1, iv), "hello 139")
  const ecb = aesEcbEncrypt("outer", KEY_HEX_2)
  assert.equal(aesEcbDecrypt(ecb, KEY_HEX_2), "outer")
})

test("Yun139 RSA PKCS1 v1.5 encryption decrypts with the matching private key", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 1024,
  })
  const der = publicKey.export({ type: "spki", format: "der" }) as Buffer
  const ciphertext = rsaEncryptPKCS1v15(
    Buffer.from("13800138000"),
    der.toString("base64"),
  )
  const decrypted = privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(ciphertext),
  )
  assert.equal(decrypted.toString("utf8"), "13800138000")
})

test("Yun139 password login obtains account, user_domain_id and authorization", async () => {
  const addition: Yun139Addition = {
    authorization: "",
    username: "13800138000",
    password: "secret",
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    if (url === MAIL_PASSWORD_URL) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "https://mail.10086.cn/default.html?sid=test-sid",
          "Set-Cookie": "RMKEY=test-rmkey; Path=/; HttpOnly",
        },
      })
    }
    if (url.startsWith("https://smsrebuild1.mail.10086.cn/setting/s?")) {
      return new Response(
        JSON.stringify({ var: { artifact: "test-artifact" } }),
        {
          status: 200,
        },
      )
    }
    if (url === SSO_LOGIN_URL) {
      return new Response(
        encryptedStep3Response({
          authToken: "test-token",
          account: "13800138000",
          userDomainId: "domain-123",
        }),
        { status: 200 },
      )
    }
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const result = await loginWithCredentials(addition)
    assert.equal(result.account, "13800138000")
    assert.equal(result.userDomainId, "domain-123")
    assert.equal(
      result.authorization,
      Buffer.from("pc:13800138000:test-token").toString("base64"),
    )
    assert.ok(result.mailCookies.includes("RMKEY=test-rmkey"))
    assert.equal(calls.length, 3)
    assert.equal(calls[0], MAIL_PASSWORD_URL)
    assert.ok(calls[1].startsWith("https://smsrebuild1.mail.10086.cn/"))
    assert.equal(calls[2], SSO_LOGIN_URL)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 login surfaces SMS verification and preserves refreshed cookies", async () => {
  const addition: Yun139Addition = {
    authorization: "",
    username: "13800138000",
    password: "secret",
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    if (url === MAIL_PASSWORD_URL) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "https://mail.10086.cn/default.html?ec=PML401010062",
        },
      })
    }
    if (url.startsWith("https://mail.10086.cn/s?")) {
      return new Response(JSON.stringify({ code: "S_OK" }), {
        status: 200,
        headers: { "Set-Cookie": "Os_SSo_Sid=test-sid; Path=/" },
      })
    }
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    await assert.rejects(
      () => loginWithCredentials(addition),
      (error: unknown) => {
        assert.ok(error instanceof Yun139SmsRequiredError)
        assert.ok(error.mailCookies.includes("Os_SSo_Sid=test-sid"))
        assert.match(error.message, /fill sms_code/)
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 login verifies the SMS code and continues the password flow", async () => {
  const addition: Yun139Addition = {
    authorization: "",
    username: "13800138000",
    password: "secret",
    sms_code: "123456",
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    if (url === MAIL_PASSWORD_URL) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "https://mail.10086.cn/default.html?ec=MW0016",
        },
      })
    }
    if (url.startsWith("https://mail.10086.cn/s?")) {
      return new Response(
        JSON.stringify({
          code: "S_OK",
          var: {
            loginSuccessUrl: "https://mail.10086.cn/default.html?sid=sms-sid",
          },
        }),
        { status: 200, headers: { "Set-Cookie": "RMKEY=test-rmkey; Path=/" } },
      )
    }
    if (url.startsWith("https://smsrebuild1.mail.10086.cn/setting/s?")) {
      return new Response(
        JSON.stringify({ var: { artifact: "test-artifact" } }),
        { status: 200 },
      )
    }
    if (url === SSO_LOGIN_URL) {
      return new Response(
        encryptedStep3Response({
          authToken: "test-token",
          account: "13800138000",
          userDomainId: "domain-sms",
        }),
        { status: 200 },
      )
    }
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const result = await loginWithCredentials(addition)
    assert.equal(result.userDomainId, "domain-sms")
    assert.equal(calls.length, 4)
    assert.ok(calls[1].includes("inlogin.action"))
    assert.equal(calls[3], SSO_LOGIN_URL)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 fast login with existing mail cookies obtains user_domain_id", async () => {
  const addition: Yun139Addition = {
    authorization: "",
    mail_cookies: "Os_SSo_Sid=test-sid; RMKEY=test-rmkey",
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    if (url.startsWith("https://smsrebuild1.mail.10086.cn/setting/s?")) {
      return new Response(
        JSON.stringify({ var: { artifact: "test-artifact" } }),
        {
          status: 200,
        },
      )
    }
    if (url === SSO_LOGIN_URL) {
      return new Response(
        encryptedStep3Response({
          authToken: "test-token",
          account: "13800138000",
          userDomainId: "domain-fast",
        }),
        { status: 200 },
      )
    }
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const result = await loginWithCredentials(addition)
    assert.equal(result.userDomainId, "domain-fast")
    assert.equal(result.mailCookies, addition.mail_cookies)
    assert.equal(calls.length, 2)
    assert.equal(calls[1], SSO_LOGIN_URL)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 re-logins when the PC refresh fails and credentials are available", async () => {
  const oldToken = `old-token|1|RCS|${Date.now() + 5 * 24 * 60 * 60 * 1000}|opaque`
  const addition: Yun139Addition = {
    authorization: Buffer.from(`pc:13800138000:${oldToken}`).toString("base64"),
    user_domain_id: "old-domain",
    username: "13800138000",
    password: "secret",
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    if (url === "https://user-njs.yun.139.com/user/auth/refreshToken") {
      return new Response("refresh rejected", { status: 500 })
    }
    if (url === MAIL_PASSWORD_URL) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "https://mail.10086.cn/default.html?sid=test-sid",
          "Set-Cookie": "RMKEY=test-rmkey; Path=/",
        },
      })
    }
    if (url.startsWith("https://smsrebuild1.mail.10086.cn/setting/s?")) {
      return new Response(
        JSON.stringify({ var: { artifact: "test-artifact" } }),
        { status: 200 },
      )
    }
    if (url === SSO_LOGIN_URL) {
      return new Response(
        encryptedStep3Response({
          authToken: "test-token",
          account: "13800138000",
          userDomainId: "domain-reborn",
        }),
        { status: 200 },
      )
    }
    if (url === ROUTE_POLICY_URL) return routePolicyResponse()
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const states: Array<{ authorization: string; userDomainId: string }> = []
    const client = new Yun139ApiClient(addition, undefined, async (state) => {
      states.push({
        authorization: state.authorization,
        userDomainId: state.userDomainId,
      })
    })
    await client.init()

    assert.equal(addition.user_domain_id, "domain-reborn")
    assert.equal(
      addition.authorization,
      Buffer.from("pc:13800138000:test-token").toString("base64"),
    )
    assert.equal(states.length, 1)
    assert.equal(states[0].userDomainId, "domain-reborn")
    assert.equal(
      calls[0],
      "https://user-njs.yun.139.com/user/auth/refreshToken",
    )
    assert.equal(calls.filter((url) => url === ROUTE_POLICY_URL).length, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Yun139 keeps a manually configured user_domain_id when Authorization is present", async () => {
  let fetchCalls = 0
  const result = await loginWithCredentials(
    {
      authorization: "existing-authorization",
      user_domain_id: "manual-domain",
      type: "personal_new",
    },
    (async () => {
      fetchCalls++
      return new Response("should not be called", { status: 500 })
    }) as typeof fetch,
  )
  assert.equal(result.authorization, "existing-authorization")
  assert.equal(result.userDomainId, "manual-domain")
  assert.equal(fetchCalls, 0)
})

test("Yun139 rejects empty credentials with a clear error", async () => {
  await assert.rejects(
    () =>
      new Yun139ApiClient({
        authorization: "",
        type: "personal_new",
      }).init(),
    /authorization is empty and credentials are not provided/,
  )
})

test("Yun139 init logs in and persists authorization plus user_domain_id", async () => {
  const addition: Yun139Addition = {
    authorization: "",
    username: "13800138000",
    password: "secret",
    type: "personal_new",
  }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    if (url === MAIL_PASSWORD_URL) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "https://mail.10086.cn/default.html?sid=test-sid",
          "Set-Cookie": "RMKEY=test-rmkey; Path=/",
        },
      })
    }
    if (url.startsWith("https://smsrebuild1.mail.10086.cn/setting/s?")) {
      return new Response(
        JSON.stringify({ var: { artifact: "test-artifact" } }),
        { status: 200 },
      )
    }
    if (url === SSO_LOGIN_URL) {
      return new Response(
        encryptedStep3Response({
          authToken: "test-token",
          account: "13800138000",
          userDomainId: "domain-123",
        }),
        { status: 200 },
      )
    }
    if (url === ROUTE_POLICY_URL) return routePolicyResponse()
    return new Response("unexpected URL", { status: 404 })
  }) as typeof fetch

  try {
    const states: Array<{ authorization: string; userDomainId: string }> = []
    const client = new Yun139ApiClient(addition, undefined, async (state) => {
      states.push({
        authorization: state.authorization,
        userDomainId: state.userDomainId,
      })
    })
    await client.init()

    assert.equal(addition.user_domain_id, "domain-123")
    assert.equal(
      addition.authorization,
      Buffer.from("pc:13800138000:test-token").toString("base64"),
    )
    assert.equal(states.length, 1)
    assert.equal(states[0].userDomainId, "domain-123")
    assert.equal(states[0].authorization, addition.authorization)
    assert.equal(calls.filter((url) => url === ROUTE_POLICY_URL).length, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})
