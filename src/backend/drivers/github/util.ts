import {
  GithubAddition,
  GithubBranchResp,
  GithubObject,
  GithubRepoResp,
  GithubTreeObjReq,
  GithubTreeResp,
  GithubUserResp,
  MessageTemplateVars,
} from "./types"

export function cleanPath(p: string): string {
  if (!p) return "/"
  const normalized = p.replace(/\\/g, "/").replace(/\/+/g, "/")
  const trimmed = normalized.replace(/^\/|\/$/g, "")
  return trimmed ? "/" + trimmed : "/"
}

export function dirname(p: string): string {
  const cleaned = cleanPath(p)
  if (cleaned === "/") return "/"
  const parts = cleaned.split("/").filter(Boolean)
  parts.pop()
  return parts.length ? "/" + parts.join("/") : "/"
}

export function basename(p: string): string {
  const cleaned = cleanPath(p)
  if (cleaned === "/") return ""
  const parts = cleaned.split("/").filter(Boolean)
  return parts[parts.length - 1] || ""
}

export function joinPath(...parts: string[]): string {
  return cleanPath(parts.join("/"))
}

export function renderCommitMessage(
  tmpl: string | undefined,
  vars: MessageTemplateVars,
  defaultOp: string,
): string {
  if (!tmpl || !tmpl.trim()) {
    return `${vars.UserName} ${defaultOp} ${vars.ObjPath}`
  }
  let msg = tmpl
  msg = msg.replace(/\{\{\.UserName\}\}/g, vars.UserName || "")
  msg = msg.replace(/\{\{\.ObjName\}\}/g, vars.ObjName || "")
  msg = msg.replace(/\{\{\.ObjPath\}\}/g, vars.ObjPath || "")
  msg = msg.replace(/\{\{\.ParentName\}\}/g, vars.ParentName || "")
  msg = msg.replace(/\{\{\.ParentPath\}\}/g, vars.ParentPath || "")
  msg = msg.replace(/\{\{\.TargetName\}\}/g, vars.TargetName || "")
  msg = msg.replace(/\{\{\.TargetPath\}\}/g, vars.TargetPath || "")
  return msg
}

/**
 * Example:
 * a = /aaa/bbb/ccc
 * b = /aaa/b11/ddd/ccc
 *
 * ancestor = /aaa
 * aChildName = bbb
 * bChildName = b11
 * aRest = bbb/ccc
 * bRest = b11/ddd/ccc
 */
export function getPathCommonAncestor(
  a: string,
  b: string,
): {
  ancestor: string
  aChildName: string
  bChildName: string
  aRest: string
  bRest: string
} {
  const pathA = cleanPath(a)
  const pathB = cleanPath(b)

  let idx = 1
  while (idx < pathA.length && idx < pathB.length) {
    if (pathA[idx] !== pathB[idx]) {
      break
    }
    idx++
  }

  let aNextIdx = idx
  while (aNextIdx < pathA.length) {
    if (pathA[aNextIdx] === "/") {
      break
    }
    aNextIdx++
  }

  let bNextIdx = idx
  while (bNextIdx < pathB.length) {
    if (pathB[bNextIdx] === "/") {
      break
    }
    bNextIdx++
  }

  while (idx > 0) {
    if (pathA[idx] === "/") {
      break
    }
    idx--
  }

  const ancestor = cleanPath(pathA.slice(0, idx))
  const aChildName = pathA.slice(idx + 1, aNextIdx)
  const bChildName = pathB.slice(idx + 1, bNextIdx)
  const aRest = pathA.slice(idx + 1)
  const bRest = pathB.slice(idx + 1)

  return { ancestor, aChildName, bChildName, aRest, bRest }
}

export class GithubApiClient {
  private addition: GithubAddition
  private token: string
  private owner: string
  private repo: string

