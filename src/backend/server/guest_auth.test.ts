import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { getUserFromContext } from "./middlewares"
import { authRouter, hashPassword } from "./auth"
import { fsRouter } from "./fs"
import { publicRouter } from "./public"
import { rawRouter } from "./raw"
import { saveDb } from "../internal/model/db"

test("Security: getUserFromContext returns null when guest is deleted or disabled and no token is provided", async () => {
  // Setup DB with only admin (guest deleted)
  const env: any = {}
  const adminHash = await hashPassword("admin123")
  const dbOnlyAdmin = {
    settings: [],
    users: [
      {
        id: 1,
        username: "admin",
        password: adminHash,
        role: 2,
        permission: 0,
        base_path: "/",
        disabled: false,
      },
    ],
    storages: [],
    shares: [],
  }
  await saveDb(dbOnlyAdmin, env)

  const dummyContextNoToken: any = {
    req: {
      header: (name: string) => undefined,
      query: (name: string) => undefined,
    },
    env,
  }

  const user = await getUserFromContext(dummyContextNoToken)
  assert.equal(user, null, "User should be null when guest account is deleted")

  // Setup DB with guest disabled
  const dbGuestDisabled = {
    settings: [],
    users: [
      {
        id: 1,
        username: "admin",
        password: adminHash,
        role: 2,
        permission: 0,
        base_path: "/",
        disabled: false,
      },
      {
        id: 2,
        username: "guest",
        password: "",
        role: 1,
        permission: 0,
        base_path: "/",
        disabled: true,
      },
    ],
    storages: [],
    shares: [],
  }
  await saveDb(dbGuestDisabled, env)

  const userDisabled = await getUserFromContext(dummyContextNoToken)
  assert.equal(
    userDisabled,
    null,
    "User should be null when guest account is disabled",
  )
})

test("Security: /api/me returns 401 when unauthenticated and guest is deleted or disabled", async () => {
  const env: any = {}
  const adminHash = await hashPassword("admin123")
  await saveDb(
    {
      settings: [],
      users: [
        {
          id: 1,
          username: "admin",
          password: adminHash,
          role: 2,
          permission: 0,
          base_path: "/",
          disabled: false,
        },
      ],
      storages: [],
      shares: [],
    },
    env,
  )

  const app = new Hono()
  app.route("/api/me", authRouter)

  const res = await app.request("/api/me/me", {
    method: "GET",
  })
  assert.equal(res.status, 401, "Expected HTTP 401 for anonymous /api/me")
  const json: any = await res.json()
  assert.equal(json.code, 401)
})

test("Security: /api/public/settings returns allow_guest 'false' when guest is deleted or disabled", async () => {
  const env: any = {}
  await saveDb(
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
      ],
      storages: [],
      shares: [],
    },
    env,
  )

  const app = new Hono()
  app.route("/api/public", publicRouter)

  const res = await app.request("/api/public/settings", {
    method: "GET",
  })
  assert.equal(res.status, 200)
  const json: any = await res.json()
  assert.equal(
    json.data.allow_guest,
    "false",
    "allow_guest must be false when guest user is deleted",
  )
})

test("Security: /api/fs/list returns 401 when unauthenticated and guest is deleted or disabled", async () => {
  const env: any = {}
  await saveDb(
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
      ],
      storages: [],
      shares: [],
    },
    env,
  )

  const app = new Hono()
  app.route("/api/fs", fsRouter)

  const res = await app.request("/api/fs/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/" }),
  })
  assert.equal(res.status, 401, "Expected HTTP 401 for anonymous /api/fs/list")
  const json: any = await res.json()
  assert.equal(json.code, 401)
})

test("Security: /raw/* returns 401 when unauthenticated and guest is deleted or disabled", async () => {
  const env: any = {}
  await saveDb(
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
      ],
      storages: [],
      shares: [],
    },
    env,
  )

  const app = new Hono()
  app.route("/raw", rawRouter)

  const res = await app.request("/raw/some/file.txt", {
    method: "GET",
  })
  assert.equal(res.status, 401, "Expected HTTP 401 for anonymous /raw/*")
})
