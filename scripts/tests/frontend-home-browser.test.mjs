import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { createSearchFixture } from "./helpers/frontend-search-fixture.mjs"
const { chromium } = await import(
  process.env.PDF_TEST_PLAYWRIGHT_MODULE || "playwright"
)

test(
  "home keeps actions usable across desktop, mobile, selection and themes",
  { timeout: 60000 },
  async () => {
    const fixture = createSearchFixture(
      path.resolve(process.env.FRONTEND_BROWSER_DIST || "dist"),
      { permission: 8 },
    )
    await new Promise((resolve) =>
      fixture.server.listen(0, "127.0.0.1", resolve),
    )
    let browser
    try {
      browser = await chromium.launch({ headless: true })
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      })
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`http://127.0.0.1:${fixture.server.address().port}/`)
      await page.locator(".drive-file-row").first().waitFor()
      assert.equal(await page.locator(".drive-item-count").innerText(), "2")
      // Pro layout: folder tree, status bar and details panel.
      await page
        .locator(".drive-tree-link", { hasText: "Documents" })
        .waitFor()
      assert.match(
        await page.locator(".drive-status-bar").innerText(),
        /2 items/,
      )
      const inspector = page.locator("#drive-inspector")
      assert.ok(await inspector.isVisible(), "details open on wide screens")
      assert.match(await inspector.innerText(), /Current folder/)
      const pdf = page.getByRole("checkbox", {
        name: "Select original.pdf",
        exact: true,
      })
      await pdf.press("Space")
      await inspector.getByRole("heading", { name: "original.pdf" }).waitFor()
      assert.ok(await inspector.getByLabel("Direct link", { exact: true }).isVisible())
      assert.match(
        await page.locator(".drive-status-bar").innerText(),
        /1 selected/,
      )
      const screenshots = process.env.HOME_SCREENSHOT_DIR
      if (screenshots) {
        fs.mkdirSync(screenshots, { recursive: true })
        await page.screenshot({
          path: path.join(screenshots, "home-1440-selected.png"),
        })
      }
      await pdf.press("Space")
      const withDetails = await page.locator(".drive-main").boundingBox()
      await page
        .getByRole("button", { name: "Hide details", exact: true })
        .click()
      assert.ok(!(await inspector.isVisible()))
      assert.ok(
        (await page.locator(".drive-main").boundingBox()).width >
          withDetails.width,
      )
      await page
        .getByRole("button", { name: "Show details", exact: true })
        .click()
      assert.ok(await inspector.isVisible())
      const before = await page.locator(".drive-main").boundingBox()
      await page
        .getByRole("button", { name: "Collapse sidebar", exact: true })
        .click()
      assert.ok(
        (await page.locator(".drive-main").boundingBox()).width > before.width,
      )
      await page
        .getByRole("button", { name: "Expand sidebar", exact: true })
        .click()
      await page
        .getByRole("checkbox", { name: "Select all", exact: true })
        .press("Space")
      assert.equal(await page.locator(".drive-file-section").count(), 0)
      await page
        .getByRole("checkbox", { name: "Select all", exact: true })
        .press("Space")
      const screenshotDir = process.env.HOME_SCREENSHOT_DIR
      if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true })
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 })
        assert.ok(await page.locator(".drive-heading-upload span").isVisible())
        assert.ok(await page.locator(".drive-heading-mkdir span").isVisible())
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `overflow at ${width}`,
        )
        const upload = await page.locator(".drive-heading-upload").boundingBox()
        assert.ok(upload.height >= 40)
        if (screenshotDir && [1440, 390].includes(width))
          await page.screenshot({
            path: path.join(screenshotDir, `home-${width}.png`),
            fullPage: true,
          })
      }
      // Phone: tab bar, folder drawer and the details bottom sheet.
      await page.setViewportSize({ width: 390, height: 844 })
      await page.locator(".drive-tab-bar").waitFor()
      assert.equal(
        (await page.locator(".drive-tab-current").innerText()).trim(),
        "Files",
      )
      await page.getByRole("button", { name: "Workspace", exact: true }).click()
      await page
        .locator("#drive-drawer-tree .drive-tree-link", { hasText: "Documents" })
        .waitFor()
      // Close it the way a person does. (Escape depends on the drawer having
      // taken focus after its open animation, which varies between runners.)
      await page.locator(".drive-drawer-close").click()
      await page.locator("#drive-drawer-tree").waitFor({ state: "hidden" })
      await page
        .getByRole("button", { name: "Show details", exact: true })
        .click()
      const sheet = page.getByRole("dialog", { name: "Details" })
      await sheet.waitFor()
      assert.match(await sheet.innerText(), /Current folder/)
      if (screenshotDir)
        await page.screenshot({
          path: path.join(screenshotDir, "home-390-details.png"),
        })
      await page.keyboard.press("Escape")
      await sheet.waitFor({ state: "hidden" })
      await page.locator(".drive-heading-mkdir").click()
      await page.getByRole("dialog").waitFor()
      await page.keyboard.press("Escape")
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.emulateMedia({ colorScheme: "dark" })
      await page.reload()
      await page.locator(".drive-file-row").first().waitFor()
      assert.equal(
        await page.locator(".drive-shell").getAttribute("data-drive-mode"),
        "dark",
      )
      if (screenshotDir)
        await page.screenshot({
          path: path.join(screenshotDir, "home-dark.png"),
          fullPage: true,
        })
      assert.deepEqual(errors, [])
    } finally {
      await browser?.close()
      await new Promise((resolve) => fixture.server.close(resolve))
    }
  },
)
