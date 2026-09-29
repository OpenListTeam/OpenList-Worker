import { LanzouDriver } from "../src/backend/drivers/lanzou/driver"
import { LanzouClient } from "../src/backend/drivers/lanzou/util"
import {
  htmlJsonToMap,
  calcAcwScV2,
  mustParseTime,
  sizeStrToInt64,
  getJSFunctionByName,
} from "../src/backend/drivers/lanzou/help"

let pass = 0
let fail = 0

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    pass++
    console.log(`✅ ${name}`)
  } catch (e: any) {
    fail++
    console.error(`❌ ${name}:`, e.message)
  }
}

// 1. Test WAF Cookie Calculation
await test("Lanzou WAF acw_sc__v2 算法测试", () => {
  const sampleWafHtml = `<html><script>var arg1='B9A8C7D6E5F40123456789ABCDEF0123456789AB';</script></html>`
  const vs = calcAcwScV2(sampleWafHtml)
  if (!vs || vs.length !== 40) {
    throw new Error(`Invalid acw_sc__v2 generated: ${vs}`)
  }
})

// 2. Test File Page JS extraction (with password)
await test("Lanzou 密码分享页面参数解析", () => {
  const pageHtml = `
  <html>
  <script>
  var ajaxdata = 'test_ajax_data';
  var skdkw = 'test_skdkw_sign';
  var websignkey = 'key12345';
  function down_p() {
      var pwd = document.getElementById('pwd').value;
      $.ajax({
          type : 'post',
          url : '/ajaxm.php?file=123456',
          data : { 'action':'downprocess', 'signs':ajaxdata, 'sign':skdkw, 'p':pwd, 'websignkey':websignkey, 'ves':1 },
          dataType : 'json'
      });
  }
  </script>
  </html>
  `
  const fn = getJSFunctionByName(pageHtml, "down_p")
  const map = htmlJsonToMap(fn, pageHtml)
  if (map.action !== "downprocess") throw new Error(`action mismatch: ${map.action}`)
  if (map.signs !== "test_ajax_data") throw new Error(`signs mismatch: ${map.signs}`)
  if (map.sign !== "test_skdkw_sign") throw new Error(`sign mismatch: ${map.sign}`)
  if (map.websignkey !== "key12345") throw new Error(`websignkey mismatch: ${map.websignkey}`)
  if (map.ves !== "1") throw new Error(`ves mismatch: ${map.ves}`)
})

// 3. Test Non-password Iframe Page JS extraction
await test("Lanzou 免密 iframe 页面参数解析", () => {
  const iframeHtml = `
  <html>
  <script>
  var ajaxdata = 'iframe_ajax_data';
  var skdkw = 'iframe_skdkw_sign';
  var websign = 'web_sign_val';
  var websignkey = 'key_val';
  $.ajax({
      type : 'post',
      url : '/ajaxm.php?file=789012',
      data : { 'action':'downprocess', 'signs':ajaxdata, 'sign':skdkw, 'ves':1, 'websign':websign, 'websignkey':websignkey },
      dataType : 'json'
  });
  </script>
  </html>
  `
  const map = htmlJsonToMap(iframeHtml, iframeHtml)
  if (map.action !== "downprocess") throw new Error(`action mismatch: ${map.action}`)
  if (map.signs !== "iframe_ajax_data") throw new Error(`signs mismatch: ${map.signs}`)
  if (map.sign !== "iframe_skdkw_sign") throw new Error(`sign mismatch: ${map.sign}`)
  if (map.websign !== "web_sign_val") throw new Error(`websign mismatch: ${map.websign}`)
})

// 4. Test Lanzou Driver get() download headers
await test("Lanzou Driver get() 直链与请求头验证（纯 User-Agent，无破损 Referer）", async () => {
  const driver = new LanzouDriver({
    type: "url",
    root_folder_id: "b00test",
    shareUrl: "https://pan.lanzoui.com",
    user_agent: "CustomLanzouUA/1.0",
  })

  const mockFilePage = `
  <html>
  <title>sample.zip - 蓝奏云</title>
  <div class="fileinfo">大小：10.5 M</div>
  <iframe src="/fn?ab12cd"></iframe>
  </html>
  `
  const mockIframe = `
  <html>
  <script>
  var ajaxdata = 'ajx1';
  var skdkw = 'skd1';
  $.ajax({
      type : 'post',
      url : '/ajaxm.php?file=555',
      data : { 'action':'downprocess', 'signs':ajaxdata, 'sign':skdkw },
      dataType : 'json'
  });
  </script>
  </html>
  `

  const originalFetch = globalThis.fetch
  try {
    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes("ajaxm.php")) {
        return new Response(JSON.stringify({
          zt: 1,
          dom: "https://developer.lanzoui.com",
          url: "token_12345",
          inf: "sample.zip"
        }))
      }
      if (urlStr.includes("/fn?")) {
        return new Response(mockIframe)
      }
      if (urlStr.includes("developer.lanzoui.com/file")) {
        // Returns 302 location
        return new Response(null, {
          status: 302,
          headers: { location: "https://vip.duba.net/download/sample.zip?sign=999" }
        })
      }
      if (urlStr.includes("pan.lanzoui.com/b00test") || urlStr.includes("sample.zip")) {
        return new Response(mockFilePage)
      }
      return new Response("Not Found", { status: 404 })
    }

    const item = await driver.get("/b00test", "/sample.zip")
    if (item.name !== "sample.zip") throw new Error(`Expected name sample.zip, got ${item.name}`)
    if (item.raw_url !== "https://vip.duba.net/download/sample.zip?sign=999") {
      throw new Error(`Expected direct url, got ${item.raw_url}`)
    }
    // Verify raw_url_headers only contains User-Agent (and no blocking Referer)
    if (!item.raw_url_headers?.["User-Agent"]) {
      throw new Error("Missing User-Agent in raw_url_headers")
    }
    if (item.raw_url_headers?.["Referer"]) {
      throw new Error("Referer must NOT be set on CDN direct link headers")
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

// Clean up scratch files
try {
  const fs = await import("fs")
  if (fs.existsSync("scripts/go_util.go")) fs.unlinkSync("scripts/go_util.go")
  if (fs.existsSync("scripts/test-lanzou-helpers.ts")) fs.unlinkSync("scripts/test-lanzou-helpers.ts")
} catch {}

console.log(`\nLanzou 测试结果: ${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
