import assert from "node:assert/strict"
import test from "node:test"
import { resolveKVBindings } from "./kv-bindings.js"

const binding = { binding: "KV" }
const namespace = { id: "namespace-id", title: "example-kv" }
const missingWorker = { code: 10007, message: "Worker does not exist" }
const duplicate = { code: 10014, message: "Namespace already exists" }

function response(result, error) {
  return new Response(JSON.stringify({
    success: !error,
    result,
    errors: error ? [error] : [],
  }), { status: error ? 400 : 200 })
}

// Every request is intercepted: no credentials, namespace data, or live APIs are used.
function mockAPI(t, handler) {
  const requests = []
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const request = { url: new URL(url), method: options.method ?? "GET", body: options.body }
    requests.push(request)
    return handler(request)
  })
  return requests
}

test("fresh production deployment and repeated preview uploads reuse one namespace", async (t) => {
  let workerExists = false
  const namespaces = []
  const requests = mockAPI(t, ({ url, method, body }) => {
    if (url.pathname.endsWith("/settings")) {
      // A preview upload has not established a KV binding in Worker settings.
      return response({ bindings: [] }, workerExists ? undefined : missingWorker)
    }
    if (method === "POST") {
      assert.deepEqual(JSON.parse(body), { title: namespace.title })
      namespaces.push(namespace)
      return response(namespace)
    }
    return response(namespaces)
  })

  assert.deepEqual(await resolveKVBindings("account", "example", [binding], {}, false), [
    { ...binding, id: namespace.id },
  ])
  workerExists = true
  for (const uploadOnly of [true, true, false]) {
    assert.deepEqual(await resolveKVBindings("account", "example", [binding], {}, uploadOnly), [
      { ...binding, id: namespace.id },
    ])
  }
  assert.equal(requests.filter((request) => request.method === "POST").length, 1)
  assert.deepEqual(binding, { binding: "KV" })
})

test("the Worker's existing binding takes precedence over namespace titles", async (t) => {
  const requests = mockAPI(t, ({ url }) => {
    assert.ok(url.pathname.endsWith("/settings"))
    return response({ bindings: [{ type: "kv_namespace", name: "KV", namespace_id: "current-id" }] })
  })
  assert.deepEqual(await resolveKVBindings("account", "example", [binding], {}, true), [
    { ...binding, id: "current-id" },
  ])
  assert.equal(requests.length, 1)
})

test("explicit IDs and projects without KV need no API requests", async (t) => {
  mockAPI(t, () => assert.fail("Unexpected API request"))
  const explicit = [{ binding: "KV", id: "chosen-id", preview_id: "local-id" }]
  assert.deepEqual(await resolveKVBindings("account", "example", explicit, {}, false), explicit)
  assert.deepEqual(await resolveKVBindings("account", "example", [], {}, false), [])
})

test("namespace lookup follows pagination and matches the exact Worker and binding name", async (t) => {
  const target = { id: "target-id", title: "custom-worker-cache-kv" }
  const requests = mockAPI(t, ({ url, method }) => {
    assert.equal(method, "GET")
    if (url.pathname.endsWith("/settings")) return response({ bindings: [] })
    assert.equal(url.searchParams.get("per_page"), "100")
    if (url.searchParams.get("page") === "1") {
      return response(Array.from({ length: 100 }, (_, index) => ({ id: `other-${index}`, title: `other-${index}` })))
    }
    assert.equal(url.searchParams.get("page"), "2")
    return response([target])
  })
  assert.deepEqual(await resolveKVBindings("account", "custom-worker", [{ binding: "CACHE_KV" }], {}, true), [
    { binding: "CACHE_KV", id: target.id },
  ])
  assert.equal(requests.length, 3)
})

test("concurrent creation recovers 10014 by looking up the namespace again", async (t) => {
  let created = false
  const requests = mockAPI(t, ({ url, method }) => {
    if (url.pathname.endsWith("/settings")) return response({ bindings: [] })
    if (method === "POST") {
      created = true
      return response(null, duplicate)
    }
    return response(created ? [namespace] : [])
  })
  assert.deepEqual(await resolveKVBindings("account", "example", [binding], {}, true), [
    { ...binding, id: namespace.id },
  ])
  assert.equal(requests.filter((request) => request.method === "POST").length, 1)
})

test("an unresolved 10014 is reported instead of pretending provisioning succeeded", async (t) => {
  mockAPI(t, ({ url, method }) => {
    if (url.pathname.endsWith("/settings")) return response({ bindings: [] })
    return method === "POST" ? response(null, duplicate) : response([])
  })
  await assert.rejects(resolveKVBindings("account", "example", [binding], {}, true), /10014/)
})

test("settings and namespace permission errors never trigger namespace creation", async (t) => {
  for (const failureStage of ["settings", "namespace-list"]) {
    const requests = mockAPI(t, ({ url }) => {
      if (failureStage === "namespace-list" && url.pathname.endsWith("/settings")) {
        return response({ bindings: [] })
      }
      return response(null, { code: 10000, message: "Authentication error" })
    })
    await assert.rejects(resolveKVBindings("account", "example", [binding], {}, false), /Authentication error/)
    assert.ok(requests.every((request) => request.method === "GET"))
    t.mock.restoreAll()
  }
})

test("network failures and other creation errors are preserved", async (t) => {
  mockAPI(t, () => { throw new Error("Connection failed") })
  await assert.rejects(resolveKVBindings("account", "example", [binding], {}, false), /Connection failed/)
  t.mock.restoreAll()
  mockAPI(t, ({ url, method }) => {
    if (url.pathname.endsWith("/settings")) return response({ bindings: [] })
    return method === "POST"
      ? response(null, { code: 10000, message: "Creation denied" })
      : response([])
  })
  await assert.rejects(resolveKVBindings("account", "example", [binding], {}, false), /Creation denied/)
})

test("preview upload never bootstraps or deploys a missing production Worker", async (t) => {
  const requests = mockAPI(t, () => response(null, missingWorker))
  await assert.rejects(resolveKVBindings("account", "example", [binding], {}, true), /production Worker once/)
  assert.equal(requests.length, 1)
})