  constructor(addition: GithubAddition) {
    this.addition = addition
    this.token = (addition.token || "").trim()
    this.owner = (addition.owner || "").trim()
    this.repo = (addition.repo || "").trim()
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/vnd.github.object+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OpenListNext-Github-Driver",
    }
    if (this.token) {
      h.Authorization = `Bearer ${this.token}`
    }
    return h
  }

  private async request<T>(
    url: string,
    options: {
      method?: string
      body?: any
      headers?: Record<string, string>
    } = {},
  ): Promise<T> {
    const reqHeaders: Record<string, string> = {
      ...this.headers,
      ...(options.headers || {}),
    }

    let bodyStr: string | undefined = undefined
    if (options.body !== undefined) {
      if (typeof options.body === "string") {
        bodyStr = options.body
      } else {
        bodyStr = JSON.stringify(options.body)
        if (!reqHeaders["Content-Type"]) {
          reqHeaders["Content-Type"] = "application/json"
        }
      }
    }

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: reqHeaders,
      body: bodyStr,
    })

    if (!res.ok) {
      let errMsg = `${res.status} ${res.statusText}`
      try {
        const errJson = (await res.json()) as any
        if (errJson?.message) {
          errMsg = `${res.status} ${res.statusText}: ${errJson.message}`
        }
      } catch {}
      throw new Error(errMsg)
    }

    if (res.status === 204) {
      return {} as T
    }

    return (await res.json()) as T
  }

  getContentApiUrl(path: string): string {
    const clean = cleanPath(path)
    return `https://api.github.com/repos/${this.owner}/${this.repo}/contents${clean === "/" ? "" : clean}`
  }

  async getContents(path: string, ref?: string): Promise<GithubObject> {
    const url = new URL(this.getContentApiUrl(path))
    if (ref) {
      url.searchParams.set("ref", ref)
    }
    return this.request<GithubObject>(url.toString())
  }

  async getRepo(): Promise<GithubRepoResp> {
    return this.request<GithubRepoResp>(
      `https://api.github.com/repos/${this.owner}/${this.repo}`,
    )
  }

  async getBranchHead(branch: string): Promise<string> {
    const res = await this.request<GithubBranchResp>(
      `https://api.github.com/repos/${this.owner}/${this.repo}/branches/${encodeURIComponent(branch)}`,
    )
    return res.commit.sha
  }

  async getAuthenticatedUser(): Promise<GithubUserResp> {
    return this.request<GithubUserResp>("https://api.github.com/user")
  }

  async getTree(sha: string): Promise<GithubTreeResp> {
    return this.request<GithubTreeResp>(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${sha}`,
    )
  }

  async getTreeDirectly(
    path: string,
    ref?: string,
  ): Promise<{ tree: GithubTreeResp; dirSha: string }> {
    const p = await this.getContents(path, ref)
    if (!p.entries && p.type !== "dir") {
      throw new Error(`${path} is not a folder`)
    }
    const tree = await this.getTree(p.sha)
    if (tree.truncated) {
      throw new Error(`tree ${path} is truncated`)
    }
    return { tree, dirSha: p.sha }
  }

  async newTree(
    baseSha: string | null | undefined,
    trees: (
      | GithubTreeObjReq
      | { path: string; mode: string; type: string; content?: string }
    )[],
  ): Promise<string> {
    const body: Record<string, any> = { tree: trees }
    if (baseSha) {
      body.base_tree = baseSha
    }
    const res = await this.request<GithubTreeResp>(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees`,
      {
        method: "POST",
        body,
        headers: { Accept: "application/vnd.github+json" },
      },
    )
    return res.sha
  }

  async putBlob(content: Buffer | Uint8Array): Promise<string> {
    const base64Content = Buffer.from(content).toString("base64")
    const res = await this.request<{ sha: string }>(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs`,
      {
        method: "POST",
        body: {
          encoding: "base64",
          content: base64Content,
        },
        headers: { Accept: "application/vnd.github+json" },
      },
    )
    return res.sha
  }

  async createCommit(
    message: string,
    treeSha: string,
    parentCommitSha: string,
    committer?: { name: string; email: string },
    author?: { name: string; email: string },
  ): Promise<string> {
    const body: Record<string, any> = {
      message,
      tree: treeSha,
      parents: [parentCommitSha],
    }
    if (committer?.name) {
      body.committer = {
        name: committer.name,
        email: committer.email,
        date: new Date().toISOString(),
      }
    }
    if (author?.name) {
      body.author = {
        name: author.name,
        email: author.email,
        date: new Date().toISOString(),
      }
    }

    const res = await this.request<{ sha: string }>(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/commits`,
      {
        method: "POST",
        body,
        headers: { Accept: "application/vnd.github+json" },
      },
    )
    return res.sha
  }

  async updateRef(branch: string, commitSha: string): Promise<void> {
    await this.request(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: "PATCH",
        body: {
          sha: commitSha,
          force: false,
        },
        headers: { Accept: "application/vnd.github+json" },
      },
    )
  }

  /**
   * Recursively renew parent trees from path up until `until` directory.
   */
  async renewParentTrees(
    path: string,
    prevSha: string,
    curSha: string,
    until: string,
    ref?: string,
  ): Promise<string> {
    let currentPath = cleanPath(path)
    const targetUntil = cleanPath(until)

    while (currentPath !== targetUntil) {
      currentPath = dirname(currentPath)
      const { tree, dirSha } = await this.getTreeDirectly(currentPath, ref)

      const targetTreeObj = tree.tree.find((t) => t.sha === prevSha)
      if (!targetTreeObj) {
        throw new Error(
          `Object with sha ${prevSha} not found in ${currentPath}`,
        )
      }

      const newTreeReq: GithubTreeObjReq = {
        path: targetTreeObj.path,
        mode: targetTreeObj.mode,
        type: targetTreeObj.type,
        sha: curSha,
      }

      curSha = await this.newTree(dirSha, [newTreeReq])
      prevSha = dirSha
    }
    return curSha
  }
}
