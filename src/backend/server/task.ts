import { Hono } from "hono"

export const taskRouter = new Hono()

// In-memory or stateless placeholder for task management in serverless
const tasks: Record<string, any[]> = {
  upload: [],
  copy: [],
  move: [],
  offline_download: [],
}

taskRouter.get("/:type/:state", (c) => {
  const type = c.req.param("type")
  const state = c.req.param("state") // "undone" | "done"
  const list = tasks[type] || []
  const filtered = list.filter((t) => (state === "done" ? t.done : !t.done))
  return c.json({
    code: 200,
    message: "success",
    data: filtered,
  })
})

taskRouter.post("/:type/clear_done", (c) => {
  const type = c.req.param("type")
  if (tasks[type]) {
    tasks[type] = tasks[type].filter((t) => !t.done)
  }
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/clear_succeeded", (c) => {
  const type = c.req.param("type")
  if (tasks[type]) {
    tasks[type] = tasks[type].filter((t) => t.state !== "succeeded")
  }
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/retry_failed", (c) => {
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/retry", (c) => {
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/retry_some", (c) => {
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/cancel", (c) => {
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/cancel_some", (c) => {
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/delete", (c) => {
  return c.json({ code: 200, message: "success", data: null })
})

taskRouter.post("/:type/delete_some", (c) => {
  return c.json({ code: 200, message: "success", data: null })
})
