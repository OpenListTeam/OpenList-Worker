import { test } from "node:test"
import assert from "node:assert"
import {
  encodeShard,
  decodeShard,
  runIndexPass,
  clearSearchIndex,
  readIndexMeta,
  searchIndexed,
  newWalkState,
  walkPass,
  joinChildPath,
  normalizeParentKey,
  DEFAULT_PASS_DIR_BUDGET,
  getSearchIndexConfig,
  INDEX_META_KEY,
  INDEX_CURSOR_KEY,
  INDEX_SHARD_PREFIX,
} from "./search_index"
import { getStorageBackend } from "../model/store/backend"
import type { IndexTuple } from "./search_index"

// ── 编码 roundtrip ─────────────────────────────

test("encodeShard/decodeShard roundtrip", async () => {
  const tuples: IndexTuple[] = [
    {
      n: "中文 电影.mp4",
      p: "",
      size: 1024,
      m: "2024-01-01T00:00:00",
      is_dir: false,
      t: 2,
    },
    { n: "docs", p: "", size: 0, m: "2024-01-02T10:30:00", is_dir: true, t: 1 },
    {
      n: "readme.md",
      p: "docs",
      size: 88,
      m: "2024-01-03T10:00:00",
      is_dir: false,
      t: 4,
    },
    {
      n: 'a/b\', "quotes" & \n seа'.slice(0, 3),
      p: "docs/sub",
      size: 1,
      m: "",
      is_dir: false,
      t: 0,
    },
  ]
  const b64 = await encodeShard(tuples)
  assert.ok(typeof b64 === "string" && b64.length > 0)
  assert.ok(!b64.includes("中文"), "gzip+base64 不应携带明文")
  const decoded = await decodeShard(b64)
  assert.deepStrictEqual(decoded, tuples)
})

test("decodeShard 容错：非法 base64 返回 null", async () => {
  assert.strictEqual(await decodeShard("!!!!not-base64!!!!"), null)
  // 合法 base64 但非 gzip 内容
  const bad = Buffer.from(JSON.stringify([{ n: "x" }])).toString("base64")
  assert.strictEqual(await decodeShard(bad), null)
})

// ── 路径 helper ────────────────────────────────

test("joinChildPath / normalizeParentKey", () => {
  assert.strictEqual(joinChildPath("/", "a"), "/a")
  assert.strictEqual(joinChildPath("/a", "b"), "/a/b")
  assert.strictEqual(joinChildPath("/a/", "b"), "/a/b")
  assert.strictEqual(normalizeParentKey("/"), "")
  assert.strictEqual(normalizeParentKey("/a/"), "/a")
  assert.strictEqual(normalizeParentKey("/a//b"), "/a/b")
})

// ── walkPass：并发 BFS + 深度限制 + 挂载点语义 ──

function makeTree() {
  // 结构：
  // /      → a(file) mount(empty-sign dir) dir1(dir)
  // /mount → inner(file)     ← 挂载点本身不出现在索引，但内部要递归
  // /dir1  → b(file) dir2(dir, 只有空内容)
  const files: Record<string, any[]> = {
    "/": [
      { name: "a", size: 1, is_dir: false, modified: "T1", sign: "s", type: 0 },
      {
        name: "mount",
        size: 0,
        is_dir: true,
        modified: "T2",
        sign: "",
        type: 1,
      },
      {
        name: "dir1",
        size: 0,
        is_dir: true,
        modified: "T3",
        sign: "s",
        type: 1,
      },
    ],
    "/mount": [
      {
        name: "inner",
        size: 5,
        is_dir: false,
        modified: "T4",
        sign: "x",
        type: 0,
      },
    ],
    "/dir1": [
      { name: "b", size: 2, is_dir: false, modified: "T5", sign: "s", type: 0 },
      {
        name: "dir2",
        size: 0,
        is_dir: true,
        modified: "T6",
        sign: "s",
        type: 1,
      },
    ],
    "/dir1/dir2": [],
  }
  return (p: string) => {
    const hit = files[p]
    if (!hit && p !== "/") return Promise.reject(new Error("nf"))
    return Promise.resolve({ content: hit || [] })
  }
}

