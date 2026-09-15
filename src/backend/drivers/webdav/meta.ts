import { registerDriverProxyCapability } from "../../internal/driver/proxy"

export const config = {
  name: "WebDav",
  localSort: true,
  defaultRoot: "/",
  // 对齐 Go drivers/webdav/meta.go 的 PreferProxy: true
  preferProxy: true,
}

// WebDAV 的直链带认证信息，直接 302 给浏览器会丢认证，因此默认走服务端代理
registerDriverProxyCapability(config.name, { preferProxy: true })
