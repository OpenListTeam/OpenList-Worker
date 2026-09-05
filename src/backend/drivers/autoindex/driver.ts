// AutoIndex driver - Nginx AutoIndex adapter
// Ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/autoindex
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
  norm.url = (norm.url || "").trim().replace(/\/$/, "")
  norm.item_xpath = norm.item_xpath || DefaultItemXPath
  norm.name_xpath = norm.name_xpath || DefaultNameXPath
  norm.size_xpath = norm.size_xpath || DefaultSizeXPath
  norm.modified_xpath = norm.modified_xpath || DefaultModifiedXPath
  norm.modified_time_format = norm.modified_time_format || ""
  norm.ignore_file_names = norm.ignore_file_names || ""
  return norm as AutoIndexAddition
}

function autoIndexNodeToFileItem(
  node: AutoIndexNode,
  baseURL: string,
  timeFormat: string
): FileItem {
  let fullURL = node.url
  if (!fullURL.startsWith("http")) {
    fullURL = new URL(node.url, baseURL).toString()
  }

  return {
    name: node.name,
    size: node.size ? parseSize(node.size) : 0,
    is_dir: node.isDir,
    modified: node.modified ? parseTime(node.modified, timeFormat) : new Date().toISOString(),
    sign: fullURL,
    type: calcFileType(node.name, node.isDir),
    thumb: "",
    raw_url: node.isDir ? "" : fullURL,
  }
}

export class AutoIndexDriver implements StorageDriver {
  private addition: AutoIndexAddition
  private ignoreNames: string[] = []

  get config() {
    return {
      name: "AutoIndex",
      localSort: false,
      onlyLocal: false,
      onlyProxy: false,
      noCache: false,
      noUpload: true,
      defaultRoot: "",
    }
  }

  constructor(addition: any) {
    this.addition = normalizeAutoIndexAddition(addition)
    if (this.addition.ignore_file_names) {
      this.ignoreNames = this.addition.ignore_file_names
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
    }
  }

  async init(): Promise<void> {
    // No initialization needed
  }

  async drop(): Promise<void> {
    // No cleanup needed
  }

  async list(dir: string): Promise<FileItem[]> {
    const urlPath = dir.startsWith("/") ? dir.slice(1) : dir
    const url = urlPath ? `${this.addition.url}/${urlPath}` : this.addition.url

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }

    const html = await response.text()

    const nodes = parseAutoIndexHTML(
      html,
      this.addition.item_xpath || DefaultItemXPath,
      this.addition.name_xpath || DefaultNameXPath,
      this.addition.size_xpath || DefaultSizeXPath,
      this.addition.modified_xpath || DefaultModifiedXPath,
      this.ignoreNames
    )

    const items = nodes
      .filter((node) => node.name !== ".." && node.name !== ".")
      .map((node) =>
        autoIndexNodeToFileItem(
          node,
          url,
          this.addition.modified_time_format || ""
        )
      )

    return sortFileItems(items, {
      orderBy: "name",
      orderDirection: "asc",
    })
  }

  async link(file: FileItem): Promise<{ url: string; headers?: Record<string, string> }> {
    if (file.is_dir) {
      throw new Error("Cannot get link for directory")
    }
    return { url: file.raw_url }
  }

  async get(_path: string): Promise<FileItem | null> {
    throw new Error("Get operation not supported for AutoIndex")
  }

  async makeDir(_parentDir: string, _dirName: string): Promise<void> {
    throw new Error("Write operations not supported for AutoIndex")
  }

  async move(_srcPath: string, _dstDirPath: string): Promise<void> {
    throw new Error("Write operations not supported for AutoIndex")
  }

  async rename(_srcPath: string, _newName: string): Promise<void> {
    throw new Error("Write operations not supported for AutoIndex")
  }

  async copy(_srcPath: string, _dstDirPath: string): Promise<void> {
    throw new Error("Write operations not supported for AutoIndex")
  }

  async remove(_path: string): Promise<void> {
    throw new Error("Write operations not supported for AutoIndex")
  }

  async put(
    _dstDirPath: string,
    _content: ReadableStream,
    _fileName: string
  ): Promise<void> {
    throw new Error("Write operations not supported for AutoIndex")
  }

  async other(_method: string, _data: Record<string, any>): Promise<any> {
    throw new Error(`Unsupported operation: ${_method}`)
  }
}
