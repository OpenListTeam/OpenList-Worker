import { Hono } from "hono"
import type { Context } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { getDriver } from "../internal/op/storage"
import { isAdmin } from "../pkg/permission"
import {
  adminAuthMiddleware,
  getUserFromContext,
  matchCronSecret,
} from "./middlewares"
import {
  TaskError,
  applyBulkAction,
  applyTaskAction,
  clearDoneTasks,
  getTaskDetail,
  listTaskInfos,
  retryFailedTasks,
  runTaskPump,
  type TaskActor,
} from "../internal/task/manager"
import { isTaskType, type TaskType } from "../internal/task/types"

export const taskRouter = new Hono()

// 定时任务调度接口：刷新所有已启用网盘驱动的 Token / 状态并持久化
// 仅管理员可触发（防止未授权用户探测存储配置/触发资源消耗）。
// EdgeOne Schedules 等平台调度器无法附加 Authorization 头，
// 因此复用 JWT_SECRET 作为调度密钥，调度请求可携带该密钥
// （JSON body / query / X-Cron-Secret 头）通过 matchCronSecret 放行。
taskRouter.all(
  "/refresh",
  async (c, next) => {
    if (await matchCronSecret(c)) return next()
    return adminAuthMiddleware(c, next)
  },
  async (c) => {
    const db = await getDb(c.env)
    let refreshed = 0
    let failed = 0
    const results: any[] = []

    for (const s of db.storages || []) {
      if (s.disabled) continue
      try {
        const driver = await getDriver(s.driver, s)
        await driver.init?.()
        // lanzou / ctfile 驱动：主动校验凭证是否过期
        // （lanzou Cookie 约 15 天；ctfile 开放接口 Session 失效返回 401），
        // 失效时标记 status=cookie_expired，管理后台可直接看到提示
        if (
          typeof (driver as any).checkCookieValid === "function" &&
          /(lanzou|ctfile|400gb)/i.test(String(s.driver))
        ) {
          const check = await (driver as any).checkCookieValid()
          if (!check.valid) {
            s.status = "cookie_expired"
            failed++
            results.push({
              id: s.id,
              mount_path: s.mount_path,
              driver: s.driver,
              status: "cookie_expired",
              error: check.error || "Cookie expired",
            })
            continue
          }
        }
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

    // FIX: this handler used to answer 200 even when every single refresh
    // failed. A scheduled job that silently 401s every night therefore looked
    // perfectly healthy — that is exactly how the SEV1 in the incident report
    // stayed invisible for 14 days. Returning non-2xx is what lets the
    // scheduler, an uptime probe, or a log-based alert actually fire.
    if (failed > 0) {
      return c.json(
        {
          code: 500,
          message: `token refresh failed: ${failed}/${refreshed + failed} storage(s) failed`,
          data: { refreshed, failed, total: db.storages?.length || 0, results },
        },
        500,
      )
    }

    return c.json({
      code: 200,
      message: "token refresh executed",
      data: { refreshed, failed, total: db.storages?.length || 0, results },
    })
  },
)

// ───────────────────────── 任务管理 API ─────────────────────────
//
// 契约与 Go 版 server/handles/task.go 保持一致，前端任务页无需改动：
//   GET  /task/:type/undone|done
//   POST /task/:type/info|cancel|delete|retry?tid=
//   POST /task/:type/cancel_some|delete_some|retry_some   (body: string[])
//   POST /task/:type/clear_done|clear_succeeded|retry_failed
//   POST /task/run                                        (cron secret / admin)

function errorResponse(c: Context, err: any) {
  if (err instanceof TaskError) {
    return c.json(
      { code: err.status, message: err.message, data: null },
      err.status as any,
    )
  }
  const message = String(err?.message || err)
  console.error("[Task API]", message)
  return c.json({ code: 500, message, data: null }, 500)
}

async function resolveActor(c: Context): Promise<TaskActor | null> {
  const user = await getUserFromContext(c)
  if (!user) return null
  // 对齐 Go 的 AuthNotGuest：游客不能访问任务接口
  if (user.username === "guest") return null
  return {
    id: Number(user.id ?? 0),
    username: user.username || "",
    role: Number(user.role ?? 1),
    isAdmin: isAdmin(user as any),
  }
}

function parseTaskType(c: Context): TaskType | null {
  const type = c.req.param("type")
  return isTaskType(type) ? type : null
}

/** seed_save 与 Go 一致：只展示进度，不支持重试 */
function allowsRetry(type: TaskType): boolean {
  return type !== "seed_save"
}

taskRouter.get("/:type/:state", async (c) => {
  const type = parseTaskType(c)
  if (!type) {
    return c.json({ code: 404, message: "task type not found", data: null }, 404)
  }
  const state = c.req.param("state")
  if (state !== "undone" && state !== "done") {
    return c.json(
      { code: 400, message: "state must be 'undone' or 'done'", data: null },
      400,
    )
  }
  const actor = await resolveActor(c)
  if (!actor) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  try {
    const data = await listTaskInfos(c.env, type, state, actor)
    return c.json({ code: 200, message: "success", data })
  } catch (err) {
    return errorResponse(c, err)
  }
})

taskRouter.post("/:type/info", async (c) => {
  const type = parseTaskType(c)
  if (!type) {
    return c.json({ code: 404, message: "task type not found", data: null }, 404)
  }
  const actor = await resolveActor(c)
  if (!actor) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  const tid = c.req.query("tid") || ""
  if (!tid) {
    return c.json({ code: 400, message: "tid is required", data: null }, 400)
  }
  try {
    const data = await getTaskDetail(c.env, type, tid, actor)
    return c.json({ code: 200, message: "success", data })
  } catch (err) {
    return errorResponse(c, err)
  }
})

for (const action of ["cancel", "delete", "retry"] as const) {
  taskRouter.post(`/:type/${action}`, async (c) => {
    const type = parseTaskType(c)
    if (!type) {
      return c.json(
        { code: 404, message: "task type not found", data: null },
        404,
      )
    }
    if (action === "retry" && !allowsRetry(type)) {
      return c.json(
        { code: 404, message: "retry is not supported for this type", data: null },
        404,
      )
    }
    const actor = await resolveActor(c)
    if (!actor) {
      return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
    }
    const tid = c.req.query("tid") || ""
    if (!tid) {
      return c.json({ code: 400, message: "tid is required", data: null }, 400)
    }
    try {
      await applyTaskAction(c.env, type, tid, actor, action)
      return c.json({ code: 200, message: "success", data: null })
    } catch (err) {
      return errorResponse(c, err)
    }
  })
}

for (const action of ["cancel", "delete", "retry"] as const) {
  taskRouter.post(`/:type/${action}_some`, async (c) => {
    const type = parseTaskType(c)
    if (!type) {
      return c.json(
        { code: 404, message: "task type not found", data: null },
        404,
      )
    }
    if (action === "retry" && !allowsRetry(type)) {
      return c.json(
        { code: 404, message: "retry is not supported for this type", data: null },
        404,
      )
    }
    const actor = await resolveActor(c)
    if (!actor) {
      return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
    }
    let ids: string[] = []
    try {
      const body = await c.req.json()
      if (Array.isArray(body)) ids = body.map((id: any) => String(id))
    } catch {
      return c.json(
        { code: 400, message: "invalid request format", data: null },
        400,
      )
    }
    if (ids.length === 0) {
      return c.json(
        { code: 400, message: "invalid request format", data: null },
        400,
      )
    }
    try {
      const data = await applyBulkAction(c.env, type, ids, actor, action)
      return c.json({ code: 200, message: "success", data })
    } catch (err) {
      return errorResponse(c, err)
    }
  })
}

taskRouter.post("/:type/clear_done", async (c) => {
  const type = parseTaskType(c)
  if (!type) {
    return c.json({ code: 404, message: "task type not found", data: null }, 404)
  }
  const actor = await resolveActor(c)
  if (!actor) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  try {
    await clearDoneTasks(c.env, type, actor, false)
    return c.json({ code: 200, message: "success", data: null })
  } catch (err) {
    return errorResponse(c, err)
  }
})

taskRouter.post("/:type/clear_succeeded", async (c) => {
  const type = parseTaskType(c)
  if (!type) {
    return c.json({ code: 404, message: "task type not found", data: null }, 404)
  }
  const actor = await resolveActor(c)
  if (!actor) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  try {
    await clearDoneTasks(c.env, type, actor, true)
    return c.json({ code: 200, message: "success", data: null })
  } catch (err) {
    return errorResponse(c, err)
  }
})

taskRouter.post("/:type/retry_failed", async (c) => {
  const type = parseTaskType(c)
  if (!type) {
    return c.json({ code: 404, message: "task type not found", data: null }, 404)
  }
  if (!allowsRetry(type)) {
    return c.json(
      { code: 404, message: "retry is not supported for this type", data: null },
      404,
    )
  }
  const actor = await resolveActor(c)
  if (!actor) {
    return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
  }
  try {
    await retryFailedTasks(c.env, type, actor)
    return c.json({ code: 200, message: "success", data: null })
  } catch (err) {
    return errorResponse(c, err)
  }
})

/**
 * 任务泵（外部 cron / 手动触发）。
 *
 * EdgeOne 的 schedules 最小间隔是一天，无法当分钟级泵使用；部署在非 CF 平台时
 * 需要外部 cron 每分钟 POST 到这里（带 X-Cron-Secret 或管理员凭证）。
 * 只执行已存在的任务，不接受任何路径/URL 参数。
 */
taskRouter.post("/run", async (c) => {
  let isCron = false
  try {
    isCron = await matchCronSecret(c)
  } catch {}
  if (!isCron) {
    const actor = await resolveActor(c)
    if (!actor?.isAdmin) {
      return c.json({ code: 401, message: "Unauthorized", data: null }, 401)
    }
  }
  let budgetMs: number | undefined
  try {
    const body = await c.req.json()
    budgetMs = Number(body?.budget_ms) || undefined
  } catch {
    // 无 body 或非 JSON：用默认预算
  }
  try {
    const data = await runTaskPump(
      c.env,
      {
        env: c.env,
        origin: new URL(c.req.url).origin,
        waitUntil: (() => {
          try {
            return (promise: Promise<unknown>) =>
              c.executionCtx.waitUntil(promise)
          } catch {
            return undefined
          }
        })(),
      },
      { budgetMs, pump: "http" },
    )
    return c.json({ code: 200, message: "success", data })
  } catch (err) {
    return errorResponse(c, err)
  }
})
