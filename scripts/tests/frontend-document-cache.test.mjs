import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { build } from "esbuild"
import { PDF_VIEWER_PATH } from "../fetch-pdf-viewer.mjs"

const root = process.env.FRONTEND_TEST_REPO
if (!root)
  throw new Error("Set FRONTEND_TEST_REPO to the patched frontend source")
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")

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

test("a document's identity follows the account, path, size and time", async () => {
  const { documentIdentity } = await load("src/utils/document-identity.ts")
  const file = { size: 4096, modified: "2026-03-01T10:00:00Z", is_dir: false }
  assert.deepEqual(documentIdentity(1, "/docs/a.pdf", file), {
    key: "1|/docs/a.pdf|4096|2026-03-01T10:00:00Z",
    size: 4096,
  })
  const key = (user, at, obj) => documentIdentity(user, at, obj)?.key
  const base = key(1, "/docs/a.pdf", file)
  // Replacing the file, another folder and another account are all new files.
  assert.notEqual(key(1, "/docs/a.pdf", { ...file, size: 4097 }), base)
  assert.notEqual(
    key(1, "/docs/a.pdf", { ...file, modified: "2026-03-01T10:00:01Z" }),
    base,
  )
  assert.notEqual(key(1, "/other/a.pdf", file), base)
  assert.notEqual(key(2, "/docs/a.pdf", file), base)
  assert.equal(
    key(1, "/@s/share/a.pdf", file)?.startsWith("1|/@s/share/"),
    true,
  )
})

test("files that cannot be told apart are never cached", async () => {
  const { documentIdentity } = await load("src/utils/document-identity.ts")
  const file = { size: 4096, modified: "2026-03-01T10:00:00Z" }
  for (const obj of [
    undefined,
    { ...file, is_dir: true },
    { ...file, archive: { name: "a.zip" } },
    { ...file, size: 0 },
    { ...file, size: -1 },
    { ...file, size: 1.5 },
    { ...file, size: "4096" },
    { ...file, modified: "" },
    { ...file, modified: "not a date" },
    { ...file, modified: "0001-01-01T00:00:00Z" },
    { ...file, modified: "1970-01-01T00:00:00Z" },
  ])
    assert.equal(documentIdentity(1, "/docs/a.pdf", obj), undefined)
  assert.equal(documentIdentity(1, "", file), undefined)
})

test("previews use the cache module deployed with the installed viewer", () => {
  const pdf = read("src/pages/home/previews/pdf.tsx")
  assert.ok(pdf.includes(`joinBase("${PDF_VIEWER_PATH}/web/viewer.html")`))
  assert.match(pdf, /cache: props\.cache,/)
  assert.match(pdf, /"openlist:pdf:stale"/)
  // The identity is read together with the URL it describes.
  assert.match(pdf, /untrack\(identity\)/)
  const cache = read("src/utils/document-cache.ts")
  assert.ok(cache.includes(`"${PDF_VIEWER_PATH}/web/openlist-cache.mjs"`))
  assert.match(cache, /@vite-ignore/)
  for (const preview of ["doc.tsx", "xls.tsx"]) {
    const source = read(`src/pages/home/previews/${preview}`)
    assert.match(source, /fetchDocument\(fileUrl, identity\(\)\)/)
    assert.doesNotMatch(source, /await fetch\(/)
  }
  assert.match(read("src/pages/manage/Header.tsx"), /clearDocumentCache\(\)/)
})
