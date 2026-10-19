// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// Writes the editor's theme onto a live document: the host page's <html> and
// the Live preview iframe's (same-origin) document go through the same code.
//
// Why it differs from tweakcn: the hosts' stylesheets are not tweakcn's.
// - Colours are applied verbatim. Hosts declare `--color-x: var(--x)` in
//   `@theme inline`, so any valid CSS colour (oklch, hex, hsl) works; forcing
//   hsl() as tweakcn does would rewrite the host's own oklch values.
// - Letter-spacing has no host reader, so it is applied as the root element's
//   `letter-spacing` plus `--tracking-*` derived from it (the same offsets as
//   tweakcn's app/globals.css), which Tailwind's tracking utilities read.
// - Shadows: Tailwind compiles `.shadow-*` with literal values, so setting
//   `--shadow-*` alone changes nothing. One injected
//   `<style data-themer-overrides>` per document points each utility's
//   `--tw-shadow` at the variable, keeping Tailwind's ring/inset composition.
//   Its rules are `!important`, so the host's own variant shadow rules
//   (`hover:shadow-md`, `data-active:shadow-sm`) are mirrored into it too, and
//   the sheet is written again when the document's stylesheet count changes
//   (a CSS chunk that loaded later).
//   Written only when the shadow inputs differ from the library defaults (a
//   preset that declares shadows, or an edit): a preset without shadows, such
//   as a host brand preset, keeps the host's own Tailwind shadow scale.
// - Host extra colours (ThemerProps.extraColors) are ordinary style keys:
//   written as `--key` when the theme sets them, absent (the host's CSS
//   shows) when it does not.
// - Every property written is recorded per element, so a re-apply drops keys
//   the new theme no longer has and removal takes away exactly what was set.
//
// Contract: pass `updateClass: false` wherever next-themes owns `.dark`. The
// override sheet exists only while a `--shadow-*` variable is written, and
// removing the theme removes the sheet with it.
//
// See: packages/themer/ARCHITECTURE.md ("Applying a theme").
import { RESTORE_STYLE_ID } from "../config/constants"
import { defaultLightStyles } from "../config/defaults"
import { getExtraColorKeys } from "../config/extra-colors"
import type { ThemeEditorState, ThemeMode } from "../types"
import {
  SHADOW_INPUT_KEYS,
  THEME_FONT_KEYS,
  THEME_SPACING_KEYS,
} from "../types/theme"
import { clearThemeFonts, setThemeFonts } from "./font-links"
import { getThemeFontFamilies } from "./font-names"
import { SHADOW_SCALE_KEYS, getShadowVariables } from "./shadows"

type ApplyThemeOptions = {
  /** Toggle the `dark` class on the element. Off where next-themes owns it. */
  updateClass?: boolean
  /** Mode to apply; defaults to `themeState.currentMode`. */
  mode?: ThemeMode
}

type ApplyThemeToDocumentOptions = ApplyThemeOptions & {
  /**
   * Also load the theme's Google fonts into this document. Fonts are per
   * document, so an iframe needs its own links; the host page gets them from
   * DynamicFontLoader instead.
   */
  loadFonts?: boolean
}

/**
 * The non-colour keys a theme writes as `--key` (fonts, radius, spacing,
 * letter spacing). Read only by the fallback cleanup list; applying writes
 * every non-shadow key the theme holds.
 */
const VARIABLE_KEYS = [...THEME_FONT_KEYS, ...THEME_SPACING_KEYS] as const

/** Tailwind shadow utilities the override sheet rewires, by variable name. */
const SHADOW_VARIABLE_SET: ReadonlySet<string> = new Set(SHADOW_SCALE_KEYS)

/** tweakcn's tracking scale, as offsets from the theme's letter-spacing. */
const TRACKING_OFFSETS = [
  ["tighter", "- 0.05em"],
  ["tight", "- 0.025em"],
  ["normal", null],
  ["wide", "+ 0.025em"],
  ["wider", "+ 0.05em"],
  ["widest", "+ 0.1em"],
] as const

export const THEMER_OVERRIDES_ATTRIBUTE = "data-themer-overrides"

