import { describe, it } from "node:test"
import assert from "node:assert"
import { parseCookieStr, cookieToString, WeiyunClient } from "./util"
import { getHash33, IncrementalSha1, sha1Hex } from "./crypto"
import { WeiyunDriver, normalizeWeiyunAddition } from "./driver"

describe("Weiyun Crypto & Hash", () => {
  it("computes hash33 correctly for ptqrtoken", () => {
    const hash = getHash33("abc123xyz")
    assert.strictEqual(typeof hash, "string")
    assert.ok(parseInt(hash, 10) > 0)
    // Deterministic test for "test_sig"
    assert.strictEqual(getHash33("test_sig"), "20502530")
  })

  it("computes SHA-1 correctly", () => {
    const text = "hello weiyun"
    const hex = sha1Hex(text)
    assert.strictEqual(hex, "ea23d28e84d5bc815f8c8f26527464656afdc7e3")
  })

  it("handles incremental SHA-1 state extraction", () => {
    const sha = new IncrementalSha1()
    const block = new Uint8Array(64).fill(0x61) // 64 'a's
    sha.update(block)
    const stateHex = sha.getStateHex()
    assert.strictEqual(stateHex.length, 40) // 20 bytes = 40 hex chars
  })
})

describe("Weiyun Cookie Management", () => {
  it("parses and formats cookie string", () => {
    const cookieStr = "uin=123456; skey=@abc; wyctoken=token123; wy_uf=0"
    const cookies = parseCookieStr(cookieStr)
    assert.strictEqual(cookies.get("uin"), "123456")
    assert.strictEqual(cookies.get("skey"), "@abc")
    assert.strictEqual(cookies.get("wyctoken"), "token123")
    assert.strictEqual(cookies.get("wy_uf"), "0")

    const formatted = cookieToString(cookies)
    assert.ok(formatted.includes("uin=123456"))
    assert.ok(formatted.includes("skey=@abc"))
  })

  it("identifies QQ and WeChat account types", () => {
    const qqClient = new WeiyunClient({
      cookies: "uin=123456; p_skey=psk123; wy_uf=0",
    })
    assert.strictEqual(qqClient.loginType(), "qq")
    const qqToken = qqClient.parseTokenInfo()
    assert.strictEqual(qqToken.token_type, 0)
    assert.strictEqual(qqToken.login_key_type, 27)
    assert.strictEqual(qqToken.login_key_value, "psk123")

    const wxClient = new WeiyunClient({
      cookies: "openid=wx123; access_token=act456; wy_appid=app789; wy_uf=1",
    })
    assert.strictEqual(wxClient.loginType(), "weixin")
    const wxToken = wxClient.parseTokenInfo()
    assert.strictEqual(wxToken.token_type, 1)
    assert.strictEqual(wxToken.openid, "wx123")
    assert.strictEqual(wxToken.access_token, "act456")
  })
})

describe("WeiyunDriver", () => {
  it("normalizes additions with valid defaults", () => {
    const addition = normalizeWeiyunAddition({})
    assert.strictEqual(addition.root_folder_id, "")
    assert.strictEqual(addition.cookies, "")
    assert.strictEqual(addition.order_by, "name")
    assert.strictEqual(addition.order_direction, "asc")
    assert.strictEqual(addition.upload_thread, "4")
  })

  it("throws error on copy operation (as in Go driver)", async () => {
    const driver = new WeiyunDriver({
      cookies: "uin=123",
    })
    await assert.rejects(async () => {
      await driver.copy(
        "/src",
        "/dst",
        ["file.txt"],
        "/src/file.txt",
        "/dst/file.txt",
      )
    }, /不支持复制操作/)
  })
})
