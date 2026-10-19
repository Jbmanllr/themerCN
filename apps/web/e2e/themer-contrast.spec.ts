import { expect, test, type Page } from "@playwright/test"

import { hydrated } from "./page"
import { openToolbar, themerToolbar, themerTrigger } from "./themer-ui"

// A contrast row's token button closes the Contrast checker and moves focus
// to that token's colour control. The dialog animates out after the store
// closes it; focus must stay on the control, not return to the action that
// opened the dialog.

const contrastDialog = (page: Page) =>
  page.getByRole("dialog", { name: "WCAG Contrast Checker" })

/** Jumps from the open dialog to Primary, and checks focus once it is gone. */
async function jumpToPrimary(page: Page) {
  await expect(contrastDialog(page)).toBeVisible()
  await contrastDialog(page)
    .getByRole("button", { name: "primary", exact: true })
    .first()
    .click()

  const primary = page.getByLabel("Primary", { exact: true })
  await expect(contrastDialog(page)).toBeHidden()
  await expect(primary).toBeFocused()
  // Once the dialog has unmounted and every finite animation (its exit, the
  // highlight) has ended, nothing pulled focus back.
  await expect(contrastDialog(page)).toHaveCount(0)
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getTiming().iterations === Infinity
      )
  )
  await expect(primary).toBeFocused()
}

test("a contrast row in the Workspace focuses the colour control, and focus stays there", async ({
  page,
}) => {
  await page.goto("/")
  await hydrated(page)
  await themerTrigger(page).click()

  await page.getByRole("button", { name: "Contrast checker" }).click()
  await jumpToPrimary(page)
})

test("a contrast row in the Toolbar focuses the colour control in the Colors popup, and focus stays there", async ({
  page,
}) => {
  await page.goto("/")
  await hydrated(page)
  await openToolbar(page)

  await themerToolbar(page)
    .getByRole("button", { name: "More actions" })
    .click()
  await page.getByRole("menuitem", { name: "Contrast checker" }).click()
  await jumpToPrimary(page)
  await expect(page.getByTestId("themer-toolbar-panel-colors")).toBeVisible()
})
