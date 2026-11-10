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
    plugins: [
      {
        name: "solid",
        setup(b) {
          b.onResolve({ filter: /^solid-js$/ }, () => ({
            path: "solid-js",
            namespace: "test",
          }))
          b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents:
              "export const createSignal=(v)=>{let x=v;return [()=>x,(n)=>{x=n}]}",
            loader: "js",
          }))
        },
      },
    ],
  })
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}#${Math.random()}`
  )
}

test("folder tree expands every ancestor of the open folder", async () => {
  const { ancestors, childPath } = await load(
    "src/pages/home/drive-pro-utils.ts",
  )
  assert.deepEqual(ancestors("/"), ["/"])
  assert.deepEqual(ancestors("/B2/media/2026"), [
    "/",
    "/B2",
    "/B2/media",
    "/B2/media/2026",
  ])
  assert.equal(childPath("/", "B2"), "/B2")
  assert.equal(childPath("/B2", "media"), "/B2/media")
})

test("details labels, totals and the default panel state", async () => {
  const { typeLabel, summarize, countLabel, initialInspectorOpen } =
    await load("src/pages/home/drive-pro-utils.ts")
  assert.equal(typeLabel("movie.2160p.mkv", false, true), "MKV")
  assert.equal(typeLabel("Makefile", false, false), "File")
  assert.equal(typeLabel(".env", false, true), "文件")
  assert.equal(typeLabel("电影", true, true), "文件夹")
  assert.deepEqual(
    summarize([
      { is_dir: true, size: 0 },
      { is_dir: false, size: 10 },
      { is_dir: false, size: 5 },
    ]),
    { folders: 1, files: 2, bytes: 15 },
  )
  assert.equal(countLabel(1, 1, false), "1 folder · 1 file")
  assert.equal(countLabel(2, 0, false), "2 folders · 0 files")
  assert.equal(countLabel(2, 3, true), "2 个文件夹 · 3 个文件")
  // Details stay closed until asked for, on any screen; the choice sticks.
  assert.equal(initialInspectorOpen(null), false)
  assert.equal(initialInspectorOpen("closed"), false)
  assert.equal(initialInspectorOpen("open"), true)
})

test("type chips: what each item counts as", async () => {
  const { kindOf, matchesType, countByType } = await load(
    "src/pages/home/drive-clean-utils.ts",
  )
  const item = (name, type, is_dir = false) => ({ name, type, is_dir })
  assert.equal(kindOf(item("Movies", 1, true)), "folder")
  assert.equal(kindOf(item("a.mkv", 2)), "video")
  assert.equal(kindOf(item("photo.jpg", 5)), "image")
  // Some formats arrive without an image type; the extension decides.
  assert.equal(kindOf(item("IMG_0412.HEIC", 0)), "image")
  assert.equal(kindOf(item("bill.pdf", 0)), "doc")
  assert.equal(kindOf(item("notes.txt", 4)), "doc")
  assert.equal(kindOf(item("song.flac", 3)), undefined)
  assert.equal(kindOf(item("backup.zip", 0)), undefined)
  assert.equal(matchesType(item("backup.zip", 0), "all"), true)
  assert.equal(matchesType(item("a.mkv", 2), "image"), false)
  assert.deepEqual(
    countByType([
      item("Movies", 1, true),
      item("a.mkv", 2),
      item("b.mp4", 2),
      item("bill.pdf", 0),
      item("backup.zip", 0),
    ]),
    { all: 5, folder: 1, video: 2, image: 0, doc: 1 },
  )
})

test("upload summary reports the active file and weighted progress", async () => {
  const { summarizeUploads } = await load("src/utils/upload_status.ts")
  assert.deepEqual(summarizeUploads([]), { active: 0, name: "", progress: 0 })
  assert.deepEqual(
    summarizeUploads([
      { name: "done.mp4", size: 100, progress: 100, status: "success" },
      { name: "big.mkv", size: 300, progress: 50, status: "uploading" },
      { name: "next.jpg", size: 100, progress: 0, status: "pending" },
    ]),
    { active: 2, name: "big.mkv", progress: 38 },
  )
  assert.deepEqual(
    summarizeUploads([
      { name: "a", size: 0, progress: 40, status: "pending" },
      { name: "b", size: 0, progress: 60, status: "paused" },
    ]),
    { active: 2, name: "a", progress: 50 },
  )
})
