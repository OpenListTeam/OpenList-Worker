import esbuild from "esbuild"
import fs from "fs"

/**
 * 边缘与 Serverless 构建专用插件：把 sftp / ftp 驱动及 ssh2 相关依赖替换为空模块。
 *
 * 原因：sftp 驱动依赖 ssh2（需 crypto/net/http/https/tls 等 Node 内置模块以及 cpufeatures.node / sshcrypto.node 原生二进制），
 * ftp 驱动依赖 node:net / iconv-lite。
 * EdgeOne / ESA / Cloudflare Workers 等平台部署时会对其云函数进行二次打包（例如 EdgeOne CLI 的 buildProdMode），
 * 由于平台打包器未配置针对原生 ".node" 二进制文件的 loader，一旦引用了 ssh2 / cpu-features 就会直接抛出：
 * "No loader is configured for '.node' files: .../cpufeatures.node" 并导致部署失败。
 *
 * 此插件在打包阶段把 sftp/ftp 驱动及 ssh2 模块替换为空壳桩模块，确保产物完全不包含对原生 .node 文件的间接依赖。
 */
const emptyNodeDriverPlugin = {
  name: "empty-node-driver",
  setup(build) {
    // 匹配所有导入 sftp / ftp 驱动的路径（静态 import 和动态 import 都会经过 onResolve）
    build.onResolve({ filter: /drivers[\\/](sftp|ftp)([\\/].*)?$/ }, (args) => {
      return { path: args.path, namespace: "empty-node-driver" }
    })
    // 拦截直接引用 ssh2 / cpu-features / iconv-lite
    build.onResolve({ filter: /^(ssh2|cpu-features|iconv-lite)(\/.*)?$/ }, (args) => {
      return { path: args.path, namespace: "empty-node-driver" }
    })
    build.onLoad(
      { filter: /.*/, namespace: "empty-node-driver" },
      () => {
        return {
          contents: `
// Empty stub for Edge/CloudFunction build — Node-only drivers (sftp/ftp/ssh2) are not available in edge/serverless isolates.
export const SFTPDriver = class { constructor() { throw new Error("[Edge/Serverless] SFTP driver requires full Node.js runtime"); } };
export const normalizeSFTPAddition = (v) => v;
export const FTPDriver = class { constructor() { throw new Error("[Edge/Serverless] FTP driver requires full Node.js runtime"); } };
export const SFTPClient = class { constructor() { throw new Error("[Edge/Serverless] SFTP client requires full Node.js runtime"); } };
export const parseAddress = () => ({ host: "127.0.0.1", port: 22 });
export const Client = class { constructor() { throw new Error("[Edge/Serverless] ssh2 is not available in edge/serverless runtime"); } };
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
    plugins: [emptyNodeDriverPlugin],
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
    plugins: [emptyNodeDriverPlugin],
  })

  // 阿里云 ESA（边缘安全加速）边缘函数入口（仅在源文件存在时构建）
  if (fs.existsSync("esa-entry.ts")) {
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
  }

  console.log(
    "✓ Edge build complete -> dist/api/[...route].js & cloud-functions/[[default]].js",
  )
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
