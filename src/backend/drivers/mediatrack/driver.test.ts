import test from "node:test"
import assert from "node:assert/strict"
import { MediatrackDriver } from "./driver"

test("MediaTrack driver instantiation", () => {
  const driver = new MediatrackDriver({
    access_token: "mock_mediatrack_token",
    project_id: "mock_proj_123",
  })
  assert.ok(driver)
})
