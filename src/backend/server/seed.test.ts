import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { encodeCas, encodeOss, encodeTorrent, parseSeed } from "../internal/seed/codec"
import { hashReadableStream, TorrentPieceHasher } from "../internal/seed/hash"
import { normalizeSeed } from "../internal/seed/types"
import { saveDb } from "../internal/model/db"
import { fsRouter } from "./fs"

const ADMIN_TOKEN = "SEED_ADMIN_TOKEN"
const env: any = {}

function sampleSeed() {
  return normalizeSeed({
    format: "openlist-sharing-seed",
    version: 1,
    name: "hello.txt",
    comment: "fixture",
    created_at: "2026-09-08T00:00:00.000Z",
    created_by: "test",
    piece_size: 16384,
    trackers: ["https://tracker.example/announce"],
    channels: [{ driver: "openlist", mount_path: "/public" }],
    files: [{
      path: "hello.txt",
      size: 5,
      modified: "2026-09-08T00:00:00.000Z",
      comment: "file fixture",
      hashes: {
        md5: "5d41402abc4b2a76b9719d911017c592",
        sha1: "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d",
        sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
        pieces: {
          md5: ["5d41402abc4b2a76b9719d911017c592"],
          sha1: ["aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d"],
          sha256: ["2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"],
        },
      },
      sources: [{ type: "openlist-direct", url: "https://files.example/api/p/hello.txt", expires_at: "", share_id: "" }],
    }],
  })
}

function casSeed() {
  const value = sampleSeed()
  return normalizeSeed({
    ...value,
    piece_size: 10 * 1024 * 1024,
    files: [{
      ...value.files[0],
      hashes: {
        ...value.files[0].hashes,
        pieces: {
          md5: [value.files[0].hashes.md5],
          sha1: [value.files[0].hashes.sha1],
          sha256: [value.files[0].hashes.sha256],
        },
      },
    }],
  })
}

test("OSS codec preserves the versioned canonical schema", async () => {
  const original = sampleSeed()
  const parsed = await parseSeed(encodeOss(original), "oss")
  assert.deepEqual(parsed.seed, original)
  assert.equal(parsed.seed.format, "openlist-sharing-seed")
  assert.equal(parsed.seed.version, 1)
})

test("torrent codec writes BT v1 info plus OpenList and CAS extensions", async () => {
  const original = casSeed()
  const bytes = await encodeTorrent(original)
  const text = Buffer.from(bytes).toString("latin1")
  assert.match(text, /x-openlist/)
  assert.match(text, /x-cas/)
  assert.match(text, /piece length/)
  const parsed = await parseSeed(bytes, "torrent")
  assert.equal(parsed.format, "torrent")
  assert.equal(parsed.seed.files[0].hashes.sha256, original.files[0].hashes.sha256)
  assert.match(parsed.info_hash || "", /^[0-9a-f]{40}$/)
})

test("CAS codec matches casmeta base64 JSON field names", async () => {
  const bytes = await encodeCas(casSeed())
  const payload = JSON.parse(Buffer.from(Buffer.from(bytes).toString(), "base64").toString("utf8"))
  assert.deepEqual(
    Object.keys(payload).sort(),
    ["create_time", "md5", "name", "size", "sliceMd5"].sort(),
  )
  const parsed = await parseSeed(bytes, "cas")
  assert.equal(parsed.cas?.name, "hello.txt")
  assert.equal(parsed.cas?.md5, "5d41402abc4b2a76b9719d911017c592")
})

test("incremental hashing computes whole-file and piece hashes without buffering the file", async () => {
  const torrent = await TorrentPieceHasher.create(4)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("he"))
      controller.enqueue(new TextEncoder().encode("llo"))
      controller.close()
    },
  })
  const result = await hashReadableStream(stream, 4, 5, 16, torrent)
  assert.equal(result.hashes.md5, "5d41402abc4b2a76b9719d911017c592")
  assert.equal(result.hashes.sha1, "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d")
  assert.equal(result.hashes.pieces.sha1.length, 2)
  assert.equal(torrent.digest().length, 2)
})

test("seed routes expose capabilities and reject an unapproved source", async () => {
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [],
  }, env)
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const capabilities = await app.request("/api/fs/seed/capabilities", {
    headers: { Authorization: ADMIN_TOKEN },
  }, env)
  assert.equal(capabilities.status, 200)
  const data = await capabilities.json() as any
  assert.deepEqual(data.data.formats, ["oss", "torrent", "cas"])

  const seed = sampleSeed()
  seed.files[0].sources = [{
    type: "direct",
    url: "http://127.0.0.1/private",
    expires_at: "",
    share_id: "",
  }]
  const update = await app.request("/api/fs/seed/update", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ seed }),
  }, env)
  assert.equal(update.status, 400)
})
