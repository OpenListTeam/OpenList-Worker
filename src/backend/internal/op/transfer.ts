/**
 * 共享传输引擎：把「一个远程 URL」写进某个存储路径。
 *
 * 从 `server/seed.ts` 的 uploadStreamToDriver 抽出，供任务系统（跨存储复制/
 * 移动、URL 离线下载、种子转存）复用。抽出时做了两件事：
 *   1. 不再依赖 Hono `Context`（后台任务没有请求对象），改用 `TaskRuntime`；
 *   2. 分片上传会话与已完成分片由调用方回调持久化，使大文件中途被打断后
 *      能从下一个分片续传，而不是整文件重来。
 *
 * 能力优先级（越快越靠前，尽可能让数据不经过 Worker）：
 *   rapidUpload（秒传）→ putUrl（服务端直传）→ createUploadSession 分片
 *   → putStream 流式 → 限内存 buffer
 */
import { resolvePath } from "../model/db"
import { assertSafeUrl, getTrustedHosts } from "../../pkg/http"
import { flushPendingDriverState, getDriver } from "./storage"
import type { StorageRequestContext } from "./storage"

export interface TaskRuntime {
  env?: any
  /** 当前部署 origin（用于解析相对 URL / 同源判定） */
  origin?: string
  waitUntil?: (promise: Promise<unknown>) => void
  /**
   * 大文件中途把断点写回任务 cursor 的回调（由 runner 注入）。
   * 传输引擎只负责在分片完成后回调，不关心任务存储细节。
   */
  checkpoint?: (cursor: unknown) => Promise<void>
}

export interface TransferSource {
  url: string
  headers?: Record<string, string>
  size?: number
  hashes?: {
    md5?: string
    sha1?: string
    sha256?: string
    pieces?: any
    [key: string]: any
  }
}

/** 分片上传的断点状态（可 JSON 序列化，字符串 session） */
export interface MultipartState {
  session: string
  /** 下一个待上传的分片号（1 起） */
  partNumber: number
  uploadedBytes: number
  partMd5s: string[]
  chunkSize: number
  size: number
}

export interface TransferResult {
  method: string
  bytes: number
  /** 未完成的分片状态；为 null 表示已全部上传 */
  pending?: MultipartState | null
  reused?: boolean
}

export interface TransferOptions {
  /** SSRF 白名单（源存储管理员配置的 endpoint + SSRF_ALLOWED_HOSTS） */
  allowHosts?: Set<string> | string[]
  maxBufferedBytes?: number
  chunkSize?: number
  /** 续传状态：由上一次调用通过 onCheckpoint 持久化 */
  resume?: MultipartState | null
  /** 每完成一个分片回调一次（调用方负责节流写库） */
  onCheckpoint?: (state: MultipartState) => void | Promise<void>
  /** 优先尝试服务端直传（putUrl）。源 URL 需要目标存储可访问 */
  preferServerSide?: boolean
}

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024
const MAX_CHUNK_SIZE = 16 * 1024 * 1024
const DEFAULT_BUFFERED_MAX = 4 * 1024 * 1024
const MAX_REDIRECTS = 4

function runtimeContext(rt: TaskRuntime): StorageRequestContext {
  return { env: rt.env, waitUntil: rt.waitUntil }
}

/**
 * 逐跳校验 SSRF 的 fetch。
 *
 * 不能只校验初始 URL：攻击者可让一个公网 URL 302 到内网/云元数据地址。
 * 因此关闭自动跟随，自己跳转并逐次校验。
 */
async function safeFetch(
  rt: TaskRuntime,
  url: string,
  init: RequestInit,
  allowHosts?: Set<string> | string[],
): Promise<Response> {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertSafeUrl(current, "Task transfer", allowHosts)
    const response = await fetch(current, { ...init, redirect: "manual" })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) {
        throw new Error(`task transfer redirect without location (${response.status})`)
      }
      current = new URL(location, current).toString()
      continue
    }
    return response
  }
  throw new Error("task transfer exceeded the redirect limit")
}

function isReuse(result: any): boolean {
  return Boolean(result === true || result?.reuse || result?.success)
}

