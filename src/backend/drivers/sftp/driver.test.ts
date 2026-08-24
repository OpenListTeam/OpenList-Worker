import { describe, it } from "node:test"
import assert from "node:assert"
import { parseAddress } from "./util"
import { SFTPDriver, normalizeSFTPAddition } from "./driver"

describe("SFTP Address & Config", () => {
  it("parses address host and port correctly", () => {
    assert.deepStrictEqual(parseAddress("192.168.1.100:2222"), {
      host: "192.168.1.100",
      port: 2222,
    })
    assert.deepStrictEqual(parseAddress("example.com"), {
      host: "example.com",
      port: 22,
    })
    assert.deepStrictEqual(parseAddress("[2001:db8::1]:2222"), {
      host: "2001:db8::1",
      port: 2222,
    })
    assert.deepStrictEqual(parseAddress(""), {
      host: "127.0.0.1",
      port: 22,
    })
  })

  it("normalizes additions with valid defaults", () => {
    const addition = normalizeSFTPAddition({
      address: " 1.2.3.4:22 ",
      username: " root ",
      root_folder_path: "data/storage",
      ignore_symlink_error: "true",
    })
    assert.strictEqual(addition.address, "1.2.3.4:22")
    assert.strictEqual(addition.username, "root")
    assert.strictEqual(addition.root_folder_path, "/data/storage")
    assert.strictEqual(addition.ignore_symlink_error, true)
  })

  it("validates missing address or username on init", async () => {
    const driver = new SFTPDriver({
      address: "",
      username: "",
    })
    await assert.rejects(async () => {
      await driver.init()
    }, /address and username are required/)
  })

  it("throws error on copy operation (as in Go driver)", async () => {
    const driver = new SFTPDriver({
      address: "127.0.0.1:22",
      username: "root",
    })
    await assert.rejects(async () => {
      await driver.copy(
        "/src",
        "/dst",
        ["file.txt"],
        "/src/file.txt",
        "/dst/file.txt",
      )
    }, /Copy not supported/)
  })
})
