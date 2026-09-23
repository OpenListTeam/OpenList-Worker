import assert from "node:assert/strict"
import { test } from "node:test"
import {
  singleflight,
  getSingleFlightStats,
  __resetSingleFlightForTest,
  __singleFlightInsertIgnoreForTest,
} from "./singleflight"
import {
  buildSingleFlightDdl,
  singleflightTableName,
} from "../internal/model/store/schema"

/**
 * singleflight 单飞去重回归测试。
 *
 * 背景：本仓库跑在 Workers 上，一个部署有多个 isolate，进程内 Map 无法跨实例
 * 合并重复调用，因此需要数据库表做二级协调。本文件锁定以下行为：
 *
 *   1. L1（进程内）必须把并发的同 key 调用合并为一次执行；
 *   2. L2（数据库表）必须能让等待方读到执行者的结果，而不是各自再执行一次；
 *   3. **绝不脏读**：到达时若该 key 上已有「已结束」的记录，必须重新执行，
 *      不能把上一轮的结果当缓存返回（否则会出现「删除后刷新仍看到被删文件」）；
 *   4. 业务异常原样抛出且不重试；协调层异常则降级为直接执行（可用性优先）；
 *   5. off / memory / db 三种模式与 SQL 方言分支正确。
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface MockRow {
  key: string
  owner: string
  state: string
  started_at: number
  expires_at: number
  result: string | null
  error: string | null
}

/**
 * 基于局部 Map 的简易 SQL 驱动。
 *
 * 只实现 pkg/singleflight.ts 实际会发出的那几条语句（与 store.test.ts 的
 * mock 驱动思路一致），并保留 rows 便于用例直接构造「别的实例写入的行」。
 */
