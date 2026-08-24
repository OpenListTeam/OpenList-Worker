import test from "node:test"
import assert from "node:assert/strict"
import { MegaDriver } from "./driver"
import { MegaAddition } from "./types"

test("MegaDriver instantiation and methods", async () => {
  const addition: MegaAddition = {
    email: "test@example.com",
    password: "password123",
  }

  const driver = new MegaDriver(addition)
  assert.ok(driver)

  // Mock client methods
  ;(driver as any).client.getRootId = () => "root_handle_123"
  ;(driver as any).client.getChildren = (parentId: string) => {
    if (parentId === "root_handle_123") {
      return [
        {
          id: "folder_h1",
          parent_id: "root_handle_123",
          name: "MyFolder",
          size: 0,
          is_dir: true,
          modified: "2026-08-24T12:00:00Z",
          type: 1,
        },
        {
          id: "file_h2",
          parent_id: "root_handle_123",
          name: "video.mp4",
          size: 10485760,
          is_dir: false,
          modified: "2026-08-24T12:00:00Z",
          type: 0,
        },
      ]
    }
    return []
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "MyFolder")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "video.mp4")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 10485760)

  // Mock getDownloadLink
  ;(driver as any).client.getDownloadLink = async (handle: string) =>
    "https://gfs270n123.userstorage.mega.co.nz/download/video.mp4"

  const link = await driver.link("/video.mp4", "/video.mp4")
  assert.equal(
    link.url,
    "https://gfs270n123.userstorage.mega.co.nz/download/video.mp4",
  )
})
