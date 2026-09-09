// AutoIndex driver - Nginx/静态目录索引适配器
// Ported from: OpenList-Backends/drivers/autoindex
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { AutoIndexAddition, AutoIndexNode } from "./types"
import { parseAutoIndexHTML, parseSize, parseTime } from "./util"

const DefaultItemXPath = "//pre/a"
const DefaultNameXPath = "@href"
const DefaultSizeXPath = "string(following-sibling::text()[1])"
const DefaultModifiedXPath = "string(following-sibling::text()[2])"

export function normalizeAutoIndexAddition(a: any): AutoIndexAddition {
  const norm = { ...(a || {}) } as any
  norm.url = (norm.url || "").trim()
  // Go: 无 scheme 则补 https://，无尾斜杠则补 /
  if (norm.url && !/:\/\//.test(norm.url)) norm.url = "https://" + norm.url
  if (norm.url && !norm.url.endsWith("/")) norm.url += "/"
  norm.item_xpath = norm.item_xpath || DefaultItemXPath
  norm.name_xpath = norm.name_xpath || DefaultNameXPath
  norm.size_xpath = norm.size_xpath || DefaultSizeXPath
  norm.modified_xpath = norm.modified_xpath || DefaultModifiedXPath
  norm.modified_time_format = norm.modified_time_format || ""
  norm.ignore_file_names = norm.ignore_file_names || ""
  return norm as AutoIndexAddition
}

export class AutoIndexDriver implements StorageDriver {
  private addition: AutoIndexAddition
  private ignoreNames: string[] = []

  constructor(addition: any) {
    this.addition = normalizeAutoIndexAddition(addition)
    // Go 用换行分隔 ignore 列表；兼容逗号分隔
    if (this.addition.ignore_file_names) {
      this.ignoreNames = this.addition.ignore_file_names
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter((s) => s)
    }
  }

  async init(): Promise<void> {
    if (!this.addition.url) throw new Error("url is required")
  }

  private cleanRel(p: string): string {
    return (p || "").split("/").filter(Boolean).join("/")
  }

  // 目录 URL（带尾斜杠，供相对 href 正确拼接）
  private buildDirURL(physicalPath: string): string {
    const rel = this.cleanRel(physicalPath)
    return this.addition.url + rel + (rel ? "/" : "")
  }

  private nodeToFileItem(node: AutoIndexNode, baseURL: string): FileItem {
    const fullURL = new URL(node.url, baseURL).toString()
    const isDir = node.isDir
    return {
      name: node.name,
      size: node.size ? parseSize(node.size) : 0,
      is_dir: isDir,
      modified: node.modified
        ? parseTime(node.modified, this.addition.modified_time_format || "")
        : new Date().toISOString(),
      // sign 保留给下载签名（pkg/sign），不可塞入 URL，否则前端会拼出无效
      // ?sign=http://... 导致签名校验 401。直链走 raw_url。
      sign: "",
      type: calcFileType(node.name, isDir),
      raw_url: isDir ? "" : fullURL,
    }
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const baseURL = this.buildDirURL(physicalPath)
    const res = await fetch(baseURL)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${baseURL}: HTTP ${res.status}`)
    }
    const html = await res.text()

    const nodes = parseAutoIndexHTML(
      html,
      this.addition.item_xpath || DefaultItemXPath,
      this.addition.name_xpath || DefaultNameXPath,
      this.addition.size_xpath || DefaultSizeXPath,
      this.addition.modified_xpath || DefaultModifiedXPath,
      this.ignoreNames,
    )

    const items: FileItem[] = nodes
      .filter((n) => n.name !== ".." && n.name !== ".")
      .map((n) => this.nodeToFileItem(n, baseURL))

    return sortFileItems(items, "name", "asc")
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const rel = this.cleanRel(physicalPath)
    const name = rel.split("/").filter(Boolean).pop() || "root"

    if (!rel) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.addition.url,
        type: 1,
      }
    }

    // 静态服务：文件 URL 即 根 URL + 相对路径
    const fullURL = this.addition.url + rel
    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: fullURL,
      type: calcFileType(name, false),
      raw_url: fullURL,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    throw new Error("AutoIndex is read-only")
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    throw new Error("AutoIndex is read-only")
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    throw new Error("AutoIndex is read-only")
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("AutoIndex is read-only")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    throw new Error("AutoIndex is read-only")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    throw new Error("AutoIndex is read-only")
  }
}
