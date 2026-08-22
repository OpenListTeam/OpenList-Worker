import esbuild from "esbuild"
import fs from "fs"

async function build() {
  // 1. 打包 api/[...route].ts -> dist/api/[...route].js (支持 Vercel, Cloudflare Workers & EdgeOne)
  await esbuild.build({
    entryPoints: ["api/[...route].ts"],
    bundle: true,
    platform: "neutral",
    outfile: "dist/api/[...route].js",
    minify: true,
    format: "esm",
  })

  // 2. 生成 dist/edge-functions/[[default]].js (适配 EdgeOne Makers 边缘函数目录路由规范)
  fs.mkdirSync("dist/edge-functions", { recursive: true })
  fs.copyFileSync("dist/api/[...route].js", "dist/edge-functions/[[default]].js")

  console.log("✓ Edge functions build complete (dist/api/[...route].js & dist/edge-functions/[[default]].js)")
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
