/**
 * sync / async 判定。
 *
 * 用户要求「小于多少 M 的文件同步，否则异步，且阈值可在设置里改」。
 * 判定过程本身也有成本（要探测目录大小），因此带时间与条目上限：
 * 探测超限就直接异步，绝不为了「判断快慢」把请求拖死。
 */
import { resolvePath } from "../model/db"
import { getItem, listItems } from "../op/storage"
import type { TaskRuntime } from "../op/transfer"
import { getTaskSettings } from "./settings"

export interface TaskModeDecision {
  mode: "sync" | "async"
  totalBytes: number
  entries: number
  /** 触发异步的原因，便于日志与前端提示 */
  reason: string
}

export interface DecisionInput {
  op: "copy" | "move"
  /** 已套用 base_path 的实际路径 */
  srcDir: string
  dstDir: string
  names: string[]
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/+$/, "")}/${name}`
}

async function resolveSameStorage(
  srcDir: string,
  dstDir: string,
  rt: TaskRuntime,
): Promise<boolean> {
  try {
    const src = await resolvePath(srcDir, rt.env)
    const dst = await resolvePath(dstDir, rt.env)
    if (src.isVirtual || dst.isVirtual) return false
    return String(src.storage?.id) === String(dst.storage?.id)
  } catch {
    return false
  }
}

/**
 * 探测总大小。返回 async 时 totalBytes 只是「已发现的部分」，仅用于展示。
 */
export async function decideCopyMoveMode(
  rt: TaskRuntime,
  input: DecisionInput,
): Promise<TaskModeDecision> {
  const settings = await getTaskSettings()
  if (!settings.enabled) {
    return { mode: "sync", totalBytes: 0, entries: 0, reason: "task system disabled" }
  }
  if (input.names.length === 0) {
    return { mode: "sync", totalBytes: 0, entries: 0, reason: "no names" }
  }

  // 同存储的 move 是元数据操作（重命名），与文件大小无关
  if (input.op === "move" && (await resolveSameStorage(input.srcDir, input.dstDir, rt))) {
    return {
      mode: "sync",
      totalBytes: 0,
      entries: 0,
      reason: "same-storage move (rename)",
    }
  }

  const context = { env: rt.env, waitUntil: rt.waitUntil }
  const deadline = Date.now() + 1500
  const maxEntries = settings.probeMaxEntries
  const queue: string[] = input.names.map((name) => joinPath(input.srcDir, name))
  let entries = 0
  let totalBytes = 0

  while (queue.length > 0) {
    if (Date.now() > deadline) {
      return {
        mode: "async",
        totalBytes,
        entries,
        reason: "size probe exceeded its time budget",
      }
    }
    if (entries >= maxEntries) {
      return {
        mode: "async",
        totalBytes,
        entries,
        reason: `size probe exceeded ${maxEntries} entries`,
      }
    }
    const path = queue.shift() as string
    const { item } = await getItem(path, context)
    entries += 1
    if (item.is_dir) {
      const listing = await listItems(path, context)
      for (const child of listing.content || []) {
        queue.push(joinPath(path, child.name))
      }
      continue
    }
    totalBytes += Number(item.size) || 0
    if (totalBytes > settings.syncThresholdBytes) {
      return {
        mode: "async",
        totalBytes,
        entries,
        reason: `size exceeds ${Math.round(settings.syncThresholdBytes / 1024 / 1024)}MB threshold`,
      }
    }
  }

  if (totalBytes > settings.syncThresholdBytes) {
    return {
      mode: "async",
      totalBytes,
      entries,
      reason: "size exceeds the configured threshold",
    }
  }
  return {
    mode: "sync",
    totalBytes,
    entries,
    reason: `within ${Math.round(settings.syncThresholdBytes / 1024 / 1024)}MB threshold`,
  }
}
