import assert from "node:assert/strict"
import { test } from "node:test"
import { isDbShell } from "./db"

/**
 * 回归测试：写前守卫的「空壳判定」。
 *
 * 背景（必须长期守护的约束）：
 *   读取持久化存储失败时，loadDb() 会回退到默认（空）库。历史上
 *   ensureDefaultSettings() 会隐式 saveDb()，把这个空壳写回存储，导致真实配置
 *   被覆盖、系统反复回到「未初始化」——用户看到的就是「数据库被清空」。
 *
 *   saveDb() 现在依据 isDbShell() 判定是否为空壳，并拒绝在「不可信」状态下写入。
 *   因此 isDbShell() 的语义必须稳定：既不能把有数据的库误判为空壳（会阻断正常写入），
 *   也不能把空壳误判为有数据（会让守卫失效）。
 */

const FULL_DB = {
  settings: [{ key: "site_title", value: "My Cloud Drive" }],
  users: [
    { id: 1, username: "admin", role: 2, password: "hashed" },
    { id: 2, username: "guest", role: 1, password: "" },
  ],
  storages: [{ id: 1, mount_path: "/onedrive", driver: "onedrive" }],
  shares: [],
  metas: [],
  plugins: [],
}

test("isDbShell: 含存储挂载的库不是空壳", () => {
  assert.equal(isDbShell(FULL_DB), false)
})

test("isDbShell: 仅有管理员占位用户（未设密码）的库仍是空壳", () => {
  // defaultDb 自带 admin/guest 占位用户且密码为空，不能被误判为「有数据的真实库」。
  assert.equal(
    isDbShell({
      settings: [],
      users: [
        { id: 1, username: "admin", role: 2, password: "" },
        { id: 2, username: "guest", role: 1, password: "" },
      ],
      storages: [],
    }),
    true,
  )
})

test("isDbShell: 已设置密码的用户说明库已初始化，不是空壳", () => {
  assert.equal(
    isDbShell({
      settings: [],
      users: [{ id: 1, username: "admin", role: 2, password: "hashed" }],
      storages: [],
    }),
    false,
  )
})

test("isDbShell: 仅有分享/元数据/插件的库不是空壳", () => {
  assert.equal(isDbShell({ shares: [{ id: 1 }] }), false)
  assert.equal(isDbShell({ metas: [{ id: 1 }] }), false)
  assert.equal(isDbShell({ plugins: [{ id: 1 }] }), false)
})

test("isDbShell: 默认空库（defaultDb 克隆）被判定为空壳", () => {
  // 与 loadDb() 的兜底分支形状一致：各实体均为空数组。
  const shell = {
    settings: [{ key: "site_title", value: "OpenList" }],
    users: [],
    storages: [],
    shares: [],
    metas: [],
    plugins: [],
  }
  assert.equal(isDbShell(shell), true)
})

test("isDbShell: 空数组/纯空对象的极端输入视为空壳", () => {
  assert.equal(isDbShell({ settings: [], users: [], storages: [] }), true)
  assert.equal(isDbShell({}), true)
})

test("isDbShell: 非对象输入视为空壳（防御性）", () => {
  assert.equal(isDbShell(null), true)
  assert.equal(isDbShell(undefined), true)
  assert.equal(isDbShell("db"), true)
  assert.equal(isDbShell(123), true)
})

test("isDbShell: 已修改过设置（非默认值）的库不算空壳", () => {
  // 用户只改过设置、尚未添加任何挂载时，也不应被误判为空壳而阻断保存。
  const settingsOnly = {
    settings: [{ key: "site_title", value: "用户自定义站点标题" }],
    users: [],
    storages: [],
    shares: [],
    metas: [],
    plugins: [],
  }
  assert.equal(isDbShell(settingsOnly), false)
})
