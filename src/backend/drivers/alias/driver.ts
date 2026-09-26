import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import { AliasAddition, AliasPathPair } from "./types"

export class AliasDriver implements StorageDriver {
  private addition: AliasAddition
  private pathPairs: AliasPathPair[] = []
  private rootOrder: string[] = []
  private pathMap: Map<string, string[]> = new Map()

  constructor(addition: AliasAddition) {
    this.addition = addition
    this.parsePaths()
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  /** 取所在目录：physicalPath 是目标项自身路径时，去掉最后一段即其父目录 */
  private parentPath(p: string): string {
    const clean = this.cleanPath(p)
    return clean.substring(0, clean.lastIndexOf("/")) || "/"
  }

  private parsePaths(): void {
    const raw = this.addition.paths || ""
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)

    this.pathPairs = []
    this.rootOrder = []
    this.pathMap.clear()

    for (const line of lines) {
      let aliasSub = "/"
      let target = line
      const colonIdx = line.indexOf(":")
      if (colonIdx > 0) {
        aliasSub = this.cleanPath(line.slice(0, colonIdx))
        target = line.slice(colonIdx + 1).trim()
      }
      target = this.cleanPath(target)

      this.pathPairs.push({ aliasSubPath: aliasSub, targetPath: target })

      if (!this.pathMap.has(aliasSub)) {
        this.rootOrder.push(aliasSub)
        this.pathMap.set(aliasSub, [])
      }
      this.pathMap.get(aliasSub)!.push(target)
    }
  }

  async init(): Promise<void> {
    this.parsePaths()
  }

