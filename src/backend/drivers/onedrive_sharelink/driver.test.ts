import test from "node:test"
import assert from "node:assert/strict"
import { OnedriveSharelinkDriver } from "./driver"
import { OnedriveSharelinkAddition } from "./types"

test("OnedriveSharelinkDriver instantiation and methods", async () => {
  const addition: OnedriveSharelinkAddition = {
    url: "https://my-sharepoint.com/:f:/g/personal/user/test_link",
  }

  const driver = new OnedriveSharelinkDriver(addition)
  assert.ok(driver)

  // Mock getFiles
  ;(driver as any).client.getFiles = async () => {
    return [
      {
        id: "folder_1",
        name: "Docs",
        size: 0,
        is_folder: true,
        modified: "2026-08-24T12:00:00Z",
      },
      {
        id: "file_2",
        name: "data.xlsx",
        size: 20480,
        is_folder: false,
        modified: "2026-08-24T12:00:00Z",
        download_url: "https://my-sharepoint.com/download/data.xlsx",
      },
    ]
  }

  const items = await driver.list("/", "/")
  assert.equal(items.length, 2)
  assert.equal(items[0].name, "Docs")
  assert.equal(items[0].is_dir, true)
  assert.equal(items[1].name, "data.xlsx")
  assert.equal(items[1].is_dir, false)
  assert.equal(items[1].size, 20480)

  const link = await driver.link("/data.xlsx", "/data.xlsx")
  assert.equal(link.url, "https://my-sharepoint.com/download/data.xlsx")
})
