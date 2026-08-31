import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { saveDb } from "../internal/model/db"
import { fsRouter } from "./fs"

const env: any = {}
const ADMIN_TOKEN = "ADMIN_STATIC_TOKEN"

/**
 * `/fs/other` dispatches driver-specific privileged operations. S3 uses it to
 * mint presigned direct-upload URLs, so it must obey the same write gate as
 * `/fs/put` — otherwise a guest can upload while appearing to have no write
 * permission.
 */
const seed = () =>
  saveDb(
    {
      settings: [{ key: "token", value: ADMIN_TOKEN }],
      users: [
        {
          id: 1,
          username: "admin",
          password: "xxx",
          role: 2,
          permission: 0,
          base_path: "/",
          disabled: false,
        },
        {
          id: 2,
          username: "guest",
          password: "xxx",
          role: 1,
          permission: 0,
          base_path: "/",
          disabled: false,
        },
      ],
      storages: [
        {
          id: 1,
          mount_path: "/x",
          driver: "local",
          disabled: false,
          addition: JSON.stringify({ root_folder_path: "/data" }),
        },
      ],
      shares: [],
    },
    env,
  )

const post = (headers: Record<string, string> = {}) => {
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  return app.request("/api/fs/other", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ path: "/x", method: "direct_upload" }),
  })
}

test("Security(H-8): guest cannot reach /api/fs/other", async () => {
  await seed()
  const res = await post()
  assert.equal(
    res.status,
    403,
    "a guest must be denied driver-privileged operations",
  )
})

test("Security(H-8): admin is not blocked by the /api/fs/other write gate", async () => {
  await seed()
  const res = await post({ Authorization: ADMIN_TOKEN })
  assert.notEqual(
    res.status,
    403,
    "the write gate must only deny unprivileged callers, not admins",
  )
})