  private getTargetsForPath(physicalPath: string): Array<{
    targetFullPath: string
    subPath: string
  }> {
    const clean = this.cleanPath(physicalPath)
    const results: Array<{ targetFullPath: string; subPath: string }> = []

    if (this.rootOrder.length === 1 && this.rootOrder[0] === "/") {
      const targets = this.pathMap.get("/") || []
      for (const target of targets) {
        const full = clean === "/" ? target : `${target}${clean}`
        results.push({ targetFullPath: this.cleanPath(full), subPath: clean })
      }
      return results
    }

    for (const [aliasSub, targets] of this.pathMap.entries()) {
      if (aliasSub === clean) {
        for (const target of targets) {
          results.push({ targetFullPath: target, subPath: "/" })
        }
      } else if (clean.startsWith(aliasSub === "/" ? "/" : `${aliasSub}/`)) {
        const sub = clean.slice(aliasSub === "/" ? 0 : aliasSub.length)
        for (const target of targets) {
          const full = sub === "/" ? target : `${target}${sub}`
          results.push({ targetFullPath: this.cleanPath(full), subPath: sub })
        }
      }
    }

    return results
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const clean = this.cleanPath(physicalPath)
    const { listItems } = await import("../../internal/op/storage")

    if (clean === "/" && this.rootOrder.length > 1) {
      const items: FileItem[] = []
      for (const aliasSub of this.rootOrder) {
        const dirName = aliasSub.replace(/^\//, "").split("/")[0] || aliasSub
        if (!items.some((i) => i.name === dirName)) {
          items.push({
            name: dirName,
            size: 0,
            is_dir: true,
            modified: new Date().toISOString(),
            sign: aliasSub,
            type: 1,
            raw_url: "",
          })
        }
      }
      return sortFileItems(
        items,
        this.addition.order_by,
        this.addition.order_direction,
      )
    }

    const targets = this.getTargetsForPath(physicalPath)
    if (targets.length === 0) {
      return []
    }

    const mergedMap = new Map<string, FileItem>()

    for (const target of targets) {
      try {
        const res = await listItems(target.targetFullPath)
        for (const item of res.content) {
          if (!mergedMap.has(item.name)) {
            mergedMap.set(item.name, item)
          }
        }
      } catch (e) {
        console.warn(
          `[Alias] listing target ${target.targetFullPath} warning:`,
          e,
        )
      }
    }

    const items = Array.from(mergedMap.values())
    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    const name = clean.split("/").filter(Boolean).pop() || "root"

    if (clean === "/" && this.rootOrder.length > 1) {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "/",
        type: 1,
        raw_url: "",
      }
    }

    const targets = this.getTargetsForPath(physicalPath)
    if (targets.length === 0) {
      return {
        name,
        size: 0,
        is_dir: false,
        modified: new Date().toISOString(),
        sign: "",
        type: calcFileType(name, false),
        raw_url: "",
      }
    }

    const { getItem } = await import("../../internal/op/storage")

    for (const target of targets) {
      try {
        const res = await getItem(target.targetFullPath)
        if (res?.item) {
          return {
            ...res.item,
            raw_url: res.item.raw_url || res.rawUrl,
          }
        }
      } catch {
        // Try next candidate
      }
    }

    return {
      name,
      size: 0,
      is_dir: false,
      modified: new Date().toISOString(),
      sign: "",
      type: calcFileType(name, false),
      raw_url: "",
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const targets = this.getTargetsForPath(physicalPath)
    if (targets.length === 0) {
      throw new Error(`[Alias] no target found for path ${physicalPath}`)
    }
    const { makeDirectory } = await import("../../internal/op/storage")
    await makeDirectory(targets[0].targetFullPath)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const targets = this.getTargetsForPath(physicalPath)
    if (targets.length === 0) {
      throw new Error(`[Alias] no target found for path ${physicalPath}`)
    }
    const { renameItem } = await import("../../internal/op/storage")
    await renameItem(targets[0].targetFullPath, newName)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    // physicalPath 是目标项自身的路径，而 removeItems 需要「目录 + names」
    //（内部会再拼 name）；直接把项路径当目录传入会得到 <item>/<name>，
    // 目标不存在导致删除静默失败。仅当 names.length > 1 时按「目录 + 多个
    // name」展开（调用方恒传 1 个，此分支是防御性的）。
    const expand = names && names.length > 1
    const dirPath = expand
      ? this.cleanPath(physicalPath)
      : this.parentPath(physicalPath)
    const targets = this.getTargetsForPath(dirPath)
    if (targets.length === 0) return
    const { removeItems } = await import("../../internal/op/storage")
    await removeItems(targets[0].targetFullPath, names)
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // srcPhys/dstPhys 是源/目标项自身的路径，moveItems 需要的是各自所在
    // 目录（内部会再拼 name）；传项路径会得到 <item>/<name>，操作静默失败。
    // 仅当 names.length > 1 时按「目录 + 多个 name」展开（防御性分支）。
    const expand = names && names.length > 1
    const srcDirPath = expand
      ? this.cleanPath(srcPhys)
      : this.parentPath(srcPhys)
    const dstDirPath = expand
      ? this.cleanPath(dstPhys)
      : this.parentPath(dstPhys)
    const srcTargets = this.getTargetsForPath(srcDirPath)
    const dstTargets = this.getTargetsForPath(dstDirPath)
    if (srcTargets.length === 0 || dstTargets.length === 0) {
      throw new Error("[Alias] cannot resolve source or destination path")
    }
    const { moveItems } = await import("../../internal/op/storage")
    await moveItems(
      srcTargets[0].targetFullPath,
      dstTargets[0].targetFullPath,
      names,
    )
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // 同 move：srcPhys/dstPhys 是项自身路径，copyItems 需要所在目录。
    const expand = names && names.length > 1
    const srcDirPath = expand
      ? this.cleanPath(srcPhys)
      : this.parentPath(srcPhys)
    const dstDirPath = expand
      ? this.cleanPath(dstPhys)
      : this.parentPath(dstPhys)
    const srcTargets = this.getTargetsForPath(srcDirPath)
    const dstTargets = this.getTargetsForPath(dstDirPath)
    if (srcTargets.length === 0 || dstTargets.length === 0) {
      throw new Error("[Alias] cannot resolve source or destination path")
    }
    const { copyItems } = await import("../../internal/op/storage")
    await copyItems(
      srcTargets[0].targetFullPath,
      dstTargets[0].targetFullPath,
      names,
    )
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const targets = this.getTargetsForPath(physicalPath)
    if (targets.length === 0) {
      throw new Error(`[Alias] no target found for upload path ${physicalPath}`)
    }
    const { putItem } = await import("../../internal/op/storage")
    await putItem(targets[0].targetFullPath, content)
  }
}
