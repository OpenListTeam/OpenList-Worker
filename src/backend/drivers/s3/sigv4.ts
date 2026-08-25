const encoder = new TextEncoder()

function toBytes(data: string | Uint8Array): Uint8Array {
  if (typeof data === "string") return encoder.encode(data)
  return data
}

function hexEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0")
  }
  return hex
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = toBytes(data)
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.buffer as ArrayBuffer,
  )
  return hexEncode(digest)
}

export async function hmacSha256Raw(
  key: string | Uint8Array,
  data: string | Uint8Array,
): Promise<Uint8Array> {
  const keyBytes = toBytes(key)
  const dataBytes = toBytes(data)
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    dataBytes.buffer as ArrayBuffer,
  )
  return new Uint8Array(sig)
}

export async function hmacSha256Hex(
  key: string | Uint8Array,
  data: string | Uint8Array,
): Promise<string> {
  const raw = await hmacSha256Raw(key, data)
  return hexEncode(raw)
}

export function rfc3986UriEncode(str: string, encodeSlash = true): string {
  let result = encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  )
  if (!encodeSlash) {
    result = result.replace(/%2F/g, "/")
  }
  return result
}

export function formatAmzDates(date: Date = new Date()): {
  amzDate: string
  dateStamp: string
} {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())

  const dateStamp = `${year}${month}${day}`
  const amzDate = `${dateStamp}T${hours}${minutes}${seconds}Z`
  return { amzDate, dateStamp }
}

export async function getSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string = "s3",
): Promise<Uint8Array> {
  const kSecret = "AWS4" + secretAccessKey
  const kDate = await hmacSha256Raw(kSecret, dateStamp)
  const kRegion = await hmacSha256Raw(kDate, region)
  const kService = await hmacSha256Raw(kRegion, service)
  const kSigning = await hmacSha256Raw(kService, "aws4_request")
  return kSigning
}

export interface SignRequestOptions {
  method: string
  url: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  headers?: Record<string, string>
  body?: string | Uint8Array | null
  service?: string
  date?: Date
}

export async function signS3Headers(
  opts: SignRequestOptions,
): Promise<{ headers: Record<string, string>; url: string }> {
  const {
    method,
    url: rawUrl,
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    headers = {},
    body = null,
    service = "s3",
    date = new Date(),
  } = opts

  const parsedUrl = new URL(rawUrl)
  const { amzDate, dateStamp } = formatAmzDates(date)

  const payloadHash =
    body !== null && body !== undefined
      ? await sha256Hex(body)
      : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

  const finalHeaders: Record<string, string> = { ...headers }
  finalHeaders["host"] = parsedUrl.host
  finalHeaders["x-amz-date"] = amzDate
  finalHeaders["x-amz-content-sha256"] = payloadHash
  if (sessionToken) {
    finalHeaders["x-amz-security-token"] = sessionToken
  }

  const sortedHeaderKeys = Object.keys(finalHeaders)
    .map((k) => k.toLowerCase())
    .sort()

  let canonicalHeaders = ""
  for (const k of sortedHeaderKeys) {
    const rawVal = Object.entries(finalHeaders).find(
      ([origKey]) => origKey.toLowerCase() === k,
    )?.[1]
    const val = (rawVal || "").trim().replace(/\s+/g, " ")
    canonicalHeaders += `${k}:${val}\n`
  }

  const signedHeaders = sortedHeaderKeys.join(";")

  const pathname = parsedUrl.pathname || "/"
  // parsedUrl.pathname is already percent-encoded; decode first so we don't
  // double-encode non-ASCII chars (e.g. Chinese filenames) in the signature.
  const canonicalUri = rfc3986UriEncode(decodeURIComponent(pathname), false)

  const queryParams: [string, string][] = []
  parsedUrl.searchParams.forEach((val, key) => {
    queryParams.push([key, val])
  })
  queryParams.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const canonicalQueryString = queryParams
    .map(([k, v]) => `${rfc3986UriEncode(k)}=${rfc3986UriEncode(v)}`)
    .join("&")

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const canonicalRequestHash = await sha256Hex(canonicalRequest)

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n")

  const signingKey = await getSigningKey(
    secretAccessKey,
    dateStamp,
    region,
    service,
  )
  const signature = await hmacSha256Hex(signingKey, stringToSign)

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  finalHeaders["authorization"] = authorizationHeader

  return {
    headers: finalHeaders,
    url: parsedUrl.toString(),
  }
}

export interface PresignUrlOptions {
  method?: string
  url: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  expiresInSeconds?: number
  service?: string
  date?: Date
  customQueryParams?: Record<string, string>
}

export async function presignS3Url(opts: PresignUrlOptions): Promise<string> {
  const {
    method = "GET",
    url: rawUrl,
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    expiresInSeconds = 14400,
    service = "s3",
    date = new Date(),
    customQueryParams = {},
  } = opts

  const parsedUrl = new URL(rawUrl)
  const { amzDate, dateStamp } = formatAmzDates(date)
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

  parsedUrl.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
  parsedUrl.searchParams.set(
    "X-Amz-Credential",
    `${accessKeyId}/${credentialScope}`,
  )
  parsedUrl.searchParams.set("X-Amz-Date", amzDate)
  parsedUrl.searchParams.set("X-Amz-Expires", expiresInSeconds.toString())
  parsedUrl.searchParams.set("X-Amz-SignedHeaders", "host")

  if (sessionToken) {
    parsedUrl.searchParams.set("X-Amz-Security-Token", sessionToken)
  }

  for (const [k, v] of Object.entries(customQueryParams)) {
    parsedUrl.searchParams.set(k, v)
  }

  const pathname = parsedUrl.pathname || "/"
  // Decode first to avoid double-encoding non-ASCII chars in the signature.
  const canonicalUri = rfc3986UriEncode(decodeURIComponent(pathname), false)

  const queryParams: [string, string][] = []
  parsedUrl.searchParams.forEach((val, key) => {
    if (key.toLowerCase() !== "x-amz-signature") {
      queryParams.push([key, val])
    }
  })
  queryParams.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const canonicalQueryString = queryParams
    .map(([k, v]) => `${rfc3986UriEncode(k)}=${rfc3986UriEncode(v)}`)
    .join("&")

  const canonicalHeaders = `host:${parsedUrl.host}\n`
  const signedHeaders = "host"
  const payloadHash = "UNSIGNED-PAYLOAD"

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const canonicalRequestHash = await sha256Hex(canonicalRequest)
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n")

  const signingKey = await getSigningKey(
    secretAccessKey,
    dateStamp,
    region,
    service,
  )
  const signature = await hmacSha256Hex(signingKey, stringToSign)

  parsedUrl.searchParams.set("X-Amz-Signature", signature)
  return parsedUrl.toString()
}
