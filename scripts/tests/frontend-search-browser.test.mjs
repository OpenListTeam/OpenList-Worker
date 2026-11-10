import assert from "node:assert/strict"
import path from "node:path"
import { test } from "node:test"
import { createSearchFixture } from "./helpers/frontend-search-fixture.mjs"
const { chromium } = await import(
  process.env.PDF_TEST_PLAYWRIGHT_MODULE || "playwright"
)

test(
  "inline search preserves folder state, filters, pagination, root paths and rejects stale results",
  { timeout: 90000 },
  async () => {
    const fixture = createSearchFixture(
      path.resolve(process.env.FRONTEND_BROWSER_DIST || "dist"),
    )
    await new Promise((resolve) =>
      fixture.server.listen(0, "127.0.0.1", resolve),
    )
    const browser = await chromium.launch({ headless: true })
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: "en-US",
      })
      const page = await context.newPage(),
        errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(
        `http://127.0.0.1:${fixture.server.address().port}/?pwd=test-password`,
      )
      const input = page.getByRole("searchbox", { name: "Search", exact: true })
      await input.waitFor({ state: "visible" })
      await page
        .locator(".drive-file-row")
        .first()
        .waitFor({ state: "visible" })
      assert.equal(fixture.searches.length, 0)
      await input.fill("report")
      await page
        .getByRole("heading", { name: "2 results", exact: true })
        .waitFor({ state: "visible" })
      assert.equal(await page.getByRole("dialog").count(), 0)
      const result = page
        .locator(".drive-search-result")
        .filter({ hasText: "report.pdf" })
      assert.equal(
        await result.getAttribute("href"),
        "/Documents/report.pdf?from=search",
      )
      // Files open in the full-screen viewer in this tab.
      assert.equal(await result.getAttribute("target"), null)
      assert.equal(await result.locator("mark").innerText(), "report")
      assert.equal(fixture.searches.at(-1).parent, "/")
      assert.equal(fixture.searches.at(-1).password, "test-password")
      assert.equal(fixture.searches.at(-1).per_page, 100)
      await page.locator(".drive-search-filters select").selectOption("1")
      await page
        .getByRole("heading", { name: "1 results", exact: true })
        .waitFor({ state: "visible" })
      assert.equal(await page.locator(".drive-search-result").count(), 1)
      await page
        .getByRole("button", { name: "Clear search", exact: true })
        .click()
      await page
        .getByRole("heading", { name: "All files", exact: true })
        .waitFor({ state: "visible" })
      const slowRequest = page.waitForRequest(
        (request) =>
          request.url().endsWith("/fs/search") &&
          request.postDataJSON().keywords === "slow",
      )
      await input.fill("slow")
      await slowRequest
      await input.fill("report")
      await page
        .getByRole("heading", { name: "2 results", exact: true })
        .waitFor({ state: "visible" })
      await fixture.slowFinished()
      assert.equal(
        await page
          .locator(".drive-search-result")
          .filter({ hasText: "old-result.pdf" })
          .count(),
        0,
      )
      await input.fill("none")
      await page
        .getByRole("heading", { name: "0 results", exact: true })
        .waitFor({ state: "visible" })
      await input.fill("forbidden")
      await page
        .getByRole("button", { name: "Retry", exact: true })
        .waitFor({ state: "visible" })
      await input.fill("pages")
      await page
        .getByRole("heading", { name: "101 results", exact: true })
        .waitFor({ state: "visible" })
      await page.getByRole("button", { name: "Next", exact: true }).click()
      await page
        .locator(".drive-search-result")
        .filter({ hasText: "page-2.pdf" })
        .waitFor({ state: "visible" })
      assert.equal(fixture.searches.at(-1).page, 2)
      await input.fill("report")
      await page
        .getByRole("heading", { name: "2 results", exact: true })
        .waitFor({ state: "visible" })
      await page
        .locator(".drive-search-result")
        .filter({ hasText: "Documents" })
        .filter({ hasNotText: "report.pdf" })
        .click()
      await page.waitForURL("**/Documents?from=search")
      assert.equal(await input.inputValue(), "")
      await page.keyboard.press("Control+k")
      assert.equal(
        await input.evaluate((element) => document.activeElement === element),
        true,
      )
      await input.fill("report")
      await page
        .getByRole("heading", { name: "2 results", exact: true })
        .waitFor({ state: "visible" })
      assert.equal(fixture.searches.at(-1).parent, "/Documents")
      await input.press("Escape")
      assert.equal(await input.inputValue(), "")
      await page.setViewportSize({ width: 390, height: 844 })
      await input.fill("report")
      await page
        .getByRole("heading", { name: "2 results", exact: true })
        .waitFor({ state: "visible" })
      assert.equal(await page.getByRole("dialog").count(), 0)
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      await page
        .getByRole("button", { name: "Back to folder", exact: true })
        .click()
      assert.equal(await input.inputValue(), "")
      await input.fill("unauthorized")
      await page.waitForURL("**/@login?redirect=*")
      assert.deepEqual(errors, [])
    } finally {
      await browser.close()
      fixture.server.closeAllConnections()
      await new Promise((resolve) => fixture.server.close(resolve))
    }
  },
)
