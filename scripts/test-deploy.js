// deploy.js / wrangler.jsonc 相关约束的回归测试
//
// 【历史】本文件原先测试 deploy.js 中解析 `wrangler kv namespace list` 表格
// 与 `kv namespace create` 输出的逻辑。该逻辑已废弃（见 deploy.js 末尾的注释块
// 与 Issue #34）：wrangler 的自动预配无法按 title 复用已有命名空间，脚本手动
// 创建只会产生孤儿资源并导致重复创建冲突。
//
// 现在 KV 由 wrangler.jsonc 中的 kv_namespaces 声明（省略 id 字段）自动创建
// 与绑定，deploy.js 不再包含任何 KV 解析逻辑，因此这里只保留对关键约束的静态
// 校验，防止有人又把脚本级 KV 创建逻辑加回来。
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const deploySrc = readFileSync(path.join(ROOT, "scripts/deploy.js"), "utf8")
const configSrc = readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8")

// 剥掉注释：文档说明与废弃实现里都会出现这些关键字，必须先排除。
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // 块注释（含文件头文档与废弃块）
    .replace(/(^|[^:])\/\/.*$/gm, "$1") // 行注释（避免误伤 http:// 之类）
}

// ── 1. deploy.js 的生效代码不应再主动创建 KV namespace ───────────────
const activeSrc = stripComments(deploySrc)
assert.ok(
  !/wrangler kv namespace create/.test(activeSrc),
  "deploy.js 的生效代码不应调用 `wrangler kv namespace create`（应交给 wrangler 自动预配）",
)
assert.ok(
  !/ensureKvNamespace\s*\(/.test(activeSrc),
  "deploy.js 的生效代码不应调用 ensureKvNamespace()",
)
console.log("✅ deploy.js 未主动创建 KV namespace")

// ── 2. deploy.js 会执行 wrangler deploy ─────────────────────────────
assert.ok(
  /npx wrangler deploy/.test(deploySrc),
  "deploy.js 应调用 `npx wrangler deploy`",
)
console.log("✅ deploy.js 会执行 wrangler deploy")

// ── 3. wrangler.jsonc 声明了 KV 绑定 ────────────────────────────────
// 只匹配行首未被注释的声明，避免命中说明文字里的示例。
// 兼容单行（"kv_namespaces": [{ ... }]）与多行两种写法。
const m = configSrc.match(/^\s*"kv_namespaces"\s*:\s*\[([\s\S]*?)\]/m)
assert.ok(m, 'wrangler.jsonc 应声明 "kv_namespaces"')
const kvEntry = m[1].match(/\{([^}]*)\}/)
assert.ok(kvEntry, '"kv_namespaces" 应包含至少一个绑定对象')
assert.match(kvEntry[1], /"binding"\s*:\s*"KV"/, 'KV 绑定的 binding 应为 "KV"')
console.log("✅ wrangler.jsonc 声明了 KV 绑定")

// ── 4. 该绑定必须省略 id（不能写 "id": ""，否则 wrangler 校验失败）──
assert.ok(
  !/"id"\s*:/.test(kvEntry[1]),
  'kv_namespaces 的 KV 绑定应完全省略 id 字段（"id": "" 会被 wrangler 拒绝）',
)
console.log("✅ KV 绑定省略了 id 字段")

console.log("\n✅ 全部通过")
