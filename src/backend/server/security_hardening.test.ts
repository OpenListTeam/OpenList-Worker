import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { sign } from "hono/jwt"
import { getDb, saveDb } from "../internal/model/db"
import { meHandler } from "./auth"
import { passwordStampOf, setUserPassword } from "../pkg/password"
import {
  getActualPath,
  isWithinUserRoot,
  normalizeSegments,
} from "../pkg/permission"
import { readBodyWithinLimit } from "../pkg/upload-limit"
import { userRouter } from "./user"
import { fsRouter } from "./fs"
import { resolveShare } from "../internal/op/share"
import { canonicalizeVirtualPath, getMaxPathDepth } from "../pkg/path"
import {
  extractZipEntry,
  getZipLimits,
  parseZip,
} from "../internal/archive/zip"
import { webdavRouter } from "./webdav"

/**
 * 本轮安全加固的回归测试：
 *   1. 管理员用户管理接口的角色保护（对齐 Go handles/user.go + op/user.go）；
 *   2. 密码指纹（对齐 Go common.UserClaims.PwdTS）—— 改密后旧令牌立即失效。
 */

const env: any = { JWT_SECRET: "test-only-jwt-secret-for-hardening" }
const ADMIN_TOKEN = "HARDENING_STATIC_TOKEN"

const seed = (users: any[], settings: any[] = []) =>
  saveDb({ settings, users, storages: [], shares: [] }, env, { force: true })

const adminUser = (overrides: any = {}) => ({
  id: 1,
  username: "admin",
  password: "",
  salt: "",
  role: 2,
  permission: 0,
  base_path: "/",
  disabled: false,
  pwd_update_at: new Date().toISOString(),
  ...overrides,
})

function adminApp() {
  const app = new Hono()
  app.route("/api/admin/user", userRouter)
  return app
}

const adminHeaders = {
  "Content-Type": "application/json",
  Authorization: ADMIN_TOKEN,
}

test("user/create rejects admin and guest roles", async () => {
  await seed([adminUser()], [{ key: "token", value: ADMIN_TOKEN }])
  const app = adminApp()

  for (const role of [1, 2]) {
    const res = await app.request("/api/admin/user/create", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ username: `u${role}`, role }),
    })
    assert.equal(res.status, 400, `role=${role} must be rejected`)
    const json: any = await res.json()
    assert.equal(json.message, "admin or guest user can not be created")
  }

  const ok = await app.request("/api/admin/user/create", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ username: "normal", role: 0, password: "p@ssw0rd" }),
  })
  assert.equal(ok.status, 200)
})

test("user/update forbids role changes and disabling the admin account", async () => {
  await seed(
    [
      adminUser(),
      {
        id: 5,
        username: "someone",
        password: "",
        salt: "",
        role: 0,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
    ],
    [{ key: "token", value: ADMIN_TOKEN }],
  )
  const app = adminApp()

  const promote = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ id: 5, role: 2 }),
  })
  assert.equal(promote.status, 400)
  assert.equal(
    ((await promote.json()) as any).message,
    "role can not be changed",
  )

  const demote = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ id: 1, role: 0 }),
  })
  assert.equal(demote.status, 400)

  const disableAdmin = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ id: 1, disabled: true }),
  })
  assert.equal(disableAdmin.status, 400)
  assert.equal(
    ((await disableAdmin.json()) as any).message,
    "admin user can not be disabled",
  )

  // 允许的更新：权限位 / base_path / 禁用普通用户
  const ok = await app.request("/api/admin/user/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      id: 5,
      permission: 8,
      base_path: "/data",
      disabled: true,
    }),
  })
  assert.equal(ok.status, 200)
})

