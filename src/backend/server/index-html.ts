import { getDb, onDbWrite } from "../internal/model/db"

/**
 * index.html 运行时占位符替换（服务端注入）。
 *
 * 背景 / 为什么需要这一层：
 * 上游 Go 版在 server/static/static.go 的 UpdateIndex() 里对 dist/index.html
 * 做了一次字符串替换，把站点设置（favicon / logo / site_title / main_color /
 * customize_head / customize_body）写进最终返回给浏览器的 HTML。
 *
 * 但前端产物 dist/index.html 里只保留了字面量占位符：
 *
 *   <!-- customize head -->      <-- 期望被替换成 customize_head 设置值
 *   <!-- customize body -->      <-- 期望被替换成 customize_body 设置值
 *   https://res.oplist.org/logo/logo.svg   <-- favicon
 *   https://res.oplist.org/logo/logo.png   <-- logo（apple-touch-icon）
 *   <title>Loading...</title>              <-- site_title
 *   main_color: undefined                  <-- main_color
 *
 * TSWorker 之前直接把这份「未替换」的 HTML 吐给浏览器（走 env.ASSETS 时由
 * Cloudflare 静态资源直出，走内联 SPA 时由 api/_makers.ts 构建期内联的字符串
 * 直出），因此系统全局设置里的自定义头部 / CSS / JS 片段永远不会生效。
 *
 * 这里补上缺失的替换环节，语义与 Go 版 UpdateIndex() 保持一致，避免两套后端
 * 行为分叉。
 *
 * 安全说明（重要，勿误判为漏洞）：
 * customize_head / customize_body 是**管理员在后台配置的任意 HTML/JS**，注入后
 * 必然可以在页面上执行脚本。这是上游 OpenList 的既设计行为（Go 版同样如此），
 * 属于「管理员 = 可信主体」模型。本模块不放松任何鉴权：只有已通过
 * /api/admin/setting/save（需要管理员 token）写入的值才会出现在这里。
 * 因此不要在此处额外引入「HTML 转义」——那会直接破坏自定义 CSS/JS 功能。
 */

/** 前端产物里的字面量占位符（与 OpenList-Frontend/index.html 一一对应）。 */
export const INDEX_HTML_PLACEHOLDERS = {
  customizeHead: "<!-- customize head -->",
  customizeBody: "<!-- customize body -->",
  favicon: "https://res.oplist.org/logo/logo.svg",
  logo: "https://res.oplist.org/logo/logo.png",
  title: "Loading...",
  mainColor: "main_color: undefined",
} as const

function readSetting(db: any, key: string, def = ""): string {
  const item = (db.settings || []).find((s: any) => s.key === key)
  if (!item || item.value === undefined || item.value === null) return def
  return String(item.value)
}

/**
 * 把站点设置注入 index.html。
 *
 * 与 Go 版 `UpdateIndex()` 的对应关系：
 *   - favicon  : `https://res.oplist.org/logo/logo.svg`
 *   - logo     : `https://res.oplist.org/logo/logo.png`（取 logo 设置的第一行）
 *   - title    : `Loading...`
 *   - mainColor: `main_color: undefined` -> `main_color: '<value>'`
 *   - head/body: `<!-- customize head -->` / `<!-- customize body -->`
 *
 * 空值一律跳过替换：既减少无意义的字符串拷贝，也避免把 favicon/logo 换成空
 * 字符串导致图标裂开（Go 版同样会跳过，因为空值不会命中占位符）。
 *
 * 注意这里用 `split().join()` 而不是 `String.replace()`：后者在替换串里出现
 * `$&` / `$'` / `$1` 等序列时会被当作特殊模式解释。管理员自定义 JS 里出现
 * `$&` 完全可能（例如某些压缩器产物），会导致注入结果被静默破坏。
 */
