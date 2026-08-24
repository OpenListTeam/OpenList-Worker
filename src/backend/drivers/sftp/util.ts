// SFTP Client Helper using ssh2
// Dynamic import for Node runtime; safe for edge packaging.

import { SFTPAddition, SFTPFileEntry } from "./types"

let ssh2Module: any = null

async function getSSH2(): Promise<any> {
  if (typeof process === "undefined" || process.release?.name !== "node") {
    throw new Error(
      "[SFTP] SFTP driver requires Node.js container runtime (raw TCP sockets not available in standard Edge isolates)",
    )
  }
  if (!ssh2Module) {
    try {
      const moduleName = "ssh2"
      ssh2Module = await import(/* @vite-ignore */ moduleName)
    } catch (e: any) {
      throw new Error(`[SFTP] Failed to load ssh2 module: ${e.message}`)
    }
  }
  return ssh2Module
}

export interface ParsedHostPort {
  host: string
  port: number
}

export function parseAddress(address: string): ParsedHostPort {
  const clean = (address || "").trim()
  if (!clean) return { host: "127.0.0.1", port: 22 }

  if (clean.startsWith("[")) {
    // IPv6 [::1]:22
    const closeBracket = clean.indexOf("]")
    if (closeBracket > 0) {
      const host = clean.slice(1, closeBracket)
      const rest = clean.slice(closeBracket + 1)
      const colon = rest.indexOf(":")
      const port = colon >= 0 ? parseInt(rest.slice(colon + 1), 10) || 22 : 22
      return { host, port }
    }
  }

  const parts = clean.split(":")
  if (parts.length === 1) {
    return { host: parts[0], port: 22 }
  }
  const port = parseInt(parts[parts.length - 1], 10)
  if (isNaN(port)) {
    return { host: clean, port: 22 }
  }
  const host = parts.slice(0, parts.length - 1).join(":")
  return { host, port: port || 22 }
}

export class SFTPClientWrapper {
  private addition: SFTPAddition
  private sshClient: any = null
  private sftpClient: any = null
  private connectingPromise: Promise<any> | null = null

  constructor(addition: SFTPAddition) {
    this.addition = addition
  }

  async getSFTP(): Promise<any> {
    if (this.sftpClient) return this.sftpClient

    if (this.connectingPromise) {
      return this.connectingPromise
    }

    this.connectingPromise = this._connect()
    try {
      this.sftpClient = await this.connectingPromise
      return this.sftpClient
    } finally {
      this.connectingPromise = null
    }
  }

  private async _connect(): Promise<any> {
    const { Client } = await getSSH2()
    const { host, port } = parseAddress(this.addition.address)

    const ssh = new Client()

    const config: Record<string, any> = {
      host,
      port,
      username: this.addition.username,
      readyTimeout: 10000,
      keepaliveInterval: 15000,
      keepaliveCountMax: 3,
    }

    if (this.addition.private_key) {
      config.privateKey = this.addition.private_key
      if (this.addition.passphrase) {
        config.passphrase = this.addition.passphrase
      }
    } else if (this.addition.password) {
      config.password = this.addition.password
    }

    return new Promise((resolve, reject) => {
      let isReady = false

      ssh.on("ready", () => {
        isReady = true
        ssh.sftp((err: any, sftp: any) => {
          if (err) {
            ssh.end()
            return reject(err)
          }
          this.sshClient = ssh
          resolve(sftp)
        })
      })

      ssh.on("error", (err: any) => {
        if (!isReady) reject(err)
        this.close()
      })

      ssh.on("close", () => {
        this.close()
      })

      ssh.on("end", () => {
        this.close()
      })

      try {
        ssh.connect(config)
      } catch (err) {
        reject(err)
      }
    })
  }

  close(): void {
    if (this.sftpClient) {
      try {
        this.sftpClient.end()
      } catch {}
      this.sftpClient = null
    }
    if (this.sshClient) {
      try {
        this.sshClient.end()
      } catch {}
      this.sshClient = null
    }
  }

  async readdir(dirPath: string): Promise<SFTPFileEntry[]> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.readdir(dirPath, (err: any, list: SFTPFileEntry[]) => {
        if (err) return reject(err)
        resolve(list || [])
      })
    })
  }

  async stat(remotePath: string): Promise<any> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err: any, stats: any) => {
        if (err) return reject(err)
        resolve(stats)
      })
    })
  }

  async lstat(remotePath: string): Promise<any> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.lstat(remotePath, (err: any, stats: any) => {
        if (err) return reject(err)
        resolve(stats)
      })
    })
  }

  async readlink(remotePath: string): Promise<string> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.readlink(remotePath, (err: any, target: string) => {
        if (err) return reject(err)
        resolve(target)
      })
    })
  }

  async realpath(remotePath: string): Promise<string> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.realpath(remotePath, (err: any, absPath: string) => {
        if (err) return reject(err)
        resolve(absPath)
      })
    })
  }

  async mkdir(remotePath: string): Promise<void> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async mkdirAll(remotePath: string): Promise<void> {
    const clean = remotePath.replace(/\\/g, "/")
    const parts = clean.split("/").filter(Boolean)
    let current = clean.startsWith("/") ? "/" : ""

    for (const part of parts) {
      current = current === "/" ? "/" + part : current + "/" + part
      try {
        const stats = await this.stat(current)
        if (!stats.isDirectory()) {
          throw new Error(`[SFTP] Path exists but is not directory: ${current}`)
        }
      } catch (e: any) {
        try {
          await this.mkdir(current)
        } catch (mkdirErr: any) {
          // If already exists, ignore
          try {
            const check = await this.stat(current)
            if (check.isDirectory()) continue
          } catch {}
          throw mkdirErr
        }
      }
    }
  }

  async rename(srcPath: string, dstPath: string): Promise<void> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.rename(srcPath, dstPath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async unlink(remotePath: string): Promise<void> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.unlink(remotePath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async rmdir(remotePath: string): Promise<void> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      sftp.rmdir(remotePath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async removeRecursive(remotePath: string): Promise<void> {
    let stats: any
    try {
      stats = await this.lstat(remotePath)
    } catch {
      return // doesn't exist
    }

    if (stats.isDirectory()) {
      const entries = await this.readdir(remotePath)
      for (const entry of entries) {
        if (entry.filename === "." || entry.filename === "..") continue
        const childPath = `${remotePath.replace(/\/+$/, "")}/${entry.filename}`
        await this.removeRecursive(childPath)
      }
      await this.rmdir(remotePath)
    } else {
      await this.unlink(remotePath)
    }
  }

  async writeFile(remotePath: string, content: Buffer): Promise<void> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      const ws = sftp.createWriteStream(remotePath)
      ws.on("error", reject)
      ws.on("finish", resolve)
      ws.end(content)
    })
  }

  async readFile(remotePath: string): Promise<Buffer> {
    const sftp = await this.getSFTP()
    return new Promise((resolve, reject) => {
      const rs = sftp.createReadStream(remotePath)
      const chunks: Buffer[] = []
      rs.on("data", (chunk: Buffer) => chunks.push(chunk))
      rs.on("error", reject)
      rs.on("end", () => resolve(Buffer.concat(chunks)))
    })
  }

  async createReadStream(
    remotePath: string,
    options?: { start?: number; end?: number },
  ): Promise<any> {
    const sftp = await this.getSFTP()
    return sftp.createReadStream(remotePath, options)
  }
}
