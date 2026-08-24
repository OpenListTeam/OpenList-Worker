import test from "node:test"
import assert from "node:assert/strict"
import { AliyundriveShareDriver } from "./driver"
import { AliyundriveShareAddition } from "./types"

test("AliyundriveShareDriver instantiation and methods", async () => {
  const addition: AliyundriveShareAddition = {
    share_id: "ali_share_id_123",
    share_pwd: "pwd",
  }

  const driver = new AliyundriveShareDriver(addition)
  assert.ok(driver)

  // Mock getFiles
  ;(driver as any).client.getFiles = async (parentId: string) => {
    return [
      {
        file_id: "fid_101",
        name: "MyMovies",
        type: "folder",
        updated_at: "2026-08-24T12:00:00Z",
      },
      {
        file_id: "fid_102",
        name: "movie.mp4",
        type: "file",
        size: 524288000,
        updated_at: "2026-08-24T12:00:00Z",
      },
    ]
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "MyMovies")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "movie.mp4")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 524288000)

  // Mock getDownloadUrl
  ;(driver as any).client.getDownloadUrl = async (fileId: string) =>
    "https://cn-beijing-data.alicloud.com/movie.mp4"

  const link = await driver.link("/movie.mp4", "/movie.mp4")
  assert.equal(link.url, "https://cn-beijing-data.alicloud.com/movie.mp4")
})
