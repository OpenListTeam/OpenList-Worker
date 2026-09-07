/**
 * 从官方前端 OpenList-Frontend 获取构建产物 (dist/)。
 *
 * OpenListNext(TSWorker) 后端不再维护内嵌前端源码，前端统一由官方仓库
 * OpenList-Frontend 提供（通过 backend 字段在运行时探测 GO/TS 模式）。
 *
 * 产物来源优先级（高 -> 低）：
 *   1. FRONTEND_DIST 环境变量：已构建好的 dist 目录路径（最快，CI 缓存场景）
 *   2. FRONTEND_REPO 环境变量：本地官方前端仓库路径（自动 install + build）
 *   3. 同级目录 ../OpenList-Frontend（monorepo 布局，自动探测，自动 install + build）
 *   4. 默认：从 Git 克隆官方仓库并构建
 *
 * 用法：
 *   FRONTEND_DIST=/path/to/dist node scripts/fetch-frontend.mjs
 *   FRONTEND_REPO=../OpenList-Frontend node scripts/fetch-frontend.mjs
 *   node scripts/fetch-frontend.mjs
 */

import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 始终以仓库根目录为基准（无论从哪个 cwd 调用）
const ROOT = path.resolve(__dirname, "..")
const DEST = path.join(ROOT, "dist")

const OFFICIAL_REPO_URL =
  process.env.FRONTEND_GIT_URL ||
  "https://github.com/OpenListTeam/OpenList-Frontend.git"
const OFFICIAL_REPO_REF = process.env.FRONTEND_GIT_REF || "main"

