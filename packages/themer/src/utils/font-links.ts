// Google Fonts stylesheets for the theme editor: CSS URLs and a per-document
// reference-counted <link> registry, plus the theme's font slot.
//
// Why a registry: fonts are per document (the host page and the Live iframe
// each need their own links) and several holders (the theme, the picker's
// previews, an iframe) ask for the same families. One reference-counted link
// per family avoids duplicates and lets a link go when nothing uses it.
//
// Contract: at most 1 link per Google family per document (the paths ADR's
// Page load contract). The head script (theme-script.ts) links families
// before first paint with the URLs built here and marks them
// (HEAD_FONT_LINK_ATTRIBUTE); a family's first acquire adopts a marked link
// rather than adding a second, and never a Host's own unmarked link. Never request from Google a
// value that starts with `var(...)`, a generic keyword or an OS family
// (font-names.ts decides which names those are). Shipped fonts load through next/font; this module is a development
// preview mechanism.
//
// See: packages/themer/ARCHITECTURE.md ("Font link registry").
import { HEAD_FONT_LINK_ATTRIBUTE } from "../config/constants"
import {
  DEFAULT_FONT_WEIGHTS,
  GOOGLE_FONTS_CSS_URL,
  extractFontFamily,
  quoteFontFamily,
} from "./font-names"

type FontWeight = number | string

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

export function buildFontCssUrl(
  family: string,
  weights: readonly FontWeight[] = DEFAULT_FONT_WEIGHTS
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

/**
 * Settles once `link`'s stylesheet loaded, or failed with no retry to come:
 * `retrying` says whether its first error is followed by a retry (an href
 * switch to the default weight).
 */
function linkReady(link: HTMLLinkElement, retrying: boolean): Promise<void> {
  return new Promise<void>((resolve) => {
    link.addEventListener("load", () => resolve(), { once: true })
    link.addEventListener(
      "error",
      () => {
        if (retrying) {
          // The retry's own load, or its error, settles it.
          link.addEventListener("error", () => resolve(), { once: true })
        } else {
          resolve()
        }
      },
      { once: true }
    )
  })
}

/**
 * A Google family's stylesheet URLs: the requested weights, and the default
 * weight a rejected request retries with. The head script links the same.
 */
type FamilyUrls = { href: string; fallbackHref: string }

/**
 * The stylesheet link the head script added for a family (it carries
 * HEAD_FONT_LINK_ATTRIBUTE), matched by its full or its default-weight href,
 * adopted as the family's entry. A Host's own link with the same href lacks
 * the marker and stays the Host's. The head script gives its links the same
 * once-only retry the registry does, so the registry adds no retry of its
 * own.
 */
function adoptHeadScriptLink(
  doc: Document,
  family: string,
  { href, fallbackHref }: FamilyUrls
): FontLinkEntry | undefined {
  const link = Array.from(doc.head.children).find(
    (child): child is HTMLLinkElement =>
      child.tagName.toLowerCase() === "link" &&
      child.getAttribute(HEAD_FONT_LINK_ATTRIBUTE) !== null &&
      child.getAttribute("rel") === "stylesheet" &&
      (child.getAttribute("href") === href ||
        child.getAttribute("href") === fallbackHref)
  )
  if (!link) return undefined

  link.setAttribute(FONT_LINK_ATTRIBUTE, family)
  // Already loaded: settled. Otherwise its next load or error settles it,
  // after the retry while it still asks for the full href. A link that
  // already failed both URLs fires nothing more, so a wait on it ends at the
  // wait's own timeout.
  const ready = link.sheet
    ? Promise.resolve()
    : linkReady(
        link,
        fallbackHref !== href && link.getAttribute("href") === href
      )
  return { link, refs: 0, ready }
}

function addFontLink(
  doc: Document,
  family: string,
  href: string,
  fallbackHref?: string
): FontLinkEntry {
  const link = doc.createElement("link")
  link.setAttribute("rel", "stylesheet")
  link.setAttribute("href", href)
  link.setAttribute(FONT_LINK_ATTRIBUTE, family)
  const retryHref = fallbackHref && fallbackHref !== href ? fallbackHref : null
  if (retryHref) {
    // Google answers 400 when a static family lacks a requested weight;
    // retry once with the family's default weight.
    link.addEventListener("error", () => link.setAttribute("href", retryHref), {
      once: true,
    })
  }
  const ready = linkReady(link, retryHref !== null)
  doc.head.appendChild(link)
  return { link, refs: 0, ready }
}

/**
 * Holds `key`'s entry, adding its link on the first hold: a plain `href`, or
 * a Google family's `FamilyUrls`, whose first hold adopts the head script's
 * link for the family when there is one, and whose own link retries once
 * with the fallback.
 */
function acquireFontLink(
  doc: Document,
  key: string,
  family: string,
  source: string | FamilyUrls
): FontRelease {
  const registry = registryFor(doc)
  let entry = registry.get(key)
  // A link someone else removed (e.g. a host re-render of <head>) is stale.
  if (entry && !entry.link.isConnected) {
    registry.delete(key)
    entry = undefined
  }

  if (!entry) {
    entry =
      typeof source === "string"
        ? addFontLink(doc, family, source)
        : (adoptHeadScriptLink(doc, family, source) ??
          addFontLink(doc, family, source.href, source.fallbackHref))
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
 * later holders share that link. A link the head script already added for
 * the family (its full or default-weight href) is adopted rather than
 * doubled.
 */
export function acquireGoogleFont(
  family: string,
  options: { weights?: readonly FontWeight[]; doc?: Document } = {}
): FontRelease {
  const doc = resolveDocument(options.doc)
  const name = family.trim()
  if (!doc || !name || extractFontFamily(name) === null) return noopRelease

  return acquireFontLink(doc, `family:${name}`, name, {
    href: buildFontCssUrl(name, options.weights),
    fallbackHref: buildPlainFontCssUrl(name),
  })
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
