/**
 * Generic utility functions for OpenListNext backend.
 */

// Simple range function like Go's range
export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

// InArray checks if an item exists in a list
export function inArray<T>(item: T, list: T[]): boolean {
  return list.includes(item)
}

// MapValues returns the values of a map
export function mapValues<K extends string | number | symbol, V>(
  obj: Record<K, V>,
): V[] {
  return Object.values(obj)
}

// MapKeys returns the keys of a map
export function mapKeys<K extends string | number | symbol, V>(
  obj: Record<K, V>,
): K[] {
  return Object.keys(obj) as K[]
}

// Coalesce returns the first non-null/non-undefined value
export function coalesce<T>(...args: (T | null | undefined)[]): T | undefined {
  for (const arg of args) {
    if (arg !== null && arg !== undefined) {
      return arg
    }
  }
  return undefined
}

// Retry a function
export async function retry<T>(
  fn: () => Promise<T>,
  times: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: any
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (i < times - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}
