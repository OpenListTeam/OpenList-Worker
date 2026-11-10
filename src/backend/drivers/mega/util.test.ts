import assert from "node:assert/strict"
import crypto from "node:crypto"
import test from "node:test"
import {
  aesCbcEncrypt,
  aesEcbEncrypt,
  bytesToB64Url,
  encodeMpi,
  nodeCipherKey,
  prepareKey,
  stringhash,
} from "./crypto"
import { MegaApiClient, generateHashcashToken } from "./util"
import type { MegaAddition } from "./types"

const TOKEN = "A".repeat(64) // 48 zero bytes encoded as unpadded base64url

function digestWord(word: number): ArrayBuffer {
  const bytes = new Uint8Array(32)
  bytes[0] = (word >>> 24) & 0xff
  bytes[1] = (word >>> 16) & 0xff
  bytes[2] = (word >>> 8) & 0xff
  bytes[3] = word & 0xff
  return bytes.buffer
}

test("MEGA Hashcash matches the challenge format and increments the nonce", async () => {
  const prefixes: number[][] = []
  let calls = 0
  const response = await generateHashcashToken(`1:255:ignored:${TOKEN}`, {
    digest: async (input) => {
      calls++
      prefixes.push(Array.from(input.slice(0, 4)))
      // At easiness=255 the threshold is 0x7f000000. Force one miss then pass.
      return digestWord(calls === 1 ? 0xffffffff : 0)
    },
    maxAttempts: 2,
    maxDurationMs: 1000,
    now: () => 0,
  })

  assert.equal(response, `1:${TOKEN}:AgAAAA`)
  assert.deepEqual(prefixes, [
    [1, 0, 0, 0],
    [2, 0, 0, 0],
  ])
})

test("MEGA Hashcash rejects malformed or unsupported challenges", async () => {
  await assert.rejects(
    () => generateHashcashToken(`2:255:ignored:${TOKEN}`),
    /unsupported Hashcash challenge/,
  )
  await assert.rejects(
    () => generateHashcashToken(`1:256:ignored:${TOKEN}`),
    /unsupported Hashcash challenge/,
  )
  await assert.rejects(
    () => generateHashcashToken(`1:255:ignored:${"A".repeat(63)}`),
    /must decode to 48 bytes/,
  )
})

test("MEGA Hashcash solver stops at its configured work budget", async () => {
  await assert.rejects(
    () =>
      generateHashcashToken(`1:255:ignored:${TOKEN}`, {
        digest: async () => digestWord(0xffffffff),
        maxAttempts: 2,
        maxDurationMs: 1000,
        now: () => 0,
      }),
    /exceeded the serverless work budget/,
  )
})

