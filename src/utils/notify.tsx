import {
  Box,
  CloseButton,
  // Alert,
  // AlertDescription,
  // AlertIcon,
  // AlertTitle,
  // CloseButton,
  notificationService,
} from "@hope-ui/solid"
import { JSXElement } from "solid-js"
import { alphaBgColor, firstUpperCase } from "."

// 轻量配置类型:仅暴露 render 用到的可选项
type NotifyConfig = {
  duration?: number
  persistent?: boolean
  closable?: boolean
  onClose?: (id: string) => void
}

const notify = {
  render: (element: JSXElement, config?: NotifyConfig) => {
    notificationService.show({
      render: (props) => {
        return (
          <Box
            css={{
              display: "flex",
              backdropFilter: "blur(8px)",
              backgroundColor: alphaBgColor(),
              boxShadow: "$md",
              borderRadius: "$lg",
              padding: "$3",
              // 公告 toast 下移 48px:顶部从 16px 移到 64px,低于 header(60px),
              // 与右上角搜索框零重叠,关闭按钮和搜索框都能正常点击
              marginTop: "$12",
            }}
            // HopeUI 通知容器在鼠标进入时清除自动关闭定时器(clearCloseDelay),
            // 鼠标移出才重新计时(closeWithDelay)。公告 toast 与搜索框位置重叠,
            // 点击搜索框时鼠标停留在 toast 上,导致定时器被清后不再恢复,公告永不关闭。
            // 这里阻止 mouseenter/mouseleave 冒泡,让公告始终按 duration 自动关闭。
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
          >
            <div
              style={{
                "flex-grow": 1,
                display: "flex",
                "align-items": "center",
              }}
            >
              <div style={{ margin: "auto" }}>{element}</div>
            </div>
            <div style={{ display: "inline-block", padding: "5px" }}>
              <CloseButton
                style={{ float: "right" }}
                right="$2"
                top="$2"
                onClick={() => {
                  props.close()
                  notificationService.hide(props.id)
                }}
              />
            </div>
          </Box>
        )
      },
      ...config,
    })
  },
  success: (message: string) => {
    notificationService.show({
      status: "success",
      description: firstUpperCase(message),
      closable: true,
    })
  },
  error: (message: string) => {
    notificationService.show({
      status: "danger",
      description: firstUpperCase(message),
      closable: true,
    })
  },
  info: (message: string) => {
    notificationService.show({
      status: "info",
      description: firstUpperCase(message),
      closable: true,
    })
  },
  warning: (message: string) => {
    notificationService.show({
      status: "warning",
      description: firstUpperCase(message),
      closable: true,
    })
  },
}

export { notify }
