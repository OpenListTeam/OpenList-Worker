const fsModule = "node:fs/promises"
const pathModule = "node:path"

let fs: any = null
let path: any = null

try {
  fs = await import(fsModule)
  if (fs && fs.default) {
    fs = fs.default
  }
} catch (_) {}

try {
  path = await import(pathModule)
  if (path && path.default) {
    path = path.default
  }
} catch (_) {}

import { StorageDriver, FileItem } from "../internal/driver/base"

export class LocalDriver implements StorageDriver {
  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    if (!fs || !path) {
      return []
    }
    let files: any[] = []
    try {
      files = await fs.readdir(physicalPath, { withFileTypes: true })
    } catch (e) {
      // Return empty if directory not found physically
      return []
    }

    const items: FileItem[] = await Promise.all(
      files.map(async (file) => {
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
          modified: mtime.toISOString(),
          sign: "",
          type: isDir ? 1 : 0,
        }
      })
    )

    return items
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    if (!fs || !path) {
      throw new Error("Local filesystem is not supported in this environment")
    }
    const stat = await fs.stat(physicalPath)
    const isDir = stat.isDirectory()
    const name = physicalPath.split(path.sep).filter(Boolean).pop() || "root"
    return {
      name,
      size: isDir ? 0 : stat.size,
      is_dir: isDir,
      modified: stat.mtime.toISOString(),
      sign: "",
      type: isDir ? 1 : 0,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    if (!fs) {
      throw new Error("Local filesystem is not supported in this environment")
    }
    await fs.mkdir(physicalPath, { recursive: true })
  }

  async rename(virtualPath: string, physicalPath: string, newName: string): Promise<void> {
    if (!fs || !path) {
      throw new Error("Local filesystem is not supported in this environment")
    }
    const dst = path.join(path.dirname(physicalPath), newName)
    await fs.rename(physicalPath, dst)
  }

  async remove(virtualPath: string, physicalPath: string, names: string[]): Promise<void> {
    if (!fs || !path) {
      throw new Error("Local filesystem is not supported in this environment")
    }
    for (const name of names) {
      const itemPath = path.join(physicalPath, name)
      await fs.rm(itemPath, { recursive: true, force: true })
    }
  }

  async move(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void> {
    if (!fs || !path) {
      throw new Error("Local filesystem is not supported in this environment")
    }
    for (const name of names) {
      const src = path.join(srcPhys, name)
      const dst = path.join(dstPhys, name)
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.rename(src, dst)
    }
  }

  async copy(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void> {
    if (!fs || !path) {
      throw new Error("Local filesystem is not supported in this environment")
    }
    for (const name of names) {
      const src = path.join(srcPhys, name)
      const dst = path.join(dstPhys, name)
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.cp(src, dst, { recursive: true })
    }
  }

  async put(virtualPath: string, physicalPath: string, content: Buffer): Promise<void> {
    if (!fs || !path) {
      throw new Error("Local filesystem is not supported in this environment")
    }
    await fs.mkdir(path.dirname(physicalPath), { recursive: true })
    await fs.writeFile(physicalPath, content)
  }
}
