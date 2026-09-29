import test from "node:test"
import assert from "node:assert/strict"
import {
  encodePath,
  parseMetadataSize,
  parseMetadataTimestamp,
} from "./util"
import { CFImgBedDriver, normalizeCFImgBedAddition } from "./driver"

test("encodePath percent-encodes each segment", () => {
  assert.equal(encodePath("/a b/c.txt"), "/a%20b/c.txt")
})

test("parseMetadataSize extracts common size keys", () => {
  assert.equal(parseMetadataSize({ FileSizeBytes: "2048" }), 2048)
  assert.equal(parseMetadataSize({ size: 4096 }), 4096)
  assert.equal(parseMetadataSize({}), 0)
})

test("parseMetadataTimestamp extracts common timestamp keys", () => {
  assert.equal(parseMetadataTimestamp({ TimeStamp: 1700000000 }), 1700000000)
  assert.equal(parseMetadataTimestamp({ modified: 1700000001 }), 1700000001)
  assert.equal(parseMetadataTimestamp({}), 0)
})

test("normalizeCFImgBedAddition normalizes address and defaults", () => {
  const a = normalizeCFImgBedAddition({
    address: "https://img.example.com/",
    token: "tok",
  })
  assert.equal(a.address, "https://img.example.com")
  assert.equal(a.root_folder_path, "/")
  assert.equal(a.upload_thread, 3)
})

test("CFImgBedDriver instantiation", () => {
  const driver = new CFImgBedDriver({
    address: "https://img.example.com",
    token: "tok",
  })
  assert.ok(driver)
})
