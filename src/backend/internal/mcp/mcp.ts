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

export function handleMcpJsonRpc(method: string, id: any, params: any): any {
  switch (method) {
    case "tools/list":
      return {
        jsonrpc: "2.0",
        result: {
          tools: listMcpTools(),
        },
        id,
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
        error: { code: -32601, message: "方法未找到" },
        id,
      }
  }
}
