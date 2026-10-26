/**
 * 媒体库分片持久化的回归用例。
 *
 * 覆盖两类「静默丢数据」问题：
 *   1. writePersistedSecret 失败只返回 false，旧实现忽略返回值 → 保存被当成
 *      成功、快照被推进，之后重试同一份数据不会再发起写入；
 *   2. meta 里的分片索引按「本地完整快照」生成并整体覆盖 → 多实例各自保存
 *      用户分片时，后写的 meta 会丢掉对方的索引，冷启动后分片不再被读取。
 */
import assert from "node:assert/strict"
import test from "node:test"

import { emptyMediaDb, type MediaDb, type MediaItem, type MediaUserData } from "./model"
import {
  getConfig,
  getMediaDb,
  invalidateMediaCache,
  isTypeEnabled,
  saveMediaDb,
  saveMediaMeta,
} from "./store"

/**
 * 模拟 D1 绑定（只实现 key 格式用到的 SQL）。
 *
 * 让 run() 对指定 key 抛错，即可模拟「底层写入失败但读路径正常」——
 * 这正是 writePersistedSecret 返回 false 的场景。
 */
function createMockD1() {
  const store = new Map<string, string>()
  const writes = new Map<string, number>()
  let shouldFail: (key: string) => boolean = () => false

  const exec = async (sql: string, params: any[]) => {
    const text = sql.trim()
    // 建表语句：无副作用
    if (/^CREATE\s+(TABLE|INDEX|UNIQUE)/i.test(text)) return
    if (/^INSERT\s+OR\s+REPLACE\s+INTO\s+kv/i.test(text)) {
      const key = String(params[0])
      if (shouldFail(key)) throw new Error(`mock D1 write failed: ${key}`)
      store.set(key, String(params[1]))
      writes.set(key, (writes.get(key) || 0) + 1)
      return
    }
    if (/^DELETE\s+FROM\s+kv\s+WHERE\s+key\s*=\s*\?/i.test(text)) {
      store.delete(String(params[0]))
      return
    }
  }

  const query = async (sql: string, params: any[]) => {
    const text = sql.trim()
    if (/^SELECT\s+value\s+FROM\s+kv\s+WHERE\s+key\s*=\s*\?/i.test(text)) {
      const key = String(params[0])
      return store.has(key) ? [{ value: store.get(key) }] : []
    }
    if (/^SELECT\s+key\s+FROM\s+kv\s+WHERE\s+key\s+LIKE\s+\?/i.test(text)) {
      const prefix = String(params[0]).replace(/%$/, "")
      return [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((key) => ({ key }))
    }
    return []
  }

  const statement = (sql: string, params: any[]) => ({
    first: async () => (await query(sql, params))[0] ?? null,
    all: async () => ({ results: await query(sql, params) }),
    run: async () => exec(sql, params),
  })

  const db = {
    prepare(sql: string) {
      return {
        bind: (...params: any[]) => statement(sql, params),
        ...statement(sql, []),
      }
    },
    async batch(stmts: any[]) {
      const out: any[] = []
      for (const stmt of stmts) out.push(await stmt.run())
      return out
    },
  }

  return {
    db,
    store,
    writes,
    failOn: (fn: (key: string) => boolean) => {
      shouldFail = fn
    },
  }
}

const item = (id: number, scanPathId = 1): MediaItem => ({
  id,
  media_type: "video",
  scan_path_id: scanPathId,
  folder_path: "/movies",
  file_name: `movie-${id}.mkv`,
  scraped_name: "",
  cover: "",
  authors: "",
  plot: "",
  description: "",
  genre: "",
  release_date: "",
  rating: 0,
  file_size: 0,
  duration: 0,
  season: 0,
  episode: 0,
  episodes: "",
  album_name: "",
  album_artist: "",
  track_number: 0,
  publisher: "",
  isbn: "",
  external_id: "",
  hidden: false,
  scraper_source: "",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
})

const progress = (userId: number, itemId: number): MediaUserData => ({
  id: userId * 100 + itemId,
  user_id: userId,
  item_id: itemId,
  episode_index: 0,
  position_ticks: 42,
  duration_ticks: 100,
  played: false,
  play_count: 0,
  is_favorite: false,
  updated_at: "2026-01-01T00:00:00.000Z",
  rating: 0,
  last_played_at: null,
})

const newEnv = () => {
  const mock = createMockD1()
  return {
    mock,
    env: { DB_DRIVER: "d1", DB_FORMAT: "key", DB: mock.db },
  }
}

test("saveMediaDb: 分片写失败要抛错、不提交 meta，并且可以重试", async () => {
  const { mock, env } = newEnv()
  invalidateMediaCache()

  const db = emptyMediaDb()
  db.items = [item(1)]
  db.user_data = [progress(7, 1)]

  mock.failOn((key) => key === "openlist_media_ud_v1:7")
  await assert.rejects(() => saveMediaDb(env, db), /userdata shard 7/)

  // 分片失败时不能提交 meta：否则会发布指向未成功写入分片的索引
  assert.equal(mock.store.has("openlist_media_db_v1"), false)

  // 恢复后重试：失败的快照不能阻止再次写入
  mock.failOn(() => false)
  const before = mock.writes.get("openlist_media_ud_v1:7") || 0
  await saveMediaDb(env, db)
  assert.equal(mock.writes.get("openlist_media_ud_v1:7"), before + 1)
  assert.ok(mock.store.has("openlist_media_db_v1"))
})

test("saveMediaDb: 不覆盖其它实例写入的分片索引，并推进 id 水位", async () => {
  const { mock, env } = newEnv()

  // 实例 A：用户 1 首次上报进度
  invalidateMediaCache()
  const a = emptyMediaDb()
  a.next_id = 100
  a.items = [item(1, 1)]
  a.user_data = [progress(1, 1)]
  await saveMediaDb(env, a)
  const firstMeta = JSON.parse(mock.store.get("openlist_media_db_v1")!)
  assert.deepEqual(firstMeta.user_shards, ["1"])
  assert.deepEqual(firstMeta.item_shards, ["1"])

  // 实例 B：持有更早的本地状态（无用户 1），保存用户 2 的分片。
  // saveChain/快照都是「每实例」的，因此先清空本地缓存来模拟另一个 isolate。
  invalidateMediaCache()
  const b = emptyMediaDb()
  b.items = [item(2, 2)]
  b.user_data = [progress(2, 1)]
  await saveMediaDb(env, b)

  const merged = JSON.parse(mock.store.get("openlist_media_db_v1")!)
  assert.deepEqual(merged.user_shards, ["1", "2"], "索引不能丢掉其它实例的分片")
  assert.deepEqual(merged.item_shards, ["1", "2"], "条目索引同样不能丢")
  assert.equal(merged.next_id, 100, "next_id 只能前进，不能回退")
  assert.equal(b.next_id, 100, "本地也应采纳更大的 id 水位")

  // 冷启动：两个用户的分片都必须被读回来
  invalidateMediaCache()
  const loaded = await getMediaDb(env)
  assert.deepEqual(
    loaded.user_data.map((row) => row.user_id).sort((x, y) => x - y),
    [1, 2],
  )
  assert.deepEqual(
    loaded.items.map((row) => row.id).sort((x, y) => x - y),
    [1, 2],
  )
})

test("getMediaDb: meta 索引被覆盖后仍按前缀发现分片", async () => {
  const { mock, env } = newEnv()

  // 先造出两个用户分片
  invalidateMediaCache()
  const a = emptyMediaDb()
  a.user_data = [progress(1, 1)]
  await saveMediaDb(env, a)

  invalidateMediaCache()
  const b = emptyMediaDb()
  b.user_data = [progress(2, 1)]
  await saveMediaDb(env, b)

  // 模拟「后写的实例用本地快照整体覆盖 meta」：索引里只剩用户 2
  const meta = JSON.parse(mock.store.get("openlist_media_db_v1")!)
  meta.user_shards = ["2"]
  mock.store.set("openlist_media_db_v1", JSON.stringify(meta))

  // 冷启动仍应读到用户 1 的分片（键本身才是权威来源）
  invalidateMediaCache()
  const loaded: MediaDb = await getMediaDb(env)
  assert.deepEqual(
    loaded.user_data.map((row) => row.user_id).sort((x, y) => x - y),
    [1, 2],
  )
})

test("saveMediaMeta: 写失败要抛错并失效缓存，重试时重新写入", async () => {
  const { mock, env } = newEnv()
  invalidateMediaCache()
  const db = await getMediaDb(env)

  mock.failOn((key) => key === "openlist_media_db_v1")
  getConfig(db, "video").enabled = true
  await assert.rejects(() => saveMediaMeta(env, db), /media meta write failed/)
  assert.equal(mock.store.has("openlist_media_db_v1"), false)

  // 失败后读取必须回到持久化版本，不能把内存里的改动当成已保存
  const reloaded = await getMediaDb(env)
  assert.equal(isTypeEnabled(reloaded, "video"), false)

  // 恢复后重试：同样的改动重新写入一次，成功之后不再重复写
  mock.failOn(() => false)
  getConfig(reloaded, "video").enabled = true
  await saveMediaMeta(env, reloaded)
  const writes = mock.writes.get("openlist_media_db_v1") || 0
  assert.equal(writes, 1)
  await saveMediaMeta(env, reloaded)
  assert.equal(mock.writes.get("openlist_media_db_v1") || 0, writes)
})
