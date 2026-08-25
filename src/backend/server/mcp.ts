import { Hono } from "hono"
import { handleMcpJsonRpc } from "../internal/mcp/mcp"
import { adminAuthMiddleware } from "./middlewares"

export const mcpRouter = new Hono()

// MCP 端点要求管理员鉴权（当前为占位实现，仅暴露工具 schema；
// 加鉴权防止未授权探测 / 未来接入真实能力时的越权访问）
mcpRouter.use("*", adminAuthMiddleware)

mcpRouter.get("/sse", (c) => {
  c.header("Content-Type", "text/event-stream")
  c.header("Cache-Control", "no-cache")
  c.header("Connection", "keep-alive")

  return c.text(`event: endpoint\ndata: /api/mcp/messages\n\n`)
})

mcpRouter.post("/messages", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { method, id, params } = body

  if (!method) {
    return c.json(
      {
        jsonrpc: "2.0",
        error: { code: -32600, message: "无效的请求" },
        id: id || null,
      },
      400,
    )
  }

  const responseRpc = handleMcpJsonRpc(method, id, params)
  const status = responseRpc.error ? 404 : 200
  return c.json(responseRpc, status)
})
