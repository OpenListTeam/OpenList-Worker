/**
 * 复制 / 移动任务。
 *
 * 单元粒度：一个文件（目录会被懒展开成子项，逐层压栈）。
 *   - 同存储：走驱动原生 copy/move（最快）；
 *   - 跨存储：走共享传输引擎（raw_url → 目标驱动），必要时分片续传。
 *
 * 目录按层展开而不是一次遍历整棵树，原因：
 *   1. 大目录首次遍历就可能超时；
 *   2. 只把待处理项存进 cursor，记录不会随目录规模膨胀。
 */
import { getDb, resolvePath } from "../../model/db"
import { canCopy, canMove, isWithinUserRoot } from "../../../pkg/permission"
import {
  copyItems,
  flushPendingDriverState,
  getDriver,
  getItem,
  listItems,
  makeDirectory,
  moveItems,
  removeItems,
} from "../../op/storage"
import { transferToPath, trustedHostsFor } from "../../op/transfer"
import type { MultipartState, TaskRuntime } from "../../op/transfer"
import type { TaskHandler, TaskUnitResult, TaskVerifyResult } from "../runner"
import type { TaskRecord } from "../types"

export type CopyMoveOp = "copy" | "move"

export interface CopyMovePayload {
  op: CopyMoveOp
  /** 已套用用户 base_path 的实际路径 */
  src_dir: string
  dst_dir: string
  names: string[]
  /** 入队时的部署 origin：后台没有请求对象，相对 raw_url 需要它才能解析 */
  origin?: string
}

interface StackEntry {
  src: string
  dst: string
  dir: boolean
  size: number
}

interface CopyMoveCursor {
  /** 下一个顶层条目下标 */
  index: number
  stack: StackEntry[]
  totalBytes: number
  doneBytes: number
  files: number
  doneFiles: number
  dirs: number
  doneDirs: number
  /** 是否同存储（懒计算，避免每个 unit 都解析两次） */
  sameStorage?: boolean
  /** 当前正在传输的文件（配合 upload 断点） */
  current?: string | null
  upload?: MultipartState | null
  /** 移动任务用：处理完后尝试删除已空的源目录 */
  dirsToRemove?: string[]
  cleaned?: boolean
}

const CTX = (rt: TaskRuntime) => ({ env: rt.env, waitUntil: rt.waitUntil })

function trimEnd(value: string): string {
  return value.replace(/\/+$/, "")
}

function joinPath(dir: string, name: string): string {
  return `${trimEnd(dir)}/${name}`
}

function parentOf(path: string): string {
  const trimmed = trimEnd(path)
  const index = trimmed.lastIndexOf("/")
  return index <= 0 ? "/" : trimmed.slice(0, index)
}

function baseName(path: string): string {
  const parts = trimEnd(path).split("/").filter(Boolean)
  return parts.pop() || ""
}

function emptyCursor(): CopyMoveCursor {
  return {
    index: 0,
    stack: [],
    totalBytes: 0,
    doneBytes: 0,
    files: 0,
    doneFiles: 0,
    dirs: 0,
    doneDirs: 0,
    current: null,
    upload: null,
    dirsToRemove: [],
    cleaned: false,
  }
}

function readCursor(value: unknown): CopyMoveCursor {
  const cursor = (value || {}) as Partial<CopyMoveCursor>
  return {
    ...emptyCursor(),
    ...cursor,
    stack: Array.isArray(cursor.stack) ? cursor.stack : [],
    dirsToRemove: Array.isArray(cursor.dirsToRemove) ? cursor.dirsToRemove : [],
  }
}

function readPayload(value: unknown): CopyMovePayload {
  const payload = (value || {}) as Partial<CopyMovePayload>
  if (!Array.isArray(payload.names) || payload.names.length === 0) {
    throw new Error("invalid task payload: names is empty")
  }
  return {
    op: payload.op === "move" ? "move" : "copy",
    src_dir: String(payload.src_dir || "/"),
    dst_dir: String(payload.dst_dir || "/"),
    names: payload.names.map((name) => String(name)),
    origin: typeof payload.origin === "string" ? payload.origin : undefined,
  }
}

