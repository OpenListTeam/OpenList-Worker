import test from "node:test"
import assert from "node:assert/strict"
import { YandexDriver } from "./driver"

test("Yandex driver instantiation", () => {
  const driver = new YandexDriver({
    refresh_token: "yandex_mock_token",
    use_online_api: true,
  })
  assert.ok(driver)
})
