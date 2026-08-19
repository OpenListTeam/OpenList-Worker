export interface GithubAddition {
  root_folder_path?: string
  token: string
  owner: string
  repo: string
  ref?: string
  gh_proxy?: string
  gpg_private_key?: string
  gpg_key_passphrase?: string
  committer_name?: string
  committer_email?: string
  author_name?: string
  author_email?: string
  mkdir_commit_message?: string
  delete_commit_message?: string
  put_commit_message?: string
  rename_commit_message?: string
  copy_commit_message?: string
  move_commit_message?: string
  order_by?: string
  order_direction?: string
}

export interface GithubLinks {
  git: string
  html: string
  self: string
}

export interface GithubObject {
  type: "file" | "dir" | "submodule" | "symlink"
  encoding?: string
  size: number
  name: string
  path: string
  content?: string
  sha: string
  url: string
  git_url: string
  html_url: string
  download_url: string | null
  entries?: GithubObject[]
  _links?: GithubLinks
  submodule_git_url?: string
  target?: string
}

export interface GithubTreeObjReq {
  path: string
  mode: string // "100644" for file, "100755" for executable, "040000" for tree (dir), "160000" for commit, "120000" for symlink
  type: "blob" | "tree" | "commit"
  sha?: string | null
  content?: string
}

export interface GithubTreeObjResp extends GithubTreeObjReq {
  size?: number
  url?: string
}

export interface GithubTreeResp {
  sha: string
  url: string
  tree: GithubTreeObjResp[]
  truncated: boolean
}

export interface GithubPutBlobResp {
  url: string
  sha: string
}

export interface GithubCommitResp {
  sha: string
}

export interface GithubBranchResp {
  name: string
  commit: {
    sha: string
  }
}

export interface GithubRepoResp {
  default_branch: string
}

export interface GithubUserResp {
  name: string
  email: string
  login: string
}

export interface MessageTemplateVars {
  UserName: string
  ObjName: string
  ObjPath: string
  ParentName: string
  ParentPath: string
  TargetName?: string
  TargetPath?: string
}
