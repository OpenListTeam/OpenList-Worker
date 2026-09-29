// AutoIndex utility functions
import * as xpath from "xpath"
import { DOMParser } from "@xmldom/xmldom"
import { parse, serialize } from "parse5"
import { AutoIndexNode } from "./types"

/**
 * 从 xpath.select 的返回中提取字符串值。
 * xpath 库对 string()/number() 等表达式返回原始值（string/number），
 * 对 node-set 表达式返回数组。这里统一兼容两种情况。
 */
function extractXPathValue(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw.trim() || undefined
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw)
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as any
    const v = (first?.nodeValue ?? first?.textContent ?? "").trim()
    return v || undefined
  }
  return undefined
}

// 将宽松 HTML 清洗为可被 XML 解析器（xmldom）解析的良构 XML：
// 1) 先用 parse5 按 HTML5 容错规则修复未闭合/错位/重复标签；
// 2) 移除 XML 不需要的 DOCTYPE、注释和 script/style；
// 3) 把 void 标签（<hr>/<meta>/<br> 等）转为自闭合。
//
// 不能直接把远端 HTML 交给 xmldom 的 XML 模式：真实目录页常包含浏览器可以
// 正常处理的非严格 HTML。例如 archive.apache.org/dist/tomcat/ 同时有重复的
// html/body/pre 标签，旧实现会抛 "Opening and ending tag mismatch"。parse5 与
// Go 版 htmlquery 底层的 HTML parser 一样会容错，再转 XML 后仍可继续使用用户
// 配置的无前缀 XPath（如 //pre/a）。
//
// 注意：若直接用 xmldom 的 text/html 模式，它会注入 XHTML 命名空间，导致
// //pre/a 匹配不到。
const HTML_VOID_TAGS =
  "area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr"

function htmlToXml(html: string): string {
  let s = serialize(parse(html))
  s = s.replace(/<!DOCTYPE[^>]*>/gi, "")
  s = s.replace(/<!--[\s\S]*?-->/g, "")
  // script/style 的 raw text 可以包含 XML 非法的裸 <、&；AutoIndex XPath 不会
  // 依赖这些内容，移除可避免第二阶段 XML 解析被无关脚本或样式破坏。
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
  s = s.replace(
    new RegExp(`<(${HTML_VOID_TAGS})([^>]*?)/?\\s*>`, "gi"),
    "<$1$2/>",
  )
  return s
}

export function parseAutoIndexHTML(
  html: string,
  itemXPath: string,
  nameXPath: string,
  sizeXPath: string,
  modifiedXPath: string,
  ignoreNames: string[],
): AutoIndexNode[] {
  // @xmldom/xmldom >= 0.9 已废弃 errorHandler，改用 onError 回调
  const doc = new DOMParser({
    onError: () => {},
  }).parseFromString(htmlToXml(html), "text/xml")

  const items = xpath.select(itemXPath, doc as unknown as Node) as Node[]
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

      // 与 Go 一致：先 CutSuffix 去掉目录尾斜杠，再判断是否命中忽略列表
      const isDir = name.endsWith("/")
      if (isDir) {
        name = name.slice(0, -1)
      }

      if (!name || ignoreNames.includes(name)) continue

      const size = extractXPathValue(xpath.select(sizeXPath, item))
      const modified = extractXPathValue(xpath.select(modifiedXPath, item))

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

// 与 Go 侧 units 映射对齐（支持 KiB/MiB/GiB/TiB/PiB、KB/MB/GB/TB/PB、bytes 等）
const sizeUnits: Record<string, number> = {
  "": 1,
  b: 1,
  byte: 1,
  bytes: 1,
  k: 1 << 10,
  kb: 1 << 10,
  kib: 1 << 10,
  m: 1 << 20,
  mb: 1 << 20,
  mib: 1 << 20,
  g: 1 << 30,
  gb: 1 << 30,
  gib: 1 << 30,
  t: 1 << 40,
  tb: 1 << 40,
  tib: 1 << 40,
  p: 1 << 50,
  pb: 1 << 50,
  pib: 1 << 50,
}

function splitUnit(s: string): [string, string] {
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] >= "0" && s[i] <= "9") {
      return [s.slice(0, i + 1).trim(), s.slice(i + 1).trim()]
    }
  }
  return ["", s]
}

export function parseSize(sizeStr: string): number {
  if (!sizeStr || sizeStr.trim() === "-") return 0
  const s = sizeStr.trim()
  const [numStr, unitStr] = splitUnit(s)
  const unit = unitStr.toLowerCase()
  const mul = sizeUnits[unit] ?? 1
  const num = parseFloat(numStr)
  if (isNaN(num)) return 0
  return Math.round(num * mul)
}

export function parseTime(timeStr: string, format: string): string {
  if (!timeStr) return new Date().toISOString()

  try {
    // Simple date parsing - support common formats
    // Go format: Mon Jan 2 15:04:05 -0700 MST 2006
    // Common formats: "2006-01-02 15:04", "02-Jan-2006 15:04", etc.

    // Try ISO format first
    const isoMatch = timeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
    if (isoMatch) {
      const [, year, month, day, hour, minute] = isoMatch
      return new Date(
        `${year}-${month}-${day}T${hour}:${minute}:00`,
      ).toISOString()
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
