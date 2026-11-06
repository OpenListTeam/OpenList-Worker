import assert from "node:assert/strict"

import test from "node:test"

import {
  authFailed,
  authLockedFor,
  authSucceeded,
  clientIp,
  resetAuthLimit,
} from "./ratelimit"

const ctx = (ip: string) => ({
  env: {},
  req: {
    header: (name: string) =>
      name.toLowerCase() === "cf-connecting-ip" ? ip : undefined,
  },
})

test("clientIp 优先取 cf-connecting-ip，而不是客户端可伪造的 x-forwarded-for", () => {
  const c = {
    req: {
      header: (name: string) =>
        ({
          "cf-connecting-ip": "1.2.3.4",
          "x-real-ip": "5.6.7.8",
          "x-forwarded-for": "9.9.9.9",
        })[name] as string | undefined,
    },
  }
  assert.equal(clientIp(c), "1.2.3.4")
})

test("同一 IP 连续失败 5 次后锁定", async () => {
  resetAuthLimit()
  const c = ctx("9.9.9.9")
  for (let i = 0; i < 4; i++) await authFailed(c, "")
  assert.equal(await authLockedFor(c, ""), false)
  await authFailed(c, "")
  assert.equal(await authLockedFor(c, ""), true)
})

test("用户名维度独立计数：换 IP 也锁得住同一账号", async () => {
  resetAuthLimit()
  for (let i = 0; i < 5; i++) await authFailed(ctx(`10.0.0.${i}`), "alice")
  assert.equal(await authLockedFor(ctx("10.0.0.200"), "alice"), true)
})

test("锁定到期后计数清零，不会一次失败就再次锁定", async () => {
  resetAuthLimit()
  const c = ctx("8.8.8.8")
  for (let i = 0; i < 5; i++) await authFailed(c, "carol")
  assert.equal(await authLockedFor(c, "carol"), true)

  const realNow = Date.now
  Date.now = () => realNow() + 6 * 60 * 1000
  try {
    assert.equal(await authLockedFor(c, "carol"), false)
    await authFailed(c, "carol")
    // 修复前这里会因为旧计数直接再次锁定
    assert.equal(await authLockedFor(c, "carol"), false)
  } finally {
    Date.now = realNow
    resetAuthLimit()
  }
})

test("认证成功后清空 IP 与用户名两个维度的计数", async () => {
  resetAuthLimit()
  const c = ctx("7.7.7.7")
  for (let i = 0; i < 4; i++) await authFailed(c, "dave")
  authSucceeded(c, "dave")
  for (let i = 0; i < 4; i++) await authFailed(c, "dave")
  assert.equal(await authLockedFor(c, "dave"), false)
})
