import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"

export const taskRouter = new Hono()

// Task state constants (matching frontend TaskStateEnum)
const TASK_STATE = {
  Pending: 0,
  Running: 1,
  Succeeded: 2,
  Canceling: 3,
  Canceled: 4,
  Errored: 5,
  Failing: 6,
  Failed: 7,
  WaitingRetry: 8,
  BeforeRetry: 9,
} as const

const isDoneState = (state: number) =>
  state === TASK_STATE.Succeeded ||
  state === TASK_STATE.Canceled ||
  state === TASK_STATE.Failed ||
  state === TASK_STATE.Errored

// GET /task/:type/:done — list tasks for a type, filtered by done/undone
taskRouter.get("/:type/:done", async (c) => {
  const type = c.req.param("type")
  const done = c.req.param("done")
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []

  const tasks = db.tasks.filter((t: any) => {
    if (t.type !== type) return false
    const isDone = isDoneState(t.state)
    return done === "done" ? isDone : !isDone
  })

  return c.json({ code: 200, message: "success", data: tasks })
})

// POST /task/:type/retry?tid= — retry a single task
taskRouter.post("/:type/retry", async (c) => {
  const type = c.req.param("type")
  const tid = c.req.query("tid")
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  const task = db.tasks.find((t: any) => t.type === type && t.id === tid)
  if (task) {
    task.state = TASK_STATE.WaitingRetry
    task.status = "waiting retry"
    task.error = ""
    task.start_time = null
    task.end_time = null
    task.progress = 0
    await saveDb(db, c.env)
  }
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/cancel?tid= — cancel a single undone task
taskRouter.post("/:type/cancel", async (c) => {
  const type = c.req.param("type")
  const tid = c.req.query("tid")
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  const task = db.tasks.find((t: any) => t.type === type && t.id === tid)
  if (task) {
    task.state = TASK_STATE.Canceled
    task.status = "canceled"
    task.end_time = new Date().toISOString()
    await saveDb(db, c.env)
  }
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/delete?tid= — delete a single done task
taskRouter.post("/:type/delete", async (c) => {
  const type = c.req.param("type")
  const tid = c.req.query("tid")
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  db.tasks = db.tasks.filter((t: any) => !(t.type === type && t.id === tid))
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/cancel_some — cancel selected undone tasks
taskRouter.post("/:type/cancel_some", async (c) => {
  const type = c.req.param("type")
  const ids: string[] = await c.req.json().catch(() => [])
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  db.tasks.forEach((t: any) => {
    if (t.type === type && ids.includes(t.id)) {
      t.state = TASK_STATE.Canceled
      t.status = "canceled"
      t.end_time = new Date().toISOString()
    }
  })
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/delete_some — delete selected done tasks
taskRouter.post("/:type/delete_some", async (c) => {
  const type = c.req.param("type")
  const ids: string[] = await c.req.json().catch(() => [])
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  db.tasks = db.tasks.filter(
    (t: any) => !(t.type === type && ids.includes(t.id)),
  )
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/retry_some — retry selected failed/canceled tasks
taskRouter.post("/:type/retry_some", async (c) => {
  const type = c.req.param("type")
  const ids: string[] = await c.req.json().catch(() => [])
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  db.tasks.forEach((t: any) => {
    if (t.type === type && ids.includes(t.id)) {
      t.state = TASK_STATE.WaitingRetry
      t.status = "waiting retry"
      t.error = ""
      t.start_time = null
      t.end_time = null
      t.progress = 0
    }
  })
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/clear_done — clear all done tasks
taskRouter.post("/:type/clear_done", async (c) => {
  const type = c.req.param("type")
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  db.tasks = db.tasks.filter((t: any) => {
    if (t.type !== type) return true
    return !isDoneState(t.state)
  })
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/clear_succeeded — clear succeeded tasks only
taskRouter.post("/:type/clear_succeeded", async (c) => {
  const type = c.req.param("type")
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  db.tasks = db.tasks.filter((t: any) => {
    if (t.type !== type) return true
    return t.state !== TASK_STATE.Succeeded
  })
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})

// POST /task/:type/retry_failed — retry all failed tasks
taskRouter.post("/:type/retry_failed", async (c) => {
  const type = c.req.param("type")
  const db = await getDb(c.env)
  if (!db.tasks) db.tasks = []
  db.tasks.forEach((t: any) => {
    if (
      t.type === type &&
      (t.state === TASK_STATE.Failed || t.state === TASK_STATE.Errored)
    ) {
      t.state = TASK_STATE.WaitingRetry
      t.status = "waiting retry"
      t.error = ""
      t.start_time = null
      t.end_time = null
      t.progress = 0
    }
  })
  await saveDb(db, c.env)
  return c.json({ code: 200, message: "success", data: null })
})
