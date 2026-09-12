/**
 * KV 键名编码。
 *
 * EdgeOne KV 的键名约束：**只能包含字母、数字和下划线**（[A-Za-z0-9_]）。
 * Cloudflare KV 允许更宽的字符集，但为兼容两者，统一按最严格约束编码。
 *
 * 键名形如 `<table>_<primaryKey>`：
 *   users_1
 *   settings_site_title                        ← 下划线原样保留
 *   users_550e8400x2de29b...                   ← UUID 的 '-' 转义
 *
 * 编码规则（尽量保留可读性，只在必要时转义）：
 *   - [A-Za-z0-9_] 原样保留（下划线合法，无需转义）
 *   - 其他字符按 UTF-8 逐字节转义为 `xHH`
 *
 * 关于 `x` 的歧义：`x` 属于保留字符集会被原样保留，因此形如 `ax2d` 的
 * 原始内容与「a + 转义 '-'」无法区分。这不影响正确性 —— 键名仅作为
 * 存储地址，实体的主键值一律取自记录 JSON，从不需要从键名反解。
 * `decodeKeyPart` 仅用于排查问题时人工阅读。
 */

/** 键名分隔符 */
const KEY_SEP = "_"

/**
 * 判断字符是否属于 KV 合法字符集（且无需转义）。
 */
function isPlain(ch: string): boolean {
  return (
    (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    (ch >= "0" && ch <= "9") ||
    ch === "_"
  )
}

/**
 * 将任意字符串编码为 KV 合法的键片段。
 *
 * 按 Unicode 码点遍历，避免拆散代理对（emoji）；多字节字符整体交给
 * TextEncoder 处理。空字符串映射为 `0`，否则会产生形如 `users_` 的键名，
 * 与表前缀无法区分。
 *
 * 导出供单元测试验证「编码结果合法 且 decodeKeyPart 可逆」。
 */
export function encodeKeyPart(input: string): string {
  const s = String(input ?? "")
  if (s === "") return "0"
  if (/^[A-Za-z0-9_]+$/.test(s)) return s // 快路径：完全合法则原样返回

  let out = ""
  for (const ch of s) {
    if (isPlain(ch)) {
      out += ch
    } else {
      for (const b of new TextEncoder().encode(ch)) {
        out += "x" + b.toString(16).padStart(2, "0")
      }
    }
  }
  return out
}

/**
 * 解码键片段（仅用于排查问题与数据迁移，不参与正常读写路径）。
 */
export function decodeKeyPart(input: string): string {
  const s = String(input ?? "")
  let out = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch !== "x" || !/^[0-9a-fA-F]{2}$/.test(s.slice(i + 1, i + 3))) {
      out += ch
      continue
    }
    // 收集连续的 xHH 字节后统一按 UTF-8 解码（多字节字符会产生多组）
    const bytes: number[] = []
    let j = i
    while (s[j] === "x" && /^[0-9a-fA-F]{2}$/.test(s.slice(j + 1, j + 3))) {
      bytes.push(parseInt(s.slice(j + 1, j + 3), 16))
      j += 3
    }
    try {
      out += new TextDecoder().decode(new Uint8Array(bytes))
    } catch {
      for (const b of bytes) out += String.fromCharCode(b)
    }
    i = j - 1
  }
  return out
}

/** 构造某张表的键名前缀，如 `users_` */
export function tableKeyPrefix(table: string): string {
  return `${encodeKeyPart(table)}${KEY_SEP}`
}

/** 构造实体完整键名，如 `users_1` */
export function entityKeyOf(table: string, id: string): string {
  return `${tableKeyPrefix(table)}${encodeKeyPart(id)}`
}
