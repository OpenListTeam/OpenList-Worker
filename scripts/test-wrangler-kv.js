import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"

// Test the installed Wrangler code. An optional bundle supports offline checks.
const source = readFileSync(
  process.argv[2] ??
    new URL("../node_modules/wrangler/wrangler-dist/cli.js", import.meta.url),
  "utf8",
)
const start = source.indexOf("async function createKVNamespace(")
const end = source.indexOf("\nasync function listDispatchNamespaces(", start)
assert.ok(start >= 0 && end > start, "Wrangler's KV provisioning helpers must exist")
const helpers = source.slice(start, end)

class APIError extends Error {}
const duplicate = Object.assign(new APIError("Namespace already exists"), {
  code: 10014,
})
const namespace = { id: "namespace-id", title: "example-kv" }

// Extract only the KV helpers; every API request is mocked, with no credentials.
function provision(fetchResult) {
  return runInNewContext(`${helpers}\ncreateKVNamespace`, {
    APIError,
    URLSearchParams,
    fetchResult,
    logger: { log() {} },
  })
}

test("a fresh namespace is created without a lookup", async () => {
  let calls = 0
  const create = provision(async (config, path, options) => {
    calls++
    assert.equal(path, "/accounts/test-account/storage/kv/namespaces")
    assert.equal(options.method, "POST")
    assert.deepEqual(JSON.parse(options.body), { title: namespace.title })
    return namespace
  })
  assert.equal(await create({}, "test-account", namespace.title), namespace.id)
  assert.equal(calls, 1)
})

test("repeated and concurrent provisioning reuse the same namespace", async () => {
  const namespaces = []
  const create = provision(async (config, path, options) => {
    if (options.method === "POST") {
      if (namespaces.length) throw duplicate
      namespaces.push(namespace)
      return namespace
    }
    return namespaces
  })
  for (let attempt = 0; attempt < 3; attempt++) {
    const ids = await Promise.all([
      create({}, "test-account", namespace.title),
      create({}, "test-account", namespace.title),
    ])
    assert.deepEqual(ids, [namespace.id, namespace.id])
  }
  assert.equal(namespaces.length, 1)
})

test("collision recovery includes namespaces beyond the first page", async () => {
  const pages = []
  const create = provision(async (config, path, options, query) => {
    if (options.method === "POST") throw duplicate
    assert.equal(query.get("per_page"), "100")
    const page = Number(query.get("page"))
    pages.push(page)
    return page === 1
      ? Array.from({ length: 100 }, (_, index) => ({
          id: `other-${index}`,
          title: `another-namespace-${index}`,
        }))
      : [namespace]
  })
  assert.equal(await create({}, "test-account", namespace.title), namespace.id)
  assert.deepEqual(pages, [1, 2])
})

test("a collision with no exact title match preserves the original error", async () => {
  const create = provision(async (config, path, options) => {
    if (options.method === "POST") throw duplicate
    return [{ ...namespace, title: "Example-kv" }]
  })
  await assert.rejects(create({}, "test-account", namespace.title), (error) => {
    assert.equal(error, duplicate)
    return true
  })
})

test("other creation errors are not converted to namespace lookups", async () => {
  for (const failure of [
    Object.assign(new APIError("Authentication failed"), { code: 10000 }),
    Object.assign(new Error("Not a Cloudflare API error"), { code: 10014 }),
    new Error("Network unavailable"),
  ]) {
    let calls = 0
    const create = provision(async () => {
      calls++
      throw failure
    })
    await assert.rejects(create({}, "test-account", namespace.title), (error) => {
      assert.equal(error, failure)
      return true
    })
    assert.equal(calls, 1)
  }
})

test("namespace lookup failures propagate", async () => {
  const failure = new APIError("Namespace listing failed")
  const create = provision(async (config, path, options) => {
    if (options.method === "POST") throw duplicate
    throw failure
  })
  await assert.rejects(create({}, "test-account", namespace.title), (error) => {
    assert.equal(error, failure)
    return true
  })
})
