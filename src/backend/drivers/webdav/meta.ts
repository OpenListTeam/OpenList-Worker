export const config = {
  name: "WebDav",
  localSort: true,
  defaultRoot: "/",
  // 对齐 Go drivers/webdav/meta.go 的 PreferProxy: true。
  // WebDAV 直链带认证信息，直接 302 给浏览器会丢认证，因此默认走服务端代理。
  // 驱动能力表的唯一真相在 internal/driver/proxy.ts，此处不再重复登记。
  preferProxy: true,
}