test("user/delete protects admin and guest by role, not by hardcoded id", async () => {
  await seed(
    [
      adminUser(),
      {
        id: 2,
        username: "guest",
        password: "",
        salt: "",
        role: 1,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
      {
        // 迁移/多管理员场景：id 不等于 1 的管理员同样必须受保护
        id: 7,
        username: "second-admin",
        password: "",
        salt: "",
        role: 2,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
      {
        id: 9,
        username: "normal",
        password: "",
        salt: "",
        role: 0,
        permission: 0,
        base_path: "/",
        disabled: false,
        pwd_update_at: new Date().toISOString(),
      },
    ],
    [{ key: "token", value: ADMIN_TOKEN }],
  )
  const app = adminApp()

  for (const id of [1, 2, 7]) {
    const res = await app.request(`/api/admin/user/delete?id=${id}`, {
      method: "POST",
      headers: adminHeaders,
    })
    assert.equal(res.status, 400, `id=${id} must be protected`)
    assert.equal(
      ((await res.json()) as any).message,
      "cannot delete admin or guest",
    )
  }

  const del = await app.request("/api/admin/user/delete?id=9", {
    method: "POST",
    headers: adminHeaders,
  })
  assert.equal(del.status, 200)
  const db: any = await getDb(env)
  assert.equal(
    db.users.some((u: any) => u.id === 9),
    false,
    "a normal user must still be deletable",
  )
})

test("password change invalidates previously issued tokens (Go PwdTS parity)", async () => {
  await seed([adminUser()])
  const db: any = await getDb(env)
  const admin = db.users.find((u: any) => u.username === "admin")

  const app = new Hono()
  app.get("/me", meHandler)

  const tokenBefore = await sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      pwd_ts: passwordStampOf(admin),
      exp: Math.floor(Date.now() / 1000) + 600,
      jti: "pwd-ts-before",
    },
    env.JWT_SECRET,
  )
  const before = await app.request(
    "/me",
    { headers: { Authorization: `Bearer ${tokenBefore}` } },
    env,
  )
  assert.equal(before.status, 200, "token issued before the change must work")

  // 改密（Go: SetPassword 会刷新 PwdTS）
  await setUserPassword(admin, "brand-new-password")
  await saveDb(db, env, { force: true })

  const after = await app.request(
    "/me",
    { headers: { Authorization: `Bearer ${tokenBefore}` } },
    env,
  )
  assert.equal(
    after.status,
    401,
    "token issued before the change must be rejected",
  )

  const tokenAfter = await sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      pwd_ts: passwordStampOf(admin),
      exp: Math.floor(Date.now() / 1000) + 600,
      jti: "pwd-ts-after",
    },
    env.JWT_SECRET,
  )
  const fresh = await app.request(
    "/me",
    { headers: { Authorization: `Bearer ${tokenAfter}` } },
    env,
  )
  assert.equal(fresh.status, 200, "a fresh token must work")
})

test("normalizeSegments / getActualPath / isWithinUserRoot 钳制越根遍历", () => {
  // 显式锁定越根钳制语义（评审建议补的用例）
  assert.equal(normalizeSegments("/a/../../b"), "/b")
  assert.equal(normalizeSegments("/a/b/../c"), "/a/c")
  assert.equal(normalizeSegments("../../etc/passwd"), "/etc/passwd")
  assert.equal(normalizeSegments("//a///b/./c"), "/a/b/c")
  assert.equal(normalizeSegments(""), "/")

  // base_path 受限：先折叠 reqPath 再拼接，`..` 不得越过用户根
  const user = { id: 9, role: 0, permission: 0, base_path: "/photos/alice" }
  assert.equal(getActualPath(user, "/"), "/photos/alice")
  assert.equal(getActualPath(user, "/sub/x"), "/photos/alice/sub/x")
  assert.equal(getActualPath(user, "/../bob/x"), "/photos/alice/bob/x")
  assert.equal(getActualPath(user, "/sub/../../bob"), "/photos/alice/bob")

  // 范围复核：等于根本身或位于其下为真，越过为假
  assert.equal(isWithinUserRoot(user, "/photos/alice"), true)
  assert.equal(isWithinUserRoot(user, "/photos/alice/a/b"), true)
  assert.equal(isWithinUserRoot(user, "/photos/bob"), false)
  assert.equal(isWithinUserRoot(user, "/photos/alice/../bob"), false)
  // base_path 为根的用户不受限制
  assert.equal(
    isWithinUserRoot({ id: 1, role: 2, permission: 0, base_path: "/" }, "/any"),
    true,
  )
})

test("readBodyWithinLimit 按实际字节数生效（省略 Content-Length 也不例外）", async () => {
  const env: any = { MAX_UPLOAD: "8" }
  const fakeCtx = (body: string, headers: Record<string, string> = {}) => ({
    env,
    req: {
      header: (k: string) =>
        headers[k] ?? headers[k.toLowerCase()] ?? headers[k.toUpperCase()],
      arrayBuffer: async () => new TextEncoder().encode(body).buffer,
    },
  })

  // 声明超限：预检即拒绝
  const declared = await readBodyWithinLimit(
    fakeCtx("123456789", { "Content-Length": "9" }),
    false,
  )
  assert.equal(declared.ok, false)

  // 省略 Content-Length：必须按实际字节数拒绝（历史缺陷：直接放行）
  const omitted = await readBodyWithinLimit(fakeCtx("123456789"), false)
  assert.equal(omitted.ok, false)
  if (!omitted.ok) assert.equal(omitted.limit, 8)

  // 未超限：放行且内容完整
  const ok = await readBodyWithinLimit(
    fakeCtx("1234", { "Content-Length": "4" }),
    false,
  )
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.buffer.length, 4)

  // 分片上限（MAX_UPPART）独立于整体上限：未配置时用默认 16MB
  const part = await readBodyWithinLimit(fakeCtx("123456789"), true)
  assert.equal(part.ok, true)

  // 显式配置分片上限同样按实际字节数判定
  const partEnv: any = { MAX_UPPART: "2" }
  const partCtx = {
    env: partEnv,
    req: {
      header: () => undefined,
      arrayBuffer: async () => new TextEncoder().encode("123").buffer,
    },
  }
  const partTooLarge = await readBodyWithinLimit(partCtx, true)
  assert.equal(partTooLarge.ok, false)
})

