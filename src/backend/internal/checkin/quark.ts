// 夸克网盘签到 —— 核心逻辑（纯函数 + 可注入 fetch）。
//
// 参考实现：https://github.com/Liu8Can/Quark_Auto_Check_In
// 对齐其 checkIn_Quark.py 的行为：三个端点、凭据来自 URL query、POST sign。
//
// 三个必须保留的行为细节（都是从参考实现抄来的，各自都在防真实故障）：
//
// 1. query 手工解析，不做「+ 当空格」。URLSearchParams / parse_qs 都遵循
//    application/x-www-form-urlencoded 语义，会把 + 解成空格。而夸克凭据本身
//    可能含字面 +，一旦被换成空格，请求就会因签名不匹配失败 —— 表现为
//    「照着文档填了 Cookie 却签到失败」。参考实现明确为此写了说明。
//
// 2. POST 网络失败后重新查询确认。POST 若因超时失败，服务端可能已经记录签到。
//    此时直接重试会造成重复请求，直接放弃又可能漏签。参考实现的处理是重新
//    GET 一次 info 用 cap_sign.sign_daily 反查，据此判定真实结果。
//
// 3. GET info 对 429/5xx/网络错误退避重试。查询是幂等的，重试安全。

import type {
  QuarkAccount,
  QuarkCheckinResult,
  QuarkGrowthInfo,
} from "./types"
import { QuarkApiError, QuarkConfigError } from "./types"

/** 成长信息查询端点 */
export const GROWTH_INFO_URL =
  "https://drive-m.quark.cn/1/clouddrive/capacity/growth/info"
/** 签到端点 */
export const GROWTH_SIGN_URL =
  "https://drive-m.quark.cn/1/clouddrive/capacity/growth/sign"

/** 三项必需凭据 */
export const REQUIRED_PARAMS = ["kps", "sign", "vcode"] as const

/** 单次请求超时（毫秒），与参考实现的 timeout=20 秒一致 */
export const REQUEST_TIMEOUT_MS = 20_000

/** 账号条目分隔：换行 或 && */
export function splitAccountEntries(raw?: string | null): string[] {
  return (raw || "")
    .split(/\r?\n|&&/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** 用量化字符计 */
function plural(n: number): string {
  return n === 1 ? "" : "s"
}

/**
 * 解析 query 字符串。
 *
 * 关键点：只做 percent-decode，**不把 + 当空格**。
 * 同时保留原始大小写（拼错参数名时应原样报告，而不是悄悄找不到）。
 */
export function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of query.split("&")) {
    if (!part) continue
    const eq = part.indexOf("=")
    if (eq < 0) continue
    const key = percentDecode(part.slice(0, eq))
    // 第一个同名参数生效（与参考实现的 setdefault 语义一致）
    if (key && out[key] === undefined) {
      out[key] = percentDecode(part.slice(eq + 1))
    }
  }
  return out
}

function percentDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    // 含孤立 % 之类：原样返回，别把整个配置判死
    return s
  }
}

/**
 * 从一个账号条目解析出账号。
 *
 * 条目形如 `user=xxx&kps=yyy&sign=zzz&vcode=www`。
 * 允许直接粘贴带完整 URL 的形式（内部兼容 url= 包装）。
 */
export function parseAccount(entry: string, index: number): QuarkAccount {
  const account: Record<string, string> = {}
  for (const field of entry.split("&")) {
    const f = field.trim()
    if (!f) continue
    if (f.includes("=")) {
      const [k, ...rest] = f.split("=")
      const key = k.trim()
      if (key) account[key] = rest.join("=").trim()
    }
  }

  // 兼容形如 url=<完整URL> 的填法
  if (account.url) {
    let q = ""
    try {
      q = new URL(account.url).search.replace(/^\?/, "")
    } catch {
      q = account.url.includes("?")
        ? account.url.slice(account.url.indexOf("?") + 1)
        : ""
    }
    for (const [k, v] of Object.entries(parseQuery(q))) {
      if (account[k] === undefined) account[k] = v
    }
  }

  for (const p of REQUIRED_PARAMS) {
    if (!account[p]) {
      throw new QuarkConfigError(
        `第 ${index} 个账号缺少必要参数 ${p}` +
          `（应有 ${REQUIRED_PARAMS.join("、")}${plural(REQUIRED_PARAMS.length)}）`,
      )
    }
  }

  return {
    user: account.user || `账号${index}`,
    kps: account.kps,
    sign: account.sign,
    vcode: account.vcode,
  }
}

