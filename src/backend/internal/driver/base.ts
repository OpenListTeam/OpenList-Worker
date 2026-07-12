export interface FileItem {
  name: string
  size: number
  is_dir: boolean
  modified: string
  sign: string
  type: number // 1 for dir, 0 for file
}

export interface StorageDriver {
  init?(): Promise<void>
  list(virtualPath: string, physicalPath: string): Promise<FileItem[]>
  get(virtualPath: string, physicalPath: string): Promise<FileItem>
  mkdir(virtualPath: string, physicalPath: string): Promise<void>
  rename(virtualPath: string, physicalPath: string, newName: string): Promise<void>
  remove(virtualPath: string, physicalPath: string, names: string[]): Promise<void>
  move(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void>
  copy(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void>
  put(virtualPath: string, physicalPath: string, content: ArrayBuffer | Uint8Array): Promise<void>
}
