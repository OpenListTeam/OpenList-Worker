import test from "node:test"
import assert from "node:assert/strict"
import { Pan115ShareDriver } from "./driver"
import { Pan115ShareAddition } from "./types"

test("Pan115ShareDriver instantiation and methods", async () => {
  const addition: Pan115ShareAddition = {
    share_code: "share_test_code",
    receive_code: "1234",
  }

  const driver = new Pan115ShareDriver(addition)
  assert.ok(driver)

  // Mock getFiles
  ;(driver as any).client.getFiles = async (cid: string) => {
    return [
      {
        category_id: "cid_1",
        file_name: "Folder1",
        is_file: 0,
        user_utime: 1700000000,
      },
      {
        file_id: "fid_1",
        file_name: "video.mp4",
        file_size: 10240,
        is_file: 1,
        user_utime: 1700000000,
      },
    ]
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "Folder1")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "video.mp4")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 10240)

  // Mock getDownloadUrl
  ;(driver as any).client.getDownloadUrl = async (fileId: string) =>
    "https://cdn115.example.com/video.mp4"

  const link = await driver.link("/video.mp4", "/video.mp4")
  assert.equal(link.url, "https://cdn115.example.com/video.mp4")
})
