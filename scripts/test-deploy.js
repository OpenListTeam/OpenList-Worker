import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"

const deployUrl = new URL("./deploy.js", import.meta.url)
const root = fileURLToPath(new URL("../", import.meta.url))

// Intercept child processes so these tests cannot build, install, or deploy.
function runDeploy(args = [], failedStep = -1, scenario = {}) {
  const mockModule = `
    export const unstable_readConfig = () => globalThis.deploymentFixture.config
    export const experimental_readRawConfig = () => ({
      rawConfig: JSON.parse(globalThis.deploymentFixture.source),
      configPath: globalThis.deploymentFixture.path,
      redirected: false,
    })
    export const experimental_patchConfig = (path, patch) => {
      globalThis.deploymentFixture.source = JSON.stringify({
        ...JSON.parse(globalThis.deploymentFixture.source), ...patch,
      })
    }
  `
  const loader = `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "wrangler") return {
        url: ${JSON.stringify("data:text/javascript," + encodeURIComponent(mockModule))},
        shortCircuit: true,
      }
      return nextResolve(specifier, context)
    }
  `
  const config = scenario.config ?? { kv_namespaces: [] }
  const harness = [
    'import childProcess from "node:child_process"',
    'import fs from "node:fs"',
    'import { register, syncBuiltinESMExports } from "node:module"',
    "register(" + JSON.stringify("data:text/javascript," + encodeURIComponent(loader)) + ")",
    "globalThis.deploymentFixture = " + JSON.stringify({
      config,
      source: JSON.stringify(config),
      path: fileURLToPath(new URL("../wrangler.jsonc", import.meta.url)),
    }),
    "const originalRead = fs.readFileSync",
    "fs.readFileSync = (path, ...args) => path === deploymentFixture.path ? deploymentFixture.source : originalRead(path, ...args)",
    "fs.writeFileSync = (path, data) => {",
    '  if (path !== deploymentFixture.path) throw new Error("Unexpected file write")',
    "  deploymentFixture.source = data",
    "}",
    "const responses = " + JSON.stringify(scenario.responses ?? []),
    "globalThis.fetch = async (url, options) => {",
    '  if (!responses.length) throw new Error("Unexpected API request")',
    '  console.log("API " + JSON.stringify({ url, method: options.method ?? "GET" }))',
    "  return new Response(JSON.stringify({ success: true, errors: [], result: responses.shift() }))",
    "}",
    "let step = 0",
    "childProcess.spawnSync = (command, args, options) => {",
    '  console.log("STEP " + JSON.stringify({ command, args, cwd: options.cwd, config: JSON.parse(deploymentFixture.source) }))',
    '  const stdout = JSON.stringify(args.includes("auth") ? { type: "api_token", token: "test-auth-token" } : { loggedIn: true, accounts: [{ id: "test-account" }] })',
    "  return { status: step++ === " + failedStep + " ? 23 : 0, stdout }",
    "}",
    "syncBuiltinESMExports()",
    'process.argv = ["node", "deploy.js", ...' + JSON.stringify(args) + "]",
    "await import(" + JSON.stringify(deployUrl.href) + ")",
    'console.log("CONFIG " + deploymentFixture.source)',
  ].join("\n")
  const env = { ...process.env }
  for (const name of ["CLOUDFLARE_ACCOUNT_ID", "CF_ACCOUNT_ID", "CLOUDFLARE_ENV", "WRANGLER_CI_OVERRIDE_NAME"]) {
    delete env[name]
  }
  Object.assign(env, scenario.env)
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", harness],
    { cwd: fileURLToPath(new URL("./", import.meta.url)), encoding: "utf8", env },
  )
  if (result.error) throw result.error
  const steps = result.stdout
    .split("\n")
    .filter((line) => line.startsWith("STEP "))
    .map((line) => JSON.parse(line.slice(5)))
  return { ...result, steps }
}

