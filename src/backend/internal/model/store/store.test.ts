import assert from "node:assert/strict"
import { test } from "node:test"
import { jsonBackend, readJsonBackend, getKvBinding } from "./json"
import { d1Backend } from "./d1"
import { mysqlBackend } from "./mysql"
import { kvBackend } from "./kv"
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
  assert.equal(readDriver({ DB_DRIVER: "KV" }), "kv")
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
  const env: any = { KV: binding }
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

test("json backend: DB_JSON_BACKEND normalizes explicit storage mode", () => {
  assert.equal(readJsonBackend({}), "auto")
  assert.equal(readJsonBackend({ DB_JSON_BACKEND: "BLOB" }), "blob")
  assert.equal(readJsonBackend({ DB_JSON_BACKEND: "kv" }), "kv")
  assert.equal(readJsonBackend({ DB_JSON_BACKEND: "CF-REST" }), "cf_rest")
  assert.equal(readJsonBackend({ DB_JSON_BACKEND: "api" }), "cf_rest")
  assert.equal(readJsonBackend({ DB_JSON_BACKEND: "unknown" }), "unknown")
})

test("json backend: forced kv without binding -> none (no silent fallback)", async () => {
  // 显式指定 kv 但环境无 KV binding 时，应返回 none 而非静默回退到 blob/内存
  const info = await getKvBinding({ DB_JSON_BACKEND: "kv" })
  assert.equal(info.mode, "none")
})

test("json backend: forced cf_rest without credentials -> none", async () => {
  const info = await getKvBinding({ DB_JSON_BACKEND: "cf_rest" })
  assert.equal(info.mode, "none")
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

test("kv backend: roundtrip via mock KV binding (per-table keys)", async () => {
  const store = new Map<string, string>()
  const binding = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, v: string) => {
      store.set(key, v)
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    list: async (opts?: any) => {
      const prefix = opts?.prefix || ""
      const keys = [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((name) => ({ name }))
      return { keys, list_complete: true }
    },
  }
  const env: any = { KV: binding }
  assert.equal(kvBackend.name, "kv")
  assert.equal(await kvBackend.isConfigured!(env), true)

  const data = {
    settings: [{ key: "site_title", value: "OpenList" }],
    storages: [{ id: 1, mount_path: "/x", driver: "local" }],
    users: [{ id: 1, username: "admin" }],
    shares: [],
    metas: [],
    plugins: [],
  }
  assert.equal(await kvBackend.save(data, env), true)
  // 应写入分表 key（而非单个 openlist_config）
  assert.ok(store.has("openlist_tbl:settings:site_title"))
  assert.ok(store.has("openlist_tbl:storages:1"))
  assert.ok(store.has("openlist_tbl:users:1"))
  assert.ok(store.has("openlist_tbl:schema_info"))
  assert.deepEqual(await kvBackend.load(env), data)
})

test("kv backend: unconfigured env -> isConfigured=false, load=null", async () => {
  assert.equal(await kvBackend.isConfigured!({}), false)
  assert.equal(await kvBackend.load({}), null)
})

test("kv backend: deleting an entity removes its stale key on next save", async () => {
  const store = new Map<string, string>()
  const binding = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, v: string) => {
      store.set(key, v)
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    list: async (opts?: any) => {
      const prefix = opts?.prefix || ""
      return {
        keys: [...store.keys()]
          .filter((k) => k.startsWith(prefix))
          .map((name) => ({ name })),
        list_complete: true,
      }
    },
  }
  const env: any = { KV: binding }
  const two = {
    settings: [],
    storages: [
      { id: 1, mount_path: "/a", driver: "local" },
      { id: 2, mount_path: "/b", driver: "local" },
    ],
    users: [],
    shares: [],
    metas: [],
    plugins: [],
  }
  await kvBackend.save(two, env)
  const one = { ...two, storages: [{ id: 1, mount_path: "/a", driver: "local" }] }
  await kvBackend.save(one, env)
  assert.ok(!store.has("openlist_tbl:storages:2"))
  assert.deepEqual(await kvBackend.load(env), one)
})
