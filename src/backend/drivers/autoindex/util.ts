// AutoIndex utility functions
import * as xpath from "xpath"
import { DOMParser } from "@xmldom/xmldom"
import { AutoIndexNode } from "./types"

export function parseAutoIndexHTML(
  html: string,
  itemXPath: string,
  nameXPath: string,
  sizeXPath: string,
  modifiedXPath: string,
  ignoreNames: string[]
): AutoIndexNode[] {
  const doc = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: () => {},
      fatalError: () => {},
    },
  }).parseFromString(html, "text/html")

  const items = xpath.select(itemXPath, doc) as Node[]
  const result: AutoIndexNode[] = []

  for (const item of items) {
    try {
      const nameNodes = xpath.select(nameXPath, item) as Node[]
      if (nameNodes.length === 0) continue

      const nameNode = nameNodes[0]
      let name = ""
      let url = ""

      if (nameNode.nodeType === 1) {
        // Element node
        const element = nameNode as Element
        name = element.textContent?.trim() || ""
        url = element.getAttribute("href") || ""
      } else if (nameNode.nodeType === 2) {
        // Attribute node
        const attr = nameNode as Attr
        name = attr.value.trim()
        url = attr.value
      } else {
        name = nameNode.textContent?.trim() || ""
      }

      if (!name || ignoreNames.includes(name)) continue

      const isDir = name.endsWith("/")
      if (isDir) {
        name = name.slice(0, -1)
      }

      let size: string | undefined
      const sizeNodes = xpath.select(sizeXPath, item) as Node[]
      if (sizeNodes.length > 0) {
        size = sizeNodes[0].textContent?.trim() || ""
      }

      let modified: string | undefined
      const modifiedNodes = xpath.select(modifiedXPath, item) as Node[]
      if (modifiedNodes.length > 0) {
        modified = modifiedNodes[0].textContent?.trim() || ""
      }

      result.push({
        name,
        url,
        isDir,
        size,
        modified,
      })
    } catch (e) {
      // Skip invalid items
    }
  }

  return result
}

export function parseSize(sizeStr: string): number {
  if (!sizeStr || sizeStr === "-") return 0

  const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?)B?$/i)
  if (!match) return 0

  const num = parseFloat(match[1])
  const unit = match[2].toUpperCase()

  switch (unit) {
    case "K":
      return Math.round(num * 1024)
    case "M":
      return Math.round(num * 1024 * 1024)
    case "G":
      return Math.round(num * 1024 * 1024 * 1024)
    case "T":
      return Math.round(num * 1024 * 1024 * 1024 * 1024)
    default:
      return Math.round(num)
  }
}

export function parseTime(
  timeStr: string,
  format: string
): string {
  if (!timeStr) return new Date().toISOString()

  try {
    // Simple date parsing - support common formats
    // Go format: Mon Jan 2 15:04:05 -0700 MST 2006
    // Common formats: "2006-01-02 15:04", "02-Jan-2006 15:04", etc.

    // Try ISO format first
    const isoMatch = timeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
    if (isoMatch) {
      const [, year, month, day, hour, minute] = isoMatch
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).toISOString()
    }

    // Try common formats
    const parsed = new Date(timeStr)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  } catch (e) {
    // Ignore parse errors
  }

  return new Date().toISOString()
}
