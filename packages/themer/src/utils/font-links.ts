// Google Fonts stylesheets for the theme editor: CSS URLs and a per-document
// reference-counted <link> registry, plus the theme's font slot.
//
// Why a registry: fonts are per document (the host page and the Live iframe
// each need their own links) and several holders (the theme, the picker's
// previews, an iframe) ask for the same families. One reference-counted link
// per family avoids duplicates and lets a link go when nothing uses it.
//
// Contract: never request from Google a value that starts with `var(...)`, a
// generic keyword or an OS family (font-names.ts decides which names those
// are). Shipped fonts load through next/font; this module is a development
// preview mechanism.
//
// See: packages/themer/ARCHITECTURE.md ("Font link registry").
import { extractFontFamily, quoteFontFamily } from "./font-names"

type FontWeight = number | string

export const GOOGLE_FONTS_CSS_URL = "https://fonts.googleapis.com/css2"

function normalizeWeights(weights: readonly FontWeight[]): string[] {
  return weights.map((weight) => String(weight))
}

/** The upright numeric weights a catalogue variant list can name. */
const NUMERIC_FONT_WEIGHTS: ReadonlySet<string> = new Set([
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
])

/**
 * The weights to request for a family's catalogue variants, ascending: its
 * 400, 500, 600 and 700 when it has them, topped up with its other upright
 * numeric weights to at most four; a family with none of those gets its first
 * two numeric weights, and one with no numeric weight gets `["400"]`.
 */
export function getDefaultWeights(variants: string[]): string[] {
  const availableWeights = variants.filter((variant) =>
    NUMERIC_FONT_WEIGHTS.has(variant)
  )

  if (availableWeights.length === 0) return ["400"]

  const preferredWeights = ["400", "500", "600", "700"]
  const selectedWeights = preferredWeights.filter((weight) =>
    availableWeights.includes(weight)
  )

  if (selectedWeights.length === 0) {
    return availableWeights.slice(0, 2).sort((a, b) => Number(a) - Number(b))
  }

  return [
    ...selectedWeights,
    // react-doctor-disable-next-line react-doctor/js-set-map-lookups -- selectedWeights holds at most the four preferred weights, so building a Set would cost more than the scan
    ...availableWeights.filter((weight) => !selectedWeights.includes(weight)),
  ]
    .slice(0, 4)
    .sort((a, b) => Number(a) - Number(b))
}

const DEFAULT_THEME_WEIGHTS = ["400", "500", "600", "700"] as const

export function buildFontCssUrl(
  family: string,
  weights: readonly FontWeight[] = DEFAULT_THEME_WEIGHTS
): string {
  const weightsParam = normalizeWeights(weights).join(";")
  return `${GOOGLE_FONTS_CSS_URL}?family=${encodeURIComponent(
    family
  )}:wght@${weightsParam}&display=swap`
}

/** The family at its default weight: what Google serves for any family. */
function buildPlainFontCssUrl(family: string): string {
  return `${GOOGLE_FONTS_CSS_URL}?family=${encodeURIComponent(
    family
  )}&display=swap`
}

/**
 * A preview stylesheet: only the glyphs of `text` (Google's `&text=`
 * subset), a few hundred bytes instead of the whole family.
 */
export function buildFontPreviewUrl(family: string, text = family): string {
  return `${buildPlainFontCssUrl(family)}&text=${encodeURIComponent(text)}`
}

// ---------------------------------------------------------------------------
// Link registry: one counted entry per family and per preview subset in each
// document (rationale in the file header).
// ---------------------------------------------------------------------------

export const FONT_LINK_ATTRIBUTE = "data-themer-font"

/** Releases one reference; calling it again is a no-op. */
export type FontRelease = () => void

type FontLinkEntry = {
  link: HTMLLinkElement
  refs: number
  /** Settles once the stylesheet loaded, or failed with no retry to come. */
  ready: Promise<void>
}

const fontRegistries = new WeakMap<Document, Map<string, FontLinkEntry>>()

const noopRelease: FontRelease = () => {}

function resolveDocument(doc?: Document): Document | undefined {
  if (doc) return doc
  return typeof document === "undefined" ? undefined : document
}

function registryFor(doc: Document): Map<string, FontLinkEntry> {
  let registry = fontRegistries.get(doc)
  if (!registry) {
    registry = new Map()
    fontRegistries.set(doc, registry)
  }
  return registry
}

