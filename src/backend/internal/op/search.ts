import { listItems } from "./storage"
import { FileItem } from "../driver/base"

export interface SearchOptions {
  parent?: string
  keywords?: string
  /** 0 = all, 1 = folder only, 2 = file only */
  scope?: number
  page?: number
  per_page?: number
  /** Max directory depth to traverse (default 10) */
  max_depth?: number
  /** Max items to collect before truncating (default 500) */
  max_results?: number
}

export interface SearchResultItem extends FileItem {
  /** Virtual parent directory where this file resides */
  parent: string
}

export interface SearchResult {
  content: SearchResultItem[]
  total: number
}

/**
 * Recursively search for files/directories matching `keywords` within `parent`.
 * Traverses directories through `listItems` (honoring driver abstractions).
 */
export async function search(
  opts: SearchOptions = {},
  env?: any,
): Promise<SearchResult> {
  const rootPath = (opts.parent || "/").replace(/\/+/g, "/") || "/"
  const keyword = String(opts.keywords || "")
    .trim()
    .toLowerCase()
  const scope = opts.scope ?? 0
  const page = Math.max(1, opts.page || 1)
  const perPage = Math.max(1, Math.min(100, opts.per_page || 30))
  const maxDepth = opts.max_depth ?? 10
  const maxResults = opts.max_results ?? 500

  const matches: SearchResultItem[] = []

  async function walk(dirPath: string, depth: number) {
    if (depth > maxDepth || matches.length >= maxResults) return

    let items: FileItem[] = []
    try {
      const res = await listItems(dirPath)
      items = res.content || []
    } catch {
      // If listing this branch fails (e.g. storage offline), continue search elsewhere
      return
    }

    for (const item of items) {
      if (matches.length >= maxResults) break

      const nameMatch = !keyword || item.name.toLowerCase().includes(keyword)
      const isDir = !!item.is_dir
      // 挂载点虚拟文件夹（storage.ts 合并虚拟子挂载时 sign 为空），
      // 本身不显示，但仍需递归进入搜索其内部文件
      const isMountPoint = isDir && !item.sign

      let scopeMatch = true
      if (scope === 1 && !isDir) scopeMatch = false
      if (scope === 2 && isDir) scopeMatch = false

      // 挂载点不作为结果项返回（避免搜到 "123云盘" 这类虚拟文件夹本身）
      if (!isMountPoint && nameMatch && scopeMatch) {
        matches.push({
          ...item,
          parent:
            dirPath.endsWith("/") && dirPath !== "/"
              ? dirPath.slice(0, -1)
              : dirPath,
        })
      }

      if (isDir) {
        const subPath =
          dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`
        await walk(subPath, depth + 1)
      }
    }
  }

  await walk(rootPath, 0)

  const total = matches.length
  const offset = (page - 1) * perPage
  const pageItems = matches.slice(offset, offset + perPage)

  return {
    content: pageItems,
    total,
  }
}
