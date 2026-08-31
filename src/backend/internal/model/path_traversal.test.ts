import assert from "node:assert/strict"
import { test } from "node:test"
import { resolvePath, saveDb } from "./db"

const env: any = {}

const seed = (rootFolder: string, mountPath = "/x") =>
  saveDb(
    {
      settings: [],
      users: [],
      shares: [],
      storages: [
        {
          id: 1,
          mount_path: mountPath,
          driver: "local",
          disabled: false,
          addition: JSON.stringify({ root_folder_path: rootFolder }),
        },
      ],
    },
    env,
  )

/**
 * Collapse "." and ".." so containment can be judged on the effective path.
 * A plain startsWith() check is NOT sufficient: "/data/../../../etc/passwd"
 * does start with "/data/" while actually escaping to /etc/passwd.
 */
const collapse = (p: string) => {
  const stack: string[] = []
  for (const seg of String(p).split("/")) {
    if (seg === "" || seg === ".") continue
    if (seg === "..") {
      stack.pop()
      continue
    }
    stack.push(seg)
  }
  return "/" + stack.join("/")
}

/**
 * A traversal fix passes when the attempt is either rejected outright, or
 * resolves to a path still contained in rootFolder. Escaping is the only
 * failure.
 */
const assertContained = async (virtualPath: string, rootFolder: string) => {
  const resolved: any = await resolvePath(virtualPath).catch(() => null)
  if (!resolved) return
  const physical = String(resolved.physical)
  const norm = collapse(physical)
  const rootNorm = collapse(rootFolder)
  assert.ok(
    norm === rootNorm || norm.startsWith(rootNorm + "/"),
    `path escaped the storage root: ${virtualPath} -> ${physical} (effective ${norm})`,
  )
}

test("Security(C-2): backslash path traversal must not escape the storage root", async () => {
  await seed("/data")
  await assertContained("/x/..\\..\\..\\etc\\passwd", "/data")
  await assertContained("/x/..\\..\\..\\..\\windows\\system32", "/data")
})

test("Security(C-2): forward-slash traversal stays clamped to the root", async () => {
  await seed("/data")
  await assertContained("/x/../../../etc/passwd", "/data")
})

test("Security(C-2): legitimate paths still resolve (no regression)", async () => {
  await seed("/data")
  const root: any = await resolvePath("/x")
  assert.equal(root.physical, "/data")

  const nested: any = await resolvePath("/x/sub/file.txt")
  assert.equal(nested.physical, "/data/sub/file.txt")
})

test("Security(C-2): windows-style root_folder_path still resolves (no regression)", async () => {
  await seed("C:\\data", "/w")
  const resolved: any = await resolvePath("/w/sub/file.txt")
  assert.ok(
    String(resolved.physical).startsWith("C:/data"),
    `windows root_folder_path must survive normalization, got ${resolved.physical}`,
  )
})
