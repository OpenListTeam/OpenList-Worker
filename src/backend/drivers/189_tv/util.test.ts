import assert from "node:assert/strict"
import { test } from "node:test"
import { createHmac } from "node:crypto"

import { sessionKeySignatureOfHmac, appKeySignatureOfHmac } from "./util"

function hmacSha1Upper(data: string, key: string): string {
  return createHmac("sha1", key)
    .update(data, "utf8")
    .digest("hex")
    .toUpperCase()
}

test("189TV SessionKey signature matches Go HMAC-SHA1", () => {
  const url = "https://api.cloud.189.cn/family/file/listFiles.action"
  const date = "Mon, 05 Sep 2026 10:30:00 GMT"
  const actual = sessionKeySignatureOfHmac(
    "secret123",
    "key456",
    "GET",
    url,
    date,
  )
  const path = "/family/file/listFiles.action"
  const data = `SessionKey=key456&Operate=GET&RequestURI=${path}&Date=${date}`
  const expected = hmacSha1Upper(data, "secret123")
  assert.equal(actual, expected)
})

test("189TV AppKey signature matches Go HMAC-SHA1", () => {
  const url = "https://api.cloud.189.cn/family/manage/loginFamilyMerge.action"
  const ts = 1725510600000
  const actual = appKeySignatureOfHmac(
    "fe5734c74c2f96a38157f420b32dc995",
    "600100885",
    "GET",
    url,
    ts,
  )
  const path = "/family/manage/loginFamilyMerge.action"
  const data = `AppKey=600100885&Operate=GET&RequestURI=${path}&Timestamp=${ts}`
  const expected = hmacSha1Upper(data, "fe5734c74c2f96a38157f420b32dc995")
  assert.equal(actual, expected)
})
