import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { sign } from "hono/jwt"
import { saveDb } from "../internal/model/db"
import { s3Router } from "./s3"

/**
 * Regression tests for the /s3 gateway authorization fix:
 *  - disabled users must be rejected (authUserFromReq now mirrors
 *    getUserFromContext's disabled check)
 *  - PUT/DELETE require WRITE_CONTENT / DELETE permission bits
 *  - every virtual path is confined to the user's base_path via
 *    getActualPath() (no cross-storage read/write/delete)
 */

const env: any = { JWT_SECRET: "test-jwt-secret-for-s3-gateway-tests" }

const mountX = {
  id: 1,
  mount_path: "/x",
  driver: "url_tree",
  disabled: false,
  addition: JSON.stringify({
    url_structure: "SecretMount:\n  https://example.com/inner.txt",
  }),
}

const seed = () =>
  saveDb(
    {
      settings: [],
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
          username: "writer",
          password: "xxx",
          role: 0,
          // WRITE_CONTENT(8) | DELETE(128)
          permission: 8 | 128,
          base_path: "/",
          disabled: false,
        },
        {
          id: 3,
          username: "jailbird",
          password: "xxx",
          role: 0,
          permission: 8 | 128,
          base_path: "/jail",
          disabled: false,
        },
        {
          id: 4,
          username: "captive",
          password: "xxx",
          role: 0,
          permission: 8 | 128,
          base_path: "/",
          disabled: true,
        },
      ],
      storages: [mountX],
      shares: [],
    },
    env,
  )

async function tokenFor(username: string): Promise<string> {
  return await sign(
    {
      id: { admin: 1, writer: 2, jailbird: 3, captive: 4 }[username],
      username,
      role: { admin: 2, writer: 0, jailbird: 0, captive: 0 }[username],
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    env.JWT_SECRET,
  )
}

function makeApp() {
  const app = new Hono()
  app.route("/s3", s3Router)
  return app
}

test("Security(P0): disabled user with a valid JWT cannot use the S3 gateway", async () => {
  await seed()
  const app = makeApp()
  const res = await app.request(
    "/s3/",
    { headers: { Authorization: `Bearer ${await tokenFor("captive")}` } },
    env,
  )
  assert.equal(res.status, 403, "disabled users must be denied")
})

test("Security(P0): PUT requires WRITE_CONTENT permission", async () => {
  await seed()
  const app = makeApp()
  // jailbird has the bit but is confined; use a user without the bit
  await saveDb(
    {
      settings: [],
      users: [
        {
          id: 5,
          username: "readonly",
          password: "xxx",
          role: 0,
          permission: 0,
          base_path: "/",
          disabled: false,
        },
      ],
      storages: [mountX],
      shares: [],
    },
    env,
  )
  const res = await app.request(
    "/s3/x/hello.txt",
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${await tokenFor("readonly")}` },
      body: "hello",
    },
    env,
  )
  assert.equal(res.status, 403, "users without WRITE_CONTENT must not upload")
})

test("Security(P0): DELETE requires DELETE permission", async () => {
  await seed()
  const app = makeApp()
  await saveDb(
    {
      settings: [],
      users: [
        {
          id: 6,
          username: "writeronly",
          password: "xxx",
          role: 0,
          permission: 8, // WRITE_CONTENT only
          base_path: "/",
          disabled: false,
        },
      ],
      storages: [mountX],
      shares: [],
    },
    env,
  )
  const res = await app.request(
    "/s3/x/hello.txt",
    { method: "DELETE", headers: { Authorization: `Bearer ${await tokenFor("writeronly")}` } },
    env,
  )
  assert.equal(res.status, 403, "users without DELETE must not delete")
})

test("Security(P0): base_path confines S3 ListBuckets to the user root", async () => {
  await seed()
  const app = makeApp()
  const res = await app.request(
    "/s3/",
    { headers: { Authorization: `Bearer ${await tokenFor("jailbird")}` } },
    env,
  )
  const body = await res.text()
  assert.ok(
    !body.includes("<Name>x</Name>"),
    "a base_path=jail user must not list buckets outside their base_path",
  )
})

test("Security(P0): base_path confines S3 GetObject; '..' cannot escape", async () => {
  await seed()
  const app = makeApp()
  // /x resolves outside /jail — the path is clamped back into /jail, so the
  // object must not be found (no 302 redirect to the upstream URL).
  const res = await app.request(
    "/s3/x/SecretMount/inner.txt",
    { headers: { Authorization: `Bearer ${await tokenFor("jailbird")}` } },
    env,
  )
  assert.equal(res.status, 404, "cross-storage reads must be denied")
  assert.ok(
    !res.headers.get("location"),
    "no upstream redirect may leak for out-of-base paths",
  )
})

test("Security(P0): admin (base_path=/) keeps full S3 access", async () => {
  await seed()
  const app = makeApp()
  const res = await app.request(
    "/s3/",
    { headers: { Authorization: `Bearer ${await tokenFor("admin")}` } },
    env,
  )
  assert.equal(res.status, 200)
  const body = await res.text()
  assert.ok(body.includes("<Name>x</Name>"), "admin still lists root mounts")
})
