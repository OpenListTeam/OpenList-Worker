/**
 * 后端模式探测：统一前端同时兼容 Go 版 OpenList 与 OpenList(TSWorker) 后端。
 *
 * 探测来源（优先级从高到低）：
 *  1. `/api/public/settings` 返回的 `backend` 字段（TS 后端固定返回 "ts-worker"）。
 *  2. 缺省视为 "go"（Go 版 OpenList 不返回该字段）。
 *
 * 用法：
 *   import { isTsWorker, isGo } from "~/utils/backend"
 *   if (isTsWorker()) { /* TS 独有能力 *\/ }
 */

export type BackendKind = "go" | "ts-worker"

let backend: BackendKind = "go"

/** 由 setSettings() 在拉取到 /public/settings 后调用，写入探测结果。 */
export const setBackendKind = (
  kind: BackendKind | string | undefined,
): void => {
  if (kind === "ts-worker") {
    backend = "ts-worker"
  } else {
    // 未知值或缺省一律视为 go（保持向后兼容，Go 后端不返回 backend 字段）
    backend = "go"
  }
}

export const getBackendKind = (): BackendKind => backend

/** 当前对接的是 OpenList(TSWorker) 的 Hono 后端。 */
export const isTsWorker = (): boolean => backend === "ts-worker"

/** 当前对接的是 Go 版 OpenList 后端。 */
export const isGo = (): boolean => backend === "go"
