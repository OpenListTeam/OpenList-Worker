import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import { isTrustedLanzouApiUrl, LanzouClient, parseFnPage } from "./util"
import { removeJSComment } from "./help"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

const SHARE_DOMAIN = "https://pan.lanzoui.com"
const SHARE_ID = "b00test"

const SHARE_PAGE = `<html><head><title>测试文件.zip - 蓝奏云</title></head><body>
<iframe class="ifr2" src="/fn?abcd1234" frameborder="0"></iframe>
</body></html>`

/** 2026-10 改版 /fn 内页：下载接口为 apifile 绝对地址 + 签名参数 */
const FN_PAGE = `<html><body><script>
var domain1='https://apifile.woozooo.com/ajaxfile.php?file=1234567';
var wp_sign='SIGNVALUE';
var ajaxdata='DATAVALUE';
$('#down').click(function(){
  $.post(domain1,{'action':'downprocess','websignkey':ajaxdata,'signs':ajaxdata,'sign':wp_sign,'websign':'2','kd':1,'ves':1});
});
</script></body></html>`

/** 旧版 /fn 内页：相对路径 + data 对象 */
const LEGACY_FN_PAGE = `<html><body><script>
$("#go").click(function(){
  $.ajax({type:'post', url:'/ajaxm.php?file=888', data:{action:'downprocess', signs:'OLDSIGN', sign:'OLDSIGN2', websign:'2', kd:1, ves:1}, dataType:'json'});
});
</script></body></html>`

interface CapturedPost {
  url: string
  form: URLSearchParams
  headers: Record<string, string>
}

/** 安装 fetch 桩：/fn 内页返回 fnPage，下载接口返回 JSON，直链探测 302 到 CDN */
function installFetch(fnPage: string): {
  posts: CapturedPost[]
  gets: string[]
} {
  const posts: CapturedPost[] = []
  const gets: string[] = []
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = typeof input === "string" ? input : input.url
    const method = (init.method || "GET").toUpperCase()

    if (url.includes("/fn?")) {
      gets.push(url)
      return new Response(fnPage, { status: 200 })
    }
    if (method === "POST") {
      posts.push({
        url,
        form: new URLSearchParams(String(init.body || "")),
        headers: init.headers || {},
      })
      return new Response(
        JSON.stringify({ zt: 1, dom: "https://dev.lanzou.com", url: "abcdef" }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }
    if (url.includes("/file/")) {
      return new Response(null, {
        status: 302,
        headers: { location: "https://cdn.example.com/real.zip" },
      })
    }
    throw new Error(`unexpected request: ${method} ${url}`)
  }) as typeof fetch
  return { posts, gets }
}

function newClient(): LanzouClient {
  return new LanzouClient({ type: "url", shareUrl: SHARE_DOMAIN })
}

test("parseFnPage extracts apifile url and sign form", () => {
  const parsed = parseFnPage(FN_PAGE)
  assert.ok(parsed)
  assert.equal(
    parsed!.url,
    "https://apifile.woozooo.com/ajaxfile.php?file=1234567",
  )
  assert.equal(parsed!.fileId, "1234567")
  assert.deepEqual(parsed!.form, {
    action: "downprocess",
    websignkey: "DATAVALUE",
    signs: "DATAVALUE",
    sign: "SIGNVALUE",
    websign: "2",
    kd: "1",
    ves: "1",
  })
})

test("parseFnPage returns null for legacy page", () => {
  assert.equal(parseFnPage(LEGACY_FN_PAGE), null)
})

test("parseFnPage returns null when sign vars are missing", () => {
  // 只有 domain1、缺 wp_sign / ajaxdata：不算改版结构，交给旧版兜底
  const partial = `<script>var domain1='https://apifile.woozooo.com/ajaxfile.php?file=42';</script>`
  assert.equal(parseFnPage(partial), null)

  const noAjaxData = `<script>
var domain1='https://apifile.woozooo.com/ajaxfile.php?file=42';
var wp_sign='S';
</script>`
  assert.equal(parseFnPage(noAjaxData), null)
})

