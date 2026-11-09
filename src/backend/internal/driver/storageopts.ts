/**
 * 存储级行为选项：proxy_range / enable_sign / disable_index。
 *
 * 这些字段在 Go 版由 internal/model/storage.go 与 internal/op/driver.go 定义并
 * 在下载链路中实际生效；本模块把它们统一解析出来，供下载/列表链路使用。
 *
 * Go 对应位置：
 *   - model.Storage.ProxyRange            → proxy_range（driver.Config.ProxyRangeOption）
 *   - model.Storage.EnableSign            → common.IsStorageSignEnabled
 *   - model.Storage.DisableIndex          → handles.FsList
 *
 * 说明：存储级 cache_expiration / custom_cache_policies 已随持久缓存一并移除，
 * 这两个字段即使残留在 storage.addition 里也不会再被任何代码读取。
 */

/** storage.addition 可能是 JSON 字符串或已解析对象，统一解析 */
export function parseAdditionLoose(addition: any): Record<string, any> {
  if (!addition) return {}
  if (typeof addition === "object") return addition
  if (typeof addition === "string") {
    try {
      const parsed = JSON.parse(addition || "{}")
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function asBool(value: any): boolean {
  if (typeof value === "string") return value.toLowerCase() === "true"
  return value === true
}

/**
 * proxy_range（对齐 Go 的 Range 处理）。
 *
 * 语义：下载走服务端代理时，是否把客户端的 Range 头透传给上游。
 *   - true ：透传 Range（**默认**），上游回 206 时原样回传，支持拖进度条/断点续传
 *   - false：丢弃 Range，由本服务返回完整文件（用于明确拒绝 Range 的上游）
 *
 * 为什么默认 true：Go 的透明代理会把客户端请求头原样转发给上游
 * （internal/net/serve.go 的 ProcessHeader 只按 proxy_ignore_headers 过滤），
 * 也就是说 **Go 默认就透传 Range**，`proxy_range` 在 Go 里只是额外启用驱动的
 * RangeReader/多线程路径。TS 若默认 false，会让代理模式下的 seek / 断点续传
 * 静默退化。上游拒绝或静默忽略 Range 时，由 server/proxy_request.ts 的
 * shouldRetryWithoutRange() 去掉 Range 重试兜底。
 */
export function getProxyRange(storage: any): boolean {
  const raw = storage?.proxy_range ?? storage?.proxyRange
  if (raw === undefined || raw === null || raw === "") return true
  return asBool(raw)
}

/** enable_sign（对齐 Go common.IsStorageSignEnabled） */
export function getEnableSign(storage: any): boolean {
  if (!storage) return false
  return asBool(storage.enable_sign ?? storage.enableSign)
}

/** disable_index（对齐 Go model.Storage.DisableIndex） */
export function getDisableIndex(storage: any): boolean {
  if (!storage) return false
  return asBool(storage.disable_index ?? storage.disableIndex)
}