test("MegaApiClient retries a Hashcash challenge with the official request header", async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; init?: RequestInit }> = []
  let solverCalls = 0
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    async (challenge) => {
      solverCalls++
      assert.equal(challenge, `1:255:ignored:${TOKEN}`)
      return `1:${TOKEN}:AgAAAA`
    },
  )

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(input), init })
    if (calls.length === 1) {
      return new Response("", {
        status: 402,
        headers: { "X-Hashcash": `1:255:ignored:${TOKEN}` },
      })
    }
    return new Response(JSON.stringify([{ sid: "session" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as typeof fetch

  try {
    const body = [{ a: "us", user: "user@example.com", uh: "user-hash" }]
    const result = await client.request(body)
    assert.deepEqual(result, [{ sid: "session" }])
    assert.equal(solverCalls, 1)
    assert.equal(calls.length, 2)
    assert.equal(calls[0].url, calls[1].url)
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), body)
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)), body)
    assert.equal(
      (calls[0].init?.headers as Record<string, string>)?.["X-Hashcash"],
      undefined,
    )
    assert.equal(
      (calls[1].init?.headers as Record<string, string>)?.["X-Hashcash"],
      `1:${TOKEN}:AgAAAA`,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient handles Hashcash challenges on non-login API actions too", async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  let solverCalls = 0
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    async (challenge) => {
      solverCalls++
      assert.equal(challenge, `1:255:ignored:${TOKEN}`)
      return `1:${TOKEN}:AgAAAA`
    },
  )
  globalThis.fetch = (async () => {
    calls++
    return calls === 1
      ? new Response("", {
          status: 402,
          headers: { "X-Hashcash": `1:255:ignored:${TOKEN}` },
        })
      : new Response("[0]", {
          status: 200,
          headers: { "content-type": "application/json" },
        })
  }) as typeof fetch

  try {
    assert.deepEqual(await client.request([{ a: "f" }]), [0])
    assert.equal(calls, 2)
    assert.equal(solverCalls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient keeps ordinary 402 responses without Hashcash as API errors", async () => {
  const originalFetch = globalThis.fetch
  let solverCalls = 0
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    async () => {
      solverCalls++
      return "unexpected"
    },
  )
  globalThis.fetch = (async () =>
    new Response("payment required", { status: 402 })) as typeof fetch

  try {
    await assert.rejects(
      () => client.request([{ a: "f" }]),
      /Mega API HTTP error: 402/,
    )
    assert.equal(solverCalls, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient bounds repeated login Hashcash challenges", async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    async () => `1:${TOKEN}:AgAAAA`,
  )
  globalThis.fetch = (async () => {
    calls++
    return new Response("", {
      status: 402,
      headers: { "X-Hashcash": `1:255:ignored:${TOKEN}` },
    })
  }) as typeof fetch

  try {
    await assert.rejects(
      () => client.request([{ a: "us" }]),
      /repeated the Hashcash challenge after retry/,
    )
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MEGA Hashcash accepts base64url tokens containing - and _", async () => {
  // MEGA 下发的 token 用的是 base64url 变体；解码正则同时放行 +/ 与 -_，
  // 这里锁住 -_ 分支，避免将来只按标准 base64 处理。
  const token = Buffer.from(new Array(48).fill(0xfb)).toString("base64url")
  assert.match(token, /[-_]/)

  const response = await generateHashcashToken(`1:255:ignored:${token}`, {
    digest: async () => digestWord(0),
    maxAttempts: 1,
    maxDurationMs: 1000,
    now: () => 0,
  })
  assert.equal(response, `1:${token}:AQAAAA`)
})

test("MEGA Hashcash default budget scales with the challenge easiness", async () => {
  // 不传 maxAttempts 时应按 2^32/(threshold+1)*4 收敛：
  // easiness=255 → threshold=0x7f000000 → 期望 3 次 → 预算 12 次
  // （成功率 1-(1-1/3)^12 ≈ 98.8%）。固定 4096 次的旧实现会白跑 4084 次。
  let calls = 0
  await assert.rejects(
    () =>
      generateHashcashToken(`1:255:ignored:${TOKEN}`, {
        digest: async () => {
          calls++
          return digestWord(0xffffffff)
        },
        maxDurationMs: 60_000,
        now: () => 0,
      }),
    /exceeded the serverless work budget/,
  )
  assert.equal(calls, 12)
})

test("MegaApiClient streams only the error prefix instead of buffering the body", async () => {
  const originalFetch = globalThis.fetch
  const client = new MegaApiClient({
    email: "user@example.com",
    password: "password",
  })
  let pulled = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled++
      controller.enqueue(new Uint8Array(65_536).fill(0x78))
      if (pulled >= 200) controller.close()
    },
  })
  globalThis.fetch = (async () =>
    new Response(body, { status: 400 })) as typeof fetch

  try {
    await assert.rejects(
      () => client.request([{ a: "f" }]),
      (err: any) => {
        const message = String(err?.message || "")
        assert.match(message, /Mega API HTTP error: 400/)
        assert.ok(
          message.length < 600,
          `error message too long: ${message.length}`,
        )
        return true
      },
    )
    // 512 字节上限只需一两个 64 KiB chunk；res.text() 会拉完整个 ~12 MiB。
    assert.ok(pulled <= 2, `read too many chunks: ${pulled}`)
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function pad16(bytes: Uint8Array): Uint8Array {
  const padded = new Uint8Array(Math.max(16, Math.ceil(bytes.length / 16) * 16))
  padded.set(bytes)
  return padded
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let b = base % modulus
  let e = exponent
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus
    b = (b * b) % modulus
    e >>= 1n
  }
  return result
}

function readDer(
  buffer: Uint8Array,
  offset: number,
): { value: Uint8Array; next: number } {
  let length = buffer[offset + 1]
  let cursor = offset + 2
  if (length & 0x80) {
    const count = length & 0x7f
    length = 0
    for (let i = 0; i < count; i++) length = (length << 8) | buffer[cursor++]
  }
  return {
    value: buffer.subarray(cursor, cursor + length),
    next: cursor + length,
  }
}

