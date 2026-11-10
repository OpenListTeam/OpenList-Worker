/**
 * 文档式任务存储（无 Durable Objects 的运行时）。
 *
 * 每个任务类型一份 JSON 文档：key = `tasks_<type>`。
 *   - 只用 Driver 的 get/put，因此 KV / Blob / D1 / MySQL / DO 都能工作；
 *   - key 只用 `[A-Za-z0-9_]`，满足 EdgeOne KV 的最严格约束；
 *   - **不并入配置对象**，避免与 saveDb() 的整库重写互相覆盖。
 *
 * 已知限制：KV/Blob 没有 CAS，并发 isolate 之间可能丢更新。缓解手段是
 *   （1）单类型单文档，写入窗口短；（2）claim 使用租约；
 *   （3）SQL 驱动若提供 casPut 则自动走 CAS（见 writeDoc）。
 */
import { getKvAccessor, type KvAccessor } from "../model/store/backend"
import {
  capTasks,
  pruneDoneTasks,
  pickRunnable,
  type TaskAdmin,
  type TaskClaimQuery,
  type TaskListQuery,
  type TaskRunnerStore,
} from "./store"
import { isDoneState, RUNNABLE_TYPES, type TaskRecord, type TaskType } from "./types"

interface TaskDoc {
  version: number
  updated_at: number
  tasks: TaskRecord[]
}

const KEY_PREFIX = "tasks_"

function docKey(type: TaskType): string {
  return `${KEY_PREFIX}${type}`
}

function emptyDoc(): TaskDoc {
  return { version: 0, updated_at: 0, tasks: [] }
}

function parseDoc(raw: string | null): TaskDoc {
  if (!raw) return emptyDoc()
  try {
    const parsed = JSON.parse(raw)
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : []
    return {
      version: Number(parsed?.version) || 0,
      updated_at: Number(parsed?.updated_at) || 0,
      tasks: tasks.filter((t: any) => t && typeof t.id === "string"),
    }
  } catch (err) {
    // 文档损坏不能静默清空后写回（会丢任务），只本次按空处理并告警。
    console.error("[TaskStore] failed to parse task document:", err)
    return emptyDoc()
  }
}

export class DocTaskStore implements TaskRunnerStore, TaskAdmin {
  private constructor(
    private readonly accessor: KvAccessor,
    private readonly env: any,
  ) {}

  static async create(env?: any, accessor?: KvAccessor): Promise<DocTaskStore> {
    const resolved = accessor || (await getKvAccessor(env))
    return new DocTaskStore(resolved, env)
  }

  private async read(type: TaskType): Promise<{ doc: TaskDoc; raw: string | null }> {
    const raw = await this.accessor.get(docKey(type), this.env)
    return { doc: parseDoc(raw), raw }
  }

  /**
   * 写入文档。若底层提供 compareAndSwap，则用「旧原文」做 CAS；
   * 返回 false 表示冲突，调用方应重读后重试。
   */
  private async write(
    type: TaskType,
    doc: TaskDoc,
    expectedRaw: string | null,
  ): Promise<boolean> {
    const next: TaskDoc = {
      version: (doc.version || 0) + 1,
      updated_at: Date.now(),
      tasks: capTasks(doc.tasks),
    }
    const payload = JSON.stringify(next)
    const cas = (this.accessor as any).casPut
    if (typeof cas === "function") {
      return Boolean(await cas.call(this.accessor, docKey(type), expectedRaw, payload, this.env))
    }
    await this.accessor.put(docKey(type), payload, this.env)
    return true
  }

