export interface McpTool {
  name: string
  description: string
  inputSchema: any
}

export interface McpResource {
  uri: string
  name: string
  mimeType: string
  description: string
}

export interface McpPrompt {
  name: string
  description: string
  arguments: Array<{ name: string; description: string; required: boolean }>
}

export function listMcpTools(): McpTool[] {
  return [
    {
      name: "list_files",
      description: "List files and directories in OpenListNext storage",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Storage mount path" },
        },
      },
    },
    {
      name: "get_system_info",
      description: "Fetch server hardware and storage metrics",
      inputSchema: { type: "object", properties: {} },
    },
  ]
}

export function listMcpResources(): McpResource[] {
  return [
    {
      uri: "openlistnext://storage/metrics",
      name: "Storage Metrics",
      mimeType: "application/json",
      description: "Current storage metrics of OpenListNext",
    },
  ]
}

export function listMcpPrompts(): McpPrompt[] {
  return [
    {
      name: "summarize_directory",
      description: "Prompt to summarize contents of a folder",
      arguments: [
        { name: "path", description: "The folder path", required: true },
      ],
    },
  ]
}

/** 实际执行 MCP 工具调用（与 Go server/mcp 对齐，聚焦 list_files / get_system_info） */
async function handleToolCall(
  id: any,
  name: string,
  args: Record<string, any>,
  env?: any,
): Promise<any> {
  try {
    if (name === "list_files") {
      const { listItems } = await import("../op/storage")
      const path = (args?.path || "/") as string
      const { content, provider } = await listItems(path)
      const files = content.map((f) => ({
        name: f.name,
        size: f.size,
        is_dir: f.is_dir,
        modified: f.modified,
      }))
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({ path, provider, files }, null, 2),
            },
          ],
          isError: false,
        },
        id,
      }
    }
    if (name === "get_system_info") {
      const { getDb } = await import("../model/db")
      const db = await getDb(env)
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  storages: db?.storages?.length ?? 0,
                  users: db?.users?.length ?? 0,
                  metas: db?.metas?.length ?? 0,
                  shares: db?.shares?.length ?? 0,
                },
                null,
                2,
              ),
            },
          ],
          isError: false,
        },
        id,
      }
    }
    return {
      jsonrpc: "2.0",
      error: { code: -32602, message: `Unknown tool: ${name}` },
      id,
    }
  } catch (e: any) {
    return {
      jsonrpc: "2.0",
      result: {
        content: [{ type: "text", text: String(e?.message || e) }],
        isError: true,
      },
      id,
    }
  }
}

export async function handleMcpJsonRpc(
  method: string,
  id: any,
  params: any,
  env?: any,
): Promise<any> {
  switch (method) {
    case "tools/list":
      return {
        jsonrpc: "2.0",
        result: {
          tools: listMcpTools(),
        },
        id,
      }
    case "tools/call": {
      const name = params?.name as string
      const args = (params?.arguments || {}) as Record<string, any>
      if (!name) {
        return {
          jsonrpc: "2.0",
          error: { code: -32602, message: "Missing tool name" },
          id,
        }
      }
      return handleToolCall(id, name, args, env)
    }
    case "resources/list":
      return {
        jsonrpc: "2.0",
        result: {
          resources: listMcpResources(),
        },
        id,
      }
    case "prompts/list":
      return {
        jsonrpc: "2.0",
        result: {
          prompts: listMcpPrompts(),
        },
        id,
      }
    default:
      return {
        jsonrpc: "2.0",
        error: { code: -32601, message: "Method not found" },
        id,
      }
  }
}
