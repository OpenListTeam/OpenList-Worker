import assert from "node:assert/strict"
import { test } from "node:test"
import { saveDb } from "../model/db"
import { resolveShare } from "./share"

const env: any = {}

const seed = (files: string[], pwd = "") =>
  saveDb(
    {
      settings: [],
      users: [],
      storages: [],
      shares: [
        {
          id: "abc",
          files,
          pwd,
          disabled: false,
          expires: null,
          max_accessed: 0,
          accessed: 0,
        },
      ],
    },
    env,
  )

test("Security(C-3): '..' must not escape a single-file share", async () => {
  await seed(["/data/secret.txt"])
  const r = await resolveShare("/@s/abc/../../../", "", env)
  assert.equal(
    r.ok,
    false,
    "traversal out of a single-file share must be rejected",
  )
})

test("Security(C-3): '..' must not escape a multi-file share sub-path", async () => {
  await seed(["/data/dir1/a.txt", "/data/dir2/b.txt"])
  const r = await resolveShare("/@s/abc/a.txt/../../..", "", env)
  assert.equal(r.ok, false)
})

test("Security(C-3): traversal is blocked even with the correct share password", async () => {
  await seed(["/data/secret.txt"], "s3cret")
  const r = await resolveShare("/@s/abc/../../../", "s3cret", env)
  assert.equal(
    r.ok,
    false,
    "holding the extract code must not grant traversal (password is checked before path joining)",
  )
})

test("Security(C-3): a legitimate single-file share still resolves (no regression)", async () => {
  await seed(["/data/secret.txt"])
  const r = await resolveShare("/@s/abc", "", env)
  assert.equal(r.ok, true)
  assert.equal(r.realPath, "/data/secret.txt")
})

test("Security(C-3): multi-file sub-path still resolves to the shared file (no regression)", async () => {
  await seed(["/data/dir1/a.txt", "/data/dir2/b.txt"])
  const r = await resolveShare("/@s/abc/a.txt", "", env)
  assert.equal(r.ok, true)
  assert.equal(r.realPath, "/data/dir1/a.txt")
})