function acquireFontLink(
  doc: Document,
  key: string,
  family: string,
  href: string,
  fallbackHref?: string
): FontRelease {
  const registry = registryFor(doc)
  let entry = registry.get(key)
  // A link someone else removed (e.g. a host re-render of <head>) is stale.
  if (entry && !entry.link.isConnected) {
    registry.delete(key)
    entry = undefined
  }

  if (!entry) {
    const link = doc.createElement("link")
    link.setAttribute("rel", "stylesheet")
    link.setAttribute("href", href)
    link.setAttribute(FONT_LINK_ATTRIBUTE, family)
    const retryHref =
      fallbackHref && fallbackHref !== href ? fallbackHref : null
    if (retryHref) {
      // Google answers 400 when a static family lacks a requested weight;
      // retry once with the family's default weight.
      link.addEventListener(
        "error",
        () => link.setAttribute("href", retryHref),
        { once: true }
      )
    }
    const ready = new Promise<void>((resolve) => {
      link.addEventListener("load", () => resolve(), { once: true })
      link.addEventListener(
        "error",
        () => {
          if (retryHref) {
            // The retry's own load, or its error, settles it.
            link.addEventListener("error", () => resolve(), { once: true })
          } else {
            resolve()
          }
        },
        { once: true }
      )
    })
    doc.head.appendChild(link)
    entry = { link, refs: 0, ready }
    registry.set(key, entry)
  }

  const held = entry
  held.refs += 1
  let released = false
  return () => {
    if (released) return
    released = true
    held.refs -= 1
    if (held.refs > 0) return
    held.link.remove()
    if (registry.get(key) === held) registry.delete(key)
  }
}

/**
 * Hold a Google family in a document. The first holder decides the weights;
 * later holders share that link.
 */
export function acquireGoogleFont(
  family: string,
  options: { weights?: readonly FontWeight[]; doc?: Document } = {}
): FontRelease {
  const doc = resolveDocument(options.doc)
  const name = family.trim()
  if (!doc || !name || extractFontFamily(name) === null) return noopRelease

  return acquireFontLink(
    doc,
    `family:${name}`,
    name,
    buildFontCssUrl(name, options.weights),
    buildPlainFontCssUrl(name)
  )
}

/**
 * Hold a preview subset of a family (by default the glyphs of its own name),
 * for picker rows. Release it when the row leaves the screen or the picker
 * closes.
 */
export function acquireFontPreview(
  family: string,
  options: { text?: string; doc?: Document } = {}
): FontRelease {
  const doc = resolveDocument(options.doc)
  const name = family.trim()
  if (!doc || !name || extractFontFamily(name) === null) return noopRelease

  // The family is already loaded in full (a theme font): share that link.
  // A subset under the same family name, added later, would win over the
  // full face for page text until the picker closes.
  const full = fontRegistries.get(doc)?.get(`family:${name}`)
  if (full?.link.isConnected) {
    return acquireFontLink(doc, `family:${name}`, name, full.link.href)
  }

  const text = options.text ?? name
  return acquireFontLink(
    doc,
    `preview:${name}:${text}`,
    name,
    buildFontPreviewUrl(name, text)
  )
}

/** The families the theme currently holds per document. */
const themeFontSlots = new WeakMap<Document, Map<string, FontRelease>>()

/**
 * Make `families` the document's theme fonts: newly named families are
 * acquired and families the theme no longer names are released, so
 * replacing a theme font unloads the old one.
 */
export function setThemeFonts(
  doc: Document | undefined,
  families: Iterable<string>
): void {
  const target = resolveDocument(doc)
  if (!target) return

  const wanted = new Set(families)
  let slot = themeFontSlots.get(target)
  if (!slot) {
    slot = new Map()
    themeFontSlots.set(target, slot)
  }

  for (const [family, release] of slot) {
    if (wanted.has(family)) continue
    release()
    slot.delete(family)
  }
  const registry = fontRegistries.get(target)
  for (const family of wanted) {
    const held = slot.get(family)
    // A link removed from <head> by someone else (a host re-render) is
    // re-requested instead of being trusted as loaded.
    const link = registry?.get(`family:${family}`)?.link
    if (held && link?.isConnected) continue
    held?.()
    slot.set(family, acquireGoogleFont(family, { doc: target }))
  }
}

/** Release every theme font of a document (override off, unmount). */
export function clearThemeFonts(doc?: Document): void {
  const target = resolveDocument(doc)
  if (!target) return

  const slot = themeFontSlots.get(target)
  if (!slot) return
  for (const release of slot.values()) release()
  themeFontSlots.delete(target)
}

/**
 * Waits for the family's face, then resolves whether the browser has it at
 * `weight`. Resolves `false` on a timeout, an error or when the document has no
 * `fonts`; it never rejects. It waits first for the family's own stylesheet
 * (including the weight retry) when this module added it, then for the face;
 * both waits share `timeout` (ms). It adds no stylesheet: hold the family
 * (acquireGoogleFont) first.
 */
export async function waitForFont(
  family: string,
  weight: FontWeight = "400",
  timeout = 3000,
  doc?: Document
): Promise<boolean> {
  const target = resolveDocument(doc)
  if (!target?.fonts) return false

  const font = `${weight} 16px ${quoteFontFamily(family)}`
  // The family's stylesheet, when this module added it. Until the sheet is
  // parsed the document has no face for the family (at most a picker row's
  // preview subset), so fonts.load alone would resolve at once.
  const sheet = fontRegistries.get(target)?.get(`family:${family.trim()}`)
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      (async () => {
        await sheet?.ready
        await target.fonts.load(font)
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Font load timeout")),
          timeout
        )
      }),
    ])
    return target.fonts.check(font)
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
