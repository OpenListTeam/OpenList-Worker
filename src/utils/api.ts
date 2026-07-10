import axios, { CancelToken } from "axios"
import {
  PEmptyResp,
  FsGetResp,
  FsListResp,
  Obj,
  PResp,
  FsSearchResp,
  RenameObj,
  ArchiveMeta,
  PPageResp,
  TorrentInfo,
  TorrentUploadParseResult,
  TorrentRapidUploadResult,
} from "~/types"
import { r } from "."

export const fsGet = (
  path: string = "/",
  password = "",
  cancelToken?: CancelToken,
): Promise<FsGetResp> => {
  return r.post(
    "/fs/get",
    {
      path: path,
      password: password,
    },
    {
      cancelToken: cancelToken,
    },
  )
}
export const fsList = (
  path: string = "/",
  password = "",
  page = 1,
  per_page = 0,
  refresh = false,
  cancelToken?: CancelToken,
): Promise<FsListResp> => {
  return r.post(
    "/fs/list",
    {
      path,
      password,
      page,
      per_page,
      refresh,
    },
    {
      cancelToken: cancelToken,
    },
  )
}

export const fsDirs = (
  path = "/",
  password = "",
  forceRoot = false,
): PResp<Obj[]> => {
  return r.post("/fs/dirs", { path, password, force_root: forceRoot })
}

export const fsMkdir = (path: string): PEmptyResp => {
  return r.post("/fs/mkdir", { path })
}

export const fsRename = (
  path: string,
  name: string,
  overwrite: boolean,
): PEmptyResp => {
  return r.post("/fs/rename", { path, name, overwrite })
}

export const fsBatchRename = (
  src_dir: string,
  rename_objects: RenameObj[],
): PEmptyResp => {
  return r.post("/fs/batch_rename", { src_dir, rename_objects })
}

export const fsMove = (
  src_dir: string,
  dst_dir: string,
  names: string[],
  overwrite: boolean,
  skip_existing: boolean,
): PEmptyResp => {
  return r.post("/fs/move", {
    src_dir,
    dst_dir,
    names,
    overwrite,
    skip_existing,
  })
}

export const fsRecursiveMove = (
  src_dir: string,
  dst_dir: string,
  conflict_policy: boolean,
): PEmptyResp => {
  return r.post("/fs/recursive_move", { src_dir, dst_dir, conflict_policy })
}

export const fsCopy = (
  src_dir: string,
  dst_dir: string,
  names: string[],
  overwrite: boolean,
  skip_existing: boolean,
  merge: boolean,
): PEmptyResp => {
  return r.post("/fs/copy", {
    src_dir,
    dst_dir,
    names,
    overwrite,
    skip_existing,
    merge,
  })
}

export const fsRemove = (dir: string, names: string[]): PEmptyResp => {
  return r.post("/fs/remove", { dir, names })
}

export const fsRemoveEmptyDirectory = (src_dir: string): PEmptyResp => {
  return r.post("/fs/remove_empty_directory", { src_dir })
}

export const fsNewFile = (
  path: string,
  password: string,
  overwrite: boolean,
): PEmptyResp => {
  return r.put("/fs/put", undefined, {
    headers: {
      "File-Path": encodeURIComponent(path),
      Password: password,
      Overwrite: overwrite.toString(),
    },
  })
}

export const fsArchiveMeta = (
  path: string = "/",
  password = "",
  archive_pass = "",
  refresh = false,
  cancelToken?: CancelToken,
): PResp<ArchiveMeta> => {
  return r.post(
    "/fs/archive/meta",
    {
      path,
      password,
      archive_pass,
      refresh,
    },
    {
      cancelToken: cancelToken,
    },
  )
}

export const fsArchiveList = (
  path: string = "/",
  password = "",
  archive_pass = "",
  inner_path = "/",
  page = 1,
  per_page = 0,
  refresh = false,
  cancelToken?: CancelToken,
): PPageResp<Obj> => {
  return r.post(
    "/fs/archive/list",
    {
      path,
      password,
      archive_pass,
      inner_path,
      page,
      per_page,
      refresh,
    },
    {
      cancelToken: cancelToken,
    },
  )
}

export const fsArchiveDecompress = (
  src_dir: string,
  dst_dir: string,
  name: string[],
  archive_pass = "",
  inner_path = "/",
  cache_full = true,
  put_into_new_dir = false,
  overwrite = false,
): PEmptyResp => {
  return r.post("/fs/archive/decompress", {
    src_dir,
    dst_dir,
    name,
    archive_pass,
    inner_path,
    cache_full,
    put_into_new_dir,
    overwrite,
  })
}

export const offlineDownload = (
  path: string,
  urls: string[],
  tool: string,
  delete_policy: string,
): PEmptyResp => {
  return r.post(`/fs/add_offline_download`, { path, urls, tool, delete_policy })
}

export const fetchText = async (
  url: string,
  ts = true,
): Promise<{
  content: ArrayBuffer | string
  contentType?: string
}> => {
  try {
    const resp = await axios.get(url, {
      responseType: "blob",
      params: ts
        ? {
            openlist_ts: new Date().getTime(),
          }
        : undefined,
    })
    const content = await resp.data.arrayBuffer()
    const rawContentType = resp.headers["content-type"]
    const contentType =
      typeof rawContentType === "string" ? rawContentType : undefined
    return { content, contentType }
  } catch (e) {
    return ts
      ? await fetchText(url, false)
      : {
          content: `Failed to fetch ${url}: ${e}`,
          contentType: "",
        }
  }
}

export const fsSearch = async (
  parent: string,
  keywords: string,
  password = "",
  scope = 0,
  page = 1,
  per_page = 100,
): Promise<FsSearchResp> => {
  return r.post("/fs/search", {
    parent,
    keywords,
    scope,
    page,
    per_page,
    password,
  })
}

export const buildIndex = async (paths = ["/"], max_depth = -1): PEmptyResp => {
  return r.post("/admin/index/build", {
    paths,
    max_depth,
  })
}

export const updateIndex = async (paths = [], max_depth = -1): PEmptyResp => {
  return r.post("/admin/index/update", {
    paths,
    max_depth,
  })
}

// ========== Torrent 相关 API ==========

export const torrentParse = (torrent_data: string): PResp<TorrentInfo> => {
  return r.post("/fs/torrent/parse", { torrent_data })
}

export const torrentUploadParse = (
  file: File,
): PResp<TorrentUploadParseResult> => {
  const formData = new FormData()
  formData.append("torrent", file)
  return r.post("/fs/torrent/upload_parse", formData)
}

export const torrentRapidUpload = (
  torrent_data: string,
  path: string,
): PResp<TorrentRapidUploadResult> => {
  return r.post("/fs/torrent/rapid_upload", { torrent_data, path })
}
