import assert from "node:assert/strict"
import { test } from "node:test"
import { createHmac, createHash } from "node:crypto"

import { hcloudSign } from "./util"

function hmacSha256(data: string | Buffer, key: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest()
}

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex")
}

test("halalcloud HL6-HMAC-SHA256 signature matches Go SDK", async () => {
  const now = new Date("2026-09-05T10:30:00.000Z")
  const body = JSON.stringify({
    parent: { path: "/" },
    list_info: { limit: 100, token: "" },
  })
  const sign = await hcloudSign({
    apiHost: "openapi.2dland.cn",
    secretId: "client123",
    secretKey: "secret456",
    accessToken: "token789",
    method: "POST",
    apiPath: "/v6/userfile/list",
    bodyRaw: new TextEncoder().encode(body),
    now,
  })

  // 提取签名
  const sigMatch = /Signature=([0-9a-f]+)$/.exec(sign.headers.authorization)
  assert.ok(sigMatch, "authorization should contain Signature")
  const actualSig = sigMatch![1]

  // 独立用 Node crypto 复现签名链
  const dateString = "2026-09-05"
  const timestamp = "2026-09-05T10:30:00.000Z"
  const canonicalHeaders = "content-type:application/json; charset=utf-8\n"
  const signedHeaders = "content-type"
  const bodyHash = sha256Hex(body)
  const canonicalRequest = [
    "POST",
    "/v6/userfile/list",
    "",
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n")
  const credentialScope = `${dateString}/token789/hl6_request`
  const stringToSign = [
    "HL6-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n")

  const secretKey = Buffer.from("HL6" + "secret456")
  const dateKey = hmacSha256(dateString, secretKey)
  const tokenKey = hmacSha256("token789", dateKey)
  const signingKey = hmacSha256("hl6_request", tokenKey)
  const expectedSig = hmacSha256(stringToSign, signingKey).toString("hex")

  assert.equal(actualSig, expectedSig)
})

test("halalcloud signature with query params", async () => {
  const now = new Date("2026-09-05T10:30:00.000Z")
  const sign = await hcloudSign({
    apiHost: "openapi.2dland.cn",
    secretId: "c",
    secretKey: "s",
    accessToken: "t",
    method: "POST",
    apiPath: "/v6/userfile/list",
    bodyRaw: new Uint8Array(0),
    query: { b: "2", a: "1 2" },
    now,
  })

  // query 应排序 + RFC3986 编码（空格 → %20）
  const url = sign.url
  assert.ok(url.includes("a=1%202"))
  assert.ok(url.includes("b=2"))
  assert.ok(url.indexOf("a=1%202") < url.indexOf("b=2"))

  // 无 body 时 SignedHeaders 应为空
  assert.ok(!sign.headers.authorization.includes("SignedHeaders=content-type"))
})
