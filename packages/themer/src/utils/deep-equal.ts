// Structural equality for the editor's JSON-shaped state (theme styles, HSL
// adjustments, preset styles).

/**
 * Deep equality for JSON-shaped data: primitives by `===` (so `NaN` is never
 * equal to itself), arrays by length and element, objects by own enumerable
 * keys. Both sides need the same own keys: `{ a: undefined }` and
 * `{ b: undefined }` differ. Not for Date, Map or Set: they have no own keys,
 * so any two of them compare equal.
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false

  if (typeof a !== "object") return a === b

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => isDeepEqual(item, b[index]))
  }

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>

  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)

  if (aKeys.length !== bKeys.length) return false

  return aKeys.every(
    (key) => Object.hasOwn(bObj, key) && isDeepEqual(aObj[key], bObj[key])
  )
}
