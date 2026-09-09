// ESA 边缘运行时 Node 内置模块 shim
// 用于处理浏览器构建后残留的 Node 模块引用

const unsupported = (name) => {
  throw new Error(`Node.js module "${name}" is not supported in ESA edge runtime`)
}

// crypto 模块导出
export const createCipheriv = (...args) => unsupported('crypto.createCipheriv')
export const createDecipheriv = (...args) => unsupported('crypto.createDecipheriv')
export const randomBytes = (...args) => unsupported('crypto.randomBytes')
export const createHash = (...args) => unsupported('crypto.createHash')
export const createSign = (...args) => unsupported('crypto.createSign')
export const createVerify = (...args) => unsupported('crypto.createVerify')
export const createHmac = (...args) => unsupported('crypto.createHmac')
export const pbkdf2 = (...args) => unsupported('crypto.pbkdf2')
export const pbkdf2Sync = (...args) => unsupported('crypto.pbkdf2Sync')

// buffer 模块导出
export const Buffer = globalThis.Buffer || new Proxy({}, {
  get: (_, prop) => unsupported('buffer.Buffer')
})

// util 模块导出
export const promisify = (...args) => unsupported('util.promisify')
export const inspect = (...args) => unsupported('util.inspect')
export const inherits = (...args) => unsupported('util.inherits')

// stream 模块导出
export const Readable = class { constructor() { unsupported('stream.Readable') } }
export const Writable = class { constructor() { unsupported('stream.Writable') } }
export const Transform = class { constructor() { unsupported('stream.Transform') } }
export const PassThrough = class { constructor() { unsupported('stream.PassThrough') } }

// zlib 模块导出
export const gzip = (...args) => unsupported('zlib.gzip')
export const gunzip = (...args) => unsupported('zlib.gunzip')
export const deflate = (...args) => unsupported('zlib.deflate')
export const inflate = (...args) => unsupported('zlib.inflate')

// module 模块导出 (通常用于 require.resolve 等)
export const createRequire = (...args) => unsupported('module.createRequire')

// fs 模块导出
export const readFile = (...args) => unsupported('fs.readFile')
export const writeFile = (...args) => unsupported('fs.writeFile')
export const readFileSync = (...args) => unsupported('fs.readFileSync')
export const writeFileSync = (...args) => unsupported('fs.writeFileSync')

// path 模块导出
export const join = (...args) => unsupported('path.join')
export const resolve = (...args) => unsupported('path.resolve')
export const basename = (...args) => unsupported('path.basename')
export const dirname = (...args) => unsupported('path.dirname')
export const extname = (...args) => unsupported('path.extname')

// 默认导出（作为后备）
export default new Proxy({}, {
  get: (_, prop) => (...args) => unsupported(`node:${prop}`)
})
