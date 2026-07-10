// @ts-nocheck
import { FtpSrv, FileSystem } from "ftp-srv"
import { resolvePath, getDb } from "../internal/model/db"
import { listItems, getItem, makeDirectory, renameItem, removeItems, putItem } from "../internal/op/storage"
import fs from "fs/promises"
import { createReadStream } from "fs"
import { PassThrough } from "stream"
import nodePath from "path"

const UNIX_SEP_REGEX = /\//g;
const WIN_SEP_REGEX = /\\/g;

export class OpenListFileSystem extends FileSystem {
  constructor(connection: any, options: any) {
    super(connection, options)
  }

  _resolvePath(path: string = '.') {
    // Unix separators normalize nicer on both unix and win platforms
    const resolvedPath = path.replace(WIN_SEP_REGEX, '/');
    // Join cwd with new path
    const joinedPath = nodePath.isAbsolute(resolvedPath)
      ? nodePath.normalize(resolvedPath)
      : nodePath.join('/', this.cwd || '/', resolvedPath);
      
    // Create FTP client path using unix separator
    const clientPath = joinedPath.replace(WIN_SEP_REGEX, '/');
    return {
      clientPath,
      fsPath: clientPath
    };
  }

  get root() {
    return '/';
  }

  currentDirectory() {
    return this.cwd;
  }

  async get(fileName: string) {
    const { clientPath } = this._resolvePath(fileName)
    try {
      const { item } = await getItem(clientPath)
      return {
        name: fileName,
        isDirectory: () => item.is_dir,
        size: item.size,
        mtime: new Date(item.modified),
        uid: 0,
        gid: 0,
      }
    } catch (e) {
      throw new Error('Not found')
    }
  }

  async list(virtualPath: string = '.') {
    const { clientPath } = this._resolvePath(virtualPath)
    try {
      const { content } = await listItems(clientPath)
      return content.map((item: any) => ({
        name: item.name,
        isDirectory: () => item.is_dir,
        size: item.size,
        mtime: new Date(item.modified),
        uid: 0,
        gid: 0,
      }))
    } catch (e) {
      return []
    }
  }

  async chdir(virtualPath: string = '.') {
    const { clientPath } = this._resolvePath(virtualPath)
    if (clientPath === '/') {
      this.cwd = clientPath
      return this.cwd
    }
    const { item } = await getItem(clientPath)
    if (!item.is_dir) throw new Error('Not a directory')
    this.cwd = clientPath
    return this.cwd
  }

  write(fileName: string, options: any) {
    const { clientPath } = this._resolvePath(fileName)
    const stream = new PassThrough()
    const chunks: Buffer[] = []
    
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', async () => {
      const buffer = Buffer.concat(chunks)
      try {
        await putItem(clientPath, buffer)
      } catch (e) {
        console.error("FTP upload error:", e)
      }
    })

    return { stream, clientPath }
  }

  async read(fileName: string, options: any) {
    const { clientPath } = this._resolvePath(fileName)
    const resolved = await resolvePath(clientPath)
    if (resolved.isVirtual || !resolved.physical) {
      throw new Error("Cannot download virtual path over FTP")
    }
    const stat = await fs.stat(resolved.physical)
    if (stat.isDirectory()) {
      throw new Error("Cannot download directory")
    }
    const stream = createReadStream(resolved.physical, { start: options.start })
    return { stream, clientPath }
  }

  async delete(fileName: string) {
    const { clientPath } = this._resolvePath(fileName)
    const dir = clientPath.substring(0, clientPath.lastIndexOf('/')) || '/'
    const name = clientPath.substring(clientPath.lastIndexOf('/') + 1)
    await removeItems(dir, [name])
  }

  async mkdir(virtualPath: string) {
    const { clientPath } = this._resolvePath(virtualPath)
    await makeDirectory(clientPath)
    return clientPath
  }

  async rename(from: string, to: string) {
    const { clientPath: fromPath } = this._resolvePath(from)
    const { clientPath: toPath } = this._resolvePath(to)
    const newName = toPath.substring(toPath.lastIndexOf('/') + 1)
    await renameItem(fromPath, newName)
  }

  async chmod() {
    return
  }
}

let ftpServerInstance: any = null

export async function startFtpServer() {
  if (ftpServerInstance) {
    await stopFtpServer()
  }

  const db = await getDb()
  const ftpPublicHost = db.settings.find((s: any) => s.key === "ftp_public_host")?.value || "127.0.0.1"
  const ftpPasvPortMap = db.settings.find((s: any) => s.key === "ftp_pasv_port_map")?.value || "50000-50100"
  
  const port = 2121; // use 2121 default to avoid root privileges

  ftpServerInstance = new FtpSrv({
    url: `ftp://0.0.0.0:${port}`,
    pasv_url: ftpPublicHost,
    pasv_min: parseInt(ftpPasvPortMap.split('-')[0]) || 50000,
    pasv_max: parseInt(ftpPasvPortMap.split('-')[1]) || 50100,
    anonymous: false,
  })

  ftpServerInstance.on('login', ({ connection, username, password }: any, resolve: any, reject: any) => {
    const expectedUsername = process.env.ADMIN_USERNAME || "admin"
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin"

    if (username === expectedUsername && password === expectedPassword) {
      resolve({ root: '/', fs: new OpenListFileSystem(connection, { root: '/', cwd: '/' }) })
    } else {
      reject(new Error('Invalid username or password'))
    }
  })

  try {
    await ftpServerInstance.listen()
    console.log(`FTP server listening on port ${port}`)
  } catch (err) {
    console.error("Failed to start FTP server:", err)
  }
}

export async function stopFtpServer() {
  if (ftpServerInstance) {
    await ftpServerInstance.close()
    ftpServerInstance = null
  }
}
