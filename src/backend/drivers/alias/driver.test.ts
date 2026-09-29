import test from "node:test"
import assert from "node:assert/strict"
import { AliasDriver } from "./driver"

test("Alias driver initialization with path mappings", async () => {
  const driver = new AliasDriver({
    paths: "/local\nsub1:/storage1\nsub2:/storage2",
    read_conflict_policy: "first",
    write_conflict_policy: "disabled",
  })
  await driver.init()
  assert.ok(driver)
})
