import test from "node:test"
import assert from "node:assert/strict"
import { MegaDriver } from "./driver"
import { MegaAddition } from "./types"

test("MegaDriver instantiation and methods", async () => {
  const addition: MegaAddition = {
    email: "test@example.com",
    password: "password123",
  }

  const driver = new MegaDriver(addition)
  assert.ok(driver)

  // Mock client methods
  ;(driver as any).client.getRootId = () => "root_handle_123"
  ;(driver as any).client.getChildren = (parentId: string) => {
    if (parentId === "root_handle_123") {
      return [
        {
          id: "folder_h1",
          parent_id: "root_handle_123",
          name: "MyFolder",
          size: 0,
          is_dir: true,
          modified: "2026-08-24T12:00:00Z",
          type: 1,
        },
        {
          id: "file_h2",
          parent_id: "root_handle_123",
          name: "video.mp4",
          size: 10485760,
          is_dir: false,
          modified: "2026-08-24T12:00:00Z",
          type: 0,
        },
      ]
    }
    return []
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "MyFolder")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "video.mp4")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 10485760)

  // Mock getDownloadLink
  ;(driver as any).client.getDownloadLink = async (handle: string) =>
    "https://gfs270n123.userstorage.mega.co.nz/download/video.mp4"

  const link = await driver.link("/video.mp4", "/video.mp4")
  assert.equal(
    link.url,
    "https://gfs270n123.userstorage.mega.co.nz/download/video.mp4",
  )
})

import { bytesToB64Url } from "./crypto"
import { MegaApiError } from "./util"

const MASTER_KEY = bytesToB64Url(new Uint8Array(16).fill(7))

test("MegaDriver reuses a persisted session instead of logging in", async () => {
  const addition: MegaAddition = {
    email: "test@example.com",
    password: "password123",
    sid: "cached-sid",
    master_key: MASTER_KEY,
  }
  let persisted = 0
  const driver = new MegaDriver(addition, () => {
    persisted++
  })
  const calls: string[] = []
  ;(driver as any).client = {
    restoreSession: (sid: string, key: string) =>
      calls.push(`restore:${sid}:${key}`),
    fetchNodes: async () => {
      calls.push("fetch")
    },
    init: async () => {
      calls.push("init")
    },
    getSession: () => null,
    clearSession: () => calls.push("clear"),
  }

  await driver.init()
  assert.deepEqual(calls, [`restore:cached-sid:${MASTER_KEY}`, "fetch"])
  assert.equal(persisted, 0)
})

test("MegaDriver logs in again when the persisted session expired", async () => {
  const addition: MegaAddition = {
    email: "test@example.com",
    password: "password123",
    sid: "stale-sid",
    master_key: MASTER_KEY,
  }
  const persisted: Array<{ sid: string; masterKey: string }> = []
  const driver = new MegaDriver(addition, async (session) => {
    persisted.push(session)
  })
  let cleared = false
  let login = 0
  ;(driver as any).client = {
    restoreSession: () => {},
    fetchNodes: async () => {
      throw new MegaApiError(-15)
    },
    clearSession: () => {
      cleared = true
    },
    init: async () => {
      login++
    },
    getSession: () => ({ sid: "fresh-sid", masterKey: MASTER_KEY }),
  }

  await driver.init()
  assert.equal(cleared, true)
  assert.equal(login, 1)
  assert.deepEqual(persisted, [{ sid: "fresh-sid", masterKey: MASTER_KEY }])
  assert.equal(addition.sid, "fresh-sid")
  assert.equal(addition.master_key, MASTER_KEY)
})

test("MegaDriver logs in and persists the session when nothing is cached", async () => {
  const addition: MegaAddition = {
    email: "test@example.com",
    password: "password123",
  }
  const persisted: Array<{ sid: string; masterKey: string }> = []
  const driver = new MegaDriver(addition, (session) => {
    persisted.push(session)
  })
  let login = 0
  ;(driver as any).client = {
    init: async () => {
      login++
    },
    getSession: () => ({ sid: "new-sid", masterKey: MASTER_KEY }),
  }

  await driver.init()
  assert.equal(login, 1)
  assert.deepEqual(persisted, [{ sid: "new-sid", masterKey: MASTER_KEY }])
  assert.equal(addition.sid, "new-sid")
})

test("MegaDriver propagates non-session errors and survives persistence failures", async () => {
  const addition: MegaAddition = {
    email: "test@example.com",
    password: "password123",
    sid: "sid",
    master_key: MASTER_KEY,
  }
  const driver = new MegaDriver(addition)
  ;(driver as any).client = {
    restoreSession: () => {},
    fetchNodes: async () => {
      throw new MegaApiError(-11)
    },
    clearSession: () => {},
    init: async () => {},
    getSession: () => null,
  }
  await assert.rejects(() => driver.init(), /Mega API error code: -11/)

  const clean: MegaAddition = {
    email: "test@example.com",
    password: "password123",
  }
  const failing = new MegaDriver(clean, async () => {
    throw new Error("db down")
  })
  ;(failing as any).client = {
    init: async () => {},
    getSession: () => ({ sid: "sid2", masterKey: MASTER_KEY }),
  }
  await failing.init()
  assert.equal(clean.sid, "sid2")
})

test("MegaDriver falls back to login when the persisted session is malformed", async () => {
  const addition: MegaAddition = {
    email: "test@example.com",
    password: "password123",
    sid: "sid",
    master_key: "not-a-valid-key",
  }
  let login = 0
  let cleared = false
  const driver = new MegaDriver(addition, () => {})
  ;(driver as any).client = {
    restoreSession: () => {
      throw new Error("bad master key")
    },
    fetchNodes: async () => {},
    clearSession: () => {
      cleared = true
    },
    init: async () => {
      login++
    },
    getSession: () => ({ sid: "fresh-sid", masterKey: MASTER_KEY }),
  }

  await driver.init()
  assert.equal(cleared, true)
  assert.equal(login, 1)
  assert.equal(addition.sid, "fresh-sid")
})
