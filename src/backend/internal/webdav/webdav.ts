import { generateWebDavXml, type WebDavItem } from "../../pkg/xml"

export type { WebDavItem }

/**
 * 构造 PROPFIND 的 207 Multi-Status 响应体。
 *
 * @param requestPath 被请求资源的请求路径（`URL.pathname`，已百分号编码）。
 *   RFC 4918 §8.3 要求 <D:href> 与请求路径一致（§8.3.1 的示例允许相对引用或
 *   完整 URI 两种形态，本实现用相对引用），因此这里传请求路径而不是挂载前缀 ——
 *   挂在子路径下（如 /list/dav）时也自动正确。
 * @param items 直接子项
 */
export function buildWebDavPropfindResponse(
  requestPath: string,
  items: WebDavItem[],
): string {
  return generateWebDavXml(requestPath, items)
}