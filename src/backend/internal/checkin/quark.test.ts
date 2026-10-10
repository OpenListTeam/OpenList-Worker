// 夸克签到核心逻辑单测。
//
// 重点覆盖：凭据里含字面 + 时不能用 form-urlencoded 语义解错、账号间失败隔离、
// POST 结果不确定时反查确认、响应里不得泄露凭据。

import test from "node:test"
import assert from "node:assert/strict"
import {
  REQUIRED_PARAMS,
  buildParams,
  checkinQuarkAccount,
  formatBytes,
  parseAccount,
  parseQuery,
  runQuarkCheckin,
  splitAccountEntries,
} from "./quark"
import { QuarkConfigError } from "./types"

/** 构造一个 fetch 桩：按 method+url 分派，并记录收到的原始 URL 与 body */
function makeFetch(
  handlers: Record<string, (url: string, init?: RequestInit) => Response>,
  seen?: { urls: string[]; bodies: string[] },
) {
  return async (input: string, init?: RequestInit): Promise<Response> => {
    seen?.urls.push(String(input))
    const body = init?.body ? String(init.body) : ""
    seen?.bodies.push(body)
    const method = (init?.method || "GET").toUpperCase()
    const handler = handlers[method]
    if (!handler) throw new Error("unexpected method: " + method)
    return handler(String(input), init)
  }
}

const INFO = "https://drive-m.quark.cn/1/clouddrive/capacity/growth/info"
const SIGN = "https://drive-m.quark.cn/1/clouddrive/capacity/growth/sign"

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

// ------------------------------------------------------------------
// splitAccountEntries
// ------------------------------------------------------------------

test("splitAccountEntries 支持换行与 && 分隔，忽略空条目", () => {
  assert.deepEqual(splitAccountEntries("a"), ["a"])
  assert.deepEqual(splitAccountEntries("a\nb\r\nc"), ["a", "b", "c"])
  assert.deepEqual(splitAccountEntries("a&&b"), ["a", "b"])
  assert.deepEqual(splitAccountEntries("") , [])
  assert.deepEqual(splitAccountEntries(null), [])
  assert.deepEqual(splitAccountEntries("  a  \n\n  b \n"), ["a", "b"])
})

// ------------------------------------------------------------------
// parseQuery —— 本次改动最关键的一点
// ------------------------------------------------------------------

test("parseQuery 不解 + 为空格（form-urlencoded 语义会毁掉凭据）", () => {
  const q = parseQuery("kps=a+b&sign=c%2Bd&vcode=e+f")
  assert.equal(q.kps, "a+b", "字面 + 必须保留")
  assert.equal(q.sign, "c+d", "仅做 percent-decode")
  assert.equal(q.vcode, "e+f")

  // URLSearchParams 会把它解成空格，这正是参考实现写说明要避开的行为
  const usp = new URLSearchParams("kps=a+b")
  assert.equal(usp.get("kps"), "a b", "对照：URLSearchParams 确实会毁掉 +")
})

test("parseQuery 只解百分号，不解其它转义", () => {
  const q = parseQuery("user=%E8%B4%A6%E5%8F%B7&kps=x")
  assert.equal(q.user, "账号")
  assert.equal(q.kps, "x")
})

test("parseQuery 忽略无值与空键，首个同名参数生效", () => {
  const q = parseQuery("&a=&=v&a=second&b=1")
  assert.equal(q.a, "", "先出现的空值占位，后一个不覆盖")
  assert.equal(q.b, "1")
  assert.equal(q[""], undefined)
})

test("parseQuery 遇到孤立 % 不抛错", () => {
  const q = parseQuery("kps=%E&sign=%")
  assert.equal(q.kps, "%E")
  assert.equal(q.sign, "%")
})

// ------------------------------------------------------------------
// parseAccount
// ------------------------------------------------------------------

const BASE =
  "user=alice&kps=K+S&sign=SIG&vcode=VC"

test("parseAccount 正常解析并带默认 user", () => {
  const a = parseAccount(BASE, 1)
  assert.equal(a.user, "alice")
  assert.equal(a.kps, "K+S")
  assert.equal(a.sign, "SIG")
  assert.equal(a.vcode, "VC")
})

test("parseAccount 缺 user 时给默认名", () => {
  const a = parseAccount("kps=k&sign=s&vcode=v", 3)
  assert.equal(a.user, "账号3")
})