export function applyIndexHtmlSettings(html: string, db: any): string {
  const values: Array<[string, string]> = [
    [INDEX_HTML_PLACEHOLDERS.favicon, readSetting(db, "favicon")],
    [
      INDEX_HTML_PLACEHOLDERS.logo,
      readSetting(db, "logo").split("\n")[0]?.trim() || "",
    ],
    [INDEX_HTML_PLACEHOLDERS.title, readSetting(db, "site_title")],
    [
      INDEX_HTML_PLACEHOLDERS.mainColor,
      wrapMainColor(readSetting(db, "main_color")),
    ],
    [INDEX_HTML_PLACEHOLDERS.customizeHead, readSetting(db, "customize_head")],
    [INDEX_HTML_PLACEHOLDERS.customizeBody, readSetting(db, "customize_body")],
  ]

  let out = html
  for (const [placeholder, value] of values) {
    if (!value) continue
    if (!out.includes(placeholder)) continue
    out = out.split(placeholder).join(value)
  }
  return out
}

/**
 * `main_color: undefined` 是一个 JS 对象字面量片段，替换值必须自带引号。
 *
 * 单引号需要转义，否则 `main_color` 里出现 `'` 会直接让内联脚本语法错误、整站
 * 白屏。Go 版用的是 fmt.Sprintf("main_color: '%s'") 没有转义，这里不跟。
 */
function wrapMainColor(value: string): string {
  if (!value) return ""
  return `main_color: '${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}

/**
 * 结果缓存。
 *
 * 注入结果只依赖站点设置，而 /api/admin/setting/save 会通过 invalidateIndexHtmlCache()
 * 主动失效，所以这里不需要 TTL —— 只要有写入就立刻重建。
 *
 * 为什么缓存整个字符串：`app.all("*")` 是整站兜底路由，未命中 ASSETS 的每个请求
 * （含 SPA 路由跳转）都会走到这里；每次都读一遍 DB 再跑 6 组字符串替换，在
 * ESA / EdgeOne 这种有子请求配额和 CPU 预算的平台上代价过高。
 *
 * 缓存键是 env 对象（isolate 内唯一），避免 CF Workers 多 isolate 之间的串扰；
 * 与 db.ts 既有的 WeakMap 缓存策略保持一致。
 */
const htmlCache = new WeakMap<object, string>()

/**
 * 拿到「已注入站点设置」的 index.html。
 *
 * @param template 未替换的 index.html 模板（来自 ASSETS 直出或构建期内联字符串）
 * @param env      Hono 的 c.env，用作缓存键与 DB 读取上下文
 */
export async function buildIndexHtml(
  template: string,
  env: any,
): Promise<string> {
  const cacheKey = env && typeof env === "object" ? env : null
  if (cacheKey) {
    const cached = htmlCache.get(cacheKey)
    if (cached !== undefined) return cached
  }

  let html = template
  try {
    const db = await getDb(env)
    html = applyIndexHtmlSettings(template, db)
  } catch (err) {
    // 注入失败不能拖垮整站：宁可返回未注入的原始模板（此时至少页面可用），
    // 也不要让 HTML 入口 500 —— 那会让用户连错误页面都看不到。
    console.error("[index-html] failed to inject site settings:", err)
    html = template
  }

  if (cacheKey) htmlCache.set(cacheKey, html)
  return html
}

/**
 * 使缓存失效。必须在任何可能改动 INDEX_HTML_SETTING_KEYS 的写入之后调用。
 *
 * 目前唯一的调用点是 db.ts 的 saveDb()：所有设置写入（/admin/setting/save、
 * /admin/setting/default、/admin/setting/delete、updateSettingValue 等）最终都会
 * 落到 saveDb，挂在那里可以覆盖全部路径，且不会漏掉未来新增的写入入口。
 *
 * 传 env 只失效对应 isolate；不传 env 时无法定位 WeakMap 条目，依赖 1s 的
 * DB 缓存自愈（见 db.ts:DB_CACHE_TTL_MS）。
 */
export function invalidateIndexHtmlCache(env?: any) {
  if (env && typeof env === "object") {
    htmlCache.delete(env)
  }
}

// 把自己挂到 db.ts 的写入通知上。放在模块顶层而不是某个请求里：只要本模块被
// 引入（index.ts 会引入），钩子就必须已经就位，否则「第一次 saveDb 早于第一
// 次 HTML 请求」的部署会漏掉失效。
onDbWrite((env) => invalidateIndexHtmlCache(env))
