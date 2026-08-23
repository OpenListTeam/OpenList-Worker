// Inspect deployed EdgeOne site for mounted storages, files, and errors
const BASE_URL = "https://openlistnext-wmycufum.edgeone.dev"

async function main() {
  console.log(`=== 正在检查 EdgeOne 部署站点: ${BASE_URL} ===\n`)

  // 1. 检查根目录 /fs/list
  console.log("1. 获取根目录列表 (/api/fs/list)...")
  try {
    const res = await fetch(`${BASE_URL}/api/fs/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/", password: "", page: 1, per_page: 0, refresh: true }),
    })
    console.log(`HTTP 状态码: ${res.status}`)
    const json = await res.json()
    console.log("响应结果:", JSON.stringify(json, null, 2))

    if (json.code === 200 && json.data?.content) {
      const items = json.data.content
      console.log(`\n发现 ${items.length} 个挂载存储/文件:`)
      for (const item of items) {
        console.log(` - [${item.is_dir ? "目录" : "文件"}] ${item.name}`)
      }

      // 遍历每个挂载目录
      for (const item of items) {
        if (item.is_dir) {
          const mountPath = `/${item.name}`
          console.log(`\n----------------------------------------`)
          console.log(`正在检查挂载点: ${mountPath}`)
          await inspectPath(mountPath)
        }
      }
    }
  } catch (err) {
    console.error("检查根目录失败:", err)
  }
}

async function inspectPath(pathStr) {
  try {
    const res = await fetch(`${BASE_URL}/api/fs/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathStr, password: "", page: 1, per_page: 5, refresh: true }),
    })
    const json = await res.json()
    if (json.code !== 200) {
      console.log(`❌ [${pathStr}] /fs/list 失败: code=${json.code}, message="${json.message}"`)
      return
    }
    const subItems = json.data?.content || []
    console.log(`✅ [${pathStr}] 成功列出，包含 ${subItems.length} 个子项 (提供方: ${json.data?.provider || "未知"})`)

    // 测试前 2 个文件的详情与直链获取
    for (const sub of subItems.slice(0, 2)) {
      const subPath = `${pathStr}/${sub.name}`.replace(/\/{2,}/g, "/")
      if (!sub.is_dir) {
        await inspectFile(subPath)
      }
    }
  } catch (err) {
    console.log(`❌ [${pathStr}] 请求异常:`, err.message)
  }
}

async function inspectFile(filePath) {
  console.log(`   -> 测试文件详情: ${filePath}`)
  try {
    const getRes = await fetch(`${BASE_URL}/api/fs/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, password: "" }),
    })
    const getJson = await getRes.json()
    if (getJson.code !== 200) {
      console.log(`   ❌ /fs/get 失败: ${getJson.message}`)
      return
    }
    const rawUrl = getJson.data?.raw_url
    console.log(`   ✅ /fs/get 成功: raw_url=${rawUrl?.slice(0, 80)}...`)

    // 测试短路径代理 /api/p/ 或 /d/
    const proxyUrl = `${BASE_URL}/api/p${encodeURI(filePath)}`
    console.log(`   -> 测试代理下载/预览: ${proxyUrl}`)
    const pRes = await fetch(proxyUrl, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    console.log(`   -> /api/p 状态码: ${pRes.status} (${pRes.statusText})`)
    if (pRes.status >= 400) {
      const pText = await pRes.text()
      console.log(`   ❌ /api/p 响应内容: ${pText.slice(0, 200)}`)
    }
  } catch (err) {
    console.log(`   ❌ 测试文件异常:`, err.message)
  }
}

main()
