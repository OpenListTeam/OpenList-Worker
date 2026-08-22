import { createSignal, JSXElement, Match, onMount, Switch } from "solid-js"
import { Error, FullScreenLoading } from "~/components"
import { useFetch, useT, useRouter } from "~/hooks"
import { Me, setMe } from "~/store"
import { PResp, UserMethods } from "~/types"
import { r, handleResp, handleRespWithoutAuthAndNotify } from "~/utils"

const MustUser = (props: { children: JSXElement }) => {
  const t = useT()
  const { to } = useRouter()
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"), true)
  const [err, setErr] = createSignal<string>()
  onMount(async () => {
    handleResp(await data(), (me) => {
      // /me 在无令牌时会返回游客身份（免登录浏览首页），
      // 但管理后台仅限登录用户访问：游客一律送回登录页
      if (UserMethods.is_guest(me)) {
        to("/@login", true)
        return
      }
      setMe(me)
    }, setErr)
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
  // 将loading默认设置为true，修复children被提前渲染，明显症状：两个公告
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"), true)
  const [skipLogin, setSkipLogin] = createSignal(false)
  onMount(async () => {
    handleRespWithoutAuthAndNotify(await data(), setMe, (_msg, _code) => {
      setMe({
        id: 2,
        username: "guest",
        password: "",
        base_path: "/",
        role: 1,
        disabled: false,
        permission: 0,
        sso_id: "",
        otp: false,
        allow_ldap: false,
      })
      setSkipLogin(true)
    })
  })
  return (
    <Switch fallback={props.children}>
      <Match when={!skipLogin() && loading()}>
        <FullScreenLoading />
      </Match>
    </Switch>
  )
}

export { MustUser, UserOrGuest }
