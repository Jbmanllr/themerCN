// The CSS behind a specimen's light and dark halves (`data-mode`).
//
// The page's own mode needs nothing: that half inherits the tokens on <html>,
// including the Themer's live edits. The other half re-declares the Theme's
// colours for its mode, and only the colours, so radius, fonts, spacing,
// tracking and shadows still follow the Themer in both halves. `dark:`
// utilities follow the half through the `dark` variant in app/globals.css.

type ModeTokens = Record<string, string | undefined>

const NON_COLOUR = /^(radius|spacing|letter-spacing|font-|shadow-|tracking-)/

/** True for a colour token (`background`, `chart-1`); false for radius, fonts… */
export const isColourToken = (key: string) => !NON_COLOUR.test(key)

const declarations = (tokens: ModeTokens) =>
  Object.entries(tokens)
    .filter(([key, value]) => value !== undefined && isColourToken(key))
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n")

export function renderModeScopeCss(styles: {
  light: ModeTokens
  dark: ModeTokens
}): string {
  return [
    '[data-mode="light"] { color-scheme: light; }',
    '[data-mode="dark"] { color-scheme: dark; }',
    `.dark [data-mode="light"] {\n${declarations(styles.light)}\n}`,
    `:root:not(.dark) [data-mode="dark"] {\n${declarations(styles.dark)}\n}`,
    "",
  ].join("\n")
}
