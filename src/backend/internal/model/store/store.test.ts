import assert from "node:assert/strict"
import { test } from "node:test"
import { jsonBackend } from "./json"
import { d1Backend } from "./d1"
import { mysqlBackend } from "./mysql"
import { readDriver, getStoreBackend } from "./backend"
import {
  TABLE_NAMES,
  TABLE_KEY,
  keyOf,
  D1_SCHEMA,
  MYSQL_SCHEMA,
} from "./schema"

test("schema: tables / keys / DDL are consistent", () => {
  assert.equal(TABLE_NAMES.length, 6)
  assert.equal(TABLE_KEY.settings, "key")
  assert.equal(TABLE_KEY.storages, "id")
  assert.equal(keyOf("settings", { key: "site_title" }), "site_title")
  assert.equal(keyOf("users", { id: 2 }), "2")
  assert.ok(D1_SCHEMA.length >= 7)
  assert.ok(MYSQL_SCHEMA.length >= 7)
})

test("backend factory: defaults to json and normalizes driver", async () => {
  assert.equal(readDriver({}), "json")
  assert.equal(readDriver({ DB_DRIVER: "d1" }), "d1")
  assert.equal(readDriver({ DB_DRIVER: "MYSQL" }), "mysql")
  assert.equal(readDriver({ DB_DRIVER: "unknown" }), "unknown")
  const b = await getStoreBackend({})
  assert.equal(b.name, "json")
})

test("json backend: roundtrip via mock KV binding", async () => {
  const store = new Map<string, string>()
  const binding = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, v: string) => {
      store.set(key, v)
    },
  }
  const env: any = { OPENLIST_KV: binding }
  assert.equal(await jsonBackend.isConfigured!(env), true)

  const data = {
    settings: [{ key: "site_title", value: "OpenList" }],
    storages: [{ id: 1, mount_path: "/x", driver: "local" }],
    users: [{ id: 1, username: "admin" }],
    shares: [],
    metas: [],
    plugins: [],
  }
  assert.equal(await jsonBackend.save(data, env), true)
  assert.deepEqual(await jsonBackend.load(env), data)
})

test("json backend: unconfigured env -> isConfigured=false, load=null", async () => {
  assert.equal(await jsonBackend.isConfigured!({}), false)
  assert.equal(await jsonBackend.load({}), null)
})

test("d1 backend: detects binding without touching D1 API", async () => {
  assert.equal(d1Backend.name, "d1")
  assert.equal(await d1Backend.isConfigured!({ DB: {} }), true)
  assert.equal(await d1Backend.isConfigured!({}), false)
})

test("mysql backend: detects config without loading mysql2", async () => {
  assert.equal(mysqlBackend.name, "mysql")
  // isConfigured 仅检查配置存在性，不触发 mysql2 动态加载
  assert.equal(
    await mysqlBackend.isConfigured!({ MYSQL_HOST: "127.0.0.1" }),
    true,
  )
  assert.equal(await mysqlBackend.isConfigured!({}), false)
})