test("WebDAV: 受 meta 保护的路径返回带指引的 403（而不是裸 403）", async () => {
  const env: any = { JWT_SECRET: "test-only-jwt-secret-for-hardening" }
  const davUser: any = {
    id: 11,
    username: "dav-user",
    role: 0,
    permission: 1 << 8, // WEBDAV_READ
    base_path: "/",
    disabled: false,
    pwd_update_at: new Date().toISOString(),
  }
  await setUserPassword(davUser, "dav-pass")
  await saveDb(
    {
      settings: [],
      users: [davUser],
      storages: [],
      shares: [],
      metas: [
        {
          id: 1,
          path: "/secret",
          password: "meta-pass",
          p_sub: true,
          read_users: [],
          read_users_sub: false,
          write_users: [],
          write_users_sub: false,
          write: false,
          w_sub: false,
          hide: "",
          h_sub: false,
          readme: "",
          r_sub: false,
          header: "",
          header_sub: false,
        },
      ],
    },
    env,
    { force: true },
  )

  const app = new Hono()
  app.route("/dav", webdavRouter)
  const basic = "Basic " + Buffer.from("dav-user:dav-pass").toString("base64")

  // 账号本身有 WEBDAV_READ，但该路径带目录密码 → 元信息 ACL 拦截
  const res = await app.request(
    "/dav/secret",
    { method: "PROPFIND", headers: { Authorization: basic, Depth: "1" } },
    env,
  )
  assert.equal(res.status, 403)
  const body = await res.text()
  // 附带给用户可操作的指引（评审建议），且不指明具体是哪一类限制
  assert.match(body, /directory-level access control/)
  assert.match(body, /meta password/)
  assert.match(body, /web UI|api\/fs/)
})

test("encoded dot segments are canonicalized before ACL and storage checks", () => {
  const user = { id: 9, role: 0, permission: 0, base_path: "/photos/alice" }
  assert.equal(getActualPath(user, "/%2e%2e/bob"), "/photos/alice/bob")
  assert.equal(getActualPath(user, "/%252e%252e/bob"), "/photos/alice/bob")
  assert.equal(isWithinUserRoot(user, "/photos/alice/%2e%2e/bob"), false)
  assert.equal(isWithinUserRoot(user, "/photos/alice/%252e%252e/bob"), false)
})

test("share resolution rejects encoded traversal outside the shared root", async () => {
  await saveDb(
    {
      settings: [],
      users: [],
      storages: [],
      shares: [
        {
          id: "share-1",
          files: ["/share/a.txt", "/share/b.txt"],
          disabled: false,
          expires: null,
          pwd: "",
          max_accessed: 0,
          accessed: 0,
        },
      ],
    },
    env,
    { force: true },
  )

  assert.equal((await resolveShare("/@s/share-1", "", env)).ok, true)
  assert.equal(
    (await resolveShare("/@s/share-1/a.txt/%2e%2e/secret", "", env)).ok,
    false,
  )
  assert.equal(
    (await resolveShare("/@s/share-1/a.txt/%252e%252e/secret", "", env)).ok,
    false,
  )
})

test("batch_rename rejects encoded traversal in src_name and new_name", async () => {
  await seed([adminUser()], [{ key: "token", value: ADMIN_TOKEN }])
  const app = new Hono()
  app.route("/api/fs", fsRouter)

  for (const rename_objects of [
    [{ src_name: "%2e%2e", new_name: "safe.txt" }],
    [{ src_name: "%252e%252e", new_name: "safe.txt" }],
    [{ src_name: "safe.txt", new_name: "%2e%2e" }],
  ]) {
    const res = await app.request(
      "/api/fs/batch_rename",
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ src_dir: "/", rename_objects }),
      },
      env,
    )
    assert.equal(res.status, 400)
  }
})