test("removeJSComment keeps url '//' but strips real comments", () => {
  const src = [
    "var a = 'https://apifile.woozooo.com/ajaxfile.php?file=1' // 行注释",
    "/* 块注释 */ var b = 1;",
  ].join("\n")
  const out = removeJSComment(src)
  assert.ok(out.includes("https://apifile.woozooo.com/ajaxfile.php?file=1"))
  assert.ok(!out.includes("行注释"))
  assert.ok(!out.includes("块注释"))
  assert.ok(out.includes("var b = 1;"))
})

test("removeJSComment keeps protocol-relative urls inside strings", () => {
  // 评审 P2：src="//cdn..." 的前两个字符也是 '//' 且前面是引号，不能当行注释截断
  const src = `<script src="//cdn.woozooo.com/x.js"></script> var b = 1 // 真注释`
  const out = removeJSComment(src)
  assert.ok(out.includes("//cdn.woozooo.com/x.js"))
  assert.ok(!out.includes("真注释"))
  assert.ok(out.includes("var b = 1"))
})

test("isTrustedLanzouApiUrl only allows https lanzou hosts", () => {
  // 可信：蓝奏云自家域（含子域）
  assert.equal(
    isTrustedLanzouApiUrl("https://apifile.woozooo.com/ajaxfile.php?file=1"),
    true,
  )
  assert.equal(isTrustedLanzouApiUrl("https://user.lanzn.com/fn?x=1"), true)
  assert.equal(
    isTrustedLanzouApiUrl("https://pan.lanzoui.com/ajaxfile.php?file=1"),
    true,
  )
  // 不可信：非 https
  assert.equal(
    isTrustedLanzouApiUrl("http://apifile.woozooo.com/ajaxfile.php?file=1"),
    false,
  )
  // 不可信：近似域（evilwoozooo.com 不是 .woozooo.com 的子域）
  assert.equal(
    isTrustedLanzouApiUrl(
      "https://apifile.evilwoozooo.com/ajaxfile.php?file=1",
    ),
    false,
  )
  assert.equal(
    isTrustedLanzouApiUrl("https://apifile.woozooo.com.evil.com/ajaxfile.php"),
    false,
  )
  // 不可信：userinfo 伪装（apifile.woozooo.com@evil.com 的主机是 evil.com）
  assert.equal(
    isTrustedLanzouApiUrl("https://apifile.woozooo.com@evil.com/ajaxfile.php"),
    false,
  )
  // 不可信：loopback / 私网 / 内网元数据地址
  assert.equal(
    isTrustedLanzouApiUrl("https://127.0.0.1/ajaxfile.php?file=1"),
    false,
  )
  assert.equal(
    isTrustedLanzouApiUrl("https://169.254.169.254/ajaxfile.php?file=1"),
    false,
  )
  assert.equal(
    isTrustedLanzouApiUrl("https://10.0.0.5/ajaxfile.php?file=1"),
    false,
  )
  assert.equal(
    isTrustedLanzouApiUrl("https://[::1]/ajaxfile.php?file=1"),
    false,
  )
  // 不可信：非法 URL
  assert.equal(isTrustedLanzouApiUrl("not a url"), false)
})

test("new /fn structure posts to absolute apifile url with sign form", async () => {
  const { posts, gets } = installFetch(FN_PAGE)
  const file = await newClient().getFilesByShareUrl(
    SHARE_ID,
    "",
    SHARE_PAGE,
    SHARE_DOMAIN,
  )

  assert.deepEqual(gets, [`${SHARE_DOMAIN}/fn?abcd1234`])
  assert.equal(posts.length, 1)
  assert.equal(
    posts[0].url,
    "https://apifile.woozooo.com/ajaxfile.php?file=1234567",
  )
  assert.equal(posts[0].form.get("action"), "downprocess")
  assert.equal(posts[0].form.get("websignkey"), "DATAVALUE")
  assert.equal(posts[0].form.get("signs"), "DATAVALUE")
  assert.equal(posts[0].form.get("sign"), "SIGNVALUE")
  assert.equal(posts[0].form.get("websign"), "2")
  // 与上游 Go 版一致：跨域 POST 的 Referer 回落为 baseUrl
  assert.equal(posts[0].headers["Referer"], "https://pc.woozooo.com")

  assert.equal(file.name_all, "测试文件.zip")
  assert.equal(file.url, "https://cdn.example.com/real.zip")
})

