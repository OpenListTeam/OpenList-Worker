import { joinBase } from "~/utils"
import {
  name as pkgName,
  version as pkgVersion,
  dependencies as pkgDeps,
} from "../../package.json"

export const useCDN = () => {
  const static_path = joinBase("static")

  // OpenList Resource CDN: https://github.com/OpenListTeam/OpenList-Resource
  const resource = "https://res.oplist.org.cn"

  // npmmirror CDN, whitelist
  // Available: https://github.com/cnpm/unpkg-white-list
  const npm = (name: string, version: string, path: string) => {
    // https://registry.npmmirror.com/monaco-editor/0.55.1/files/min/vs/loader.js
    return `https://registry.npmmirror.com/${name}/${version}/files/${path}`

    // https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/loader.js
    // return `https://cdn.jsdelivr.net/npm/${name}@${version}/${path}`
  }

  // Read version from package.json dependencies (strips ^ ~ prefixes)
  const dep = (name: string) => {
    const ver = (pkgDeps as Record<string, string>)[name]
    if (!ver)
      throw new Error(
        `[useCDN] "${name}" not found in package.json dependencies`,
      )
    return ver.replace(/^[^\d]*/, "")
  }

  const res = (path: string) => {
    return `${resource}/${path}`
  }

  const monacoPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm("monaco-editor", dep("monaco-editor"), "min/vs")
      : `${static_path}/monaco-editor/vs`
  }

  const katexCSSPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm("katex", dep("katex"), "dist/katex.min.css")
      : `${static_path}/katex/katex.min.css`
  }

  const mermaidJSPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm("mermaid", dep("mermaid"), "dist/mermaid.min.js")
      : `${static_path}/mermaid/mermaid.min.js`
  }

  const libHeifPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm(pkgName, pkgVersion, "dist/static/libheif")
      : `${static_path}/libheif`
  }

  const libAssPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm(pkgName, pkgVersion, "dist/static/libass-wasm")
      : `${static_path}/libass-wasm`
  }

  const fontsPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm(pkgName, pkgVersion, "dist/static/fonts")
      : `${static_path}/fonts`
  }

  // Office preview libs — always served from resource CDN (not bundled locally)
  const pptBasePath = () => res("ppt.js")
  const docxPreviewPath = () => res("docxjs/dist/docx-preview.min.js")
  const excelJSPath = () => res("exceljs/exceljs.min.js")
  const rufflePath = () => res("ruffle/ruffle.js")

  return {
    npm,
    res,
    monacoPath,
    katexCSSPath,
    mermaidJSPath,
    libHeifPath,
    libAssPath,
    fontsPath,
    pptBasePath,
    docxPreviewPath,
    excelJSPath,
    rufflePath,
  }
}
