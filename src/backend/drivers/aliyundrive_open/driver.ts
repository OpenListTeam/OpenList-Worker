import { FileItem, StorageDriver } from "../../internal/driver/base"
import { AliyundriveOpenAddition } from "./types"
import { AliyunOpenClient } from "./util"

export class AliyundriveOpen implements StorageDriver {
  private client: AliyunOpenClient

  constructor(addition: AliyundriveOpenAddition) {
    this.client = new AliyunOpenClient(addition)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const fileId = await this.client.getFileIdByPath(physicalPath)
    const rawItems = await this.client.listOpenFiles(fileId)

    return rawItems.map((item) => {
      const isDir = item.type === "folder"
      return {
        name: item.name,
        size: isDir ? 0 : item.size || 0,
        is_dir: isDir,
        modified:
          item.updated_at || item.created_at || new Date().toISOString(),
        sign: "",
        type: isDir ? 1 : 0,
      }
    })
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const fileId = await this.client.getFileIdByPath(physicalPath)
    const item = await this.client.getOpenFile(fileId)
    const isDir = item.type === "folder"

    let downloadUrl = ""
    if (!isDir) {
      downloadUrl = await this.client.getDownloadUrl(fileId).catch(() => "")
    }

    return {
      name: item.name,
      size: isDir ? 0 : item.size || 0,
      is_dir: isDir,
      modified: item.updated_at || item.created_at || new Date().toISOString(),
      sign: downloadUrl,
      type: isDir ? 1 : 0,
    }
  }

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const parts = (physicalPath || "").split("/").filter(Boolean)
    const folderName = parts.pop() || "new_folder"
    const parentPath = parts.join("/")

    const parentFileId = await this.client.getFileIdByPath(parentPath)
    await this.client.mkdir(parentFileId, folderName)
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const fileId = await this.client.getFileIdByPath(physicalPath)
    await this.client.rename(fileId, newName)
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    for (const name of names) {
      const targetPath = physicalPath.endsWith("/")
        ? `${physicalPath}${name}`
        : `${physicalPath}/${name}`
      const fileId = await this.client.getFileIdByPath(targetPath)
      await this.client.remove(fileId)
    }
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const dstParentFileId = await this.client.getFileIdByPath(dstPhys)
    for (const name of names) {
      const targetPath = srcPhys.endsWith("/")
        ? `${srcPhys}${name}`
        : `${srcPhys}/${name}`
      const fileId = await this.client.getFileIdByPath(targetPath)
      await this.client.move(fileId, dstParentFileId)
    }
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    const dstParentFileId = await this.client.getFileIdByPath(dstPhys)
    for (const name of names) {
      const targetPath = srcPhys.endsWith("/")
        ? `${srcPhys}${name}`
        : `${srcPhys}/${name}`
      const fileId = await this.client.getFileIdByPath(targetPath)
      await this.client.copy(fileId, dstParentFileId)
    }
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const parts = (physicalPath || "").split("/").filter(Boolean)
    const filename = parts.pop() || "upload_file"
    const parentPath = parts.join("/")

    const parentFileId = await this.client.getFileIdByPath(parentPath)
    await this.client.putFile(parentFileId, filename, content)
  }
}
