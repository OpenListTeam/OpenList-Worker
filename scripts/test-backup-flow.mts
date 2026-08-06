// Simulate the frontend backup() flow against the backend
import app from "../src/backend/index"

const loginRes = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
const loginJson: any = await loginRes.json()
const token = loginJson.data?.token
if (!token) throw new Error("login failed")

const authHeaders = { Authorization: `Bearer ${token}` }

// Same items as backup() in backup-restore.tsx
const items = [
  { name: "settings", path: "/api/admin/setting/list", page: false },
  { name: "users", path: "/api/admin/user/list", page: true },
  { name: "storages", path: "/api/admin/storage/list", page: true },
  { name: "metas", path: "/api/admin/meta/list", page: true },
  { name: "shares", path: "/api/share/list", page: true },
] as const

let pass = 0
let fail = 0
const allData: any = {}

for (const item of items) {
  const res = await app.request(item.path, { method: "GET", headers: authHeaders })
  const resp: any = await res.json().catch(() => null)
  if (resp && resp.code === 200 && resp.message !== undefined) {
    pass++
    const data = resp.data
    allData[item.name] = item.page ? data.content : data
    console.log(`✅ ${item.name}: code=200 content=${item.page ? data.content.length : data.length}`)
  } else {
    fail++
    console.log(`❌ ${item.name}:`, JSON.stringify(resp))
  }
}

// Verify encrypted backup simulation
import crypto from "crypto-js"
const password = "test"
const encrypt = (data: any, key: string) =>
  crypto.AES.encrypt(JSON.stringify(data), key).toString()
const encryptedSettings = allData.settings.map((s: any) => ({
  ...s,
  value: encrypt(s.value, password),
}))
const decrypted = crypto.AES.decrypt(encryptedSettings[0].value, password).toString(crypto.enc.Utf8)
const roundTripOk = JSON.parse(decrypted) === allData.settings[0].value
console.log(`${roundTripOk ? "✅" : "❌"} 加密-解密往返一致`)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
