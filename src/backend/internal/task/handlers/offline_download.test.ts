import assert from "node:assert/strict"
import { test } from "node:test"

import {
  assertDownloadUrlAllowed,
  fileNameFromUrl,
  hostAllowed,
} from "./offline_download"

test("offline download is disabled unless a host allowlist is configured", () => {
  assert.throws(
    () => assertDownloadUrlAllowed("https://example.com/a.zip", {}),
    /disabled/i,
  )
})

test("non-allowlisted hosts are rejected", () => {
  assert.throws(
    () =>
      assertDownloadUrlAllowed("https://evil.example/a.zip", {
        ALLOW_OFFLINE_DOWNLOAD: "example.com",
      }),
    /not in the ALLOW_OFFLINE_DOWNLOAD allowlist/,
  )
})

test("allowlisted hosts are accepted", () => {
  assert.doesNotThrow(() =>
    assertDownloadUrlAllowed("https://example.com/a.zip", {
      ALLOW_OFFLINE_DOWNLOAD: "example.com",
    }),
  )
})

test("wildcard entries match subdomains but not the bare domain", () => {
  assert.equal(hostAllowed("a.example.com", ["*.example.com"]), true)
  assert.equal(hostAllowed("example.com", ["*.example.com"]), false)
  assert.equal(hostAllowed("example.com", ["example.com"]), true)
})

test("private network targets stay blocked even when allowlisted", () => {
  assert.throws(
    () =>
      assertDownloadUrlAllowed("http://127.0.0.1/a.zip", {
        ALLOW_OFFLINE_DOWNLOAD: "127.0.0.1",
      }),
    /SSRF|restricted|private/i,
  )
})

test("only http(s) URLs are accepted", () => {
  assert.throws(
    () =>
      assertDownloadUrlAllowed("file:///etc/passwd", {
        ALLOW_OFFLINE_DOWNLOAD: "example.com",
      }),
    /http\(s\)/i,
  )
})

test("file names are derived from the URL and sanitized", () => {
  assert.equal(fileNameFromUrl("https://example.com/dir/movie.mkv"), "movie.mkv")
  assert.equal(
    fileNameFromUrl("https://example.com/dir/a%3Ab:c.zip"),
    "a_b_c.zip",
  )
  assert.match(fileNameFromUrl("https://example.com/"), /^download-\d+$/)
})
