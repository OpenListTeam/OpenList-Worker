import test from "node:test"
import assert from "node:assert/strict"
import { SeafileDriver } from "./driver"

test("Seafile driver instantiation", () => {
  const driver = new SeafileDriver({
    address: "https://seafile.example.com",
    token: "testtoken123456",
  })
  assert.ok(driver)
})
