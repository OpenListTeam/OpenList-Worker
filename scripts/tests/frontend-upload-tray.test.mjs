import assert from "node:assert/strict"
import { test } from "node:test"
import { build } from "esbuild"
import path from "node:path"

const root = process.env.FRONTEND_TEST_REPO
if (!root)
  throw new Error("Set FRONTEND_TEST_REPO to the patched frontend source")

async function load(file) {
  const result = await build({
    entryPoints: [path.join(root, file)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
  })
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}#${Math.random()}`
  )
}

const tray = () => load("src/pages/home/uploads/tray-utils.ts")
const task = (status, extra = {}) => ({
  status,
  speed: 0,
  directory: "/B2",
  ...extra,
})

test("file kinds come from the extension, case-insensitively", async () => {
  const { fileKind } = await tray()
  assert.equal(fileKind("Movie.2014.MKV"), "video")
  assert.equal(fileKind("IMG_2041.heic"), "image")
  assert.equal(fileKind("song.flac"), "audio")
  assert.equal(fileKind("backup.tar.gz"), "archive")
  assert.equal(fileKind("report.pdf"), "doc")
  assert.equal(fileKind("Makefile"), "file")
  assert.equal(fileKind(".env"), "file")
  assert.equal(fileKind("data.bin"), "file")
})

test("finished uploads fold into the done group", async () => {
  const { splitTasks } = await tray()
  const tasks = [
    task("uploading"),
    task("success"),
    task("error"),
    task("cancelled"),
    task("needs_file"),
  ]
  const { current, done } = splitTasks(tasks)
  assert.deepEqual(
    current.map((t) => t.status),
    ["uploading", "error", "needs_file"],
  )
  assert.deepEqual(
    done.map((t) => t.status),
    ["success", "cancelled"],
  )
})

test("total speed only counts tasks that are sending data", async () => {
  const { totalSpeed } = await tray()
  assert.equal(
    totalSpeed([
      task("uploading", { speed: 100 }),
      task("uploading", { speed: 50 }),
      task("paused", { speed: 999 }),
      task("backending", { speed: 7 }),
    ]),
    150,
  )
  assert.equal(totalSpeed([]), 0)
})

test("the destination is named only when every task shares it", async () => {
  const { commonDirectory } = await tray()
  assert.equal(commonDirectory([task("uploading"), task("pending")]), "/B2")
  assert.equal(
    commonDirectory([task("uploading"), task("pending", { directory: "/x" })]),
    undefined,
  )
  assert.equal(commonDirectory([]), undefined)
})
