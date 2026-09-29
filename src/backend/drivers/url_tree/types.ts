// UrlTree driver types — 从文本定义的 URL 树构建虚拟文件系统
export interface UrlTreeAddition {
  url_structure: string
  head_size?: boolean
  writable?: boolean
  root_folder_path?: string
}

export interface UrlTreeNode {
  url: string
  name: string
  level: number
  modified: number
  size: number
  children: UrlTreeNode[]
}
