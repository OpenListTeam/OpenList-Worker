// Pure TypeScript FTP Client for OpenListNext
// Dynamic import for Node runtime; safe for edge packaging.

import { FTPAddition, FTPFileEntry } from "./types"
import { encodeFtpString, decodeFtpBuffer, normalizeEncoding } from "./encoding"

let netModule: any = null
let streamModule: any = null

async function getNet(): Promise<any> {
  if (typeof process === "undefined" || process.release?.name !== "node") {
    throw new Error(
      "[FTP] FTP driver requires Node.js container runtime (raw TCP sockets not available in standard Edge isolates)",
    )
  }
  if (!netModule) {
    try {
      const modName = "node:net"
      netModule = await import(/* @vite-ignore */ modName)
    } catch (e: any) {
      throw new Error(`[FTP] Failed to load net module: ${e.message}`)
    }
  }
  return netModule
}

async function getStream(): Promise<any> {
  if (!streamModule) {
    try {
      const modName = "node:stream"
      streamModule = await import(/* @vite-ignore */ modName)
    } catch (e: any) {
      throw new Error(`[FTP] Failed to load stream module: ${e.message}`)
    }
  }
  return streamModule
}

export interface ParsedHostPort {
  host: string
  port: number
}

export function parseFtpAddress(address: string): ParsedHostPort {
  const clean = (address || "").trim()
  if (!clean) return { host: "127.0.0.1", port: 21 }

  if (clean.startsWith("[")) {
    // IPv6 [::1]:21
    const closeBracket = clean.indexOf("]")
    if (closeBracket > 0) {
      const host = clean.slice(1, closeBracket)
      const rest = clean.slice(closeBracket + 1)
      const colon = rest.indexOf(":")
      const port = colon >= 0 ? parseInt(rest.slice(colon + 1), 10) || 21 : 21
      return { host, port }
    }
  }

  const parts = clean.split(":")
  if (parts.length === 1) {
    return { host: parts[0], port: 21 }
  }
  const port = parseInt(parts[parts.length - 1], 10)
  if (isNaN(port)) {
    return { host: clean, port: 21 }
  }
  const host = parts.slice(0, parts.length - 1).join(":")
  return { host, port: port || 21 }
}

export function parseListLine(
  line: string,
  encoding: string,
): FTPFileEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // MLSD format: type=dir;modify=20260824100000;size=1234; name
  if (trimmed.includes("type=") && trimmed.includes(";")) {
    const parts = trimmed.split(";")
    const name = parts[parts.length - 1].trim()
    if (!name || name === "." || name === "..") return null

    let is_dir = false
    let size = 0
    let modified = new Date()

    for (const part of parts.slice(0, -1)) {
      const [k, v] = part.split("=").map((s) => s.trim().toLowerCase())
      if (k === "type") {
        is_dir = v === "dir" || v === "cdir" || v === "pdir"
      } else if (k === "size") {
        size = parseInt(v, 10) || 0
      } else if (k === "modify") {
        // YYYYMMDDHHMMSS
        if (v && v.length >= 14) {
          const year = parseInt(v.slice(0, 4), 10)
          const month = parseInt(v.slice(4, 6), 10) - 1
          const day = parseInt(v.slice(6, 8), 10)
          const hour = parseInt(v.slice(8, 10), 10)
          const min = parseInt(v.slice(10, 12), 10)
          const sec = parseInt(v.slice(12, 14), 10)
          modified = new Date(Date.UTC(year, month, day, hour, min, sec))
        }
      }
    }
    return { name, size, is_dir, modified }
  }

  // Unix format: drwxr-xr-x 2 user group 4096 Jan 01 12:00 dirname
  // or -rw-r--r-- 1 user group 12345 Aug 24 10:00 filename
  const unixMatch = trimmed.match(
    /^([bcdlps-])[rwxstST-]{9}\s+\d+\s+(?:\S+\s+){1,2}(\d+)\s+([A-Za-z]{3}\s+\d{1,2}\s+(?:\d{4}|\d{1,2}:\d{2}))\s+(.+)$/,
  )
  if (unixMatch) {
    const typeChar = unixMatch[1]
    const size = parseInt(unixMatch[2], 10) || 0
    const rawDate = unixMatch[3]
    let name = unixMatch[4]

    // Handle symlink target notation "name -> target"
    if (typeChar === "l" && name.includes(" -> ")) {
      name = name.split(" -> ")[0]
    }
    if (name === "." || name === "..") return null

    const is_dir = typeChar === "d"
    let modified = new Date()
    try {
      const parsedDate = Date.parse(`${rawDate} UTC`)
      if (!isNaN(parsedDate)) {
        modified = new Date(parsedDate)
      }
    } catch {}

    return { name, size: is_dir ? 0 : size, is_dir, modified }
  }

  // DOS format: 08-24-26 10:00AM <DIR> dirname or 08-24-26 10:00AM 12345 filename
  const dosMatch = trimmed.match(
    /^(\d{2}-\d{2}-\d{2,4}\s+\d{1,2}:\d{2}(?:[AP]M)?)\s+(<DIR>|\d+)\s+(.+)$/i,
  )
  if (dosMatch) {
    const dateStr = dosMatch[1]
    const dirOrSize = dosMatch[2].toUpperCase()
    const name = dosMatch[3].trim()
    if (name === "." || name === "..") return null

    const is_dir = dirOrSize === "<DIR>"
    const size = is_dir ? 0 : parseInt(dirOrSize, 10) || 0
    let modified = new Date()
    try {
      const parsedDate = Date.parse(dateStr)
      if (!isNaN(parsedDate)) {
        modified = new Date(parsedDate)
      }
    } catch {}

    return { name, size, is_dir, modified }
  }

  return null
}

