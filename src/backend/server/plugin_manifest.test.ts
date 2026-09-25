import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import {
  __resetDbCacheForTest,
  __setStoreBackendLoaderForTest,
} from "../internal/model/db"
import { adminRouter } from "./admin"
import { publicRouter } from "./public"

const TOKEN = "plugin-test-token"
const manifest = {
  apiVersion: "v1",
  id: "com.example.docs",
  version: "1.0.0",
  displayName: "Docs",
  description: "Documentation tools",
  capabilities: ["files_read"],
  settingsSchema: { type: "object" },
  entry: { module: "index.js" },
}

function setup(
  options: {
    format?: string
    onSave?: (next: any, current: any) => Promise<boolean>
  } = {},
) {
  __resetDbCacheForTest()
  let stored: any = {
    settings: [{ key: "token", value: TOKEN }],
    users: [],
    storages: [],
    shares: [],
    metas: [],
    plugins: [],
  }
  const backend = {
    name: "plugin-test",
    isConfigured: async () => true,
    load: async () => JSON.parse(JSON.stringify(stored)),
    save: async (next: any) => {
      if (options.onSave) return options.onSave(next, stored)
      stored = JSON.parse(JSON.stringify(next))
      return true
    },
  }
  __setStoreBackendLoaderForTest(async () => backend)
  const env: any = {
    DB_DRIVER: "plugin-test",
    DB_FORMAT: options.format || "map",
    PLUGIN_MANIFEST_ORIGIN: "http://localhost",
    JWT_SECRET: "plugin-test-secret-0123456789abcdef",
  }
  return {
    env,
    getStored: () => stored,
  }
}

function adminApp() {
  const app = new Hono()
  app.route("/api/admin", adminRouter)
  return app
}

function publicApp() {
  const app = new Hono()
  app.route("/api/public", publicRouter)
  return app
}