/** 用 node:crypto 生成一套与真实响应同构的登录材料（k/privk/csid/sid）。 */
function buildLoginFixture(userKey: Uint8Array) {
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  })
  const der = privateKey.export({ type: "pkcs1", format: "der" })
  const sequence = readDer(der, 0)
  const integers: bigint[] = []
  let cursor = 0
  while (cursor < sequence.value.length) {
    const item = readDer(sequence.value, cursor)
    integers.push(BigInt(`0x${Buffer.from(item.value).toString("hex") || "0"}`))
    cursor = item.next
  }
  const [, n, e, d, p, q] = integers

  const masterKey = crypto.randomBytes(16)
  const sidBytes = crypto.randomBytes(43)
  const cipher = modPow(BigInt(`0x${sidBytes.toString("hex")}`), e, n)
  const privkPlain = Buffer.concat([
    encodeMpi(p),
    encodeMpi(q),
    encodeMpi(d),
    encodeMpi(0n),
  ])

  return {
    masterKey,
    sid: sidBytes.toString("base64url"),
    response: {
      k: bytesToB64Url(aesEcbEncrypt(userKey, masterKey)),
      privk: bytesToB64Url(aesEcbEncrypt(masterKey, pad16(privkPlain))),
      csid: bytesToB64Url(encodeMpi(cipher)),
    },
  }
}

function buildFolderNode(
  masterKey: Uint8Array,
  handle: string,
  parent: string,
  name: string,
) {
  const folderKey = crypto.randomBytes(16)
  const plain = pad16(
    new TextEncoder().encode(`MEGA${JSON.stringify({ n: name })}`),
  )
  const encryptedAttrs = aesCbcEncrypt(
    nodeCipherKey(folderKey),
    new Uint8Array(16),
    plain,
  )
  return {
    folderKey,
    node: {
      h: handle,
      p: parent,
      t: 1,
      ts: 1_700_000_000,
      k: bytesToB64Url(aesEcbEncrypt(masterKey, folderKey)),
      a: bytesToB64Url(encryptedAttrs),
    },
  }
}

