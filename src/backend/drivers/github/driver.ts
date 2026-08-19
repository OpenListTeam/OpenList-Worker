import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { GithubAddition, GithubTreeObjReq, GithubTreeResp } from "./types"
import {
  basename,
  cleanPath,
  dirname,
  getPathCommonAncestor,
  GithubApiClient,
  joinPath,
  renderCommitMessage,
} from "./util"

export class GithubDriver implements StorageDriver {
  private addition: GithubAddition
  private client: GithubApiClient
  private isOnBranch: boolean = false
  private commitLock: Promise<void> = Promise.resolve()

  constructor(addition: GithubAddition) {
    this.addition = addition
    this.client = new GithubApiClient(addition)
  }

  private async acquireLock<T>(fn: () => Promise<T>): Promise<T> {
    const currentLock = this.commitLock
    let releaseLock: () => void
    this.commitLock = new Promise<void>((resolve) => {
      releaseLock = resolve
    })
    await currentLock
    try {
      return await fn()
    } finally {
      releaseLock!()
    }
  }

  private formatDownloadUrl(rawUrl: string | null | undefined): string {
    if (!rawUrl) return ""
    const ghProxy = (this.addition.gh_proxy || "").trim()
    if (ghProxy) {
      return rawUrl.replace("https://raw.githubusercontent.com", ghProxy)
    }
    return rawUrl
  }

  private async commitAndPush(
    message: string,
    rootTreeSha: string,
  ): Promise<void> {
    const branch = this.addition.ref!
    const headCommitSha = await this.client.getBranchHead(branch)

    const committer =
      this.addition.committer_name && this.addition.committer_email
        ? {
            name: this.addition.committer_name,
            email: this.addition.committer_email,
          }
        : undefined

    const author =
      this.addition.author_name && this.addition.author_email
        ? {
            name: this.addition.author_name,
            email: this.addition.author_email,
          }
        : undefined

    const newCommitSha = await this.client.createCommit(
      message,
      rootTreeSha,
      headCommitSha,
      committer,
      author,
    )
    await this.client.updateRef(branch, newCommitSha)
  }

