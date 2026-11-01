import assert from "node:assert/strict"
import test from "node:test"
import { MegaApiClient, generateHashcashToken } from "./util"

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
