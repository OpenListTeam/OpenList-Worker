import assert from "node:assert/strict"
import { test } from "node:test"
import {
  R2Driver,
  normalizeR2Addition,
  r2CanSignDirectUpload,
  resolveR2Bucket,
} from "./driver"
import { R2BucketLike, R2ObjectLike } from "./types"
import {
  __resetDbCacheForTest as resetEnv,
  setEnvCtx,
} from "../../internal/model/db"
import { getDriver } from "../../internal/op/storage"
import { normalizeDriver } from "../../server/admin"

/**
 * R2 binding 模式的端到端驱动测试（内存版 R2Bucket）。
 *
 * 覆盖要点：
 *   1. 绑定解析：env / 请求级 env 上下文 / globalThis 三处探测
 *   2. 列目录：delimiter 产生的目录 + 对象（含占位对象过滤、翻页 cursor）
 *   3. 目录语义：mkdir 占位对象、remove/rename/move 的文件与目录分支
 *   4. 流式下载：range 偏移换算（S3 的 start/end → R2 的 offset/length）
 *   5. api 回退：无绑定 + key/secret 时走 S3 兼容路径（不误报绑定错误）
 */

interface StoredObject {
  body: Uint8Array
  uploaded: Date
  contentType?: string
}

class MockR2Bucket implements R2BucketLike {
  objects = new Map<string, StoredObject>()
  /** 记录 list 调用，用于断言分页 cursor 语义 */
  listCalls: Array<Record<string, any>> = []
  /** 模拟单页只返回 1 条文件，用于验证 truncated/cursor 翻页 */
  pageSize = 1000
  /** 带 delimiter 的列举同样分页（R2 任一页都可能 truncated） */
  delimiterPageSize = 1000

  private keyOf(obj: StoredObject | R2ObjectLike): string {
    return (obj as any).key
  }

  async head(key: string): Promise<R2ObjectLike | null> {
    const obj = this.objects.get(key)
    if (!obj) return null
    return {
      key,
      size: obj.body.byteLength,
      etag: `etag-${key}`,
      uploaded: obj.uploaded,
      httpMetadata: { contentType: obj.contentType },
    }
  }

  async get(key: string, options?: any): Promise<any> {
    const obj = this.objects.get(key)
    if (!obj) return null
    let body = obj.body
    const range = options?.range
    if (range && !(range instanceof Headers)) {
      const offset = range.offset ?? 0
      const length = range.length ?? body.byteLength - offset
      body = body.subarray(offset, offset + length)
    }
    return {
      key,
      size: obj.body.byteLength,
      etag: `etag-${key}`,
      uploaded: obj.uploaded,
      httpMetadata: { contentType: obj.contentType },
      body: new ReadableStream<Uint8Array>({
        start: (controller) => {
          controller.enqueue(body)
          controller.close()
        },
      }),
      arrayBuffer: async () =>
        body.buffer.slice(
          body.byteOffset,
          body.byteOffset + body.byteLength,
        ) as ArrayBuffer,
    }
  }

  async put(
    key: string,
    value: Uint8Array | ArrayBuffer | string | null,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<R2ObjectLike> {
    let bytes: Uint8Array
    if (value instanceof Uint8Array) {
      bytes = new Uint8Array(value)
    } else if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value)
    } else {
      bytes = new TextEncoder().encode(String(value ?? ""))
    }
    this.objects.set(key, {
      body: bytes,
      uploaded: new Date("2026-01-01T00:00:00Z"),
      contentType: options?.httpMetadata?.contentType,
    })
    return {
      key,
      size: bytes.byteLength,
      etag: `etag-${key}`,
      uploaded: new Date("2026-01-01T00:00:00Z"),
    }
  }

  async delete(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.objects.delete(key)
    }
  }

  async list(options?: {
    prefix?: string
    delimiter?: string
    cursor?: string
    limit?: number
  }): Promise<any> {
    this.listCalls.push({ ...options })
    const prefix = options?.prefix || ""
    const delimiter = options?.delimiter
    const allKeys = [...this.objects.keys()]
      .filter((k) => k.startsWith(prefix))
      .sort()

    const dirSet = new Set<string>()
    const fileKeys: string[] = []
    for (const key of allKeys) {
      if (delimiter) {
        const rest = key.substring(prefix.length)
        const idx = rest.indexOf(delimiter)
        if (idx >= 0) {
          dirSet.add(prefix + rest.substring(0, idx + 1))
          continue
        }
      }
      fileKeys.push(key)
    }

    // 分页：模拟 truncated/cursor（pageSize=1 时逐条翻页）。
    // cursor 形如 "obj:<offset>|dir:<offset>"，对象与目录各自推进；
    // R2 的 cursor 是不透明令牌，这里只需保证「传回上一页 cursor 能续查」。
    const [objCursor, dirCursor] = String(options?.cursor || "0|0")
      .split("|")
      .map((s) => Number(s.replace(/[^0-9]/g, "")) || 0)
    const eff = Math.max(
      1,
      delimiter === undefined ? this.pageSize : this.delimiterPageSize,
    )
    const pageKeys = fileKeys.slice(objCursor, objCursor + eff)
    const dirList = delimiter ? [...dirSet] : []
    const pageDirs = dirList.slice(dirCursor, dirCursor + eff)
    const nextObj = objCursor + pageKeys.length
    const nextDir = dirCursor + pageDirs.length
    const truncated = nextObj < fileKeys.length || nextDir < dirList.length

    return {
      objects: pageKeys.map((key) => {
        const obj = this.objects.get(key)!
        return {
          key,
          size: obj.body.byteLength,
          etag: `etag-${key}`,
          uploaded: obj.uploaded,
          httpMetadata: { contentType: obj.contentType },
        }
      }),
      delimitedPrefixes: pageDirs,
      truncated,
      cursor: truncated ? `obj:${nextObj}|dir:${nextDir}` : undefined,
    }
  }
}

