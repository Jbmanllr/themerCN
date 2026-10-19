// Colour-string helpers on top of culori: format, parse, compare and adjust
// CSS colours. Everything takes colour text and never throws; a colour culori
// cannot parse comes back unchanged, or as null, false or the documented
// fallback (see each function). The export formats (colorFormatter) and the
// HSL adjustment keep a colour's alpha; the comparison and colour-input
// helpers ignore it.
//
// Callers: export (theme-generator.ts) and the shadow scale (shadows.ts)
// format colours; the HSL control stores adjustColorByHsl's hex output
// (hsl-adjust.ts). Applying a theme writes stored colours verbatim
// (apply-theme.ts); only the computed shadow scale passes through here.
//
// See: packages/themer/ARCHITECTURE.md ("Color System")
import * as culori from "culori"
import type { ColorFormat, TailwindVersion } from "../types"

/** Integers as they are; others to 4 decimals with trailing zeros dropped. */
function formatNumber(value: number, decimals = 4): string {
  if (Number.isInteger(value)) {
    return value.toString()
  }
  return value.toFixed(decimals).replace(/\.?0+$/, "")
}

/** ` / 0.5` for a translucent colour, nothing for an opaque one. */
function alphaSuffix(alpha: number | undefined): string {
  return alpha === undefined || alpha >= 1
    ? ""
    : ` / ${formatNumber(Math.max(0, alpha))}`
}

function formatHsl(hsl: {
  h?: number
  s?: number
  l?: number
  alpha?: number
}): string {
  const h = formatNumber(hsl.h ?? 0)
  const s = formatNumber((hsl.s ?? 0) * 100)
  const l = formatNumber((hsl.l ?? 0) * 100)
  return `hsl(${h} ${s}% ${l}%${alphaSuffix(hsl.alpha)})`
}

function formatOklch(oklch: {
  l?: number
  c?: number
  h?: number
  alpha?: number
}): string {
  const l = formatNumber(oklch.l ?? 0)
  const c = formatNumber(oklch.c ?? 0)
  const h = formatNumber(oklch.h ?? 0)
  return `oklch(${l} ${c} ${h}${alphaSuffix(oklch.alpha)})`
}

/** `#rrggbb`, or `#rrggbbaa` for a translucent colour. */
function formatHexWithAlpha(color: culori.Color): string | undefined {
  const alpha = color.alpha
  return alpha !== undefined && alpha < 1
    ? culori.formatHex8(color)
    : culori.formatHex(color)
}

/**
 * Format a colour as hsl, rgb, hex or oklch. An unparseable colour is returned
 * unchanged (with a console warning). With `tailwindVersion` "3", hsl is the
 * bare channel triple `H S% L%` that Tailwind 3 wraps in `hsl(...)`.
 */
export function colorFormatter(
  color: string,
  format: ColorFormat = "hsl",
  tailwindVersion: TailwindVersion = "4"
): string {
  try {
    const parsed = culori.parse(color)
    if (!parsed) {
      console.warn(`Invalid color: ${color}`)
      return color
    }

    switch (format) {
      case "hsl": {
        const hsl = culori.converter("hsl")(parsed)
        if (!hsl) return color

        // For Tailwind v3, return space-separated values without hsl()
        if (tailwindVersion === "3") {
          const h = formatNumber(hsl.h ?? 0)
          const s = formatNumber((hsl.s ?? 0) * 100)
          const l = formatNumber((hsl.l ?? 0) * 100)
          return `${h} ${s}% ${l}%`
        }

        return formatHsl(hsl)
      }

      case "rgb": {
        return culori.formatRgb(parsed) ?? color
      }

      case "hex": {
        return formatHexWithAlpha(parsed) ?? color
      }

      case "oklch": {
        const oklch = culori.converter("oklch")(parsed)
        if (!oklch) return color
        return formatOklch(oklch)
      }

      default:
        return color
    }
  } catch (error) {
    console.error(`Error converting color: ${color}`, error)
    return color
  }
}

/** Whether culori can parse the string as a colour. */
export function isValidColor(color: string): boolean {
  try {
    return culori.parse(color) !== undefined
  } catch {
    return false
  }
}

/**
 * Normalised form for comparing two colour strings: lower-case hex for any
 * parseable colour (so `#FFF`, `rgb(255 255 255)` and `oklch(1 0 0)` agree),
 * `transparent` kept apart from black, the trimmed text otherwise.
 */
export function normalizeColorForCompare(color: string): string {
  const trimmed = color.trim().toLowerCase()
  if (trimmed === "transparent") return trimmed
  try {
    const parsed = culori.parse(trimmed)
    return (parsed && culori.formatHex(parsed)) || trimmed
  } catch {
    return trimmed
  }
}

/**
 * Value for an `<input type="color">`, which only accepts `#rrggbb`: any
 * valid colour converted to hex for display; black when it cannot parse.
 * Display only: the stored value keeps its own format.
 */
export function toColorInputValue(color: string): string {
  try {
    const parsed = culori.parse(color.trim())
    return (parsed && culori.formatHex(parsed)) || "#000000"
  } catch {
    return "#000000"
  }
}

/**
 * Shift hue by `hueShift` degrees (wraps to 0-360) and scale saturation and
 * lightness by multipliers, in HSL. Returns `#rrggbb`, or `#rrggbbaa` when the
 * colour is translucent, or the input unchanged when it cannot be parsed. An
 * achromatic colour (undefined hue) is treated as hue 0.
 */
export function adjustColorByHsl(
  color: string,
  hueShift: number,
  saturationScale: number,
  lightnessScale: number
): string {
  try {
    const hsl = culori.converter("hsl")(color)
    if (!hsl || hsl.s === undefined || hsl.l === undefined) {
      return color
    }

    // Default hue to 0 for grayscale colors (h is undefined when s=0)
    const h = hsl.h ?? 0

    // Lightness keeps a 10% floor so a dimming adjustment cannot crush
    // colours to black, but a colour already darker than the floor (pure
    // black included) is never lifted by it.
    const lightnessFloor = Math.min(0.1, hsl.l)
    const adjustedHsl = {
      mode: "hsl" as const,
      h: (((h + hueShift) % 360) + 360) % 360,
      s: Math.min(1, Math.max(0, hsl.s * saturationScale)),
      l: Math.min(1, Math.max(lightnessFloor, hsl.l * lightnessScale)),
      alpha: hsl.alpha,
    }

    return formatHexWithAlpha(adjustedHsl) ?? color
  } catch {
    return color
  }
}
