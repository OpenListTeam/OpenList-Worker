import assert from "node:assert/strict"
import { test } from "node:test"

import type { StorageDriver } from "../driver/base"
import {
  getItem,
  getOrCreateDriver,
  scheduleStoragePersistence,
} from "./storage"

test("concurrent driver initialization shares one Promise", async () => {
  let calls = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  const driver = {} as StorageDriver
  const cache = new Map<string, Promise<StorageDriver>>()

  const factory = async () => {
    calls++
    await gate
    return driver
  }

  const first = getOrCreateDriver(cache, "189-1", factory)
  const second = getOrCreateDriver(cache, "189-1", factory)
  release()

  assert.equal(await first, driver)
  assert.equal(await second, driver)
  assert.equal(calls, 1)
})

test("Worker persistence is scheduled instead of awaited", async () => {
  let resolvePersistence!: () => void
  const persistence = new Promise<void>(
    (resolve) => (resolvePersistence = resolve),
  )
  let scheduled: Promise<unknown> | undefined

  await scheduleStoragePersistence((task) => {
    scheduled = task
  }, persistence)

  assert.equal(scheduled, persistence)
  resolvePersistence()
  await scheduled
})

test("Node persistence is awaited without waitUntil", async () => {
  let completed = false
  const persistence = Promise.resolve().then(() => {
    completed = true
  })

  await scheduleStoragePersistence(undefined, persistence)
  assert.equal(completed, true)
})

test("mounted storage roots return without initializing the remote driver", async () => {
  const previousDatabase = process.env.DATABASE_JSON
  process.env.DATABASE_JSON = JSON.stringify({
    settings: [],
    users: [],
    storages: [
      {
        id: "storage-root-fast-path",
        driver: "189Cloud",
        mount_path: "/189",
        addition: JSON.stringify({ root_folder_id: "-11" }),
        modified: "2026-08-23T00:00:00.000Z",
        disabled: false,
      },
    ],
    shares: [],
  })

  try {
    const result = await getItem("/189")
    assert.equal(result.provider, "189Cloud")
    assert.equal(result.item.name, "189")
    assert.equal(result.item.is_dir, true)
    assert.equal(result.item.sign, "-11")
  } finally {
    if (previousDatabase === undefined) {
      delete process.env.DATABASE_JSON
    } else {
      process.env.DATABASE_JSON = previousDatabase
    }
  }
})
