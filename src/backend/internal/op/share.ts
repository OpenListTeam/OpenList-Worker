import { getDb, saveDb } from "../model/db"
import { canonicalizeVirtualPath, getMaxPathDepth } from "../../pkg/path"
import { secureWarn } from "../../pkg/secure-log"

/**
 * Share path resolution for /@s/{shareId}/... (frontend browsing)
 * and /{shareId}/... (after stripping /sd prefix in raw downloads).
 */

export interface ShareResolveResult {
  ok: boolean
  error?: string
  share?: any
  /** Mapped real storage path (single-file shares or sub-paths) */
  realPath?: string
  /** Multi-file share root — frontend should render a virtual list */
  virtualList?: boolean
}

// FIX(C-3): the old implementation only did filter(Boolean), so ".." segments
// survived verbatim and `/@s/{id}/../../../` escalated a single-file share
// into browsing the entire storage root (verified at runtime).
// Backslashes are normalized first for the same reason as resolvePath (C-2).
const normalize = (p: string): string => canonicalizeVirtualPath(p)

/**
 * 分享路径不接受任何相对段：解码后一旦出现 `.` / `..` / `...` 就拒绝。
 * 返回 null 并记录一条安全日志；调用方统一转成 “Invalid share path”。
 */
function canonicalSharePath(
  p: string,
  where: string,
  maxDepth: number = getMaxPathDepth(),
): string | null {
  try {
    return canonicalizeVirtualPath(p, {
      rejectTraversal: true,
      rejectIllegalChars: true,
      rejectAbsolute: true,
      maxDepth,
    })
  } catch (e: any) {
    secureWarn("[security] blocked share path", {
      path: String(p || ""),
      reason: e?.message || String(e),
      where,
    })
    return null
  }
}

/**
 * Resolve a share request path.
 * @param reqPath e.g. `/@s/abc`, `/@s/abc/sub`, or `/abc/sub` (already stripped /sd)
 * @param password share password from frontend ("" if none)
 */
export async function resolveShare(
  reqPath: string,
  password: string,
  envCtx?: any,
): Promise<ShareResolveResult> {
  const maxDepth = getMaxPathDepth(envCtx)
  const clean = canonicalSharePath(reqPath, "resolveShare.reqPath", maxDepth)
  if (clean === null) {
    return { ok: false, error: "Invalid share path" }
  }
  const parts = clean.split("/").filter(Boolean)
  if (parts.length < 1) {
    return { ok: false, error: "Invalid share path" }
  }

  // Strip leading "@s" segment if present
  let shareId: string
  let rest: string[]
  if (parts[0] === "@s") {
    if (parts.length < 2) return { ok: false, error: "Invalid share path" }
    shareId = parts[1]
    rest = parts.slice(2)
  } else {
    shareId = parts[0]
    rest = parts.slice(1)
  }

  const db = await getDb(envCtx)
  const share = (db.shares || []).find((s: any) => s.id === shareId)
  if (!share) return { ok: false, error: "share not found" }
  if (share.disabled) return { ok: false, error: "share has been disabled" }
  if (share.expires && new Date(share.expires) < new Date()) {
    return { ok: false, error: "share has expired" }
  }
  if (
    share.max_accessed > 0 &&
    share.accessed !== undefined &&
    share.accessed >= share.max_accessed
  ) {
    return { ok: false, error: "share access count exceeded" }
  }
  if (share.pwd && share.pwd !== password) {
    return { ok: false, error: "wrong password" }
  }
  if (!share.files || share.files.length === 0) {
    return { ok: false, error: "share is empty" }
  }

  // Count this access
  share.accessed = (share.accessed || 0) + 1
  saveDb(db, envCtx).catch(() => {})

  // Multi-file share root → virtual list
  if (share.files.length > 1 && rest.length === 0) {
    return { ok: true, share, virtualList: true }
  }

  // FIX(C-3): containment check. Whatever normalize() produces, the result
  // must stay inside one of the explicitly shared paths.
  const allowedRoots: string[] = []
  for (const f of share.files || []) {
    const root = canonicalSharePath(
      String(f),
      "resolveShare.share.files",
      maxDepth,
    )
    if (root === null) {
      return { ok: false, error: "Invalid share path" }
    }
    allowedRoots.push(root)
  }
  const withinShare = (p: string) =>
    allowedRoots.some((a) => p === a || p.startsWith(a === "/" ? "/" : a + "/"))

  // Single-file share: one file has no sub-paths, so trailing segments are
  // always suspicious — reject instead of concatenating them.
  if (share.files.length === 1) {
    if (rest.length > 0) return { ok: false, error: "path not found in share" }
    return { ok: true, share, realPath: allowedRoots[0] }
  }

  // Multi-file share, sub-path: match by basename
  const subName = rest[0]
  const match = share.files.find((f: string) => {
    const segs = String(f).split("/").filter(Boolean)
    return segs[segs.length - 1] === subName
  })
  if (!match) return { ok: false, error: "path not found in share" }
  const real = canonicalSharePath(
    [normalize(match), ...rest.slice(1)].join("/"),
    "resolveShare.realPath",
    maxDepth,
  )
  if (real === null || !withinShare(real)) {
    return { ok: false, error: "path not found in share" }
  }
  return { ok: true, share, realPath: real }
}

/** Extract the share id from a path like `/@s/abc/sub` or `/abc/sub` */
export function extractShareId(reqPath: string): string | null {
  const clean = canonicalSharePath(reqPath, "extractShareId")
  if (clean === null) return null
  const parts = clean.split("/").filter(Boolean)
  if (parts.length === 0) return null
  if (parts[0] === "@s") return parts[1] || null
  return parts[0]
}