test("walkPass：挂载点跳条目但递归、深度限制生效", async () => {
  const col: IndexTuple[] = []
  const state = newWalkState("/")
  const res = await walkPass(state, col, makeTree(), {
    maxDepth: 3,
    dirBudget: 100,
    concurrency: 4,
    wallMs: 5000,
    hardCap: 1000,
    deadlineAt: Date.now() + 5000,
  })
  assert.strictEqual(res.exhausted, true)
  const names = col.map((t) => `${t.p}/${t.n}`)
  // a、dir1、inner、b、dir2 都应在（空目录 dir2 也是条目）
  assert.ok(names.includes("/a"), names.join(","))
  assert.ok(names.includes("/dir1"), names.join(","))
  assert.ok(names.includes("/mount/inner"), names.join(","))
  assert.ok(names.includes("/dir1/b"), names.join(","))
  assert.ok(names.includes("/dir1/dir2"), names.join(","))
  // 挂载点「mount」本身没有条目
  assert.ok(!names.includes("/mount"), names.join(","))
  // parent 键形态（根为空串）
  const a = col.find((t) => t.n === "a")!
  assert.strictEqual(a.p, "")
})

test("walkPass：深度限制不无限下钻", async () => {
  const deepLister = (p: string) =>
    Promise.resolve({
      content: [
        {
          name: "d",
          size: 0,
          is_dir: true,
          modified: "M",
          sign: "s",
          type: 1,
        },
      ],
    })
  const col: IndexTuple[] = []
  const state = newWalkState("/")
  await walkPass(state, col, deepLister as any, {
    maxDepth: 2,
    dirBudget: 100,
    concurrency: 4,
    wallMs: 5000,
    hardCap: 1000,
    deadlineAt: Date.now() + 5000,
  })
  // depth 0(根) → 子(1) → 孙(2)：最多三层目录条目（无文件）每个目录产一条 dir 条目
  assert.strictEqual(col.length, 3)
})

// ── runIndexPass 全流程（memory driver 存储层）──

function treeListerWithBudget() {
  return makeTree()
}

test("runIndexPass：预算分 pass 续建 → done → meta + shards 落盘", async () => {
  const env = {}
  await clearSearchIndex(env)
  const lister = treeListerWithBudget()

  // pass1：dirBudget=1 只处理根目录 → a + dir1 条目（mount 跳过）= 2 条
  const r1 = await runIndexPass(env, { dir_budget: 1, lister, concurrency: 1 })
  assert.strictEqual(r1.done, false)
  assert.strictEqual(r1.total, 2)
  const metaAfterP1 = await readIndexMeta(env)
  assert.strictEqual(metaAfterP1!.is_done, false)

  // pass2：续建直至完成
  let done = false
  let guard = 0
  while (!done && guard++ < 20) {
    const r = await runIndexPass(env, { dir_budget: 2, lister, concurrency: 2 })
    done = r.done
  }
  assert.strictEqual(done, true, "多次 pass 内必须完成")
  const meta = (await readIndexMeta(env))!
  assert.strictEqual(meta.is_done, true)
  assert.ok(meta.shards >= 1)
  // cursor 已被清掉：clear 后搜索应不可用
  await clearSearchIndex(env)
})

test("runIndexPass：单 pass 内完成的库直接落盘 is_done=true", async () => {
  const env = {}
  await clearSearchIndex(env)
  const r = await runIndexPass(env, { lister: makeTree(), dir_budget: 50 })
  assert.strictEqual(r.done, true)
  const meta = await readIndexMeta(env)
  assert.strictEqual(meta!.is_done, true)
  // 挂载点被跳过：/mount 条目不存在，共 a,dir1,inner,b,dir2 = 5 条
  assert.strictEqual(meta!.total, 5)
})

