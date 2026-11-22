import { listItems } from "./storage"
import { FileItem, PublicFileItem, toPublicFileItem } from "../driver/base"
import { canAccess, getNearestMeta } from "../../pkg/meta"
import type { Meta } from "../../pkg/meta"
import type { UserPermissionObj } from "../../pkg/permission"

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
  /**
   * 访问者。提供时对每个结果做 meta 判定过滤（密码保护 + read_users 白名单），
   * 对齐 Go handles.Search 传给 SearchFiltered 的 filter 闭包；不提供时
   * （内部调用 / 管理员构建索引）不做过滤，与历史行为一致。
   */
  user?: UserPermissionObj | null
  /** 目录访问密码（meta.password） */
  password?: string
}

/**
 * 搜索结果的对外形态：白名单元数据 + 虚拟父目录。
 *
 * 历史缺陷（Issue #204）：曾直接继承驱动返回的 FileItem 并原样序列化返回，
 * 而 WebDAV 等驱动的 list() 会在每项上填充 raw_url（上游直链）与
 * raw_url_headers（上游鉴权头，如 Authorization: Basic ...），启用 guest 的
 * 部署里未认证访客即可借此拿到上游存储凭据、绕过 OpenList 直连后端。
 * 现统一在出口经 toPublicFileItem() 白名单脱敏（sign 恒为空，下载签名由
 * server 层签发；Go 版搜索响应同样只含节点元数据，不含直链）。
 */
export interface SearchResultItem extends PublicFileItem {
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
  const maxDepth = Math.min(20, Math.max(0, opts.max_depth ?? 10))
  const maxResults = Math.min(2000, Math.max(1, opts.max_results ?? 500))

  const matches: (FileItem & { parent: string })[] = []
  const enforceAcl = opts.user !== undefined

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

    // 与 Go 一致：meta 取「父目录」的最近 meta，再对子项自身路径做判定
    let dirMeta: Meta | null = null
    if (enforceAcl) {
      try {
        dirMeta = await getNearestMeta(dirPath, env)
      } catch {
        dirMeta = null
      }
    }

    for (const item of items) {
      if (matches.length >= maxResults) break

      const subPath =
        dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`

      // meta 访问控制：密码保护 / read_users 白名单覆盖的内容不出现在搜索
      // 结果里。历史缺陷：搜索完全跳过 meta 判定——实测直连被密码保护而
      // 被拒的目录，其文件名/大小仍能被搜出来（信息泄露）。
      if (
        enforceAcl &&
        !canAccess(opts.user!, dirMeta, subPath, opts.password || "")
      ) {
        continue
      }

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
        await walk(subPath, depth + 1)
      }
    }
  }

  await walk(rootPath, 0)

  const total = matches.length
  const offset = (page - 1) * perPage
  const pageItems = matches.slice(offset, offset + perPage)

  // 出口统一脱敏：只回白名单元数据，剥离 raw_url / raw_url_headers /
  // raw_url_error / 驱动塞进 sign 的内部字段（Issue #204）。
  // 这里的返回值也会被 admin 索引/扫描（admin/index/build、admin/scan/start）
  // 原样落库，脱敏后可避免上游凭据随索引持久化到数据库。
  return {
    content: pageItems.map((it) => ({
      ...toPublicFileItem(it),
      parent: it.parent,
    })),
    total,
  }
}
