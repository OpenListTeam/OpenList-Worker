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

const drawerNames = (page) =>
  page.locator("#drive-drawer-tree .drive-tree-link").allInnerTexts()

test(
  "sidebar lists the mounts flat; the phone drawer tree keeps every folder of a paginated listing",
  { timeout: 60000 },
  async () => {
    const { page, base, errors, close } = await open(20)
    try {
      await page.goto(base + "/")
      await page.locator(".drive-file-row").first().waitFor()
      const sidebar = page.locator("#drive-desktop-navigation")
      const mounts = () => sidebar.locator(".drive-mount-link").allInnerTexts()
      await sidebar.locator(".drive-mount-link", { hasText: "B2" }).waitFor()
      assert.deepEqual(await mounts(), ["B2", "Backup", "Photos"])
      await sidebar.locator(".drive-mount-link", { hasText: "B2" }).click()
      await page.waitForURL(base + "/B2")
      await page.locator(".drive-file-row", { hasText: "Movies" }).waitFor()
      // No tree in the sidebar: subfolders never appear there.
      assert.deepEqual(await mounts(), ["B2", "Backup", "Photos"])
      assert.equal(await sidebar.locator(".drive-tree-twisty").count(), 0)
      assert.deepEqual(
        await sidebar.locator(".drive-mount-current").allInnerTexts(),
        ["B2"],
      )
      // Inside a mount, the mount stays marked.
      await page.locator(".drive-file-row", { hasText: "Movies" }).locator(".name").click()
      await page.waitForURL(base + "/B2/Movies")
      await page.locator(".drive-file-row", { hasText: "Inter.mkv" }).waitFor()
      assert.equal(
        await sidebar.locator(".drive-mount-current").getAttribute("aria-current"),
        "location",
      )

      // 25 albums, 20 per page: the drawer tree must still list all of them.
      await page.goto(base + "/Photos")
      await page.locator(".drive-file-row").first().waitFor()
      assert.equal(await page.locator(".drive-file-row").count(), 20)
      // The details summary must not count only the visible page.
      assert.match(
        await page.locator("#drive-inspector").innerText(),
        /25 items/,
      )
      await page.setViewportSize({ width: 390, height: 844 })
      await page.getByRole("button", { name: "Workspace", exact: true }).click()
      await page
        .locator("#drive-drawer-tree .drive-tree-link", { hasText: "Album 25" })
        .waitFor()
      assert.equal(
        (await drawerNames(page)).filter((name) => name.startsWith("Album"))
          .length,
        25,
      )
      assert.deepEqual(errors, [])
    } finally {
      await close()
    }
  },
)

test(
  "navigation stays identical on every page; transfers never targets a non-folder page",
  { timeout: 60000 },
  async () => {
    const { page, base, errors, close } = await open(0)
    try {
      const rail = () =>
        page
          .locator(".drive-side-nav .drive-side-item > span:first-of-type")
          .allInnerTexts()
      const expected = ["Files", "Recent", "Shared", "Transfers"]
      const item = (label) =>
        page.locator(".drive-side-item", { hasText: label })
      const panel = page.locator(".upload-center")

      await page.goto(base + "/B2")
      await page.locator(".drive-file-row").first().waitFor()
      assert.deepEqual(await rail(), expected)
      await item("Transfers").click()
      await panel.waitFor()
      assert.match(await panel.innerText(), /Upload to \/B2/)
      await item("Transfers").click()
      await panel.waitFor({ state: "detached" })

      // Recent and Shared keep the previous folder's state; the sidebar must not
      // change and uploading must not follow to these pages.
      for (const [label, path] of [
        ["Recent", "/@recent"],
        ["Shared", "/@links"],
      ]) {
        await item(label).click()
        await page.waitForURL(base + path)
        assert.deepEqual(await rail(), expected, `sidebar on ${path}`)
      }
      await item("Transfers").click()
      await panel.waitFor()
      assert.match(await panel.innerText(), /No uploads yet/)
      assert.equal(await panel.locator(".upload-picker").count(), 0)
      await item("Transfers").click()
      await panel.waitFor({ state: "detached" })
      assert.deepEqual(errors, [])
    } finally {
      await close()
    }
  },
)