test("searchIndexed：索引命中 + 关键词 + scope + 分页", async () => {
  const env = {}
  await clearSearchIndex(env)
  await runIndexPass(env, { lister: makeTree(), dir_budget: 50 })

  // 命中 mount 目录里的 inner（索引包含挂载点内部）
  const all = await searchIndexed({ env } as any, env)
  assert.strictEqual(all!.total, 5)

  // 大小写不敏感
  const kwUp = await searchIndexed({ env, keywords: "DIR1" } as any, env)
  assert.strictEqual(kwUp!.total, 1)
  assert.strictEqual(kwUp!.content[0].name, "dir1")
  assert.strictEqual(kwUp!.content[0].parent, "/")

  // parent 子树过滤
  const sub = await searchIndexed({ env, parent: "/dir1" } as any, env)
  assert.strictEqual(sub!.total, 2) // b + dir2
  // scope=1 只看目录
  const dirs = await searchIndexed(
    { env, parent: "/dir1", scope: 1 } as any,
    env,
  )
  assert.strictEqual(dirs!.total, 1)
  assert.strictEqual(dirs!.content[0].name, "dir2")
  // scope=2 只看文件
  const filesOnly = await searchIndexed(
    { env, parent: "/dir1", scope: 2 } as any,
    env,
  )
  assert.strictEqual(filesOnly!.total, 1)
  assert.strictEqual(filesOnly!.content[0].name, "b")
  // 分页
  const page2 = await searchIndexed(
    { env, parent: "/dir1", per_page: 1, page: 2 } as any,
    env,
  )
  assert.strictEqual(page2!.content.length, 1)
})

test("searchIndexed：无索引返回 null（回退信号）", async () => {
  const env = {}
  await clearSearchIndex(env)
  const r = await searchIndexed({ env } as any, env)
  assert.strictEqual(r, null)
})

// ── 增量更新 ──────────────────────────────────

test("updateIndexSubtree：指定子树真增量（不重扫 /）", async () => {
  const env = {}
  await clearSearchIndex(env)
  const lister = makeTree()
  await runIndexPass(env, { lister, dir_budget: 50 })
  const before = await searchIndexed({ env } as any, env)
  assert.strictEqual(before!.total, 5)

  // 记录 "/" 被 list 的次数——增量更新不得重扫根
  let rootListed = 0
  const countingLister = (p: string) => {
    if (p === "/") rootListed++
    return lister(p)
  }
  const res = (await import("./search_index")).updateIndexSubtree
  const r = await res(env, {
    parents: ["/dir1"],
    lister: countingLister as any,
    max_depth: 20,
  })
  assert.strictEqual((r as any).done, true)
  assert.strictEqual(rootListed, 0, "增量更新不应重扫根目录")
  const after = await searchIndexed({ env } as any, env)
  assert.strictEqual(after!.total, 5, "子树剔除后重收集，总条目数不变")
  const sub = await searchIndexed({ env, parent: "/dir1" } as any, env)
  assert.strictEqual(sub!.total, 2)
})

// ── 可配置参数 / 并发租约 / 失败阈值 / 分片清理（review follow-up）──

test("getSearchIndexConfig：默认值、env 覆盖与非法值回退", () => {
  const def = getSearchIndexConfig({})
  assert.strictEqual(def.shardSize, 4000)
  assert.strictEqual(def.shardMaxCount, 200)
  assert.strictEqual(def.itemsHardCap, 600_000)
  assert.strictEqual(def.passDirBudget, DEFAULT_PASS_DIR_BUDGET)
  assert.strictEqual(def.maxErrors, 100)
  assert.strictEqual(def.logStats, false)

  const custom = getSearchIndexConfig({
    INDEX_SHARD_SIZE: "2",
    INDEX_MAX_ERRORS: "1",
    INDEX_LOG_STATS: "true",
  })
  assert.strictEqual(custom.shardSize, 2)
  assert.strictEqual(custom.maxErrors, 1)
  assert.strictEqual(custom.logStats, true)

  const invalid = getSearchIndexConfig({
    INDEX_SHARD_SIZE: "abc",
    INDEX_WALK_CONCURRENCY: "99",
    INDEX_MAX_ERRORS: "0",
  })
  assert.strictEqual(invalid.shardSize, 4000)
  assert.strictEqual(invalid.walkConcurrency, 8)
  assert.strictEqual(invalid.maxErrors, 0)
})

