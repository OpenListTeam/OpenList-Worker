import test from "node:test"
import assert from "node:assert/strict"
import { EmbyDriver, normalizeEmbyAddition } from "./driver"
import { EmbyClient } from "./util"

test("normalizeEmbyAddition normalizes url and defaults", () => {
  const a = normalizeEmbyAddition({ url: "http://localhost:8096/" })
  assert.equal(a.url, "http://localhost:8096")
  assert.equal(a.link_method, "stream")
  assert.equal(a.root_folder_id, "1")
})

test("EmbyDriver instantiation without network", () => {
  const driver = new EmbyDriver({
    url: "http://localhost:8096",
    api_key: "key",
    user_id: "user",
  })
  assert.ok(driver)
})

test("EmbyClient stores base url", () => {
  const c = new EmbyClient("http://localhost:8096/", "token", "user")
  assert.equal(c.baseURL, "http://localhost:8096")
  assert.equal(c.token, "token")
})
