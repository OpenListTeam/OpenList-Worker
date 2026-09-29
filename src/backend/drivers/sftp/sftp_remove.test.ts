import assert from "node:assert/strict"
import { test } from "node:test"
import { SFTPDriver } from "./driver"

/**
 * 调用约定（src/backend/internal/op/storage.ts 的 removeItems/moveItems）：
 *
 *   await driver.remove(virtualPath, resolved.physical, [name])
 *   await driver.move(srcDir, dstDir, [name], srcPhys, dstPhys)
 *
 * 即 physicalPath / srcPhys / dstPhys 都是【目标项自身】的物理路径（已含文件名），
 * driver 不得再把 name 拼接到路径后面，否则会指向 `<item>/<name>`，
 * lstat 查不到 → removeRecursive 静默返回，接口报成功但文件仍在。
 *
 * Node v24 下 mock.module 不可用（需实验标志），且不调 init()（避免真连 SSH）：
 * 注入点是 SFTPClientWrapper.getSFTP() 首行的 sftpClient 缓存（见 sftp/util.ts），
 * 把 fake sftp 对象挂上去，removeRecursive/rename 走的回调式方法全部命中 fake，不触网。
 * 只影响本用例新建的 driver 实例，不污染全局。
 */

function makeDriverWithFakeSFTP(fake: any): SFTPDriver {
  const driver = new SFTPDriver({
    address: "127.0.0.1:22",
    username: "root",
    password: "x",
  })
  ;(driver as any).client["sftpClient"] = fake
  return driver
}

test("SFTP remove() 对项自身路径调用 lstat/unlink，不拼接 name", async () => {
  const calls: string[] = []
  const driver = makeDriverWithFakeSFTP({
    lstat: (p: string, cb: any) => {
      calls.push(`lstat ${p}`)
      cb(null, { isDirectory: () => false })
    },
    readdir: (p: string, cb: any) => {
      calls.push(`readdir ${p}`)
      cb(null, [])
    },
    unlink: (p: string, cb: any) => {
      calls.push(`unlink ${p}`)
      cb(null)
    },
    rmdir: (p: string, cb: any) => {
      calls.push(`rmdir ${p}`)
      cb(null)
    },
  })

  await driver.remove("/d/a.txt", "/d/a.txt", ["a.txt"])

  assert.deepEqual(
    calls,
    ["lstat /d/a.txt", "unlink /d/a.txt"],
    "remove 应直接作用于项自身路径（fake 必须被调用，否则注入未生效）",
  )
  assert.ok(
    !calls.some((c) => c.includes("a.txt/a.txt")),
    `路径不得出现二次拼接的 a.txt/a.txt，实际：${calls.join(", ")}`,
  )
})

test("SFTP move() 把源/目标项自身路径传给 rename", async () => {
  const calls: string[] = []
  const driver = makeDriverWithFakeSFTP({
    rename: (a: string, b: string, cb: any) => {
      calls.push(`rename ${a} -> ${b}`)
      cb(null)
    },
  })

  await driver.move("/d", "/d/bak", ["a.txt"], "/d/a.txt", "/d/bak/a.txt")

  assert.deepEqual(
    calls,
    ["rename /d/a.txt -> /d/bak/a.txt"],
    "rename 的两个参数必须是源/目标项自身路径（fake 必须被调用，否则注入未生效）",
  )
})
