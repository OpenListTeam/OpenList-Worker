/**
 * 上传前「强制覆盖」处理。
 *
 * 背景（Issue #100）：部分网盘驱动在上传同名文件时不会覆盖，而是自动生成
 * `xxx_(1).ext` 之类的副本（阿里云盘经 WebDAV 上传即如此）。驱动的上传接口
 * 本身不提供 overwrite 语义，因此只能在写入前主动删除旧文件。
 *
 * 代价：开启后每次上传多 1 次存在性检查（文件存在时再多 1 次删除请求），
 * 因此默认关闭，并在设置项说明里明确提示。
 *
 * 为什么放在上传入口而不是 `putItem` 内部：
 *   - 解压、种子转存等内部写路径会批量调用 `putItem`，逐个检查会成倍放大上游
 *     调用次数，且那些场景不需要「先删后写」；
 *   - 分片上传不走 `putItem`，需要单独在 init 阶段处理。
 */
import { getSettings } from "../model/db"
import { getItem, removeItems } from "./storage"
import type { StorageRequestContext } from "./storage"

const NOT_FOUND_RE = /not\s*found|no such|does not exist|不存在|404/i

/** 判断错误是否表示「目标不存在」：这类错误在存在性检查里是正常结果 */
export function isNotFoundError(err: any): boolean {
  return NOT_FOUND_RE.test(String(err?.message || err || ""))
}

/**
 * 读取设置开关。
 *
 * 读取失败时返回 false（保持旧行为），不让一次配置读取抖动导致所有上传失败。
 */
export async function isForceOverwriteUploadEnabled(): Promise<boolean> {
  try {
    const settings = await getSettings()
    const value = String(settings.upload_force_overwrite ?? "")
      .trim()
      .toLowerCase()
    return value === "true" || value === "1"
  } catch (err) {
    console.warn("[Upload] failed to read upload_force_overwrite setting:", err)
    return false
  }
}

export interface UploadOverwriteDeps {
  isEnabled?: () => Promise<boolean>
  getItemFn?: typeof getItem
  removeItemsFn?: typeof removeItems
}

/**
 * 上传前准备：开启设置时，若目标文件已存在则先删除。
 *
 * 行为约定：
 *   - 目标不存在：什么都不做（`getItem` 抛错是最常见路径）；
 *   - 目标是目录：直接报错，绝不删除目录（用文件覆盖目录没有合理语义）；
 *   - 删除失败且错误是「不存在」：视为已被并发删除，继续上传；
 *   - 其它删除失败：抛出可读错误，避免静默地又生成一个 `xxx_(1)` 副本。
 *
 * 注意：调用方必须在**请求体已通过大小校验之后**、真正写入之前调用，
 * 否则「上传被拒绝但旧文件已删」会造成数据丢失。
 */
export async function prepareUploadTarget(
  virtualPath: string,
  requestContext?: StorageRequestContext,
  deps: UploadOverwriteDeps = {},
): Promise<void> {
  const enabled = await (deps.isEnabled || isForceOverwriteUploadEnabled)()
  if (!enabled) return

  const path = String(virtualPath || "")
  const segments = path.split("/").filter(Boolean)
  const name = segments.pop() || ""
  if (!name) return
  const dir = `/${segments.join("/")}`

  const getItemFn = deps.getItemFn || getItem
  const removeItemsFn = deps.removeItemsFn || removeItems

  let existing: any
  try {
    const result = await getItemFn(path, requestContext)
    existing = result?.item
  } catch {
    // 不存在 / 无法读取：交给后续上传按原行为处理
    return
  }
  if (!existing) return
  if (existing.is_dir) {
    throw new Error(
      `cannot upload over a directory: "${path}" already exists as a folder`,
    )
  }

  try {
    await removeItemsFn(dir, [name], requestContext)
  } catch (err: any) {
    if (isNotFoundError(err)) return
    throw new Error(
      `failed to delete the existing file before upload: ${err?.message || err}`,
    )
  }
}
