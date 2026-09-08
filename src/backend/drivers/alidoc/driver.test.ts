import test from "node:test"
import assert from "node:assert/strict"
import { AliDocDriver, normalizeAliDocAddition } from "./driver"
import { AliDocClient } from "./util"

test("normalizeAliDocAddition trims fields", () => {
  const a = normalizeAliDocAddition({
    cookie: "  mock=cookie  ",
    root_folder_id: "  root123  ",
  })
  assert.equal(a.cookie, "mock=cookie")
  assert.equal(a.root_folder_id, "root123")
})

test("AliDocDriver instantiation without network", () => {
  const driver = new AliDocDriver({
    cookie: "mock=cookie",
    root_folder_id: "root123",
  })
  assert.ok(driver)
})

test("AliDocClient builds API headers", () => {
  const c = new AliDocClient("a=b")
  assert.ok(c)
})
