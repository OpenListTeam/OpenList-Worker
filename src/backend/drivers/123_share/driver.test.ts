import test from "node:test"
import assert from "node:assert/strict"
import { Pan123ShareDriver } from "./driver"
import { Pan123ShareAddition } from "./types"
import { crc32, signPath } from "./util"

test("123PanShare CRC32 and path signing", () => {
  const c = crc32("test_string")
  assert.ok(c > 0)

  const [k, v] = signPath("/share/get")
  assert.ok(k)
  assert.ok(v)
})

test("Pan123ShareDriver instantiation and methods", async () => {
  const addition: Pan123ShareAddition = {
    sharekey: "share_key_123",
    sharepassword: "pwd",
  }

  const driver = new Pan123ShareDriver(addition)
  assert.ok(driver)

  // Mock getFiles
  ;(driver as any).client.getFiles = async (parentId: string) => {
    return [
      {
        FileId: 101,
        FileName: "folder_a",
        Type: 1,
        Size: 0,
        UpdateAt: "2026-08-24T12:00:00Z",
      },
      {
        FileId: 102,
        FileName: "file_b.mp4",
        Type: 0,
        Size: 1048576,
        UpdateAt: "2026-08-24T12:00:00Z",
      },
    ]
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "folder_a")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "file_b.mp4")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 1048576)

  // Mock getDownloadUrl
  ;(driver as any).client.getDownloadUrl = async () =>
    "https://download.123pan.cn/file_b.mp4"

  const link = await driver.link("/file_b.mp4", "/file_b.mp4")
  assert.equal(link.url, "https://download.123pan.cn/file_b.mp4")
})
