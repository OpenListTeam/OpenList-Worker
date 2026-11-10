import assert from "node:assert/strict"
import { test } from "node:test"

import { resolveTickBudget, type TaskSettings } from "./settings"

function settings(overrides: Partial<TaskSettings> = {}): TaskSettings {
  return {
    enabled: true,
    syncThresholdBytes: 32 * 1024 * 1024,
    probeMaxEntries: 200,
    tickBudgetMs: 0,
    parallelUnits: 1,
    keepDone: 50,
    maxRetry: {
      upload: 1,
      copy: 2,
      move: 2,
      offline_download: 2,
      offline_download_transfer: 2,
      decompress: 2,
      decompress_upload: 1,
      seed_generate: 2,
      seed_save: 1,
    },
    ...overrides,
  }
}

test("explicit tick budget wins over the automatic default", () => {
  assert.equal(
    resolveTickBudget(settings({ tickBudgetMs: 15000 }), "do"),
    15000,
  )
  assert.equal(
    resolveTickBudget(settings({ tickBudgetMs: 15000 }), "cron"),
    15000,
  )
})

test("explicit tick budget is clamped to a safe range", () => {
  assert.equal(resolveTickBudget(settings({ tickBudgetMs: 100 }), "do"), 200)
  assert.equal(
    resolveTickBudget(settings({ tickBudgetMs: 999999 }), "do"),
    60000,
  )
})

test("automatic default is conservative on Cloudflare (free-plan safe)", () => {
  assert.equal(resolveTickBudget(settings(), "do"), 2000)
  assert.equal(resolveTickBudget(settings(), "cron"), 2000)
  assert.equal(resolveTickBudget(settings(), "inline"), 2000)
})

test("automatic default is larger where the runtime allows it", () => {
  assert.equal(resolveTickBudget(settings(), "http"), 5000)
  assert.equal(resolveTickBudget(settings(), "node"), 30000)
})
