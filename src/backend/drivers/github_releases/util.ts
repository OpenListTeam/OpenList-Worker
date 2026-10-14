// GitHub Releases API 客户端（行为对齐 Go drivers/github_releases）
import {
  DriverGithubReleasesAddition,
  GHRMountPoint,
  GHRRelease,
  GHRFileInfo,
  GHRFile,
} from "./types"

const API_BASE = "https://api.github.com"
const GITHUB_PREFIX = "https://github.com"

function normalizePath(p: string): string {
  return (
    "/" +
    String(p ?? "")
      .split("/")
      .filter(Boolean)
      .join("/")
  )
}

function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"))
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const num = Math.floor(Number(value))
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.min(max, Math.max(min, num))
}

function releaseSize(release: GHRRelease): number {
  return release.assets.reduce((sum, asset) => sum + (asset.size || 0), 0)
}

export class ClientGithubReleases {
  private addition: DriverGithubReleasesAddition
  private mounts: GHRMountPoint[]

  constructor(addition: DriverGithubReleasesAddition) {
    this.addition = addition || ({} as DriverGithubReleasesAddition)
    this.mounts = this.parseMounts(this.addition.repo_structure || "")
  }

  /**
   * 解析 repo_structure：每行一个 [path:]org/repo（兼容分号分隔），
   * 省略路径时挂载到根目录；出现第二个冒号视为非法（对齐 Go ParseRepos）。
   */
  private parseMounts(structure: string): GHRMountPoint[] {
    const out: GHRMountPoint[] = []
    for (const raw of String(structure || "").split(/[\r\n;]+/)) {
      const item = raw.trim()
      if (!item) continue
      const idx = item.indexOf(":")
      if (idx < 0) {
        out.push({ point: "/", repo: item })
        continue
      }
      if (item.indexOf(":", idx + 1) >= 0) {
        throw new Error(`[GitHub Releases] invalid format: ${item}`)
      }
      const path = item.slice(0, idx).trim()
      const repo = item.slice(idx + 1).trim()
      if (!repo) {
        throw new Error(`[GitHub Releases] invalid format: ${item}`)
      }
      out.push({ point: normalizePath(path), repo })
    }
    return out
  }

  async init(): Promise<void> {
    if (this.mounts.length === 0) {
      throw new Error(
        "[GitHub Releases] repo_structure is required (format: [path:]org/repo)",
      )
    }
  }

