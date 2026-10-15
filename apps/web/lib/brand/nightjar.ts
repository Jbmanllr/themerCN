// Nightjar Coffee Co.'s brand Theme: the Playground's Host Preset, and the
// one source of the page's baseline tokens. `app/nightjar.css` is generated
// from it (see nightjar-css.test.ts), so picking Nightjar in the Themer on a
// fresh Playground changes nothing.
//
// Palette: dusk. Light mode is a pale lilac-grey sky with roast-brown text and
// a deep indigo primary; dark mode is the night itself, with the ochre of a
// nightjar's mottled wing as its primary.
//
// Shadow keys are left out on purpose: the Themer then keeps the page's own
// Tailwind shadow scale (no override sheet) until someone edits a shadow.

import type { ThemePreset } from "themercn"

type ModeTokens = NonNullable<ThemePreset["styles"]["light"]>

/** Tokens both modes share: type, radius, spacing, tracking. */
const shared = {
  // next/font variables, set on <html> by app/layout.tsx. The Themer loads
  // nothing for a `var(--font-x)` stack: the Host app ships those fonts.
  "font-sans":
    "var(--font-hanken-grotesk), ui-sans-serif, system-ui, sans-serif",
  "font-heading": "var(--font-young-serif), ui-serif, Georgia, serif",
  "font-serif": "var(--font-young-serif), ui-serif, Georgia, serif",
  "font-mono": "var(--font-jetbrains-mono), ui-monospace, monospace",
  radius: "0.75rem",
  spacing: "0.25rem",
  "letter-spacing": "0em",
} satisfies ModeTokens

const light = {
  background: "oklch(0.97 0.008 290)",
  foreground: "oklch(0.25 0.035 45)",
  card: "oklch(0.99 0.004 290)",
  "card-foreground": "oklch(0.25 0.035 45)",
  popover: "oklch(0.99 0.004 290)",
  "popover-foreground": "oklch(0.25 0.035 45)",
  primary: "oklch(0.36 0.09 285)",
  "primary-foreground": "oklch(0.97 0.012 85)",
  secondary: "oklch(0.92 0.025 80)",
  "secondary-foreground": "oklch(0.3 0.04 50)",
  muted: "oklch(0.935 0.012 290)",
  "muted-foreground": "oklch(0.47 0.03 290)",
  accent: "oklch(0.86 0.1 85)",
  "accent-foreground": "oklch(0.28 0.05 55)",
  destructive: "oklch(0.53 0.2 27)",
  "destructive-foreground": "oklch(0.98 0.01 27)",
  border: "oklch(0.88 0.015 290)",
  input: "oklch(0.86 0.015 290)",
  ring: "oklch(0.55 0.1 285)",
  "chart-1": "oklch(0.72 0.13 75)",
  "chart-2": "oklch(0.45 0.1 285)",
  "chart-3": "oklch(0.58 0.14 40)",
  "chart-4": "oklch(0.65 0.06 150)",
  "chart-5": "oklch(0.4 0.05 50)",
  sidebar: "oklch(0.945 0.012 290)",
  "sidebar-foreground": "oklch(0.25 0.035 45)",
  "sidebar-primary": "oklch(0.36 0.09 285)",
  "sidebar-primary-foreground": "oklch(0.97 0.012 85)",
  "sidebar-accent": "oklch(0.9 0.02 290)",
  "sidebar-accent-foreground": "oklch(0.25 0.04 285)",
  "sidebar-border": "oklch(0.88 0.015 290)",
  "sidebar-ring": "oklch(0.55 0.1 285)",
  ...shared,
} satisfies ModeTokens

const dark = {
  background: "oklch(0.18 0.03 285)",
  foreground: "oklch(0.94 0.012 85)",
  card: "oklch(0.22 0.035 285)",
  "card-foreground": "oklch(0.94 0.012 85)",
  popover: "oklch(0.24 0.035 285)",
  "popover-foreground": "oklch(0.94 0.012 85)",
  primary: "oklch(0.8 0.12 80)",
  "primary-foreground": "oklch(0.22 0.04 60)",
  secondary: "oklch(0.3 0.04 285)",
  "secondary-foreground": "oklch(0.94 0.012 85)",
  muted: "oklch(0.27 0.03 285)",
  "muted-foreground": "oklch(0.74 0.03 285)",
  accent: "oklch(0.34 0.06 285)",
  "accent-foreground": "oklch(0.95 0.01 85)",
  destructive: "oklch(0.73 0.17 25)",
  "destructive-foreground": "oklch(0.16 0.03 25)",
  border: "oklch(1 0 0 / 12%)",
  input: "oklch(1 0 0 / 16%)",
  ring: "oklch(0.7 0.1 80)",
  "chart-1": "oklch(0.8 0.12 80)",
  "chart-2": "oklch(0.65 0.1 285)",
  "chart-3": "oklch(0.68 0.14 40)",
  "chart-4": "oklch(0.72 0.07 150)",
  "chart-5": "oklch(0.6 0.05 50)",
  sidebar: "oklch(0.16 0.03 285)",
  "sidebar-foreground": "oklch(0.94 0.012 85)",
  "sidebar-primary": "oklch(0.8 0.12 80)",
  "sidebar-primary-foreground": "oklch(0.22 0.04 60)",
  "sidebar-accent": "oklch(0.28 0.045 285)",
  "sidebar-accent-foreground": "oklch(0.95 0.01 85)",
  "sidebar-border": "oklch(1 0 0 / 12%)",
  "sidebar-ring": "oklch(0.7 0.1 80)",
  ...shared,
} satisfies ModeTokens

/** The Preset id the Playground passes as `defaultPreset`. */
export const NIGHTJAR_PRESET_ID = "nightjar"

/** Nightjar Coffee Co.'s Theme, light and dark. */
export const nightjarPreset = {
  id: NIGHTJAR_PRESET_ID,
  label: "Nightjar",
  description: "Nightjar Coffee Co.: dusk indigo, roast brown and wing ochre.",
  source: "Playground",
  styles: { light, dark },
} satisfies ThemePreset

/** The Host Presets the Playground passes to the Themer (a stable constant). */
export const playgroundPresets: readonly ThemePreset[] = [nightjarPreset]

/**
 * The Preset as plain CSS: shared tokens and light colours on `:root`, dark
 * colours on `.dark`. Written to app/nightjar.css by the snapshot test.
 */
export function renderNightjarCss(): string {
  const sharedKeys = new Set<string>(Object.keys(shared))
  const block = (selector: string, tokens: Record<string, string>) =>
    `${selector} {\n${Object.entries(tokens)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n")}\n}\n`
  const colours = (tokens: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(tokens).filter(([key]) => !sharedKeys.has(key))
    )

  return [
    "/* Generated from lib/brand/nightjar.ts. Do not edit by hand:",
    "   change the Preset, then run `pnpm --filter web test -u`. */\n",
    block(":root", { ...colours(light), ...shared }),
    block(".dark", colours(dark)),
  ].join("\n")
}