test("deployment fetches the frontend and calls Wrangler from the project root", () => {
  const result = runDeploy()
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(
    result.steps.map((step) => step.args),
    [
      ["scripts/fetch-frontend.mjs"],
      ["node_modules/wrangler/bin/wrangler.js", "deploy"],
    ],
  )
  for (const step of result.steps) {
    assert.equal(step.command, process.execPath)
    assert.equal(step.cwd, root)
  }
})

test("existing assets can be bundled with Wrangler arguments", () => {
  for (const flag of ["--dry-run", "--dry-run=true"]) {
    const result = runDeploy(["--skip-build", flag, "--env", "staging"], -1, {
      config: { kv_namespaces: [{ binding: "KV" }] },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(result.steps.map((step) => step.args), [
      ["node_modules/wrangler/bin/wrangler.js", "deploy", flag, "--env", "staging"],
    ])
    assert.doesNotMatch(result.stdout, /^API /m)
  }
})

test("frontend failure stops deployment and preserves the exit status", () => {
  const result = runDeploy([], 0)
  assert.equal(result.status, 23)
  assert.equal(result.steps.length, 1)
})

test("Wrangler failure preserves the exit status", () => {
  const result = runDeploy(["--skip-build"], 0)
  assert.equal(result.status, 23)
  assert.equal(result.steps.length, 1)
})

test("help runs no build or deployment commands", () => {
  const result = runDeploy(["--help"])
  assert.equal(result.status, 0)
  assert.equal(result.steps.length, 0)
  assert.match(result.stdout, /runtime secrets/)
})

test("legacy KV creation is rejected without creating unused resources", () => {
  const result = runDeploy(["--kv"])
  assert.equal(result.status, 1)
  assert.equal(result.steps.length, 0)
  assert.match(result.stderr, /deployment provisions it automatically/)
})

test("preview upload calls versions upload without deploying production traffic", () => {
  const result = runDeploy(["--skip-build", "--upload", "--message", "Preview build"])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.steps.map((step) => step.args), [
    ["node_modules/wrangler/bin/wrangler.js", "versions", "upload", "--message", "Preview build"],
  ])
})

test("production and preview commands pass resolved IDs to Wrangler and then restore the config", () => {
  const config = { name: "example", account_id: "test-account", kv_namespaces: [{ binding: "KV" }] }
  for (const uploadArgs of [[], ["--upload"]]) {
    for (const failedStep of [-1, 1]) {
      const result = runDeploy(["--skip-build", ...uploadArgs], failedStep, {
        config,
        responses: [{ bindings: [] }, [{ title: "example-kv", id: "reused-id" }]],
      })
      assert.equal(result.status, failedStep === -1 ? 0 : 23, result.stderr)
      assert.deepEqual(result.steps.at(-1).config.kv_namespaces, [{ binding: "KV", id: "reused-id" }])
      const restored = result.stdout.split("\n").find((line) => line.startsWith("CONFIG "))
      assert.deepEqual(JSON.parse(restored.slice(7)), config)
      assert.doesNotMatch(result.stdout + result.stderr, /test-auth-token/)
    }
  }
})

test("CI Worker name overrides and named environments are used when resolving KV", () => {
  const config = { name: "example-staging", account_id: "test-account", kv_namespaces: [{ binding: "KV" }] }
  const result = runDeploy(["--skip-build", "--upload", "--env", "staging", "--name", "cli-name"], -1, {
    config,
    env: { WRANGLER_CI_OVERRIDE_NAME: "ci-worker" },
    responses: [{ bindings: [] }, [{ title: "ci-worker-kv", id: "ci-id" }]],
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /workers\/scripts\/ci-worker\/settings/)
  assert.deepEqual(result.steps.at(-1).config.env.staging.kv_namespaces, [{ binding: "KV", id: "ci-id" }])
  assert.deepEqual(result.steps.at(-1).config.kv_namespaces, config.kv_namespaces)
})

test("credential failures stop before any upload or config write", () => {
  const result = runDeploy(["--skip-build", "--upload"], 0, {
    config: { name: "example", kv_namespaces: [{ binding: "KV" }] },
  })
  assert.equal(result.status, 23, result.stderr)
  assert.equal(result.steps.length, 1)
  assert.doesNotMatch(result.stdout, /^API /m)
})
