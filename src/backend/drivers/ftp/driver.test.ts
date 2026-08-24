import { describe, it } from "node:test"
import assert from "node:assert"
import { parseFtpAddress, parseListLine } from "./ftp-client"
import { encodeFtpString, decodeFtpBuffer } from "./encoding"
import { FTPDriver, normalizeFTPAddition } from "./driver"

describe("FTP Encoding & Address", () => {
  it("parses address host and port correctly", () => {
    assert.deepStrictEqual(parseFtpAddress("192.168.1.1:2121"), {
      host: "192.168.1.1",
      port: 2121,
    })
    assert.deepStrictEqual(parseFtpAddress("ftp.example.com"), {
      host: "ftp.example.com",
      port: 21,
    })
    assert.deepStrictEqual(parseFtpAddress("[::1]:2121"), {
      host: "::1",
      port: 2121,
    })
    assert.deepStrictEqual(parseFtpAddress(""), {
      host: "127.0.0.1",
      port: 21,
    })
  })

  it("encodes and decodes UTF-8 and GBK correctly", () => {
    const text = "测试目录"
    const utf8Buf = encodeFtpString(text, "utf-8")
    assert.strictEqual(decodeFtpBuffer(utf8Buf, "utf-8"), text)

    const gbkBuf = encodeFtpString(text, "gbk")
    assert.strictEqual(decodeFtpBuffer(gbkBuf, "gbk"), text)
  })
})

describe("FTP Listing Parser", () => {
  it("parses Unix list line", () => {
    const lineDir = "drwxr-xr-x 2 user group 4096 Jan 01 12:00 my_folder"
    const entryDir = parseListLine(lineDir, "utf-8")
    assert.ok(entryDir)
    assert.strictEqual(entryDir?.name, "my_folder")
    assert.strictEqual(entryDir?.is_dir, true)

    const lineFile = "-rw-r--r-- 1 user group 12345 Aug 24 10:00 test.mp4"
    const entryFile = parseListLine(lineFile, "utf-8")
    assert.ok(entryFile)
    assert.strictEqual(entryFile?.name, "test.mp4")
    assert.strictEqual(entryFile?.is_dir, false)
    assert.strictEqual(entryFile?.size, 12345)
  })

  it("parses DOS list line", () => {
    const lineDir = "08-24-26 10:00AM <DIR> docs"
    const entryDir = parseListLine(lineDir, "utf-8")
    assert.ok(entryDir)
    assert.strictEqual(entryDir?.name, "docs")
    assert.strictEqual(entryDir?.is_dir, true)

    const lineFile = "08-24-26 10:00AM 54321 file.pdf"
    const entryFile = parseListLine(lineFile, "utf-8")
    assert.ok(entryFile)
    assert.strictEqual(entryFile?.name, "file.pdf")
    assert.strictEqual(entryFile?.is_dir, false)
    assert.strictEqual(entryFile?.size, 54321)
  })

  it("parses MLSD line", () => {
    const lineDir = "type=dir;modify=20260824100000; my_photos"
    const entryDir = parseListLine(lineDir, "utf-8")
    assert.ok(entryDir)
    assert.strictEqual(entryDir?.name, "my_photos")
    assert.strictEqual(entryDir?.is_dir, true)

    const lineFile = "type=file;size=67890;modify=20260824100000; movie.mkv"
    const entryFile = parseListLine(lineFile, "utf-8")
    assert.ok(entryFile)
    assert.strictEqual(entryFile?.name, "movie.mkv")
    assert.strictEqual(entryFile?.is_dir, false)
    assert.strictEqual(entryFile?.size, 67890)
  })
})

describe("FTPDriver", () => {
  it("normalizes additions with valid defaults", () => {
    const addition = normalizeFTPAddition({
      address: " 192.168.1.10:21 ",
      username: " admin ",
      encoding: " gbk ",
      cwd_list: "true",
      root_folder_path: "ftp_root",
    })
    assert.strictEqual(addition.address, "192.168.1.10:21")
    assert.strictEqual(addition.username, "admin")
    assert.strictEqual(addition.encoding, "gbk")
    assert.strictEqual(addition.cwd_list, true)
    assert.strictEqual(addition.root_folder_path, "/ftp_root")
  })

  it("validates missing address or username on init", async () => {
    const driver = new FTPDriver({
      address: "",
      username: "",
    })
    await assert.rejects(async () => {
      await driver.init()
    }, /address and username are required/)
  })

  it("throws error on copy operation (as in Go driver)", async () => {
    const driver = new FTPDriver({
      address: "127.0.0.1:21",
      username: "user",
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
