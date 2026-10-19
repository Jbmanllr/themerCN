// The Nightjar Preset meets WCAG AA (4.5:1, normal text) on every
// foreground/background pair a shadcn app renders text on.
//
// Amends #14, which checked the Preset "with the Themer's checker": this test
// imports no Themer source, so a rename inside `themercn` cannot break it. It
// declares its own pairs and uses culori's `wcagContrast`, the same WCAG 2
// formula the Themer's contrast checker wraps (spec #43, S28).
import { wcagContrast } from "culori"
import { describe, expect, it } from "vitest"

import { nightjarPreset } from "./nightjar"

const AA_NORMAL = 4.5

/** [foreground, background] token pairs that must reach AA. */
const requiredPairs = [
  ["foreground", "background"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
] as const

describe("Nightjar Preset", () => {
  it.each(["light", "dark"] as const)(
    "meets WCAG AA on every required foreground/background pair in %s mode",
    (mode) => {
      const tokens: Partial<Record<string, string>> =
        nightjarPreset.styles[mode]
      const failures = requiredPairs.flatMap(([fg, bg]) => {
        const foreground = tokens[fg]
        const background = tokens[bg]
        if (!foreground || !background) return [`${fg} on ${bg}: missing`]
        const ratio = wcagContrast(foreground, background)
        return ratio >= AA_NORMAL ? [] : [`${fg} on ${bg}: ${ratio.toFixed(2)}`]
      })

      expect(failures).toEqual([])
    }
  )
})
