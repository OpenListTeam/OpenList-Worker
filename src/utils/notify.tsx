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
              // 默认通知容器在右上角(top-end, top=16px),会挡住 header 右侧的搜索框
              // 公告 toast 往下推 48px:顶部恰好贴 header 下缘(60px),上移避开搜索框
              marginTop: "$12",
            }}
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
