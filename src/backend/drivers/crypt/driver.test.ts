import assert from "node:assert/strict"
import { createServer } from "node:http"
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join as joinFs } from "node:path"
import test from "node:test"

import type { FileItem, StorageDriver } from "../../internal/driver/base"
import { getDb, saveDb } from "../../internal/model/db"
import { CryptCipher } from "./cipher"
import type { CryptAddition } from "./driver"
import { CryptDriver } from "./driver"
import { legacyDecrypt } from "./legacy"
import { obscure } from "./obscure"

let seq = 0

async function setup(
  addition: Partial<CryptAddition>,
): Promise<{ d: CryptDriver; root: string; mount: string }> {
  const root = await mkdtemp(joinFs(tmpdir(), "ow-crypt-"))
  seq++
  const mount = `/crypt-under-${seq}`
  const db: any = await getDb()
  db.storages = [
    {
      id: `under-${seq}`,
      driver: "Local",
      mount_path: mount,
      addition: JSON.stringify({ root_folder_path: root }),
      modified: new Date().toISOString(),
      disabled: false,
    },
  ]
  await saveDb(db)
  const d = new CryptDriver({
    remote_path: mount,
    password: "potato",
    ...addition,
  } as CryptAddition)
  await d.init()
  return { d, root, mount }
}

async function readAll(s: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  const reader = s.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) parts.push(value)
  }
  let n = 0
  for (const p of parts) n += p.length
  const out = new Uint8Array(n)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

async function dump(root: string): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: string, prefix: string) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = prefix ? `${prefix}/${e.name}` : e.name
      if (e.isDirectory()) {
        out.push(p + "/")
        await walk(joinFs(dir, e.name), p)
      } else {
        out.push(p)
      }
    }
  }
  await walk(root, "")
  return out.sort()
}

const bytes = (...s: string[]) => new TextEncoder().encode(s.join(""))

// ---------------------------------------------------------------------------
// init validation (Go drivers/crypt Init)
// ---------------------------------------------------------------------------
test("init rejects illegal encrypted_suffix like Go", async () => {
  for (const bad of ["bin", ".x", "none", "..bin", ".b n"]) {
    await assert.rejects(
      setup({ encrypted_suffix: bad }),
      /EncryptedSuffix is Illegal|Illegal/,
      `suffix=${bad}`,
    )
  }
})

test("init accepts custom dot suffix and rejects empty password", async () => {
  const { d } = await setup({ encrypted_suffix: ".jpg" })
  await d.put("", "/f.txt", bytes("x"))
  const items = await d.list("", "/")
  assert.deepEqual(
    items.map((i) => i.name),
    ["f.txt"],
  )
  await assert.rejects(setup({ password: "" }), /password/)
})

test("init reveals ___Obfuscated___ password (Go updateObfusParm read side)", async () => {
  const { d } = await setup({
    password: `___Obfuscated___${obscure("potato")}`,
  })
  await d.put("", "/f.txt", bytes("hello"))
  assert.equal(
    new TextDecoder().decode(await readAll(await d.createReadStream("/f.txt"))),
    "hello",
  )
})

// ---------------------------------------------------------------------------
// off mode: plaintext names + suffix on disk
// ---------------------------------------------------------------------------
test("off mode put/list/get/download with .bin suffix on disk", async () => {
  const { d, root } = await setup({})
  await d.mkdir("", "/d1")
  await d.put("", "/d1/a.txt", bytes("hello world"))
  assert.deepEqual(await dump(root), ["d1/", "d1/a.txt.bin"])

  const items = await d.list("", "/d1")
  assert.equal(items.length, 1)
  assert.equal(items[0]!.name, "a.txt")
  assert.equal(items[0]!.size, 11)
  assert.equal(items[0]!.is_dir, false)

  const item = await d.get("", "/d1/a.txt")
  assert.equal(item.name, "a.txt")
  assert.equal(item.size, 11)

  const full = await readAll(await d.createReadStream("/d1/a.txt"))
  assert.equal(new TextDecoder().decode(full), "hello world")
})

test("off mode rename/remove/move/copy follow the item-path contract", async () => {
  const { d, root } = await setup({})
  await d.mkdir("", "/d1")
  await d.mkdir("", "/d2")
  await d.put("", "/d1/a.txt", bytes("one"))
  await d.rename("", "/d1/a.txt", "b.txt")
  assert.deepEqual(await dump(root), ["d1/", "d1/b.txt.bin", "d2/"])

  await d.copy("", "", [""], "/d1/b.txt", "/d2/b.txt")
  assert.deepEqual(
    (await d.list("", "/d2")).map((i) => i.name),
    ["b.txt"],
  )
  await d.move("", "", [""], "/d2/b.txt", "/d1/c.txt")
  assert.deepEqual((await d.list("", "/d1")).map((i) => i.name).sort(), [
    "b.txt",
    "c.txt",
  ])
  assert.deepEqual(
    (await d.list("", "/d2")).map((i) => i.name),
    [],
  )

  await d.remove("", "/d1/b.txt", ["b.txt"])
  assert.deepEqual(
    (await d.list("", "/d1")).map((i) => i.name),
    ["c.txt"],
  )
})

