/**
 * KV HTTP 代理共享实现（EdgeOne Node 云函数专用）。
 *
 * 背景：EdgeOne 的 KV 绑定只注入到 Edge Functions（V8 运行时），不会注入到
 * Node 云函数（SCF）。因此 Node 侧拿不到 binding，必须经同部署的 Edge Function
 * （functions/kv-get|kv-put|kv-delete|kv-list）代为访问 KV。
 *
 * 本模块是该代理协议的**唯一实现**，被两处消费：
 *   - driver/kv.ts  —— 业务数据读写（Driver 接口）
 *   - store/json.ts —— 密钥/黑名单等既有 binding 形态调用方
 * 放在独立模块是为了避免 json.ts ↔ driver/kv.ts 互相导入形成循环依赖。
 */

/**
 * 校验并归一化 KV 代理目标 origin。
 *
 * 安全背景：`__requestOrigin` 由中间件从 `c.req.url` 派生，而后者源自请求的
 * Host 头。若平台未严格校验 Host，攻击者构造 `Host: evil.com` 可能让 Node 侧
 * 把携带 **完整 JWT_SECRET** 的 `X-Internal-Call` 请求发往攻击者服务器（SSRF
 * 兼密钥泄漏）。因此这里做三重约束：
 *
 *  1. **必须是 http/https 绝对地址**（拒绝相对路径、协议相对 URL）；
 *  2. **必须是能解析出 hostname 的合法 URL**；
 *  3. **生产环境（非 localhost）必须为 https**，避免明文传输密钥。
 *
 * 显式配置的 `EO_KV_URLS` 视为可信（运维意图），但仍需通过 1/2；
 * 对它的 https 要求放宽，便于本地 http 调试。
 *
 * 刻意**不做**内网地址（RFC1918 / 云元数据 169.254.169.254）黑名单：
 *   - 该类校验需先做 DNS 解析才能防住重绑定，而边缘运行时无法可靠解析；
 *   - 纯字符串判断防不住 `evil.com -> 内网IP` 的解析结果，属虚假安全感；
 *   - 会误伤合法的内网自托管部署（`EO_KV_URLS` 本就可指向内网 origin）。
 * 真正的防线是上面第 3 条：请求派生的 origin 必须是 https，且 Host 由
 * 平台校验，攻击者无法在不控制 Host 的前提下把密钥外发出去。
 *
 * @returns 归一化后的 origin（去掉结尾 `/`），不可用时返回 null
 */
export function sanitizeProxyOrigin(raw: any, env?: any): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  // 仅允许 http / https，拒绝其他协议（file:、ftp: 等）
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  if (!url.hostname) return null

  // 显式配置的基址视为可信来源，仅做协议与 hostname 校验
  const explicit = env?.EO_KV_URLS
  const isExplicit = typeof explicit === "string" && explicit.trim() === trimmed

  if (!isExplicit) {
    const isLocal =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]"
    // 请求派生的 origin 在非本地环境必须为 https，杜绝明文外发密钥
    if (!isLocal && url.protocol !== "https:") {
      console.warn(
        "[DB] Rejecting non-HTTPS proxy origin derived from request: " +
          `${url.protocol}//${url.hostname} (would leak X-Internal-Call in clear text)`,
      )
      return null
    }
  }

  return `${url.protocol}//${url.host}`.replace(/\/$/, "")
}
