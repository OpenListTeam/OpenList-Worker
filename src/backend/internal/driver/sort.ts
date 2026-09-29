// Shared file sorting for drivers that honor order_by / order_direction
import { FileItem } from "./base"

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
      // default: name / filename / folder
      cmp = String(a.name).localeCompare(String(b.name))
    }
    return asc ? cmp : -cmp
  })
  return sorted
}