/** 后台执行时没有请求对象：优先用入队时快照的 origin，其次环境变量 */
function runtimeWithOrigin(
  rt: TaskRuntime,
  payload: CopyMovePayload,
): TaskRuntime {
  if (rt.origin) return rt
  const origin =
    payload.origin ||
    rt.env?.PUBLIC_ORIGIN ||
    (typeof process !== "undefined" ? process.env?.PUBLIC_ORIGIN : "") ||
    ""
  return origin ? { ...rt, origin: String(origin) } : rt
}

/**
 * 执行前重新校验创建者的权限。
 *
 * 入队时校验过，但任务可能在几小时后才执行：期间用户可能被禁用、权限被收回、
 * 根目录被调整。这里必须重新确认，否则等于把旧权限永久固化。
 */
async function assertTaskUser(
  task: TaskRecord,
  payload: CopyMovePayload,
): Promise<void> {
  const db = await getDb()
  const user = (db.users || []).find((u: any) => u.id === task.creator_id)
  if (!user) throw new Error("task creator no longer exists")
  if (user.disabled) throw new Error("task creator is disabled")
  if (payload.op === "copy" && !canCopy(user)) {
    throw new Error("task creator no longer has the copy permission")
  }
  if (payload.op === "move" && !canMove(user)) {
    throw new Error("task creator no longer has the move permission")
  }
  for (const path of [payload.src_dir, payload.dst_dir]) {
    if (!isWithinUserRoot(user, path)) {
      throw new Error("task paths are outside the creator's root directory")
    }
  }
}

/** mkdir 的幂等包装：多数驱动在目录已存在时会抛错，这在断点续跑里是正常情况 */
async function mkdirSafe(path: string, rt: TaskRuntime): Promise<void> {
  try {
    await makeDirectory(path, CTX(rt))
  } catch (err: any) {
    const message = String(err?.message || err || "")
    if (/exist|already/i.test(message)) return
    throw err
  }
}

async function sourceLink(
  virtualPath: string,
  rt: TaskRuntime,
): Promise<{
  url: string
  headers?: Record<string, string>
  size: number
  hashes?: any
  storage: any
}> {
  const resolved = await resolvePath(virtualPath, rt.env)
  if (resolved.isVirtual || !resolved.storage) {
    throw new Error("source storage was not found")
  }
  const driver = await getDriver(resolved.storage.driver, resolved.storage)
  try {
    const item = await driver.get(virtualPath, resolved.physical!)
    if (!item?.raw_url) {
      throw new Error(
        `source driver returned no download link${
          item?.raw_url_error ? `: ${item.raw_url_error}` : ""
        }`,
      )
    }
    return {
      url: item.raw_url,
      headers: item.raw_url_headers,
      size: Number(item.size) || 0,
      hashes: item.hashes || (item.hash ? { md5: item.hash } : undefined),
      storage: resolved.storage,
    }
  } finally {
    await flushPendingDriverState(
      resolved.storage.driver,
      resolved.storage,
      driver,
      CTX(rt),
    )
  }
}

async function detectSameStorage(
  payload: CopyMovePayload,
  rt: TaskRuntime,
): Promise<boolean> {
  try {
    const src = await resolvePath(payload.src_dir, rt.env)
    const dst = await resolvePath(payload.dst_dir, rt.env)
    if (src.isVirtual || dst.isVirtual) return false
    return String(src.storage?.id) === String(dst.storage?.id)
  } catch {
    return false
  }
}

