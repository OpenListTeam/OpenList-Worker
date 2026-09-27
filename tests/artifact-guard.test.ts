import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, test } from "node:test"

const workflowPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.github/workflows/edgeone-artifact-guard.yml",
)
const workflow = fs.readFileSync(workflowPath, "utf8")

describe("EdgeOne Artifact Guard workflow", () => {
  test("uses the lockfile and never pushes generated artifacts", () => {
    assert.match(workflow, /pnpm install --frozen-lockfile/)
    assert.match(workflow, /contents: read/)
    assert.doesNotMatch(workflow, /contents: write/)
    assert.doesNotMatch(workflow, /git push origin/)
    assert.doesNotMatch(workflow, /Auto-commit refreshed artifact/)
  })

  test("fails and uploads the refreshed artifact when it is stale", () => {
    assert.match(workflow, /git status --porcelain -- cloud-functions/)
    assert.match(workflow, /git diff --exit-code -- cloud-functions/)
    assert.match(workflow, /if: failure\(\)/)
  })
})
