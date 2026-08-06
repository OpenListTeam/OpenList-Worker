// End-to-end share flow: create share → browse via /@s/ → download via /sd/
import app from "../src/backend/index"
import { writeFileSync } from "fs"

const rootFolder = process.cwd() + "/public_data"
writeFileSync(rootFolder + "/share-file-test.txt", "hello share")

const loginRes = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
const loginJson: any = await loginRes.json()
const token = loginJson.data?.token
const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

let pass = 0, fail = 0
const check = (name: string, ok: boolean, extra = "") => {
  if (ok) { pass++; console.log(`✅ ${name} ${extra}`) }
  else { fail++; console.log(`❌ ${name} ${extra}`) }
}

// Setup: local storage + shares
await app.request("/api/admin/storage/create", {
  method: "POST", headers: authHeaders,
  body: JSON.stringify({ mount_path: "/", driver: "Local", addition: JSON.stringify({ root_folder_path: rootFolder }), order: 0 }),
})
const shareBody = {
  id: "testshare1", files: ["/share-file-test.txt"], pwd: "1234",
  max_accessed: 0, disabled: false, expires: null,
  order_by: "", order_direction: "", extract_folder: "",
  remark: "", readme: "", header: "",
}
await app.request("/api/share/create", { method: "POST", headers: authHeaders, body: JSON.stringify(shareBody) })
const shareBody2 = { ...shareBody, id: "testshare2", files: ["/share-file-test.txt", "/"], pwd: "" }
await app.request("/api/share/create", { method: "POST", headers: authHeaders, body: JSON.stringify(shareBody2) })

// 1. Browse single-file share
const getRes = await app.request("/api/fs/get", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/testshare1", password: "1234" }),
})
const getJson: any = await getRes.json()
check("fs/get 单文件分享", getJson.code === 200 && getJson.data?.name === "share-file-test.txt" && getJson.data?.raw_url === "/api/sd/testshare1", `name=${getJson.data?.name}`)

// 2. Wrong password rejected
const badPwdRes = await app.request("/api/fs/get", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/testshare1", password: "wrong" }),
})
const badPwdJson: any = await badPwdRes.json()
check("错误密码被拒绝", badPwdJson.code === 400 && badPwdJson.message.includes("password"))

// 3. Nonexistent share rejected
const noShareRes = await app.request("/api/fs/get", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/nonexistent", password: "" }),
})
const noShareJson: any = await noShareRes.json()
check("不存在的分享被拒绝", noShareJson.code === 400)

// 4. Multi-file share root → virtual folder
const multiRes = await app.request("/api/fs/get", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/testshare2", password: "" }),
})
const multiJson: any = await multiRes.json()
check("多文件分享根为虚拟目录", multiJson.code === 200 && multiJson.data?.is_dir === true)

// 5. Multi-file share list
const multiListRes = await app.request("/api/fs/list", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/testshare2", password: "" }),
})
const multiListJson: any = await multiListRes.json()
check("多文件分享虚拟列表", multiListJson.code === 200 && Array.isArray(multiListJson.data?.content) && multiListJson.data.content.length >= 1, `items=${multiListJson.data?.content?.length}`)

// 6. Sub-path of multi-file share
const subRes = await app.request("/api/fs/get", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/testshare2/share-file-test.txt", password: "" }),
})
const subJson: any = await subRes.json()
check("多文件分享子路径", subJson.code === 200 && subJson.data?.name === "share-file-test.txt")

// 7. Download via /sd/ with Range
const sdRes = await app.request("/api/sd/testshare1?pwd=1234", {
  method: "GET", headers: { Range: "bytes=0-5" },
})
const sdBody = await sdRes.text()
check("/sd/ 分享下载（Range）", sdRes.status === 206 && sdBody === "hello ", `status=${sdRes.status} body="${sdBody}"`)

// 8. Disabled share rejected
await app.request("/api/share/disable?id=testshare1", { method: "POST", headers: authHeaders })
const disabledRes = await app.request("/api/fs/get", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/testshare1", password: "1234" }),
})
const disabledJson: any = await disabledRes.json()
check("禁用分享被拒绝", disabledJson.code === 400)

// 9. Expired share rejected
await app.request("/api/share/update", {
  method: "POST", headers: authHeaders,
  body: JSON.stringify({ ...shareBody2, id: "testshare2", expires: "2020-01-01T00:00:00Z" }),
})
const expiredRes = await app.request("/api/fs/get", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/@s/testshare2", password: "" }),
})
const expiredJson: any = await expiredRes.json()
check("过期分享被拒绝", expiredJson.code === 400)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
