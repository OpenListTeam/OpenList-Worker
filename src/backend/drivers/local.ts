import fs from "fs/promises"
import path from "path"
import { StorageDriver, FileItem } from "../internal/driver/base"

export class LocalDriver implements StorageDriver {
  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
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
          type: isDir ? 0 : 1,
        }
      })
    )

    return items
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const stat = await fs.stat(physicalPath)
    const isDir = stat.isDirectory()
    const name = physicalPath.split(path.sep).filter(Boolean).pop() || "root"
    return {
      name,
      size: isDir ? 0 : stat.size,
      is_dir: isDir,
      modified: stat.mtime.toISOString(),
      sign: "",
      type: isDir ? 0 : 1,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    await fs.mkdir(physicalPath, { recursive: true })
  }

  async rename(virtualPath: string, physicalPath: string, newName: string): Promise<void> {
    const dst = path.join(path.dirname(physicalPath), newName)
    await fs.rename(physicalPath, dst)
  }

  async remove(virtualPath: string, physicalPath: string, names: string[]): Promise<void> {
    for (const name of names) {
      const itemPath = path.join(physicalPath, name)
      await fs.rm(itemPath, { recursive: true, force: true })
    }
  }

  async move(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void> {
    for (const name of names) {
      const src = path.join(srcPhys, name)
      const dst = path.join(dstPhys, name)
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.rename(src, dst)
    }
  }

  async copy(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void> {
    for (const name of names) {
      const src = path.join(srcPhys, name)
      const dst = path.join(dstPhys, name)
      await fs.mkdir(path.dirname(dst), { recursive: true })
      await fs.cp(src, dst, { recursive: true })
    }
  }

  async put(virtualPath: string, physicalPath: string, content: Buffer): Promise<void> {
    await fs.mkdir(path.dirname(physicalPath), { recursive: true })
    await fs.writeFile(physicalPath, content)
  }
}
