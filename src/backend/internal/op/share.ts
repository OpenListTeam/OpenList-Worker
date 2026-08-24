import { getDb, saveDb } from "../model/db"

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

const normalize = (p: string) => {
  const segments = String(p || "")
    .split("/")
    .filter(Boolean)
  if (segments.includes("..")) {
    throw new Error("无效路径: 不允许 '..' 路径段")
  }
  return "/" + segments.join("/")
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
  const clean = normalize(reqPath)
  const parts = clean.split("/").filter(Boolean)
  if (parts.length < 1) {
    return { ok: false, error: "无效的分享路径" }
  }

  // Strip leading "@s" segment if present
  let shareId: string
  let rest: string[]
  if (parts[0] === "@s") {
    if (parts.length < 2) return { ok: false, error: "无效的分享路径" }
    shareId = parts[1]
    rest = parts.slice(2)
  } else {
    shareId = parts[0]
    rest = parts.slice(1)
  }

  const db = await getDb(envCtx)
  const share = (db.shares || []).find((s: any) => s.id === shareId)
  if (!share) return { ok: false, error: "分享不存在" }
  if (share.disabled) return { ok: false, error: "分享已被禁用" }
  if (share.expires && new Date(share.expires) < new Date()) {
    return { ok: false, error: "分享已过期" }
  }
  if (
    share.max_accessed > 0 &&
    share.accessed !== undefined &&
    share.accessed >= share.max_accessed
  ) {
    return { ok: false, error: "分享访问次数已超出限制" }
  }
  if (share.pwd && share.pwd !== password) {
    return { ok: false, error: "密码错误" }
  }
  if (!share.files || share.files.length === 0) {
    return { ok: false, error: "分享内容为空" }
  }

  // Count this access
  share.accessed = (share.accessed || 0) + 1
  saveDb(db, envCtx).catch(() => {})

  // Multi-file share root → virtual list
  if (share.files.length > 1 && rest.length === 0) {
    return { ok: true, share, virtualList: true }
  }

  // Single-file share
  if (share.files.length === 1) {
    const base = normalize(share.files[0])
    const real = normalize([base, ...rest].join("/"))
    return { ok: true, share, realPath: real }
  }

  // Multi-file share, sub-path: match by basename
  const subName = rest[0]
  const match = share.files.find((f: string) => {
    const segs = String(f).split("/").filter(Boolean)
    return segs[segs.length - 1] === subName
  })
  if (!match) return { ok: false, error: "分享中未找到该路径" }
  const real = normalize([normalize(match), ...rest.slice(1)].join("/"))
  return { ok: true, share, realPath: real }
}

/** Extract the share id from a path like `/@s/abc/sub` or `/abc/sub` */
export function extractShareId(reqPath: string): string | null {
  const parts = normalize(reqPath).split("/").filter(Boolean)
  if (parts.length === 0) return null
  if (parts[0] === "@s") return parts[1] || null
  return parts[0]
}
