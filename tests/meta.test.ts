import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  getNearestMeta,
  metaCoversPath,
  canAccess,
  canRead,
  canWrite,
  canWriteContentBypassUserPerms,
  getReadme,
  getHeader,
  isHidden,
  validateHide,
} from "../src/backend/pkg/meta"
import type { Meta } from "../src/backend/pkg/meta"
import type { UserPermissionObj } from "../src/backend/pkg/permission"

describe("meta.ts - metaCoversPath", () => {
  test("精确匹配（大小写不敏感）", () => {
    assert.equal(metaCoversPath("/a/b", "/a/b", false), true)
    assert.equal(metaCoversPath("/a/B", "/a/b", false), true)
    assert.equal(metaCoversPath("/a/b", "/a/B", false), true)
  })

  test("不开启 sub 不覆盖子目录", () => {
    assert.equal(metaCoversPath("/a", "/a/b", false), false)
    assert.equal(metaCoversPath("/a", "/a/b/c", false), false)
  })

  test("开启 sub 覆盖子目录", () => {
    assert.equal(metaCoversPath("/a", "/a/b", true), true)
    assert.equal(metaCoversPath("/a", "/a/b/c", true), true)
    assert.equal(metaCoversPath("/a", "/b", true), false)
  })

  test("根目录", () => {
    assert.equal(metaCoversPath("/", "/a", true), true)
    assert.equal(metaCoversPath("/", "/", false), true)
  })
})

describe("meta.ts - canAccess", () => {
  const user: UserPermissionObj = { id: 1, username: "user1", role: 0, permission: 0 }
  const admin: UserPermissionObj = { id: 2, username: "admin", role: 2, permission: 0 }

  test("无 meta → 允许", () => {
    assert.equal(canAccess(user, null, "/a", ""), true)
  })

  test("管理员无视所有限制", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "secret",
      p_sub: true,
      read_users: [999],
      read_users_sub: true,
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
    }
    assert.equal(canAccess(admin, meta, "/a/b", "wrong"), true)
  })

  test("密码保护：密码错误 → 拒绝", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "correct",
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
    }
    assert.equal(canAccess(user, meta, "/a/b", "wrong"), false)
    assert.equal(canAccess(user, meta, "/a/b", "correct"), true)
  })

  test("read_users 白名单：用户不在列表 → 拒绝", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [10, 20],
      read_users_sub: true,
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
    }
    assert.equal(canAccess(user, meta, "/a/b", ""), false)
    const user10: UserPermissionObj = { id: 10, username: "user10", role: 0, permission: 0 }
    assert.equal(canAccess(user10, meta, "/a/b", ""), true)
  })
})

describe("meta.ts - canRead / canWrite", () => {
  const user1: UserPermissionObj = { id: 1, username: "user1", role: 0, permission: 0 }
  const user2: UserPermissionObj = { id: 2, username: "user2", role: 0, permission: 0 }
  const admin: UserPermissionObj = { id: 999, username: "admin", role: 2, permission: 0 }

  test("canRead：read_users 白名单", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [1],
      read_users_sub: true,
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
    }
    assert.equal(canRead(user1, meta, "/a/b"), true)
    assert.equal(canRead(user2, meta, "/a/b"), false)
    assert.equal(canRead(admin, meta, "/a/b"), true)
    assert.equal(canRead(null, meta, "/a/b"), true) // nil user 无视限制
  })

  test("canWrite：write_users 白名单", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [],
      read_users_sub: false,
      write_users: [1],
      write_users_sub: true,
      write: false,
      w_sub: false,
      hide: "",
      h_sub: false,
      readme: "",
      r_sub: false,
      header: "",
      header_sub: false,
    }
    assert.equal(canWrite(user1, meta, "/a/b"), true)
    assert.equal(canWrite(user2, meta, "/a/b"), false)
    assert.equal(canWrite(admin, meta, "/a/b"), true)
  })
})

describe("meta.ts - canWriteContentBypassUserPerms", () => {
  test("meta.write + w_sub 开启 → 绕过", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [],
      read_users_sub: false,
      write_users: [],
      write_users_sub: false,
      write: true,
      w_sub: true,
      hide: "",
      h_sub: false,
      readme: "",
      r_sub: false,
      header: "",
      header_sub: false,
    }
    assert.equal(canWriteContentBypassUserPerms(meta, "/a/b"), true)
    assert.equal(canWriteContentBypassUserPerms(meta, "/a"), true)
    assert.equal(canWriteContentBypassUserPerms(meta, "/b"), false)
  })

  test("write 关闭 → 不绕过", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [],
      read_users_sub: false,
      write_users: [],
      write_users_sub: false,
      write: false,
      w_sub: true,
      hide: "",
      h_sub: false,
      readme: "",
      r_sub: false,
      header: "",
      header_sub: false,
    }
    assert.equal(canWriteContentBypassUserPerms(meta, "/a/b"), false)
  })
})

describe("meta.ts - getReadme / getHeader", () => {
  test("r_sub / header_sub 控制子目录继承", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [],
      read_users_sub: false,
      write_users: [],
      write_users_sub: false,
      write: false,
      w_sub: false,
      hide: "",
      h_sub: false,
      readme: "readme content",
      r_sub: true,
      header: "header html",
      header_sub: false,
    }
    assert.equal(getReadme(meta, "/a/b"), "readme content")
    assert.equal(getReadme(meta, "/a"), "readme content")
    assert.equal(getReadme(meta, "/b"), "")

    assert.equal(getHeader(meta, "/a"), "header html")
    assert.equal(getHeader(meta, "/a/b"), "") // header_sub = false
  })
})

describe("meta.ts - isHidden", () => {
  test("hide 正则匹配 → 隐藏", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [],
      read_users_sub: false,
      write_users: [],
      write_users_sub: false,
      write: false,
      w_sub: false,
      hide: "^\\..*\n.*\\.tmp$",
      h_sub: true,
      readme: "",
      r_sub: false,
      header: "",
      header_sub: false,
    }
    assert.equal(isHidden(meta, "/a/b", ".hidden"), true)
    assert.equal(isHidden(meta, "/a/b", "file.tmp"), true)
    assert.equal(isHidden(meta, "/a/b", "normal.txt"), false)
  })

  test("h_sub 控制子目录", () => {
    const meta: Meta = {
      id: 1,
      path: "/a",
      password: "",
      p_sub: false,
      read_users: [],
      read_users_sub: false,
      write_users: [],
      write_users_sub: false,
      write: false,
      w_sub: false,
      hide: "secret",
      h_sub: false,
      readme: "",
      r_sub: false,
      header: "",
      header_sub: false,
    }
    assert.equal(isHidden(meta, "/a", "secret.txt"), true)
    assert.equal(isHidden(meta, "/a/b", "secret.txt"), false) // h_sub = false
  })
})

describe("meta.ts - validateHide", () => {
  test("合法正则", () => {
    assert.equal(validateHide("^\\..*"), null)
    assert.equal(validateHide(".*\\.tmp$\n^\\.git"), null)
  })

  test("非法正则", () => {
    assert.equal(validateHide("(unclosed"), "(unclosed")
    assert.equal(validateHide("valid\n[invalid"), "[invalid")
  })

  test("空 / null", () => {
    assert.equal(validateHide(""), null)
    assert.equal(validateHide("  \n  "), null)
  })
})
