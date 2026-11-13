// Shared file sorting for drivers that honor order_by / order_direction
import { FileItem } from "./base"

// Natural (human / "logical") comparison of two file names.
//
// Port of `github.com/maruel/natural.Compare`, which is what the official Go
// OpenList uses for `order_by='name'` (model.SortFiles, internal/model/obj.go).
//
// Numbers embedded in a name compare numerically, so `"file1"`, `"file2"`,
// `"file10"` sort in the order a human expects instead of the character order
// produced by a plain string comparison (`localeCompare` / `<`), which puts
// `"file10"` *before* `"file2"` -- the exact complaint in issue #167.
//
// Side effects to be aware of:
//   • it is *case sensitive* (e.g. "A" < "a"), exactly like `strings.Compare`
//   • semantically equal digits ("00" == "0", "01" == "1") compare lexically,
//     unless both have trailing data (then the digits are stripped and the
//     comparison continues, e.g. "file01a" < "file02b")
//   • a name that runs out of characters sorts first (shorter wins)
//   • strings containing astral characters (emoji) compare on UTF-16 code
//     units instead of UTF-8 bytes -- the difference is never visible for
//     normal (BMP) file names, so it is kept cheap.
export function compareNames(a: string, b: string): number {
  let A = String(a)
  let B = String(b)

  while (true) {
    // Common prefix, stopping at the first digit on either side, or at the
    // first difference between non-digit characters.
    let p = 0
    const m = Math.min(A.length, B.length)
    for (let i = 0; i < m; i++) {
      const ca = A.charCodeAt(i)
      const cb = B.charCodeAt(i)
      if (isDigit(ca) || isDigit(cb) || ca !== cb) {
        p = i
        break
      }
    }
    A = A.slice(p)
    B = B.slice(p)

    if (A.length === 0) return B.length > 0 ? -1 : 0
    if (B.length === 0) return A.length > 0 ? 1 : 0

    const ia = leadingDigits(A)
    const ib = leadingDigits(B)
    if (ia > 0 && ib > 0) {
      // Both sides start with a digit run: compare them numerically.
      const aNum = trimLeadingZeros(A.slice(0, ia))
      const bNum = trimLeadingZeros(B.slice(0, ib))
      if (aNum.length !== bNum.length) return aNum.length - bNum.length
      if (aNum !== bNum) return aNum < bNum ? -1 : 1

      // Semantically the same digits (e.g. "00" == "0", "01" == "1"): only
      // continue processing if there is trailing data on both sides,
      // otherwise fall back to a lexical comparison of the digit runs.
      if (ia !== A.length && ib !== B.length) {
        A = A.slice(ia)
        B = B.slice(ib)
        continue
      }
      return lexicalCompare(A, B)
    }

    // (Only) one side is numeric now, or both are non-numeric: the plain
    // comparison of what remains decides the order.
    return lexicalCompare(A, B)
  }
}

function isDigit(ch: number): boolean {
  return ch >= 48 && ch <= 57 // '0' - '9'
}

/** Count of leading digit characters. */
function leadingDigits(s: string): number {
  for (let i = 0; i < s.length; i++) {
    if (!isDigit(s.charCodeAt(i))) return i
  }
  return s.length
}

/** Strip leading zeros. All zeros collapse to the final zero. */
function trimLeadingZeros(s: string): string {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "0") return s.slice(i)
  }
  return s.length > 0 ? s.slice(s.length - 1) : s
}

function lexicalCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Sort FileItems according to the driver's order settings.
 * Folders always come first (AList convention); files are then ordered by
 * name / modified time / size per order_by, in asc or desc direction.
 */
export function sortFileItems(
  items: FileItem[],
  orderBy?: string,
  orderDirection?: string,
): FileItem[] {
  const asc = orderDirection !== "desc"
  const key = String(orderBy || "name").toLowerCase()
  const sorted = [...items]
  sorted.sort((a, b) => {
    // Folders first
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1

    let cmp: number
    if (key.includes("size")) {
      cmp = (a.size || 0) - (b.size || 0)
    } else if (
      key.includes("time") ||
      key.includes("modified") ||
      key.includes("created")
    ) {
      cmp = new Date(a.modified).getTime() - new Date(b.modified).getTime()
    } else {
      // default: name / filename / folder -- natural sort, exactly like official
      cmp = compareNames(a.name, b.name)
    }
    return asc ? cmp : -cmp
  })
  return sorted
}