test(
  "upload tray lists tasks, flags failures, folds finished ones and minimizes to a pill",
  { timeout: 60000 },
  async () => {
    const { page, base, errors, close } = await open(0)
    try {
      await page.route("**/api/fs/put", (route) => {
        const name = decodeURIComponent(route.request().headers()["file-path"])
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            name.includes("broken")
              ? { code: 500, message: "B2 returned 503", data: null }
              : { code: 200, message: "success", data: null },
          ),
        })
      })
      const panel = page.locator(".upload-center")
      await page.goto(base + "/B2")
      await page.locator(".drive-file-row").first().waitFor()
      await page.locator(".drive-side-item", { hasText: "Transfers" }).click()
      const chooser = page.waitForEvent("filechooser")
      await panel.getByRole("button", { name: "Choose files" }).click()
      await (await chooser).setFiles([
        { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(2048) },
        { name: "broken.zip", mimeType: "application/zip", buffer: Buffer.alloc(1024) },
      ])

      const failed = panel.locator(".upload-row[data-status=error]")
      await failed.waitFor()
      assert.match(await failed.innerText(), /broken\.zip[\s\S]*B2 returned 503/)
      assert.equal(await failed.getByRole("button", { name: "Restart" }).count(), 1)
      assert.equal(await failed.locator(".upload-kind").getAttribute("data-kind"), "archive")

      // The finished upload folds away until asked for.
      const toggle = panel.locator(".upload-done-toggle")
      await toggle.waitFor()
      assert.match(await toggle.innerText(), /1 finished/)
      assert.equal(await panel.locator(".upload-row[data-status=success]").count(), 0)
      await toggle.click()
      const done = panel.locator(".upload-row[data-status=success]")
      await done.waitFor()
      assert.equal(await done.locator(".upload-kind").getAttribute("data-kind"), "video")
      assert.match(await done.innerText(), /clip\.mp4[\s\S]*Copy link/)

      // Minimize to the pill and back.
      await panel.getByRole("button", { name: "Minimize uploads" }).click()
      const pill = panel.locator(".upload-pill")
      await pill.waitFor()
      assert.equal(await panel.locator(".upload-rows").count(), 0)
      await pill.click()
      await failed.waitFor()

      // A failed task keeps the tray open: closing is offered only once nothing
      // is left to cancel.
      assert.equal(await panel.getByRole("button", { name: "Close uploads" }).count(), 0)
      await failed.getByRole("button", { name: /Cancel broken\.zip/ }).click()
      await panel.getByRole("button", { name: "Close uploads" }).click()
      await panel.waitFor({ state: "detached" })
      assert.deepEqual(errors, [])
    } finally {
      await close()
    }
  },
)

