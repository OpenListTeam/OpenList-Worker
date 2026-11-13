import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { compareNames, sortFileItems } from "./sort"
import type { FileItem } from "./base"

const file = (name: string, size = 0): FileItem => ({
  name,
  size,
  is_dir: false,
  modified: new Date().toISOString(),
  sign: "",
  type: 0,
})

const folder = (name: string): FileItem => ({
  ...file(name),
  is_dir: true,
})

describe("sort.ts - compareNames (natural sort), semantics of maruel/natural", () => {
  test("#167: 数字按自然数序排序（而不是字符序）", () => {
    const names = ["file1", "file10", "file2", "file20", "file3", "file11"]
    const sorted = [...names].sort(compareNames)
    assert.deepEqual(sorted, [
      "file1",
      "file2",
      "file3",
      "file10",
      "file11",
      "file20",
    ])

    const namesDesc = [...names].sort((a, b) => compareNames(b, a))
    assert.deepEqual(namesDesc, [
      "file20",
      "file11",
      "file10",
      "file3",
      "file2",
      "file1",
    ])

    // 纯数字文件名
    const digits = ["10", "2", "1", "20", "100"]
    assert.deepEqual([...digits].sort(compareNames), [
      "1",
      "2",
      "10",
      "20",
      "100",
    ])
  })

  test("大小写严格区分（Go strings.Compare 语义，不是 localeCompare）", () => {
    const names = ["Zebra", "apple", "banana", "zFile"]
    assert.deepEqual([...names].sort(compareNames), names)

    // "A" < "a" 因为 ASCII 码更小
    const letters = ["a", "A", "B", "b"]
    assert.deepEqual([...letters].sort(compareNames), ["A", "B", "a", "b"])
  })

  test("前缀相同时短字符串先排序", () => {
    const names = ["file1.txt", "file", "file.txt", "file2"]
    assert.deepEqual([...names].sort(compareNames), [
      "file",
      "file.txt",
      "file1.txt",
      "file2",
    ])
  })

  test("数字和字母混合", () => {
    const names = ["a10", "a2", "ab10", "ab2", "a", "ab"]
    assert.deepEqual([...names].sort(compareNames), [
      "a",
      "a2",
      "a10",
      "ab",
      "ab2",
      "ab10",
    ])
  })

  test("前导零：数值相等时退回到词法比较，数值本身按长度排序", () => {
    // 9 的两种写法：数值一样但都没有尾随数据，退化为词法比较
    const names = ["09", "10", "009", "0001"]
    assert.deepEqual([...names].sort(compareNames), ["0001", "009", "09", "10"])

    // 都有尾随数据时：剥离数字继续比较（"01a" < "02b"）
    assert.deepEqual(["01a", "02b", "01b", "02a"].sort(compareNames), [
      "01a",
      "01b",
      "02a",
      "02b",
    ])
  })

  test('完全相同的名字相等，大小写区分（"F" < "f"）', () => {
    assert.equal(compareNames("file", "file"), 0)
    assert.equal(compareNames("File", "file"), -1)
    assert.equal(compareNames("file.txt", "file1.txt"), -1)
  })

  test("空字符串放在最前", () => {
    assert.equal(compareNames("", "a"), -1)
    assert.equal(compareNames("a", ""), 1)
    assert.equal(compareNames("", ""), 0)
  })

  test("中文等非 ASCII 文本按码位序", () => {
    const names = ["中文", "a", "测试"]
    const sorted = [...names].sort(compareNames)
    assert.deepEqual(sorted, ["a", "中文", "测试"])
  })
})

describe("sort.ts - sortFileItems (list ordering)", () => {
  test("文件夹优先，名称自然排序", () => {
    const items = [
      file("file10.txt"),
      folder("dir2"),
      file("file2.txt"),
      folder("dir1"),
      file("file1.txt"),
      file("file20.txt"),
    ]
    assert.deepEqual(
      sortFileItems(items, "name", "asc").map((i) => i.name),
      ["dir1", "dir2", "file1.txt", "file2.txt", "file10.txt", "file20.txt"],
    )
  })

  test("倒序同样自然排序", () => {
    const items = [
      file("file1.txt"),
      folder("dir2"),
      file("file2.txt"),
      folder("dir1"),
      file("file10.txt"),
    ]
    assert.deepEqual(
      sortFileItems(items, "name", "desc").map((i) => i.name),
      ["dir2", "dir1", "file10.txt", "file2.txt", "file1.txt"],
    )
  })

  test("size / modified 排序不受 name 自然排序干扰", () => {
    const items = [file("b.txt", 100), file("a.txt", 10), file("c.txt", 1000)]
    assert.deepEqual(
      sortFileItems(items, "size", "asc").map((i) => i.name),
      ["a.txt", "b.txt", "c.txt"],
    )
    assert.deepEqual(
      sortFileItems(items, "size", "desc").map((i) => i.name),
      ["c.txt", "b.txt", "a.txt"],
    )
  })

  test("不排序时原样返回（非破坏性）", () => {
    const items = [file("a.txt"), file("b.txt")]
    const result = sortFileItems(items)
    assert.deepEqual(
      result.map((i) => i.name),
      ["a.txt", "b.txt"],
    )
    assert.deepEqual(
      result.map((i) => i.name),
      ["a.txt", "b.txt"],
    )
  })

  test("没有修改日期时不会抛错", () => {
    const items: FileItem[] = [file("a.txt"), folder("dir")]
    const result = sortFileItems(items, "name", "asc")
    assert.deepEqual(
      result.map((i) => i.name),
      ["dir", "a.txt"],
    )
  })
})
