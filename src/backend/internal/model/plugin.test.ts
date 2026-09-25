import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyPluginManifest,
  parsePluginManifest,
  toPublicPlugin,
} from "./plugin"

const minimal = {
  apiVersion: "v1",
  id: "com.example.docs",
  version: "1.0.0",
  displayName: "Docs",
}

test("plugin manifest v1 applies defaults", () => {
  assert.deepEqual(parsePluginManifest(minimal), {
    ...minimal,
    description: "",
    capabilities: [],
    settingsSchema: {},
  })
})

test("plugin manifest v1 rejects unknown fields and unsupported versions", () => {
  assert.throws(() => parsePluginManifest({ ...minimal, extra: true }))
  assert.throws(() => parsePluginManifest({ ...minimal, apiVersion: "v2" }))
})

test("plugin manifest v1 validates identity and capability names", () => {
  assert.throws(() => parsePluginManifest({ ...minimal, id: "Example" }))
  assert.throws(() => parsePluginManifest({ ...minimal, version: "" }))
  assert.throws(() =>
    parsePluginManifest({
      ...minimal,
      capabilities: ["files.read", "files.read"],
    }),
  )
  assert.throws(() =>
    parsePluginManifest({ ...minimal, capabilities: ["Files.Read"] }),
  )
})

test("plugin manifest v1 bounds nested JSON", () => {
  let nested: any = { value: true }
  for (let i = 0; i < 20; i++) nested = { nested }
  assert.throws(() =>
    parsePluginManifest({ ...minimal, settingsSchema: nested }),
  )
  assert.throws(() =>
    parsePluginManifest({
      ...minimal,
      entry: JSON.parse('{"constructor":{"prototype":{}}}'),
    }),
  )
  assert.throws(() =>
    parsePluginManifest({
      ...minimal,
      entry: { value: "x".repeat(70_000) },
    }),
  )
  assert.throws(() =>
    parsePluginManifest({
      ...minimal,
      settingsSchema: Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [
          `field${index}`,
          "x".repeat(8_000),
        ]),
      ),
      entry: Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [
          `field${index}`,
          "x".repeat(8_000),
        ]),
      ),
    }),
  )
})

test("plugin manifest preserves bounded opaque entry data", () => {
  const entry = { module: "index.js", integrity: "sha256-abc" }
  assert.deepEqual(parsePluginManifest({ ...minimal, entry }).entry, entry)
})

test("applying a manifest preserves legacy fields and synchronizes projections", () => {
  const plugin = {
    id: minimal.id,
    name: "Old name",
    version: "0.0.1",
    description: "Old description",
    enabled: false,
    config_values: { token: "secret" },
  }
  const updated = applyPluginManifest(plugin, {
    ...minimal,
    displayName: "New name",
    version: "2.0.0",
    description: "New description",
  })
  assert.equal(updated.name, "New name")
  assert.equal(updated.version, "2.0.0")
  assert.equal(updated.description, "New description")
  assert.equal(updated.enabled, false)
  assert.deepEqual(updated.config_values, { token: "secret" })
  assert.equal(updated.manifest?.displayName, "New name")
  assert.throws(() => applyPluginManifest(plugin, { ...minimal, id: "other" }))
})

test("public plugin projection keeps legacy rows and hides manifest internals", () => {
  assert.deepEqual(
    toPublicPlugin({
      id: "legacy",
      script_content: "raw",
      config_values: { token: "secret" },
    }),
    { id: "legacy" },
  )

  const projected = toPublicPlugin(
    applyPluginManifest(
      { id: minimal.id, enabled: true, config_values: { token: "secret" } },
      {
        ...minimal,
        capabilities: ["files_read"],
        settingsSchema: { type: "object" },
        entry: { module: "index.js" },
      },
    ),
  )
  assert.deepEqual(projected.manifest, {
    apiVersion: "v1",
    id: minimal.id,
    version: minimal.version,
    displayName: minimal.displayName,
    description: "",
    capabilities: ["files_read"],
  })
  assert.equal("entry" in projected.manifest, false)
  assert.equal("settingsSchema" in projected.manifest, false)
  assert.equal("config_values" in projected, false)
  assert.equal("script_content" in projected, false)
})