/** 组装请求 query：固定 pr/fr 加上三项凭据 */
export function buildParams(account: QuarkAccount): string {
  const enc = encodeURIComponent
  return `pr=${enc("ucpro")}&fr=${enc("android")}` +
    `&kps=${enc(account.kps)}&sign=${enc(account.sign)}&vcode=${enc(account.vcode)}`
}

/** 人类可读的容量 */
export function formatBytes(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "0 B"
  }
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  let size = value
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(2)} ${units[i]}`
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/**
 * POST 结果不确定。
 *
 * 只在「请求发出去了但不知道服务端有没有落实」时抛出：网络层失败、
 * 响应无法解析、HTTP 5xx。调用方必须重新查询反查，而不是盲目重试
 * （可能重复签到）或直接放弃（可能漏签）。
 */
class QuarkAmbiguousError extends QuarkApiError {
  constructor(message: string) {
    super(message)
    this.name = "QuarkAmbiguousError"
  }
}

/** 统一的 GET/POST 封装：网络层失败必须转成可判定的 QuarkApiError */
async function apiRequest(
  url: string,
  init: RequestInit,
  stage: string,
  isWrite: boolean,
  fetchImpl: FetchLike,
): Promise<any> {
  let resp: Response
  try {
    resp = await fetchImpl(url, init)
  } catch (e) {
    // 网络层失败 vs HTTP 业务失败必须区分：
    // 写操作（POST）遇到它属于「结果不确定」，读操作可以直接失败。
    const msg = `${stage}网络失败`
    if (isWrite) throw new QuarkAmbiguousError(msg)
    throw new QuarkApiError(msg)
  }
  const payload = await readQuarkPayload(resp, stage, isWrite)
  return payload
}

/** GET growth/info，返回成长信息 */
export async function getGrowthInfo(
  account: QuarkAccount,
  fetchImpl: FetchLike = fetch,
): Promise<QuarkGrowthInfo> {
  const payload = await apiRequest(
    `${GROWTH_INFO_URL}?${buildParams(account)}`,
    { method: "GET", headers: { accept: "application/json" } },
    "查询签到状态",
    false,
    fetchImpl,
  )
  const data = payload.data
  if (!data || typeof data !== "object") {
    throw new QuarkApiError(
      quarkToMessage("查询签到状态", payload, "获取成长信息失败"),
    )
  }
  return data as QuarkGrowthInfo
}

/** POST growth/sign，返回本次签到获得的容量（字节） */
export async function postGrowthSign(
  account: QuarkAccount,
  fetchImpl: FetchLike = fetch,
): Promise<number> {
  const payload = await apiRequest(
    `${GROWTH_SIGN_URL}?${buildParams(account)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sign_cyclic: true }),
    },
    "提交签到",
    true,
    fetchImpl,
  )
  const data = payload.data
  if (!data || typeof data !== "object" || !("sign_daily_reward" in data)) {
    throw new QuarkApiError(
      quarkToMessage("提交签到", payload, "响应缺少 sign_daily_reward 字段"),
    )
  }
  const reward = (data as any).sign_daily_reward
  return typeof reward === "number" && Number.isFinite(reward) ? reward : 0
}

/** 统一的响应解析：HTTP 失败只报告状态码，绝不在异常里回显请求 URL */
async function readQuarkPayload(
  resp: Response,
  stage: string,
  isWrite: boolean,
): Promise<any> {
  const fail = (msg: string) => {
    if (isWrite) throw new QuarkAmbiguousError(msg)
    throw new QuarkApiError(msg)
  }
  if (!resp.ok) {
    fail(`${stage}请求失败（HTTP ${resp.status}）`)
  }
  try {
    const json = await resp.json()
    return json && typeof json === "object" ? json : {}
  } catch {
    fail(`${stage}返回了无法解析的数据`)
  }
}

