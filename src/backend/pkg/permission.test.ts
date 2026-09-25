import assert from "node:assert/strict"
import { test } from "node:test"
import { getActualPath, can, canWrite, UserRole } from "./permission"

function user(base_path: string, extra: any = {}) {
  return {
    id: 2,
    username: "alice",
    role: UserRole.GENERAL,
    permission: 0,
    base_path,
    ...extra,
  }
}

test("getActualPath: normal paths still map into base_path", () => {
  const u = user("/jail")
  assert.equal(getActualPath(u, "/"), "/jail")
  assert.equal(getActualPath(u, "/sub"), "/jail/sub")
  assert.equal(getActualPath(u, "sub"), "/jail/sub")
  assert.equal(getActualPath(u, "/a/b/c"), "/jail/a/b/c")
})

test("getActualPath: no base_path behaves as before (full access)", () => {
  assert.equal(getActualPath(null, "/x/../y"), "/x/../y")
  assert.equal(getActualPath(user("/"), "/x/../y"), "/x/../y")
  assert.equal(getActualPath(user(""), "/x/y"), "/x/y")
})

test("getActualPath: share paths pass through untouched", () => {
  const u = user("/jail")
  assert.equal(getActualPath(u, "/@s/abc/file"), "/@s/abc/file")
})

test("Security(P0): '..' cannot escape the user base_path", () => {
  const u = user("/jail")
  // "/jail/../secret" collapses to "/secret" which is outside "/jail"
  assert.equal(getActualPath(u, "/../secret"), "/jail")
  assert.equal(getActualPath(u, "/.."), "/jail")
  assert.equal(getActualPath(u, "/../../.."), "/jail")
  assert.equal(getActualPath(u, "/sub/../../secret"), "/jail")
})

test("Security(P0): encoded traversal cannot escape the user base_path", () => {
  const u = user("/jail")
  // single-encoded dots
  assert.equal(getActualPath(u, "/%2e%2e/secret"), "/jail")
  // double-encoded dots
  assert.equal(getActualPath(u, "/%252e%252e/secret"), "/jail")
  // encoded slashes splitting ".." across segments
  assert.equal(getActualPath(u, "/sub%2f..%2f..%2fsecret"), "/jail")
  // encoded backslash traversal
  assert.equal(getActualPath(u, "/..%5csecret"), "/jail")
  // dot runs (>2 dots) normalize to ".." before folding
  assert.equal(getActualPath(u, "/...."), "/jail")
  assert.equal(getActualPath(u, "/a...b"), "/jail/a..b")
  // null byte: "..\0" is not a parent segment so nothing escapes here;
  // the request is later rejected by resolvePath's illegal-character check.
  assert.equal(getActualPath(u, "/..%00/secret"), "/jail/..\0/secret")
})

test("Security(P0): intra-base_path '..' still resolves inside the jail", () => {
  const u = user("/jail")
  // collapses to /jail/sub2 -> allowed
  assert.equal(getActualPath(u, "/sub/../sub2"), "/jail/sub2")
  assert.equal(getActualPath(u, "/sub/./other"), "/jail/sub/other")
})

test("Security(P0): backslashes and duplicate slashes are normalized", () => {
  const u = user("/jail")
  assert.equal(getActualPath(u, "\\sub\\x"), "/jail/sub/x")
  assert.equal(getActualPath(u, "//sub///x"), "/jail/sub/x")
})

test("Security(P0): a misconfigured base_path containing '..' is collapsed", () => {
  const u = user("/a/../b")
  assert.equal(getActualPath(u, "/"), "/b")
  assert.equal(getActualPath(u, "/file"), "/b/file")
})

test("can(): disabled / guest / admin semantics", () => {
  assert.equal(can(user("/", { role: UserRole.ADMIN }), 0), true)
  assert.equal(can(user("/", { disabled: true, role: UserRole.ADMIN }), 0), false)
  assert.equal(can(user("/", { role: UserRole.GUEST }), 0), false)
  assert.equal(can(null, 0), false)
})

test("canWrite(): WRITE_CONTENT bit (1<<3) for general users", () => {
  assert.equal(canWrite(user("/", { permission: 8 })), true)
  assert.equal(canWrite(user("/", { permission: 0 })), false)
})
