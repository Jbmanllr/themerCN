// Points the persisted stores at a storage namespace and hydrates them from
// it. `<Themer>` calls this in a layout effect, before it renders the
// children that read the stores; the stores themselves skip hydration at
// module load, so nothing is read from a key the Host did not choose.
//
// A namespace switch only repoints the keys and rehydrates: each store's
// `merge` falls back to its initial state when the key holds nothing, so the
// switch writes nothing to either namespace. Never reset the stores first:
// a setState persists at once, overwriting the new namespace's entry (after
// repointing) or wiping the old one (before).

import { getStorageKeys } from "../config/constants"
import { useEditorStore } from "./editor-store"
import { usePreferencesStore } from "./preferences-store"

let hydratedNamespace: string | null = null
const listeners = new Set<() => void>()

/**
 * Hydrate the editor and preferences stores from
 * `<namespace>:editor` and `<namespace>:preferences`, synchronously
 * (localStorage). Idempotent for the same namespace; a new namespace re-reads
 * both stores from its keys, starting from their initial state.
 */
export function hydrateThemerStores(namespace: string): void {
  if (hydratedNamespace === namespace) return
  hydratedNamespace = namespace
  const keys = getStorageKeys(namespace)
  useEditorStore.persist.setOptions({ name: keys.editor })
  usePreferencesStore.persist.setOptions({ name: keys.preferences })
  // Preferences first: the editor's merge reads the restored Sidebar Sync
  // preference to put the restored Theme in sync.
  void usePreferencesStore.persist.rehydrate()
  void useEditorStore.persist.rehydrate()
  listeners.forEach((listener) => listener())
}

/**
 * The namespace the stores hold (null before the first hydration), for
 * `useSyncExternalStore` with subscribeHydratedNamespace.
 */
export function getHydratedNamespace(): string | null {
  return hydratedNamespace
}

/** Calls `listener` after the stores hydrate from another namespace. */
export function subscribeHydratedNamespace(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