export class FTPClient {
  private addition: FTPAddition
  private controlSocket: any = null
  private host: string
  private port: number
  private encoding: string
  private responseBuffer = ""
  private pendingCallbacks: Array<{
    resolve: (res: { code: number; message: string; raw: string }) => void
    reject: (err: any) => void
  }> = []

  constructor(addition: FTPAddition) {
    this.addition = addition
    const { host, port } = parseFtpAddress(addition.address)
    this.host = host
    this.port = port
    this.encoding = normalizeEncoding(addition.encoding)
  }

  async connect(): Promise<void> {
    if (this.controlSocket && !this.controlSocket.destroyed) {
      try {
        await this.sendCommand("NOOP")
        return
      } catch {
        this.close()
      }
    }

    const net = await getNet()

    return new Promise((resolve, reject) => {
      let isGreeting = true
      const socket = net.createConnection(
        { host: this.host, port: this.port },
        () => {
          // Connected, waiting for 220 banner
        },
      )

      this.controlSocket = socket
      socket.setTimeout(15000)

      socket.on("data", (chunk: Buffer) => {
        this.handleData(chunk)
      })

      socket.on("error", (err: any) => {
        if (isGreeting) {
          reject(err)
        }
        this.close()
      })

      socket.on("timeout", () => {
        this.close()
        reject(new Error("[FTP] Control connection timeout"))
      })

      socket.on("close", () => {
        this.close()
      })

      // Handle greeting
      this.pendingCallbacks.push({
        resolve: async (res) => {
          isGreeting = false
          if (res.code !== 220) {
            this.close()
            return reject(new Error(`[FTP] Unexpected banner: ${res.raw}`))
          }
          try {
            await this.login()
            resolve()
          } catch (loginErr) {
            this.close()
            reject(loginErr)
          }
        },
        reject: (err) => {
          isGreeting = false
          this.close()
          reject(err)
        },
      })
    })
  }

  private async login(): Promise<void> {
    const userRes = await this.sendCommand(`USER ${this.addition.username}`)
    if (userRes.code === 331) {
      const passRes = await this.sendCommand(
        `PASS ${this.addition.password || ""}`,
      )
      if (passRes.code !== 230) {
        throw new Error(`[FTP] Login failed: ${passRes.message}`)
      }
    } else if (userRes.code !== 230) {
      throw new Error(`[FTP] Login failed: ${userRes.message}`)
    }

    // Set binary mode
    await this.sendCommand("TYPE I")

    // Attempt UTF-8 mode if UTF-8 is selected
    if (this.encoding === "utf-8") {
      try {
        await this.sendCommand("OPTS UTF8 ON")
      } catch {}
    }
  }

