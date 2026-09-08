// Bunny Storage helpers: URL building, object path normalization, CDN token signing
import { BunnyAddition, BunnyApiError } from "./types"

export const bunnyDefaultEndpoint = "storage.bunnycdn.com"
export const bunnyDefaultPlaceholder = ".openlist"

export function normalizeBaseURL(raw: string, fallback: string): string {
  let s = (raw || "").trim()
  if (!s) s = fallback
  if (!s) throw new Error("empty url")
  if (!s.includes("://")) s = "https://" + s
  const u = new URL(s)
  if (!u.host) throw new Error("invalid url: " + raw)
  u.pathname = u.pathname.replace(/\/+$/, "")
  return u.toString()
}

export function cleanObjectPath(path: string): string {
  if (!path) return "/"
  return "/" + path.replace(/^\/+/, "").split("/").filter(Boolean).join("/")
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

async function sha256Bytes(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data))
}

async function hmacSha256Bytes(key: string, data: string): Promise<ArrayBuffer> {
  const keyMat = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  return crypto.subtle.sign("HMAC", keyMat, new TextEncoder().encode(data))
}

function canonicalQuery(params: URLSearchParams): string {
  const keys = Array.from(params.keys())
    .filter((k) => k !== "token" && k !== "expires")
    .sort()
  return keys.map((k) => `${k}=${params.get(k) || ""}`).join("&")
}

export function storageURL(
  addition: BunnyAddition,
  path: string,
  dir: boolean,
): string {
  const endpoint = normalizeBaseURL(
    addition.endpoint,
    bunnyDefaultEndpoint,
  )
  const u = new URL(endpoint)
  const clean = cleanObjectPath(path)
  const zone = (addition.storage_zone_name || "").replace(/^\/+|\/+$/g, "")
  if (clean === "/") {
    u.pathname = `/${zone}/`
  } else {
    u.pathname = `/${zone}/${clean.replace(/^\/+/, "")}`
    if (dir && !u.pathname.endsWith("/")) u.pathname += "/"
  }
  return u.toString()
}

export function cdnURL(addition: BunnyAddition, path: string): string {
  const u = new URL(addition.cdn_base_url)
  const clean = cleanObjectPath(path)
  const basePath = u.pathname.replace(/\/+$/, "")
  if (clean === "/") {
    u.pathname = basePath ? basePath + "/" : "/"
  } else {
    u.pathname = basePath + "/" + clean.replace(/^\/+/, "")
  }
  return u.toString()
}

export async function signCDNURL(
  addition: BunnyAddition,
  rawURL: string,
): Promise<string> {
  const hours = addition.sign_url_expire > 0 ? addition.sign_url_expire : 4
  const expires = Math.floor(Date.now() / 1000) + hours * 3600

  const u = new URL(rawURL)
  const params = canonicalQuery(u.searchParams)
  const signaturePath = decodeURIComponent(u.pathname)
  const method = (addition.cdn_token_method || "sha256").toLowerCase()

  let token: string
  if (method === "hmac_sha256") {
    const mac = await hmacSha256Bytes(
      addition.cdn_token_key,
      signaturePath + String(expires) + params,
    )
    token = "HS256-" + b64url(mac)
  } else {
    const sum = await sha256Bytes(
      addition.cdn_token_key +
        signaturePath +
        String(expires) +
        params,
    )
    token = b64url(sum)
  }

  u.searchParams.set("token", token)
  u.searchParams.set("expires", String(expires))
  return u.toString()
}

export async function handleBunnyError(res: Response): Promise<void> {
  if (res.ok) return
  const text = (await res.text().catch(() => "")) || ""
  let message = text.trim()
  try {
    const arr = JSON.parse(text) as BunnyApiError[]
    if (arr?.length && arr[0].Message) message = arr[0].Message
  } catch {
    // ignore
  }
  throw new Error(`bunny storage request failed: ${res.status} ${message}`)
}
