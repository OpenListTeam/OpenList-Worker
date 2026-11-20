import assert from "node:assert/strict"
import test from "node:test"
import { Pan123Client } from "./util"
import { md5 } from "../../pkg/crypto"

// createUpload 桩：捕获 etag 并返回 Reuse，使 uploadFile 提前返回（不触网）。
function stubClient() {
  const client = new Pan123Client({} as any)
  let captured: string | undefined
  ;(client as any).createUpload = async (
    _name: string,
    _parent: string,
    _size: number,
    etag: string,
  ) => {
    captured = etag
    return { Reuse: true, Key: "" }
  }
  return { client, getEtag: () => captured }
}

test("uploadFile uses caller-provided md5 as etag (no server recompute)", async () => {
  const { client, getEtag } = stubClient()
  const content = new TextEncoder().encode("hello world")
  const sentinel = "0123456789abcdef0123456789abcdef"
  await client.uploadFile("0", "f.mp4", content, sentinel)
  assert.equal(getEtag(), sentinel)
})

test("uploadFile falls back to edge-safe md5 when none provided", async () => {
  const { client, getEtag } = stubClient()
  const content = new TextEncoder().encode("hello world")
  await client.uploadFile("0", "f.mp4", content)
  assert.equal(getEtag(), md5(content))
  assert.match(getEtag()!, /^[0-9a-f]{32}$/)
})