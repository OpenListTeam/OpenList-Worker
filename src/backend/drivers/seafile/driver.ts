import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { SeafileAddition, SeafileLibraryItem, SeafileRepoItem } from "./types"
import { SeafileApiClient } from "./util"

export class SeafileDriver implements StorageDriver {
  private addition: SeafileAddition
  private client: SeafileApiClient
  private repoId?: string
  private rootPath: string = "/"

  constructor(
    addition: SeafileAddition,
    onTokenRefreshed?: (token: string) => Promise<void>,
  ) {
    this.addition = addition
    this.repoId = addition.repo_id || undefined
    this.client = new SeafileApiClient(addition, onTokenRefreshed)
  }

  async init(): Promise<void> {
    await this.client.getToken()
    this.rootPath =
      "/" +
      (this.addition.root_folder_path || "/")
        .split("/")
        .filter(Boolean)
        .join("/")
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private async resolveRepoAndPath(physicalPath: string): Promise<{
    repoId: string
    innerPath: string
    isRootListRepos: boolean
  }> {
    const clean = this.cleanPath(physicalPath)

    if (this.repoId) {
      return {
        repoId: this.repoId,
        innerPath: clean,
        isRootListRepos: false,
      }
    }

    if (clean === "/") {
      return {
        repoId: "",
        innerPath: "/",
        isRootListRepos: true,
      }
    }

    // First segment is repo name
    const segments = clean.split("/").filter(Boolean)
    const repoName = segments[0]
    const innerPath = "/" + segments.slice(1).join("/")

    const repos =
      await this.client.request<SeafileLibraryItem[]>("/api2/repos/")
    const match = repos.find((r) => r.name === repoName || r.id === repoName)
    if (!match) {
      throw new Error(`Seafile library '${repoName}' not found`)
    }

    if (match.encrypted) {
      await this.client.decryptLibrary(match)
    }

    return {
      repoId: match.id,
      innerPath: innerPath === "/" ? "/" : innerPath,
      isRootListRepos: false,
    }
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const { repoId, innerPath, isRootListRepos } =
      await this.resolveRepoAndPath(physicalPath)

    if (isRootListRepos) {
      const repos =
        await this.client.request<SeafileLibraryItem[]>("/api2/repos/")
      const items: FileItem[] = repos.map((repo) => ({
        name: repo.name,
        size: repo.size || 0,
        is_dir: true,
        modified: repo.mtime
          ? new Date(repo.mtime * 1000).toISOString()
          : new Date().toISOString(),
        sign: repo.id,
        type: 1, // Folder / Library
        raw_url: "",
      }))
      return sortFileItems(
        items,
        this.addition.order_by,
        this.addition.order_direction,
      )
    }

    const dirItems = await this.client.request<SeafileRepoItem[]>(
      `/api2/repos/${encodeURIComponent(repoId)}/dir/`,
      {
        params: { p: innerPath },
      },
    )

    const items: FileItem[] = dirItems.map((item) => {
      const isDir = item.type === "dir"
      return {
        name: item.name,
        size: item.size || 0,
        is_dir: isDir,
        modified: item.mtime
          ? new Date(item.mtime * 1000).toISOString()
          : new Date().toISOString(),
        sign: item.id,
        type: calcFileType(item.name, isDir),
        raw_url: "",
      }
    })

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const { repoId, innerPath, isRootListRepos } =
      await this.resolveRepoAndPath(physicalPath)
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"

    if (isRootListRepos) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
        raw_url: "",
      }
    }

    if (innerPath === "/") {
      const repo = await this.client.getLibraryInfo(repoId)
      return {
        name: repo.name || name,
        size: repo.size || 0,
        is_dir: true,
        modified: repo.mtime
          ? new Date(repo.mtime * 1000).toISOString()
          : new Date().toISOString(),
        sign: repo.id,
        type: 1,
        raw_url: "",
      }
    }

    // Get direct download link for file
    let downloadUrl = ""
    try {
      const rawRes = await this.client.request<string>(
        `/api2/repos/${encodeURIComponent(repoId)}/file/`,
        {
          params: { p: innerPath, reuse: "1" },
        },
      )
      if (typeof rawRes === "string") {
        downloadUrl = rawRes.replace(/^"|"$/g, "").trim()
      }
    } catch {
      // Might be a directory or link not ready
    }