  private handleData(chunk: Buffer): void {
    const text = decodeFtpBuffer(chunk, this.encoding)
    this.responseBuffer += text

    const lines = this.responseBuffer.split("\r\n")
    if (lines.length > 1) {
      this.responseBuffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue

        // Check if line is final response (e.g. "220 ..." not "220-...")
        const match = line.match(/^(\d{3})(?: (.*))?$/)
        if (match) {
          const code = parseInt(match[1], 10)
          const message = match[2] || ""
          const cb = this.pendingCallbacks.shift()
          if (cb) {
            cb.resolve({ code, message, raw: line })
          }
        }
      }
    }
  }

  async sendCommand(
    cmd: string,
  ): Promise<{ code: number; message: string; raw: string }> {
    if (!this.controlSocket || this.controlSocket.destroyed) {
      await this.connect()
    }

    return new Promise((resolve, reject) => {
      this.pendingCallbacks.push({ resolve, reject })
      const buf = Buffer.concat([
        encodeFtpString(cmd, this.encoding),
        Buffer.from("\r\n", "ascii"),
      ])
      this.controlSocket.write(buf, (err: any) => {
        if (err) {
          const idx = this.pendingCallbacks.findIndex(
            (c) => c.resolve === resolve,
          )
          if (idx >= 0) this.pendingCallbacks.splice(idx, 1)
          reject(err)
        }
      })
    })
  }

  private async openDataConnection(): Promise<{
    dataSocket: any
    host: string
    port: number
  }> {
    const net = await getNet()
    const pasvRes = await this.sendCommand("PASV")
    if (pasvRes.code !== 227) {
      throw new Error(`[FTP] PASV failed: ${pasvRes.raw}`)
    }

    const match = pasvRes.message.match(
      /\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/,
    )
    if (!match) {
      throw new Error(`[FTP] Invalid PASV response: ${pasvRes.message}`)
    }

    const host = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`
    const port = parseInt(match[5], 10) * 256 + parseInt(match[6], 10)

    // In NAT/docker setups, if host in PASV response is 0.0.0.0 or private, fallback to control host
    const targetHost =
      host === "0.0.0.0" || host === "127.0.0.1" ? this.host : host

    const dataSocket = net.createConnection({ host: targetHost, port })
    return { dataSocket, host: targetHost, port }
  }

  async list(remotePath: string, cwdList = false): Promise<FTPFileEntry[]> {
    await this.connect()

    const cleanPath = remotePath || "/"
    let target = cleanPath

    if (cwdList && cleanPath !== "/") {
      await this.sendCommand(`CWD ${cleanPath}`)
      target = ""
    }

    const { dataSocket } = await this.openDataConnection()
    const chunks: Buffer[] = []

    const listDataPromise = new Promise<Buffer>((resolve, reject) => {
      dataSocket.on("data", (chunk: Buffer) => chunks.push(chunk))
      dataSocket.on("error", reject)
      dataSocket.on("close", () => resolve(Buffer.concat(chunks)))
    })

    const listCmd = target ? `LIST ${target}` : "LIST"
    const cmdRes = await this.sendCommand(listCmd)
    if (cmdRes.code >= 400) {
      dataSocket.destroy()
      throw new Error(`[FTP] LIST failed: ${cmdRes.raw}`)
    }

    const rawBuffer = await listDataPromise
    // Wait for transfer complete (226)
    const completeRes = await new Promise<{
      code: number
      message: string
      raw: string
    }>((resolve, reject) => {
      this.pendingCallbacks.push({ resolve, reject })
    })

    if (
      completeRes.code >= 400 &&
      completeRes.code !== 226 &&
      completeRes.code !== 250
    ) {
      throw new Error(`[FTP] LIST completion error: ${completeRes.raw}`)
    }

    const listText = decodeFtpBuffer(rawBuffer, this.encoding)
    const lines = listText.split(/\r?\n/)
    const entries: FTPFileEntry[] = []

    for (const line of lines) {
      const entry = parseListLine(line, this.encoding)
      if (entry) entries.push(entry)
    }

    return entries
  }

  async stat(remotePath: string): Promise<FTPFileEntry> {
    await this.connect()
    const cleanPath = remotePath.replace(/\\/g, "/")
    const parent = cleanPath.slice(0, cleanPath.lastIndexOf("/")) || "/"
    const name = cleanPath.split("/").filter(Boolean).pop() || ""

    if (!name || cleanPath === "/") {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date(),
      }
    }

    const entries = await this.list(parent)
    const found = entries.find((e) => e.name === name)
    if (!found) {
      throw new Error(`[FTP] File not found: ${remotePath}`)
    }
    return found
  }

  async mkdir(remotePath: string): Promise<void> {
    await this.connect()
    const res = await this.sendCommand(`MKD ${remotePath}`)
    if (res.code >= 400 && res.code !== 550) {
      throw new Error(`[FTP] MKD failed: ${res.raw}`)
    }
  }

  async mkdirAll(remotePath: string): Promise<void> {
    const clean = remotePath.replace(/\\/g, "/")
    const parts = clean.split("/").filter(Boolean)
    let current = clean.startsWith("/") ? "/" : ""

    for (const part of parts) {
      current = current === "/" ? "/" + part : current + "/" + part
      try {
        await this.mkdir(current)
      } catch (err: any) {
        // Ignore if directory already exists
      }
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.connect()
    const rnfrRes = await this.sendCommand(`RNFR ${oldPath}`)
    if (rnfrRes.code !== 350) {
      throw new Error(`[FTP] RNFR failed: ${rnfrRes.raw}`)
    }
    const rntoRes = await this.sendCommand(`RNTO ${newPath}`)
    if (rntoRes.code !== 250) {
      throw new Error(`[FTP] RNTO failed: ${rntoRes.raw}`)
    }
  }

  async removeFile(remotePath: string): Promise<void> {
    await this.connect()
    const res = await this.sendCommand(`DELE ${remotePath}`)
    if (res.code >= 400 && res.code !== 550) {
      throw new Error(`[FTP] DELE failed: ${res.raw}`)
    }
  }

  async removeDir(remotePath: string): Promise<void> {
    await this.connect()
    const res = await this.sendCommand(`RMD ${remotePath}`)
    if (res.code >= 400 && res.code !== 550) {
      throw new Error(`[FTP] RMD failed: ${res.raw}`)
    }
  }

  async removeRecursive(remotePath: string): Promise<void> {
    let entries: FTPFileEntry[] = []
    try {
      entries = await this.list(remotePath)
    } catch {
      // If listing fails, try DELE as file
      await this.removeFile(remotePath)
      return
    }

    for (const entry of entries) {
      const child = `${remotePath.replace(/\/+$/, "")}/${entry.name}`
      if (entry.is_dir) {
        await this.removeRecursive(child)
      } else {
        await this.removeFile(child)
      }
    }

    await this.removeDir(remotePath)
  }

  async upload(remotePath: string, content: Buffer): Promise<void> {
    await this.connect()
    const { dataSocket } = await this.openDataConnection()

    const storRes = await this.sendCommand(`STOR ${remotePath}`)
    if (storRes.code >= 400) {
      dataSocket.destroy()
      throw new Error(`[FTP] STOR failed: ${storRes.raw}`)
    }

    await new Promise<void>((resolve, reject) => {
      dataSocket.on("error", reject)
      dataSocket.end(content, () => resolve())
    })

    const completeRes = await new Promise<{
      code: number
      message: string
      raw: string
    }>((resolve, reject) => {
      this.pendingCallbacks.push({ resolve, reject })
    })
    if (
      completeRes.code >= 400 &&
      completeRes.code !== 226 &&
      completeRes.code !== 250
    ) {
      throw new Error(`[FTP] Upload completion error: ${completeRes.raw}`)
    }
  }

  async download(
    remotePath: string,
    options?: { start?: number; end?: number },
  ): Promise<any> {
    await this.connect()
    const { PassThrough } = await getStream()

    if (options && options.start && options.start > 0) {
      const restRes = await this.sendCommand(`REST ${options.start}`)
      if (restRes.code !== 350) {
        throw new Error(`[FTP] REST offset failed: ${restRes.raw}`)
      }
    }

    const { dataSocket } = await this.openDataConnection()
    const retrRes = await this.sendCommand(`RETR ${remotePath}`)
    if (retrRes.code >= 400) {
      dataSocket.destroy()
      throw new Error(`[FTP] RETR failed: ${retrRes.raw}`)
    }

    const passThrough = new PassThrough()
    let bytesSent = 0
    const length =
      options &&
      typeof options.end === "number" &&
      typeof options.start === "number"
        ? options.end - options.start + 1
        : Infinity

    dataSocket.on("data", (chunk: Buffer) => {
      if (bytesSent >= length) {
        dataSocket.destroy()
        return
      }
      if (bytesSent + chunk.length > length) {
        const slice = chunk.slice(0, length - bytesSent)
        passThrough.write(slice)
        bytesSent += slice.length
        dataSocket.destroy()
      } else {
        passThrough.write(chunk)
        bytesSent += chunk.length
      }
    })

    dataSocket.on("error", (err: any) => {
      passThrough.destroy(err)
    })

    dataSocket.on("close", () => {
      passThrough.end()
    })

    return passThrough
  }

  close(): void {
    if (this.controlSocket) {
      try {
        this.controlSocket.destroy()
      } catch {}
      this.controlSocket = null
    }
    this.responseBuffer = ""
    while (this.pendingCallbacks.length > 0) {
      const cb = this.pendingCallbacks.shift()
      if (cb) cb.reject(new Error("[FTP] Connection closed"))
    }
  }
}
