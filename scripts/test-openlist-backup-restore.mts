// Test OpenList backup JSON import and driver compatibility
import app from "../src/backend/index"
import { normalizeDriver } from "../src/backend/server/admin"
import { getDb, saveDb, resolvePath } from "../src/backend/internal/model/db"
import { getDriver } from "../src/backend/internal/op/storage"

let pass = 0
let fail = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    pass++
    console.log(`✅ ${msg}`)
  } else {
    fail++
    console.error(`❌ ${msg}`)
  }
}

console.log("=== 1. 测试驱动名称归一化 ===")
assert(normalizeDriver("115 Open") === "115Open", "115 Open -> 115Open")
assert(normalizeDriver("189CloudPC") === "Cloud189", "189CloudPC -> Cloud189")
assert(normalizeDriver("189CloudApp") === "Cloud189", "189CloudApp -> Cloud189")
assert(normalizeDriver("Baidu Netdisk") === "BaiduNetdisk", "Baidu Netdisk -> BaiduNetdisk")
assert(normalizeDriver("AliYunDriveShare2Open") === "AliyundriveOpen", "AliYunDriveShare2Open -> AliyundriveOpen")
assert(normalizeDriver("AliyundriveOpen") === "AliyundriveOpen", "AliyundriveOpen -> AliyundriveOpen")
assert(normalizeDriver("123PanShare") === "123Pan", "123PanShare -> 123Pan")
assert(normalizeDriver("Google Drive") === "GoogleDrive", "Google Drive -> GoogleDrive")
assert(normalizeDriver("OneDrive APP") === "OnedriveAPP", "OneDrive APP -> OnedriveAPP")
assert(normalizeDriver("WebDav") === "WebDav", "WebDav -> WebDav")
assert(normalizeDriver("ThunderBrowser") === "Thunder", "ThunderBrowser -> Thunder")

console.log("\n=== 2. 测试后端存储创建与驱动解析 ===")
const loginRes = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
const loginJson: any = await loginRes.json().catch(() => null)
console.log("loginJson:", loginJson)
const token = loginJson?.data?.token
assert(Boolean(token), "管理员登录成功")

const authHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
}

// Test creating a storage with OpenList driver name "115 Open" and object addition
const create115Res = await app.request("/api/admin/storage/create", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    mount_path: "/test-115",
    driver: "115 Open",
    addition: { root_folder_id: "0" },
    disabled: true, // disabled so it doesn't try network OAuth during test
  }),
})
const create115Json: any = await create115Res.json()
assert(create115Json.code === 200, "支持 '115 Open' 驱动名创建存储")
assert(create115Json.data?.driver === "115Open", "存储驱动名已归一化为 115Open")
assert(typeof create115Json.data?.addition === "string", "addition 已转换为合法 JSON 字符串")

// Test creating a storage with "189CloudPC"
const create189Res = await app.request("/api/admin/storage/create", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    mount_path: "/test-189",
    driver: "189CloudPC",
    addition: "{\"root_folder_id\":\"0\"}",
    disabled: true,
  }),
})
const create189Json: any = await create189Res.json()
assert(create189Json.code === 200, "支持 '189CloudPC' 驱动名创建存储")
assert(create189Json.data?.driver === "Cloud189", "存储驱动名已归一化为 Cloud189")

// Test rejecting invalid/undefined driver
const createInvalidRes = await app.request("/api/admin/storage/create", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    mount_path: "/test-invalid",
    driver: undefined,
    addition: "{}",
  }),
})
const createInvalidJson: any = await createInvalidRes.json()
assert(createInvalidJson.code === 400, "拒绝未定义 driver 的存储创建 (code 400)")

console.log("\n=== 3. 测试 resolvePath 容错与防崩溃 ===")
const db = await getDb()
// Intentionally inject a corrupt storage with undefined/empty driver into memory db
db.storages.push({
  id: 9999,
  mount_path: "/",
  driver: "undefined",
  disabled: false,
})
db.storages.push({
  id: 9998,
  mount_path: "",
  driver: "",
  disabled: false,
})

// Add one valid storage
db.storages.push({
  id: 100,
  mount_path: "/valid-pan",
  driver: "Pan115",
  addition: "{\"root_folder_id\":\"0\"}",
  disabled: false,
})

const resolved = await resolvePath("/valid-pan/test.txt")
assert(resolved.storage?.driver === "Pan115", "resolvePath 正常匹配有效存储，忽略无效/损坏记录")

// Ensure ensureDefaultStorages cleans corrupt records
const dbClean = await getDb()
assert(
  !dbClean.storages.some((s: any) => !s.driver || s.driver === "undefined" || s.driver === ""),
  "ensureDefaultStorages 自动清理掉无驱动/undefined 损坏记录",
)

console.log("\n=== 4. 测试 OpenList 备份 JSON 数据格式模拟恢复 ===")
// Simulate an unencrypted OpenList v3 backup JSON
const mockOpenListBackup = {
  version: "v3.39.0",
  settings: [
    { key: "site_title", value: "My OpenList Site", group: 1 },
  ],
  users: [
    { username: "admin", role: 2, permission: 0, base_path: "/" },
  ],
  storages: [
    {
      mount_path: "/aliyun",
      driver: "AliYunDriveShare2Open",
      addition: "{\"refresh_token\":\"test\"}",
      disabled: true,
    },
    {
      mount_path: "/baidu",
      driver: "Baidu Netdisk",
      addition: { refresh_token: "test_baidu" },
      disabled: true,
    },
    {
      mount_path: "/cloud189",
      driver: "189CloudPC",
      addition: "{\"refresh_token\":\"test_189\"}",
      disabled: true,
    },
  ],
  metas: [],
}

// Verify batch storage import
for (const rawStorage of mockOpenListBackup.storages) {
  const normDriver = normalizeDriver(rawStorage.driver)
  const addRes = await app.request("/api/admin/storage/create", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      ...rawStorage,
      driver: normDriver,
    }),
  })
  const addJson: any = await addRes.json()
  assert(addJson.code === 200, `成功导入并规范化驱动 [${rawStorage.driver}] -> [${normDriver}]`)
}

console.log(`\n测试完成: ${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
