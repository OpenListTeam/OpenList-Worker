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
    const targets = this.getTargetsForPath(physicalPath)
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
    const srcTargets = this.getTargetsForPath(srcPhys)
    const dstTargets = this.getTargetsForPath(dstPhys)
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
    const srcTargets = this.getTargetsForPath(srcPhys)
    const dstTargets = this.getTargetsForPath(dstPhys)
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
