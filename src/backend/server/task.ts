import { Hono } from "hono"
import { getDb, saveDb } from "../internal/model/db"
import { getDriver } from "../internal/op/storage"
import { runQuarkCheckin } from "../internal/checkin/quark"
import { adminAuthMiddleware, matchCronSecret } from "./middlewares"

export const taskRouter = new Hono()

// 定时任务调度接口：刷新所有已启用网盘驱动的 Token / 状态并持久化
// 仅管理员可触发（防止未授权用户探测存储配置/触发资源消耗）。
// EdgeOne Schedules 等平台调度器无法附加 Authorization 头，
// 因此复用 JWT_SECRET 作为调度密钥，调度请求可携带该密钥
//（JSON body / query / X-Cron-Secret 头）通过 matchCronSecret 放行。
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
        // lanzou 驱动：主动校验 Cookie 是否过期（有效期约 15 天），
        // 失效时标记 status=cookie_expired，管理后台可直接看到提示
        if (
          typeof (driver as any).checkCookieValid === "function" &&
          /lanzou/i.test(String(s.driver))
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

/**
 * 定时签到入口。
 *
 * 鉴权与 /refresh 完全一致：调度平台（EdgeOne Schedules 等）无法附加
 * Authorization 头，因此复用 JWT_SECRET 作为调度密钥。
 *
 * 目前只接入了夸克网盘（唯一实现）。设置项：
 *   quark_checkin_enabled  是否启用
 *   quark_checkin_accounts 账号列表，每行一个
 */
taskRouter.all(
  "/checkin",
  async (c, next) => {
    if (await matchCronSecret(c)) return next()
    return adminAuthMiddleware(c, next)
  },
  async (c) => {
    const db = await getDb(c.env)
    const setting = (key: string): string => {
      const s = (db.settings || []).find((x: any) => x?.key === key)
      return s && s.value != null ? String(s.value) : ""
    }

    if (setting("quark_checkin_enabled").trim().toLowerCase() !== "true") {
      return c.json({
        code: 200,
        message: "checkin skipped: quark_checkin_enabled is off",
        data: { total: 0, ok: 0, skipped: 0, failed: 0, results: [] },
      })
    }

    const results = await runQuarkCheckin(setting("quark_checkin_accounts"))
    const ok = results.filter((r) => r.status === "ok").length
    const skipped = results.filter((r) => r.status === "skipped").length
    const failed = results.filter((r) => r.status === "failed").length

    // 与 /refresh 同一条教训：每个账号都失败时必须返回非 2xx，
    // 否则每晚静默失败的调度任务看起来一切正常。
    if (ok === 0 && skipped === 0 && failed > 0) {
      return c.json(
        {
          code: 500,
          message: `checkin failed: all ${failed} account(s) failed`,
          data: { total: results.length, ok, skipped, failed, results },
        },
        500,
      )
    }

    return c.json({
      code: 200,
      message: "checkin executed",
      data: { total: results.length, ok, skipped, failed, results },
    })
  },
)

// In-memory or stateless placeholder for task management in serverless
const tasks: Record<string, any[]> = {
  upload: [],
  copy: [],
  move: [],
  offline_download: [],
}

// All task-management endpoints are admin-only (placeholder APIs that may
// later carry real file-operation metadata)
taskRouter.use("*", adminAuthMiddleware)

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

// 以下接口在 TS Worker 中无意义：TS 不维护持久异步任务队列，
// 所有文件操作均同步完成后立即返回。任务 ID / 进度 / 重试 / 取消
// 等生命周期管理由 Go 后端负责，此处明确返回 501。
const unsupportedTaskOp = (c: any) =>
  c.json(
    {
      code: 501,
      message:
        "task lifecycle operations (retry/cancel/delete) are not supported in the TS Worker runtime; " +
        "file operations execute synchronously and do not produce persistent tasks",
      data: null,
    },
    501,
  )

taskRouter.post("/:type/retry_failed", unsupportedTaskOp)
taskRouter.post("/:type/retry", unsupportedTaskOp)
taskRouter.post("/:type/retry_some", unsupportedTaskOp)
taskRouter.post("/:type/cancel", unsupportedTaskOp)
taskRouter.post("/:type/cancel_some", unsupportedTaskOp)
taskRouter.post("/:type/delete", unsupportedTaskOp)
taskRouter.post("/:type/delete_some", unsupportedTaskOp)
