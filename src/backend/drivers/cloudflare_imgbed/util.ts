// cloudflare_imgbed HTTP client
import { CFImgBedApiError } from "./types"

export function encodePath(p: string): string {
  return p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/")
}

function getNumber(m: Record<string, any> | undefined, keys: string[]): number {
  if (!m) return 0
  for (const k of keys) {
    const v = m[k]
    if (v !== undefined && v !== null) {
      const n = Number(v)
      if (!isNaN(n)) return n
    }
  }
  return 0
}

export function parseMetadataSize(m: Record<string, any> | undefined): number {
  return getNumber(m, ["FileSizeBytes", "File-Size", "fileSize", "size"])
}

export function parseMetadataTimestamp(
  m: Record<string, any> | undefined,
): number {
  return getNumber(m, ["TimeStamp", "timestamp", "modified"])
}

export class CFImgBedClient {
  constructor(
    private address: string,
    private token: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      Authorization: "Bearer " + this.token,
      Accept: "application/json",
    }
  }

  async request<T>(
    method: string,
    urlPath: string,
    body?: any,
  ): Promise<T> {
    const maxRetries = 3
    let lastErr: Error | null = null
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(this.address + urlPath, {
          method,
          headers: {
            ...this.headers(),
            ...(body && !(body instanceof FormData)
              ? { "Content-Type": "application/json" }
              : {}),
          },
          body: body
            ? body instanceof FormData
              ? body
              : JSON.stringify(body)
            : undefined,
        })

        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, (i + 1) * 2000))
          continue
        }

        const text = await res.text()
        let json: any = {}
        try {
          json = text ? JSON.parse(text) : {}
        } catch {
          json = {}
        }

        const apiErr = json as CFImgBedApiError
        if (apiErr.error || apiErr.message) {
          throw new Error("API error: " + (apiErr.error || apiErr.message))
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return json as T
      } catch (e: any) {
        lastErr = e
        if (i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, (i + 1) * 1000))
          continue
        }
      }
    }
    throw lastErr || new Error("max retries exceeded")
  }

  async list(dir: string, start: number, count: number) {
    return this.request<{
      files: any[]
      directories: string[]
    }>(
      "GET",
      `/api/manage/list?dir=${encodeURIComponent(dir)}&start=${start}&count=${count}`,
    )
  }

  async remove(path: string, folder: boolean) {
    return this.request(
      "POST",
      `/api/manage/delete${encodePath(path)}?folder=${folder}`,
    )
  }
}
