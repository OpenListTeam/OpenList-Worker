#!/usr/bin/env node
/**
 * OpenListNext 一键部署脚本（Cloudflare Workers）
 *
 * 自动完成 KV namespace 绑定，无需手动填写 id 或编辑 wrangler.toml：
 *   1. 检测 wrangler.toml 中已有的 KV id
 *   2. 通过 `wrangler kv namespace list` 查找名为 OPENLISTNEXT_KV 的 namespace
 *   3. 不存在则自动 `wrangler kv namespace create OPENLISTNEXT_KV`
 *   4. 自动把最新 id 写入 wrangler.toml（仅更新 id，不动其他配置）
 *   5. 执行 `wrangler deploy`
 *
 * 用法：
 *   node scripts/deploy.js          # 自动部署
 *   node scripts/deploy.js --kv     # 仅确保 KV 绑定（不部署）
 *   node scripts/deploy.js --help   # 帮助
 */
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const CONFIG = path.join(ROOT, "wrangler.toml")
const KV_TITLE = "OPENLISTNEXT_KV"
const KV_BINDING = "OPENLISTNEXT_KV"

const args = process.argv.slice(2)
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
OpenListNext 一键部署脚本

  node scripts/deploy.js          自动部署（确保 KV 绑定 + wrangler deploy）
  node scripts/deploy.js --kv     仅确保 KV 绑定，不部署
  node scripts/deploy.js --skip-build  跳过前端构建（默认自动构建）
  node scripts/deploy.js --help   显示帮助
`)
  process.exit(0)
}

const onlyKv = args.includes("--kv")
const skipBuild = args.includes("--skip-build")

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`)
  try {
    return execSync(cmd, {
      cwd: ROOT,
      stdio: opts.silent ? "pipe" : "inherit",
      encoding: "utf8",
      env: { ...process.env },
    })
  } catch (e) {
    if (opts.silent) return e.stdout || ""
    throw e
  }
}

function readToml() {
  return existsSync(CONFIG) ? readFileSync(CONFIG, "utf8") : ""
}

function extractKvId(toml) {
  // 在 [[kv_namespaces]] 块内找 id = "..."
  const blockMatch = toml.match(/\[\[kv_namespaces\]\][\s\S]*?(?=\n\[|$)/)
  if (!blockMatch) return null
  const idMatch = blockMatch[0].match(/id\s*=\s*"([^"]+)"/)
  return idMatch ? idMatch[1].trim() : null
}

function extractKvBinding(toml) {
  const blockMatch = toml.match(/\[\[kv_namespaces\]\][\s\S]*?(?=\n\[|$)/)
  if (!blockMatch) return null
  const bMatch = blockMatch[0].match(/binding\s*=\s*"([^"]+)"/)
  return bMatch ? bMatch[1].trim() : null
}

/** 解析 `wrangler kv namespace list` 的表格输出，返回 { id: title } 映射
 *  注意：wrangler 4.x 在 Windows 输出 Unicode 竖线 │，其他平台为 | */
function parseNamespaceList(stdout) {
  const map = {}
  // 表格行: │ <id> │ <title> │  （兼容 | 和 │）
  const re = /[|│]\s*([0-9a-fA-F]{32})\s*[|│]\s*([^|│\n]+?)\s*[|│]/g
  let m
  while ((m = re.exec(stdout)) !== null) {
    map[m[2].trim()] = m[1].trim()
  }
  return map
}

/** 从 `wrangler kv namespace create` 输出提取 id（剥离 ANSI 颜色码） */
function parseCreatedId(stdout) {
  const clean = String(stdout).replace(/\x1b\[[0-9;]*m/g, "")
  const m = clean.match(/id\s*=\s*"([0-9a-fA-F]{32})"/)
  return m ? m[1] : null
}

/** 更新 wrangler.toml 中的 KV id；无 kv_namespaces 块则追加 */
function updateTomlId(toml, id) {
  const kvBlockRe = /(\[\[kv_namespaces\]\][\s\S]*?id\s*=\s*)"([^"]*)"/m
  if (kvBlockRe.test(toml)) {
    return toml.replace(kvBlockRe, `$1"${id}"`)
  }
  // 无 kv_namespaces 块 → 在文件末尾追加
  const block = `\n[[kv_namespaces]]\nbinding = "${KV_BINDING}"\nid = "${id}"\n`
  return toml.replace(/\s*$/, "") + block
}

function main() {
  // --- 1. 读取现有配置 ---
  let toml = readToml()
  const existingId = extractKvId(toml)
  const existingBinding = extractKvBinding(toml)
  if (existingId) {
    console.log(`[KV] wrangler.toml 已有绑定 ${KV_BINDING} id=${existingId}`)
  } else {
    console.log(
      `[KV] wrangler.toml 未配置 ${KV_BINDING} 绑定，将自动创建并写入`,
    )
  }

  // --- 2. 查询云端 namespace ---
  console.log("\n[KV] 正在查询 Cloudflare 上的 KV namespace ...")
  let listOut = ""
  try {
    listOut = run("npx wrangler kv namespace list", { silent: true })
  } catch (e) {
    console.error(
      "\n[错误] 无法查询 KV namespace。请先登录 wrangler：\n" +
        "  npx wrangler login\n" +
        "或在环境变量中设置 CLOUDFLARE_API_TOKEN（需要 Workers KV 权限）。",
    )
    process.exit(1)
  }

  const namespaces = parseNamespaceList(listOut)
  let matchedTitle = Object.keys(namespaces).find(
    (t) => t === KV_TITLE || t.includes(KV_TITLE),
  )
  let cloudId = matchedTitle ? namespaces[matchedTitle] : null
  if (cloudId) {
    console.log(`[KV] 找到 namespace "${matchedTitle}" id=${cloudId}`)
  } else {
    console.log(`[KV] 未找到名为 ${KV_TITLE} 的 namespace，正在创建 ...`)
    const createOut = run(`npx wrangler kv namespace create ${KV_TITLE}`, {
      silent: true,
    })
    console.log(createOut.trim())
    cloudId = parseCreatedId(createOut)
    if (!cloudId) {
      console.error("[错误] 无法从创建结果中解析 KV namespace id")
      process.exit(1)
    }
  }

  // --- 3. 更新 wrangler.toml（仅在 id 变化或块缺失时写文件）---
  const newToml = updateTomlId(readToml(), cloudId)
  if (newToml !== readToml()) {
    writeFileSync(CONFIG, newToml, "utf8")
    console.log(`[KV] 已更新 wrangler.toml: id = "${cloudId}"`)
  } else {
    console.log(`[KV] wrangler.toml 无需更新`)
  }

  if (onlyKv) {
    console.log("\n✅ KV 绑定就绪，执行 `node scripts/deploy.js` 完成部署")
    return
  }

  // --- 4. 构建前端（可选）---
  if (!skipBuild) {
    console.log("\n[构建] 正在构建前端静态资源 ...")
    run("npx vite build")
  } else {
    console.log("\n[构建] 跳过前端构建（--skip-build）")
  }

  // --- 5. 部署 ---
  console.log("\n[部署] 正在部署到 Cloudflare Workers ...")
  run("npx wrangler deploy")

  console.log("\n✅ 部署完成！")
  console.log("   验证：访问 https://<你的域名>/api/health 应返回 OpenListNext")
}

main()