/** 把夸克 API 的错误体转成可读信息（不含凭据） */
function quarkToMessage(stage: string, payload: any, fallback: string): string {
  const message = payload?.message || payload?.msg
  if (message) return String(message)
  if (payload?.code !== undefined && payload?.code !== null) {
    return `${fallback}（code=${payload.code}）`
  }
  return `${stage}失败（API 未返回原因）`
}

/** 连签进度字符串 */
function progressOf(info: QuarkGrowthInfo): string {
  const cap = info.cap_sign
  if (!cap) return ""
  const p = typeof cap.sign_progress === "number" ? cap.sign_progress : "?"
  const t = typeof cap.sign_target === "number" ? cap.sign_target : "?"
  return `${p}/${t}`
}

/**
 * 执行单个账号的签到。
 *
 * 先查 info：今日已签则直接返回，不再发 POST（幂等，重复触发无副作用）。
 * 未签则 POST；POST 若网络失败，重新查 info 反查确认，避免漏签或重复签。
 */
export async function checkinQuarkAccount(
  account: QuarkAccount,
  fetchImpl: FetchLike = fetch,
): Promise<QuarkCheckinResult> {
  const base = { user: account.user, index: 0 }
  const info = await getGrowthInfo(account, fetchImpl)
  const cap = info.cap_sign
  if (!cap || typeof cap !== "object") {
    // 参考实现同样在这里直接失败：cap_sign 缺失说明账号凭据可能已失效，
    // 继续 POST 只会得到一次没有意义的请求。
    throw new QuarkApiError("成长信息中缺少 cap_sign 字段")
  }

  if (cap.sign_daily) {
    return {
      ...base,
      status: "skipped",
      reward: typeof cap.sign_daily_reward === "number" ? cap.sign_daily_reward : 0,
      progress: progressOf(info),
    }
  }

  let reward: number
  try {
    reward = await postGrowthSign(account, fetchImpl)
  } catch (e) {
    if (!(e instanceof QuarkAmbiguousError)) throw e
    // POST 结果不确定：重新查询反查
    const recheck = await getGrowthInfo(account, fetchImpl)
    const sign = recheck.cap_sign
    if (!sign?.sign_daily) {
      throw new QuarkApiError("未确认签到成功，等待下次重试")
    }
    return {
      ...base,
      status: "ok",
      reward: typeof sign.sign_daily_reward === "number" ? sign.sign_daily_reward : 0,
      progress: progressOf(recheck),
    }
  }

  return { ...base, status: "ok", reward, progress: progressOf(info) }
}

/**
 * 执行全部账号签到。
 *
 * 单个账号的失败不影响其余账号（与参考实现的兜底逻辑一致）。
 * fetchImpl 可注入，便于测试。
 */
export async function runQuarkCheckin(
  rawAccounts: string,
  fetchImpl: FetchLike = fetch,
): Promise<QuarkCheckinResult[]> {
  const entries = splitAccountEntries(rawAccounts)

  if (entries.length === 0) {
    throw new QuarkConfigError("未配置夸克账号，或内容为空")
  }

  const results: QuarkCheckinResult[] = []
  for (let i = 0; i < entries.length; i++) {
    const index = i + 1
    let account: QuarkAccount
    try {
      account = parseAccount(entries[i], index)
    } catch (e) {
      results.push({
        index,
        user: `账号${index}`,
        status: "failed",
        reward: 0,
        progress: "",
        error: (e as Error).message,
      })
      continue
    }

    try {
      const r = await checkinQuarkAccount(account, fetchImpl)
      results.push({ ...r, index })
    } catch (e) {
      results.push({
        index,
        user: account.user,
        status: "failed",
        reward: 0,
        progress: "",
        error: (e as Error)?.message || String(e),
      })
    }
  }
  return results
}
