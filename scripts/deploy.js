#!/usr/bin/env node
/**
 * OpenList 一键部署脚本（Cloudflare Workers）
 *
 * wrangler.jsonc 只声明了 KV 一个绑定，且【省略了 id 字段】（不能写 "id": ""，
 * wrangler 校验会报错）—— 由 wrangler 的自动预配（automatic provisioning）
 * 负责创建与绑定：
 *   首次部署：创建 "项目名-绑定名"（即 openlist-tsworkers-kv）并绑定；
 *   二次部署：通过服务端 `inherit` 复用已有绑定，不会重复创建。
 *
 * 因此本脚本【不再自行创建 KV namespace】，只负责构建 + 部署。
 *
 * ── 为什么删掉脚本里的 KV 自动创建逻辑（见文件末注释掉的代码）────────
 * 旧实现调用 `wrangler kv namespace create KV` 手动建了一个 title 为 "KV"
 * 的命名空间，但 wrangler 的预配链路【无法按 title 复用已有命名空间】
 * （KVHandler 未实现 isConnectedToExistingResource），它会再建一个
 * openlist-tsworkers-kv。结果是：
 *   1. 账户里出现两个 KV，手动建的那个成为孤儿资源，从未被绑定使用；
 *   2. 首次部署时二者 title 相同还会直接冲突报错。
 * 详见 Issue #34。故该逻辑已注释保留，仅供参考，请勿启用。
 *
 * 本脚本做两件事：
 *   1. 获取官方前端产物
 *   2. wrangler deploy
 *
 * 用法：
 *   node scripts/deploy.js                # 自动部署（构建 + deploy）
 *   node scripts/deploy.js --skip-build  跳过前端构建（默认自动构建）
 *   node scripts/deploy.js --help        帮助
 */
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const args = process.argv.slice(2)
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
OpenList 一键部署脚本（KV 由 wrangler 自动预配，无需手动填写 id）

  node scripts/deploy.js               自动部署（构建 + wrangler deploy）
  node scripts/deploy.js --skip-build  跳过前端构建（默认自动构建）
  node scripts/deploy.js --help        显示帮助

说明：wrangler.jsonc 已声明 KV 绑定（省略 id 字段），首次部署会自动创建
命名为 openlist-tsworkers-kv 的命名空间并绑定，后续部署自动复用，无需手动绑定。
`)
  process.exit(0)
}

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

function main() {
  console.log(
    `[KV] wrangler.jsonc 已声明 KV 绑定（省略 id 字段），由 wrangler 自动创建/复用。`,
  )

  // 获取前端产物（可选）：从官方前端 OpenList-Frontend 获取构建产物
  if (!skipBuild) {
    console.log("\n[构建] 正在获取官方前端构建产物 ...")
    run("node scripts/fetch-frontend.mjs")
  } else {
    console.log("\n[构建] 跳过前端构建（--skip-build）")
  }

  // 部署：wrangler 自动预配 KV（首次创建 openlist-tsworkers-kv，二次 inherit 复用）
  console.log("\n[部署] 正在部署到 Cloudflare Workers ...")
  run("npx wrangler deploy")

  console.log("\n✅ 部署完成！")
  console.log("   验证：访问 https://<你的域名>/api/health 应返回 OpenList")
  console.log("")
  console.log(
    "   KV 已由 wrangler 自动创建并绑定（openlist-tsworkers-kv）；",
  )
  console.log(
    "   若想改用账户里已有的 KV，请在 wrangler.jsonc 的 kv_namespaces 中填入其 id。",
  )
}

main()

/* =============================================================================
 * 【已废弃】手动创建 KV namespace 的逻辑（保留备查，请勿启用）
 * =============================================================================
 * 废弃原因见文件头注释：wrangler 预配无法按 title 复用已有命名空间，
 * 手动创建会导致孤儿资源与重复创建冲突（Issue #34）。
 *
 * import { existsSync } from "node:fs"
 *
 * const KV_TITLE = "KV"
 *
 * // 解析 `wrangler kv namespace list` 的表格输出，返回 { title: id } 映射
 * // 注意：wrangler 4.x 在 Windows 输出 Unicode 竖线 │，其他平台为 |
 * function parseNamespaceList(stdout) {
 *   const map = {}
 *   const re = /[|│]\s*([0-9a-fA-F]{32})\s*[|│]\s*([^|│\n]+?)\s*[|│]/g
 *   let m
 *   while ((m = re.exec(stdout)) !== null) {
 *     map[m[2].trim()] = m[1].trim()
 *   }
 *   return map
 * }
 *
 * // 从 `wrangler kv namespace create` 输出提取 id（剥离 ANSI 颜色码）
 * function parseCreatedId(stdout) {
 *   const clean = String(stdout).replace(/\x1b\[[0-9;]*m/g, "")
 *   const m = clean.match(/id\s*=\s*"([0-9a-fA-F]{32})"/)
 *   return m ? m[1] : null
 * }
 *
 * // 确保 KV namespace 存在（不存在则创建）
 * function ensureKvNamespace() {
 *   let listOut = ""
 *   try {
 *     listOut = run("npx wrangler kv namespace list", { silent: true })
 *   } catch (e) {
 *     console.error(
 *       "\n[错误] 无法查询 KV namespace。请先登录 wrangler：\n" +
 *         "  npx wrangler login\n" +
 *         "或在环境变量中设置 CLOUDFLARE_API_TOKEN（需要 Workers KV 权限）。",
 *     )
 *     process.exit(1)
 *   }
 *   const namespaces = parseNamespaceList(listOut)
 *   const matchedTitle = Object.keys(namespaces).find(
 *     (t) => t === KV_TITLE || t.includes(KV_TITLE),
 *   )
 *   if (matchedTitle) {
 *     console.log(
 *       `[KV] 找到 namespace "${matchedTitle}" (id=${namespaces[matchedTitle]})，` +
 *         `部署时由 wrangler Automatic provisioning 自动绑定`,
 *     )
 *     return
 *   }
 *   console.log(`[KV] 未找到名为 ${KV_TITLE} 的 namespace，正在创建 ...`)
 *   const createOut = run(`npx wrangler kv namespace create ${KV_TITLE}`, {
 *     silent: true,
 *   })
 *   console.log(createOut.trim())
 *   const id = parseCreatedId(createOut)
 *   if (!id) {
 *     console.error("[错误] 无法从创建结果中解析 KV namespace id")
 *     process.exit(1)
 *   }
 *   console.log(
 *     `[KV] 已创建 namespace ${KV_TITLE} (id=${id})。` +
 *       `请在 Cloudflare 控制台把该 namespace 绑定到本 Worker（变量名填 KV）。`,
 *   )
 * }
 * ========================================================================== */
