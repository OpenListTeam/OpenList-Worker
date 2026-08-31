import path from "path"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import legacy from "@vitejs/plugin-legacy"
import { viteStaticCopy } from "vite-plugin-static-copy"
import devServer from "@hono/vite-dev-server"

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "src"),
      // "@solidjs/router": path.resolve(import.meta.dirname, "solid-router/src"),
      "solid-icons": path.resolve(
        import.meta.dirname,
        "node_modules/solid-icons",
      ),
    },
  },
  plugins: [
    solidPlugin(),
    devServer({
      entry: "src/backend/index.ts",
      exclude: [
        /^\/(?!api\/|d\/|sd\/|p\/).*/,
        /^\/assets\/.*/,
        /^\/favicon.ico$/,
        /^\/manifest.json$/,
      ],
    }),
    legacy({
      targets: ["defaults"],
    }),
    process.env.VITE_LITE !== "true"
      ? viteStaticCopy({
          targets: [
            {
              src: "node_modules/monaco-editor/min/*",
              dest: "static/monaco-editor",
            },
            {
              src: "node_modules/katex/dist/*",
              dest: "static/katex",
            },
            {
              src: "node_modules/mermaid/dist/mermaid.min.js",
              dest: "static/mermaid",
            },
            {
              src: "node_modules/libheif-js/libheif-wasm/libheif.{js,wasm}",
              dest: "static/libheif",
            },
            {
              src: "node_modules/@jellyfin/libass-wasm/dist/js/subtitles-octopus-worker.{js,wasm}",
              dest: "static/libass-wasm",
            },
            {
              src: "src/components/artplayer-plugin-ass/fonts/*",
              dest: "static/fonts",
            },
          ],
        })
      : null,
  ],
  base: "/",
  build: {
    // target: "es2015", //next
    // polyfillDynamicImport: false,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
})
