import app from "../src/backend/index"
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs"
import { generateTotpCode } from "../src/backend/pkg/totp"

const rootFolder = process.cwd() + "/public_data"
mkdirSync(rootFolder + "/tier3/sub/deep", { recursive: true })
writeFileSync(rootFolder + "/tier3/search-alpha.txt", "alpha")
writeFileSync(rootFolder + "/tier3/sub/search-beta.txt", "beta")
writeFileSync(rootFolder + "/tier3/sub/deep/search-gamma.txt", "gamma")
mkdirSync(rootFolder + "/tier3/search-folder", { recursive: true })
writeFileSync(rootFolder + "/tier3/search-folder/inside.txt", "inside")

let pass = 0
let fail = 0
const check = (name: string, ok: boolean, extra = "") => {
  if (ok) {
    pass++
    console.log(`✅ ${name} ${extra}`)
  } else {
    fail++
    console.log(`❌ ${name} ${extra}`)
  }
}

// ---- setup: admin login + local storage at /tier3 ----
const loginRes = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
const loginJson: any = await loginRes.json()
const token = loginJson.data?.token
const authHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
}
check("登录获取 token", !!token)

await app.request("/api/admin/storage/create", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    mount_path: "/tier3",
    driver: "Local",
    addition: JSON.stringify({
      root_folder_path: rootFolder + "/tier3",
    }),
    order: 0,
  }),
})

// ================= /fs/search =================
const searchAll = await app.request("/api/fs/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    parent: "/tier3",
    keywords: "search",
    scope: 0,
    page: 1,
    per_page: 100,
  }),
})
const searchAllJson: any = await searchAll.json()
const names = (searchAllJson.data?.content || []).map((n: any) => n.name)
check(
  "搜索全部命中 4 项",
  searchAllJson.code === 200 && searchAllJson.data?.total === 4,
  `total=${searchAllJson.data?.total} names=${names.join(",")}`,
)
check(
  "搜索命中含父路径与类型",
  names.includes("search-alpha.txt") &&
    names.includes("search-folder") &&
    (searchAllJson.data.content || []).every(
      (n: any) => typeof n.parent === "string" && n.parent.startsWith("/tier3"),
    ),
)

const searchFolder = await app.request("/api/fs/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    parent: "/tier3",
    keywords: "search",
    scope: 1,
    page: 1,
    per_page: 100,
  }),
})
const sfJson: any = await searchFolder.json()
check(
  "scope=1 仅目录",
  sfJson.code === 200 &&
    sfJson.data?.total === 1 &&
    sfJson.data?.content?.[0]?.is_dir === true &&
    sfJson.data.content[0].name === "search-folder",
  `total=${sfJson.data?.total}`,
)

const searchFile = await app.request("/api/fs/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    parent: "/tier3",
    keywords: "search",
    scope: 2,
    page: 1,
    per_page: 100,
  }),
})
const sf2Json: any = await searchFile.json()
check(
  "scope=2 仅文件",
  sf2Json.code === 200 &&
    sf2Json.data?.total === 3 &&
    sf2Json.data?.content?.every((n: any) => !n.is_dir),
  `total=${sf2Json.data?.total}`,
)

// pagination
const searchPage = await app.request("/api/fs/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    parent: "/tier3",
    keywords: "search",
    scope: 0,
    page: 2,
    per_page: 3,
  }),
})
const spJson: any = await searchPage.json()
check(
  "分页 page=2/per_page=3",
  spJson.code === 200 &&
    spJson.data?.total === 4 &&
    spJson.data?.content?.length === 1,
  `total=${spJson.data?.total} content=${spJson.data?.content?.length}`,
)

const searchNoHit = await app.request("/api/fs/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ parent: "/tier3", keywords: "zzz-none", scope: 0 }),
})
const snJson: any = await searchNoHit.json()
check("无命中返回空", snJson.code === 200 && snJson.data?.total === 0)

// ================= /fs/other dispatch =================
const otherNoMethod = await app.request("/api/fs/other", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "/tier3/search-alpha.txt" }),
})
const onmJson: any = await otherNoMethod.json()
check("other 缺 method → 400", onmJson.code === 400)

const otherUnsupported = await app.request("/api/fs/other", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    path: "/tier3/search-alpha.txt",
    method: "video_preview",
  }),
})
const ousJson: any = await otherUnsupported.json()
check(
  "other 不支持的驱动 → 明确报错",
  ousJson.code === 500 && ousJson.message.includes("does not support other"),
  ousJson.message,
)

// ================= TOTP 2FA =================
// 1. generate
const genRes = await app.request("/api/auth/2fa/generate", {
  method: "POST",
  headers: authHeaders,
})
const genJson: any = await genRes.json()
const secret: string = genJson.data?.secret || ""
check(
  "2fa/generate 返回 secret+qr",
  genJson.code === 200 && /^[A-Z2-7]{32}$/.test(secret) && !!genJson.data?.qr,
  `secret=${secret}`,
)

// 2. verify code → enable
const code = await generateTotpCode(secret)
const verifyRes = await app.request("/api/auth/2fa/verify", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ code, secret }),
})
const verifyJson: any = await verifyRes.json()
check("2fa/verify 启用成功", verifyJson.code === 200)

// 3. login without code → 402
const loginNoOtp = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
const lnoJson: any = await loginNoOtp.json()
check("启用后无码登录 → 402", lnoJson.code === 402, `code=${lnoJson.code}`)

// 4. login with wrong code → 401
const wrongCode = code === "000000" ? "000001" : "000000"
const loginWrong = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "admin",
    password: "admin",
    otp_code: wrongCode,
  }),
})
const lwJson: any = await loginWrong.json()
check("错误验证码 → 401", lwJson.code === 401, `code=${lwJson.code}`)

// 5. login with correct code → 200
const loginWithOtp = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin", otp_code: code }),
})
const lwoJson: any = await loginWithOtp.json()
check("正确验证码 → 200", lwoJson.code === 200 && !!lwoJson.data?.token)

// 6. /me exposes otp flag
const meRes = await app.request("/api/me", {
  headers: { Authorization: `Bearer ${lwoJson.data?.token}` },
})
const meJson: any = await meRes.json()
check("/me 返回 otp=true", meJson.code === 200 && meJson.data?.otp === true)

// 7. admin cancel_2fa
const cancelRes = await app.request("/api/admin/user/cancel_2fa?id=1", {
  method: "POST",
  headers: authHeaders,
})
const cancelJson: any = await cancelRes.json()
check("admin cancel_2fa 成功", cancelJson.code === 200)

// 8. login again without code → 200 (2FA removed)
const loginAfterCancel = await app.request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
const lacJson: any = await loginAfterCancel.json()
check("取消后无码登录 → 200", lacJson.code === 200)

// ---- cleanup ----
rmSync(rootFolder + "/tier3", { recursive: true, force: true })
if (existsSync(rootFolder + "/share-file-test.txt")) {
  rmSync(rootFolder + "/share-file-test.txt")
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
