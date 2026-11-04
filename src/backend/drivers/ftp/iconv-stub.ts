/**
 * Worker 打包时的 iconv-lite 空桩（见 wrangler.jsonc 的 alias）。
 *
 * 背景（issue #151）：`wrangler deploy` 直接以 src/backend/worker.ts 为入口打包，
 * 不经过 scripts/build-edge.mjs 的 emptyNodeDriverPlugin —— 后者在 ESA / EdgeOne /
 * dist-server 产物里早已把 iconv-lite 替换成空模块。于是 FTP 驱动的
 * `require("iconv-lite")` 在 Wrangler 这条链路上仍会被解析，进而连带解析
 * iconv-lite 的传递依赖 safer-buffer，在依赖布局稍有差异的环境里直接构建失败。
 *
 * Workers 运行时没有 TCP socket，FTP 驱动不可用，这里的编码转码路径永远不会
 * 被真正执行；保留同名导出只是为了在打包期能解析，真被调用时给出明确错误。
 */
const unavailable = (): never => {
  throw new Error("iconv-lite is not available in this runtime")
}

export const decode = unavailable
export const encode = unavailable
export const encodingExists = () => false

export default { decode, encode, encodingExists }
