// Export must reflect each mode's own values: every mode block declares its own
// --tracking-normal, so a dark-only letter spacing survives, and it is never
// defined in terms of itself. Also pins the Tailwind 3 oklch-to-hsl mapping, the
// multiplicative radius scale, the heading font, Host extra colours and the
// layout's next/font imports (one per family, none for OS families).
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { defaultThemeState } from "../config/defaults"
import type { ThemeEditorState } from "../types"
import {
  generateLayoutCode,
  generateTailwindConfigCode,
  generateThemeCode,
} from "./theme-generator"

function withStyles(
  light: Partial<ThemeEditorState["styles"]["light"]>,
  dark: Partial<ThemeEditorState["styles"]["dark"]> = {}
): ThemeEditorState {
  return {
    ...defaultThemeState,
    styles: {
      light: { ...defaultThemeState.styles.light, ...light },
      dark: { ...defaultThemeState.styles.dark, ...dark },
    },
  }
}

const stylesheet = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

/** Every `--radius-<step>` a stylesheet declares, in order, with its value. */
const radiusScale = (css: string) =>
  Array.from(
    css.matchAll(/--radius-([\w-]+): ([^;]+);/g),
    ([, step = "", value = ""]) => [step, value] as const
  )

function block(css: string, selector: ":root" | ".dark"): string {
  const start = css.indexOf(`${selector} {`)
  return css.slice(start, css.indexOf("}", start))
}

describe("generateThemeCode", () => {
  it("declares each mode's letter spacing in its own block", () => {
    const css = generateThemeCode(
      withStyles({ "letter-spacing": "0em" }, { "letter-spacing": "0.02em" }),
      "oklch",
      "4"
    )
    expect(block(css, ":root")).toContain("--tracking-normal: 0em;")
    expect(block(css, ".dark")).toContain("--tracking-normal: 0.02em;")
    expect(css).toContain("letter-spacing: var(--tracking-normal);")
    expect(css).toContain(
      "--tracking-wide: calc(var(--tracking-normal) + 0.025em);"
    )
  })

  it("never defines --tracking-normal in terms of itself", () => {
    const css = generateThemeCode(
      withStyles({ "letter-spacing": "0.01em" }),
      "oklch",
      "4"
    )
    expect(css).not.toContain("--tracking-normal: var(--tracking-normal)")
  })

  it("exports the heading font in both blocks and @theme", () => {
    const css = generateThemeCode(
      withStyles(
        { "font-heading": "Fraunces, serif" },
        { "font-heading": "Fraunces, serif" }
      ),
      "oklch",
      "4"
    )
    expect(block(css, ":root")).toContain("--font-heading: Fraunces, serif;")
    expect(block(css, ".dark")).toContain("--font-heading: Fraunces, serif;")
    expect(css).toContain("--font-heading: var(--font-heading);")
  })

  it("maps oklch to hsl channels for Tailwind v3", () => {
    const css = generateThemeCode(
      withStyles({ background: "oklch(1 0 0)" }),
      "oklch",
      "3"
    )
    expect(css).not.toContain("oklch(")
    // v3 colour tokens are bare HSL channels, wrapped by hsl() in the config.
    expect(block(css, ":root")).toMatch(/--background: [\d.]+ [\d.]+% [\d.]+%;/)
    expect(css).toContain("--font-heading:")
  })

  // The preview's host rounds on shadcn v4's multiplicative scale; an
  // additive export would round differently at any other --radius. The scale
  // is written three times (the export, the Themer's CSS, and the UI
  // package's CSS the Playground rounds with): this holds the three to one
  // another, step for step. It starts at sm: an xs of the export's own would
  // change the Host's `rounded-xs` on paste.
  it("exports the radius scale the preview rounds with", () => {
    const exported = radiusScale(
      generateThemeCode(defaultThemeState, "oklch", "4")
    )

    expect(exported.map(([step]) => step)).toEqual([
      "sm",
      "md",
      "lg",
      "xl",
      "2xl",
      "3xl",
      "4xl",
    ])
    expect(Object.fromEntries(exported)).toMatchObject({
      sm: "calc(var(--radius) * 0.6)",
      lg: "var(--radius)",
    })
    expect(radiusScale(stylesheet("../styles/themer.css"))).toEqual(exported)
    expect(
      radiusScale(stylesheet("../../../ui/src/styles/globals.css"))
    ).toEqual(exported)
  })
})

describe("generateTailwindConfigCode", () => {
  it("wraps colours in hsl() and adds the heading family for v3", () => {
    const config = generateTailwindConfigCode(defaultThemeState, "oklch")
    expect(config).toContain('border: "hsl(var(--border))"')
    expect(config).toContain('heading: ["var(--font-heading)"]')
  })

  it("rounds on the scale the v4 export declares", () => {
    const config = generateTailwindConfigCode(defaultThemeState, "hsl")
    const exported = radiusScale(
      generateThemeCode(defaultThemeState, "oklch", "4")
    )

    expect(exported).toHaveLength(7)
    for (const [step, value] of exported) {
      const key = /^\d/.test(step) ? `"${step}"` : step
      expect(config).toContain(`${key}: "${value}",`)
    }
  })
})

describe("generateLayoutCode", () => {
  it("imports a family shared by heading and serif once", () => {
    const code = generateLayoutCode(
      withStyles({
        "font-heading": "Fraunces, serif",
        "font-serif": "Fraunces, serif",
      })
    )
    expect(code).toMatch(/import \{ Fraunces \} from "next\/font\/google"/)
    expect(code).toContain('variable: "--font-heading"')
    expect(code).toContain('variable: "--font-serif"')
  })

  // next/font/google has no Georgia or Menlo: importing them fails the build.
  it("imports no OS family, which keeps its CSS stack", () => {
    const code = generateLayoutCode(
      withStyles({
        "font-sans": "DM Sans, sans-serif",
        "font-heading": "Georgia, serif",
        "font-serif": "Georgia, serif",
        "font-mono": "Menlo, monospace",
      })
    )
    expect(code).toMatch(/import \{ DM_Sans \} from "next\/font\/google"/)
    expect(code).not.toContain("Georgia(")
    expect(code).not.toContain("Menlo(")
  })
})

describe("host extra colours", () => {
  const theme = withStyles({ signal: "#3457FF" }, { signal: "#6E86FF" })
  const extras = ["signal", "success"]

  it("exports set extras per mode and maps them in @theme inline", () => {
    const css = generateThemeCode(theme, "hex", "4", extras)
    expect(block(css, ":root")).toContain("--signal: #3457ff;")
    expect(block(css, ".dark")).toContain("--signal: #6e86ff;")
    expect(css).toContain("--color-signal: var(--signal);")
    // An unset extra is the host's own value: not exported.
    expect(css).not.toContain("--success")
    expect(css).not.toContain("--color-success")
  })

  it("maps extras to hsl() in Tailwind v3", () => {
    const css = generateThemeCode(theme, "oklch", "3", extras)
    expect(block(css, ":root")).not.toContain("oklch")
    expect(block(css, ":root")).toMatch(/--signal: [\d.]+ [\d.]+% [\d.]+%;/)
    const config = generateTailwindConfigCode(theme, "hsl", extras)
    expect(config).toContain('"signal": "hsl(var(--signal))",')
    expect(config).not.toContain("success")
  })

  it("leaves extras out without a key list", () => {
    expect(generateThemeCode(theme, "hex", "4")).not.toContain("--signal")
  })
})
