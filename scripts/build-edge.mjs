import esbuild from "esbuild"

/**
 * ESA 构建专用插件：把 sftp / ftp 驱动替换为空模块。
 *
 * 原因：sftp 驱动依赖 ssh2（需 crypto/net/http/https/tls 等 Node 内置模块），
 * ftp 驱动依赖 node:net / iconv-lite。ESA 部署时会自行再构建一次函数文件，
 * 其构建环境不支持这些 Node 内置模块，导致 "build er file failed"，
 * 函数未被正确包含，访问返回 404。
 *
 * 此插件在打包阶段就把 sftp/ftp 驱动替换成空壳，确保 dist/esa-entry.js
 * 完全不引用 ssh2 / node:net / iconv-lite。ESA 边缘环境本就无法使用
 * 需要原生 TCP 的 ftp/sftp 驱动，运行时调用会被 getSFTPDriver/getFTPDriver
 * 的 Node.js 检测拦截并抛出明确错误，不影响其他驱动。
 */
const emptyNodeDriverPlugin = {
  name: "empty-node-driver",
  setup(build) {
    // 匹配所有导入 sftp / ftp 驱动的路径（静态 import 和动态 import 都会经过 onResolve）
    build.onResolve({ filter: /drivers[\\/](sftp|ftp)([\\/].*)?$/ }, (args) => {
      return { path: args.path, namespace: "empty-node-driver" }
    })
    build.onLoad(
      { filter: /.*/, namespace: "empty-node-driver" },
      () => {
        return {
          contents: `
// Empty stub for ESA edge build — Node-only drivers (sftp/ftp) are not available in edge isolates.
export const SFTPDriver = class { constructor() { throw new Error("[ESA] SFTP driver requires Node.js runtime"); } };
export const FTPDriver = class { constructor() { throw new Error("[ESA] FTP driver requires Node.js runtime"); } };
export default {};
`,
          loader: "js",
        }
      },
    )
  },
}

async function build() {
  await esbuild.build({
    entryPoints: ["api/[...route].ts"],
    bundle: true,
    platform: "neutral",
    outfile: "dist/api/[...route].js",
    minify: true,
    format: "esm",
    external: ["ssh2", "cpu-features", "iconv-lite"],
    loader: { ".node": "empty" },
  })
  await esbuild.build({
    entryPoints: ["api/_makers.ts"],
    bundle: true,
    platform: "node",
    target: "node22",
    outfile: "cloud-functions/[[default]].js",
    minify: true,
    format: "esm",
    external: ["ssh2", "cpu-features", "iconv-lite"],
    // 内联 dist/index.html 作为 SPA 兜底壳（需在 vite build 之后运行）
    loader: { ".html": "text", ".node": "empty" },
  })
  // 阿里云 ESA（边缘安全加速）边缘函数入口
  // platform: neutral 匹配 Workers 风格运行时；.html loader 内联 SPA 壳
  // plugins: 把 sftp/ftp 驱动替换为空模块，避免 ssh2 等 Node 内置模块导致 ESA 二次构建失败
  await esbuild.build({
    entryPoints: ["esa-entry.ts"],
    bundle: true,
    platform: "neutral",
    outfile: "dist/esa-entry.js",
    minify: true,
    format: "esm",
    external: ["ssh2", "cpu-features", "iconv-lite"],
    loader: { ".html": "text", ".node": "empty" },
    plugins: [emptyNodeDriverPlugin],
  })
  console.log(
    "✓ Edge build complete -> dist/api/[...route].js & cloud-functions/[[default]].js & dist/esa-entry.js",
  )
}
build().catch((err) => {
  console.error(err)
  process.exit(1)
})