/**
 * Variant classes the sheet always covers. The sheet's `!important` would
 * otherwise freeze an element on its base size (`shadow-xs hover:shadow-md`
 * never growing); these rules come later and are more specific. Any other
 * variant the host's CSS uses is mirrored from it (collectVariantShadowRules).
 */
const SHADOW_STATE_VARIANTS = [
  ["hover", ":hover"],
  ["focus", ":focus"],
  ["focus-visible", ":focus-visible"],
  ["active", ":active"],
] as const

/**
 * The override sheet's fixed part: it reads the `--shadow-*` variables set on
 * the root, so a shadow change only rewrites variables, never the sheet.
 * `!important` beats the utility's own `--tw-shadow` regardless of layer.
 */
export const SHADOW_OVERRIDE_CSS = [
  ...SHADOW_SCALE_KEYS.map(
    (name) => `.${name} { --tw-shadow: var(--${name}) !important; }`
  ),
  ...SHADOW_STATE_VARIANTS.flatMap(([variant, pseudo]) =>
    SHADOW_SCALE_KEYS.map(
      (name) =>
        `.${variant}\\:${name}${pseudo} { --tw-shadow: var(--${name}) !important; }`
    )
  ),
].join("\n")

/** Properties last written per element (custom properties keep `--`). */
const appliedProperties = new WeakMap<HTMLElement, Set<string>>()
/** The override `<style>` per document. */
const overrideStyles = new WeakMap<Document, HTMLStyleElement>()
/** How many stylesheets the document had when its override was written. */
const overrideSheetCounts = new WeakMap<Document, number>()
/** Documents whose theme fonts this module loaded (applyThemeToDocument). */
const documentsWithThemeFonts = new WeakSet<Document>()

function trackingBase(letterSpacing: string): string {
  // `normal` is a keyword calc() cannot take; it equals zero tracking.
  return letterSpacing === "normal" ? "0em" : "var(--letter-spacing)"
}

/**
 * Every property the theme writes for one mode, as `property → value`.
 * Pure: the same input gives the same map, so callers and tests can inspect
 * what will be applied without a DOM.
 */
export function computeThemeProperties(
  themeState: ThemeEditorState,
  mode: ThemeMode = themeState.currentMode
): Record<string, string> {
  const styles = themeState.styles[mode]
  const properties: Record<string, string> = {}

  for (const [key, raw] of Object.entries(styles) as [string, unknown][]) {
    const value = typeof raw === "string" ? raw.trim() : ""
    if (!value || key.startsWith("shadow-")) continue
    // Colours and the common variables alike are valid CSS as stored.
    properties[`--${key}`] = value
  }

  const letterSpacing = styles["letter-spacing"]?.trim()
  if (letterSpacing) {
    properties["letter-spacing"] = letterSpacing
    const base = trackingBase(letterSpacing)
    for (const [name, offset] of TRACKING_OFFSETS) {
      properties[`--tracking-${name}`] = offset
        ? `calc(${base} ${offset})`
        : base
    }
  }

  const hasOwnShadows = SHADOW_INPUT_KEYS.some(
    (key) => (styles[key]?.trim() ?? "") !== defaultLightStyles[key]
  )
  const shadows = hasOwnShadows
    ? getShadowVariables({ ...themeState, currentMode: mode })
    : {}
  for (const [key, value] of Object.entries(shadows)) {
    // Only the per-size results have a reader; the raw inputs do not.
    if (SHADOW_VARIABLE_SET.has(key) && value) properties[`--${key}`] = value
  }

  return properties
}

function updateThemeClass(element: HTMLElement, mode: ThemeMode): void {
  element.classList.toggle("dark", mode === "dark")
}

/** What collectVariantShadowRules reads of a CSSOM rule. */
type CssRuleLike = {
  cssText: string
  selectorText?: string
  style?: { getPropertyValue(property: string): string }
  cssRules?: ArrayLike<CssRuleLike>
  /** A layer block's (or keyframes') name. */
  name?: string
}

