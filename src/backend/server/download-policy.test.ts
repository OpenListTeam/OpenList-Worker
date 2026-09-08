import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isCloud189DirectDownload,
  directDownloadResponse,
} from "./download-policy"

test("189 download routes stay direct with or without a sign", () => {
  for (const driver of ["189", "189Cloud", "Cloud189", "ctyun", "189pan"]) {
    for (const path of ["/d/file.apk", "/api/d/file.apk"]) {
      assert.equal(isCloud189DirectDownload(path, driver), true)
    }
    for (const path of [
      "/p/file.txt",
      "/api/p/file.jpg",
      "/sd/share/file",
      "/documents/file",
    ]) {
      assert.equal(isCloud189DirectDownload(path, driver), false)
    }
  }
  assert.equal(isCloud189DirectDownload("/d/file", "webdav"), false)
})

test("direct downloads return an uncached 302 without fetching file bytes", () => {
  const url = "https://download.example.com/file?token=temporary"
  const response = directDownloadResponse(url)
  assert.equal(response.status, 302)
  assert.equal(response.headers.get("Location"), url)
  assert.match(response.headers.get("Cache-Control")!, /no-store/)
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer")
  assert.equal(response.body, null)
})
