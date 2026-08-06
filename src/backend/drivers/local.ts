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
    for (const name of names) {
      const itemPath = path.join(physicalPath, name)
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
    for (const name of names) {
      const src = path.join(srcPhys, name)
      const dst = path.join(dstPhys, name)
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.rename(src, dst)
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
    for (const name of names) {
      const src = path.join(srcPhys, name)
      const dst = path.join(dstPhys, name)
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.cp(src, dst, { recursive: true })
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
