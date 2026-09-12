// 测试 deploy.js 中 wrangler 输出解析逻辑（不调用真实 Cloudflare API）
//
// 覆盖：`wrangler kv namespace list` 表格解析、`kv namespace create` id 提取。
// 这些解析依赖 wrangler 的输出格式，容易因版本变化悄悄失效，因此单独验证。
import assert from "node:assert/strict"

// ── 被测逻辑（与 deploy.js 保持同步）──────────────────────────────

/** 解析 `wrangler kv namespace list` 的表格输出，返回 { title: id } */
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

// ── 1. list 解析（Unicode 边框，wrangler 4.x 常见形态）──────────────
const unicodeList = `
🌀 Listing namespaces with title filter "OpenListTeam-OpenList"
┌──────────────────────────────────┬──────────────────────┐
│ id                               │ title                │
├──────────────────────────────────┼──────────────────────┤
│ 0e48234248a84d4dbdc5a70e886773ea │ openlist-KV          │
└──────────────────────────────────┴──────────────────────┘
`
const u = parseNamespaceList(unicodeList)
assert.equal(u["openlist-KV"], "0e48234248a84d4dbdc5a70e886773ea")
assert.equal(Object.keys(u).length, 1)
console.log("✅ list 解析（Unicode 边框）")

// ── 2. list 解析（ASCII 竖线）────────────────────────────────────
const asciiList = `
| id                               | title     |
| 0123456789abcdef0123456789abcdef | KV        |
`
const a = parseNamespaceList(asciiList)
assert.equal(a["KV"], "0123456789abcdef0123456789abcdef")
console.log("✅ list 解析（ASCII 竖线）")

// ── 3. list 解析（无 namespace）→ 空映射 ─────────────────────────
assert.deepEqual(parseNamespaceList("No namespaces found"), {})
console.log("✅ 空列表解析")

// ── 4. create 输出提取 id（含 ANSI 颜色码）────────────────────────
// KV namespace id 为 32 位十六进制字符
const SAMPLE_ID = "0123456789abcdef0123456789abcdef"
assert.equal(SAMPLE_ID.length, 32)
const mockCreate = `
\x1b[32m✨ Success!\x1b[0m
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "KV"
id = "${SAMPLE_ID}"
`
assert.equal(parseCreatedId(mockCreate), SAMPLE_ID)
console.log("✅ create id 提取（剥离 ANSI）")

// ── 5. create 输出无 id → null ───────────────────────────────────
assert.equal(parseCreatedId("something went wrong"), null)
console.log("✅ 无 id 时返回 null")

console.log("\n✅ 全部通过")
