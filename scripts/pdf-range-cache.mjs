// Persistent browser cache for previewed documents, deployed next to the PDF.js
// viewer as openlist-cache.mjs and shared with the Office previews.
//
// Bytes are kept in IndexedDB as 64 KiB chunks under a file identity supplied by
// the app (account, path, size, modification time), never under a signed URL.
// Reopening a document therefore reads the chunks it used before from disk
// instead of repeating every Range request through the Worker and the storage.
// Any cache failure falls back to the unchanged network request.
export const CHUNK_SIZE = 65536
const DATABASE = "openlist-document-cache"
const DOCUMENTS = "documents"
const CHUNKS = "chunks"
const MIB = 1024 * 1024
export const DEFAULT_LIMITS = {
  // Least recently used documents are dropped beyond these totals.
  maxBytes: 256 * MIB,
  maxDocuments: 200,
  maxAge: 30 * 24 * 3600 * 1000,
  // One document may use at most this much; reads beyond it stay uncached.
  maxDocumentBytes: 128 * MIB,
}

const done = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
const finished = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error || new Error("Document cache write failed"))
  })
const span = (scope, key, first = 0, last = Number.MAX_SAFE_INTEGER) =>
  scope.IDBKeyRange.bound([key, first], [key, last])

export function createDocumentCache(scope = globalThis, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options.limits }
  const now = options.now || Date.now
  let database
  const open = () =>
    (database ??= new Promise((resolve, reject) => {
      const request = scope.indexedDB.open(DATABASE, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DOCUMENTS, { keyPath: "key" })
        request.result.createObjectStore(CHUNKS)
      }
      request.onsuccess = () => {
        const db = request.result
        // Logging out in another tab deletes the database; reopen on next use.
        db.onversionchange = db.onclose = () => {
          db.close()
          database = undefined
        }
        resolve(db)
      }
      request.onerror = request.onblocked = () =>
        reject(request.error || new Error("Document cache is unavailable"))
    }).catch((error) => {
      database = undefined
      throw error
    }))

  async function remove(key) {
    const transaction = (await open()).transaction(
      [DOCUMENTS, CHUNKS],
      "readwrite",
    )
    transaction.objectStore(DOCUMENTS).delete(key)
    transaction.objectStore(CHUNKS).delete(span(scope, key))
    await finished(transaction)
  }

  /** The stored record for this exact file and how many chunks it holds. */
  async function lookup(key, length) {
    const transaction = (await open()).transaction(
      [DOCUMENTS, CHUNKS],
      "readonly",
    )
    const [record, count] = await Promise.all([
      done(transaction.objectStore(DOCUMENTS).get(key)),
      done(transaction.objectStore(CHUNKS).count(span(scope, key))),
    ])
    if (record && record.length === length) return { record, count }
    if (record || count) await remove(key)
    return { record: null, count: 0 }
  }

  async function save(record) {
    const transaction = (await open()).transaction(DOCUMENTS, "readwrite")
    transaction.objectStore(DOCUMENTS).put({ ...record, used: now() })
    await finished(transaction)
  }

  /** Chunks first..last in order, or null unless every one is present. */
  async function read(key, first, last) {
    const transaction = (await open()).transaction(CHUNKS, "readonly")
    const parts = await done(
      transaction.objectStore(CHUNKS).getAll(span(scope, key, first, last)),
    )
    return parts.length === last - first + 1 ? parts : null
  }

  async function write(key, entries) {
    const transaction = (await open()).transaction(CHUNKS, "readwrite")
    const store = transaction.objectStore(CHUNKS)
    for (const [index, buffer] of entries) store.put(buffer, [key, index])
    await finished(transaction)
  }

  /** Drop expired documents, then the least recently used beyond the limits. */
  async function prune() {
    const transaction = (await open()).transaction(
      [DOCUMENTS, CHUNKS],
      "readonly",
    )
    const records = await done(transaction.objectStore(DOCUMENTS).getAll())
    const counts = await Promise.all(
      records.map((record) =>
        done(transaction.objectStore(CHUNKS).count(span(scope, record.key))),
      ),
    )
    const newest = records
      .map((record, index) => ({ record, bytes: counts[index] * CHUNK_SIZE }))
      .sort((a, b) => (b.record.used || 0) - (a.record.used || 0))
    let bytes = 0
    const removed = []
    for (const [position, { record, bytes: size }] of newest.entries()) {
      bytes += size
      if (
        position >= limits.maxDocuments ||
        bytes > limits.maxBytes ||
        now() - (record.used || 0) > limits.maxAge
      ) {
        bytes -= size
        removed.push(record.key)
      }
    }
    for (const key of removed) await remove(key)
    return removed
  }

  async function clear() {
    const transaction = (await open()).transaction(
      [DOCUMENTS, CHUNKS],
      "readwrite",
    )
    transaction.objectStore(DOCUMENTS).clear()
    transaction.objectStore(CHUNKS).clear()
    await finished(transaction)
  }

  /** A complete cached file as a Blob, or null. Marks the file as used. */
  async function readDocument(key, length) {
    const total = Math.ceil(length / CHUNK_SIZE)
    const { record, count } = await lookup(key, length)
    if (!record || !total || count !== total) return null
    const parts = await read(key, 0, total - 1)
    if (!parts) return null
    await save(record)
    return new Blob(parts)
  }

  /** Store a complete file; refused unless it matches the listed size. */
  async function storeDocument(key, length, blob) {
    if (!length || blob.size !== length || length > limits.maxDocumentBytes)
      return false
    const bytes = await blob.arrayBuffer()
    await remove(key)
    await save({ key, length })
    const entries = []
    for (let offset = 0; offset < length; offset += CHUNK_SIZE)
      entries.push([
        offset / CHUNK_SIZE,
        bytes.slice(offset, Math.min(offset + CHUNK_SIZE, length)),
      ])
    for (let index = 0; index < entries.length; index += 64)
      await write(key, entries.slice(index, index + 64))
    await prune()
    return true
  }

  return {
    limits,
    lookup,
    save,
    read,
    write,
    remove,
    prune,
    clear,
    readDocument,
    storeDocument,
  }
}

