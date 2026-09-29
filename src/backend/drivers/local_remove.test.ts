import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { LocalDriver } from "./local"

async function exists(p: string): Promise<boolean> {
  try {
    await readFile(p)
    return true
  } catch {
    try {
      await import("node:fs/promises").then((fs) => fs.stat(p))
      return true
    } catch {
      return false
    }
  }
}

async function makeDir(): Promise<string> {
  return await mkdtemp(path.join(tmpdir(), "openlist-local-test-"))
}

test("LocalDriver.remove 删除目标项自身", async (t) => {
  const dir = await makeDir()
  t.after(() => rm(dir, { recursive: true, force: true }))
  const file = path.join(dir, "a.txt")
  await writeFile(file, "x")

  const driver = new LocalDriver()
  await driver.remove("/d/a.txt", file, ["a.txt"])

  assert.equal(await exists(file), false, "目标文件应被删除")
})

test("LocalDriver.remove 删除目录", async (t) => {
  const dir = await makeDir()
  t.after(() => rm(dir, { recursive: true, force: true }))
  const sub = path.join(dir, "sub")
  await mkdir(sub)
  await writeFile(path.join(sub, "inner.txt"), "x")

  const driver = new LocalDriver()
  await driver.remove("/d/sub", sub, ["sub"])

  assert.equal(await exists(path.join(sub, "inner.txt")), false, "目录应被删除")
  assert.equal(await exists(sub), false, "目录应被删除")
})

test("LocalDriver.move 移动目标项自身", async (t) => {
  const dir = await makeDir()
  t.after(() => rm(dir, { recursive: true, force: true }))
  const src = path.join(dir, "a.txt")
  const dstDir = path.join(dir, "dst")
  await mkdir(dstDir)
  await writeFile(src, "hello")

  const driver = new LocalDriver()
  await driver.move("/d", "/d/dst", ["a.txt"], src, path.join(dstDir, "a.txt"))

  assert.equal(await exists(src), false, "源文件应被移走")
  assert.equal(
    await readFile(path.join(dstDir, "a.txt"), "utf8"),
    "hello",
    "目标位置应有文件",
  )
})

test("LocalDriver.copy 复制目标项自身", async (t) => {
  const dir = await makeDir()
  t.after(() => rm(dir, { recursive: true, force: true }))
  const src = path.join(dir, "a.txt")
  const dstDir = path.join(dir, "dst")
  await mkdir(dstDir)
  await writeFile(src, "hello")

  const driver = new LocalDriver()
  await driver.copy("/d", "/d/dst", ["a.txt"], src, path.join(dstDir, "a.txt"))

  assert.equal(await exists(src), true, "源文件应保留")
  assert.equal(
    await readFile(path.join(dstDir, "a.txt"), "utf8"),
    "hello",
    "目标位置应有副本",
  )
})
