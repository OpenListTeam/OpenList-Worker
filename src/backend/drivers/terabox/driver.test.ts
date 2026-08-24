import test from "node:test"
import assert from "node:assert/strict"
import { teraboxSign } from "./util"
import { TeraboxDriver } from "./driver"

test("TeraBox cipher sign function", () => {
  const sign = teraboxSign("sign3key", "sign1data")
  assert.ok(typeof sign === "string" && sign.length > 0)
})

test("TeraBox driver instantiation", () => {
  const driver = new TeraboxDriver({
    cookie: "ndus=mockcookie; ndut_fmt=mock;",
    download_api: "official",
  })
  assert.ok(driver)
})
