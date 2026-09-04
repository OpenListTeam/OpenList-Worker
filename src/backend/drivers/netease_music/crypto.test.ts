import assert from "node:assert/strict"
import { test } from "node:test"
import { publicEncrypt, constants } from "node:crypto"

import { rsaRawEncrypt, weapi, linuxapi } from "./crypto"

const PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`

test("netease raw RSA matches Node crypto", () => {
  const secretKey = new Uint8Array(16)
  for (let i = 0; i < 16; i++) secretKey[i] = i + 1

  const full = new Uint8Array(128)
  full.set(secretKey, 112)

  const actual = rsaRawEncrypt(secretKey)
  const expected = publicEncrypt(
    { key: PEM, padding: constants.RSA_NO_PADDING },
    Buffer.from(full),
  )
  assert.equal(Buffer.from(actual).toString("hex"), expected.toString("hex"))
})

test("weapi produces base64 params and 256-hex encSecKey", async () => {
  const res = await weapi({ limit: "10", offset: "0" })
  // params 是两层 AES-CBC 的 base64
  assert.match(res.params, /^[A-Za-z0-9+/]+=*$/)
  // encSecKey 是 raw RSA 结果 hex（128 字节 = 256 hex）
  assert.equal(res.encSecKey.length, 256)
  assert.match(res.encSecKey, /^[0-9a-f]+$/)
})

test("linuxapi produces uppercase hex eparams", async () => {
  const res = await linuxapi({
    url: "/api/song/enhance/player/url",
    method: "POST",
    params: { ids: "[1]", br: "999000" },
  })
  assert.match(res.eparams, /^[0-9A-F]+$/)
})
