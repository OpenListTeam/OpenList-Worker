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
 *   4. 默认：下载 npm 上【已发布】的 dist（版本取 registry 的 latest，
 *      可用 FRONTEND_VERSION 固定）
 *   5. FRONTEND_BUILD_FROM_SOURCE=1：从 Git 克隆前端 main 分支并现构建
 *
 * 为什么默认取「已发布 dist」而不是「克隆 main 现构建」：
 *   前端产物是内容哈希文件名（/assets/index-XXXX.js），而 CDN（jsdelivr /
 *   unpkg / npmmirror）提供的正是 npm 包里那一份 dist。若本地从 main 现构建，
 *   哈希与 CDN 上的不一致，ASSET_URLS 的「路径 A」（下发本地 index.html +
 *   CDN 资产，见 src/backend/server/assets.ts）HEAD 探测必然失败，只能退化到
 *   拉 CDN 的 index.html；而 npmmirror 等镜像禁止访问 .html（451），于是 CDN
 *   完全用不了。取已发布 dist 可让两边哈希天然同源：路径 A 命中，npmmirror
 *   可用（等价 Go Release 版行为）。同时 stampFrontendVersion 会把该版本号写进
 *   index.html，使 ASSET_URLS 的 $version 正好解析到这份 dist 对应的版本。
 *
 * 用法：
 *   FRONTEND_DIST=/path/to/dist node scripts/fetch-frontend.mjs
 *   FRONTEND_REPO=../OpenList-Frontend node scripts/fetch-frontend.mjs
 *   FRONTEND_VERSION=4.2.6 node scripts/fetch-frontend.mjs
 *   FRONTEND_BUILD_FROM_SOURCE=1 node scripts/fetch-frontend.mjs
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

// 已发布 dist 的来源（默认路径）。ASSET_URLS 指向的 CDN 提供的正是这份 npm
// 包内容，取它才能保证内容哈希与 CDN 同源（见文件头说明）。
const REGISTRY_URL =
  process.env.FRONTEND_REGISTRY || "https://registry.npmjs.org"
const PKG_NAME =
  process.env.FRONTEND_PKG || "@openlist-frontend/openlist-frontend"

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
  stampFrontendVersion(src)
  console.log(`✓ Frontend dist ready (${DEST})`)
}

/**
 * 构建期戳：把前端版本号写入 dist/index.html 的 <meta name="frontend-version">。
 *
 * 运行时 ASSET_URLS 的 $version 占位符优先从这里取值——版本与本次构建的 dist
 * 同源产生，保证 CDN 地址指向的版本与实际部署的前端一致（否则哈希资产会 404）。
 * 前端仓库不存在（如仅提供预构建 dist）时跳过，运行时回退 latest。
 */
function stampFrontendVersion(src) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(path.resolve(src, ".."), "package.json"), "utf-8"),
    )
    // 只信任官方前端包的版本号：FRONTEND_DIST 可能指向任意目录，
    // 误读（例如 worker 自身 package.json 的 4.2.3）会戳出错误的 CDN 版本。
    if (!/openlist-frontend/i.test(pkg?.name || "")) return
    const version = pkg?.version
    if (!version) return
    const idx = path.join(DEST, "index.html")
    let html = fs.readFileSync(idx, "utf-8")
    if (/name=["']frontend-version["']/.test(html)) return
    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1>\n    <meta name="frontend-version" content="${version}">`,
    )
    fs.writeFileSync(idx, html)
    console.log(`  Stamped frontend-version ${version} into dist/index.html`)
  } catch (err) {
    console.warn(
      `  [fetch-frontend] stamp frontend-version skipped: ${err?.message || err}`,
    )
  }
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

/**
 * 下载 npm 上【已发布】的前端 dist。
 *
 * 版本取 FRONTEND_VERSION，未设置时取 registry 的 latest dist-tag。tarball 里
 * 只解出 package/dist 与 package/package.json —— 后者供 stampFrontendVersion
 * 读出真实发布版本号（解出 LICENSE/README 没有意义）。
 *
 * 失败时直接抛错终止构建，不静默回退到「克隆 main 现构建」：那条路产出的哈希
 * 与 CDN 不一致，会让 ASSET_URLS 的路径 A 悄悄失效（npmmirror 直接不可用）。
 * 确实需要现构建时显式设置 FRONTEND_BUILD_FROM_SOURCE=1。
 */
async function fetchPublishedDist() {
  console.log(`  Querying registry: ${REGISTRY_URL} (${PKG_NAME})`)
  const res = await fetch(`${REGISTRY_URL}/${PKG_NAME}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    throw new Error(`registry metadata request failed: HTTP ${res.status}`)
  }
  const meta = await res.json()
  const version = process.env.FRONTEND_VERSION || meta?.["dist-tags"]?.latest
  if (!version) {
    throw new Error(
      `cannot determine version: no dist-tags.latest for ${PKG_NAME}`,
    )
  }
  const tarball = meta?.versions?.[version]?.dist?.tarball
  if (!tarball) {
    throw new Error(`version ${version} is not published for ${PKG_NAME}`)
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openlist-frontend-npm-"))
  const tgz = path.join(tmp, "pkg.tgz")
  try {
    console.log(`  Downloading published dist: ${PKG_NAME}@${version}`)
    run(`curl -fL --retry 3 -o "${tgz}" "${tarball}"`)
    // 以 tmp 为 cwd、用相对路径解包：Windows 上 tar 会把 "C:\\..." 里的盘符冒号
    // 当成远程主机（"Cannot connect to C: resolve failed"），不能把绝对路径喂给 tar。
    run(`tar -xzf pkg.tgz package/dist package/package.json`, { cwd: tmp })
    const src = path.join(tmp, "package", "dist")
    requireDist(src)
    replaceDist(src)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

async function main() {
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

  // 4. 下载 npm 上已发布的 dist（默认）
  //    从 main 现构建的产物哈希与 CDN 不一致，会让路径 A 失效、npmmirror 之类的
  //    镜像完全不可用（详见文件头），故默认改为取已发布产物。
  if (process.env.FRONTEND_BUILD_FROM_SOURCE !== "1") {
    await fetchPublishedDist()
    return
  }

  // 5. 从 Git 克隆 main 并构建（FRONTEND_BUILD_FROM_SOURCE=1 时使用）
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
  await main()
} catch (err) {
  console.error("[fetch-frontend] Failed:", err?.message || err)
  process.exit(1)
}
