import assert from "node:assert/strict"
import { test } from "node:test"
import { FTPDriver } from "./driver"

/**
 * 调用约定（src/backend/internal/op/storage.ts 的 removeItems/moveItems）：
 *
 *   await driver.remove(virtualPath, resolved.physical, [name])
 *   await driver.move(srcDir, dstDir, [name], srcPhys, dstPhys)
 *
 * 即 physicalPath / srcPhys / dstPhys 都是【目标项自身】的物理路径（已含文件名），
 * driver 不得再把 name 拼接到路径后面，否则会指向 `<item>/<name>`，
 * removeRecursive/rename 打到不存在的路径 → 静默失败。
 *
 * Node v24 下 mock.module 不可用（需实验标志），且不调 init()（否则真连 TCP）：
 * 用注入私有 client 的方式（同 dropbox/driver.test.ts 先例），替换 driver.client
 * 为 fake 对象，全程不建立网络连接。只影响本用例新建的 driver 实例，不污染全局。
 */

function makeDriverWithFakeClient(calls: string[]): FTPDriver {
  const driver = new FTPDriver({
    address: "127.0.0.1:21",
    username: "u",
    password: "p",
  })
  ;(driver as any).client = {
    removeRecursive: async (p: string) => {
      calls.push(`rm ${p}`)
    },
    rename: async (s: string, d: string) => {
      calls.push(`mv ${s} -> ${d}`)
    },
  }
  return driver
}

test("FTP remove() 删除项自身路径，不拼接 name", async () => {
  const calls: string[] = []
  const driver = makeDriverWithFakeClient(calls)

  await driver.remove("/d/a.txt", "/d/a.txt", ["a.txt"])

  assert.deepEqual(
    calls,
    ["rm /d/a.txt"],
    "removeRecursive 应收到项自身路径（fake 必须被调用，否则注入未生效）",
  )
  assert.ok(
    !calls.some((c) => c.includes("a.txt/a.txt")),
    `路径不得出现二次拼接的 a.txt/a.txt，实际：${calls.join(", ")}`,
  )
})

test("FTP move() 把源/目标项自身路径传给 rename", async () => {
  const calls: string[] = []
  const driver = makeDriverWithFakeClient(calls)

  await driver.move("/d", "/d/bak", ["a.txt"], "/d/a.txt", "/d/bak/a.txt")

  assert.deepEqual(
    calls,
    ["mv /d/a.txt -> /d/bak/a.txt"],
    "rename 的两个参数必须是源/目标项自身路径（fake 必须被调用，否则注入未生效）",
  )
})
