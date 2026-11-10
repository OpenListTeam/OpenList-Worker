/**
 * Durable Object 任务存储的客户端（在 Worker 请求侧使用）。
 *
 * 真正的数据在 TaskRunner DO 的 SQLite 里；这里只做 RPC 转发。
 * DO 的存在让「入队即 setAlarm」成为可能：入队请求返回后任务立刻开始执行，
 * 不必等下一分钟的 cron。
 */
import type { TaskAdmin, TaskListQuery } from "./store"
import type { TaskRecord, TaskType } from "./types"

export interface TaskDoNamespace {
  idFromName(name: string): any
  get(id: any): any
}

/** 从 env / globalThis 探测 TASK_DO 绑定（EdgeOne 把绑定注入为全局） */
export function getTaskDoNamespace(env?: any): TaskDoNamespace | null {
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {}
  const candidates = [env?.TASK_DO, g?.TASK_DO]
  for (const candidate of candidates) {
    if (candidate && typeof candidate.idFromName === "function") {
      return candidate as TaskDoNamespace
    }
  }
  return null
}

export function getTaskDoStub(env?: any): any | null {
  const namespace = getTaskDoNamespace(env)
  if (!namespace) return null
  const name = String(env?.TASK_DO_ID || "openlist-tasks")
  try {
    return namespace.get(namespace.idFromName(name))
  } catch (err) {
    console.warn("[Task] failed to get TaskRunner stub:", err)
    return null
  }
}

export function hasTaskDo(env?: any): boolean {
  return getTaskDoNamespace(env) !== null
}

export class DoTaskClient implements TaskAdmin {
  constructor(private readonly stub: any) {}

  async enqueue(record: TaskRecord): Promise<void> {
    await this.stub.enqueue(record)
  }

  async list(query: TaskListQuery): Promise<TaskRecord[]> {
    return (await this.stub.list(query)) || []
  }

  async get(type: TaskType, id: string): Promise<TaskRecord | null> {
    return (await this.stub.get(type, id)) || null
  }

  async patch(
    type: TaskType,
    id: string,
    patch: Partial<TaskRecord>,
  ): Promise<TaskRecord | null> {
    return (await this.stub.patch(type, id, patch)) || null
  }

  async remove(type: TaskType, id: string): Promise<void> {
    await this.stub.remove(type, id)
  }

  async removeMany(
    entries: Array<{ type: TaskType; id: string }>,
  ): Promise<void> {
    await this.stub.removeMany(entries)
  }

  async countActive(creatorId?: number): Promise<number> {
    return Number(await this.stub.countActive(creatorId)) || 0
  }
}
