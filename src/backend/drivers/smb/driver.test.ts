import test from "node:test"
import assert from "node:assert/strict"
import { SMBDriver } from "./driver"
import { SMBAddition } from "./types"

test("SMBDriver instantiation and methods", async () => {
  const addition: SMBAddition = {
    address: "192.168.1.100",
    username: "admin",
    password: "password",
    share_name: "public",
  }

  const driver = new SMBDriver(addition)
  assert.ok(driver)

  const root = await driver.get("/", "/")
  assert.ok(root)
  assert.equal(root.name, "root")
})
