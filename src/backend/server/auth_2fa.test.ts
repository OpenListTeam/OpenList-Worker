import assert from "node:assert/strict"
import test from "node:test"
import { Hono } from "hono"
import { sign } from "hono/jwt"
import { saveDb } from "../internal/model/db"
import { authRouter } from "./auth"

test("2fa/generate returns a resolved QR data URL", async () => {
  const env: any = {
    JWT_SECRET: "test-only-jwt-secret",
  }
  await saveDb(
    {
      settings: [],
      users: [
        {
          id: 1,
          username: "admin",
          password: "unused",
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
    { force: true },
  )

  const token = await sign(
    {
      id: 1,
      username: "admin",
      role: 2,
      exp: Math.floor(Date.now() / 1000) + 60,
      jti: "auth-2fa-generate-test",
    },
    env.JWT_SECRET,
  )
  const app = new Hono()
  app.route("/api/auth", authRouter)

  const res = await app.request(
    "/api/auth/2fa/generate",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
    env,
  )
  assert.equal(res.status, 200)
  const json: any = await res.json()
  assert.equal(json.code, 200)
  assert.match(json.data.qr, /^data:image\/png;base64,/)
  assert.match(json.data.secret, /^[A-Z2-7]+$/)
})
