import { Context } from "hono"
import { getDb } from "../internal/model/db"

/**
 * Common utilities for OpenList backend services.
 */

export * from "./xml"
export * from "./errs"
export * from "./generic"
export * from "./http"
export * from "./task"
export * from "./cron"
export * from "./crypto"
export * from "./stream"

// Format byte sizes to human-readable strings
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Check administrator authorization from context
export async function checkAdminAuth(c: Context): Promise<boolean> {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) return false
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader
  const db = await getDb()
  const tokenSetting = db.settings.find((s: any) => s.key === "token")
  if (tokenSetting && tokenSetting.value && token === tokenSetting.value) {
    return true
  }
  return false
}