  /** 读改写；CAS 冲突时重试。fn 返回 null 表示「无需变更」 */
  private async mutate(
    type: TaskType,
    fn: (doc: TaskDoc) => TaskDoc | null,
  ): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { doc, raw } = await this.read(type)
      const next = fn(doc)
      if (!next) return false
      if (await this.write(type, next, raw)) return true
      // 冲突：稍等再重读，避免两个实例在同一毫秒内反复撞车
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)))
    }
    return false
  }

  async enqueue(record: TaskRecord): Promise<void> {
    await this.mutate(record.type, (doc) => {
      const tasks = doc.tasks.filter((t) => t.id !== record.id)
      tasks.unshift(record)
      return { ...doc, tasks }
    })
  }

  async list(query: TaskListQuery): Promise<TaskRecord[]> {
    const { doc } = await this.read(query.type)
    const limit = Math.min(Math.max(1, query.limit ?? 200), 500)
    return doc.tasks
      .filter((t) => {
        if (query.states && !query.states.includes(t.state)) return false
        if (
          query.creator !== undefined &&
          query.creator !== null &&
          t.creator_id !== query.creator
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
      .slice(0, limit)
  }

  async get(type: TaskType, id: string): Promise<TaskRecord | null> {
    const { doc } = await this.read(type)
    return doc.tasks.find((t) => t.id === id) || null
  }

  async patch(
    type: TaskType,
    id: string,
    patch: Partial<TaskRecord>,
  ): Promise<TaskRecord | null> {
    let updated: TaskRecord | null = null
    await this.mutate(type, (doc) => {
      const index = doc.tasks.findIndex((t) => t.id === id)
      if (index < 0) return null
      const next: TaskRecord = {
        ...doc.tasks[index],
        ...patch,
        updated_at: patch.updated_at ?? Date.now(),
      }
      updated = next
      const tasks = [...doc.tasks]
      tasks[index] = next
      return { ...doc, tasks }
    })
    return updated
  }

  async remove(type: TaskType, id: string): Promise<void> {
    await this.mutate(type, (doc) => {
      if (!doc.tasks.some((t) => t.id === id)) return null
      return { ...doc, tasks: doc.tasks.filter((t) => t.id !== id) }
    })
  }

  async removeMany(entries: Array<{ type: TaskType; id: string }>): Promise<void> {
    const byType = new Map<TaskType, Set<string>>()
    for (const entry of entries) {
      const set = byType.get(entry.type) || new Set<string>()
      set.add(entry.id)
      byType.set(entry.type, set)
    }
    for (const [type, ids] of byType) {
      await this.mutate(type, (doc) => {
        const tasks = doc.tasks.filter((t) => !ids.has(t.id))
        if (tasks.length === doc.tasks.length) return null
        return { ...doc, tasks }
      })
    }
  }

  async countActive(creatorId?: number): Promise<number> {
    let total = 0
    for (const type of RUNNABLE_TYPES) {
      const { doc } = await this.read(type)
      total += doc.tasks.filter(
        (t) =>
          !isDoneState(t.state) &&
          (creatorId === undefined || t.creator_id === creatorId),
      ).length
    }
    return total
  }

  /** 按保留数淘汰已完成任务（manager 在入队后调用） */
  async prune(type: TaskType, keepDone: number): Promise<void> {
    await this.mutate(type, (doc) => {
      const tasks = pruneDoneTasks(doc.tasks, keepDone)
      if (tasks.length === doc.tasks.length) return null
      return { ...doc, tasks }
    })
  }

  async claim(query: TaskClaimQuery): Promise<TaskRecord | null> {
    for (const type of query.types) {
      // 同一个类型内最多尝试 5 次：僵尸任务累计 attempts 超限后会被直接判失败，
      // 然后继续找下一个候选，不能让一个卡死的任务把队列堵住。
      for (let attempt = 0; attempt < 5; attempt++) {
        const { doc, raw } = await this.read(type)
        const candidate = pickRunnable(doc.tasks, query)
        if (!candidate) break

        const now = query.now
        if (candidate.state === 1) {
          const attempts = (candidate.attempts || 0) + 1
          if (attempts > 3) {
            const failed: TaskRecord = {
              ...candidate,
              state: 7,
              status: "stalled",
              error: `stalled: no completion after ${attempts} attempts`,
              end_time: new Date(now).toISOString(),
              updated_at: now,
              attempts,
              lease: null,
            }
            const next: TaskDoc = {
              ...doc,
              tasks: doc.tasks.map((t) => (t.id === candidate.id ? failed : t)),
            }
            if (!(await this.write(type, next, raw))) break
            continue
          }
          const claimed: TaskRecord = {
            ...candidate,
            state: 1,
            start_time: candidate.start_time || new Date(now).toISOString(),
            updated_at: now,
            attempts,
            lease: { owner: query.owner, expires_at: now + query.leaseMs },
          }
          const next: TaskDoc = {
            ...doc,
            tasks: doc.tasks.map((t) => (t.id === candidate.id ? claimed : t)),
          }
          if (await this.write(type, next, raw)) return claimed
          break
        }

        const claimed: TaskRecord = {
          ...candidate,
          state: 1,
          start_time: candidate.start_time || new Date(now).toISOString(),
          updated_at: now,
          lease: { owner: query.owner, expires_at: now + query.leaseMs },
        }
        const next: TaskDoc = {
          ...doc,
          tasks: doc.tasks.map((t) => (t.id === candidate.id ? claimed : t)),
        }
        if (await this.write(type, next, raw)) return claimed
        break
      }
    }
    return null
  }
}
