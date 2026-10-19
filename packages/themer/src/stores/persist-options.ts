// Options shared by the persisted stores' zustand `persist` configs
// (editor-store.ts, preferences-store.ts).

/**
 * The `migrate` of a persisted store. zustand calls it only for an entry
 * saved at another version; it returns nothing, so the entry isn't applied
 * (the store's `merge` gets `undefined` and keeps its state), nothing is
 * logged (without a `migrate`, zustand logs an error on every load), and
 * zustand rewrites the key at the current version. There are no real
 * migrations (pre-release). The head script ignores such an entry too
 * (utils/theme-script.ts).
 */
export function dropOtherVersion<PersistedState>(): PersistedState {
  // zustand's type has no room for "nothing", but its merge receives it.
  return undefined as PersistedState
}
