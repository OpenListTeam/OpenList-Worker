import { createSignal, JSXElement, Match, onMount, Switch } from "solid-js"
import { Error, FullScreenLoading } from "~/components"
import { useRouter, useFetch, useT } from "~/hooks"
import { Me, setMe } from "~/store"
import { PResp } from "~/types"
import { r, handleResp, handleRespWithoutAuthAndNotify } from "~/utils"

const MustUser = (props: { children: JSXElement }) => {
  const t = useT()
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"), true)
  const [err, setErr] = createSignal<string>()
  onMount(async () => {
    handleResp(await data(), setMe, setErr)
  })
  return (
    <Switch fallback={props.children}>
      <Match when={loading()}>
        <FullScreenLoading />
      </Match>
      <Match when={err() !== undefined}>
        <Error msg={t("home.get_current_user_failed") + err()} />
      </Match>
    </Switch>
  )
}

const UserOrGuest = (props: { children: JSXElement }) => {
  const t = useT()
  const { to, pathname } = useRouter()
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"), true)
  onMount(async () => {
    handleResp(await data(), setMe, (_msg, _code) => {
      // Guest disabled — redirect to login page
      to(`/@login?redirect=${encodeURIComponent(pathname)}`, true)
    })
  })
  return (
    <Switch fallback={props.children}>
      <Match when={loading()}>
        <FullScreenLoading />
      </Match>
    </Switch>
  )
}

export { MustUser, UserOrGuest }
