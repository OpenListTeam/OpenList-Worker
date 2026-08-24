import { HopeProvider, NotificationsProvider } from "@hope-ui/solid"
import { ErrorBoundary, Suspense } from "solid-js"
import { Error, FullScreenLoading } from "~/components"
import App from "./App"
import { globalStyles, theme } from "./theme"

const Index = () => {
  globalStyles()
  return (
    <HopeProvider config={theme}>
      <ErrorBoundary
        fallback={(err) => {
          console.error("error", err)
          return <Error msg={`系统错误：${err}`} h="100vh" />
        }}
      >
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