// 多语言翻译包：官方前端仓库不提交非英文翻译（由 Crowdin 维护），随 release 发布。
// 直接 pnpm build 只会得到英文界面，因此 CF/EO 构建时需在此拉取后再构建。
const I18N_TAR_URL =
  process.env.I18N_URL ||
  "https://github.com/OpenListTeam/OpenList-Frontend/releases/download/edge/i18n.tar.gz"

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`)
  execSync(cmd, { stdio: "inherit", shell: true, ...opts })
}

function detectPackageManager(dir) {
  return fs.existsSync(path.join(dir, "pnpm-lock.yaml")) ? "pnpm" : "npm"
}

/**
 * 目标仓库锁定了独立的 pnpm 版本（packageManager 字段，如前端仓库 pnpm@11.24.0），
 * 用 npx 按精确版本执行。
 *
 * 不走 corepack：旧版 Node（如 EdgeOne 构建环境的 22.11.0）自带的 corepack
 * 内置 npm 签名密钥已过期（2025-04 registry 密钥轮换），`corepack pnpm` 会报
 * "Cannot find matching keyid" 直接失败；npx 只经 npm 下载，无此问题。
 */
function resolvePmCommand(dir, pm) {
  if (pm !== "pnpm") return pm
  let pinned
  try {
    pinned = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf-8"),
    ).packageManager
  } catch {
    return pm
  }
  return pinned?.startsWith("pnpm@") ? `npx -y ${pinned}` : pm
}

function requireDist(src) {
  if (!fs.existsSync(path.join(src, "index.html"))) {
    throw new Error(`Frontend dist missing index.html: ${src}`)
  }
}

function replaceDist(src) {
  console.log(`  Copying frontend dist: ${src} -> ${DEST}`)
  fs.rmSync(DEST, { recursive: true, force: true })
  fs.cpSync(src, DEST, { recursive: true })
  console.log(`✓ Frontend dist ready (${DEST})`)
}

/**
 * 拉取官方前端发布的多语言翻译包，解压到前端仓库 src/lang/ 后运行
 * i18n.mjs 补齐 entry.ts 与缺失翻译，保证构建产物包含完整多语言。
 *
 * 翻译下载失败不阻塞构建（回退为英文），与前端 build.sh 的 `|| true` 语义一致。
 */
function fetchI18n(repo) {
  const langDir = path.join(repo, "src", "lang")
  if (!fs.existsSync(langDir)) {
    console.warn("  [fetch-frontend] repo missing src/lang, skipping i18n fetch")
    return
  }
  const tmpTar = path.join(os.tmpdir(), `openlist-i18n-${process.pid}.tar.gz`)
  console.log(`  Fetching i18n translations: ${I18N_TAR_URL}`)
  try {
    run(`curl -fL --retry 3 -o "${tmpTar}" "${I18N_TAR_URL}"`)
    run(`tar -xzf "${tmpTar}" -C "${langDir}"`)
  } catch (err) {
    console.warn(
      `  [fetch-frontend] i18n fetch failed (falling back to English): ${err?.message || err}`,
    )
  } finally {
    fs.rmSync(tmpTar, { force: true })
  }
  // 无论翻译是否下载成功，都补齐 entry.ts 与缺失翻译（与前端 build.sh 一致）
  run(`node ./scripts/i18n.mjs`, { cwd: repo })
}

/** 在本地前端仓库中 install + build，并取 dist 产物 */
function buildLocalRepo(repo) {
  const abs = path.resolve(repo)
  if (!fs.existsSync(path.join(abs, "package.json"))) {
    throw new Error(`Directory is not a frontend repo: ${abs}`)
  }
  const pm = detectPackageManager(abs)
  const cmd = resolvePmCommand(abs, pm)
  const install = (extra = "") =>
    run(`${cmd} install${extra}`, { cwd: abs })
  try {
    install()
  } catch {
    // 重试一次并加 --trust-lockfile：pnpm 11 默认对 lockfile 逐项重跑
    // minimumReleaseAge / trustPolicy 供应链复核，registry manifest 缺少
    // 平台子包时会误报（如 @crowdin/cli-*-arm64）。lockfile 来自刚克隆的
    // 官方前端仓库（HTTPS + 官方分支），属于可信来源，跳过复核安全。
    console.warn("  [fetch-frontend] pnpm install failed (lockfile supply-chain recheck or network issue), retrying once with --trust-lockfile...")
    install(" --trust-lockfile")
  }
  fetchI18n(abs)
  // 关键修复：前后端默认同源部署，官方前端 VITE_API_URL 的语义是「API 服务器
  // 基础 URL」，正确值为 "/"（同源，config.ts 会转成 location.origin）。若外部
  // 环境（如 EdgeOne 控制台环境变量）误设 VITE_API_URL=/api，官方前端会拼成
  // baseURL=/api/api，导致 API 请求双前缀、落到 SPA 兜底返回 HTML。
  // 这里构建前端时强制覆盖为 "/"，杜绝外部污染。
  run(`${cmd} run build`, {
    cwd: abs,
    env: { ...process.env, VITE_API_URL: "/" },
  })
  replaceDist(path.join(abs, "dist"))
}

function main() {
  console.log("[fetch-frontend] Fetching official frontend build artifacts...")

  // 1. 本地已构建产物目录（显式指定）
  const localDist = process.env.FRONTEND_DIST
  if (localDist) {
    const src = path.resolve(localDist)
    requireDist(src)
    replaceDist(src)
    return
  }

  // 2. 本地前端仓库目录（显式指定）
  const localRepo = process.env.FRONTEND_REPO
  if (localRepo) {
    buildLocalRepo(localRepo)
    return
  }

  // 3. 同级目录 ../OpenList-Frontend（monorepo 布局，自动探测）
  const siblingRepo = path.resolve(ROOT, "..", "OpenList-Frontend")
  if (fs.existsSync(path.join(siblingRepo, "package.json"))) {
    console.log(`  Detected sibling official frontend repo: ${siblingRepo}`)
    buildLocalRepo(siblingRepo)
    return
  }

  // 4. 从 Git 克隆并构建（默认兜底）
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openlist-frontend-"))
  console.log(`  Cloning official frontend: ${OFFICIAL_REPO_URL}#${OFFICIAL_REPO_REF}`)
  try {
    run(
      // -c core.autocrlf=false：禁用克隆端的换行符转换。Windows 上 autocrlf
      // 会把前端源码（含 index.html）检出为 CRLF，改变 vite 构建出的
      // dist/index.html 内容，进而导致产物哈希跨平台不一致。
      `git -c core.autocrlf=false clone --depth 1 --branch ${OFFICIAL_REPO_REF} ${OFFICIAL_REPO_URL} ${tmp}`,
    )
    buildLocalRepo(tmp)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

try {
  main()
} catch (err) {
  console.error("[fetch-frontend] Failed:", err?.message || err)
  process.exit(1)
}
