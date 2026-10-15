import { expect, it } from "vitest"

import { renderNightjarCss } from "./nightjar"

// app/nightjar.css is the page's baseline Theme. It must hold exactly the
// Preset's values, or picking Nightjar in the Themer would change the page.
// After editing the Preset, `pnpm --filter web test -u` rewrites the file; CI
// fails while the two differ.
it("app/nightjar.css matches the Nightjar Preset", async () => {
  await expect(renderNightjarCss()).toMatchFileSnapshot(
    "../../app/nightjar.css"
  )
})
