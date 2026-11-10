/**
 * 任务系统的设置读取。
 *
 * 全部设置项都在 `defaultDb.settings` 中声明（group 11 = TRAFFIC，与 Go 版
 * 的任务设置同组），用户可在设置页直接改。这里只做「字符串 → 数值/布尔」
 * 的解析与默认值兜底，缺项或非法值一律回落默认，避免一个坏值把队列卡死。
 */
import { getSettings } from "../model/db"
import type { TaskType } from "./types"

export interface TaskSettings {
  enabled: boolean
  /** 同步阈值（字节） */
  syncThresholdBytes: number
  probeMaxEntries: number
  /** 0 = 自动（按泵选择保守值） */
  tickBudgetMs: number
  parallelUnits: number
  keepDone: number
  maxRetry: Record<TaskType, number>
}

const DEFAULT_MAX_RETRY: Record<TaskType, number> = {
  upload: 1,
  copy: 2,
  move: 2,
  offline_download: 2,
  offline_download_transfer: 2,
  decompress: 2,
  decompress_upload: 1,
  seed_generate: 2,
  seed_save: 1,
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback
  const text = String(value).trim().toLowerCase()
  if (["true", "1", "yes", "on"].includes(text)) return true
  if (["false", "0", "no", "off"].includes(text)) return false
  return fallback
}

function asInt(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export async function getTaskSettings(): Promise<TaskSettings> {
  let settings: Record<string, any> = {}
  try {
    settings = await getSettings()
  } catch (err) {
    // 配置读取失败时不能抛出：任务 API 仍需返回可读错误而不是 500 空响应
    console.error("[Task] failed to read settings, using defaults:", err)
  }
  const thresholdMb = asInt(settings.task_sync_threshold_mb, 32, 0, 1024 * 1024)
  return {
    enabled: asBool(settings.task_enabled, true),
    syncThresholdBytes: thresholdMb * 1024 * 1024,
    probeMaxEntries: asInt(settings.task_probe_max_entries, 200, 10, 5000),
    tickBudgetMs: asInt(settings.task_tick_budget_ms, 0, 0, 60000),
    parallelUnits: asInt(settings.task_parallel_units, 1, 1, 4),
    keepDone: asInt(settings.task_keep_done, 50, 0, 200),
    maxRetry: {
      ...DEFAULT_MAX_RETRY,
      copy: asInt(settings.task_copy_max_retry, DEFAULT_MAX_RETRY.copy, 0, 10),
      move: asInt(settings.task_move_max_retry, DEFAULT_MAX_RETRY.move, 0, 10),
      decompress: asInt(
        settings.task_decompress_max_retry,
        DEFAULT_MAX_RETRY.decompress,
        0,
        10,
      ),
      offline_download: asInt(
        settings.task_download_max_retry,
        DEFAULT_MAX_RETRY.offline_download,
        0,
        10,
      ),
      seed_generate: asInt(
        settings.task_seed_max_retry,
        DEFAULT_MAX_RETRY.seed_generate,
        0,
        10,
      ),
      seed_save: asInt(
        settings.task_seed_max_retry,
        DEFAULT_MAX_RETRY.seed_save,
        0,
        10,
      ),
    },
  }
}

/**
 * 单次 tick 的时间预算。
 *
 * 用户显式配置（200~60000ms）优先；未配置时按「泵」给保守默认：
 * 免费计划 CPU 只有 10ms，2s 的 I/O 切片已经接近安全上限；付费计划建议
 * 用户在设置里改成 20000。
 */
export type TaskPump = "do" | "cron" | "http" | "inline" | "node" | "esa"

const AUTO_BUDGET: Record<TaskPump, number> = {
  do: 2000,
  cron: 2000,
  http: 5000,
  inline: 2000,
  node: 30000,
  esa: 2000,
}

export function resolveTickBudget(
  settings: TaskSettings,
  pump: TaskPump,
): number {
  if (settings.tickBudgetMs > 0) {
    return Math.min(60000, Math.max(200, settings.tickBudgetMs))
  }
  return AUTO_BUDGET[pump] ?? 2000
}