/** 把「下一个顶层名字」变成栈项；返回 false 表示没有更多顶层条目 */
async function pushTopLevel(
  cursor: CopyMoveCursor,
  payload: CopyMovePayload,
  rt: TaskRuntime,
): Promise<boolean> {
  if (cursor.index >= payload.names.length) return false
  const name = payload.names[cursor.index]
  cursor.index += 1
  if (!name) return true
  const src = joinPath(payload.src_dir, name)
  const dst = joinPath(payload.dst_dir, name)
  const { item } = await getItem(src, CTX(rt))
  const entry: StackEntry = {
    src,
    dst,
    dir: Boolean(item.is_dir),
    size: Number(item.size) || 0,
  }
  cursor.stack.push(entry)
  if (!entry.dir) {
    cursor.files += 1
    cursor.totalBytes += entry.size
  }
  return true
}

async function runUnitImpl(
  rt: TaskRuntime,
  task: TaskRecord,
): Promise<TaskUnitResult> {
  const payload = readPayload(task.payload)
  const taskRt = runtimeWithOrigin(rt, payload)
  const cursor = readCursor(task.cursor)
  await assertTaskUser(task, payload)

  if (cursor.sameStorage === undefined) {
    cursor.sameStorage = await detectSameStorage(payload, taskRt)
  }

  // 栈空：要么补充下一个顶层条目，要么进入收尾
  if (cursor.stack.length === 0) {
    const pushed = await pushTopLevel(cursor, payload, taskRt)
    if (pushed) {
      return {
        cursor,
        totalBytes: cursor.totalBytes,
        doneBytes: cursor.doneBytes,
        status: `scanning ${baseName(cursor.stack[0]?.src || "")}`,
      }
    }

    // 移动的跨存储场景：文件删完了，再把空的源目录自底向上删掉
    if (payload.op === "move" && !cursor.cleaned) {
      const dirs = [...(cursor.dirsToRemove || [])].reverse()
      for (const dir of dirs) {
        try {
          await removeItems(parentOf(dir), [baseName(dir)], CTX(taskRt))
        } catch {
          // 目录非空或驱动不支持删除：忽略，源端最多留空目录
        }
      }
      cursor.cleaned = true
      cursor.dirsToRemove = []
      return {
        cursor,
        totalBytes: cursor.totalBytes,
        doneBytes: cursor.doneBytes,
        status: "cleaning empty source directories",
      }
    }

    return {
      cursor,
      totalBytes: cursor.totalBytes,
      doneBytes: cursor.doneBytes,
      finished: true,
      status: `${payload.op} completed`,
    }
  }

  const entry = cursor.stack.pop() as StackEntry

  if (entry.dir) {
    await mkdirSafe(entry.dst, taskRt)
    if (payload.op === "move") {
      cursor.dirsToRemove = [...(cursor.dirsToRemove || []), entry.src]
    }
    const listing = await listItems(entry.src, CTX(taskRt))
    const children = [...(listing.content || [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    // 逆序压栈，保证按名字顺序处理（栈是后进先出）
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      cursor.stack.push({
        src: joinPath(entry.src, child.name),
        dst: joinPath(entry.dst, child.name),
        dir: Boolean(child.is_dir),
        size: Number(child.size) || 0,
      })
      if (child.is_dir) {
        cursor.dirs += 1
      } else {
        cursor.files += 1
        cursor.totalBytes += Number(child.size) || 0
      }
    }
    cursor.doneDirs += 1
    return {
      cursor,
      totalBytes: cursor.totalBytes,
      doneBytes: cursor.doneBytes,
      status: `${payload.op} ${baseName(entry.src)}/`,
    }
  }

  // ── 文件：同存储走驱动原生接口 ──
  if (cursor.sameStorage) {
    if (payload.op === "move") {
      await moveItems(
        parentOf(entry.src),
        parentOf(entry.dst),
        [baseName(entry.src)],
        CTX(taskRt),
      )
    } else {
      await copyItems(
        parentOf(entry.src),
        parentOf(entry.dst),
        [baseName(entry.src)],
        CTX(taskRt),
      )
    }
    cursor.doneFiles += 1
    cursor.doneBytes += entry.size
    cursor.current = null
    cursor.upload = null
    return {
      cursor,
      totalBytes: cursor.totalBytes,
      doneBytes: cursor.doneBytes,
      status: `${payload.op} ${baseName(entry.src)}`,
    }
  }

  // ── 文件：跨存储 ──
  // 先记录当前文件，断点才可能命中；只在切换文件时写一次
  if (cursor.current !== entry.src) {
    cursor.current = entry.src
    cursor.upload = null
    await rt.checkpoint?.(cursor)
  }

  const source = await sourceLink(entry.src, taskRt)
  const result = await transferToPath(
    taskRt,
    {
      url: source.url,
      headers: source.headers,
      size: source.size || entry.size,
      hashes: source.hashes,
    },
    entry.dst,
    {
      allowHosts: trustedHostsFor(source.storage, taskRt.env),
      preferServerSide: true,
      resume: cursor.upload || null,
      onCheckpoint: async (state) => {
        cursor.upload = state
        await rt.checkpoint?.(cursor)
      },
    },
  )

  cursor.doneFiles += 1
  cursor.doneBytes += Math.max(entry.size, result.bytes)
  cursor.current = null
  cursor.upload = null

  // 移动：传输成功后再删源，避免中途失败导致数据丢失
  if (payload.op === "move") {
    await removeItems(parentOf(entry.src), [baseName(entry.src)], CTX(taskRt))
  }

  return {
    cursor,
    totalBytes: cursor.totalBytes,
    doneBytes: cursor.doneBytes,
    status: `${payload.op} ${baseName(entry.src)}`,
  }
}

async function verifyImpl(
  rt: TaskRuntime,
  task: TaskRecord,
): Promise<TaskVerifyResult> {
  const payload = readPayload(task.payload)
  const cursor = readCursor(task.cursor)
  const taskRt = runtimeWithOrigin(rt, payload)

  // 按父目录缓存列表结果：多个顶层条目通常落在同一个目录下
  const listCache = new Map<string, Set<string>>()
  const listNames = async (dir: string): Promise<Set<string>> => {
    const cached = listCache.get(dir)
    if (cached) return cached
    const listing = await listItems(dir, CTX(taskRt))
    const set = new Set((listing.content || []).map((item) => item.name))
    listCache.set(dir, set)
    return set
  }

  const problems: string[] = []
  for (const name of payload.names) {
    const dstPath = joinPath(payload.dst_dir, name)
    const dstNames = await listNames(parentOf(dstPath))
    if (!dstNames.has(name)) {
      problems.push(`missing target: ${dstPath}`)
      continue
    }
    if (payload.op === "move") {
      const srcPath = joinPath(payload.src_dir, name)
      const srcNames = await listNames(parentOf(srcPath))
      if (srcNames.has(name)) problems.push(`source still exists: ${srcPath}`)
    }
  }

  if (problems.length > 0) {
    return {
      ok: false,
      error: `${problems.length} verification problem(s): ${problems
        .slice(0, 20)
        .join(", ")}`,
    }
  }
  if (cursor.files > 0 && cursor.doneFiles < cursor.files) {
    return {
      ok: false,
      error: `only ${cursor.doneFiles}/${cursor.files} file(s) were transferred`,
    }
  }
  return { ok: true }
}

const impl = {
  async runUnit(
    rt: TaskRuntime,
    task: TaskRecord,
    _deadline: number,
  ): Promise<TaskUnitResult> {
    return runUnitImpl(rt, task)
  },
  async verify(rt: TaskRuntime, task: TaskRecord): Promise<TaskVerifyResult> {
    return verifyImpl(rt, task)
  },
}

export const copyTaskHandler: TaskHandler = { type: "copy", ...impl }
export const moveTaskHandler: TaskHandler = { type: "move", ...impl }