// ---------------------------------------------------------------------------
// standard mode: name encryption, dirNameEncrypt on/off, two-try get
// ---------------------------------------------------------------------------
test("standard mode encrypts names on disk and decrypts in listings", async () => {
  const { d, root } = await setup({
    filename_encryption: "standard",
    directory_name_encryption: "true",
    filename_encoding: "base32",
  })
  await d.mkdir("", "/dir.name")
  await d.put("", "/dir.name/readme", bytes("no dot file"))
  await d.put("", "/dir.name/a.b.txt", bytes("dotted"))
  const disk = await dump(root)
  assert.ok(
    !disk.some(
      (p) =>
        p.includes("readme") || p.includes("dir.name") || p.includes("a.b"),
    ),
    `names leaked: ${disk}`,
  )

  const items = (await d.list("", "/dir.name")).map((i) => i.name).sort()
  assert.deepEqual(items, ["a.b.txt", "readme"])

  // two-try get: dotted dir, dotless file, dotted file
  assert.equal((await d.get("", "/dir.name")).is_dir, true)
  assert.equal((await d.get("", "/dir.name/readme")).name, "readme")
  assert.equal((await d.get("", "/dir.name/a.b.txt")).name, "a.b.txt")

  // rename file and dir
  await d.rename("", "/dir.name/readme", "README2")
  assert.deepEqual((await d.list("", "/dir.name")).map((i) => i.name).sort(), [
    "README2",
    "a.b.txt",
  ])
  await d.rename("", "/dir.name", "dir2")
  assert.deepEqual((await d.list("", "/dir2")).map((i) => i.name).sort(), [
    "README2",
    "a.b.txt",
  ])

  // remove + move + copy across encrypted dirs
  await d.mkdir("", "/dir3")
  await d.move("", "", [""], "/dir2/a.b.txt", "/dir3/a.b.txt")
  assert.deepEqual(
    (await d.list("", "/dir3")).map((i) => i.name),
    ["a.b.txt"],
  )
  await d.copy("", "", [""], "/dir3/a.b.txt", "/dir2/a.b.txt")
  assert.deepEqual((await d.list("", "/dir2")).map((i) => i.name).sort(), [
    "README2",
    "a.b.txt",
  ])
  await d.remove("", "/dir3/a.b.txt", [""])
  assert.deepEqual(
    (await d.list("", "/dir3")).map((i) => i.name),
    [],
  )
})

test("standard mode dirNameEncrypt=false leaves dir names plain", async () => {
  const { d, root } = await setup({
    filename_encryption: "standard",
    directory_name_encryption: "false",
    filename_encoding: "base64",
  })
  await d.mkdir("", "/plain.dir")
  await d.put("", "/plain.dir/f.txt", bytes("x"))
  const disk = await dump(root)
  assert.ok(
    disk.some((p) => p.startsWith("plain.dir/")),
    `dir name encrypted unexpectedly: ${disk}`,
  )
  assert.deepEqual(
    (await d.list("", "/plain.dir")).map((i) => i.name),
    ["f.txt"],
  )
  assert.equal((await d.get("", "/plain.dir/f.txt")).name, "f.txt")
})

test("obfuscate mode roundtrip through the driver", async () => {
  const { d } = await setup({
    filename_encryption: "obfuscate",
    directory_name_encryption: "true",
  })
  await d.mkdir("", "/docs")
  await d.put("", "/docs/notes.txt", bytes("abc"))
  assert.deepEqual(
    (await d.list("", "/docs")).map((i) => i.name),
    ["notes.txt"],
  )
  assert.equal(
    new TextDecoder().decode(
      await readAll(await d.createReadStream("/docs/notes.txt")),
    ),
    "abc",
  )
})

// ---------------------------------------------------------------------------
// list filtering: hidden files and undecryptable entries
// ---------------------------------------------------------------------------
test("show_hidden=false hides dotfiles; illegal names are skipped", async () => {
  const { d, root } = await setup({
    filename_encryption: "standard",
    directory_name_encryption: "false",
  })
  await d.put("", "/visible.txt", bytes("v"))
  await d.put("", "/.secret", bytes("s"))
  // plant an undecryptable entry directly on disk
  await writeFile(joinFs(root, "zzz.bin"), new Uint8Array(48))

  const shown = (await d.list("", "/")).map((i) => i.name)
  assert.deepEqual(shown.sort(), [".secret", "visible.txt"])

  const hidden = await setup({
    filename_encryption: "standard",
    directory_name_encryption: "false",
    show_hidden: false,
  })
  await hidden.d.put("", "/visible.txt", bytes("v"))
  await hidden.d.put("", "/.secret", bytes("s"))
  await writeFile(joinFs(hidden.root, "zzz.bin"), new Uint8Array(48))
  assert.deepEqual(
    (await hidden.d.list("", "/")).map((i) => i.name),
    ["visible.txt"],
  )
})

