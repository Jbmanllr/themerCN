// Parse the CSS lengths the editor stores (radius, spacing, letter spacing,
// shadow parameters) into a number in the unit a control edits. Stored
// values come from presets, imported CSS and the controls themselves, so they
// mix units: `9999px` radius, `normal` letter spacing, unitless `0` offsets.
// One parser replaces each control stripping its own suffix with
// `replace("rem", "")`; clampToRange then keeps the value on the slider.

export type LengthUnit = "px" | "rem" | "em"

/** Root font size the editor assumes when converting px to rem/em. */
const ROOT_FONT_SIZE_PX = 16

const LENGTH_PATTERN = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/i

function toPx(amount: number, unit: LengthUnit): number {
  return unit === "px" ? amount : amount * ROOT_FONT_SIZE_PX
}

function fromPx(px: number, unit: LengthUnit): number {
  return unit === "px" ? px : px / ROOT_FONT_SIZE_PX
}

/**
 * Parse a stored length into `targetUnit`.
 *
 * - `normal` (letter spacing) is 0.
 * - A unitless number is taken to already be in `targetUnit`.
 * - px converts to rem/em at 16px; rem and em are treated alike (the editor
 *   has no element context to resolve em against).
 * - Anything else (`calc()`, `var()`, empty) returns `fallback`.
 */
export function parseLength(
  value: string | undefined | null,
  targetUnit: LengthUnit,
  fallback = 0
): number {
  const trimmed = value?.trim().toLowerCase() ?? ""
  if (trimmed === "normal") return 0

  const match = LENGTH_PATTERN.exec(trimmed)
  if (!match) return fallback

  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return fallback

  const unit = match[2] as LengthUnit | undefined
  if (!unit || unit === targetUnit) return amount
  if (unit !== "px" && targetUnit !== "px") return amount

  return fromPx(toPx(amount, unit), targetUnit)
}

/** Clamp a number into an inclusive range. */
export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
