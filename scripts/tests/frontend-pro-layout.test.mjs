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
  assert.equal(initialInspectorOpen(null, 1440), true)
  assert.equal(initialInspectorOpen(null, 1100), false)
  assert.equal(initialInspectorOpen("closed", 1920), false)
  assert.equal(initialInspectorOpen("open", 900), true)
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