    const parentDir = innerPath.split("/").slice(0, -1).join("/") || "/"
    const fileName = innerPath.split("/").pop() || ""

    try {
      const siblings = await this.client.request<SeafileRepoItem[]>(
        `/api2/repos/${encodeURIComponent(repoId)}/dir/`,
        {
          params: { p: parentDir },
        },
      )
      const found = siblings.find((s) => s.name === fileName)
      if (found) {
        const isDir = found.type === "dir"
        return {
          name: found.name,
          size: found.size || 0,
          is_dir: isDir,
          modified: found.mtime
            ? new Date(found.mtime * 1000).toISOString()
            : new Date().toISOString(),
          sign: found.id,
          type: calcFileType(found.name, isDir),
          raw_url: downloadUrl,
        }
      }
    } catch {
      // Fallback below
    }

    return {
      name,
      size: 0,
      is_dir: !downloadUrl,
      modified: new Date().toISOString(),
      sign: "",
      type: calcFileType(name, !downloadUrl),
      raw_url: downloadUrl,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const { repoId, innerPath } = await this.resolveRepoAndPath(physicalPath)
    await this.client.request(
      `/api2/repos/${encodeURIComponent(repoId)}/dir/`,
      {
        method: "POST",
        isFormData: true,
        params: { p: innerPath },
        body: { operation: "mkdir" },
      },
    )
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const { repoId, innerPath } = await this.resolveRepoAndPath(physicalPath)
    await this.client.request(
      `/api2/repos/${encodeURIComponent(repoId)}/file/`,
      {
        method: "POST",
        isFormData: true,
        params: { p: innerPath },
        body: {
          operation: "rename",
          newname: newName,
        },
      },
    )
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const { repoId, innerPath } = await this.resolveRepoAndPath(physicalPath)
    for (const name of names) {
      const targetPath = innerPath === "/" ? `/${name}` : `${innerPath}/${name}`
      await this.client.request(
        `/api2/repos/${encodeURIComponent(repoId)}/file/`,
        {
          method: "DELETE",
          params: { p: targetPath },
        },
      )
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const src = await this.resolveRepoAndPath(srcPhys)
    const dst = await this.resolveRepoAndPath(dstPhys)

    for (const name of names) {
      const targetPath =
        src.innerPath === "/" ? `/${name}` : `${src.innerPath}/${name}`
      await this.client.request(
        `/api2/repos/${encodeURIComponent(src.repoId)}/file/`,
        {
          method: "POST",
          isFormData: true,
          params: { p: targetPath },
          body: {
            operation: "move",
            dst_repo: dst.repoId,
            dst_dir: dst.innerPath,
          },
        },
      )
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const src = await this.resolveRepoAndPath(srcPhys)
    const dst = await this.resolveRepoAndPath(dstPhys)

    for (const name of names) {
      const targetPath =
        src.innerPath === "/" ? `/${name}` : `${src.innerPath}/${name}`
      await this.client.request(
        `/api2/repos/${encodeURIComponent(src.repoId)}/file/`,
        {
          method: "POST",
          isFormData: true,
          params: { p: targetPath },
          body: {
            operation: "copy",
            dst_repo: dst.repoId,
            dst_dir: dst.innerPath,
          },
        },
      )
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const { repoId, innerPath } = await this.resolveRepoAndPath(physicalPath)
    const parentPath = innerPath.split("/").slice(0, -1).join("/") || "/"
    const fileName = innerPath.split("/").pop() || "upload"

    const uploadLinkRes = await this.client.request<string>(
      `/api2/repos/${encodeURIComponent(repoId)}/upload-link/`,
      {
        params: { p: parentPath },
      },
    )

    const uploadUrl = (uploadLinkRes || "").replace(/^"|"$/g, "").trim()
    if (!uploadUrl) {
      throw new Error("Failed to get Seafile upload link")
    }

    const formData = new FormData()
    formData.append("parent_dir", parentPath)
    formData.append("replace", "1")
    formData.append(
      "file",
      new Blob([new Uint8Array(content)], { type: "application/octet-stream" }),
      fileName,
    )

    await this.client.request(uploadUrl, {
      method: "POST",
      body: formData,
    })
  }
}