test("MegaApiClient logs in with the v1 password key and decrypts nodes", async () => {
  const originalFetch = globalThis.fetch
  const email = "User@Example.com "
  const password = "password123"
  const userKey = prepareKey(password)
  const fixture = buildLoginFixture(userKey)
  const folder = buildFolderNode(fixture.masterKey, "folder", "root", "文档")
  const calls: Array<{ url: string; body: any }> = []

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const body = JSON.parse(String(init?.body))[0]
    calls.push({ url: String(input), body })
    if (body.a === "us0") return jsonResponse([{ v: 1 }])
    if (body.a === "us") return jsonResponse([fixture.response])
    if (body.a === "f") {
      return jsonResponse([
        {
          f: [{ h: "root", p: "root", t: 2, ts: 1 }, folder.node],
        },
      ])
    }
    throw new Error(`unexpected action ${body.a}`)
  }) as typeof fetch

  try {
    const client = new MegaApiClient({ email, password })
    await client.init()

    assert.deepEqual(
      calls.map((call) => call.body.a),
      ["us0", "us", "f"],
    )
    assert.equal(calls[1].body.user, "user@example.com")
    assert.equal(
      calls[1].body.uh,
      bytesToB64Url(stringhash("user@example.com", userKey)),
    )
    assert.equal(calls[1].body.uh, "9QPYw6nl-n2fsLSTCyxrqg")
    assert.match(calls[2].url, new RegExp(`&sid=${fixture.sid}$`))

    assert.equal(client.getRootId(), "root")
    const children = client.getChildren("root")
    assert.equal(children.length, 1)
    assert.equal(children[0].name, "文档")
    assert.equal(children[0].file_key, bytesToB64Url(folder.folderKey))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient supports v2 accounts and forwards the 2FA code", async () => {
  const originalFetch = globalThis.fetch
  const password = "password123"
  const salt = crypto.randomBytes(16)
  const derived = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha512")
  const userKey = new Uint8Array(derived.subarray(0, 16))
  const fixture = buildLoginFixture(userKey)
  const calls: any[] = []

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const body = JSON.parse(String(init?.body))[0]
    calls.push(body)
    if (body.a === "us0") {
      return jsonResponse([{ v: 2, s: salt.toString("base64url") }])
    }
    if (body.a === "us") return jsonResponse([fixture.response])
    if (body.a === "f") return jsonResponse([{ f: [] }])
    throw new Error(`unexpected action ${body.a}`)
  }) as typeof fetch

  try {
    const client = new MegaApiClient({
      email: "user@example.com",
      password,
      two_fa_code: " 123456 ",
    } satisfies MegaAddition)
    await client.init()

    assert.equal(calls[1].uh, bytesToB64Url(derived.subarray(16, 32)))
    assert.equal(calls[1].mfa, "123456")
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient reports MEGA -9 as a credential error", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const body = JSON.parse(String(init?.body))[0]
    if (body.a === "us0") return jsonResponse([{ v: 1 }])
    return jsonResponse([-9])
  }) as typeof fetch

  try {
    const client = new MegaApiClient({
      email: "user@example.com",
      password: "wrong-password",
    })
    await assert.rejects(
      () => client.init(),
      /Mega authentication failed: -9 \(wrong email or password\)/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient retries 503 Server Too Busy with backoff", async () => {
  const originalFetch = globalThis.fetch
  const sleeps: number[] = []
  let calls = 0
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    undefined,
    async (ms) => {
      sleeps.push(ms)
    },
  )
  globalThis.fetch = (async () => {
    calls++
    return calls === 1
      ? new Response("", {
          status: 503,
          statusText: "Server Too Busy",
        })
      : jsonResponse([0])
  }) as typeof fetch

  try {
    assert.deepEqual(await client.request([{ a: "f" }]), [0])
    assert.equal(calls, 2)
    assert.equal(sleeps.length, 1)
    // 400ms 基数 + 最多 250ms 抖动
    assert.ok(sleeps[0] >= 400 && sleeps[0] <= 650, `delay=${sleeps[0]}`)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient bounds transient 5xx retries", async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  let sleeps = 0
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    undefined,
    async () => {
      sleeps++
    },
  )
  globalThis.fetch = (async () => {
    calls++
    return new Response("", { status: 503, statusText: "Server Too Busy" })
  }) as typeof fetch

  try {
    await assert.rejects(
      () => client.request([{ a: "f" }]),
      /Mega API HTTP error: 503 Server Too Busy/,
    )
    assert.equal(calls, 5)
    assert.equal(sleeps, 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient retries MEGA -3/-4 and reports them after the budget", async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    undefined,
    async () => {},
  )

  try {
    globalThis.fetch = (async () => {
      calls++
      return jsonResponse(calls === 1 ? [-3] : [0])
    }) as typeof fetch
    assert.deepEqual(await client.request([{ a: "f" }]), [0])
    assert.equal(calls, 2)

    calls = 0
    globalThis.fetch = (async () => {
      calls++
      return jsonResponse([-4])
    }) as typeof fetch
    await assert.rejects(
      () => client.request([{ a: "f" }]),
      /Mega API error code: -4/,
    )
    assert.equal(calls, 5)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient keeps the solved Hashcash header across a 503 retry", async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<RequestInit | undefined> = []
  const client = new MegaApiClient(
    { email: "user@example.com", password: "password" },
    async () => `1:${TOKEN}:AgAAAA`,
    async () => {},
  )
  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push(init)
    if (calls.length === 1) {
      return new Response("", {
        status: 402,
        headers: { "X-Hashcash": `1:255:ignored:${TOKEN}` },
      })
    }
    if (calls.length === 2) {
      return new Response("", { status: 503 })
    }
    return jsonResponse([0])
  }) as typeof fetch

  try {
    assert.deepEqual(await client.request([{ a: "f" }]), [0])
    assert.equal(calls.length, 3)
    assert.equal(
      (calls[2]?.headers as Record<string, string>)?.["X-Hashcash"],
      `1:${TOKEN}:AgAAAA`,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("MegaApiClient exposes and resumes a persisted session", async () => {
  const originalFetch = globalThis.fetch
  const masterKey = crypto.randomBytes(16)
  const masterKeyB64 = bytesToB64Url(masterKey)
  const client = new MegaApiClient({
    email: "user@example.com",
    password: "password123",
  })

  assert.equal(client.getSession(), null)
  client.restoreSession("sid-1", masterKeyB64)
  assert.deepEqual(client.getSession(), {
    sid: "sid-1",
    masterKey: masterKeyB64,
  })
  assert.throws(
    () => client.restoreSession("sid-1", bytesToB64Url(new Uint8Array(8))),
    /invalid master key/,
  )

  const urls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input))
    return jsonResponse([{ f: [] }])
  }) as typeof fetch

  try {
    await client.fetchNodes()
    assert.match(urls[0], /&sid=sid-1$/)
  } finally {
    globalThis.fetch = originalFetch
  }

  client.clearSession()
  assert.equal(client.getSession(), null)
})
