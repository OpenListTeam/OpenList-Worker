import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { after, test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"
import { build } from "esbuild"

const root = fileURLToPath(new URL("../", import.meta.url))
const temporaryDirectory = await mkdtemp(
  path.join(os.tmpdir(), "edgeone-entry-"),
)
after(() => rm(temporaryDirectory, { recursive: true, force: true }))

// EdgeOne's Node launcher provides global require for bundled CommonJS
// dependencies. Match that runtime when importing the generated ESM backend.
globalThis.require = createRequire(import.meta.url)

// EdgeOne bundles the committed entry after the project build has generated its
// imported backend. Exercise that second bundle as well as the original entry.
const output = path.join(temporaryDirectory, "entry.mjs")
await build({
  entryPoints: [path.join(root, "cloud-functions/[[default]].js")],
  outfile: output,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
})

const entries = [
  ["committed entry", await import("../cloud-functions/[[default]].js")],
  ["rebundled entry", await import(pathToFileURL(output).href)],
]

for (const [name, entry] of entries) {
  test(`${name}: diagnostics return JSON through onRequest`, async () => {
    const values = new Map()
    const env = {
      DB_DRIVER: "kv",
      DB_FORMAT: "map",
      JWT_SECRET: "edgeone-entry-test-secret-32-characters",
      KV: {
        get: async (key) => values.get(key) ?? null,
        put: async (key, value) => values.set(key, value),
      },
    }
    assert.equal(entry.default, entry.onRequest)
    for (const route of ["env_check", "init_status"]) {
      const response = await entry.onRequest({
        request: new Request(`http://localhost/api/public/${route}`),
        env,
      })
      assert.equal(response.status, 200)
      assert.match(response.headers.get("content-type"), /application\/json/)
      const body = await response.json()
      assert.equal(body.code, 200)
      if (route === "env_check") {
        assert.equal(body.data.config.db_driver, "kv")
        assert.equal(body.data.storage.available, true)
      } else {
        assert.equal(body.data.initialized, false)
      }
    }
  })

  test(`${name}: frontend navigation keeps its SPA fallback`, async () => {
    const response = await entry.onRequest({
      request: new Request("http://localhost/@manage", {
        headers: { accept: "text/html" },
      }),
      env: {},
    })
    assert.equal(response.status, 200)
    assert.match(response.headers.get("content-type"), /text\/html/)
    assert.match(await response.text(), /<html[\s>]/i)
  })
}
