import { Markdown } from "~/components"
import { useTitle } from "~/hooks"
import { getSetting } from "~/store"
import { notify } from "~/utils"
import { Body } from "./Body"
import { Footer } from "./Footer"
import { Header } from "./header/Header"
import { Toolbar } from "./toolbar/Toolbar"

// 会话内只弹一次公告(模块级标记,刷新页面不会重复弹出)
let announcementShown = false

const Index = () => {
  useTitle(getSetting("site_title"))
  const announcement = getSetting("announcement")
  if (announcement && !announcementShown) {
    announcementShown = true
    // 公告弹窗:图标(左) + 公告文字(右,垂直居中),合并为一个 toast
    // 有公告才弹(图标跟随公告);duration=2000 表示 2 秒后自动收回
    // 换行符转为硬换行保持后台换行一致
    notify.render(
      <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
        <img
          src="/apple-touch-icon.png"
          alt=""
          style={{ width: "40px", height: "40px", "flex-shrink": "0" }}
        />
        <div style={{ "flex-grow": "1" }}>
          <Markdown children={announcement.replace(/\n/g, "  \n")} />
        </div>
      </div>,
      { duration: 2000 },
    )
  }
  return (
    <>
      <Header />
      <Toolbar />
      <Body />
      <Footer />
    </>
  )
}

export default Index
