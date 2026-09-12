#!/usr/bin/env node
/**
 * OpenList 一键部署脚本（Cloudflare Workers）
 *
 * wrangler.jsonc **刻意不声明任何存储绑定**。原因见该文件顶部注释：
 * 声明绑定会让一键部署强制创建用不到的资源，且二次部署时源仓库中的空 id
 * 与账户内已有资源冲突，导致构建失败。
 *
 * 因此本脚本在部署后引导用户在控制台完成绑定：
 *   Workers & Pages → 选择本 Worker → Settings → Bindings → 添加 KV
 *   （变量名填 KV，选择本脚本创建的 namespace）
 *
 * 本脚本做三件事：
 *   1. 检测云端是否已有 KV namespace；没有则显式创建
 *   2. 获取官方前端产物
 *   3. wrangler deploy，然后提示手动绑定 KV
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
const KV_TITLE = "KV"

const args = process.argv.slice(2)
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
OpenList 一键部署脚本（KV 自动绑定，无需手动填写 id）

  node scripts/deploy.js          自动部署（确保 KV 存在 + 构建 + wrangler deploy）
  node scripts/deploy.js --kv     仅确保 KV namespace 存在，不部署
  node scripts/deploy.js --skip-build  跳过前端构建（默认自动构建）
  node scripts/deploy.js --help   显示帮助

说明：wrangler.jsonc 不声明存储绑定。部署后请在 Cloudflare 控制台手动绑定
KV（变量名填 KV），否则前端初始化页的环境自检会提示存储未就绪。
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

/** 确保 KV namespace 存在（不存在则创建）。
 *  注意：只创建云端资源，不修改 wrangler.jsonc —— 绑定由用户在控制台完成。 */
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
      `请在 Cloudflare 控制台把该 namespace 绑定到本 Worker（变量名填 KV）。`,
  )
}

function main() {
  console.log(
    `[KV] wrangler.jsonc 不声明绑定，部署后需在控制台手动绑定 KV。`,
  )

  // 确保 KV namespace 存在（不修改 wrangler.jsonc）
  ensureKvNamespace()

  if (onlyKv) {
    console.log("\n✅ KV namespace 已就绪，执行 `npm run deploy` 完成部署")
    return
  }

  // 获取前端产物（可选）：从官方前端 OpenList-Frontend 获取构建产物
  if (!skipBuild) {
    console.log("\n[构建] 正在获取官方前端构建产物 ...")
    run("node scripts/fetch-frontend.mjs")
  } else {
    console.log("\n[构建] 跳过前端构建（--skip-build）")
  }

  // 部署（wrangler 4.x Automatic provisioning 自动创建/关联 KV）
  console.log("\n[部署] 正在部署到 Cloudflare Workers ...")
  run("npx wrangler deploy")

  console.log("\n✅ 部署完成！")
  console.log("   验证：访问 https://<你的域名>/api/health 应返回 OpenList")
  console.log("")
  console.log("⚠️  还需手动绑定 KV 才能持久化数据：")
  console.log(
    `   Workers & Pages → 选择本 Worker → Settings → Bindings → 添加 KV namespace`,
  )
  console.log(
    `   变量名填 KV，选择 namespace "${KV_TITLE}"；保存后重新部署一次即可。`,
  )
}

main()
