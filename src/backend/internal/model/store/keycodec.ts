/**
 * KV 键名编解码工具。
 *
 * EdgeOne KV 的键名约束：**只能包含字母、数字和下划线**（[A-Za-z0-9_]），
 * 而 Cloudflare KV 允许更宽的字符集。为兼容两者，统一按最严格约束编码。
 *
 * 编码规则：
 *   - [A-Za-z0-9] 原样保留
 *   - `_` 转义为 `xx`（保证编码可逆、无歧义）
 *   - 其余字符按 UTF-8 逐字节转义为 `xHH`
 *
 * 无需反向解析：所有读写都是"构造键名"，实体主键值一律取自记录 JSON，
 * 键名仅作为存储地址。编码保持可逆是为了排查问题时能定位实体。
 */

/** 分隔符：EdgeOne KV 不允许 `:`，故使用 `_` */
export const KEY_SEP = "_"

/** 分表键的统一前缀 */
export const KEY_PREFIX = `openlist_tbl${KEY_SEP}`

/**
 * 将任意字符串规范化为 KV 合法的键片段。
 *
 * 使用 for...of 按 Unicode 码点遍历，避免拆散代理对（如 emoji）；
 * 多字节字符整体交给 TextEncoder 处理。
 *
 * 空字符串映射为 "0"（合法且非空），否则会产生形如
 * `openlist_tbl_users_` 的键名，语义上与表前缀无法区分。
 */
export function encodeKeyPart(input: string): string {
  const s = String(input ?? "")
  if (s === "") return "0"

  let out = ""
  for (const ch of s) {
    if (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      (ch >= "0" && ch <= "9")
    ) {
      out += ch
    } else if (ch === "_") {
      out += "xx"
    } else {
      // 按 UTF-8 逐字节转义：码点级遍历保证多字节字符不被拆开
      for (const b of new TextEncoder().encode(ch)) {
        out += "x" + b.toString(16).padStart(2, "0")
      }
    }
  }
  return out
}

/**
 * 反向解析键片段（仅用于排查与迁移，不影响正常读写路径）。
 */
export function decodeKeyPart(input: string): string {
  const s = String(input ?? "")
  let out = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch !== "x") {
      out += ch
      continue
    }
    // `xx` -> `_`
    if (s[i + 1] === "x") {
      out += "_"
      i += 1
      continue
    }
    // `xHH` -> 原始字节
    const hex = s.slice(i + 1, i + 3)
    if (/^[0-9a-fA-F]{2}$/.test(hex)) {
      const byte = parseInt(hex, 16)
      // 尝试按 UTF-8 还原多字节字符
      if (byte < 0x80) {
        out += String.fromCharCode(byte)
        i += 2
      } else {
        // 多字节：收集连续的 xHH 字节后统一解码
        const bytes: number[] = [byte]
        let j = i + 3
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
    } else {
      out += ch
    }
  }
  return out
}

/** 构造某张表的键名前缀 */
export function tableKeyPrefix(table: string): string {
  return `${KEY_PREFIX}${encodeKeyPart(table)}${KEY_SEP}`
}

/** 构造实体完整键名 */
export function entityKeyOf(table: string, id: string): string {
  return `${tableKeyPrefix(table)}${encodeKeyPart(id)}`
}