test("parseAccount 缺任一凭据时报错，但不泄露任何值", () => {
  for (const p of REQUIRED_PARAMS) {
    const entry = REQUIRED_PARAMS.filter((x) => x !== p)
      .map((x) => `${x}=secret-${x}`)
      .join("&")
    assert.throws(
      () => parseAccount(entry, 2),
      (e: any) => {
        assert.ok(e instanceof QuarkConfigError)
        assert.match(e.message, new RegExp(p))
        for (const other of REQUIRED_PARAMS) {
          assert.ok(!e.message.includes("secret-" + other), "不得回显凭据值")
        }
        return true
      },
      `缺少 ${p} 应报错`,
    )
  }
})

test("parseAccount 兼容 url= 包裹形式", () => {
  const a = parseAccount(
    "user=bob&url=https://drive-m.quark.cn/x?kps=K%2BS&sign=S&vcode=V",
    1,
  )
  assert.equal(a.user, "bob")
  assert.equal(a.kps, "K+S")
  assert.equal(a.sign, "S")
  assert.equal(a.vcode, "V")
})

// ------------------------------------------------------------------
// buildParams
// ------------------------------------------------------------------

test("buildParams 固定 pr/fr，凭据原样编码", () => {
  const p = buildParams({ user: "u", kps: "a b+c", sign: "s", vcode: "v" })
  assert.ok(p.startsWith("pr=ucpro&fr=android&"))
  assert.ok(p.includes("kps=a%20b%2Bc"))
  assert.ok(p.includes("sign=s"))
  assert.ok(p.includes("vcode=v"))
})

// ------------------------------------------------------------------
// formatBytes
// ------------------------------------------------------------------

test("formatBytes 覆盖二进制进位与异常输入", () => {
  assert.equal(formatBytes(0), "0 B")
  assert.equal(formatBytes(-1), "0 B")
  assert.equal(formatBytes(undefined), "0 B")
  assert.equal(formatBytes(1023), "1023.00 B")
  assert.equal(formatBytes(1024), "1.00 KB")
  assert.equal(formatBytes(1024 * 1024), "1.00 MB")
  assert.equal(formatBytes(1024 * 1024 * 1024 * 1.5), "1.50 GB")
})

// ------------------------------------------------------------------
// checkinQuarkAccount
// ------------------------------------------------------------------

const ACCOUNT = { user: "u", kps: "k", sign: "s", vcode: "v" }

function notSignedInfo() {
  return jsonResponse({
    code: "0",
    status: 200,
    data: { cap_sign: { sign_daily: false, sign_progress: 2, sign_target: 7 } },
  })
}

function signedInfo(reward = 1048576, progress = 3, target = 7) {
  return jsonResponse({
    code: "0",
    status: 200,
    data: { cap_sign: { sign_daily: true, sign_daily_reward: reward, sign_progress: progress, sign_target: target } },
  })
}

test("今日已签则只发一次 GET，不再 POST（幂等）", async () => {
  const seen: { urls: string[]; bodies: string[] } = { urls: [], bodies: [] }
  const f = makeFetch({ GET: () => signedInfo(), POST: () => { throw new Error("不应 POST") } }, seen)

  const r = await checkinQuarkAccount(ACCOUNT, f as any)

  assert.equal(r.status, "skipped")
  assert.equal(r.reward, 1048576)
  assert.equal(r.progress, "3/7")
  assert.equal(seen.urls.length, 1)
  assert.ok(seen.urls[0].startsWith(INFO))
  assert.ok(seen.bodies.every((b) => b === ""))
})

test("未签则 POST，成功后解析 reward 与进度", async () => {
  const seen: { urls: string[]; bodies: string[] } = { urls: [], bodies: [] }
  const f = makeFetch(
    {
      GET: () => notSignedInfo(),
      POST: () => jsonResponse({ code: "0", data: { sign_daily_reward: 524288 } }),
    },
    seen,
  )

  const r = await checkinQuarkAccount(ACCOUNT, f as any)

  assert.equal(r.status, "ok")
  assert.equal(r.reward, 524288)
  assert.equal(r.progress, "2/7")
  assert.equal(seen.urls.length, 2)
  assert.ok(seen.urls[1].startsWith(SIGN))
  assert.deepEqual(JSON.parse(seen.bodies[1]), { sign_cyclic: true })
})

