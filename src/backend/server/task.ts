import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { getDriver } from "../internal/op/storage"

export const taskRouter = new Hono()

// 定时任务调度接口：刷新所有已启用网盘驱动的 Token / 状态并持久化
taskRouter.all("/refresh", async (c) => {
  const db = await getDb(c.env)
  let refreshed = 0
  let failed = 0
  const results: any[] = []

  for (const s of db.storages || []) {
    if (s.disabled) continue
    try {
      const driver = await getDriver(s.driver, s)
      await driver.init?.()
      s.status = "work"
      refreshed++
      results.push({
        id: s.id,
        mount_path: s.mount_path,
        driver: s.driver,
        status: "ok",
      })
    } catch (err: any) {
      failed++
      results.push({
        id: s.id,
        mount_path: s.mount_path,
        driver: s.driver,
        status: "failed",
        error: err?.message || String(err),
      })
    }
  }

  await saveDb(db, c.env)
  return c.json({
    code: 200,
    message: "token refresh executed",
    data: { refreshed, failed, total: db.storages?.length || 0, results },
  })
})

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
