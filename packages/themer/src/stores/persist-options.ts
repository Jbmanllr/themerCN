// Options shared by the persisted stores' zustand `persist` configs
// (editor-store.ts, preferences-store.ts).

import type { PersistStorage, StorageValue } from "zustand/middleware"
import { isProduction } from "../utils/is-production"

/**
 * The `migrate` of a persisted store. zustand calls it only for an entry
 * saved at another version; it returns nothing, so the entry isn't applied
 * (the store's `merge` gets `undefined` and falls back to its initial
 * state), nothing is
 * logged (without a `migrate`, zustand logs an error on every load), and
 * zustand rewrites the key at the current version. There are no real
 * migrations (pre-release). The head script ignores such an entry too
 * (utils/theme-script.ts).
 */
export function dropOtherVersion<PersistedState>(): PersistedState {
  // zustand's type has no room for "nothing", but its merge receives it.
  return undefined as PersistedState
}

let warned = false

// A full (QuotaExceededError) or blocked (SecurityError) localStorage must
// never reach the store action that triggered the write: the edit still
// applies, it just isn't saved. One warning per page, in development only.
function warnOnce(error: unknown): void {
  if (warned || isProduction()) return
  warned = true
  console.warn(
    "themercn: localStorage is unavailable, so Themer changes are not saved.",
    error
  )
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false
  }
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
  )
}

/**
 * The `storage` of a persisted store: localStorage as JSON, with every
 * access guarded (see warnOnce) and a write skipped when the persisted slice
 * is shallow-equal to the last one written to that key, so a change to state
 * that doesn't persist (undo history) serialises nothing.
 *
 * The last write is remembered per key and forgotten when the key is read,
 * so the first write after a hydration (a namespace switch, a stale entry
 * being rewritten) always reaches storage. A failed write is not remembered,
 * so the next one retries.
 */
export function guardedLocalStorage<
  PersistedState,
>(): PersistStorage<PersistedState> {
  const lastWrites = new Map<string, StorageValue<PersistedState>>()

  return {
    getItem: (name) => {
      lastWrites.delete(name)
      let raw: string | null
      try {
        raw = localStorage.getItem(name)
      } catch (error) {
        warnOnce(error)
        return null
      }
      if (raw === null) return null
      try {
        return JSON.parse(raw) as StorageValue<PersistedState>
      } catch {
        // Not JSON (written by something else): nothing saved.
        return null
      }
    },
    setItem: (name, value) => {
      const last = lastWrites.get(name)
      if (
        last &&
        last.version === value.version &&
        shallowEqual(last.state, value.state)
      ) {
        return
      }
      try {
        localStorage.setItem(name, JSON.stringify(value))
        lastWrites.set(name, value)
      } catch (error) {
        lastWrites.delete(name)
        warnOnce(error)
      }
    },
    removeItem: (name) => {
      lastWrites.delete(name)
      try {
        localStorage.removeItem(name)
      } catch (error) {
        warnOnce(error)
      }
    },
  }
}
