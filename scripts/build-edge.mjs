import esbuild from "esbuild"

async function build() {
  await esbuild.build({
    entryPoints: ["api/[...route].ts"],
    bundle: true,
    platform: "neutral",
    outfile: "dist/api/[...route].js",
    minify: true,
    format: "esm",
  })

  await esbuild.build({
    entryPoints: ["api/_makers.ts"],
    bundle: true,
    platform: "node",
    target: "node22",
    outfile: "cloud-functions/[[default]].js",
    minify: true,
    format: "esm",
    // 内联 dist/index.html 作为 SPA 兜底壳（需在 vite build 之后运行）
    loader: { ".html": "text" },
  })

  console.log(
    "✓ Edge build complete -> dist/api/[...route].js & cloud-functions/[[default]].js",
  )
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
