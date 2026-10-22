import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import { LanzouClient, parseFnPage } from "./util"
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
