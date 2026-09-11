#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { resolveKVBindings } from "./kv-bindings.js"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`OpenList Cloudflare Workers deployment

  node scripts/deploy.js                 Fetch the frontend and deploy
  node scripts/deploy.js --skip-build    Deploy existing frontend assets
  node scripts/deploy.js --skip-build --dry-run
                                        Bundle without deploying
  node scripts/deploy.js --skip-build --upload
                                        Upload a preview without deploying

Additional arguments are passed to Wrangler.
KV namespaces are reused or created before calling Wrangler.
Configure JWT_SECRET and ENCRYPTION_SECRET as runtime secrets.
`)
  process.exit(0)
}

if (args.includes("--kv")) {
  console.error(
    "--kv is no longer supported. Declare the KV binding in wrangler.jsonc; deployment provisions it automatically.",
  )
  process.exit(1)
}

function run(step, capture = false) {
  const result = spawnSync(process.execPath, step, {
    cwd: ROOT,
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  })
  if (result.error) throw result.error
  if (result.signal) {
    throw new Error(`Deployment step terminated by signal: ${result.signal}`)
  }
  return result
}

const wrangler = "node_modules/wrangler/bin/wrangler.js"
const uploadOnly = args.includes("--upload")
const wranglerArgs = args.filter(
  (arg) => arg !== "--skip-build" && arg !== "--upload",
)
let configPath
let originalConfig
let preparedConfig

try {
  if (!args.includes("--skip-build")) {
    const result = run(["scripts/fetch-frontend.mjs"])
    if (result.status !== 0) process.exit(result.status)
  }

  const dryRun = args.includes("--dry-run") || args.includes("--dry-run=true")
  if (!dryRun) {
    const { values } = parseArgs({
      args: wranglerArgs,
      options: {
        config: { type: "string", short: "c" },
        env: { type: "string", short: "e" },
        name: { type: "string" },
        cwd: { type: "string" },
      },
      strict: false,
      allowPositionals: true,
    })
    process.chdir(ROOT)
    if (values.cwd) process.chdir(values.cwd)
    const configArgs = { config: values.config, env: values.env }
    const {
      unstable_readConfig,
      experimental_readRawConfig,
      experimental_patchConfig,
    } = await import("wrangler")
    const config = unstable_readConfig(configArgs, { hideWarnings: true })

    if (config.kv_namespaces.some((binding) => !binding.id)) {
      const raw = experimental_readRawConfig(configArgs)
      configPath = raw.configPath
      if (!configPath || !/\.jsonc?$/.test(configPath)) {
        throw new Error(
          "Automatic KV resolution requires a JSON or JSONC Wrangler config.",
        )
      }
      originalConfig = readFileSync(configPath, "utf8")
      const workerName =
        process.env.WRANGLER_CI_OVERRIDE_NAME ?? values.name ?? config.name
      if (!workerName) throw new Error("Set a Worker name before deploying.")
      console.log("Resolving KV bindings...")

      function wranglerJSON(command) {
        const flags = []
        if (values.config) flags.push("--config", values.config)
        if (values.env) flags.push("--env", values.env)
        if (values.cwd) flags.push("--cwd", values.cwd)
        const result = run([wrangler, ...command, "--json", ...flags], true)
        if (result.status !== 0) {
          process.exitCode = result.status
          throw new Error(`Wrangler ${command.join(" ")} failed.`)
        }
        return JSON.parse(result.stdout)
      }

      // Capture credentials in memory; never forward auth-token output to the log.
      const auth = wranglerJSON(["auth", "token"])
      let headers
      switch (auth.type) {
        case "api_token":
        case "oauth":
          headers = { Authorization: `Bearer ${auth.token}` }
          break
        case "api_key":
          headers = { "X-Auth-Key": auth.key, "X-Auth-Email": auth.email }
          break
        default:
          throw new Error("Wrangler returned an unsupported authentication method.")
      }
      let accountId =
        process.env.CLOUDFLARE_ACCOUNT_ID ??
        process.env.CF_ACCOUNT_ID ??
        config.account_id
      if (!accountId) {
        const user = wranglerJSON(["whoami"])
        if (user.accounts.length !== 1) {
          throw new Error(
            "Select a Cloudflare account with account_id or CLOUDFLARE_ACCOUNT_ID.",
          )
        }
        accountId = user.accounts[0].id
      }

      const bindings = await resolveKVBindings(
        accountId,
        workerName,
        config.kv_namespaces,
        headers,
        uploadOnly,
      )
      const env = values.env ?? process.env.CLOUDFLARE_ENV
      const patch =
        env && !raw.redirected
          ? { env: { [env]: { kv_namespaces: bindings } } }
          : { kv_namespaces: bindings }
      if (readFileSync(configPath, "utf8") !== originalConfig) {
        throw new Error("Wrangler config changed while resolving KV; run deployment again.")
      }
      experimental_patchConfig(configPath, patch, false)
      preparedConfig = readFileSync(configPath, "utf8")
      console.log("KV bindings ready.")
    }
  }

  const result = run([
    wrangler,
    ...(uploadOnly ? ["versions", "upload"] : ["deploy"]),
    ...wranglerArgs,
  ])
  process.exitCode = result.status
} catch (error) {
  console.error(error.message)
  process.exitCode ||= 1
} finally {
  // Keep account-specific IDs out of the source config after either success or failure.
  if (preparedConfig !== undefined) {
    if (readFileSync(configPath, "utf8") === preparedConfig) {
      writeFileSync(configPath, originalConfig)
    } else {
      console.warn("Wrangler config changed during deployment; leaving those changes for review.")
    }
  }
}