function createMockSqlDriver(dialect: "sqlite" | "mysql" = "sqlite") {
  const rows = new Map<string, MockRow>()
  let pendingFailure: Error | null = null

  const maybeFail = () => {
    if (pendingFailure) {
      const err = pendingFailure
      pendingFailure = null
      throw err
    }
  }

  const driver = {
    name: dialect === "mysql" ? "mysql" : "d1",

    async query(sql: string, params: any[]): Promise<any[]> {
      maybeFail()
      const s = sql.trim()
      if (/^SELECT `owner` FROM/i.test(s)) {
        const r = rows.get(String(params[0]))
        return r ? [{ owner: r.owner }] : []
      }
      if (/^SELECT `state`/i.test(s)) {
        const r = rows.get(String(params[0]))
        return r
          ? [
              {
                state: r.state,
                result: r.result,
                error: r.error,
                expires_at: r.expires_at,
              },
            ]
          : []
      }
      throw new Error(`mock-sql unsupported query: ${sql}`)
    },

    async execute(sql: string, params: any[]): Promise<void> {
      maybeFail()
      const s = sql.trim()

      // 回收：过期行 或 已结束（state <> running）的行
      if (
        /^DELETE FROM .* WHERE `key` = \? AND \(`expires_at` <= \? OR `state` <> \?\)/i.test(
          s,
        )
      ) {
        const [key, now, running] = params
        const r = rows.get(String(key))
        if (r && (r.expires_at <= Number(now) || r.state !== String(running))) {
          rows.delete(String(key))
        }
        return
      }

      // 执行者主动释放
      if (/^DELETE FROM .* WHERE `key` = \? AND `owner` = \?/i.test(s)) {
        const [key, owner] = params
        const r = rows.get(String(key))
        if (r && r.owner === String(owner)) rows.delete(String(key))
        return
      }

      // 抢占：INSERT [OR] IGNORE，主键冲突即忽略（模拟数据库的原子性）
      const ins = s.match(
        /^INSERT (?:OR )?IGNORE INTO .* \(([^)]+)\) VALUES \(([^)]+)\)/i,
      )
      if (ins) {
        const cols = ins[1].split(",").map((c) => c.trim().replace(/`/g, ""))
        const key = String(params[0])
        if (rows.has(key)) return
        const row: any = {}
        cols.forEach((c, i) => {
          row[c] = params[i]
        })
        rows.set(key, row as MockRow)
        return
      }

      // 写回结果
      if (
        /^UPDATE .* SET `state` = \?, `result` = \?, `error` = \?, `expires_at` = \? WHERE `key` = \? AND `owner` = \?/i.test(
          s,
        )
      ) {
        const [state, result, error, expires, key, owner] = params
        const r = rows.get(String(key))
        if (r && r.owner === String(owner)) {
          r.state = String(state)
          r.result = result ?? null
          r.error = error ?? null
          r.expires_at = Number(expires)
        }
        return
      }

      // 续租
      if (
        /^UPDATE .* SET `expires_at` = \? WHERE `key` = \? AND `owner` = \? AND `state` = \?/i.test(
          s,
        )
      ) {
        const [expires, key, owner, state] = params
        const r = rows.get(String(key))
        if (r && r.owner === String(owner) && r.state === String(state)) {
          r.expires_at = Number(expires)
        }
        return
      }

      throw new Error(`mock-sql unsupported execute: ${sql}`)
    },

    isAvailable: async () => true,
    init: async () => {},
    get: async () => null,
    put: async () => {},
    delete: async () => {},
    list: async () => [],
    health: async () => ({ connected: true }),

    /** 测试钩子：直接读写表内容，用于构造「别的实例」的行。 */
    rows,
    failNext(err: Error) {
      pendingFailure = err
    },
  }

  return driver
}

// ── 建表语句 ────────────────────────────────────────────────────────────────

test("schema: singleflight 表名带 x_ 前缀，且 DDL 覆盖两种方言", () => {
  assert.equal(singleflightTableName(), "x_singleflight")

  const sqlite = buildSingleFlightDdl("sqlite").join("\n")
  assert.match(sqlite, /CREATE TABLE IF NOT EXISTS `x_singleflight`/)
  assert.match(sqlite, /`expires_at` INTEGER NOT NULL/)
  // 回收过期行需要按 expires_at 过滤，SQLite 侧建索引
  assert.match(sqlite, /CREATE INDEX IF NOT EXISTS `idx_singleflight_expires`/)

  const mysql = buildSingleFlightDdl("mysql").join("\n")
  assert.match(mysql, /CREATE TABLE IF NOT EXISTS `x_singleflight`/)
  assert.match(mysql, /`key` VARCHAR\(512\) PRIMARY KEY/)
  assert.match(mysql, /`expires_at` BIGINT NOT NULL/)
  // MySQL 不支持 CREATE INDEX IF NOT EXISTS，因此不建索引
  assert.doesNotMatch(mysql, /CREATE INDEX/)
})

test("schema: singleflight 表不得进入配置往返（否则保存配置会清空在途记录）", async () => {
  const schema = await import("../internal/model/store/schema")
  assert.ok(
    !(schema.TABLE_NAMES as readonly string[]).includes("singleflight"),
    "singleflight 是运行时数据，不能放进 TABLE_NAMES",
  )
  assert.ok(
    !(schema.DDL_TABLE_NAMES as readonly string[]).includes("singleflight"),
    "建表由驱动单独执行（buildSingleFlightDdl），不混入列式表 DDL",
  )
})

test("SQL 方言：mysql 用 INSERT IGNORE，d1/do（SQLite）用 INSERT OR IGNORE", () => {
  assert.equal(__singleFlightInsertIgnoreForTest("mysql"), "INSERT IGNORE")
  assert.equal(__singleFlightInsertIgnoreForTest("d1"), "INSERT OR IGNORE")
  assert.equal(__singleFlightInsertIgnoreForTest("do"), "INSERT OR IGNORE")
})

// ── L1：进程内合并 ──────────────────────────────────────────────────────────

test("memory: 并发相同 key 只执行一次，所有调用方拿到同一结果", async () => {
  __resetSingleFlightForTest()
  let executed = 0

  const fn = async () => {
    executed++
    await delay(30)
    return { value: "shared" }
  }

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      singleflight("mem-a", fn, { mode: "memory", env: {} }),
    ),
  )

  assert.equal(executed, 1, "10 个并发调用只应触发 1 次执行")
  for (const r of results) assert.deepEqual(r, { value: "shared" })

  const stats = getSingleFlightStats()
  assert.equal(stats.executed, 1)
  assert.equal(stats.coalesced, 9, "其余 9 次应被 L1 合并")
})

test("memory: 执行结束后不缓存结果，下一次调用会重新执行", async () => {
  __resetSingleFlightForTest()
  let executed = 0
  const fn = async () => {
    executed++
    return executed
  }

  assert.equal(await singleflight("mem-b", fn, { mode: "memory", env: {} }), 1)
  assert.equal(await singleflight("mem-b", fn, { mode: "memory", env: {} }), 2)
  assert.equal(executed, 2, "singleflight 只合并并发，不做结果缓存")
})

test("memory: 失败传播给所有等待方，且不残留导致后续调用被误合并", async () => {
  __resetSingleFlightForTest()
  let executed = 0
  const failing = async () => {
    executed++
    await delay(10)
    throw new Error("upstream boom")
  }

  const settled = await Promise.allSettled([
    singleflight("mem-c", failing, { mode: "memory", env: {} }),
    singleflight("mem-c", failing, { mode: "memory", env: {} }),
  ])
  assert.equal(executed, 1)
  assert.ok(settled.every((s) => s.status === "rejected"))
  assert.match(String((settled[0] as any).reason?.message), /upstream boom/)

  // 在途表必须已清理：下一次调用应重新执行而不是复用已失败的 Promise
  assert.equal(
    await singleflight("mem-c", async () => "ok", { mode: "memory", env: {} }),
    "ok",
  )
  assert.equal(getSingleFlightStats().active, 0)
})

test("off: 完全关闭去重，每次调用都直接执行", async () => {
  __resetSingleFlightForTest()
  let executed = 0
  const fn = async () => {
    executed++
    await delay(20)
    return executed
  }

  await Promise.all(
    Array.from({ length: 3 }, () =>
      singleflight("off-a", fn, { mode: "off", env: {} }),
    ),
  )
  assert.equal(executed, 3)
  assert.equal(getSingleFlightStats().mode, "off")
})

// ── L2：数据库表协调 ────────────────────────────────────────────────────────

test("db: 到达时发现执行者正在运行 → 等待并共享其结果（不重复执行）", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()
  const now = Date.now()

  // 模拟「另一个 isolate 已在执行」：running 行由 other 持有
  driver.rows.set("db-share", {
    key: "db-share",
    owner: "other-instance",
    state: "running",
    started_at: now,
    expires_at: now + 5000,
    result: null,
    error: null,
  })
  // 30ms 后对方写回结果
  setTimeout(() => {
    const row = driver.rows.get("db-share")!
    row.state = "done"
    row.result = JSON.stringify({ from: "leader" })
    row.expires_at = Date.now() + 1000
  }, 30)

  let executed = 0
  const out = await singleflight(
    "db-share",
    async () => {
      executed++
      return { from: "self" }
    },
    { mode: "db", driver, env: {}, pollMs: 5, waitTimeoutMs: 3000 },
  )

  assert.deepEqual(out, { from: "leader" })
  assert.equal(executed, 0, "等待方不应自己执行")
  assert.equal(getSingleFlightStats().shared, 1)
})

test("db: 到达时记录已结束 → 必须重新执行，绝不返回旧结果（防脏读）", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()
  const now = Date.now()

  // 上一轮调用留下的交接记录：内容已经过期
  driver.rows.set("db-stale", {
    key: "db-stale",
    owner: "other-instance",
    state: "done",
    started_at: now - 100,
    expires_at: now + 10_000,
    result: JSON.stringify({ value: "stale" }),
    error: null,
  })

  let executed = 0
  const out = await singleflight(
    "db-stale",
    async () => {
      executed++
      return { value: "fresh" }
    },
    { mode: "db", driver, env: {}, pollMs: 5, waitTimeoutMs: 500 },
  )

  assert.deepEqual(out, { value: "fresh" }, "新到达者必须拿到新鲜结果")
  assert.equal(executed, 1)
  assert.equal(getSingleFlightStats().shared, 0, "不应命中交接记录")
})

test("db: 抢到锁后写回结果，行状态为 done 且带交接窗口", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()

  const out = await singleflight("db-lead", async () => ({ n: 7 }), {
    mode: "db",
    driver,
    env: {},
    handoffMs: 1234,
  })

  assert.deepEqual(out, { n: 7 })
  const row = driver.rows.get("db-lead")
  assert.ok(row, "执行者应留下交接记录供等待方读取")
  assert.equal(row!.state, "done")
  assert.equal(row!.result, JSON.stringify({ n: 7 }))
  assert.equal(row!.owner.length > 0, true)
  assert.ok(
    row!.expires_at > Date.now() + 1000 && row!.expires_at <= Date.now() + 1400,
    "expires_at 应约为 now + handoffMs",
  )
  assert.equal(getSingleFlightStats().executed, 1)
})

test("db: handoffMs=0 时执行完立即释放，不留交接记录", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()

  await singleflight("db-nohand", async () => "v", {
    mode: "db",
    driver,
    env: {},
    handoffMs: 0,
  })

  assert.equal(driver.rows.size, 0, "交接窗口为 0 应立即删除行")
})

test("db: 业务异常原样抛出，且不会被降级重试（只执行一次）", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()
  let executed = 0

  await assert.rejects(
    singleflight(
      "db-err",
      async () => {
        executed++
        throw new Error("driver exploded")
      },
      { mode: "db", driver, env: {} },
    ),
    /driver exploded/,
  )

  assert.equal(executed, 1, "业务异常不得触发降级重试")
  assert.equal(getSingleFlightStats().fallback, 0)
  // 失败也应写回，让等待方共享失败而不是各自重试上游
  assert.equal(driver.rows.get("db-err")!.state, "error")
})

test("db: 协调层异常（DB 不可用）→ 降级为直接执行，业务不受影响", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()
  driver.failNext(new Error("D1_ERROR: no such table: x_singleflight"))

  let executed = 0
  const out = await singleflight(
    "db-degrade",
    async () => {
      executed++
      return "business-ok"
    },
    { mode: "db", driver, env: {} },
  )

  assert.equal(out, "business-ok")
  assert.equal(executed, 1)
  assert.equal(getSingleFlightStats().fallback, 1)
})

test("db: 等待超时后自行执行，不会无限挂起", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()
  const now = Date.now()

  // 执行者一直 running 且迟迟不写回
  driver.rows.set("db-timeout", {
    key: "db-timeout",
    owner: "other-instance",
    state: "running",
    started_at: now,
    expires_at: now + 60_000,
    result: null,
    error: null,
  })

  let executed = 0
  const out = await singleflight(
    "db-timeout",
    async () => {
      executed++
      return "self-result"
    },
    { mode: "db", driver, env: {}, pollMs: 5, waitTimeoutMs: 40 },
  )

  assert.equal(out, "self-result")
  assert.equal(executed, 1, "等待超时后应自行执行，保证请求不被拖死")
})

// ── auto 模式 ───────────────────────────────────────────────────────────────

test("auto: 探测不到 SQL 驱动 → memory（不会因为无数据库而报错）", async () => {
  __resetSingleFlightForTest()
  let executed = 0
  const out = await singleflight(
    "auto-mem",
    async () => {
      executed++
      return "ok"
    },
    { mode: "auto", driver: null, env: {} },
  )

  assert.equal(out, "ok")
  assert.equal(executed, 1)
  assert.equal(getSingleFlightStats().mode, "memory")
})

test("auto: 探测到 SQL 驱动 → db", async () => {
  __resetSingleFlightForTest()
  const driver = createMockSqlDriver()
  const out = await singleflight("auto-db", async () => "ok", {
    mode: "auto",
    driver,
    env: {},
  })

  assert.equal(out, "ok")
  assert.equal(getSingleFlightStats().mode, "db")
  assert.equal(driver.rows.get("auto-db")!.state, "done")
})

test("环境变量 SINGLEFLIGHT 可强制模式，非法值回退 auto", async () => {
  __resetSingleFlightForTest()
  let executed = 0
  const fn = async () => {
    executed++
    await delay(15)
    return executed
  }

  // off：3 次调用全部执行
  await Promise.all(
    Array.from({ length: 3 }, () =>
      singleflight("env-off", fn, { env: { SINGLEFLIGHT: "off" } }),
    ),
  )
  assert.equal(executed, 3)
  assert.equal(getSingleFlightStats().mode, "off")

  __resetSingleFlightForTest()
  executed = 0
  // 非法值 → auto → 无 SQL 驱动 → memory（仍然合并）
  await Promise.all(
    Array.from({ length: 3 }, () =>
      singleflight("env-bad", fn, { env: { SINGLEFLIGHT: "nonsense" } }),
    ),
  )
  assert.equal(executed, 1)
  assert.equal(getSingleFlightStats().mode, "memory")
})
