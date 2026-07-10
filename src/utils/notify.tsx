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

const notify = {
  render: (element: JSXElement) => {
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
