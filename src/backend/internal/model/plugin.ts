import { z } from "zod"

export const PLUGIN_MANIFEST_API_VERSION = "v1"
export const PLUGIN_MANIFEST_MAX_BYTES = 65_535
export const PLUGIN_MANIFEST_MAX_DEPTH = 12

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/
const CONTROL_CHARACTERS_WITH_LINE_BREAKS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"])

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/)

const capabilitySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)

const manifestSchema = z
  .object({
    apiVersion: z.literal(PLUGIN_MANIFEST_API_VERSION),
    id: identifierSchema,
    version: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine((value) => !CONTROL_CHARACTERS.test(value)),
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .refine((value) => !CONTROL_CHARACTERS.test(value)),
    description: z
      .string()
      .max(2048)
      .default("")
      .refine((value) => !CONTROL_CHARACTERS_WITH_LINE_BREAKS.test(value)),
    capabilities: z
      .array(capabilitySchema)
      .max(32)
      .default([])
      .refine((values) => new Set(values).size === values.length),
    settingsSchema: z.record(z.unknown()).default({}),
    entry: z.record(z.unknown()).optional(),
  })
  .strict()

export type PluginManifest = z.infer<typeof manifestSchema>
export type PluginRow = Record<string, any> & {
  id: string
  manifest?: PluginManifest
}

export class PluginManifestError extends Error {
  readonly code = "INVALID_PLUGIN_MANIFEST"

  constructor(message: string) {
    super(message)
    this.name = "PluginManifestError"
  }
}

function assertBoundedJson(value: unknown, label: string): void {
  const active = new WeakSet<object>()
  let nodes = 0

  const walk = (current: unknown, depth: number): void => {
    nodes++
    if (nodes > 2_048) {
      throw new PluginManifestError(`${label} contains too many values`)
    }
    if (depth > PLUGIN_MANIFEST_MAX_DEPTH) {
      throw new PluginManifestError(
        `${label} exceeds the maximum nesting depth`,
      )
    }
    if (current === null || typeof current === "boolean") return
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw new PluginManifestError(`${label} contains a non-finite number`)
      }
      return
    }
    if (typeof current === "string") {
      if (current.length > 8_192) {
        throw new PluginManifestError(`${label} contains an oversized string`)
      }
      return
    }
    if (typeof current !== "object") {
      throw new PluginManifestError(`${label} contains a non-JSON value`)
    }
    if (active.has(current)) {
      throw new PluginManifestError(`${label} contains a circular reference`)
    }
    active.add(current)
    if (Array.isArray(current)) {
      if (current.length > 256) {
        throw new PluginManifestError(`${label} contains an oversized array`)
      }
      for (const item of current) walk(item, depth + 1)
    } else {
      const prototype = Object.getPrototypeOf(current)
      if (prototype !== Object.prototype && prototype !== null) {
        throw new PluginManifestError(
          `${label} must contain plain JSON objects`,
        )
      }
      const keys = Object.keys(current)
      if (keys.length > 256) {
        throw new PluginManifestError(`${label} contains too many properties`)
      }
      for (const key of keys) {
        if (FORBIDDEN_JSON_KEYS.has(key)) {
          throw new PluginManifestError(
            `${label} contains a forbidden property`,
          )
        }
        walk((current as Record<string, unknown>)[key], depth + 1)
      }
    }
    active.delete(current)
  }

  walk(value, 0)
  let bytes: number
  try {
    bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength
  } catch {
    throw new PluginManifestError(`${label} must be JSON serializable`)
  }
  if (bytes > PLUGIN_MANIFEST_MAX_BYTES) {
    throw new PluginManifestError(`${label} exceeds the maximum encoded size`)
  }
}

export function parsePluginManifest(input: unknown): PluginManifest {
  const parsed = manifestSchema.safeParse(input)
  if (!parsed.success) {
    throw new PluginManifestError(
      parsed.error.issues
        .map(
          (issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`,
        )
        .join("; "),
    )
  }
  assertBoundedJson(parsed.data, "manifest")
  return parsed.data
}

export function applyPluginManifest(
  plugin: Record<string, any>,
  input: unknown,
): PluginRow {
  const manifest = parsePluginManifest(input)
  if (plugin.id !== manifest.id) {
    throw new PluginManifestError("manifest.id must match the plugin id")
  }
  return {
    ...plugin,
    id: manifest.id,
    name: manifest.displayName,
    version: manifest.version,
    description: manifest.description,
    manifest,
  }
}

const PUBLIC_PLUGIN_FIELDS = [
  "id",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "icon",
  "type",
  "enabled",
  "high_privilege",
  "permissions",
  "is_builtin",
  "tags",
  "created_at",
  "updated_at",
] as const

function publicLegacyPlugin(plugin: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const field of PUBLIC_PLUGIN_FIELDS) {
    if (plugin[field] !== undefined) result[field] = plugin[field]
  }
  return result
}

export function toPublicPlugin(
  plugin: Record<string, any>,
): Record<string, any> {
  const legacy = publicLegacyPlugin(plugin)
  if (plugin.manifest === undefined || plugin.manifest === null) return legacy
  let parsed: PluginManifest
  try {
    parsed = parsePluginManifest(plugin.manifest)
  } catch {
    return legacy
  }
  return {
    ...legacy,
    manifest: {
      apiVersion: parsed.apiVersion,
      id: parsed.id,
      version: parsed.version,
      displayName: parsed.displayName,
      description: parsed.description,
      capabilities: parsed.capabilities,
    },
  }
}