function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return (async () => {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      out.set(chunk, offset)
      offset += chunk.byteLength
    }
    return out
  })()
}

test("normalizeR2Addition 处理默认值与前缀", () => {
  const norm = normalizeR2Addition({
    bucket_binding: " R2 ",
    bucket: " mybucket ",
    root_folder_path: "media",
    sign_url_expire: "0",
  })
  assert.equal(norm.bucket_binding, "R2")
  assert.equal(norm.bucket, "mybucket")
  assert.equal(norm.root_folder_path, "/media")
  assert.equal(norm.region, "auto")
  assert.equal(norm.sign_url_expire, 4) // 0 → 回退默认 4 小时
})

test("resolveR2Bucket：env / 请求级上下文 / globalThis 三处探测", () => {
  resetEnv()
  const bucket = new MockR2Bucket()

  // 1) 显式 env 参数
  const direct = resolveR2Bucket("R2", { R2: bucket })
  assert.equal(direct.bucket, bucket)

  // 2) 请求级 env 上下文（驱动层拿不到 env 时的兜底）
  setEnvCtx({ OPENLIST_R2: bucket })
  const viaCtx = resolveR2Bucket("OPENLIST_R2")
  assert.equal(viaCtx.bucket, bucket)

  // 3) 同名变量只是普通字符串时必须被判为「不可用」
  resetEnv()
  const invalid = resolveR2Bucket("R2", { R2: "not-a-binding" })
  assert.equal(invalid.bucket, null)
  assert.deepEqual(invalid.tried, ["R2"])

  resetEnv()
})

test("list：目录 + 文件、占位对象过滤、翻页 cursor 跟随 truncated", async () => {
  resetEnv()
  const bucket = new MockR2Bucket()
  bucket.pageSize = 1 // 强制逐条翻页
  bucket.delimiterPageSize = 1 // 目录/文件同样逐条翻页，覆盖 cursor 分支
  await bucket.put("docs/a.txt", "a")
  await bucket.put("docs/b.txt", "b")
  await bucket.put("docs/.openlist", "")
  await bucket.put("docs/sub/c.txt", "c")
  setEnvCtx({ R2: bucket })

  const driver = new R2Driver({ bucket_binding: "R2", bucket: "b" })
  await driver.init()

  // 顶层：只有 docs 一个目录（文件都在它下面）
  const root = await driver.list("/", "/")
  assert.deepEqual(
    root.map((i) => `${i.is_dir ? "d" : "f"}:${i.name}`),
    ["d:docs"],
    `顶层应只有 docs 目录，实际: ${JSON.stringify(root)}`,
  )
  assert.equal(root[0].is_dir, true)
  assert.equal(root[0].type, 1)

  // docs 内：sub 目录 + a.txt/b.txt（b.txt 位于第二页，验证 cursor 翻页）
  const inner = await driver.list("/docs", "/docs")
  const byName = new Map(inner.map((i) => [i.name, i]))
  assert.ok(byName.get("sub")?.is_dir, "子目录 sub 应出现")
  assert.ok(
    byName.get("a.txt") && !byName.get("a.txt")!.is_dir,
    "a.txt 应是文件",
  )
  assert.ok(byName.get("b.txt"), "翻页后第二条文件必须出现在结果里")
  assert.ok(!byName.has(".openlist"), "占位对象不应出现在列表里")
  // 子目录里的对象不应泄漏到当前层
  assert.ok(!byName.has("c.txt"), "深层文件不应出现在 docs 层")

  // 翻页语义：pageSize=1 时必须发出多次带 cursor 的 list 调用
  const pagedCalls = bucket.listCalls.filter((c) => c.prefix === "docs/")
  assert.ok(
    pagedCalls.some((c) => typeof c.cursor === "string" && c.cursor.length > 0),
    `pageSize=1 时应发出带 cursor 的翻页请求，实际: ${JSON.stringify(pagedCalls)}`,
  )

  resetEnv()
})

