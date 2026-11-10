import app from "./index"
import { OpenListDB } from "./durable-objects/OpenListDB"
import { TaskRunner } from "./durable-objects/TaskRunner"
import { setEnvCtx } from "./internal/model/db"
import { runTaskPump } from "./internal/task/manager"

// Durable Object 类（需在 wrangler 配置里声明 binding 与 migrations）：
//   OpenListDB —— DB_DRIVER=do 时的配置存储；
//   TaskRunner —— 任务队列（SQLite + alarm 自驱）。
export { OpenListDB, TaskRunner }

export default {
  fetch: app.fetch,

  /**
   * Cron Trigger（每分钟）。
   *
   * 这里**不做实际工作**，只转发给 TaskRunner DO：cron 只有 10ms CPU，
   * 真正的时间片在 DO 里执行（30s CPU / 15min 墙钟）。
   * 有 DO 时它是 alarm 链的看门狗；没有 DO（非 CF 平台）时退化为文档存储的泵。
   */
  async scheduled(event: any, env: any, ctx: any) {
    setEnvCtx(env)
    const origin =
      env?.PUBLIC_ORIGIN ||
      (typeof process !== "undefined" ? process.env?.PUBLIC_ORIGIN : undefined)
    const pump = runTaskPump(
      env,
      {
        env,
        origin: origin ? String(origin) : undefined,
        waitUntil: (promise: Promise<unknown>) => ctx.waitUntil(promise),
      },
      { pump: "cron" },
    )
    // 显式 catch：cron 的失败不应该以未处理的 rejection 形式丢弃
    ctx.waitUntil(pump.catch((err: any) => console.error("[Task] cron tick failed:", err)))
  },
}