async function install(app: Hono, env: any, body: any) {
  return app.request(
    "/api/admin/plugin/install",
    {
      method: "POST",
      headers: {
        Authorization: TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    env,
  )
}

async function listPlugins(app: Hono, env: any) {
  return app.request(
    "/api/admin/plugin/list",
    { headers: { Authorization: TOKEN } },
    env,
  )
}

test(
  "plugin install accepts a v1 manifest and preserves compatibility fields",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup()
    try {
      const res = await install(adminApp(), env, {
        manifest,
        enabled: false,
        config_values: { keep: "value" },
      })
      assert.equal(res.status, 200)
      const body: any = await res.json()
      assert.equal(body.data.id, manifest.id)
      assert.equal(body.data.name, manifest.displayName)
      assert.equal(body.data.version, manifest.version)
      assert.equal(body.data.enabled, false)
      assert.deepEqual(body.data.config_values, { keep: "value" })
      assert.deepEqual(body.data.manifest, manifest)

      const raw = await install(adminApp(), env, {
        ...manifest,
        id: "com.example.raw",
        displayName: "Raw",
      })
      assert.equal(raw.status, 200)
      assert.equal(getStored().plugins.length, 2)
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "concurrent plugin installs serialize read-modify-write",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup()
    const app = adminApp()
    const secondEnv = { ...env }
    try {
      const results = await Promise.all([
        install(app, env, { manifest }),
        install(app, secondEnv, {
          manifest: { ...manifest, id: "com.example.second" },
        }),
      ])
      assert.deepEqual(
        results.map((response) => response.status),
        [200, 200],
      )
      assert.equal(getStored().plugins.length, 2)
      const listResponse = await listPlugins(app, env)
      const listBody: any = await listResponse.json()
      assert.equal(listBody.data.content.length, 2)
      const publicResponse = await publicApp().request(
        "/api/public/plugins",
        {},
        env,
      )
      const publicBody: any = await publicResponse.json()
      assert.equal(publicBody.data.length, 2)
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "plugin install rejects invalid manifests without changing storage",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup()
    try {
      const malformed = await adminApp().request(
        "/api/admin/plugin/install",
        {
          method: "POST",
          headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
          },
          body: "{",
        },
        env,
      )
      assert.equal(malformed.status, 400)

      const nullBody = await adminApp().request(
        "/api/admin/plugin/install",
        {
          method: "POST",
          headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
          },
          body: "null",
        },
        env,
      )
      assert.equal(nullBody.status, 400)

      const res = await install(adminApp(), env, {
        manifest: { ...manifest, capabilities: ["files.read"] },
      })
      assert.equal(res.status, 400)
      const body: any = await res.json()
      assert.equal(body.code, 400)
      assert.match(body.message, /capabilities/)
      assert.deepEqual(getStored().plugins, [])

      const legacy = await install(adminApp(), env, {
        id: "legacy.plugin",
        name: "Legacy",
      })
      assert.equal(legacy.status, 200)
      assert.equal(getStored().plugins[0].manifest, undefined)
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "plugin writes reject non-atomic key format",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup({ format: "key" })
    try {
      const res = await install(adminApp(), env, { manifest })
      assert.equal(res.status, 409)
      const body: any = await res.json()
      assert.equal(body.data.code, "ATOMIC_PLUGIN_PERSISTENCE_UNSUPPORTED")
      assert.deepEqual(getStored().plugins, [])
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "failed plugin persistence never publishes the candidate snapshot",
  { concurrency: false },
  async () => {
    let saveAttempts = 0
    const { env, getStored } = setup({
      onSave: async () => {
        saveAttempts++
        if (saveAttempts === 1) throw new Error("backend unavailable")
        return false
      },
    })
    const app = adminApp()
    try {
      const res = await install(app, env, { manifest })
      assert.equal(res.status, 503)
      assert.deepEqual(getStored().plugins, [])
      const listResponse = await listPlugins(app, env)
      const listBody: any = await listResponse.json()
      assert.deepEqual(listBody.data.content, [])
      const publicResponse = await publicApp().request(
        "/api/public/plugins",
        {},
        env,
      )
      const publicBody: any = await publicResponse.json()
      assert.deepEqual(publicBody.data, [])

      const falseResult = await install(app, env, {
        manifest: { ...manifest, id: "com.example.false" },
      })
      assert.equal(falseResult.status, 503)
      assert.deepEqual(getStored().plugins, [])
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "manifest reinstall preserves legacy-only plugin fields",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup()
    try {
      const legacy = {
        id: manifest.id,
        name: "Legacy",
        version: "0.9.0",
        description: "Legacy description",
        author: "Author",
        homepage: "https://example.com",
        repository: "https://example.com/repo",
        icon: "icon.png",
        type: "ui",
        enabled: false,
        high_privilege: true,
        permissions: ["files_read"],
        entry_url: "index.js",
        script_content: "script",
        style_content: "style",
        config_schema: [{ key: "token" }],
        config_values: { token: "keep" },
        target_hooks: ["global"],
        is_builtin: true,
        tags: ["legacy"],
      }
      assert.equal((await install(adminApp(), env, legacy)).status, 200)
      assert.equal((await install(adminApp(), env, { manifest })).status, 200)
      const stored = getStored().plugins[0]
      assert.equal(stored.name, manifest.displayName)
      assert.equal(stored.author, "Author")
      assert.equal(stored.entry_url, "index.js")
      assert.equal(stored.script_content, "script")
      assert.equal(stored.style_content, "style")
      assert.deepEqual(stored.config_schema, [{ key: "token" }])
      assert.deepEqual(stored.config_values, { token: "keep" })
      assert.deepEqual(stored.target_hooks, ["global"])
      assert.equal(stored.is_builtin, true)
      assert.deepEqual(stored.tags, ["legacy"])
      assert.equal(stored.enabled, false)
      assert.equal(stored.high_privilege, true)
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "legacy plugin IDs are length-bounded and case-insensitive",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup()
    const app = adminApp()
    try {
      assert.equal(
        (
          await install(app, env, {
            id: "Legacy.Plugin",
            name: "Legacy",
          })
        ).status,
        200,
      )
      assert.equal(
        (
          await install(app, env, {
            id: "legacy.plugin",
            name: "Legacy updated",
          })
        ).status,
        200,
      )
      assert.equal(getStored().plugins.length, 1)
      assert.equal(getStored().plugins[0].id, "legacy.plugin")
      const getResponse = await app.request(
        "/api/admin/plugin/get?id=LEGACY.PLUGIN",
        { headers: { Authorization: TOKEN } },
        env,
      )
      assert.equal(getResponse.status, 200)

      const tooLong = await install(app, env, {
        id: "x".repeat(256),
        name: "Too long",
      })
      assert.equal(tooLong.status, 400)
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "plugin update and batch save validate manifests atomically",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup()
    const app = adminApp()
    try {
      assert.equal((await install(app, env, { manifest })).status, 200)

      const mismatch = await app.request(
        "/api/admin/plugin/update",
        {
          method: "POST",
          headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: manifest.id,
            manifest: { ...manifest, id: "other.plugin" },
          }),
        },
        env,
      )
      assert.equal(mismatch.status, 400)
      assert.equal(getStored().plugins[0].version, manifest.version)

      const updated = await app.request(
        "/api/admin/plugin/update",
        {
          method: "POST",
          headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: manifest.id,
            manifest: { ...manifest, version: "2.0.0" },
          }),
        },
        env,
      )
      assert.equal(updated.status, 200)
      assert.equal(getStored().plugins[0].version, "2.0.0")

      const duplicateBatch = await app.request(
        "/api/admin/plugin/batch_save",
        {
          method: "POST",
          headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plugins: [
              { id: "Legacy", name: "Legacy" },
              { id: "legacy", name: "Legacy duplicate" },
            ],
          }),
        },
        env,
      )
      assert.equal(duplicateBatch.status, 400)
      assert.equal(getStored().plugins.length, 1)

      const invalidBatch = await app.request(
        "/api/admin/plugin/batch_save",
        {
          method: "POST",
          headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plugins: [{ ...getStored().plugins[0], manifest: null }],
          }),
        },
        env,
      )
      assert.equal(invalidBatch.status, 400)
      assert.equal(getStored().plugins[0].version, "2.0.0")
    } finally {
      __resetDbCacheForTest()
    }
  },
)