test("root_folder_path 前缀作用于 list/get/put 的桶内 key", async () => {
  resetEnv()
  const bucket = new MockR2Bucket()
  await bucket.put("media/inside.txt", "hi")
  await bucket.put("outside.txt", "no")
  setEnvCtx({ R2: bucket })

  const driver = new R2Driver({
    bucket_binding: "R2",
    root_folder_path: "/media",
  })
  const items = await driver.list("/", "/")
  assert.deepEqual(
    items.map((i) => i.name),
    ["inside.txt"],
  )

  const file = await driver.get("/inside.txt", "/inside.txt")
  assert.equal(file.name, "inside.txt")
  assert.equal(file.size, 2)

  await driver.put("/new.txt", "/new.txt", new TextEncoder().encode("xy"))
  assert.ok(bucket.objects.has("media/new.txt"), "put 必须落在根目录前缀内")

  resetEnv()
})

test("mkdir 写占位对象；remove 区分文件与目录", async () => {
  resetEnv()
  const bucket = new MockR2Bucket()
  setEnvCtx({ R2: bucket })
  const driver = new R2Driver({ bucket_binding: "R2" })

  await driver.mkdir("/empty", "/empty")
  assert.ok(bucket.objects.has("empty/.openlist"), "mkdir 应写占位对象")

  await bucket.put("dir/x.bin", "1234")
  await bucket.put("dir/y.bin", "5678")
  await driver.remove("/dir", "/dir", ["dir"])
  assert.equal(bucket.objects.size, 1, "目录递归删除只应留下 empty/.openlist")

  await bucket.put("file.bin", "zz")
  await driver.remove("/file.bin", "/file.bin", ["file.bin"])
  assert.ok(!bucket.objects.has("file.bin"), "文件删除走单 key delete")

  resetEnv()
})

test("rename/move/copy：文件 copy+delete，目录递归", async () => {
  resetEnv()
  const bucket = new MockR2Bucket()
  setEnvCtx({ R2: bucket })
  const driver = new R2Driver({ bucket_binding: "R2" })

  await bucket.put("a.txt", "aaa")
  await driver.rename("/a.txt", "/a.txt", "b.txt")
  assert.ok(!bucket.objects.has("a.txt"))
  assert.equal(
    new TextDecoder().decode(bucket.objects.get("b.txt")!.body),
    "aaa",
  )

  // 目录移动
  await bucket.put("src/1.txt", "1")
  await bucket.put("src/2.txt", "2")
  await driver.move("/src", "/dst", ["src"], "/src", "/dst")
  assert.ok(!bucket.objects.has("src/1.txt"))
  assert.equal(
    new TextDecoder().decode(bucket.objects.get("dst/1.txt")!.body),
    "1",
  )
  assert.equal(
    new TextDecoder().decode(bucket.objects.get("dst/2.txt")!.body),
    "2",
  )

  // 目录复制（源保留）
  await bucket.put("cp/9.txt", "9")
  await driver.copy("/cp", "/cp2", ["cp"], "/cp", "/cp2")
  assert.ok(bucket.objects.has("cp/9.txt"), "复制不删除源")
  assert.ok(bucket.objects.has("cp2/9.txt"))

  resetEnv()
})

test("createReadStream：无 range 全量、有 range 按 offset/length 切片", async () => {
  resetEnv()
  const bucket = new MockR2Bucket()
  setEnvCtx({ R2: bucket })
  const driver = new R2Driver({ bucket_binding: "R2" })

  const content = new TextEncoder().encode("0123456789")
  await driver.put("/num.bin", "/num.bin", content)

  const full = await collect(await driver.createReadStream("/num.bin"))
  assert.equal(new TextDecoder().decode(full), "0123456789")

  const sliced = await collect(
    await driver.createReadStream("/num.bin", { start: 2, end: 4 }),
  )
  assert.equal(new TextDecoder().decode(sliced), "234")

  resetEnv()
})

