/**
 * Task management for OpenList background operations.
 * Uses an inline EventEmitter to avoid the node:events built-in module,
 * making this file compatible with Cloudflare Workers (neutral platform).
 */

/** Minimal EventEmitter implementation — no Node.js dependency required */
class EventEmitter {
  private _listeners: Map<string, Array<(...args: any[]) => void>> = new Map()

  on(event: string, listener: (...args: any[]) => void): this {
    const list = this._listeners.get(event) ?? []
    list.push(listener)
    this._listeners.set(event, list)
    return this
  }

  once(event: string, listener: (...args: any[]) => void): this {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper)
      listener(...args)
    }
    return this.on(event, wrapper)
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const list = this._listeners.get(event)
    if (list) {
      this._listeners.set(
        event,
        list.filter((l) => l !== listener),
      )
    }
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    const list = this._listeners.get(event)
    if (!list || list.length === 0) return false
    list.forEach((l) => l(...args))
    return true
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this._listeners.delete(event)
    } else {
      this._listeners.clear()
    }
    return this
  }
}

export enum TaskStatus {
  Pending = "pending",
  Running = "running",
  Success = "success",
  Failed = "failed",
  Canceled = "canceled",
}

export interface TaskProgress {
  total: number
  current: number
  speed: number // bytes per second
}

export class Task extends EventEmitter {
  public id: string
  public name: string
  public status: TaskStatus = TaskStatus.Pending
  public progress: TaskProgress = { total: 0, current: 0, speed: 0 }
  public error?: string
  public startTime?: Date
  public endTime?: Date

  constructor(id: string, name: string) {
    super()
    this.id = id
    this.name = name
  }

  public start() {
    this.status = TaskStatus.Running
    this.startTime = new Date()
    this.emit("start", this)
  }

  public updateProgress(current: number, total?: number) {
    this.progress.current = current
    if (total !== undefined) {
      this.progress.total = total
    }
    this.emit("progress", this.progress)
  }

  public finish(error?: any) {
    this.endTime = new Date()
    if (error) {
      this.status = TaskStatus.Failed
      this.error = error.message || String(error)
      this.emit("error", error)
    } else {
      this.status = TaskStatus.Success
      this.emit("success", this)
    }
    this.emit("finish", this)
  }

  public cancel() {
    this.status = TaskStatus.Canceled
    this.emit("cancel", this)
  }
}

export class TaskManager {
  private tasks: Map<string, Task> = new Map()

  public addTask(task: Task) {
    this.tasks.set(task.id, task)
  }

  public getTask(id: string): Task | undefined {
    return this.tasks.get(id)
  }

  public listTasks(): Task[] {
    return Array.from(this.tasks.values())
  }

  public removeTask(id: string) {
    this.tasks.delete(id)
  }

  public clearFinished() {
    for (const [id, task] of Array.from(this.tasks.entries())) {
      if (
        task.status === TaskStatus.Success ||
        task.status === TaskStatus.Failed ||
        task.status === TaskStatus.Canceled
      ) {
        this.tasks.delete(id)
      }
    }
  }
}

export const GlobalTaskManager = new TaskManager()