test("POST 网络失败后反查 info 确认已签（不重复签到）", async () => {
  let getCount = 0
  const f = makeFetch({
    GET: () => {
      getCount++
      return getCount === 1 ? notSignedInfo() : signedInfo()
    },
    POST: () => {
      throw new Error("network down" /* 模拟 fetch 网络层抛错 */)
    },
  })

  const r = await checkinQuarkAccount(ACCOUNT, f as any)

  assert.equal(r.status, "ok")
  assert.equal(r.reward, 1048576)
  assert.equal(getCount, 2, "应当用了两次 GET：一次前置查询，一次反查")
})

test("POST 网络失败且反查仍未签 → 报错（不谎报成功）", async () => {
  const f = makeFetch({
    GET: () => {
      throw new Error("network down")
    },
    POST: () => {
      throw new Error("network down")
    },
  })

  await assert.rejects(() => checkinQuarkAccount(ACCOUNT, f as any), /网络|失败/)
})

test("HTTP 非 2xx → 报错，且消息里不含凭据与 URL", async () => {
  const f = makeFetch({
    GET: () => jsonResponse({ code: "500", message: "boom" }, 500),
    POST: () => signedInfo(),
  })
  await assert.rejects(
    () => checkinQuarkAccount(ACCOUNT, f as any),
    (e: Error) => {
      assert.match(e.message, /HTTP 500|boom/)
      assert.ok(!e.message.includes(ACCOUNT.kps))
      assert.ok(!e.message.includes(ACCOUNT.sign))
      assert.ok(!e.message.includes(INFO))
      return true
    },
  )
})

test("响应体非 JSON → 报错而非崩溃", async () => {
  const f = makeFetch({
    GET: () => new Response("<html>nope</html>", { status: 200 }),
    POST: () => signedInfo(),
  })
  await assert.rejects(() => checkinQuarkAccount(ACCOUNT, f as any), /无法解析/)
})

test("info 缺少 cap_sign → 报成长信息失败", async () => {
  const f = makeFetch({
    GET: () => jsonResponse({ code: "0", data: {} }),
    POST: () => signedInfo(),
  })
  await assert.rejects(() => checkinQuarkAccount(ACCOUNT, f as any), /cap_sign|成长信息/)
})

// ------------------------------------------------------------------
// runQuarkCheckin
// ------------------------------------------------------------------

test("runQuarkCheckin 单账号失败不影响后续账号", async () => {
  const raw = ["user=a&kps=k1&sign=s1&vcode=v1", "user=b&kps=k2&sign=s2&vcode=v2"].join("\n")
  let call = 0
  const f = makeFetch({
    GET: () => {
      call++
      // 第一个账号服务端 500直接失败，第二个正常
      return call === 1
        ? jsonResponse({ code: "0", message: "upstream boom" }, 500)
        : signedInfo()
    },
    POST: () => jsonResponse({ code: "0", data: { sign_daily_reward: 1 } }),
  })

  const rs = await runQuarkCheckin(raw, f as any)
  assert.equal(rs.length, 2)
  assert.equal(rs[0].status, "failed")
  assert.equal(rs[1].status, "skipped")
})

test("runQuarkCheckin 空配置抛 QuarkConfigError", async () => {
  await assert.rejects(() => runQuarkCheckin("", makeFetch({}) as any), QuarkConfigError)
  await assert.rejects(() => runQuarkCheckin("   ", makeFetch({}) as any), QuarkConfigError)
})

test("runQuarkCheckin 把 index/user 补齐", async () => {
  const raw = "user=z&kps=a&sign=b&vcode=c"
  const f = makeFetch({ GET: () => signedInfo(), POST: () => signedInfo() })
  const rs = await runQuarkCheckin(raw, f as any)
  assert.equal(rs[0].index, 1)
  assert.equal(rs[0].user, "z")
})

test("runQuarkCheckin 的结果里绝不出现凭据值", async () => {
  const raw = "user=a&kps=SUPERSECRETKPS&sign=SUPERSECRETSIGN&vcode=SUPERSECRETVCODE"
  const f = makeFetch({
    GET: () => jsonResponse({ code: "401", message: "invalid sign" }, 401),
    POST: () => jsonResponse({}, 401),
  })
  const rs = await runQuarkCheckin(raw, f as any)
  const text = JSON.stringify(rs)
  for (const secret of ["SUPERSECRETKPS", "SUPERSECRETSIGN", "SUPERSECRETVCODE"]) {
    assert.ok(!text.includes(secret), `结果不得包含 ${secret}`)
  }
})