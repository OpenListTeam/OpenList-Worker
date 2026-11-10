import assert from "node:assert/strict"
import { test } from "node:test"

import { DocTaskStore } from "./store_doc"
import {
  TASK_STATE,
  computeProgress,
  createTaskRecord,
  toTaskInfo,
} from "./types"
import type { TaskRecord } from "./types"

/** 内存版 KV 访问器：用来验证文档存储的读写/认领/淘汰语义 */
function fakeAccessor() {
  const map = new Map<string, string>()
  return {
    name: "fake",
    async get(key: string) {
      return map.get(key) ?? null
    },
    async put(key: string, value: string) {
      map.set(key, value)
    },
    async delete(key: string) {
      map.delete(key)
    },
    async list(prefix: string) {
      return [...map.keys()].filter((key) => key.startsWith(prefix))
    },
    dump: () => map,
  }
}

function makeRecord(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const record = createTaskRecord({
    type: "copy",
    name: "copy /a to /b",
    creator_id: 7,
    creator: "alice",
    creator_role: 1,
    max_retry: 1,
    payload: { op: "copy", src_dir: "/a", dst_dir: "/b", names: ["x"] },
    cursor: { index: 0 },
  })
  return { ...record, ...overrides }
}

async function makeStore() {
  const accessor = fakeAccessor()
  const store = await DocTaskStore.create({}, accessor as any)
  return { store, accessor }
}

test("enqueue/list/get round-trip keeps creator and payload", async () => {
  const { store } = await makeStore()
  const record = makeRecord()
  await store.enqueue(record)

  const list = await store.list({ type: "copy", states: [TASK_STATE.pending] })
  assert.equal(list.length, 1)
  assert.equal(list[0].id, record.id)
  assert.equal(list[0].creator_id, 7)
  assert.deepEqual((list[0].payload as any).names, ["x"])

  const got = await store.get("copy", record.id)
  assert.ok(got)
  assert.equal(got?.name, record.name)
})

test("list filters by creator and state", async () => {
  const { store } = await makeStore()
  await store.enqueue(makeRecord({ id: "t1", creator_id: 1 }))
  await store.enqueue(makeRecord({ id: "t2", creator_id: 2 }))
  await store.enqueue(
    makeRecord({ id: "t3", creator_id: 1, state: TASK_STATE.succeeded }),
  )

  const undone = await store.list({
    type: "copy",
    creator: 1,
    states: [TASK_STATE.pending],
  })
  assert.deepEqual(
    undone.map((task) => task.id),
    ["t1"],
  )

  const all = await store.list({ type: "copy", states: [TASK_STATE.pending] })
  assert.equal(all.length, 2)
})

test("patch only updates provided columns", async () => {
  const { store } = await makeStore()
  const record = makeRecord({ id: "t1" })
  await store.enqueue(record)

  const patched = await store.patch("copy", "t1", {
    progress: 42,
    done_bytes: 420,
    status: "copying",
  })
  assert.equal(patched?.progress, 42)
  assert.equal(patched?.done_bytes, 420)
  // 未提交的字段必须保持原值
  assert.equal(patched?.creator_id, 7)
  assert.deepEqual((patched?.payload as any).names, ["x"])
})

test("claim moves a pending task to running and is exclusive while leased", async () => {
  const { store } = await makeStore()
  await store.enqueue(makeRecord({ id: "t1" }))

  const now = Date.now()
  const first = await store.claim({
    types: ["copy"],
    now,
    owner: "runner-a",
    leaseMs: 60_000,
    staleMs: 300_000,
  })
  assert.ok(first)
  assert.equal(first?.id, "t1")
  assert.equal(first?.state, TASK_STATE.running)
  assert.equal(first?.lease?.owner, "runner-a")

  const second = await store.claim({
    types: ["copy"],
    now: now + 1000,
    owner: "runner-b",
    leaseMs: 60_000,
    staleMs: 300_000,
  })
  assert.equal(second, null)
})

test("claim re-claims a task whose lease expired", async () => {
  const { store } = await makeStore()
  await store.enqueue(makeRecord({ id: "t1" }))
  const now = Date.now()
  await store.claim({
    types: ["copy"],
    now,
    owner: "runner-a",
    leaseMs: 1000,
    staleMs: 300_000,
  })
  const again = await store.claim({
    types: ["copy"],
    now: now + 5000,
    owner: "runner-b",
    leaseMs: 1000,
    staleMs: 300_000,
  })
  assert.equal(again?.id, "t1")
  assert.equal(again?.lease?.owner, "runner-b")
})

test("claim gives up on a task that keeps dying and marks it stalled", async () => {
  const { store } = await makeStore()
  await store.enqueue(makeRecord({ id: "t1", state: TASK_STATE.running }))
  const now = Date.now()
  // 每次租约过期都会被重新认领并累加 attempts；第 4 次超过阈值直接失败
  for (let attempt = 0; attempt < 4; attempt++) {
    await store.claim({
      types: ["copy"],
      now: now + attempt * 10_000,
      owner: `runner-${attempt}`,
      leaseMs: 1000,
      staleMs: 5000,
    })
  }
  const record = await store.get("copy", "t1")
  assert.equal(record?.state, TASK_STATE.failed)
  assert.equal(record?.status, "stalled")
})

test("prune keeps only the most recent finished tasks", async () => {
  const { store } = await makeStore()
  for (let i = 0; i < 5; i++) {
    await store.enqueue(
      makeRecord({
        id: `done-${i}`,
        state: TASK_STATE.succeeded,
        updated_at: 1000 + i,
      }),
    )
  }
  await store.enqueue(makeRecord({ id: "active" }))

  await store.prune("copy", 2)
  const done = await store.list({
    type: "copy",
    states: [TASK_STATE.succeeded],
  })
  assert.equal(done.length, 2)
  assert.deepEqual(
    done.map((task) => task.id).sort(),
    ["done-3", "done-4"],
  )
  const active = await store.get("copy", "active")
  assert.ok(active, "active tasks must never be pruned")
})

test("countActive ignores finished states", async () => {
  const { store } = await makeStore()
  await store.enqueue(makeRecord({ id: "t1", creator_id: 1 }))
  await store.enqueue(
    makeRecord({ id: "t2", creator_id: 1, state: TASK_STATE.running }),
  )
  await store.enqueue(
    makeRecord({ id: "t3", creator_id: 1, state: TASK_STATE.succeeded }),
  )
  assert.equal(await store.countActive(1), 2)
  assert.equal(await store.countActive(2), 0)
})

test("toTaskInfo never exposes payload or cursor", () => {
  const info: any = toTaskInfo(makeRecord())
  assert.equal(info.payload, undefined)
  assert.equal(info.cursor, undefined)
  assert.equal(info.id.length > 0, true)
  assert.equal(info.creator_role, 1)
})

test("computeProgress clamps and handles unknown totals", () => {
  assert.equal(computeProgress(50, 100), 50)
  assert.equal(computeProgress(200, 100), 100)
  assert.equal(computeProgress(0, 0), 0)
  assert.equal(computeProgress(-5, 100), 0)
})
