import esbuild from "esbuild"

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
  await esbuild.build({
    entryPoints: ["esa-entry.ts"],
    bundle: true,
    platform: "neutral",
    outfile: "dist/esa-entry.js",
    minify: true,
    format: "esm",
    external: ["ssh2", "cpu-features", "iconv-lite"],
    loader: { ".html": "text", ".node": "empty" },
  })

  console.log(
    "✓ Edge build complete -> dist/api/[...route].js & cloud-functions/[[default]].js & dist/esa-entry.js",
  )
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