test("WebDAV PUT enforces MAX_UPLOAD before reading the body", async () => {
  const davEnv: any = {
    JWT_SECRET: "test-only-jwt-secret-for-hardening",
    MAX_UPLOAD: "4",
  }
  const user: any = {
    id: 12,
    username: "dav-put-user",
    role: 0,
    permission: 1 << 9,
    base_path: "/",
    disabled: false,
    pwd_update_at: new Date().toISOString(),
  }
  await setUserPassword(user, "dav-pass")
  await saveDb(
    {
      settings: [],
      users: [user],
      storages: [],
      shares: [],
      metas: [],
    },
    davEnv,
    { force: true },
  )

  const app = new Hono()
  app.route("/dav", webdavRouter)
  const basic =
    "Basic " + Buffer.from("dav-put-user:dav-pass").toString("base64")
  const res = await app.request(
    "/dav/file.txt",
    {
      method: "PUT",
      headers: { Authorization: basic, "Content-Length": "9" },
      body: "123456789",
    },
    davEnv,
  )
  assert.equal(res.status, 413)
})

// ── review follow-up: 统一路径规范化 / ZIP 限制 / WebDAV 空白密码 ──

test("canonicalizeVirtualPath: 宽松折叠与严格拒绝选项", () => {
  assert.equal(canonicalizeVirtualPath("/a//b/./c"), "/a/b/c")
  assert.equal(canonicalizeVirtualPath("/a/%2e%2e/b"), "/b")
  assert.equal(canonicalizeVirtualPath("/a/%252e%252e/b"), "/b")

  assert.throws(
    () => canonicalizeVirtualPath("/a/%2e%2e/b", { rejectTraversal: true }),
    /traversal/,
  )
  assert.throws(
    () => canonicalizeVirtualPath("C:/windows", { rejectAbsolute: true }),
    /Windows/,
  )
  assert.throws(
    () => canonicalizeVirtualPath("//server/share", { rejectAbsolute: true }),
    /UNC/,
  )
  assert.throws(
    () => canonicalizeVirtualPath("/a/\0/b", { rejectIllegalChars: true }),
    /illegal character/,
  )
  assert.throws(
    () => canonicalizeVirtualPath("/a/b/c", { maxDepth: 2 }),
    /maximum depth/,
  )
  assert.equal(getMaxPathDepth({ MAX_PATH_DEPTH: "3" }), 3)
  assert.equal(getMaxPathDepth({ MAX_PATH_DEPTH: "0" }), 128)
  assert.throws(
    () =>
      canonicalizeVirtualPath("/a/b/c", {
        maxDepth: getMaxPathDepth({ MAX_PATH_DEPTH: "2" }),
      }),
    /maximum depth/,
  )
})

function makeStoredZip(
  files: { name: string; data: Uint8Array }[],
): ArrayBuffer {
  const enc = new TextEncoder()
  const body: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = enc.encode(file.name)
    const data = file.data
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(8, 0, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)
    body.push(local, data)

    const cd = new Uint8Array(46 + name.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    cd.set(name, 46)
    central.push(cd)
    offset += local.length + data.length
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)

  const parts = [...body, ...central, eocd]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return out.buffer
}

test("ZIP 限制可通过环境变量收紧，并同时约束条目数与解压大小", async () => {
  const zip = makeStoredZip([
    { name: "a.txt", data: new Uint8Array([1, 2]) },
    { name: "b.txt", data: new Uint8Array([3, 4]) },
  ])

  assert.equal(parseZip(zip).entries.length, 2)
  assert.equal(
    getZipLimits({ MAX_ZIP_ENTRIES: "1", MAX_ZIP_ENTRY_UNCOMPRESSED: "1" })
      .maxEntries,
    1,
  )
  assert.throws(
    () => parseZip(zip, { MAX_ZIP_ENTRIES: "1" }),
    /too many entries/,
  )

  const archive = parseZip(zip, { MAX_ZIP_ENTRIES: "10" })
  await assert.rejects(
    () =>
      extractZipEntry(zip, archive.entries[0], {
        MAX_ZIP_ENTRY_UNCOMPRESSED: "1",
      }),
    /exceeds the uncompressed size limit/,
  )
})

test("WebDAV 拒绝空密码与纯空格 Basic 密码", async () => {
  const davEnv: any = { JWT_SECRET: "test-only-jwt-secret-for-hardening" }
  const user: any = {
    id: 13,
    username: "dav-empty-pass",
    role: 0,
    permission: 1 << 8,
    base_path: "/",
    disabled: false,
    pwd_update_at: new Date().toISOString(),
  }
  await setUserPassword(user, "dav-pass")
  await saveDb(
    {
      settings: [],
      users: [user],
      storages: [],
      shares: [],
      metas: [],
    },
    davEnv,
    { force: true },
  )

  const app = new Hono()
  app.route("/dav", webdavRouter)
  for (const password of ["", "   "]) {
    const basic =
      "Basic " + Buffer.from(`dav-empty-pass:${password}`).toString("base64")
    const res = await app.request(
      "/dav/",
      {
        method: "PROPFIND",
        headers: { Authorization: basic, Depth: "0" },
      },
      davEnv,
    )
    assert.equal(res.status, 401, `password=${JSON.stringify(password)}`)
  }
})
