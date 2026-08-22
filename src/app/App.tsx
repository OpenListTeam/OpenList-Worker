import { Progress, ProgressIndicator } from "@hope-ui/solid"
import { Route, Routes, useIsRouting } from "@solidjs/router"
import {
  Component,
  createEffect,
  createSignal,
  lazy,
  Match,
  onCleanup,
  Switch,
} from "solid-js"
import { Portal } from "solid-js/web"
import { Error, FullScreenLoading } from "~/components"
import { useLoading, useRouter, useT } from "~/hooks"
import { setSettings } from "~/store"
import { setArchiveExtensions } from "~/store/archive"
import { Resp } from "~/types"
import {
  base_path,
  bus,
  handleRespWithoutAuthAndNotify,
  initPluginEngine,
  r,
} from "~/utils"
import { MustUser, UserOrGuest } from "./MustUser"
import "./index.css"
import { globalStyles } from "./theme"

const Home = lazy(() => import("~/pages/home/Layout"))
const Manage = lazy(() => import("~/pages/manage"))
const Login = lazy(() => import("~/pages/login"))

const App: Component = () => {
  const t = useT()
  globalStyles()
  initPluginEngine()
  const isRouting = useIsRouting()
  const { to, pathname } = useRouter()
  const onTo = (path: string) => {
    to(path)
  }
  bus.on("to", onTo)
  onCleanup(() => {
    bus.off("to", onTo)
  })

  createEffect(() => {
    bus.emit("pathname", pathname())
  })

  const [err, setErr] = createSignal<string[]>([])
  const [loading, data] = useLoading(() =>
    Promise.all([
      (async () => {
        const resp = (await r.get("/public/settings")) as Resp<
          Record<string, string>
        >
        if (resp && resp.code === 200) {
          setSettings(resp.data)
        } else {
          console.warn(
            "Using client-side fallback settings due to API failure:",
            resp?.message || "unknown",
          )
          const defaultSettings = {
            site_title: "OpenListNext",
            logo: "/logo.png",
            favicon: "/favicon.png",
            announcement:
              "欢迎使用 OpenListNext! (运行于 Serverless 离线 fallback 模式)",
            main_color: "#1890ff",
            home_container: "max_980px",
            home_icon: "openlistnext",
            settings_layout: "simple",
            version: "v4.2.3",
          }
          setSettings(defaultSettings)
        }
      })(),
      (async () => {
        const resp = (await r.get("/public/archive_extensions")) as Resp<
          string[]
        >
        if (resp && resp.code === 200) {
          setArchiveExtensions(resp.data)
        } else {
          console.warn(
            "Using client-side fallback archive extensions due to API failure",
          )
          setArchiveExtensions(["zip", "tar", "gz", "rar", "7z"])
        }
      })(),
    ]),
  )
  data()
  return (
    <>
      <Portal>
        <Progress
          indeterminate
          size="xs"
          position="fixed"
          top="0"
          left="0"
          right="0"
          zIndex="$banner"
          d={isRouting() ? "block" : "none"}
        >
          <ProgressIndicator />
        </Progress>
      </Portal>
      <Switch
        fallback={
          <Routes base={base_path}>
            <Route path="/@login" component={Login} />
            <Route
              path="/@manage/*"
              element={
                <MustUser>
                  <Manage />
                </MustUser>
              }
            />
            <Route
              path={["/@s/*", "/%40s/*"]}
              element={
                <UserOrGuest>
                  <Home />
                </UserOrGuest>
              }
            />
            <Route
              path="*"
              element={
                <UserOrGuest>
                  <Home />
                </UserOrGuest>
              }
            />
          </Routes>
        }
      >
        <Match when={err().length > 0}>
          <Error
            h="100vh"
            msg={
              t("home.fetching_settings_failed") +
              err()
                .map((e) => t("home." + e))
                .join(", ")
            }
          />
        </Match>
        <Match when={loading()}>
          <FullScreenLoading />
        </Match>
      </Switch>
    </>
  )
}

export default App
