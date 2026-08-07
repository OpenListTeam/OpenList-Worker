#!/usr/bin/env node
/**
 * OpenListNext 一键部署脚本（Cloudflare Workers）
 *
 * wrangler.toml 只声明绑定（[[kv_namespaces]] binding = "OPENLISTNEXT_KV"），
 * **不存储 id** —— wrangler 4.x 的 Automatic provisioning 会在部署时自动
 * 创建/关联同名 KV namespace，无需手动填写 id。
 *
 * 本脚本额外做两件事：
 *   1. 检测云端是否已有 OPENLISTNEXT_KV namespace；没有则显式创建
 *      （确保资源存在；兼容不支持自动配置的旧版 wrangler）
 *   2. 构建前端 + wrangler deploy
 *
 * 用法：
 *   node scripts/deploy.js          # 自动部署（构建 + 确保 KV + deploy）
 *   node scripts/deploy.js --kv     # 仅确保 KV namespace 存在（不部署）
 *   node scripts/deploy.js --skip-build  跳过前端构建（默认自动构建）
 *   node scripts/deploy.js --help   # 帮助
 */
import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const KV_TITLE = "OPENLISTNEXT_KV"

const args = process.argv.slice(2)
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
OpenListNext 一键部署脚本（KV 自动绑定，无需手动填写 id）

  node scripts/deploy.js          自动部署（确保 KV 存在 + 构建 + wrangler deploy）
  node scripts/deploy.js --kv     仅确保 KV namespace 存在，不部署
  node scripts/deploy.js --skip-build  跳过前端构建（默认自动构建）
  node scripts/deploy.js --help   显示帮助

说明：wrangler.toml 只声明 binding（不存 id），由 wrangler 4.x 的
Automatic provisioning 在部署时自动创建/关联 KV namespace。
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

/** 确保 OPENLISTNEXT_KV namespace 存在（不存在则创建）。
 *  注意：只创建云端资源，不修改 wrangler.toml —— id 由 wrangler 自动配置。 */
function ensureKvNamespace() {
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
  const matchedTitle = Object.keys(namespaces).find(
    (t) => t === KV_TITLE || t.includes(KV_TITLE),
  )
  if (matchedTitle) {
    console.log(
      `[KV] 找到 namespace "${matchedTitle}" (id=${namespaces[matchedTitle]})，` +
        `部署时由 wrangler Automatic provisioning 自动绑定`,
    )
    return
  }

  console.log(`[KV] 未找到名为 ${KV_TITLE} 的 namespace，正在创建 ...`)
  const createOut = run(`npx wrangler kv namespace create ${KV_TITLE}`, {
    silent: true,
  })
  console.log(createOut.trim())
  const id = parseCreatedId(createOut)
  if (!id) {
    console.error("[错误] 无法从创建结果中解析 KV namespace id")
    process.exit(1)
  }
  console.log(
    `[KV] 已创建 namespace ${KV_TITLE} (id=${id})。` +
      `wrangler.toml 无需改动 —— wrangler 4.x 部署时会自动绑定同名 namespace。`,
  )
}

function main() {
  console.log(
    `[KV] wrangler.toml 仅声明绑定（不存 id），由 wrangler 自动配置。`,
  )

  // 确保 KV namespace 存在（兜底创建，不写 wrangler.toml）
  ensureKvNamespace()

  if (onlyKv) {
    console.log("\n✅ KV namespace 已就绪，执行 `npm run deploy` 完成部署")
    return
  }

  // 构建前端（可选）
  if (!skipBuild) {
    console.log("\n[构建] 正在构建前端静态资源 ...")
    run("npx vite build")
  } else {
    console.log("\n[构建] 跳过前端构建（--skip-build）")
  }

  // 部署（wrangler 4.x Automatic provisioning 自动创建/关联 KV）
  console.log("\n[部署] 正在部署到 Cloudflare Workers ...")
  run("npx wrangler deploy")

  console.log("\n✅ 部署完成！")
  console.log("   验证：访问 https://<你的域名>/api/health 应返回 OpenListNext")
}

main()
