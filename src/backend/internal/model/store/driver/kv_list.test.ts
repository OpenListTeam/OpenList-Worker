/**
 * 回归测试：kv 驱动 binding 模式的 list() 必须同时支持两套 KV 语义。
 *
 * 背景（真实缺陷，仅在真实 Cloudflare Workers 上暴露）：
 *   - Cloudflare Workers KV: { keys: [{ name, expiration, metadata }], list_complete, cursor }
 *   - EdgeOne KV:            { keys: [{ key, ttl, meta }], complete }（cursor = 本页最后一个 key）
 *
 * 早期实现只认 EdgeOne 语义（读 item.key / page.complete），在 Cloudflare 上
 * 一条都取不到、且首轮即被判为 complete ⇒ 恒返回 []。缓存模块的 cacheListKeys()
 * 依赖本方法，导致 `/api/admin/cache/status` 统计恒为 0、
 * `/api/admin/cache/clear` 与 `/storage/refresh` 永远 removed=0 —— 而键其实
 * 早已写进 KV（实测：列表 296ms → 35ms 命中缓存，KV 里也确实有
 * `openlist_cache_ft_*` 键）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { kvDriver } from "./kv"

/** 构造一个「web KV 形态」的绑定（get/put 用于通过 isWebKvLike 判定） */
function binding(listImpl: (opts: any) => any) {
  return {
    async get() {
      return null
    },
    async put() {
      return true
    },
    async delete() {},
    list: listImpl,
  }
}

function envWith(listImpl: (opts: any) => any) {
  return { KV: binding(listImpl) }
}

test("Cloudflare KV 语义：keys[].name + list_complete", async () => {
  const calls: any[] = []
  const env = envWith(async (opts) => {
    calls.push(opts)
    return {
      keys: [{ name: "a" }, { name: "b" }, { name: "c" }],
      list_complete: true,
      cursor: undefined,
    }
  })
  const keys = await kvDriver.list("pfx_", env)
  assert.deepEqual(keys, ["a", "b", "c"])
  assert.equal(calls.length, 1, "list_complete=true 时不应继续翻页")
  assert.equal(calls[0].prefix, "pfx_")
})

test("Cloudflare KV 语义：按 cursor 翻页并合并", async () => {
  const seen: any[] = []
  const env = envWith(async (opts) => {
    seen.push(opts.cursor)
    if (!opts.cursor) {
      return { keys: [{ name: "a" }, { name: "b" }], list_complete: false, cursor: "cur-1" }
    }
    return { keys: [{ name: "c" }], list_complete: true, cursor: undefined }
  })
  const keys = await kvDriver.list("pfx_", env)
  assert.deepEqual(keys, ["a", "b", "c"])
  assert.deepEqual(seen, [undefined, "cur-1"], "第二页必须带上第一页返回的 cursor")
})

test("EdgeOne KV 语义：keys[].key + complete", async () => {
  const env = envWith(async () => ({
    keys: [{ key: "x" }, { key: "y" }],
    complete: true,
  }))
  assert.deepEqual(await kvDriver.list("pfx_", env), ["x", "y"])
})

test("EdgeOne KV 语义：cursor 取本页最后一个 key", async () => {
  const seen: any[] = []
  const env = envWith(async (opts) => {
    seen.push(opts.cursor)
    if (!opts.cursor) return { keys: [{ key: "x" }, { key: "y" }], complete: false }
    return { keys: [{ key: "z" }], complete: true }
  })
  assert.deepEqual(await kvDriver.list("pfx_", env), ["x", "y", "z"])
  assert.deepEqual(seen, [undefined, "y"], "EdgeOne 的下一页游标是上一页最后一个 key")
})

test("空结果返回空数组", async () => {
  const env = envWith(async () => ({ keys: [], list_complete: true }))
  assert.deepEqual(await kvDriver.list("pfx_", env), [])
})

test("游标不前进时必须终止（不得死循环）", async () => {
  // 模拟「语义不符」的坏绑定：永远返回同一页且自称未完成
  let calls = 0
  const env = envWith(async () => {
    calls++
    return { keys: [{ name: "same" }], list_complete: false, cursor: undefined }
  })
  const keys = await kvDriver.list("pfx_", env)
  assert.deepEqual(keys, ["same"])
  assert.ok(calls <= 2, `应尽早退出，实际调用 ${calls} 次`)
})

test("非 KV 绑定（无 get/put）不进入 binding 分支", async () => {
  // 没有可用绑定且没有代理地址 → 应抛错而不是静默返回 []
  await assert.rejects(() => kvDriver.list("pfx_", {}))
})