  private async get<T = any>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "OpenList-TSWorker",
    }
    if (this.addition.token) {
      headers["Authorization"] = `Bearer ${this.addition.token}`
    }
    const resp = await fetch(`${API_BASE}${path}`, { headers })
    if (resp.status === 404) return null as any
    if (resp.status >= 400) {
      throw new Error(`[GitHub Releases] HTTP ${resp.status}`)
    }
    return (await resp.json().catch(() => null)) as T
  }

  /** gh_proxy 只替换 https://github.com 前缀（对齐 Go Link），其它域名原样返回 */
  private proxy(url: string): string {
    const prefix = String(this.addition.gh_proxy || "").trim()
    if (!prefix || !url || !url.startsWith(GITHUB_PREFIX)) return url
    return prefix + url.slice(GITHUB_PREFIX.length)
  }

  /** 取路径所属的挂载点：最长匹配，根挂载点 "/" 匹配任意路径 */
  private mountForPath(virtualPath: string): GHRMountPoint | null {
    const clean = normalizePath(virtualPath)
    let best: GHRMountPoint | null = null
    let bestLen = -1
    for (const mount of this.mounts) {
      const point = mount.point === "/" ? "" : mount.point
      if (point !== "" && clean !== point && !clean.startsWith(point + "/")) {
        continue
      }
      if (point.length > bestLen) {
        best = mount
        bestLen = point.length
      }
    }
    return best
  }

  /** 相对挂载点的路径；"" 表示挂载点根目录 */
  private relPath(mount: GHRMountPoint, virtualPath: string): string {
    const clean = normalizePath(virtualPath)
    const point = mount.point === "/" ? "" : mount.point
    return clean.slice(point.length).replace(/^\/+/, "")
  }

  private async latestRelease(repo: string): Promise<GHRRelease | null> {
    return this.get<GHRRelease>(`/repos/${repo}/releases/latest`)
  }

  /** 对齐 Go getAllReleases：per_page 默认 30（上限 100），max_page 为 0 时不限页数 */
  private async allReleases(repo: string): Promise<GHRRelease[]> {
    const perPage = clampNumber(this.addition.per_page, 30, 1, 100)
    const maxPage = Math.max(0, Math.floor(Number(this.addition.max_page) || 0))
    const out: GHRRelease[] = []
    for (let page = 1; maxPage === 0 || page <= maxPage; page++) {
      const releases = await this.get<GHRRelease[]>(
        `/repos/${repo}/releases?per_page=${perPage}&page=${page}`,
      )
      if (!releases || releases.length === 0) break
      out.push(...releases)
      if (releases.length < perPage) break
    }
    return out
  }

  private async repoFiles(repo: string): Promise<GHRFileInfo[]> {
    const r = await this.get<GHRFileInfo[]>(`/repos/${repo}/contents`)
    return r || []
  }

  private assetFiles(prefix: string, release: GHRRelease): GHRFile[] {
    return release.assets.map((asset) => ({
      path: joinPath(prefix, asset.name),
      name: asset.name,
      size: asset.size,
      isDir: false,
      modified:
        asset.updated_at || asset.created_at || new Date().toISOString(),
      url: this.proxy(asset.browser_download_url),
    }))
  }

  private sourceCodeFiles(prefix: string, release: GHRRelease): GHRFile[] {
    if (!this.addition.show_source_code) return []
    return [
      {
        path: joinPath(prefix, "Source code (zip)"),
        name: "Source code (zip)",
        size: 1,
        isDir: false,
        modified: release.created_at,
        url: this.proxy(release.zipball_url),
      },
      {
        path: joinPath(prefix, "Source code (tar.gz)"),
        name: "Source code (tar.gz)",
        size: 1,
        isDir: false,
        modified: release.created_at,
        url: this.proxy(release.tarball_url),
      },
    ]
  }

  private readmeFiles(prefix: string, contents: GHRFileInfo[]): GHRFile[] {
    const out: GHRFile[] = []
    for (const f of contents) {
      if (
        f.name.toLowerCase().endsWith(".md") ||
        f.name.toUpperCase().startsWith("LICENSE")
      ) {
        out.push({
          path: joinPath(prefix, f.name),
          name: f.name,
          size: f.size,
          isDir: false,
          modified: "1970-01-01T00:00:00Z",
          url: this.proxy(f.download_url),
        })
      }
    }
    return out
  }

  /** 挂载点根目录：最新版本资产（或全部版本目录）+ README + 源码包 */
  private async mountContent(point: string, repo: string): Promise<GHRFile[]> {
    const files: GHRFile[] = []

    if (this.addition.show_all_version) {
      for (const release of await this.allReleases(repo)) {
        files.push({
          path: joinPath(point, release.tag_name),
          name: release.tag_name,
          size: releaseSize(release),
          isDir: true,
          modified: release.published_at || release.created_at,
          url: "",
        })
      }
    } else {
      const release = await this.latestRelease(repo)
      if (release) {
        files.push(...this.assetFiles(point, release))
        files.push(...this.sourceCodeFiles(point, release))
      }
    }

    if (this.addition.show_readme !== false) {
      const contents = await this.repoFiles(repo).catch(() => [])
      files.push(...this.readmeFiles(point, contents))
    }
    return files
  }

  async list(virtualPath: string): Promise<GHRFile[]> {
    const clean = normalizePath(virtualPath)
    const files: GHRFile[] = []

    for (const mount of this.mounts) {
      const point = normalizePath(mount.point)

      // 挂载点根目录
      if (point === clean) {
        try {
          files.push(...(await this.mountContent(point, mount.repo)))
        } catch (e) {
          // 单个仓库失败只告警，不影响其它挂载点（对齐 Go）
          console.warn(`[GitHub Releases] failed to list ${mount.repo}:`, e)
        }
        continue
      }

      // 祖先目录：合成下一级目录
      if (
        point !== "/" &&
        point.startsWith(clean === "/" ? "/" : clean + "/")
      ) {
        const prefix = clean === "/" ? "/" : clean + "/"
        const name = point.slice(prefix.length).split("/")[0]
        if (name && !files.some((f) => f.name === name)) {
          files.push({
            path: joinPath(clean, name),
            name,
            size: 0,
            isDir: true,
            modified: new Date().toISOString(),
            url: "",
          })
        }
        continue
      }

      // 版本目录（仅 show_all_version 时存在）
      if (
        this.addition.show_all_version &&
        (point === "/" || clean.startsWith(point + "/"))
      ) {
        const rel =
          point === "/" ? clean.slice(1) : clean.slice(point.length + 1)
        if (rel && !rel.includes("/")) {
          try {
            const releases = await this.allReleases(mount.repo)
            const release = releases.find((r) => r.tag_name === rel)
            if (release) {
              files.push(...this.assetFiles(clean, release))
              files.push(...this.sourceCodeFiles(clean, release))
            }
          } catch (e) {
            console.warn(`[GitHub Releases] failed to list version ${rel}:`, e)
          }
        }
      }
    }

    return files
  }

  /** 仅挂载点、合成的祖先目录与 show_all_version 下的版本目录是目录 */
  async isDirectory(virtualPath: string): Promise<boolean> {
    const clean = normalizePath(virtualPath)
    if (clean === "/") return true

    for (const mount of this.mounts) {
      const point = normalizePath(mount.point)
      if (clean === point) return true
      if (point !== "/" && point.startsWith(clean + "/")) return true
    }

    if (!this.addition.show_all_version) return false

    const mount = this.mountForPath(clean)
    if (!mount) return false
    const rel = this.relPath(mount, clean)
    if (!rel || rel.includes("/")) return false
    const releases = await this.allReleases(mount.repo).catch(() => [])
    return releases.some((r) => r.tag_name === rel)
  }

  /** 获取单文件下载链接：版本目录 → 最新版本 → 其它版本 → README/LICENSE */
  async getDownloadUrl(virtualPath: string): Promise<string> {
    const mount = this.mountForPath(virtualPath)
    if (!mount) return ""
    const rel = this.relPath(mount, virtualPath)
    const segs = rel.split("/").filter(Boolean)
    const name = segs[segs.length - 1] || ""
    if (!name) return ""

    const releases = await this.allReleases(mount.repo).catch(() => [])
    if (segs.length >= 2) {
      const tagged = releases.find((r) => r.tag_name === segs[0])
      if (tagged) {
        const asset = tagged.assets.find((a) => a.name === name)
        if (asset) return this.proxy(asset.browser_download_url)
        const source = this.sourceCodeUrl(name, tagged)
        if (source) return this.proxy(source)
      }
    }

    const latest = await this.latestRelease(mount.repo).catch(() => null)
    if (latest) {
      const asset = latest.assets.find((a) => a.name === name)
      if (asset) return this.proxy(asset.browser_download_url)
      const source = this.sourceCodeUrl(name, latest)
      if (source) return this.proxy(source)
    }

    for (const release of releases) {
      const asset = release.assets.find((a) => a.name === name)
      if (asset) return this.proxy(asset.browser_download_url)
    }

    const contents = await this.repoFiles(mount.repo).catch(() => [])
    const match = contents.find((c) => c.name === name)
    if (match) return this.proxy(match.download_url)
    return ""
  }

  private sourceCodeUrl(name: string, release: GHRRelease): string {
    if (name === "Source code (zip)") return release.zipball_url
    if (name === "Source code (tar.gz)") return release.tarball_url
    return ""
  }
}