test(
  "files open in a full-screen viewer in this tab, step through the folder and close back to it",
  { timeout: 60000 },
  async () => {
    const { page, base, errors, close } = await open(0)
    try {
      const viewer = page.locator(".file-viewer")
      const next = viewer.getByRole("button", { name: /^Next: / })
      const prev = viewer.getByRole("button", { name: /^Previous: / })
      await page.goto(base + "/Backup")
      await page.locator(".drive-file-row", { hasText: "one.bin" }).waitFor()
      const before = await page.evaluate(() => history.length)
      // Remember a row: closing must show the same list, not rebuild it.
      await page
        .locator(".drive-file-row", { hasText: "three.bin" })
        .evaluate((row) => (window.__keptRow = row))
      await page.locator(".drive-file-row", { hasText: "one.bin" }).click()
      await viewer.waitFor()
      assert.equal(new URL(page.url()).pathname, "/Backup/one.bin")
      assert.equal(await viewer.getAttribute("aria-label"), "one.bin")
      assert.match(await viewer.locator(".file-viewer-title").innerText(), /\/Backup · 1 \/ 3/)
      assert.equal(await prev.count(), 0)
      assert.equal(await page.context().pages().length, 1)
      // The page behind cannot take focus while the viewer is open.
      assert.equal(await page.locator(".drive-shell").getAttribute("inert"), "")

      // Arrow keys and buttons step through files (the folder is skipped)
      // without adding history entries.
      await page.keyboard.press("ArrowRight")
      await page.waitForURL(base + "/Backup/two.bin")
      await next.click()
      await page.waitForURL(base + "/Backup/three.bin")
      assert.equal(await next.count(), 0)
      await prev.click()
      await page.waitForURL(base + "/Backup/two.bin")
      assert.equal(await page.evaluate(() => history.length), before + 1)

      // Escape returns to the folder the file was opened from.
      await page.keyboard.press("Escape")
      await viewer.waitFor({ state: "detached" })
      await page.waitForURL(base + "/Backup")
      await page.locator(".drive-file-row", { hasText: "one.bin" }).waitFor()
      assert.equal(await page.locator(".drive-shell").getAttribute("inert"), null)
      assert.equal(
        await page.evaluate(() => window.__keptRow?.isConnected),
        true,
        "the folder list was rebuilt after closing the viewer",
      )

      // Opened from a link: the arrows still work and closing goes to the folder.
      await page.goto(base + "/Backup/two.bin")
      await viewer.waitFor()
      await prev.waitFor()
      await viewer.getByRole("button", { name: "Close preview" }).click()
      await page.waitForURL(base + "/Backup")
      await page.locator(".drive-file-row", { hasText: "one.bin" }).waitFor()
      assert.deepEqual(errors, [])
    } finally {
      await close()
    }
  },
)

test(
  "type chips filter the list and the selection bar acts on the selected items",
  { timeout: 60000 },
  async () => {
    const { page, base, errors, close } = await open(0)
    try {
      const chip = (label) => page.locator(".drive-chip", { hasText: label })
      const rows = () => page.locator(".drive-file-row .name").allInnerTexts()
      await page.goto(base + "/B2")
      await page.locator(".drive-file-row").first().waitFor()
      assert.equal(await chip("All").getAttribute("aria-pressed"), "true")
      assert.match(await chip("Folders").innerText(), /2/)
      // Nothing to show: a complete listing disables the empty chips.
      assert.equal(await chip("Images").isDisabled(), true)

      await chip("Videos").click()
      assert.deepEqual(await rows(), ["a.mkv"])
      assert.match(
        await page.locator(".drive-filter-total").innerText(),
        /1 of 3 items/,
      )

      const bar = page.locator(".drive-selection-bar")
      assert.equal(await bar.count(), 0)
      await page.getByRole("checkbox", { name: "Select a.mkv", exact: true }).press("Space")
      await bar.waitFor()
      assert.match(await bar.innerText(), /1 selected/)
      for (const action of ["Download", "Move", "Copy", "Share", "Delete"])
        await bar.getByRole("button", { name: action, exact: true }).waitFor()
      // Changing the filter clears a selection it would hide.
      await chip("Folders").click()
      await bar.waitFor({ state: "detached" })
      assert.deepEqual(await rows(), ["Movies", "Shows"])
      await page.getByRole("checkbox", { name: "Select Movies", exact: true }).press("Space")
      await bar.waitFor()
      await bar.getByRole("button", { name: "Clear selection" }).click()
      await bar.waitFor({ state: "detached" })

      // A new folder starts unfiltered.
      await page.locator(".drive-file-row", { hasText: "Movies" }).locator(".name").click()
      await page.waitForURL(base + "/B2/Movies")
      await page.locator(".drive-file-row", { hasText: "Inter.mkv" }).waitFor()
      assert.equal(await chip("All").getAttribute("aria-pressed"), "true")
      assert.deepEqual(errors, [])
    } finally {
      await close()
    }
  },
)
