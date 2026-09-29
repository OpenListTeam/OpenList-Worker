// GitHub Releases API 客户端
import {
  DriverGithubReleasesAddition,
  GHRMountPoint,
  GHRRelease,
  GHRFileInfo,
  GHRFile,
} from "./types"

const API_BASE = "https://api.github.com"

export class ClientGithubReleases {
  private addition: DriverGithubReleasesAddition
  private mounts: GHRMountPoint[]

  constructor(addition: DriverGithubReleasesAddition) {
    this.addition = addition
    this.mounts = this.parseMounts(addition.repo_structure || "")
  }

  private parseMounts(structure: string): GHRMountPoint[] {
    const out: GHRMountPoint[] = []
    for (const raw of structure.split(";")) {
      const item = raw.trim()
      if (!item) continue
      const idx = item.indexOf(":")
      if (idx > 0 && item.slice(0, idx).includes("/")) {
        // 可能是 [path:]org/repo 或 org/repo（无冒号）
      }
      let point = "/"
      let repo = item
      if (idx > 0 && !item.slice(idx + 1).startsWith("/") && !item.slice(0, idx).includes(".")) {
        // 形如 mymount:org/repo
        point = "/" + item.slice(0, idx).replace(/^\/+|\/+$/g, "")
        repo = item.slice(idx + 1)
      }
      out.push({ point: point === "/" ? "/" : point, repo })
    }
    return out
  }

  async init(): Promise<void> {
    if (this.mounts.length === 0) {
      throw new Error("[GitHub Releases] repo_structure is required (format: [path:]org/repo)")
    }
  }

