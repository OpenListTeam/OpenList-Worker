import test from "node:test"
import assert from "node:assert/strict"
import { DropboxDriver } from "./driver"
import { DropboxAddition } from "./types"

test("DropboxDriver instantiation and methods", async () => {
  const addition: DropboxAddition = {
    refresh_token: "test_refresh_token",
    client_id: "test_client_id",
    client_secret: "test_client_secret",
    access_token: "mock_access_token",
  }

  const driver = new DropboxDriver(addition)
  assert.ok(driver)

  // Mock getFiles on client
  ;(driver as any).client.getFiles = async () => [
    {
      ".tag": "file",
      name: "test.txt",
      id: "id:123",
      size: 1024,
      server_modified: "2026-08-24T12:00:00Z",
      path_display: "/test.txt",
    },
    {
      ".tag": "folder",
      name: "documents",
      id: "id:456",
      path_display: "/documents",
    },
  ]

  const files = await driver.list("/", "/")
  assert.equal(files.length, 2)
  // Folders are sorted first
  assert.equal(files[0].name, "documents")
  assert.equal(files[0].is_dir, true)
  assert.equal(files[1].name, "test.txt")
  assert.equal(files[1].is_dir, false)
  assert.equal(files[1].size, 1024)

  // Mock getTemporaryLink
  ;(driver as any).client.getTemporaryLink = async () =>
    "https://dl.dropboxusercontent.com/test.txt"

  const link = await driver.link("/test.txt", "/test.txt")
  assert.equal(link.url, "https://dl.dropboxusercontent.com/test.txt")
})
