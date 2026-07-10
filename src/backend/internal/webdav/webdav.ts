import { generateWebDavXml } from "../../pkg/utils"

export interface WebDavItem {
  name: string
  size: number
  isFolder: boolean
  modified: string
}

export function buildWebDavPropfindResponse(reqPath: string, items: WebDavItem[]): string {
  return generateWebDavXml(reqPath, items)
}
