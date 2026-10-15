import { describe, expect, it } from "vitest"

// The Themer's own contrast checker, the one behind its contrast dialog. It is
// internal to the package, so the test reads it from the workspace source.
import {
  checkThemeContrast,
  standardColorPairs,
} from "../../../../packages/themer/src/utils/contrast-checker"
import { nightjarPreset } from "./nightjar"

describe("Nightjar Preset", () => {
  it.each(["light", "dark"] as const)(
    "meets WCAG AA on every foreground/background pair in %s mode",
    (mode) => {
      const results = checkThemeContrast(nightjarPreset.styles[mode] ?? {})

      expect(results.map((r) => r.label)).toEqual(
        standardColorPairs.map((p) => p.label)
      )
      expect(
        results
          .filter((r) => !r.passes)
          .map((r) => `${r.label}: ${r.ratio.toFixed(2)}`)
      ).toEqual([])
    }
  )
})
