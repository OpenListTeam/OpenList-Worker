import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"

const deployUrl = new URL("./deploy.js", import.meta.url)
const root = fileURLToPath(new URL("../", import.meta.url))

// Intercept child processes so these tests cannot build, install, or deploy.
function runDeploy(args = [], failedStep = -1) {
  const harness = [
    'import childProcess from "node:child_process"',
    'import { syncBuiltinESMExports } from "node:module"',
    "let step = 0",
    "childProcess.spawnSync = (command, args, options) => {",
    '  console.log("STEP " + JSON.stringify({ command, args, cwd: options.cwd }))',
    "  return { status: step++ === " + failedStep + " ? 23 : 0 }",
    "}",
    "syncBuiltinESMExports()",
    'process.argv = ["node", "deploy.js", ...' + JSON.stringify(args) + "]",
    "await import(" + JSON.stringify(deployUrl.href) + ")",
  ].join("\n")
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", harness],
    { cwd: fileURLToPath(new URL("./", import.meta.url)), encoding: "utf8" },
  )
  if (result.error) throw result.error
  const steps = result.stdout
    .split("\n")
    .filter((line) => line.startsWith("STEP "))
    .map((line) => JSON.parse(line.slice(5)))
  return { ...result, steps }
}

test("deployment leaves resource provisioning to Wrangler", () => {
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
  const result = runDeploy(["--skip-build", "--dry-run", "--env", "staging"])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.steps.map((step) => step.args), [
    ["node_modules/wrangler/bin/wrangler.js", "deploy", "--dry-run", "--env", "staging"],
  ])
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
  assert.match(result.stderr, /Wrangler provisions it during deployment/)
})