test(
  "manifest URL installation uses a trusted origin and cancels rejected bodies",
  { concurrency: false },
  async () => {
    const { env, getStored } = setup()
    const originalFetch = globalThis.fetch
    const originalProcessOrigin = process.env.PLUGIN_MANIFEST_ORIGIN
    let calls = 0
    try {
      ;(globalThis as any).fetch = async (
        input: any,
        init: any,
      ): Promise<Response> => {
        calls++
        assert.equal(String(input), "http://localhost/plugin.json")
        assert.equal(init.redirect, "error")
        assert.ok(init.signal)
        return new Response(JSON.stringify(manifest), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      const installed = await install(adminApp(), env, {
        manifest_url: "http://localhost/plugin.json",
      })
      assert.equal(installed.status, 200)
      assert.equal(getStored().plugins[0].manifest.id, manifest.id)
      ;(globalThis as any).fetch = async () => {
        calls++
        return new Response(JSON.stringify(manifest))
      }
      const external = await install(adminApp(), env, {
        manifest_url: "https://evil.example/plugin.json",
      })
      assert.equal(external.status, 400)
      assert.equal(calls, 1)
      let oversizedCanceled = false
      ;(globalThis as any).fetch = async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("{}"))
            },
            cancel() {
              oversizedCanceled = true
            },
          }),
          { headers: { "Content-Length": "70000" } },
        )
      const oversized = await install(adminApp(), env, {
        manifest_url: "http://localhost/plugin.json",
      })
      assert.equal(oversized.status, 400)
      assert.equal(oversizedCanceled, true)
      assert.equal(getStored().plugins.length, 1)

      let streamedOversizedCanceled = false
      ;(globalThis as any).fetch = async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("x".repeat(40_000)))
              controller.enqueue(new TextEncoder().encode("x".repeat(40_000)))
            },
            cancel() {
              streamedOversizedCanceled = true
            },
          }),
        )
      const streamedOversized = await install(adminApp(), env, {
        manifest_url: "http://localhost/plugin.json",
      })
      assert.equal(streamedOversized.status, 400)
      assert.equal(streamedOversizedCanceled, true)

      let errorCanceled = false
      ;(globalThis as any).fetch = async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("error"))
            },
            cancel() {
              errorCanceled = true
            },
          }),
          { status: 500 },
        )
      const failed = await install(adminApp(), env, {
        manifest_url: "http://localhost/plugin.json",
      })
      assert.equal(failed.status, 400)
      assert.equal(errorCanceled, true)

      delete env.PLUGIN_MANIFEST_ORIGIN
      const untrusted = await install(adminApp(), env, {
        manifest_url: "http://localhost/plugin.json",
      })
      assert.equal(untrusted.status, 400)

      process.env.PLUGIN_MANIFEST_ORIGIN = "http://localhost"
      ;(globalThis as any).fetch = async () =>
        new Response(JSON.stringify(manifest), { status: 200 })
      const processOrigin = await install(adminApp(), env, {
        manifest_url: "http://localhost/plugin.json",
      })
      assert.equal(processOrigin.status, 200)
    } finally {
      globalThis.fetch = originalFetch
      if (originalProcessOrigin === undefined) {
        delete process.env.PLUGIN_MANIFEST_ORIGIN
      } else {
        process.env.PLUGIN_MANIFEST_ORIGIN = originalProcessOrigin
      }
      __resetDbCacheForTest()
    }
  },
)

test(
  "public plugins expose only safe manifest metadata",
  { concurrency: false },
  async () => {
    const { env } = setup()
    try {
      assert.equal(
        (
          await install(adminApp(), env, {
            manifest,
            config_values: { token: "secret" },
            script_content: "raw",
          })
        ).status,
        200,
      )
      const res = await publicApp().request("/api/public/plugins", {}, env)
      assert.equal(res.status, 200)
      const body: any = await res.json()
      assert.equal(body.data.length, 1)
      assert.deepEqual(body.data[0].manifest, {
        apiVersion: "v1",
        id: manifest.id,
        version: manifest.version,
        displayName: manifest.displayName,
        description: manifest.description,
        capabilities: manifest.capabilities,
      })
      assert.equal("entry" in body.data[0].manifest, false)
      assert.equal("settingsSchema" in body.data[0].manifest, false)
      assert.equal("config_values" in body.data[0], false)
      assert.equal("script_content" in body.data[0], false)
    } finally {
      __resetDbCacheForTest()
    }
  },
)
