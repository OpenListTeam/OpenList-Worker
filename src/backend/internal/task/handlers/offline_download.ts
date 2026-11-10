/**
 * URL 离线下载任务。
 *
 * 安全模型（默认关闭）：
 *   - 必须显式配置 `ALLOW_OFFLINE_DOWNLOAD`（主机白名单，逗号/空格分隔，
 *     支持 `*.example.com`）；空表示拒绝一切外网下载，避免被当成免费代理
 *     刷流量。
 *   - 仍然走 `assertSafeUrl` 的 SSRF 防护（私网/云元数据地址一律拒绝）。
 *   - 入队时校验一次，执行时再校验一次（配置可能在任务排队期间被收紧）。
 */
import { assertSafeUrl } from "../../../pkg/http"
import { getItem, listItems } from "../../op/storage"
import { transferToPath } from "../../op/transfer"
import type { TaskRuntime } from "../../op/transfer"
import type { TaskHandler, TaskUnitResult, TaskVerifyResult } from "../runner"
import type { TaskRecord } from "../types"

export interface OfflineDownloadPayload {
  url: string
  /** 已套用 base_path 的目标目录 */
  dst_dir: string
  /** 目标文件名（入队时已清洗） */
  name: string
  origin?: string
}

/** 读取主机白名单：`ALLOW_OFFLINE_DOWNLOAD`（也兼容 `OFFLINE_DOWNLOAD_ALLOW`） */
export function offlineDownloadAllowList(env?: any): string[] {
  const raw =
    env?.ALLOW_OFFLINE_DOWNLOAD ??
    env?.OFFLINE_DOWNLOAD_ALLOW ??
    (typeof process !== "undefined"
      ? (process.env?.ALLOW_OFFLINE_DOWNLOAD ??
        process.env?.OFFLINE_DOWNLOAD_ALLOW)
      : "")
  return String(raw || "")
    .split(/[\s,;]+/)
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

export function hostAllowed(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase()
  return allowlist.some((entry) =>
    entry.startsWith("*.")
      ? host.endsWith(entry.slice(1)) && host !== entry.slice(2)
      : host === entry,
  )
}

/** 校验一个下载地址：协议、SSRF、主机白名单 */
export function assertDownloadUrlAllowed(url: string, env?: any): void {
  const allowlist = offlineDownloadAllowList(env)
  if (allowlist.length === 0) {
    throw new Error(
      "offline download is disabled: set ALLOW_OFFLINE_DOWNLOAD to a comma-separated host allowlist",
    )
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`invalid URL: ${url}`)
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("only http(s) URLs are supported")
  }
  assertSafeUrl(parsed.toString(), "Offline download")
  if (!hostAllowed(parsed.hostname, allowlist)) {
    throw new Error(
      `host "${parsed.hostname}" is not in the ALLOW_OFFLINE_DOWNLOAD allowlist`,
    )
  }
}

/** 从 URL 推导一个安全的文件名 */
export function fileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const last = parsed.pathname.split("/").filter(Boolean).pop() || ""
    const decoded = decodeURIComponent(last)
    const clean = decoded.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim()
    if (clean && clean !== "." && clean !== "..") return clean
  } catch {
    // 落到默认名
  }
  return `download-${Date.now()}`
}

function readPayload(value: unknown): OfflineDownloadPayload {
  const payload = (value || {}) as Partial<OfflineDownloadPayload>
  if (!payload.url) throw new Error("invalid task payload: url is missing")
  if (!payload.dst_dir) throw new Error("invalid task payload: dst_dir is missing")
  return {
    url: String(payload.url),
    dst_dir: String(payload.dst_dir),
    name: String(payload.name || fileNameFromUrl(String(payload.url))),
    origin: typeof payload.origin === "string" ? payload.origin : undefined,
  }
}

function withOrigin(
  rt: TaskRuntime,
  payload: OfflineDownloadPayload,
): TaskRuntime {
  if (rt.origin) return rt
  const origin = payload.origin || rt.env?.PUBLIC_ORIGIN || ""
  return origin ? { ...rt, origin: String(origin) } : rt
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/+$/, "")}/${name}`
}

function targetPathOf(payload: OfflineDownloadPayload): string {
  return joinPath(payload.dst_dir, payload.name)
}

async function runUnitImpl(
  rt: TaskRuntime,
  task: TaskRecord,
): Promise<TaskUnitResult> {
  const payload = readPayload(task.payload)
  const taskRt = withOrigin(rt, payload)
  // 执行时重新校验：白名单可能在任务排队期间被收紧
  assertDownloadUrlAllowed(payload.url, taskRt.env)

  const cap =
    Number(taskRt.env?.TASK_DOWNLOAD_MAX_BYTES) > 0
      ? Number(taskRt.env?.TASK_DOWNLOAD_MAX_BYTES)
      : 64 * 1024 * 1024

  const result = await transferToPath(
    taskRt,
    { url: payload.url },
    targetPathOf(payload),
    {
      maxBufferedBytes: cap,
      preferServerSide: false,
    },
  )

  return {
    finished: true,
    totalBytes: result.bytes,
    doneBytes: result.bytes,
    cursor: { downloaded: result.bytes, method: result.method },
    status: `downloaded via ${result.method}`,
  }
}

async function verifyImpl(
  rt: TaskRuntime,
  task: TaskRecord,
): Promise<TaskVerifyResult> {
  const payload = readPayload(task.payload)
  const taskRt = withOrigin(rt, payload)
  const target = targetPathOf(payload)
  const parent = target.slice(0, target.lastIndexOf("/")) || "/"
  try {
    const listing = await listItems(parent, {
      env: taskRt.env,
      waitUntil: taskRt.waitUntil,
    })
    const found = (listing.content || []).find(
      (item) => item.name === payload.name,
    )
    if (!found) return { ok: false, error: `target file not found: ${target}` }
    return { ok: true }
  } catch (err: any) {
    // list 不可用时退化为按路径探测
    try {
      await getItem(target, { env: taskRt.env, waitUntil: taskRt.waitUntil })
      return { ok: true }
    } catch {
      return {
        ok: false,
        error: `failed to verify ${target}: ${err?.message || err}`,
      }
    }
  }
}

export const offlineDownloadHandler: TaskHandler = {
  type: "offline_download",
  async runUnit(rt, task) {
    return runUnitImpl(rt, task)
  },
  async verify(rt, task) {
    return verifyImpl(rt, task)
  },
}
