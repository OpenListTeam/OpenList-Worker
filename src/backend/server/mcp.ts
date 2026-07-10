import { Hono } from "hono"
import { handleMcpJsonRpc } from "../internal/mcp/mcp"

export const mcpRouter = new Hono()

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
    return c.json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
      id: id || null,
    }, 400)
  }

  const responseRpc = handleMcpJsonRpc(method, id, params)
  const status = responseRpc.error ? 404 : 200
  return c.json(responseRpc, status)
})