/** A Tailwind variant class on a shadow size, e.g. `hover:shadow-md`. */
const VARIANT_SHADOW_CLASS = /:(shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl))?)$/
/**
 * A class in a selector as the CSSOM serializes it: `\:`-style escapes, and
 * a hex escape for a leading digit (`2xl:shadow-md` is `.\32 xl\:shadow-md`).
 */
const SELECTOR_CLASS = /\.((?:\\[\da-f]{1,6} ?|\\.|[\w-])+)/gi
const CSS_ESCAPE = /\\(?:([\da-f]{1,6}) ?|(.))/gi

function unescapeClass(escaped: string): string {
  return escaped.replace(
    CSS_ESCAPE,
    (_, hex: string | undefined, char: string | undefined) =>
      hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : (char ?? "")
  )
}

/** The one shadow size a rule's variant classes set, if any. */
function variantShadowSize(selectorText: string): string | null {
  let size: string | null = null
  for (const [, escaped = ""] of selectorText.matchAll(SELECTOR_CLASS)) {
    const found = VARIANT_SHADOW_CLASS.exec(unescapeClass(escaped))?.[1]
    if (!found) continue
    if (size !== null && size !== found) return null
    size = found
  }
  return size
}

function mirrorShadowRules(rules: ArrayLike<CssRuleLike>, out: string[]) {
  for (const rule of Array.from(rules)) {
    if (rule.selectorText !== undefined) {
      const size = rule.style?.getPropertyValue("--tw-shadow")
        ? variantShadowSize(rule.selectorText)
        : null
      if (size)
        out.push(
          `${rule.selectorText} { --tw-shadow: var(--${size}) !important; }`
        )
      continue
    }
    if (!rule.cssRules) continue
    const inner: string[] = []
    mirrorShadowRules(rule.cssRules, inner)
    if (inner.length === 0) continue
    // A layer block's rules go in unwrapped (the sheet stays unlayered); any
    // other group (@media, @supports, @container) keeps its own condition.
    if (typeof rule.name === "string") out.push(...inner)
    else {
      const prelude = rule.cssText.slice(0, rule.cssText.indexOf("{")).trim()
      out.push(`${prelude} {\n${inner.join("\n")}\n}`)
    }
  }
}

/**
 * The host's variant shadow rules (`hover:shadow-md` inside its @media,
 * `data-active:shadow-sm`), pointed at the theme's variables like the fixed
 * part. Tailwind inlines shadow values, so without these a compound or
 * variant-only class would show the stock shadow, or lose to the base
 * size's `!important`. Base classes, `shadow-none`, arbitrary values and
 * opacity modifiers are left alone; a cross-origin sheet cannot be read.
 */
function collectVariantShadowRules(doc: Document): string {
  const out: string[] = []
  for (const sheet of Array.from(doc.styleSheets)) {
    const owner = sheet.ownerNode
    if (
      owner &&
      "hasAttribute" in owner &&
      owner.hasAttribute(THEMER_OVERRIDES_ATTRIBUTE)
    )
      continue
    let rules: ArrayLike<CssRuleLike>
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    mirrorShadowRules(rules, out)
  }
  return out.join("\n")
}

/**
 * Writes the override sheet, and writes it again when the document's
 * stylesheets changed since (a CSS chunk loaded), so the next apply covers
 * that chunk's variant rules too.
 */
function ensureOverrideStyle(doc: Document): void {
  const existing = overrideStyles.get(doc)
  const connected = existing?.isConnected === true
  if (connected && overrideSheetCounts.get(doc) === doc.styleSheets.length)
    return

  const mirrored = collectVariantShadowRules(doc)
  const css = mirrored
    ? `${SHADOW_OVERRIDE_CSS}\n${mirrored}`
    : SHADOW_OVERRIDE_CSS
  if (existing && connected) {
    existing.textContent = css
  } else {
    const style = doc.createElement("style")
    style.setAttribute(THEMER_OVERRIDES_ATTRIBUTE, "")
    style.textContent = css
    doc.head.appendChild(style)
    overrideStyles.set(doc, style)
  }
  // Read after the append: the sheet itself is one of the document's.
  overrideSheetCounts.set(doc, doc.styleSheets.length)
}

