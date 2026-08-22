export type PluginType =
  | "ui"
  | "preview"
  | "tool"
  | "theme"
  | "integration"
  | "system"

export type PluginPermission =
  | "fs:read"
  | "fs:write"
  | "fs:delete"
  | "storage:manage"
  | "settings:manage"
  | "user:manage"
  | "dom:inject"
  | "router:hijack"
  | "network:fetch"
  | "system:admin"

export interface PluginConfigField {
  key: string
  label: string
  type: "string" | "number" | "bool" | "select" | "text"
  defaultValue?: any
  options?: string[]
  description?: string
  required?: boolean
}

export interface PluginItem {
  id: string
  name: string
  version: string
  description: string
  author?: string
  homepage?: string
  repository?: string
  icon?: string
  type: PluginType
  enabled: boolean
  high_privilege?: boolean
  permissions?: PluginPermission[]
  entry_url?: string
  script_content?: string
  style_content?: string
  config_schema?: PluginConfigField[]
  config_values?: Record<string, any>
  target_hooks?: string[]
  is_builtin?: boolean
  tags?: string[]
  created_at?: string
  updated_at?: string
}
