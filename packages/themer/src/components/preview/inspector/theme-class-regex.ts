// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
// Sources: hooks/use-theme-inspector-regex.ts, lib/inspector/theme-class-finder.ts,
// lib/inspector/class-utils.ts.
//
// Which classes on a hovered element use an editor colour token. The regex is
// built from the editor's colour keys (not a hand list), so a new token is
// inspectable as soon as the editor knows it. Changes from tweakcn: more
// colour utilities (outline, decoration, caret, divide, gradient stops,
// ring-offset), arbitrary opacity (`/[0.35]`), important markers, and each
// class tested whole (`^…$`) so `ring-offset-background` is not read as a
// `ring-*` match. Elements come from the parent page or a same-origin iframe
// (another realm), so nodes are duck-typed by `nodeType`, never `instanceof`.
// The host's extra colours (ThemerConfig.extraColors) are inspectable too:
// the default regex is rebuilt when their registration changes.

import { COLOR_STYLE_KEYS } from "../../../config/defaults"
import { getExtraColorKeys } from "../../../config/extra-colors"

/**
 * Colour utility prefixes, longest first so `ring-offset` wins over `ring`.
 * `segmentClassName` splits on the same list.
 */
export const COLOR_UTILITY_PREFIXES = [
  "ring-offset",
  "decoration",
  "outline",
  "border",
  "divide",
  "stroke",
  "caret",
  "text",
  "fill",
  "from",
  "ring",
  "via",
  "bg",
  "to",
] as const

/** The editor's colour tokens that appear in utilities (not shadow-color). */
export const INSPECTABLE_COLOR_KEYS: readonly string[] =
  COLOR_STYLE_KEYS.filter((key) => !key.startsWith("shadow-"))

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Variant chain such as `hover:` or `data-[state=open]:` (brackets may hold `:`). */
const VARIANT_PATTERN = String.raw`(?:(?:[^:\s\[]|\[[^\]]*\])+:)*`

/** Opacity modifier: `/50` or `/[0.35]`. */
const OPACITY_PATTERN = String.raw`(?:\/(?:\d{1,3}|\[[^\]]+\]))?`

/**
 * A regex that matches one whole class using a colour token, e.g.
 * `bg-primary`, `hover:text-muted-foreground/80`, `!border-input`.
 */
export function createThemeClassRegex(
  colorKeys: readonly string[] = INSPECTABLE_COLOR_KEYS
): RegExp {
  const tokens = [...colorKeys]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|")
  const prefixes = COLOR_UTILITY_PREFIXES.map(escapeRegex).join("|")
  return new RegExp(
    `^${VARIANT_PATTERN}!?(?:${prefixes})-(?:${tokens})${OPACITY_PATTERN}!?$`
  )
}

let cachedExtraKeys: readonly string[] | null = null
let cachedRegex: RegExp = createThemeClassRegex()

/**
 * The regex for the built-in colour keys plus the registered host extras,
 * cached until the extras registration changes.
 */
function getThemeClassRegex(): RegExp {
  const extras = getExtraColorKeys()
  if (extras !== cachedExtraKeys) {
    cachedExtraKeys = extras
    cachedRegex = createThemeClassRegex([...INSPECTABLE_COLOR_KEYS, ...extras])
  }
  return cachedRegex
}

/** Duck-typed element: works across realms (iframe documents). */
export interface ElementLike {
  readonly nodeType: number
  readonly parentElement: ElementLike | null
  readonly className: unknown
  getBoundingClientRect(): DOMRect
}

function isElementLike(value: unknown): value is ElementLike {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { nodeType?: unknown }).nodeType === 1
  )
}

/** An element's class attribute; SVG elements expose it as `baseVal`. */
function getClassString(element: ElementLike): string {
  const { className } = element
  if (typeof className === "string") return className
  if (
    className &&
    typeof className === "object" &&
    "baseVal" in className &&
    typeof (className as { baseVal: unknown }).baseVal === "string"
  ) {
    return (className as { baseVal: string }).baseVal
  }
  return ""
}

/** The token classes of one class string, deduplicated, in source order. */
export function matchThemeClasses(
  classString: string,
  regex: RegExp = getThemeClassRegex()
): string[] {
  const seen = new Set<string>()
  for (const name of classString.split(/\s+/)) {
    if (name && !seen.has(name) && regex.test(name)) seen.add(name)
  }
  return [...seen]
}

/**
 * Walk up from `target` to the first element with token classes, stopping
 * before `boundary` (the inspected root; `null` walks to the document root).
 */
export function findThemeClasses(
  target: unknown,
  boundary: unknown,
  regex: RegExp = getThemeClassRegex()
): { element: ElementLike; matches: string[] } | null {
  let current: ElementLike | null = isElementLike(target) ? target : null
  while (current && current !== boundary) {
    const matches = matchThemeClasses(getClassString(current), regex)
    if (matches.length > 0) return { element: current, matches }
    current = current.parentElement
  }
  return null
}