function removeOverrideStyle(doc: Document | null | undefined): void {
  if (!doc) return
  overrideStyles.get(doc)?.remove()
  overrideStyles.delete(doc)
  overrideSheetCounts.delete(doc)
}

/**
 * Apply one mode of the theme to an element (normally a document's <html>).
 * Returns the property names written; a property set by the previous call
 * and absent now is removed, so switching to a sparser theme leaves nothing
 * behind.
 */
export function applyThemeToElement(
  themeState: ThemeEditorState,
  element: HTMLElement = document.documentElement,
  options: ApplyThemeOptions = {}
): string[] {
  const { updateClass = true, mode = themeState.currentMode } = options
  const properties = computeThemeProperties(themeState, mode)
  const keys = Object.keys(properties)
  const next = new Set(keys)

  for (const previous of appliedProperties.get(element) ?? []) {
    if (!next.has(previous)) element.style.removeProperty(previous)
  }
  for (const key of keys) {
    element.style.setProperty(key, properties[key]!)
  }
  appliedProperties.set(element, next)

  if (updateClass) updateThemeClass(element, mode)

  const doc = element.ownerDocument
  if (keys.some((key) => SHADOW_VARIABLE_SET.has(key.slice(2)))) {
    ensureOverrideStyle(doc)
  } else {
    removeOverrideStyle(doc)
  }

  return keys
}

/**
 * Fallback for an element this module has no record of (its state was lost,
 * e.g. to a hot reload): every property a theme with the default keys or
 * the registered extra colours can write. Other inline variables on the
 * element are not the editor's.
 */
function knownThemeProperties(): string[] {
  const keys = new Set<string>(["letter-spacing"])
  for (const key of [
    ...Object.keys(defaultLightStyles),
    ...getExtraColorKeys(),
  ]) {
    if (!key.startsWith("shadow-")) keys.add(`--${key}`)
  }
  for (const key of VARIABLE_KEYS) keys.add(`--${key}`)
  for (const key of SHADOW_SCALE_KEYS) keys.add(`--${key}`)
  for (const [name] of TRACKING_OFFSETS) keys.add(`--tracking-${name}`)
  return [...keys]
}

/**
 * Remove the theme from an element: `keys` when given (the list
 * applyThemeToElement returned), otherwise what was last applied to it. Also
 * removes its document's shadow override sheet.
 */
export function removeThemeFromElement(
  element: HTMLElement = document.documentElement,
  keys?: readonly string[]
): void {
  if (!element?.style) return

  const recorded = appliedProperties.get(element)
  const targets = keys ?? (recorded ? [...recorded] : knownThemeProperties())
  for (const key of targets) element.style.removeProperty(key)
  appliedProperties.delete(element)
  removeOverrideStyle(element.ownerDocument)
}

/**
 * Apply the theme to a whole document: variables on its <html>, the shadow
 * override sheet in its <head> and, with `loadFonts`, the theme's Google
 * fonts. The head script's restore sheet (RESTORE_STYLE_ID) in that document
 * is removed: the theme applied here replaces it. Works for a same-origin iframe's `contentDocument`; call again on
 * every theme change and once more after the frame navigates (a new
 * document).
 */
export function applyThemeToDocument(
  doc: Document,
  themeState: ThemeEditorState,
  options: ApplyThemeToDocumentOptions = {}
): string[] {
  const { loadFonts = false, ...applyOptions } = options
  const keys = applyThemeToElement(
    themeState,
    doc.documentElement,
    applyOptions
  )
  doc.getElementById(RESTORE_STYLE_ID)?.remove()

  if (loadFonts) {
    setThemeFonts(
      doc,
      getThemeFontFamilies(themeState.styles.light, themeState.styles.dark)
    )
    documentsWithThemeFonts.add(doc)
  }

  return keys
}

/** Undo applyThemeToDocument: variables, override sheet and its fonts. */
export function removeThemeFromDocument(doc: Document): void {
  removeThemeFromElement(doc.documentElement)
  if (documentsWithThemeFonts.has(doc)) {
    clearThemeFonts(doc)
    documentsWithThemeFonts.delete(doc)
  }
}