test("binding 缺失：mode=auto 回退 api（不再抛绑定错误）；mode=binding 明确报错", async () => {
  resetEnv()
  const calls: string[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: any) => {
    calls.push(String(input))
    return new Response(
      `<?xml version="1.0"?><ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>`,
      { status: 200, headers: { "content-type": "application/xml" } },
    )
  }) as typeof fetch

  try {
    // auto：无绑定 + 完整 api 配置 → 走 S3 兼容
    const apiDriver = new R2Driver({
      mode: "auto",
      account_id: "acc",
      bucket: "mybucket",
      access_key_id: "k",
      secret_access_key: "s",
    })
    await apiDriver.init()
    const items = await apiDriver.list("/", "/")
    assert.deepEqual(items, [])
    assert.equal(calls.length, 1, "应至少请求一次 S3 ListObjects")
    assert.ok(
      calls[0].startsWith("https://mybucket.acc.r2.cloudflarestorage.com/"),
      `endpoint 应由 account_id 推导，实际: ${calls[0]}`,
    )

    // binding：显式要求绑定但不能解析 → 明确报错（不静默回退）
    const bindingDriver = new R2Driver({
      mode: "binding",
      bucket_binding: "R2",
    })
    await assert.rejects(
      () => bindingDriver.list("/", "/"),
      /binding not found/i,
    )

    // auto 且无任何可用路径 → init 不抛错（保留存储可保存），实际操作时给出配置指引
    const broken = new R2Driver({ mode: "auto" })
    await broken.init()
    await assert.rejects(() => broken.list("/", "/"), /缺少 bucket/)
  } finally {
    globalThis.fetch = originalFetch
    resetEnv()
  }
})

test("getDriver 路由：Cloudflare R2 与各别名均命中 R2Driver（S3 不受影响）", async () => {
  const storageConfig = {
    id: 901,
    driver: "Cloudflare R2",
    modified: new Date().toISOString(),
    addition: JSON.stringify({ mode: "auto" }),
  }
  resetEnv()
  const driver = await getDriver("Cloudflare R2", storageConfig)
  assert.ok(driver instanceof R2Driver, "'Cloudflare R2' 应命中 R2Driver")
  for (const alias of ["cloudflare_r2", "CloudflareR2", "cfr2", "r2", "R2"]) {
    const d = await getDriver(alias, {
      ...storageConfig,
      id: 901 + Math.floor(Math.random() * 1000),
      modified: new Date().toISOString(),
      addition: JSON.stringify({ mode: "auto" }),
    })
    assert.ok(d instanceof R2Driver, `别名 ${alias} 应命中 R2Driver`)
  }
  // 回归护栏：S3 家族不能被 R2 分支吃掉（此前 `r2` 就在 S3 分支的名单里）
  const s3 = await getDriver("S3", {
    ...storageConfig,
    id: 9500,
    driver: "S3",
    addition: JSON.stringify({
      bucket: "b",
      endpoint: "https://s3.example.com",
      access_key_id: "k",
      secret_access_key: "s",
    }),
  })
  assert.ok(!(s3 instanceof R2Driver), "'S3' 必须仍然命中 S3Driver")
  resetEnv()
})

test("驱动名归一：Cloudflare R2 的写法都指向它，S3 家族不受影响", () => {
  // 与 server/admin.ts 的 normalizeDriver 保持一致（后台表单与存储保存都走它）
  assert.equal(normalizeDriver("Cloudflare R2"), "Cloudflare R2")
  assert.equal(normalizeDriver("cloudflare_r2"), "Cloudflare R2")
  assert.equal(normalizeDriver("R2"), "Cloudflare R2")
  assert.equal(normalizeDriver("r2"), "Cloudflare R2")
  assert.equal(normalizeDriver("cfr2"), "Cloudflare R2")
  // 回归护栏：S3 家族不能被 R2 的名字归一吞掉
  assert.equal(normalizeDriver("S3"), "S3")
  assert.equal(normalizeDriver("s3"), "S3")
  assert.equal(normalizeDriver("minio"), "S3")
})

test("r2CanSignDirectUpload：只有 api 模式可签发预签名直传", () => {
  resetEnv()
  const bucket = new MockR2Bucket()

  // 无绑定（走 S3 兼容 api）→ 可签发
  assert.equal(
    r2CanSignDirectUpload({
      bucket: "b",
      access_key_id: "k",
      secret_access_key: "s",
    }),
    true,
  )

  // 能解析到绑定 → binding 模式（即使同时配了密钥，binding 也优先）→ 不可签发
  setEnvCtx({ R2: bucket })
  assert.equal(
    r2CanSignDirectUpload({
      bucket_binding: "R2",
      bucket: "b",
      access_key_id: "k",
      secret_access_key: "s",
    }),
    false,
  )

  // 显式 mode=binding 且解析不到绑定 → 仍不可签发（与 resolveMode 判定一致）
  resetEnv()
  assert.equal(
    r2CanSignDirectUpload({ mode: "binding", bucket_binding: "R2" }),
    false,
  )
  resetEnv()
})
