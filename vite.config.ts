import path from "path"
import { defineConfig, loadEnv } from "vite"
import solidPlugin from "vite-plugin-solid"
import legacy from "@vitejs/plugin-legacy"
import { dynamicBase } from "vite-plugin-dynamic-base"
import { viteStaticCopy } from "vite-plugin-static-copy"
import devServer from "@hono/vite-dev-server"
import type { Plugin } from "vite"

// vite-plugin-dynamic-base converts data-src → src in its generateBundle hook,
// but @vitejs/plugin-legacy expects data-src on vite-legacy-polyfill so the
// legacy detection script can read it.  This plugin runs its generateBundle
// after dynamicBase (enforce:post, registered last) and restores data-src.
function fixLegacyPolyfillDataSrc(): Plugin {
  return {
    name: "fix-legacy-polyfill-data-src",
    enforce: "post",
    apply: "build",
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (
          chunk.type === "asset" &&
          chunk.fileName.endsWith(".html") &&
          typeof chunk.source === "string"
        ) {
          chunk.source = chunk.source.replace(
            /("id"\s*:\s*"vite-legacy-polyfill"[^}]*?)"src"\s*:/,
            (match) => match.replace(/"src"\s*:/, '"data-src":'),
          )
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL),
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY),
      "process.env.ADMIN_USERNAME": JSON.stringify(env.ADMIN_USERNAME),
      "process.env.ADMIN_PASSWORD": JSON.stringify(env.ADMIN_PASSWORD),
    },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      // "@solidjs/router": path.resolve(__dirname, "solid-router/src"),
      "solid-icons": path.resolve(__dirname, "node_modules/solid-icons"),
    },
  },
  plugins: [
    solidPlugin(),
    devServer({
      entry: "src/backend/index.ts",
      exclude: [/^\/(?!api\/|d\/|sd\/|p\/).*/, /^\/assets\/.*/, /^\/favicon.ico$/, /^\/manifest.json$/],
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
              src: "node_modules/katex/dist/katex.min.css",
              dest: "static/katex",
            },
            {
              src: "node_modules/katex/dist/fonts/*",
              dest: "static/katex/fonts",
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
    fixLegacyPolyfillDataSrc(),
  ],
  base: "/",
  build: {
    // target: "es2015", //next
    // polyfillDynamicImport: false,
  },
  // experimental: {
  //   renderBuiltUrl: (filename, { type, hostId, hostType }) => {
  //     if (type === "asset") {
  //       return { runtime: `window.OPENLIST_CONFIG.cdn/${filename}` };
  //     }
  //     return { relative: true };
  //   },
  // },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  }
})