const originOf = (url) => {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}
const validators = (headers) => ({
  etag: (headers.get("ETag") || "").replace(/^W\//, ""),
  modified: headers.get("Last-Modified") || "",
})
const changed = (record, headers) => {
  const next = validators(headers)
  return (
    (!!record.etag && !!next.etag && record.etag !== next.etag) ||
    (!!record.modified && !!next.modified && record.modified !== next.modified)
  )
}

/**
 * One opened PDF. `fetch` stands in for PDF.js's document request: cached
 * ranges are answered locally, everything else is requested unchanged and
 * recorded while PDF.js reads it.
 */
export function createPdfSession(cache, { url, key, length, onStale }) {
  const total = Math.ceil(length / CHUNK_SIZE)
  const state = {
    enabled: true,
    record: null,
    count: 0,
    origin: undefined,
    // True once cached bytes reached PDF.js; a later mismatch needs a reload.
    served: false,
  }
  let queue = Promise.resolve()
  const enqueue = (work) =>
    (queue = queue.then(work).catch(() => {
      state.enabled = false
    }))
  const ready = cache.lookup(key, length).then(
    ({ record, count }) => {
      state.record = record
      state.count = count
      if (record) enqueue(() => cache.save(record))
      enqueue(() => cache.prune())
    },
    () => {
      state.enabled = false
    },
  )

  async function invalidate() {
    state.enabled = false
    await queue
    await cache.remove(key).catch(() => {})
    if (state.served) onStale?.()
  }

  function synthetic(status, headers, body) {
    const response = new Response(body, { status, headers })
    Object.defineProperty(response, "url", {
      value: state.origin === null ? "" : `${state.origin}/`,
    })
    return response
  }

  // PDF.js hands `chunk.buffer` to its worker, so every chunk must own its
  // whole buffer and recorded bytes must be copied before they are passed on.
  function recorded(response, offset, whole = false) {
    let position = offset,
      buffer = null,
      fill = 0,
      index = 0,
      stopped = false
    const copy = (bytes) => {
      const entries = []
      let at = 0
      while (!stopped && at < bytes.length && position < length) {
        if (!buffer) {
          const within = position % CHUNK_SIZE
          if (within) {
            const skip = Math.min(CHUNK_SIZE - within, bytes.length - at)
            position += skip
            at += skip
            continue
          }
          index = position / CHUNK_SIZE
          buffer = new Uint8Array(Math.min(CHUNK_SIZE, length - position))
          fill = 0
        }
        const take = Math.min(buffer.length - fill, bytes.length - at)
        buffer.set(bytes.subarray(at, at + take), fill)
        fill += take
        at += take
        position += take
        if (fill === buffer.length) {
          entries.push([index, buffer.buffer])
          buffer = null
        }
      }
      position += bytes.length - at
      if (!entries.length) return
      state.count += entries.length
      enqueue(() => cache.write(key, entries))
    }
    let body
    try {
      body = response.body.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            if (
              !state.enabled ||
              state.count * CHUNK_SIZE >= cache.limits.maxDocumentBytes
            )
              stopped = true
            copy(chunk)
            controller.enqueue(chunk)
          },
          flush() {
            // A complete body of another size is not the listed file.
            if (whole && position !== length) invalidate()
          },
        }),
      )
    } catch {
      return response
    }
    const copyOf = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
    Object.defineProperty(copyOf, "url", { value: response.url })
    return copyOf
  }

  function cachedBody() {
    let index = 0
    // Nothing is read from disk unless PDF.js actually consumes this body.
    return new ReadableStream(
      {
        async pull(controller) {
          if (index >= total) return controller.close()
          const last = Math.min(index + 15, total - 1)
          const parts = await cache.read(key, index, last).catch(() => null)
          if (!parts)
            return controller.error(new Error("Cached PDF data is unavailable"))
          for (const part of parts) controller.enqueue(new Uint8Array(part))
          index = last + 1
        },
      },
      { highWaterMark: 0 },
    )
  }

  async function initial(request) {
    const record = state.record
    // PDF.js cancels this body once it sees Range support, and reads it all
    // otherwise. Skip the request only if the cache can satisfy either path.
    if (
      record &&
      typeof record.origin === "string" &&
      (record.ranged || state.count === total)
    ) {
      state.origin = record.origin
      state.served = true
      const headers = {
        "Content-Type": "application/pdf",
        "Content-Length": String(length),
        "Accept-Ranges": "bytes",
      }
      if (record.disposition)
        headers["Content-Disposition"] = record.disposition
      return synthetic(200, headers, cachedBody())
    }
    const response = await request()
    state.origin = originOf(response.url)
    if (!state.enabled || response.status !== 200 || !response.body)
      return response
    const size = Number(response.headers.get("Content-Length"))
    const encoded = response.headers.get("Content-Encoding") || "identity"
    if (encoded === "identity" && Number.isInteger(size) && size !== length) {
      await invalidate()
      return response
    }
    const fresh = !record || changed(record, response.headers)
    if (record && fresh) {
      await queue
      await cache.remove(key).catch(() => {})
      state.count = 0
    }
    state.record = {
      key,
      length,
      origin: state.origin,
      ...validators(response.headers),
      disposition: response.headers.get("Content-Disposition") || "",
      ranged: !fresh && !!record.ranged,
    }
    const saved = state.record
    enqueue(() => cache.save(saved))
    return recorded(response, 0, true)
  }

  async function ranged(range, request) {
    const begin = Number(range[1])
    const end = Math.min(Number(range[2]), length - 1)
    if (begin > end || state.origin === undefined || !state.record)
      return request()
    const first = Math.floor(begin / CHUNK_SIZE)
    const last = Math.floor(end / CHUNK_SIZE)
    const parts = await cache.read(key, first, last).catch(() => null)
    if (parts && state.enabled) {
      state.served = true
      const body = parts.map((part, index) => {
        const from = index ? 0 : begin - first * CHUNK_SIZE
        const to =
          index === parts.length - 1 ? end - last * CHUNK_SIZE + 1 : undefined
        return new Uint8Array(
          from || (to !== undefined && to !== part.byteLength)
            ? part.slice(from, to)
            : part,
        )
      })
      return synthetic(
        206,
        {
          "Content-Type": "application/pdf",
          "Content-Length": String(end - begin + 1),
          "Content-Range": `bytes ${begin}-${end}/${length}`,
          "Accept-Ranges": "bytes",
        },
        new ReadableStream({
          start(controller) {
            for (const part of body) controller.enqueue(part)
            controller.close()
          },
        }),
      )
    }
    const response = await request()
    if (!state.enabled) return response
    if (originOf(response.url) !== state.origin) {
      // PDF.js rejects the mismatch itself; forget what the cache assumed.
      await invalidate()
      return response
    }
    if (response.status !== 206 || !response.body) return response
    const content = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
      response.headers.get("Content-Range") || "",
    )
    if (!content) return response
    if (
      Number(content[3]) !== length ||
      changed(state.record, response.headers)
    ) {
      await invalidate()
      return response
    }
    if (Number(content[1]) !== begin) return response
    if (!state.record.ranged) {
      state.record = { ...state.record, ranged: true }
      const saved = state.record
      enqueue(() => cache.save(saved))
    }
    return recorded(response, begin)
  }

  return {
    url,
    /** Resolves when everything read so far has been written. */
    idle: () => ready.then(() => queue),
    async fetch(headers, request) {
      await ready
      if (!state.enabled) return request()
      const header = headers.get("Range")
      if (!header) return initial(request)
      const range = /^bytes=(\d+)-(\d+)$/.exec(header)
      return range ? ranged(range, request) : request()
    },
  }
}

/** Route the viewer's document requests through the cache once one is opened. */
export function installPdfRangeCache(scope, { onStale } = {}) {
  let cache, session
  scope.openListPdfFetch = (url, headers, request) =>
    session && String(url) === session.url
      ? session.fetch(headers, request)
      : request()
  return {
    begin(url, identity) {
      session = undefined
      if (
        !scope.indexedDB ||
        typeof identity?.key !== "string" ||
        !identity.key ||
        identity.key.length > 4096 ||
        !Number.isSafeInteger(identity.size) ||
        identity.size <= 0
      )
        return false
      try {
        cache ??= createDocumentCache(scope)
        session = createPdfSession(cache, {
          url,
          key: identity.key,
          length: identity.size,
          onStale,
        })
      } catch {
        session = undefined
      }
      return !!session
    },
    idle: () => session?.idle() ?? Promise.resolve(),
  }
}

let shared
const sharedCache = () => (shared ??= createDocumentCache(globalThis))
/** Whole-file helpers for previews that download a document in one request. */
export const readDocument = (key, length) =>
  sharedCache().readDocument(key, length)
export const storeDocument = (key, length, blob) =>
  sharedCache().storeDocument(key, length, blob)
export const clearDocuments = () => sharedCache().clear()
