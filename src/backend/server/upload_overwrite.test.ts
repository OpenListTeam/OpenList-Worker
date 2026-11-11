import assert from "node:assert/strict"
import { test } from "node:test"

import {
  isNotFoundError,
  prepareUploadTarget,
  type UploadOverwriteDeps,
} from "../internal/op/upload"

function makeDeps(options: {
  enabled: boolean
  existing?: { is_dir?: boolean; size?: number } | null
  getError?: Error
  removeError?: Error
}) {
  const calls = {
    get: [] as string[],
    remove: [] as Array<{ dir: string; name: string }>,
  }
  const deps: UploadOverwriteDeps = {
    isEnabled: async () => options.enabled,
    getItemFn: (async (path: string) => {
      calls.get.push(path)
      if (options.getError) throw options.getError
      return {
        item: {
          name: String(path).split("/").filter(Boolean).pop() || "",
          size: options.existing?.size ?? 1,
          is_dir: Boolean(options.existing?.is_dir),
          modified: new Date().toISOString(),
          sign: "",
          type: 0,
        },
        provider: "fake",
        rawUrl: "",
      }
    }) as any,
    removeItemsFn: (async (dir: string, names: string[]) => {
      calls.remove.push({ dir, name: names[0] })
      if (options.removeError) throw options.removeError
    }) as any,
  }
  return { deps, calls }
}

test("does nothing when the setting is off", async () => {
  const { deps, calls } = makeDeps({ enabled: false, existing: {} })
  await prepareUploadTarget("/dir/file.txt", undefined, deps)
  assert.deepEqual(calls.get, [])
  assert.deepEqual(calls.remove, [])
})

test("does nothing when the target does not exist", async () => {
  const { deps, calls } = makeDeps({
    enabled: true,
    getError: new Error("[Fake] Path 'file.txt' not found"),
  })
  await prepareUploadTarget("/dir/file.txt", undefined, deps)
  assert.equal(calls.get.length, 1)
  assert.equal(calls.remove.length, 0)
})

test("deletes the existing file before uploading", async () => {
  const { deps, calls } = makeDeps({ enabled: true, existing: { size: 10 } })
  await prepareUploadTarget("/dir/sub/file.txt", undefined, deps)
  assert.deepEqual(calls.remove, [{ dir: "/dir/sub", name: "file.txt" }])
})

test("root-level targets are deleted in the root directory", async () => {
  const { deps, calls } = makeDeps({ enabled: true, existing: {} })
  await prepareUploadTarget("/file.txt", undefined, deps)
  assert.deepEqual(calls.remove, [{ dir: "/", name: "file.txt" }])
})

test("refuses to replace a directory with a file", async () => {
  const { deps, calls } = makeDeps({
    enabled: true,
    existing: { is_dir: true },
  })
  await assert.rejects(
    () => prepareUploadTarget("/dir", undefined, deps),
    /directory/i,
  )
  assert.equal(calls.remove.length, 0, "must never delete a directory")
})

test("a concurrent delete (not found) is not an upload failure", async () => {
  const { deps } = makeDeps({
    enabled: true,
    existing: {},
    removeError: new Error("object not found"),
  })
  await assert.doesNotReject(() =>
    prepareUploadTarget("/dir/file.txt", undefined, deps),
  )
})

test("other delete failures surface a readable error", async () => {
  const { deps } = makeDeps({
    enabled: true,
    existing: {},
    removeError: new Error("upstream 503"),
  })
  await assert.rejects(
    () => prepareUploadTarget("/dir/file.txt", undefined, deps),
    /failed to delete the existing file before upload: upstream 503/,
  )
})

test("isNotFoundError only matches not-found style messages", () => {
  assert.equal(isNotFoundError(new Error("Path 'a' not found")), true)
  assert.equal(isNotFoundError(new Error("不存在")), true)
  assert.equal(isNotFoundError(new Error("object does not exist")), true)
  assert.equal(isNotFoundError(new Error("HTTP 404")), true)
  assert.equal(isNotFoundError(new Error("HTTP 503")), false)
  assert.equal(isNotFoundError(new Error("permission denied")), false)
})

test("the setting ships disabled by default", async () => {
  const { defaultDb } = await import("../internal/model/db")
  const setting = (defaultDb.settings as any[]).find(
    (item) => item.key === "upload_force_overwrite",
  )
  assert.ok(setting, "upload_force_overwrite must be declared")
  assert.equal(setting.value, "false")
  assert.equal(setting.type, "bool")
  assert.match(setting.help, /extra delete request|adds one existence check/i)
})
