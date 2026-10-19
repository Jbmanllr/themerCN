// Points the persisted stores at a storage namespace and hydrates them from
// it. `<Themer>` calls this while rendering, before any child reads a store;
// the stores themselves skip hydration at module load, so nothing is read
// from a key the Host did not choose.

import { getStorageKeys } from "../config/constants"
import { useEditorStore } from "./editor-store"
import { usePreferencesStore } from "./preferences-store"

let hydratedNamespace: string | null = null

/**
 * Hydrate the editor and preferences stores from
 * `<namespace>:editor` and `<namespace>:preferences`. Idempotent for the same
 * namespace; a new namespace re-reads both stores from its keys.
 */
export function hydrateThemerStores(namespace: string): void {
  if (hydratedNamespace === namespace) return
  hydratedNamespace = namespace
  const keys = getStorageKeys(namespace)
  useEditorStore.persist.setOptions({ name: keys.editor })
  usePreferencesStore.persist.setOptions({ name: keys.preferences })
  void useEditorStore.persist.rehydrate()
  void usePreferencesStore.persist.rehydrate()
}