  async init(): Promise<void> {
    this.addition.root_folder_path = cleanPath(
      this.addition.root_folder_path || "/",
    )

    if (
      (this.addition.committer_name && !this.addition.committer_email) ||
      (!this.addition.committer_name && this.addition.committer_email)
    ) {
      throw new Error(
        "committer_name and committer_email must both be set or empty",
      )
    }

    if (
      (this.addition.author_name && !this.addition.author_email) ||
      (!this.addition.author_name && this.addition.author_email)
    ) {
      throw new Error("author_name and author_email must both be set or empty")
    }

    if (!this.addition.ref || !this.addition.ref.trim()) {
      const repo = await this.client.getRepo()
      this.addition.ref = repo.default_branch
      this.isOnBranch = true
    } else {
      try {
        await this.client.getBranchHead(this.addition.ref)
        this.isOnBranch = true
      } catch {
        this.isOnBranch = false
      }
    }
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const p = cleanPath(physicalPath)
    const obj = await this.client.getContents(p, this.addition.ref)

    if (!obj.entries && obj.type !== "dir") {
      throw new Error(`${physicalPath} is not a folder`)
    }

    const items: FileItem[] = []

    if (obj.entries && obj.entries.length >= 1000) {
      const tree = await this.client.getTree(obj.sha)
      if (tree.truncated) {
        throw new Error(`Tree ${physicalPath} is truncated (>100,000 items)`)
      }
      for (const t of tree.tree) {
        if (t.path === ".gitkeep") continue
        const isDir = t.type === "tree"
        items.push({
          name: t.path,
          size: t.size || 0,
          is_dir: isDir,
          modified: new Date(0).toISOString(),
          sign: "",
          type: calcFileType(t.path, isDir),
          raw_url: "",
        })
      }
    } else if (obj.entries) {
      for (const entry of obj.entries) {
        if (entry.name === ".gitkeep") continue
        const isDir = entry.type === "dir"
        items.push({
          name: entry.name,
          size: entry.size || 0,
          is_dir: isDir,
          modified: new Date(0).toISOString(),
          sign: "",
          type: calcFileType(entry.name, isDir),
          raw_url: this.formatDownloadUrl(entry.download_url),
        })
      }
    }

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const p = cleanPath(physicalPath)
    const obj = await this.client.getContents(p, this.addition.ref)

    if (obj.type === "submodule") {
      throw new Error("cannot download a submodule")
    }

    const isDir = obj.type === "dir" || !!obj.entries
    const name = obj.name || basename(p) || "root"

    return {
      name,
      size: obj.size || 0,
      is_dir: isDir,
      modified: new Date(0).toISOString(),
      sign: "",
      type: calcFileType(name, isDir),
      raw_url: this.formatDownloadUrl(obj.download_url),
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    if (!this.isOnBranch) {
      throw new Error("cannot write to non-branch reference")
    }

    const p = cleanPath(physicalPath)
    const parentPath = dirname(p)
    const dirName = basename(p)

    await this.acquireLock(async () => {
      const parent = await this.client.getContents(
        parentPath,
        this.addition.ref,
      )
      if (!parent.entries && parent.type !== "dir") {
        throw new Error(`${parentPath} is not a folder`)
      }

      // Create new tree with .gitkeep inside sub directory
      const subDirSha = await this.client.newTree("", [
        {
          path: ".gitkeep",
          mode: "100644",
          type: "blob",
          content: "",
        },
      ])

      const newTreeEntries: GithubTreeObjReq[] = [
        {
          path: dirName,
          mode: "040000",
          type: "tree",
          sha: subDirSha,
        },
      ]

      // If parent only had .gitkeep, remove .gitkeep
      if (
        parent.entries?.length === 1 &&
        parent.entries[0].name === ".gitkeep"
      ) {
        newTreeEntries.push({
          path: ".gitkeep",
          mode: "100644",
          type: "blob",
          sha: null,
        })
      }

      const newSha = await this.client.newTree(parent.sha, newTreeEntries)
      const rootSha = await this.client.renewParentTrees(
        parentPath,
        parent.sha,
        newSha,
        "/",
        this.addition.ref,
      )

      const commitMessage = renderCommitMessage(
        this.addition.mkdir_commit_message,
        {
          UserName: "OpenListNext",
          ObjName: dirName,
          ObjPath: p,
          ParentName: basename(parentPath),
          ParentPath: parentPath,
        },
        "mkdir",
      )

      await this.commitAndPush(commitMessage, rootSha)
    })
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    if (!this.isOnBranch) {
      throw new Error("cannot write to non-branch reference")
    }

    const p = cleanPath(physicalPath)
    const parentPath = dirname(p)
    const fileName = basename(p)

    await this.acquireLock(async () => {
      const blobSha = await this.client.putBlob(content)
      const parent = await this.client.getContents(
        parentPath,
        this.addition.ref,
      )
      if (!parent.entries && parent.type !== "dir") {
        throw new Error(`${parentPath} is not a folder`)
      }

      const newTreeEntries: GithubTreeObjReq[] = [
        {
          path: fileName,
          mode: "100644",
          type: "blob",
          sha: blobSha,
        },
      ]

      // If parent had only .gitkeep, remove .gitkeep
      if (
        parent.entries?.length === 1 &&
        parent.entries[0].name === ".gitkeep"
      ) {
        newTreeEntries.push({
          path: ".gitkeep",
          mode: "100644",
          type: "blob",
          sha: null,
        })
      }

      const newSha = await this.client.newTree(parent.sha, newTreeEntries)
      const rootSha = await this.client.renewParentTrees(
        parentPath,
        parent.sha,
        newSha,
        "/",
        this.addition.ref,
      )

      const commitMessage = renderCommitMessage(
        this.addition.put_commit_message,
        {
          UserName: "OpenListNext",
          ObjName: fileName,
          ObjPath: p,
          ParentName: basename(parentPath),
          ParentPath: parentPath,
        },
        "upload",
      )

      await this.commitAndPush(commitMessage, rootSha)
    })
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    if (!this.isOnBranch) {
      throw new Error("cannot write to non-branch reference")
    }

    const p = cleanPath(physicalPath)
    const parentPath = dirname(p)
    const oldName = basename(p)

    await this.acquireLock(async () => {
      const { tree, dirSha } = await this.client.getTreeDirectly(
        parentPath,
        this.addition.ref,
      )
      const target = tree.tree.find((t) => t.path === oldName)
      if (!target) {
        throw new Error(`Object not found: ${p}`)
      }
      if (target.type === "commit") {
        throw new Error("cannot rename a submodule")
      }

      const delOld: GithubTreeObjReq = {
        path: oldName,
        mode: target.mode,
        type: target.type,
        sha: null,
      }
      const addNew: GithubTreeObjReq = {
        path: newName,
        mode: target.mode,
        type: target.type,
        sha: target.sha,
      }

      const newSha = await this.client.newTree(dirSha, [delOld, addNew])
      const rootSha = await this.client.renewParentTrees(
        parentPath,
        dirSha,
        newSha,
        "/",
        this.addition.ref,
      )

      const commitMessage = renderCommitMessage(
        this.addition.rename_commit_message,
        {
          UserName: "OpenListNext",
          ObjName: oldName,
          ObjPath: p,
          ParentName: basename(parentPath),
          ParentPath: parentPath,
          TargetName: newName,
          TargetPath: joinPath(parentPath, newName),
        },
        "rename",
      )

      await this.commitAndPush(commitMessage, rootSha)
    })
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    if (!this.isOnBranch) {
      throw new Error("cannot write to non-branch reference")
    }

    const p = cleanPath(physicalPath)
    const parentPath = dirname(p)
    const objName = basename(p)

    await this.acquireLock(async () => {
      const { tree, dirSha } = await this.client.getTreeDirectly(
        parentPath,
        this.addition.ref,
      )
      const target = tree.tree.find((t) => t.path === objName)
      if (!target) {
        throw new Error(`Object not found: ${p}`)
      }
      if (target.type === "commit") {
        throw new Error("cannot remove a submodule")
      }

      const treeEntries: (
        | GithubTreeObjReq
        | { path: string; mode: string; type: string; content?: string }
      )[] = [
        {
          path: objName,
          mode: target.mode,
          type: target.type,
          sha: null,
        },
      ]

      // If emptying directory, add .gitkeep so folder remains valid
      if (tree.tree.length === 1) {
        treeEntries.push({
          path: ".gitkeep",
          mode: "100644",
          type: "blob",
          content: "",
        })
      }

      const newSha = await this.client.newTree(dirSha, treeEntries)
      const rootSha = await this.client.renewParentTrees(
        parentPath,
        dirSha,
        newSha,
        "/",
        this.addition.ref,
      )

      const commitMessage = renderCommitMessage(
        this.addition.delete_commit_message,
        {
          UserName: "OpenListNext",
          ObjName: objName,
          ObjPath: p,
          ParentName: basename(parentPath),
          ParentPath: parentPath,
        },
        "remove",
      )

      await this.commitAndPush(commitMessage, rootSha)
    })
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhys: string,
    _dstPhys: string,
  ): Promise<void> {
    if (!this.isOnBranch) {
      throw new Error("cannot write to non-branch reference")
    }

    const srcPath = cleanPath(srcPhys)
    const dstPath = cleanPath(dstDir)

    if (dstPath.startsWith(srcPath)) {
      throw new Error("cannot move parent dir to child")
    }

    await this.acquireLock(async () => {
      let rootSha = ""
      const srcParentPath = dirname(srcPath)
      const srcObjName = basename(srcPath)

      if (dstPath.startsWith(srcParentPath)) {
        // Case 1: moving to sibling subdirectory (e.g. /aa/1 -> /aa/bb/)
        const { dstOldSha, dstNewSha, ancestorOldSha, srcParentTree } =
          await this.copyWithoutRenewTree(srcPath, dstPath)

        const dstRest = dstPath.slice(srcParentPath.length).replace(/^\//, "")
        const dstNextName = dstRest.split("/")[0]
        const dstNextPath = joinPath(srcParentPath, dstNextName)

        const dstNextTreeSha = await this.client.renewParentTrees(
          dstPath,
          dstOldSha,
          dstNewSha,
          dstNextPath,
          this.addition.ref,
        )

        const delSrc = srcParentTree.tree.find((t) => t.path === srcObjName)
        const dstNextTree = srcParentTree.tree.find(
          (t) => t.path === dstNextName,
        )

        if (!delSrc || !dstNextTree) {
          throw new Error("Object not found during move")
        }

        const ancestorNewSha = await this.client.newTree(ancestorOldSha, [
          {
            path: delSrc.path,
            mode: delSrc.mode,
            type: delSrc.type,
            sha: null,
          },
          {
            path: dstNextTree.path,
            mode: dstNextTree.mode,
            type: dstNextTree.type,
            sha: dstNextTreeSha,
          },
        ])

        rootSha = await this.client.renewParentTrees(
          srcParentPath,
          ancestorOldSha,
          ancestorNewSha,
          "/",
          this.addition.ref,
        )
      } else if (srcPath.startsWith(dstPath)) {
        // Case 2: moving to ancestor directory (e.g. /aa/bb/1 -> /aa/)
        const { tree: srcParentTree, dirSha: srcParentOldSha } =
          await this.client.getTreeDirectly(srcParentPath, this.addition.ref)

        const src = srcParentTree.tree.find((t) => t.path === srcObjName)
        if (!src) throw new Error("Object not found")
        if (src.type === "commit") throw new Error("cannot move a submodule")

        const delSrcTree: (
          | GithubTreeObjReq
          | { path: string; mode: string; type: string; content?: string }
        )[] = [
          {
            path: src.path,
            mode: src.mode,
            type: src.type,
            sha: null,
          },
        ]
        if (srcParentTree.tree.length === 1) {
          delSrcTree.push({
            path: ".gitkeep",
            mode: "100644",
            type: "blob",
            content: "",
          })
        }

        const srcParentNewSha = await this.client.newTree(
          srcParentOldSha,
          delSrcTree,
        )

        const srcRest = srcPath.slice(dstPath.length).replace(/^\//, "")
        const srcNextName = srcRest.split("/")[0]
        if (!srcNextName) throw new Error("cannot move in place")

        const srcNextPath = joinPath(dstPath, srcNextName)
        const srcNextTreeSha = await this.client.renewParentTrees(
          srcParentPath,
          srcParentOldSha,
          srcParentNewSha,
          srcNextPath,
          this.addition.ref,
        )

        const { tree: ancestorTree, dirSha: ancestorOldSha } =
          await this.client.getTreeDirectly(dstPath, this.addition.ref)

        const srcNextTree = ancestorTree.tree.find(
          (t) => t.path === srcNextName,
        )
        if (!srcNextTree) throw new Error("Object not found")

        const ancestorNewSha = await this.client.newTree(ancestorOldSha, [
          {
            path: srcNextTree.path,
            mode: srcNextTree.mode,
            type: srcNextTree.type,
            sha: srcNextTreeSha,
          },
          {
            path: src.path,
            mode: src.mode,
            type: src.type,
            sha: src.sha,
          },
        ])

        rootSha = await this.client.renewParentTrees(
          dstPath,
          ancestorOldSha,
          ancestorNewSha,
          "/",
          this.addition.ref,
        )
      } else {
        // Case 3: moving across different branches (e.g. /aa/1 -> /bb/)
        const { dstOldSha, dstNewSha, srcParentOldSha, srcParentTree } =
          await this.copyWithoutRenewTree(srcPath, dstPath)

        const src = srcParentTree.tree.find((t) => t.path === srcObjName)
        if (!src) throw new Error("Object not found")

        const delSrcTree: (
          | GithubTreeObjReq
          | { path: string; mode: string; type: string; content?: string }
        )[] = [
          {
            path: src.path,
            mode: src.mode,
            type: src.type,
            sha: null,
          },
        ]
        if (srcParentTree.tree.length === 1) {
          delSrcTree.push({
            path: ".gitkeep",
            mode: "100644",
            type: "blob",
            content: "",
          })
        }

        const srcParentNewSha = await this.client.newTree(
          srcParentOldSha,
          delSrcTree,
        )

        const {
          ancestor,
          aChildName: srcChildName,
          bChildName: dstChildName,
        } = getPathCommonAncestor(srcPath, dstPath)

        const dstNextTreeSha = await this.client.renewParentTrees(
          dstPath,
          dstOldSha,
          dstNewSha,
          joinPath(ancestor, dstChildName),
          this.addition.ref,
        )

        const srcNextTreeSha = await this.client.renewParentTrees(
          srcParentPath,
          srcParentOldSha,
          srcParentNewSha,
          joinPath(ancestor, srcChildName),
          this.addition.ref,
        )

        const { tree: ancestorTree, dirSha: ancestorOldSha } =
          await this.client.getTreeDirectly(ancestor, this.addition.ref)

        const srcChild = ancestorTree.tree.find((t) => t.path === srcChildName)
        const dstChild = ancestorTree.tree.find((t) => t.path === dstChildName)

        if (!srcChild || !dstChild) {
          throw new Error("Ancestor child tree not found")
        }

        const ancestorNewSha = await this.client.newTree(ancestorOldSha, [
          {
            path: srcChild.path,
            mode: srcChild.mode,
            type: srcChild.type,
            sha: srcNextTreeSha,
          },
          {
            path: dstChild.path,
            mode: dstChild.mode,
            type: dstChild.type,
            sha: dstNextTreeSha,
          },
        ])

        rootSha = await this.client.renewParentTrees(
          ancestor,
          ancestorOldSha,
          ancestorNewSha,
          "/",
          this.addition.ref,
        )
      }

      const commitMessage = renderCommitMessage(
        this.addition.move_commit_message,
        {
          UserName: "OpenListNext",
          ObjName: srcObjName,
          ObjPath: srcPath,
          ParentName: basename(srcParentPath),
          ParentPath: srcParentPath,
          TargetName: basename(dstPath),
          TargetPath: dstPath,
        },
        "move",
      )

      await this.commitAndPush(commitMessage, rootSha)
    })
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhys: string,
    _dstPhys: string,
  ): Promise<void> {
    if (!this.isOnBranch) {
      throw new Error("cannot write to non-branch reference")
    }

    const srcPath = cleanPath(srcPhys)
    const dstPath = cleanPath(dstDir)

    if (dstPath.startsWith(srcPath)) {
      throw new Error("cannot copy parent dir to child")
    }

    await this.acquireLock(async () => {
      const { dstOldSha, dstNewSha } = await this.copyWithoutRenewTree(
        srcPath,
        dstPath,
      )
      const rootSha = await this.client.renewParentTrees(
        dstPath,
        dstOldSha,
        dstNewSha,
        "/",
        this.addition.ref,
      )

      const commitMessage = renderCommitMessage(
        this.addition.copy_commit_message,
        {
          UserName: "OpenListNext",
          ObjName: basename(srcPath),
          ObjPath: srcPath,
          ParentName: basename(dirname(srcPath)),
          ParentPath: dirname(srcPath),
          TargetName: basename(dstPath),
          TargetPath: dstPath,
        },
        "copy",
      )

      await this.commitAndPush(commitMessage, rootSha)
    })
  }

  private async copyWithoutRenewTree(
    srcPath: string,
    dstPath: string,
  ): Promise<{
    dstOldSha: string
    dstNewSha: string
    srcParentOldSha: string
    srcParentTree: GithubTreeResp
    ancestorOldSha: string
  }> {
    const dst = await this.client.getContents(dstPath, this.addition.ref)
    if (!dst.entries && dst.type !== "dir") {
      throw new Error(`${dstPath} is not a folder`)
    }

    const srcParentPath = dirname(srcPath)
    const srcObjName = basename(srcPath)
    const { tree: srcParentTree, dirSha: srcParentOldSha } =
      await this.client.getTreeDirectly(srcParentPath, this.addition.ref)

    const src = srcParentTree.tree.find((t) => t.path === srcObjName)
    if (!src) {
      throw new Error(`Object not found: ${srcPath}`)
    }
    if (src.type === "commit") {
      throw new Error("cannot copy a submodule")
    }

    const newTreeEntries: GithubTreeObjReq[] = [
      {
        path: src.path,
        mode: src.mode,
        type: src.type,
        sha: src.sha,
      },
    ]

    // If destination only had .gitkeep, remove .gitkeep
    if (dst.entries?.length === 1 && dst.entries[0].name === ".gitkeep") {
      newTreeEntries.push({
        path: ".gitkeep",
        mode: "100644",
        type: "blob",
        sha: null,
      })
    }

    const dstNewSha = await this.client.newTree(dst.sha, newTreeEntries)

    return {
      dstOldSha: dst.sha,
      dstNewSha,
      srcParentOldSha,
      srcParentTree,
      ancestorOldSha: srcParentOldSha,
    }
  }
}
