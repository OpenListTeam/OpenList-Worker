import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { encodeCas, encodeOss, encodeTorrent, parseSeed } from "../internal/seed/codec"
import { hashReadableStream, TorrentPieceHasher } from "../internal/seed/hash"
import { normalizeSeed } from "../internal/seed/types"
import { saveDb } from "../internal/model/db"
import { fsRouter } from "./fs"
import { seedTestHelpers } from "./seed"

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

test("OSS and torrent codecs preserve GCID hashes from Go seeds", async () => {
  const original = sampleSeed()
  original.files[0].hashes.gcid = "0123456789abcdef0123456789abcdef01234567"

  const oss = await parseSeed(encodeOss(original), "oss")
  assert.equal(oss.seed.files[0].hashes.gcid, original.files[0].hashes.gcid)

  const torrent = await parseSeed(await encodeTorrent(original), "torrent")
  assert.equal(torrent.seed.files[0].hashes.gcid, original.files[0].hashes.gcid)
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
    [
      "cloud",
      "create_time",
      "md5",
      "name",
      "size",
      "sliceMd5",
      "slice_md5s",
      "slice_size",
    ].sort(),
  )
  assert.equal(payload.cloud, "189")
  assert.deepEqual(payload.slice_md5s, ["5D41402ABC4B2A76B9719D911017C592"])
  assert.equal(payload.slice_size, 10 * 1024 * 1024)
  const parsed = await parseSeed(bytes, "cas")
  assert.equal(parsed.cas?.name, "hello.txt")
  assert.equal(parsed.cas?.md5, "5d41402abc4b2a76b9719d911017c592")
})

test("CAS codec preserves custom cloud across round trips", async () => {
  const original = casSeed()
  original.files[0].cas_cloud = "115"
  const bytes = await encodeCas(original)
  const parsed = await parseSeed(bytes, "cas")
  assert.equal(parsed.seed.files[0].cas_cloud, "115")
  const roundTrip = await encodeCas(parsed.seed)
  const payload = JSON.parse(
    Buffer.from(Buffer.from(roundTrip).toString(), "base64").toString("utf8"),
  )
  assert.equal(payload.cloud, "115")
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

test("seed diagnose reports per-format conversion requirements", async () => {
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [],
  }, env)
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const response = await app.request("/api/fs/seed/diagnose", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ seed: sampleSeed() }),
  }, env)
  assert.equal(response.status, 200)
  const data = await response.json() as any
  assert.deepEqual(Object.keys(data.data).sort(), ["cas", "oss", "torrent"])
  assert.ok(Array.isArray(data.data.cas))
})

test("seed upload_parse accepts multipart seed uploads", async () => {
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [],
  }, env)
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const form = new FormData()
  form.set(
    "seed",
    new Blob([Buffer.from(encodeOss(sampleSeed()))]),
    "hello.seed",
  )
  const response = await app.request("/api/fs/seed/upload_parse", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN },
    body: form,
  }, env)
  assert.equal(response.status, 200)
  const data = await response.json() as any
  assert.equal(data.data.format, "oss")
  assert.ok(data.data.seed_data.length > 0)
  assert.deepEqual(Object.keys(data.data.diagnostics).sort(), [
    "cas",
    "oss",
    "torrent",
  ])
})

test("seed update_channels shares the update handler", async () => {
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [],
  }, env)
  env.SEED_SOURCE_ALLOWED_HOSTS = "files.example"
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const response = await app.request("/api/fs/seed/update_channels", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ seed: sampleSeed() }),
  }, env)
  assert.equal(response.status, 200)
  const data = await response.json() as any
  assert.equal(data.data.format, "oss")
  delete env.SEED_SOURCE_ALLOWED_HOSTS
})

test("seed capability formats follow driver-provided hashes", () => {
  assert.deepEqual(
    seedTestHelpers.seedFormatsForFiles([
      { size: 1024, available_hashes: ["md5"], available_piece_hashes: [] },
    ]),
    { oss: true, torrent: false, cas: true },
  )
  assert.deepEqual(
    seedTestHelpers.seedFormatsForFiles([
      {
        size: 20 * 1024 * 1024,
        available_hashes: ["md5", "sha1"],
        available_piece_hashes: [],
      },
    ]),
    { oss: true, torrent: false, cas: false },
  )
  assert.deepEqual(
    seedTestHelpers.seedFormatsForFiles([
      {
        size: 20 * 1024 * 1024,
        available_hashes: ["md5", "sha1"],
        available_piece_hashes: ["md5", "sha1"],
      },
    ]),
    { oss: true, torrent: true, cas: true },
  )
})

test("legacy torrent parse returns the TorrentInfo contract", async () => {
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [],
  }, env)
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const torrent = await encodeTorrent(casSeed())
  const response = await app.request("/api/fs/torrent/parse", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({
      torrent_data: Buffer.from(torrent).toString("base64"),
    }),
  }, env)
  assert.equal(response.status, 200)
  const data = await response.json() as any
  assert.equal(data.data.name, "hello.txt")
  assert.equal(data.data.total_size, 5)
  assert.equal(data.data.info_hash.length, 40)
  assert.equal(data.data.files.length, 1)
})

test("seed update removes files and reports share validity", async () => {
  const base = sampleSeed()
  const second = { ...base.files[0], path: "second.txt" }
  const seed = normalizeSeed({ ...base, files: [base.files[0], second] })
  seed.files[0].sources = [
    {
      type: "openlist-share",
      url: "https://files.example/sd/share-ok",
      expires_at: "",
      share_id: "share-ok",
    },
  ]
  seed.files[1].sources = [
    {
      type: "openlist-share",
      url: "https://files.example/sd/share-off",
      expires_at: "",
      share_id: "share-off",
    },
  ]
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [
      {
        id: "share-ok",
        files: ["/hello.txt"],
        disabled: false,
        expires: null,
        max_accessed: 0,
        accessed: 0,
      },
      {
        id: "share-off",
        files: ["/second.txt"],
        disabled: true,
        expires: null,
        max_accessed: 0,
        accessed: 0,
      },
    ],
  } as any, env)
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const response = await app.request("/api/fs/seed/update", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ seed, remove_files: ["second.txt"] }),
  }, env)
  assert.equal(response.status, 200)
  const data = await response.json() as any
  assert.equal(data.data.seed.files.length, 1)
  assert.equal(data.data.seed.files[0].path, "hello.txt")
  assert.equal(data.data.share_status["share-ok"], true)
  assert.equal(data.data.share_status["share-off"], undefined)
})

test("seed quick_save route accepts the unified transfer body", async () => {
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [],
  }, env)
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const response = await app.request("/api/fs/seed/quick_save", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }, env)
  assert.equal(response.status, 400)
})

test("seed convert accepts target_format from the frontend contract", async () => {
  await saveDb({
    settings: [{ key: "token", value: ADMIN_TOKEN }],
    users: [],
    storages: [],
    shares: [],
  }, env)
  const app = new Hono()
  app.route("/api/fs", fsRouter)
  const response = await app.request("/api/fs/seed/convert", {
    method: "POST",
    headers: { Authorization: ADMIN_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({
      seed_data: Buffer.from(encodeOss(sampleSeed())).toString("base64"),
      file_name: "hello.oss",
      target_format: "torrent",
    }),
  }, env)
  assert.equal(response.status, 200)
  const data = await response.json() as any
  assert.equal(data.data.convertible, true)
  assert.equal(data.data.format, "torrent")
})
