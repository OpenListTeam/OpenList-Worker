#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`OpenList Cloudflare Workers deployment

  node scripts/deploy.js                 Fetch the frontend and deploy
  node scripts/deploy.js --skip-build    Deploy existing frontend assets
  node scripts/deploy.js --skip-build --dry-run
                                        Bundle without deploying

Additional arguments are passed to Wrangler.
Wrangler provisions the bindings declared in wrangler.jsonc.
Configure JWT_SECRET and ENCRYPTION_SECRET as runtime secrets.
`)
  process.exit(0)
}

if (args.includes("--kv")) {
  console.error(
    "--kv is no longer supported. Declare the KV binding in wrangler.jsonc; Wrangler provisions it during deployment.",
  )
  process.exit(1)
}

const steps = []
if (!args.includes("--skip-build")) {
  steps.push(["scripts/fetch-frontend.mjs"])
}
steps.push([
  "node_modules/wrangler/bin/wrangler.js",
  "deploy",
  ...args.filter((arg) => arg !== "--skip-build"),
])

for (const step of steps) {
  const result = spawnSync(process.execPath, step, {
    cwd: ROOT,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.signal) {
    console.error("Deployment step terminated by signal:", result.signal)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status)
}
