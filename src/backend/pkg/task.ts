
import { EventEmitter } from "node:events";

/**
 * Task management for OpenList background operations.
 */

export enum TaskStatus {
  Pending = "pending",
  Running = "running",
  Success = "success",
  Failed = "failed",
  Canceled = "canceled",
}

export interface TaskProgress {
  total: number;
  current: number;
  speed: number; // bytes per second
}

export class Task extends EventEmitter {
  public id: string;
  public name: string;
  public status: TaskStatus = TaskStatus.Pending;
  public progress: TaskProgress = { total: 0, current: 0, speed: 0 };
  public error?: string;
  public startTime?: Date;
  public endTime?: Date;

  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }

  public start() {
    this.status = TaskStatus.Running;
    this.startTime = new Date();
    this.emit("start", this);
  }

  public updateProgress(current: number, total?: number) {
    this.progress.current = current;
    if (total !== undefined) {
      this.progress.total = total;
    }
    this.emit("progress", this.progress);
  }

  public finish(error?: any) {
    this.endTime = new Date();
    if (error) {
      this.status = TaskStatus.Failed;
      this.error = error.message || String(error);
      this.emit("error", error);
    } else {
      this.status = TaskStatus.Success;
      this.emit("success", this);
    }
    this.emit("finish", this);
  }

  public cancel() {
    this.status = TaskStatus.Canceled;
    this.emit("cancel", this);
  }
}

export class TaskManager {
  private tasks: Map<string, Task> = new Map();

  public addTask(task: Task) {
    this.tasks.set(task.id, task);
  }

  public getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public listTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public removeTask(id: string) {
    this.tasks.delete(id);
  }

  public clearFinished() {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === TaskStatus.Success || task.status === TaskStatus.Failed || task.status === TaskStatus.Canceled) {
        this.tasks.delete(id);
      }
    }
  }
}

export const GlobalTaskManager = new TaskManager();
