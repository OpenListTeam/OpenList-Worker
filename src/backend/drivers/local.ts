import { StorageDriver, FileItem, calcFileType } from "../internal/driver/base"

let fs: any = null
let path: any = null

async function initNodeModules() {
  if (
    typeof process !== "undefined" &&
    process.release?.name === "node" &&
    !fs
  ) {
    try {
      fs = await import("fs/promises")
      path = await import("path")
    } catch (e) {}
  }
}

export class LocalDriver implements StorageDriver {
  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    let files: any[] = []
    try {
      files = await fs.readdir(physicalPath, { withFileTypes: true })
    } catch (e) {
      return []
    }
    const items: FileItem[] = await Promise.all(
      files.map(async (file: any) => {
        const isDir = file.isDirectory()
        let size = 0
        let mtime = new Date()
        try {
          const stat = await fs.stat(path.join(physicalPath, file.name))
          size = stat.size
          mtime = stat.mtime
        } catch (_) {}
        return {
          name: file.name,
          size: isDir ? 0 : size,
          is_dir: isDir,
          created: mtime.toISOString(),
          modified: mtime.toISOString(),
          sign: "",
          type: calcFileType(file.name, isDir),
        }
      }),
    )
    return items
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    const stat = await fs.stat(physicalPath)
    const isDir = stat.isDirectory()
    // physicalPath may use either "/" or "\" separators
    const name =
      physicalPath
        .split(/[\\/]+/)
        .filter(Boolean)
        .pop() || "root"
    return {
      name,
      size: isDir ? 0 : stat.size,
      is_dir: isDir,
      created: stat.ctime?.toISOString() || stat.mtime.toISOString(),
      modified: stat.mtime.toISOString(),
      sign: "",
      type: calcFileType(name, isDir),
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    await fs.mkdir(physicalPath, { recursive: true })
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    const dst = path.join(path.dirname(physicalPath), newName)
    await fs.rename(physicalPath, dst)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    // physicalPath 是目标项自身的路径（op/storage.ts removeItems 逐项调用），
    // 直接删除即可；再拼一次 name 会指向 <item>/<name>，配合 force:true 会
    // 静默"成功"但什么都没删。仅当 names.length > 1 时按「目录 + 多个 name」
    // 展开（防御性分支，当前调用链恒传 1 个）。
    const expand = names && names.length > 1
    const targets = expand
      ? names.map((n) => path.join(physicalPath, n))
      : [physicalPath]
    for (const itemPath of targets) {
      await fs.rm(itemPath, { recursive: true, force: true })
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    // srcPhys/dstPhys 是源/目标项自身的路径（已含 name），直接移动即可；
    // 再拼一次 name 会指向不存在的 <item>/<name> 而 ENOENT。
    // 仅当 names.length > 1 时按「目录 + 多个 name」展开（防御性分支）。
    const expand = names && names.length > 1
    const srcs = expand ? names.map((n) => path.join(srcPhys, n)) : [srcPhys]
    const dsts = expand ? names.map((n) => path.join(dstPhys, n)) : [dstPhys]
    for (let i = 0; i < srcs.length; i++) {
      const dst = dsts[i]
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.rename(srcs[i], dst)
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    // 同 move：srcPhys/dstPhys 已是源/目标项自身路径，不再拼 name。
    // 仅当 names.length > 1 时按「目录 + 多个 name」展开（防御性分支）。
    const expand = names && names.length > 1
    const srcs = expand ? names.map((n) => path.join(srcPhys, n)) : [srcPhys]
    const dsts = expand ? names.map((n) => path.join(dstPhys, n)) : [dstPhys]
    for (let i = 0; i < srcs.length; i++) {
      const dst = dsts[i]
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.cp(srcs[i], dst, { recursive: true })
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    await initNodeModules()
    if (!fs || !path)
      throw new Error("LocalDriver is not supported in Edge Runtime")
    await fs.mkdir(path.dirname(physicalPath), { recursive: true })
    await fs.writeFile(physicalPath, content)
  }
}
