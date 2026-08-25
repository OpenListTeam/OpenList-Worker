import { createSignal, JSXElement, Match, onMount, Switch } from "solid-js"
import { Error, FullScreenLoading } from "~/components"
import { useFetch, useT, useRouter } from "~/hooks"
import { Me, setMe } from "~/store"
import { PResp, UserMethods } from "~/types"
import { r, handleResp } from "~/utils"

const MustUser = (props: { children: JSXElement }) => {
  const t = useT()
  const { to } = useRouter()
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"), true)
  const [err, setErr] = createSignal<string>()
  onMount(async () => {
    handleResp(
      await data(),
      (me) => {
        // /me 在无令牌时会返回游客身份（免登录浏览首页），
        // 但管理后台仅限登录用户访问：游客一律送回登录页
        if (UserMethods.is_guest(me)) {
          to("/@login", true)
          return
        }
        setMe(me)
      },
      setErr,
    )
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
  const { to, isShare, pathname } = useRouter()
  // 将loading默认设置为true，修复children被提前渲染，明显症状：两个公告
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"), true)
  onMount(async () => {
    const res = await data()
    if (res && res.code === 200 && res.data && !res.data.disabled) {
      setMe(res.data)
    } else {
      // 访客账号被删除或禁用，且当前未登录
      if (isShare()) {
        // 分享页允许免登录查看公开分享内容
        setMe({
          id: 0,
          username: "guest",
          password: "",
          base_path: "/",
          role: 1,
          disabled: true,
          permission: 0,
          sso_id: "",
          otp: false,
          allow_ldap: false,
        })
      } else {
        // 非分享页一律重定向至登录页
        const redirectPath = pathname()
        if (
          redirectPath &&
          redirectPath !== "/" &&
          redirectPath !== "/@login"
        ) {
          to(`/@login?redirect=${encodeURIComponent(redirectPath)}`, true)
        } else {
          to("/@login", true)
        }
      }
    }
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
