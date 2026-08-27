import { HopeProvider, NotificationsProvider } from "@hope-ui/solid"
import { ErrorBoundary, Suspense } from "solid-js"
import { Error, FullScreenLoading } from "~/components"
import App from "./App"
import { globalStyles, theme } from "./theme"

// 部署后旧 chunk 失效：浏览器缓存的 index.html 仍引用旧 hash 的资源文件，
// 动态 import() 会报 "Failed to fetch dynamically imported module"。
// 识别这类错误后自动刷新页面，让浏览器拿到新 index.html 并加载新 chunk。
const isChunkLoadError = (err: any): boolean => {
  const msg = String(err?.message || err || "")
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  )
}

const Index = () => {
  globalStyles()
  // 防死循环：本次会话中已自动刷新过就不再重复刷新，直接展示错误
  const sessionKey = "__openlistnext_chunk_reload__"
  const alreadyReloaded = () => {
    try {
      return sessionStorage.getItem(sessionKey) === "1"
    } catch {
      return false
    }
  }
  const markReloaded = () => {
    try {
      sessionStorage.setItem(sessionKey, "1")
    } catch {
      // 忽略存储不可用
    }
  }
  return (
    <HopeProvider config={theme}>
      <ErrorBoundary
        fallback={(err) => {
          console.error("error", err)
          if (isChunkLoadError(err) && !alreadyReloaded()) {
            markReloaded()
            // 延迟刷新，让错误 UI 不至于闪屏
            setTimeout(() => {
              window.location.reload()
            }, 300)
            return <FullScreenLoading />
          }
          return <Error msg={`System error: ${err}`} h="100vh" />
        }}
      >
        {/* 通知默认右上角;搜索框已通过 header-right z-index(1810) 提层,公告弹出不遮挡 */}
        <NotificationsProvider duration={3000}>
          <Suspense fallback={<FullScreenLoading />}>
            <App />
          </Suspense>
        </NotificationsProvider>
      </ErrorBoundary>
    </HopeProvider>
  )
}

export { Index }
