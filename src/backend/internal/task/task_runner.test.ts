import assert from "node:assert/strict"
import { test } from "node:test"

import { runTick, __setTaskHandlerForTest } from "./runner"
import { DocTaskStore } from "./store_doc"
import { TASK_STATE, createTaskRecord } from "./types"
import type { TaskRecord } from "./types"

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
  }
}

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    ...createTaskRecord({
      type: "copy",
      name: "copy test",
      creator_id: 1,
      creator: "admin",
      creator_role: 2,
      max_retry: 0,
      payload: { op: "copy", src_dir: "/a", dst_dir: "/b", names: ["x"] },
      cursor: { index: 0 },
    }),
    ...overrides,
  }
}

async function makeStore() {
  return DocTaskStore.create({}, fakeAccessor() as any)
}

test("runTick executes units until the handler reports finished and verifies it", async () => {
  let units = 0
  __setTaskHandlerForTest("copy", {
    type: "copy",
    async runUnit() {
      units += 1
      if (units >= 3) {
        return { finished: true, cursor: { units }, totalBytes: 3, doneBytes: 3 }
      }
      return { cursor: { units }, totalBytes: 3, doneBytes: units, status: `unit ${units}` }
    },
    async verify() {
      return { ok: true }
    },
  })

  try {
    const store = await makeStore()
    const task = makeTask()
    await store.enqueue(task)

    const result = await runTick(store, { env: {} }, {
      budgetMs: 5000,
      concurrency: 1,
      owner: "test",
    })

    assert.equal(result.ran, 1)
    assert.equal(units, 3)
    const saved = await store.get("copy", task.id)
    assert.equal(saved?.state, TASK_STATE.succeeded)
    assert.equal(saved?.progress, 100)
    assert.equal(saved?.verified, true)
    assert.ok(saved?.end_time, "finished tasks must have end_time")
    assert.equal(saved?.lease, null)
  } finally {
    __setTaskHandlerForTest("copy", null)
  }
})

test("runTick fails a task when the handler throws and max_retry is exhausted", async () => {
  __setTaskHandlerForTest("copy", {
    type: "copy",
    async runUnit() {
      throw new Error("upstream exploded")
    },
    async verify() {
      return { ok: true }
    },
  })

  try {
    const store = await makeStore()
    const task = makeTask({ max_retry: 0 })
    await store.enqueue(task)

    await runTick(store, { env: {} }, {
      budgetMs: 5000,
      concurrency: 1,
      owner: "test",
    })

    const saved = await store.get("copy", task.id)
    assert.equal(saved?.state, TASK_STATE.failed)
    assert.match(saved?.error || "", /upstream exploded/)
    assert.ok(saved?.end_time)
  } finally {
    __setTaskHandlerForTest("copy", null)
  }
})

test("runTick schedules a retry instead of failing when retries remain", async () => {
  __setTaskHandlerForTest("copy", {
    type: "copy",
    async runUnit() {
      throw new Error("temporary failure")
    },
    async verify() {
      return { ok: true }
    },
  })

  try {
    const store = await makeStore()
    const task = makeTask({ max_retry: 2 })
    await store.enqueue(task)

    await runTick(store, { env: {} }, {
      budgetMs: 5000,
      concurrency: 1,
      owner: "test",
    })

    const saved = await store.get("copy", task.id)
    assert.equal(saved?.state, TASK_STATE.waitingRetry)
    assert.equal(saved?.retry, 1)
    assert.ok((saved?.next_run_at || 0) > Date.now(), "retry must be delayed")
  } finally {
    __setTaskHandlerForTest("copy", null)
  }
})

test("runTick marks a runnable type without handler as failed", async () => {
  const store = await makeStore()
  const task = makeTask({ type: "decompress", name: "decompress test" })
  await store.enqueue(task)

  await runTick(store, { env: {} }, {
    budgetMs: 5000,
    concurrency: 1,
    owner: "test",
  })

  const saved = await store.get("decompress", task.id)
  assert.equal(saved?.state, TASK_STATE.failed)
  assert.match(saved?.error || "", /no handler/)
})

test("verify failure prevents the task from being marked succeeded", async () => {
  __setTaskHandlerForTest("copy", {
    type: "copy",
    async runUnit() {
      return { finished: true, totalBytes: 1, doneBytes: 1 }
    },
    async verify() {
      return { ok: false, error: "missing target: /b/x" }
    },
  })

  try {
    const store = await makeStore()
    const task = makeTask()
    await store.enqueue(task)

    await runTick(store, { env: {} }, {
      budgetMs: 5000,
      concurrency: 1,
      owner: "test",
    })

    const saved = await store.get("copy", task.id)
    assert.equal(saved?.state, TASK_STATE.failed)
    assert.equal(saved?.verified, false)
    assert.match(saved?.error || "", /missing target/)
  } finally {
    __setTaskHandlerForTest("copy", null)
  }
})