// ---------------------------------------------------------------------------
// content compatibility: legacy AES-CTR dual-read + rclone range reads
// ---------------------------------------------------------------------------
test("legacy AES-CTR files stay readable (dual-format)", async () => {
  const fixtures: {
    password: string
    salt: string
    plainSize: number
    plainHex: string
    encHex: string
  }[] = (
    JSON.parse(
      await readFile(
        new URL("./testdata/legacy-fixtures.json", import.meta.url),
        "utf8",
      ),
    ) as { fixtures: typeof fixtures }
  ).fixtures
  const f = fixtures.find(
    (x) => x.password === "potato" && x.salt === "" && x.plainSize === 100,
  )!
  const { d, root } = await setup({})
  await writeFile(joinFs(root, "old.txt.bin"), Buffer.from(f.encHex, "hex"))

  // known display quirk of the mixed period: legacy sizes show 16 bytes short
  const item = await d.get("", "/old.txt")
  assert.equal(item.size, 100 - 16)
  const got = await readAll(await d.createReadStream("/old.txt"))
  assert.equal(
    [...got].map((x) => x.toString(16).padStart(2, "0")).join(""),
    f.plainHex,
  )
  // sanity: equals direct legacy decrypt
  assert.equal(
    got.length,
    legacyDecrypt("potato", "", Buffer.from(f.encHex, "hex")).length,
  )
})

test("rclone content: full and range downloads match (Range streaming)", async () => {
  const { d } = await setup({})
  const pt = new Uint8Array(70000)
  for (let i = 0; i < pt.length; i++) pt[i] = (i * 7 + 13) & 0xff
  await d.put("", "/big.bin", pt)
  const full = await readAll(await d.createReadStream("/big.bin"))
  assert.equal(full.length, pt.length)
  assert.deepEqual([...full.slice(0, 24)], [...pt.slice(0, 24)])

  for (const [start, end] of [
    [0, 99],
    [1000, 2000],
    [65530, 65600],
    [65536, 65536],
    [70000 - 10, 70000 - 1],
  ] as [number, number][]) {
    const got = await readAll(
      await d.createReadStream("/big.bin", { start, end }),
    )
    assert.equal(got.length, end - start + 1, `len ${start}-${end}`)
    assert.deepEqual(
      [...got],
      [...pt.slice(start, end + 1)],
      `bytes ${start}-${end}`,
    )
  }
})

test("createReadStream falls back to raw_url fetch for drivers without streams", async () => {
  const store = new Map<string, Uint8Array>()
  const server = createServer((req, res) => {
    const data = store.get(new URL(req.url!, "http://x").pathname.slice(1))
    if (!data) {
      res.statusCode = 404
      res.end()
      return
    }
    const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || "")
    if (m) {
      const s = Number(m[1])
      const e = m[2] ? Number(m[2]) : data.length - 1
      res.statusCode = 206
      res.setHeader("Content-Range", `bytes ${s}-${e}/${data.length}`)
      res.end(data.subarray(s, e + 1))
    } else {
      res.end(data)
    }
  })
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r))
  const port = (server.address() as { port: number }).port

  const cipher = new CryptCipher("potato", "", {
    mode: "off",
    dirNameEncrypt: false,
    filenameEncoding: "base64",
    encryptedSuffix: ".bin",
  })
  const pt = bytes("streamed over raw_url!")
  store.set("a.txt.bin", cipher.encryptData(pt))

  const stub: StorageDriver = {
    list: async () => [],
    get: async (_v: string, p: string) =>
      ({
        name: p.split("/").pop()!,
        size: store.get(p.replace(/^\//, ""))!.length,
        is_dir: false,
        modified: new Date().toISOString(),
        sign: "",
        type: 2,
        raw_url: `http://127.0.0.1:${port}/${p.replace(/^\//, "")}`,
      }) as FileItem,
    mkdir: async () => {},
    rename: async () => {},
    remove: async () => {},
    move: async () => {},
    copy: async () => {},
    put: async () => {},
  }
  const d = new CryptDriver({
    password: "potato",
  } as CryptAddition) as unknown as {
    remoteDriver: StorageDriver
    remoteRoot: string
    cipher: CryptCipher
    createReadStream: (
      p: string,
      r?: { start: number; end: number },
    ) => Promise<ReadableStream<Uint8Array>>
  }
  d.remoteDriver = stub
  d.remoteRoot = ""
  d.cipher = cipher

  const full = await readAll(await d.createReadStream("/a.txt"))
  assert.equal(new TextDecoder().decode(full), "streamed over raw_url!")
  const part = await readAll(
    await d.createReadStream("/a.txt", { start: 2, end: 5 }),
  )
  assert.equal(new TextDecoder().decode(part), "ream")
  await new Promise<void>((r) => server.close(() => r()))
})