/**
 * 后台执行没有请求对象：驱动返回的相对 raw_url（如 `/d/...`）必须靠
 * 入队时快照的 origin 或 PUBLIC_ORIGIN 补全，否则会抛出一个难以理解的
 * "Invalid URL"。这里显式给出可操作的错误。
 */
function absoluteUrl(url: string, origin?: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (!origin) {
    throw new Error(
      "cannot resolve a relative source URL: the task runtime has no deployment origin. " +
        "Set PUBLIC_ORIGIN, or re-enqueue the task from an HTTP request.",
    )
  }
  return new URL(url, origin).toString()
}

/**
 * 把源写入目标路径。失败时抛出可读错误，由 runner 记录并重试。
 */
export async function transferToPath(
  rt: TaskRuntime,
  source: TransferSource,
  targetVirtualPath: string,
  options: TransferOptions = {},
): Promise<TransferResult> {
  const resolved = await resolvePath(targetVirtualPath, rt.env)
  if (resolved.isVirtual || !resolved.storage) {
    throw new Error("target storage was not found")
  }
  const storage = resolved.storage
  const driver = await getDriver(storage.driver, storage)
  const dynamic = driver as any
  const context = runtimeContext(rt)
  const sourceUrl = absoluteUrl(source.url, rt.origin)
  const chunkSize = Math.min(
    MAX_CHUNK_SIZE,
    Math.max(1024 * 1024, options.chunkSize || DEFAULT_CHUNK_SIZE),
  )
  const bufferedMax = Math.max(
    0,
    options.maxBufferedBytes ?? DEFAULT_BUFFERED_MAX,
  )

  const metadata = {
    size: Number(source.size) || 0,
    md5: source.hashes?.md5 || "",
    sha1: source.hashes?.sha1 || "",
    sha256: source.hashes?.sha256 || "",
    hashes: source.hashes,
  }

  let lastError: any = null
  try {
    // ── 0. 续传：跳过所有「不需要再碰目标存储」的捷径 ──
    const resume = options.resume || null

    // ── 1. 秒传 ──
    if (!resume && typeof dynamic.rapidUpload === "function") {
      try {
        const result = await dynamic.rapidUpload(
          targetVirtualPath,
          resolved.physical,
          metadata,
        )
        if (isReuse(result)) {
          return { method: "rapidUpload", bytes: metadata.size, reused: true }
        }
      } catch (err) {
        lastError = err
      }
    }

    // ── 2. 服务端直传（数据不过 Worker，最快） ──
    if (!resume && options.preferServerSide && typeof dynamic.putUrl === "function") {
      try {
        const result = await dynamic.putUrl(
          targetVirtualPath,
          resolved.physical,
          sourceUrl,
          metadata,
        )
        if (isReuse(result)) {
          return { method: "putUrl", bytes: metadata.size }
        }
      } catch (err) {
        lastError = err
      }
    }

    // ── 3. 分片上传（可续传） ──
    let multipart: MultipartState | null = resume
    if (!multipart && typeof dynamic.createUploadSession === "function") {
      const dir = targetVirtualPath.replace(/\/[^/]*$/, "") || "/"
      const name = targetVirtualPath.split("/").filter(Boolean).pop() || ""
      const dirResolved = await resolvePath(dir, rt.env)
      const session = await dynamic.createUploadSession(
        dir,
        dirResolved.isVirtual ? "/" : dirResolved.physical,
        name,
        metadata.size,
        metadata.md5,
      )
      if (session?.reuse) {
        return { method: "multipart-rapid", bytes: metadata.size, reused: true }
      }
      if (session?.requiresMd5) {
        throw new Error(
          "target driver requires an MD5 for multipart upload, but the source did not provide one",
        )
      }
      if (session?.session) {
        multipart = {
          session: String(session.session),
          partNumber: 1,
          uploadedBytes: 0,
          partMd5s: [],
          chunkSize: Number(session.chunkSize) || chunkSize,
          size: metadata.size,
        }
      }
    }

    if (
      multipart &&
      typeof dynamic.uploadPart === "function" &&
      typeof dynamic.completeUploadSession === "function"
    ) {
      const state: MultipartState = { ...multipart }
      const headers: Record<string, string> = { ...(source.headers || {}) }
      if (state.uploadedBytes > 0) {
        headers["Range"] = `bytes=${state.uploadedBytes}-`
      }
      const response = await safeFetch(
        rt,
        sourceUrl,
        { headers },
        options.allowHosts,
      )
      if (!response.ok || !response.body) {
        throw new Error(`source download failed with HTTP ${response.status}`)
      }
      const resumedFromRange = response.status === 206
      const reader = response.body.getReader()
      // 源端不支持 Range 时只能整段下载再丢弃已上传字节
      let skip =
        state.uploadedBytes > 0 && !resumedFromRange ? state.uploadedBytes : 0
      let buffer = new Uint8Array(0)
      let bytes = state.uploadedBytes
      const stateChunk = Math.max(1024 * 1024, state.chunkSize || chunkSize)
      let lastCheckpoint = Date.now()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (value?.length) {
            let chunk = value
            if (skip > 0) {
              if (chunk.length <= skip) {
                skip -= chunk.length
                chunk = new Uint8Array(0)
              } else {
                chunk = chunk.subarray(skip)
                skip = 0
              }
            }
            if (chunk.length) {
              const combined = new Uint8Array(buffer.length + chunk.length)
              combined.set(buffer)
              combined.set(chunk, buffer.length)
              buffer = combined
              while (buffer.length >= stateChunk) {
                const part = buffer.slice(0, stateChunk)
                buffer = buffer.slice(stateChunk)
                const result = await dynamic.uploadPart(
                  state.session,
                  state.partNumber,
                  part,
                )
                if (result?.partMd5) state.partMd5s.push(result.partMd5)
                state.partNumber += 1
                bytes += part.length
                state.uploadedBytes = bytes
                const now = Date.now()
                if (options.onCheckpoint && now - lastCheckpoint > 3000) {
                  lastCheckpoint = now
                  await options.onCheckpoint({ ...state })
                }
              }
            }
          }
          if (done) break
        }
        if (buffer.length || state.size === 0) {
          const result = await dynamic.uploadPart(
            state.session,
            state.partNumber,
            buffer,
          )
          if (result?.partMd5) state.partMd5s.push(result.partMd5)
          state.partNumber += 1
          bytes += buffer.length
          state.uploadedBytes = bytes
        }
        await dynamic.completeUploadSession(state.session, state.partMd5s)
        return { method: "multipart", bytes, pending: null }
      } catch (err: any) {
        // 把断点挂到错误上：调用方写入 cursor 后，下一次从这里续传。
        // 不把「失败」伪装成「成功 + pending」，否则会掩盖真实错误。
        err.pending = state
        throw err
      } finally {
        try {
          reader.releaseLock()
        } catch {}
      }
    }

    // ── 4. 流式上传 ──
    const response = await safeFetch(rt, sourceUrl, { headers: source.headers || {} }, options.allowHosts)
    if (!response.ok || !response.body) {
      throw new Error(`source download failed with HTTP ${response.status}`)
    }
    if (typeof dynamic.putStream === "function") {
      await dynamic.putStream(
        targetVirtualPath,
        resolved.physical,
        response.body,
        metadata.size,
        metadata,
      )
      return { method: "putStream", bytes: metadata.size }
    }

    // ── 5. 限内存缓冲 ──
    const declared = metadata.size
    if (declared > 0 && declared > bufferedMax) {
      throw new Error(
        `capability unavailable: target driver has no streaming upload API and the file (${declared} bytes) exceeds the ${bufferedMax}-byte buffer limit`,
      )
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > bufferedMax) {
      throw new Error(
        `capability unavailable: downloaded ${bytes.byteLength} bytes which exceeds the buffer limit`,
      )
    }
    await driver.put(targetVirtualPath, resolved.physical!, bytes)
    return { method: "buffered", bytes: bytes.byteLength }
  } catch (err) {
    if (lastError) {
      console.warn("[Task transfer] fallback path failed:", lastError)
    }
    throw err
  } finally {
    await flushPendingDriverState(
      storage.driver,
      storage,
      driver,
      context,
    )
  }
}

/** 源存储的受信 host（管理员配置的内网 endpoint） */
export function trustedHostsFor(storage: any, env?: any): Set<string> {
  return getTrustedHosts(storage?.addition, env)
}
