/**
 * 蓝奏云辅助工具函数：
 * - 阿里云 WAF 防火墙 (acw_sc__v2) 纯 TS 自动求解
 * - 中文相对时间与文件大小解析
 * - HTML / JS 动态变量与表单提取
 */

const timeSplitReg = /([0-9.]*)\s*([\u4e00-\u9fa5]+)/
const sizeSplitReg = /([0-9.]+)\s*([bkm]+)/i
const findAcwScV2Reg = /arg1='([0-9A-Z]+)'/i
const findDataReg = /data[:\s]+({[^}]+})/
const findKVReg = /'(.+?)':('?([^' },]*)'?)/g

/**
 * 解析蓝奏云的各种中文时间格式
 */
export function mustParseTime(str: string): string {
  if (!str) return new Date().toISOString()
  const trimmed = str.trim()

  // 尝试标准日期格式 YYYY-MM-DD
  const directDate = new Date(trimmed)
  if (!isNaN(directDate.getTime())) {
    return directDate.toISOString()
  }

  const now = Date.now()
  const DAY_MS = 86400000

  const match = trimmed.match(timeSplitReg)
  if (match) {
    const val = parseFloat(match[1]) || 0
    const unit = match[2]

    if (unit.includes("秒前")) {
      return new Date(now - val * 1000).toISOString()
    } else if (unit.includes("分") || unit.includes("分钟前")) {
      return new Date(now - val * 60000).toISOString()
    } else if (unit.includes("小时前") || unit.includes("小时")) {
      return new Date(now - val * 3600000).toISOString()
    } else if (unit.includes("天前") || unit.includes("天")) {
      return new Date(now - val * DAY_MS).toISOString()
    } else if (unit.includes("昨天")) {
      return new Date(now - DAY_MS).toISOString()
    } else if (unit.includes("前天")) {
      return new Date(now - DAY_MS * 2).toISOString()
    }
  }

  return new Date().toISOString()
}

/**
 * 将蓝奏云大小字符串（如 "12.5 M", "500 K", "1024 B"）转换为字节数值
 */
export function sizeStrToInt64(sizeStr: string): number {
  if (!sizeStr) return 0
  const match = sizeStr.trim().match(sizeSplitReg)
  if (!match) return 0

  const s = parseFloat(match[1])
  const unit = match[2].toUpperCase()

  switch (unit) {
    case "B":
      return Math.floor(s)
    case "K":
      return Math.floor(s * 1024)
    case "M":
      return Math.floor(s * 1048576)
    case "G":
      return Math.floor(s * 1073741824)
    default:
      return 0
  }
}

/**
 * 移除 HTML 注释与单行注释
 */
export function removeNotes(html: string): string {
  return html.replace(/<!--[\s\S]*?-->|[^:]\/\/.*|\/\*[\s\S]*?\*\//g, (b) => {
    if (b.slice(1, 3) === "//") {
      return b.slice(0, 1)
    }
    return "\n"
  })
}

/**
 * 移除 JS 注释
 */
export function removeJSComment(data: string): string {
  let result = ""
  let inComment = false
  let inSingleLineComment = false

  for (let i = 0; i < data.length; i++) {
    const v = data[i]

    if (inSingleLineComment && (v === "\n" || v === "\r")) {
      inSingleLineComment = false
      result += v
      continue
    }
    if (inComment && v === "*" && i + 1 < data.length && data[i + 1] === "/") {
      inComment = false
      i++
      continue
    }
    if (inComment || inSingleLineComment) {
      continue
    }
    if (v === "/" && i + 1 < data.length) {
      const nextChar = data[i + 1]
      if (nextChar === "*") {
        inComment = true
        i++
        continue
      } else if (nextChar === "/") {
        inSingleLineComment = true
        i++
        continue
      }
    }
    result += v
  }

  return result
}

function unbox(hexStr: string): string {
  const box = [
    6, 28, 34, 31, 33, 18, 30, 23, 9, 8, 19, 38, 17, 24, 0, 5, 32, 21, 10, 22,
    25, 14, 15, 3, 16, 27, 13, 35, 2, 29, 11, 26, 4, 36, 1, 39, 37, 7, 20, 12,
  ]
  const newBox: string[] = new Array(hexStr.length).fill("")
  for (let i = 0; i < box.length; i++) {
    const targetIdx = box[i]
    if (targetIdx < newBox.length && i < hexStr.length) {
      newBox[targetIdx] = hexStr[i]
    }
  }
  return newBox.join("")
}

function hexXor(hex1: string, hex2: string): string {
  const len = Math.min(hex1.length, hex2.length)
  const byteLen = Math.floor(len / 2)
  let res = ""
  for (let i = 0; i < byteLen; i++) {
    const b1 = parseInt(hex1.slice(i * 2, i * 2 + 2), 16)
    const b2 = parseInt(hex2.slice(i * 2, i * 2 + 2), 16)
    const xor = b1 ^ b2
    res += xor.toString(16).padStart(2, "0")
  }
  return res
}

/**
 * 自动计算阿里云盾 WAF (acw_sc__v2) 挑战响应 Cookie
 */
export function calcAcwScV2(htmlContent: string): string {
  const match = htmlContent.match(findAcwScV2Reg)
  if (!match || match.length < 2) {
    throw new Error("[Lanzou] 无法匹配到 acw_sc__v2 的 arg1 参数")
  }
  const arg1 = match[1]
  const mask = "3000176000856006061501533003690027800375"
  return hexXor(unbox(arg1), mask)
}

function findJSVarFunc(key: string, data: string): string {
  if (key !== "sasign") {
    const match = data.match(
      new RegExp(`var\\s+${key}\\s*=\\s*['"]?(.+?)['"]?;`),
    )
    return match ? match[1] : ""
  } else {
    const matches = Array.from(
      data.matchAll(new RegExp(`var\\s+${key}\\s*=\\s*['"]?(.+?)['"]?;`, "g")),
    )
    if (matches.length === 3) {
      return matches[1][1]
    } else if (matches.length > 0) {
      return matches[0][1]
    }
  }
  return ""
}

function jsonToMap(data: string, html: string): Record<string, string> {
  const param: Record<string, string> = {}
  const matches = data.matchAll(findKVReg)
  for (const kv of matches) {
    const k = kv[1]
    const rawVal = kv[2]
    const v = kv[3]
    if (v === "" || rawVal.includes("'") || /^\d+$/.test(rawVal)) {
      param[k] = v
    } else {
      param[k] = findJSVarFunc(v, html)
    }
  }
  return param
}

/**
 * 解析 HTML 中内嵌的 data: { ... } 对象并解析变量
 */
export function htmlJsonToMap(html: string): Record<string, string> {
  const match = html.match(findDataReg)
  if (!match || match.length < 2) {
    throw new Error("[Lanzou] 未能找到请求参数 data 对象")
  }
  return jsonToMap(match[1], html)
}

/**
 * 查找并提取 HTML 中的指定 JS 函数源码
 */
export function getJSFunctionByName(html: string, name: string): string {
  const fnReg = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, "i")
  const match = html.search(fnReg)
  if (match === -1) {
    throw new Error(`[Lanzou] 未找到函数 ${name}`)
  }

  let count = 0
  let start = -1
  for (let i = match; i < html.length; i++) {
    if (html[i] === "{") {
      if (count === 0) start = i
      count++
    } else if (html[i] === "}") {
      count--
      if (count === 0) {
        return html.slice(match, i + 1)
      }
    }
  }
  return html.slice(match)
}
