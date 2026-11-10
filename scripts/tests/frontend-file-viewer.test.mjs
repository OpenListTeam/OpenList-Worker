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

const viewer = () => load("src/pages/home/file/viewer-utils.ts")
const f = (name) => ({ name, is_dir: false })
const d = (name) => ({ name, is_dir: true })

test("neighbours step through files and skip folders", async () => {
  const { neighbours } = await viewer()
  const items = [d("Old"), f("a.jpg"), d("New"), f("b.pdf"), f("c.mp4")]
  assert.deepEqual(neighbours(items, "a.jpg"), {
    index: 0,
    total: 3,
    prev: undefined,
    next: "b.pdf",
  })
  assert.deepEqual(neighbours(items, "b.pdf"), {
    index: 1,
    total: 3,
    prev: "a.jpg",
    next: "c.mp4",
  })
  assert.equal(neighbours(items, "c.mp4").next, undefined)
  assert.deepEqual(neighbours(items, "gone.txt"), { index: -1, total: 3 })
  assert.deepEqual(neighbours([], "a.jpg"), { index: -1, total: 0 })
})

test("parent folder of a file, and none at the root of a share link", async () => {
  const { parentFolder } = await viewer()
  assert.equal(parentFolder("/B2/Movies/a.mkv"), "/B2/Movies")
  assert.equal(parentFolder("/readme.txt"), "/")
  assert.equal(parentFolder("/@s/abc/sub/a.pdf"), "/@s/abc/sub")
  assert.equal(parentFolder("/@s/abc"), undefined)
})

test("keys: arrows and Escape, except while typing or with modifiers", async () => {
  const { viewerKey } = await viewer()
  assert.equal(viewerKey({ key: "ArrowLeft" }), "prev")
  assert.equal(viewerKey({ key: "ArrowRight" }), "next")
  assert.equal(viewerKey({ key: "Escape" }), "close")
  assert.equal(viewerKey({ key: "a" }), undefined)
  assert.equal(viewerKey({ key: "ArrowRight", ctrlKey: true }), undefined)
  assert.equal(viewerKey({ key: "ArrowRight", defaultPrevented: true }), undefined)
  for (const tagName of ["INPUT", "TEXTAREA", "SELECT"])
    assert.equal(viewerKey({ key: "ArrowLeft", target: { tagName } }), undefined)
  assert.equal(
    viewerKey({ key: "Escape", target: { tagName: "DIV", isContentEditable: true } }),
    undefined,
  )
  assert.equal(viewerKey({ key: "Escape", target: { tagName: "BUTTON" } }), "close")
})
