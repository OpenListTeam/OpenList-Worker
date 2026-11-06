// Telegram 驱动：索引纯逻辑单测（不触网、不加载 DB）

import test from "node:test"
import assert from "node:assert/strict"
import type { IndexShape } from "./index"
import {
  INDEX_VERSION,
  childrenOf,
  collectDirPaths,
  indexKey,
  isValidIndexEntry,
  normalizeDirPath,
  parseIndex,
  serializeIndex,
  setChildren,
  sha256HexSync,
} from "./index"

test("sha256HexSync 与已知向量一致", () => {
  assert.equal(
    sha256HexSync(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  )
  assert.equal(
    sha256HexSync("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  )
  assert.equal(
    sha256HexSync(
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    ),
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
  )
})

test("sha256HexSync 能正确处理跨 block 的长输入与多字节字符", () => {
  // 长度跨越 SHA-256 的 64 字节分组边界
  const long = "a".repeat(1000)
  assert.equal(sha256HexSync(long).length, 64)
  // 含中文：UTF-8 字节数 > 字符数，长度补位必须按字节算
  const cn = "中".repeat(200)
  assert.equal(sha256HexSync(cn).length, 64)
  assert.notEqual(sha256HexSync(cn), sha256HexSync("a".repeat(600)))
})

test("indexKey 由 token+chat 派生，且稳定 / 可区分", () => {
  const a = indexKey("123:AAA", "-100999")
  const b = indexKey("123:AAA", "-100999")
  const c = indexKey("123:BBB", "-100999")
  assert.equal(a, b, "相同输入必须稳定")
  assert.notEqual(a, c, "不同 token 必须区分")
  assert.match(a, /^telegram_index_[0-9a-f]{32}$/)
})

test("normalizeDirPath 归一化各种输入", () => {
  assert.equal(normalizeDirPath(""), "")
  assert.equal(normalizeDirPath("/"), "")
  assert.equal(normalizeDirPath("a"), "/a")
  assert.equal(normalizeDirPath("/a/"), "/a")
  assert.equal(normalizeDirPath("//a//b//"), "/a/b")
  assert.equal(normalizeDirPath("///"), "")
})

test("parseIndex 容忍空 / 损坏 / 旧版本输入", () => {
  assert.deepEqual(parseIndex(undefined), { v: INDEX_VERSION, dirs: {} })
  assert.deepEqual(parseIndex(null), { v: INDEX_VERSION, dirs: {} })
  assert.deepEqual(parseIndex(""), { v: INDEX_VERSION, dirs: {} })
  assert.deepEqual(parseIndex("{不是json"), { v: INDEX_VERSION, dirs: {} })
  assert.deepEqual(parseIndex('{"v":999,"dirs":{"":[]}}'), {
    v: INDEX_VERSION,
    dirs: {},
  })
  assert.deepEqual(parseIndex("null"), { v: INDEX_VERSION, dirs: {} })
  assert.deepEqual(parseIndex('{"v":1,"dirs":"/"}'), {
    v: INDEX_VERSION,
    dirs: {},
  })
})

test("parseIndex 丢弃非法条目但保留合法条目", () => {
  const raw = JSON.stringify({
    v: 1,
    dirs: {
      "": [
        { n: "ok.txt", d: false, t: 1, s: 10, m: 5, f: "fid" },
        { n: "", d: true, t: 1 }, // 空名 → 丢弃
        { n: "x", d: true }, // 缺 t → 丢弃
        { n: "y", d: "maybe", t: 1 }, // d 非布尔 → 丢弃
        { n: "z", d: false, t: 1, s: -1, m: 1, f: "f" }, // 负 size → 丢弃
        { n: "w", d: false, t: 1, s: 1, m: 0, f: "f" }, // message_id 0 → 丢弃
        { n: "v", d: false, t: 1, s: 1, m: 1, f: "" }, // 空 file_id → 丢弃
        { n: "dir", d: true, t: 1700000000 },
      ],
    },
  })
  const idx = parseIndex(raw)
  const got = childrenOf(idx, "").map((e) => e.n)
  assert.deepEqual(got, ["ok.txt", "dir"])
})

test("isValidIndexEntry 覆盖边界值", () => {
  assert.ok(isValidIndexEntry({ n: "a", d: true, t: 0 }))
  assert.ok(isValidIndexEntry({ n: "a", d: false, t: 0, s: 0, m: 1, f: "x" }))
  assert.ok(!isValidIndexEntry({ n: "a", d: true, t: Number.NaN }))
  assert.ok(
    !isValidIndexEntry({
      n: "a",
      d: false,
      t: 1,
      s: 1,
      m: Number.MAX_SAFE_INTEGER + 1,
      f: "x",
    }),
  )
})

test("setChildren / childrenOf 往返，空目录不写入", () => {
  const idx: IndexShape = { v: INDEX_VERSION, dirs: {} }
  setChildren(idx, "/a", [{ n: "f", d: true, t: 1 }])
  assert.equal(childrenOf(idx, "/a").length, 1)
  assert.equal(childrenOf(idx, "a").length, 1, "路径应归一后命中")
  assert.equal(childrenOf(idx, "/不存在").length, 0)

  setChildren(idx, "/a", [])
  assert.equal(idx.dirs["/a"], undefined, "空目录不应留在索引里")
})

test("collectDirPaths 递归收集全部后代目录", () => {
  const idx: IndexShape = { v: INDEX_VERSION, dirs: {} }
  setChildren(idx, "", [
    { n: "a", d: true, t: 1 },
    { n: "z.txt", d: false, t: 1, s: 1, m: 1, f: "f" },
  ])
  setChildren(idx, "/a", [{ n: "b", d: true, t: 1 }])
  setChildren(idx, "/a/b", [{ n: "c", d: true, t: 1 }])
  setChildren(idx, "/a/b/c", [])

  const paths = collectDirPaths(idx, "").sort()
  assert.deepEqual(paths, ["/a", "/a/b", "/a/b/c"])
  // 从中间目录开始收集
  assert.deepEqual(collectDirPaths(idx, "/a").sort(), ["/a/b", "/a/b/c"])
  assert.deepEqual(collectDirPaths(idx, "/z"), [])
})

test("serializeIndex / parseIndex 往返保真（含中文与特殊字符）", () => {
  const idx: IndexShape = { v: INDEX_VERSION, dirs: {} }
  setChildren(idx, "", [
    { n: "目录 & <特殊>", d: true, t: 1700000000 },
    {
      n: 'a"b\\c.txt',
      d: false,
      t: 1700000001,
      s: 12345,
      m: 999,
      f: "AgACAgIAAxk",
    },
    { n: "emoji-🎉.bin", d: false, t: 1700000002, s: 0, m: 1000, f: "f2" },
  ])
  const round = parseIndex(serializeIndex(idx))
  assert.deepEqual(round, idx)
})