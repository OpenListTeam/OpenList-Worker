import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { md5 } from "../../pkg/crypto"
import {
  TeraboxAddition,
  TeraboxFile,
  TeraboxListResp,
  TeraboxLocateUploadResp,
  TeraboxPrecreateResp,
} from "./types"
import { TeraboxApiClient } from "./util"

export class TeraboxDriver implements StorageDriver {
  private addition: TeraboxAddition
  private client: TeraboxApiClient

  constructor(
    addition: TeraboxAddition,
    onCookieRefreshed?: (cookie: string) => Promise<void>,
  ) {
    this.addition = addition
    this.client = new TeraboxApiClient(addition, onCookieRefreshed)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const allFiles: TeraboxFile[] = []
    let page = 1
    const num = 100

    while (true) {
      const params: Record<string, string> = {
        dir: clean,
        page: String(page),
        num: String(num),
      }
      if (this.addition.order_by) {
        params.order = this.addition.order_by
        if (this.addition.order_direction === "desc") {
          params.desc = "1"
        }
      }

      const resp: TeraboxListResp = await this.client.request("/api/list", {
        method: "GET",
        params,
      })

      if (resp.errno === 9000) {
        throw new Error("TeraBox is not yet available in this area")
      }

      if (!resp.list || resp.list.length === 0) {
        break
      }

      allFiles.push(...resp.list)
      page++
    }

    const items: FileItem[] = allFiles.map((f) => {
      const isDir = f.isdir === 1
      return {
        name: f.server_filename,
        size: f.size || 0,
        is_dir: isDir,
        modified: f.server_mtime
          ? new Date(f.server_mtime * 1000).toISOString()
          : new Date().toISOString(),
        sign: String(f.fs_id),
        type: calcFileType(f.server_filename, isDir),
        thumb: f.thumbs?.url3,
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
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"

    if (clean === "/") {
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

    const parentDir = clean.split("/").slice(0, -1).join("/") || "/"
    const fileName = clean.split("/").pop() || ""

    const resp: TeraboxListResp = await this.client.request("/api/list", {
      method: "GET",
      params: {
        dir: parentDir,
        page: "1",
        num: "1000",
      },
    })

    const found = resp.list?.find((f) => f.server_filename === fileName)
    if (!found) {
      return {
        name,
        size: 0,
        is_dir: false,
        modified: new Date().toISOString(),
        sign: "",
        type: 0,
        raw_url: "",
      }
    }

    const isDir = found.isdir === 1
    let rawUrl = ""
    if (!isDir) {
      try {
        if (this.addition.download_api === "crack") {
          rawUrl = await this.client.linkCrack(clean)
        } else {
          rawUrl = await this.client.linkOfficial(found.fs_id)
        }
      } catch (e) {
        console.warn("[TeraBox] get download link failed:", e)
      }
    }

    return {
      name: found.server_filename,
      size: found.size || 0,
      is_dir: isDir,
      modified: found.server_mtime
        ? new Date(found.server_mtime * 1000).toISOString()
        : new Date().toISOString(),
      sign: String(found.fs_id),
      type: calcFileType(found.server_filename, isDir),
      thumb: found.thumbs?.url3,
      raw_url: rawUrl,
      raw_url_headers: {
        "User-Agent":
          "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
      },
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    await this.client.request("/api/create", {
      method: "POST",
      isFormData: true,
      params: { a: "commit" },
      body: {
        path: clean,
        isdir: "1",
        block_list: "[]",
      },
    })
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    await this.client.manage("rename", [
      {
        path: clean,
        newname: newName,
      },
    ])
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const paths = names.map((n) => (clean === "/" ? `/${n}` : `${clean}/${n}`))
    await this.client.manage("delete", paths)
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcClean = this.cleanPath(srcPhys)
    const dstClean = this.cleanPath(dstPhys)

    const fileList = names.map((name) => ({
      path: srcClean === "/" ? `/${name}` : `${srcClean}/${name}`,
      dest: dstClean,
      newname: name,
    }))

    await this.client.manage("move", fileList)
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const srcClean = this.cleanPath(srcPhys)
    const dstClean = this.cleanPath(dstPhys)

    const fileList = names.map((name) => ({
      path: srcClean === "/" ? `/${name}` : `${srcClean}/${name}`,
      dest: dstClean,
      newname: name,
    }))

    await this.client.manage("copy", fileList)
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const fileName = clean.split("/").pop() || "upload"

    const locateRes = await fetch(
      "https://jp-data.terabox.com/rest/2.0/pcs/file?method=locateupload",
    )
    const locateData: TeraboxLocateUploadResp = await locateRes.json()
    const uploadHost = locateData.host || "d.terabox.com"

    const contentMd5 = md5(new Uint8Array(content))
    const precreateBody = {
      path: clean,
      autoinit: "1",
      target_path: parentPath,
      block_list: JSON.stringify([contentMd5]),
      local_mtime: String(Math.floor(Date.now() / 1000)),
      file_limit_switch_v34: "true",
    }

    const precreateRes: TeraboxPrecreateResp = await this.client.request(
      "/api/precreate",
      {
        method: "POST",
        isFormData: true,
        body: precreateBody,
      },
    )

    if (precreateRes.errno !== 0) {
      throw new Error(`TeraBox precreate failed (errno: ${precreateRes.errno})`)
    }

    // Direct rapid return
    if (precreateRes.return_type === 2) {
      return
    }

    const uploadUrl = `https://${uploadHost}/rest/2.0/pcs/superfile2?method=upload&path=${encodeURIComponent(clean)}&uploadid=${encodeURIComponent(precreateRes.uploadid)}&partseq=0`

    const formData = new FormData()
    formData.append(
      "file",
      new Blob([new Uint8Array(content)], { type: "application/octet-stream" }),
      fileName,
    )

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Cookie: this.addition.cookie,
        "User-Agent":
          "terabox;1.37.0.7;PC;PC-Windows;10.0.22631;WindowsTeraBox",
      },
      body: formData,
    })

    if (!uploadRes.ok) {
      throw new Error(`TeraBox upload chunk failed: ${uploadRes.statusText}`)
    }

    const createBody = {
      path: clean,
      size: String(content.length),
      uploadid: precreateRes.uploadid,
      target_path: parentPath,
      block_list: JSON.stringify([contentMd5]),
      local_mtime: String(Math.floor(Date.now() / 1000)),
    }

    await this.client.request("/api/create", {
      method: "POST",
      isFormData: true,
      params: {
        isdir: "0",
        rtype: "1",
      },
      body: createBody,
    })
  }
}