test("INDEX_SHARD_SIZE：分片数按配置生效", async () => {
  const env = { INDEX_SHARD_SIZE: "2" }
  await clearSearchIndex(env)
  const r = await runIndexPass(env, { lister: makeTree(), dir_budget: 50 })
  assert.strictEqual(r.done, true)
  const meta = (await readIndexMeta(env))!
  assert.strictEqual(meta.total, 5)
  assert.strictEqual(meta.shards, 3)
  await clearSearchIndex(env)
})

test("runIndexPass：未过期租约返回 busy，且不再调用 lister", async () => {
  const env = {}
  await clearSearchIndex(env)
  const { driver } = await getStorageBackend(env)
  await driver.put(
    INDEX_META_KEY,
    JSON.stringify({
      v: 1,
      total: 42,
      is_done: true,
      updated_at: new Date().toISOString(),
      error: "",
      shards: 0,
      building_at: new Date().toISOString(),
    }),
    env,
  )
  let called = 0
  const r = await runIndexPass(env, {
    lister: () => {
      called++
      return Promise.resolve({ content: [] })
    },
  })
  assert.strictEqual(r.busy, true)
  assert.strictEqual(r.total, 42)
  assert.strictEqual(called, 0)
  await clearSearchIndex(env)
})

test("runIndexPass：陈旧租约会被接管并继续构建", async () => {
  const env = { INDEX_BUILD_LEASE_MS: "10000" }
  await clearSearchIndex(env)
  const { driver } = await getStorageBackend(env)
  await driver.put(
    INDEX_META_KEY,
    JSON.stringify({
      v: 1,
      total: 42,
      is_done: true,
      updated_at: new Date().toISOString(),
      error: "",
      shards: 0,
      building_at: new Date(Date.now() - 20_000).toISOString(),
    }),
    env,
  )
  let called = 0
  const r = await runIndexPass(env, {
    lister: (p) => {
      called++
      return makeTree()(p)
    },
    dir_budget: 50,
  })
  assert.strictEqual(r.busy, undefined)
  assert.strictEqual(r.done, true)
  assert.ok(called > 0)
  const meta = (await readIndexMeta(env))!
  assert.strictEqual(meta.is_done, true)
  assert.strictEqual(meta.building_at, null, "pass 结束后应释放租约")
  await clearSearchIndex(env)
})

test("runIndexPass：失败目录数达到阈值时中止并清空 cursor", async () => {
  const env = { INDEX_MAX_ERRORS: "1" }
  await clearSearchIndex(env)
  const r = await runIndexPass(env, {
    lister: () => Promise.reject(new Error("boom")),
    dir_budget: 10,
  })
  assert.strictEqual(r.done, false)
  assert.match(r.error, /Too many failed directories/)
  const meta = (await readIndexMeta(env))!
  assert.strictEqual(meta.is_done, false)
  const { driver } = await getStorageBackend(env)
  assert.strictEqual(await driver.get(INDEX_CURSOR_KEY, env), null)
  await clearSearchIndex(env)
})

test("clearSearchIndex：meta、cursor 与全部分片键一并删除", async () => {
  const env = {}
  await clearSearchIndex(env)
  await runIndexPass(env, { lister: makeTree(), dir_budget: 50 })
  const meta = (await readIndexMeta(env))!
  assert.ok(meta.shards > 0)
  const { driver } = await getStorageBackend(env)
  const before = await driver.list(INDEX_SHARD_PREFIX, env)
  assert.strictEqual(before.length, meta.shards)

  await clearSearchIndex(env)
  assert.strictEqual(await readIndexMeta(env), null)
  assert.strictEqual((await driver.list(INDEX_SHARD_PREFIX, env)).length, 0)
  assert.strictEqual(await driver.get(INDEX_CURSOR_KEY, env), null)
})
