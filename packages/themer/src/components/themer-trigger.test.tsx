// Proves the trigger stays hidden below `sm` even when a caller passes a
// `flex` class: `hidden sm:inline-flex` is applied after the caller's
// `className`.
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("./themer-provider", () => ({
  useThemerContext: () => ({
    config: { showTrigger: true },
  }),
}))
vi.mock("../stores/themer-ui-store", () => ({
  useThemerUIStore: (
    select: (state: { isOpen: boolean; toggle: () => void }) => unknown
  ) => select({ isOpen: false, toggle: vi.fn() }),
}))

import { ThemerTrigger } from "./themer-trigger"

it("hides the theme editor trigger below sm", () => {
  const html = renderToStaticMarkup(<ThemerTrigger className="flex" />)
  const trigger = html.match(
    /<button(?=[^>]*data-testid="themer-trigger")[^>]*>/u
  )?.[0]
  const classes = trigger?.match(/class="([^"]*)"/u)?.[1]?.split(" ")

  expect(trigger).toMatch(/class="[^"]*\bhidden\b[^"]*\bsm:inline-flex\b/u)
  expect(classes).not.toContain("flex")
})
