// 测试 deploy.js 的解析与 wrangler.toml 更新逻辑（不调用真实 Cloudflare API）
const { execSync } = require("node:child_process")
const fs = require("node:fs")

// 1. 模拟 `wrangler kv namespace list` 表格输出（wrangler 4.x 格式）
const mockList = `
🌀 Listing namespaces with title filter "OpenListTeam-OpenListnext"
┌──────────────────────────────────────┬──────────────────────────────┐
│ id                                   │ title                        │
├──────────────────────────────────────┼──────────────────────────────┤
│ 0e48234248a84d4dbdc5a70e886773ea    │ openlistnextpro-OPENLISTNEXT_KV │
└──────────────────────────────────────┴──────────────────────────────┘
`
const re = /\|\s*([0-9a-fA-F]{32})\s*\|\s*([^|\n]+?)\s*\|/g
const map = {}
let m
while ((m = re.exec(mockList)) !== null) map[m[2].trim()] = m[1].trim()
console.log("解析 namespace:", JSON.stringify(map))
const found = Object.keys(map).find((t) => t.includes("OPENLISTNEXT_KV"))
console.log("匹配:", found, "→ id:", found ? map[found] : null)

// 2. 模拟 create 输出
const mockCreate = `
🌀 Creating namespace with title "OPENLISTNEXT_KV"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "OPENLISTNEXT_KV"
id = "abc123def456abc123def456abc123def4"
`
const idM = mockCreate.match(/id\s*=\s*"([0-9a-fA-F]{32})"/)
console.log("create 解析 id:", idM ? idM[1] : null)

// 3. wrangler.toml 更新逻辑
const toml = fs.readFileSync("wrangler.toml", "utf8")
const kvBlockRe = /(\[\[kv_namespaces\]\][\s\S]*?id\s*=\s*)"([^"]*)"/m
const newId = "abc123def456abc123def456abc123def4"
const updated = toml.replace(kvBlockRe, `$1"${newId}"`)
console.log("toml 更新后含新 id:", updated.includes(newId))
console.log(
  "toml 其他内容保留:",
  updated.includes('name = "openlistnextpro"') &&
    updated.includes('binding = "OPENLISTNEXT_KV"'),
)

// 4. 无 kv 块时追加
const noKv = 'name = "test"\nmain = "src/backend/worker.ts"\n'
const block = `\n[[kv_namespaces]]\nbinding = "OPENLISTNEXT_KV"\nid = "${newId}"\n`
const appended = noKv.replace(/\s*$/, "") + block
console.log(
  "无块追加成功:",
  appended.includes("[[kv_namespaces]]") && appended.includes(newId),
)

// 5. 原 wrangler.toml 的 id 提取
const origId = toml.match(
  /(\[\[kv_namespaces\]\][\s\S]*?id\s*=\s*"([^"]*)")/m,
)?.[2]
console.log("原 toml 现有 id:", origId)

// 恢复原文件
fs.writeFileSync("wrangler.toml", toml)
console.log("✅ 逻辑测试完成，wrangler.toml 已恢复")
