import assert from "node:assert/strict"
import path from "node:path"
import { test } from "node:test"
import { createFixture } from "./helpers/frontend-tree-fixture.mjs"
const { chromium } = await import(
  process.env.PDF_TEST_PLAYWRIGHT_MODULE || "playwright"
)

const dist = path.resolve(process.env.FRONTEND_BROWSER_DIST || "dist")

async function open(pageSize) {
  const fixture = createFixture(dist, { pageSize })
  await new Promise((resolve) => fixture.server.listen(0, "127.0.0.1", resolve))
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  const base = `http://127.0.0.1:${fixture.server.address().port}`
  const close = async () => {
    await browser.close()
    await new Promise((resolve) => fixture.server.close(resolve))
  }
  return { page, base, errors, close }
}

const treeNames = (page) =>
  page.locator("#drive-desktop-navigation .drive-tree-link").allInnerTexts()

test(
  "folder tree follows navigation and keeps every folder of a paginated listing",
  { timeout: 60000 },
  async () => {
    const { page, base, errors, close } = await open(20)
    try {
      await page.goto(base + "/")
      await page.locator(".drive-file-row").first().waitFor()
      const tree = page.locator("#drive-desktop-navigation")
      await tree.locator(".drive-tree-link", { hasText: "B2" }).click()
      await page.waitForURL(base + "/B2")
      await tree.locator(".drive-tree-link", { hasText: "Movies" }).waitFor()
      assert.deepEqual(
        await tree.locator(".drive-tree-current").allInnerTexts(),
        ["B2"],
      )
      await page.getByRole("button", { name: "Collapse B2", exact: true }).click()
      assert.ok(!(await treeNames(page)).includes("Movies"))
      await page.getByRole("button", { name: "Expand B2", exact: true }).click()
      await tree.locator(".drive-tree-link", { hasText: "Movies" }).waitFor()

      // 25 albums, 20 per page: the tree must still list all of them.
      await page.goto(base + "/Photos")
      await page.locator(".drive-file-row").first().waitFor()
      assert.equal(await page.locator(".drive-file-row").count(), 20)
      await tree
        .locator(".drive-tree-link", { hasText: "Album 25" })
        .waitFor()
      assert.equal(
        (await treeNames(page)).filter((name) => name.startsWith("Album"))
          .length,
        25,
      )
      // The details summary must not count only the visible page.
      assert.match(
        await page.locator("#drive-inspector").innerText(),
        /25 items/,
      )
      assert.deepEqual(errors, [])
    } finally {
      await close()
    }
  },
)

test(
  "transfers toggles the upload panel and never targets a non-folder page",
  { timeout: 60000 },
  async () => {
    const { page, base, errors, close } = await open(0)
    try {
      await page.goto(base + "/B2")
      await page.locator(".drive-file-row").first().waitFor()
      const transfers = page.locator(".drive-icon-rail-item", {
        hasText: "Transfers",
      })
      const panel = page.locator(".upload-center")
      await transfers.click()
      await panel.waitFor()
      assert.match(await panel.innerText(), /\/B2/)
      await transfers.click()
      await panel.waitFor({ state: "detached" })

      // Recent keeps the previous folder's state; uploading must not follow.
      await page.locator(".drive-icon-rail-item", { hasText: "Recent" }).click()
      await page.waitForURL(base + "/@recent")
      assert.equal(await transfers.count(), 0)
      assert.equal(await panel.count(), 0)
      assert.deepEqual(errors, [])
    } finally {
      await close()
    }
  },
)