  private async get<T = any>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "OpenList-TSWorker",
    }
    if (this.addition.token) headers["Authorization"] = `Bearer ${this.addition.token}`
    const resp = await fetch(`${API_BASE}${path}`, { headers })
    if (resp.status === 404) return null as any
    if (resp.status >= 400) {
      throw new Error(`[GitHub Releases] HTTP ${resp.status}`)
    }
    return (await resp.json().catch(() => null)) as T
  }

  private proxy(url: string): string {
    const p = this.addition.gh_proxy || ""
    if (!p || url.startsWith("http")) return url
    return p + url
  }

  /** 解析挂载点对应的 org/repo */
  private mountForPath(virtualPath: string): GHRMountPoint | null {
    const clean = virtualPath.startsWith("/") ? virtualPath : "/" + virtualPath
    // 找最长的匹配挂载点
    let best: GHRMountPoint | null = null
    for (const m of this.mounts) {
      const mp = m.point === "/" ? "/" : m.point
      if (clean === mp || clean.startsWith(mp + "/")) {
        if (!best || mp.length > (best.point === "/" ? 0 : best.point.length)) {
          best = m
        }
      }
    }
    return best
  }

  private async latestRelease(repo: string): Promise<GHRRelease | null> {
    return this.get<GHRRelease>(`/repos/${repo}/releases/latest`)
  }

  private async allReleases(repo: string): Promise<GHRRelease[]> {
    const r = await this.get<GHRRelease[]>(`/repos/${repo}/releases`)
    return r || []
  }

  private async repoFiles(repo: string): Promise<GHRFileInfo[]> {
    const r = await this.get<GHRFileInfo[]>(`/repos/${repo}/contents`)
    return r || []
  }

  async list(virtualPath: string): Promise<GHRFile[]> {
    const mount = this.mountForPath(virtualPath)
    if (!mount) return []
    const rel = this.relPath(mount, virtualPath)

    const files: GHRFile[] = []

    // 根目录：挂载点列表
    if (rel === "" && virtualPath === "/") {
      for (const m of this.mounts) {
        files.push({
          path: m.point,
          name: m.point === "/" ? m.repo : m.point.split("/").filter(Boolean).pop() || m.repo,
          size: 0,
          isDir: true,
          modified: new Date().toISOString(),
          url: "",
        })
      }
      return files
    }

    const isAllVersion = this.addition.show_all_version

    if (rel === "") {
      // 挂载点根：最新版本文件 + 可选源码 + README/LICENSE
      const release = await this.latestRelease(mount.repo)
      if (release) {
        for (const asset of release.assets) {
          files.push({
            path: join(mount.point, asset.name),
            name: asset.name,
            size: asset.size,
            isDir: false,
            modified: asset.updated_at || asset.created_at || new Date().toISOString(),
            url: this.proxy(asset.browser_download_url),
          })
        }
        if (this.addition.show_source_code) {
          files.push({
            path: join(mount.point, "Source code (zip)"),
            name: "Source code (zip)",
            size: 1,
            isDir: false,
            modified: release.created_at,
            url: this.proxy(release.zipball_url),
          })
          files.push({
            path: join(mount.point, "Source code (tar.gz)"),
            name: "Source code (tar.gz)",
            size: 1,
            isDir: false,
            modified: release.created_at,
            url: this.proxy(release.tarball_url),
          })
        }
      }
      if (isAllVersion) {
        const releases = await this.allReleases(mount.repo)
        for (const r of releases) {
          files.push({
            path: join(mount.point, r.tag_name),
            name: r.tag_name,
            size: 0,
            isDir: true,
            modified: r.published_at || r.created_at,
            url: r.html_url,
          })
        }
      }
      if (this.addition.show_readme !== false) {
        const contents = await this.repoFiles(mount.repo)
        for (const f of contents) {
          if (f.name.toLowerCase().endsWith(".md") || f.name.toUpperCase().startsWith("LICENSE")) {
            files.push({
              path: join(mount.point, f.name),
              name: f.name,
              size: f.size,
              isDir: false,
              modified: "1970-01-01T00:00:00Z",
              url: this.proxy(f.download_url),
            })
          }
        }
      }
      return files
    }

    // 版本目录内：该 tag 的 assets + 源码
    const releases = await this.allReleases(mount.repo)
    const release = releases.find((r) => r.tag_name === rel.split("/")[0])
    if (release) {
      for (const asset of release.assets) {
        files.push({
          path: join(mount.point, release.tag_name, asset.name),
          name: asset.name,
          size: asset.size,
          isDir: false,
          modified: asset.updated_at || asset.created_at || new Date().toISOString(),
          url: this.proxy(asset.browser_download_url),
        })
      }
      if (this.addition.show_source_code) {
        files.push({
          path: join(mount.point, "Source code (zip)"),
          name: "Source code (zip)",
          size: 1,
          isDir: false,
          modified: release.created_at,
          url: this.proxy(release.zipball_url),
        })
        files.push({
          path: join(mount.point, "Source code (tar.gz)"),
          name: "Source code (tar.gz)",
          size: 1,
          isDir: false,
          modified: release.created_at,
          url: this.proxy(release.tarball_url),
        })
      }
    }
    return files
  }

  /** 获取单文件下载链接 */
  async getDownloadUrl(virtualPath: string): Promise<string> {
    const mount = this.mountForPath(virtualPath)
    if (!mount) return ""
    const rel = this.relPath(mount, virtualPath)
    const name = rel.split("/").pop() || ""

    // 最新版本资产
    const release = await this.latestRelease(mount.repo)
    if (release) {
      const asset = release.assets.find((a) => a.name === name)
      if (asset) return this.proxy(asset.browser_download_url)
    }
    // 所有版本资产
    const releases = await this.allReleases(mount.repo)
    for (const r of releases) {
      const asset = r.assets.find((a) => a.name === name)
      if (asset) return this.proxy(asset.browser_download_url)
    }
    // README/LICENSE
    const contents = await this.repoFiles(mount.repo)
    const f = contents.find((c) => c.name === name)
    if (f) return this.proxy(f.download_url)
    return ""
  }

  private relPath(mount: GHRMountPoint, virtualPath: string): string {
    const mp = mount.point === "/" ? "/" : mount.point
    const clean = virtualPath.startsWith("/") ? virtualPath : "/" + virtualPath
    if (mp === "/") return clean.replace(/^\/+/, "")
    const rel = clean.slice(mp.length).replace(/^\/+/, "")
    return rel
  }
}

function join(...parts: string[]): string {
  const clean = parts.filter(Boolean).map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean)
  return "/" + clean.join("/")
}