test("legacy /fn structure still posts to share-domain ajaxfile.php", async () => {
  const { posts } = installFetch(LEGACY_FN_PAGE)
  const file = await newClient().getFilesByShareUrl(
    SHARE_ID,
    "",
    SHARE_PAGE,
    SHARE_DOMAIN,
  )

  assert.equal(posts.length, 1)
  assert.equal(`${SHARE_DOMAIN}/ajaxfile.php?file=888`, posts[0].url)
  assert.equal(posts[0].form.get("signs"), "OLDSIGN")
  assert.equal(file.url, "https://cdn.example.com/real.zip")
})

test("absolute iframe src is used as-is instead of being prefixed", async () => {
  const { gets, posts } = installFetch(FN_PAGE)
  const subDomain = "https://user.lanzn.com"
  const page = `<html><body><iframe src="${subDomain}/fn?abcd1234"></iframe></body></html>`

  await newClient().getFilesByShareUrl(SHARE_ID, "", page, subDomain)

  assert.deepEqual(gets, [`${subDomain}/fn?abcd1234`])
  assert.equal(
    posts[0].url,
    "https://apifile.woozooo.com/ajaxfile.php?file=1234567",
  )
})

test("legacy markers win when the page carries both legacy and fn structure", async () => {
  // 优先级约定：旧版严格正则先命中就不再看 /fn 结构（与上游 Go 版一致）
  const mixed = `<html><body><script>
var domain1='https://apifile.woozooo.com/ajaxfile.php?file=999';
var wp_sign='NEWSIGN';
var ajaxdata='NEWDATA';
$("#go").click(function(){
  $.ajax({type:'post', url:'/ajaxm.php?file=777', data:{action:'downprocess', signs:'OLDSIGN', sign:'OLDSIGN2', websign:'2', kd:1, ves:1}, dataType:'json'});
});
</script></body></html>`

  const { posts } = installFetch(mixed)
  await newClient().getFilesByShareUrl(SHARE_ID, "", SHARE_PAGE, SHARE_DOMAIN)

  assert.equal(posts.length, 1)
  assert.equal(`${SHARE_DOMAIN}/ajaxfile.php?file=777`, posts[0].url)
  assert.equal(posts[0].form.get("signs"), "OLDSIGN")
})

test("unrecognized page reports an actionable error instead of 'not find file id'", async () => {
  const unknown = `<html><body><script>
$("#go").click(function(){
  $.ajax({type:'post', url:'/somethingelse.php', data:{action:'downprocess'}, dataType:'json'});
});
</script></body></html>`

  installFetch(unknown)
  await assert.rejects(
    () =>
      newClient().getFilesByShareUrl(SHARE_ID, "", SHARE_PAGE, SHARE_DOMAIN),
    /未能识别下载页结构/,
  )
})

test("fn page pointing outside lanzou domains is rejected (SSRF guard)", async () => {
  // 评审 P1：domain1 由远端页面内容决定，指向非蓝奏云域时必须拒绝，
  // 且不能发出任何请求（ Cookie 不得外送）
  for (const badHost of [
    "https://evil.example.com",
    "https://127.0.0.1",
    "https://169.254.169.254",
    "http://apifile.woozooo.com",
  ]) {
    const evil = FN_PAGE.replace("https://apifile.woozooo.com", badHost)
    const { posts } = installFetch(evil)
    await assert.rejects(
      () =>
        newClient().getFilesByShareUrl(SHARE_ID, "", SHARE_PAGE, SHARE_DOMAIN),
      /可信域名/,
    )
    assert.equal(posts.length, 0, `${badHost} 不应发出任何请求`)
  }
})
