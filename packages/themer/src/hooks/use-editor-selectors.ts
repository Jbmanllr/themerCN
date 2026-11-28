// One-line hooks over selectors/editor-selectors.ts: each subscribes to a
// single slice of the editor store, so a component re-renders only when that
// slice changes. Internal: usePreset and useApplyThemePreset serve the
// preset picker (actions/preset-select.tsx), useIsOnPreset the unsaved mark
// and Reset.
// A new hook's selector follows the contract in selectors/editor-selectors.ts.

import { useEditorStore } from "../stores/editor-store"
import { usePreferencesStore } from "../stores/preferences-store"
import {
  selectApplyThemePreset,
  selectIsOnPreset,
  selectPreset,
} from "../selectors/editor-selectors"

/**
 * Whether the Theme is on its Preset (selectors' isOnPreset), under the
 * current Sidebar Sync preference. False shows the unsaved mark and enables
 * Reset.
 */
export const useIsOnPreset = () => {
  const sidebarSync = usePreferencesStore((state) => state.sidebarColorSync)
  return useEditorStore(selectIsOnPreset(sidebarSync))
}

export const usePreset = () => useEditorStore(selectPreset)

export const useApplyThemePreset = () => useEditorStore(selectApplyThemePreset)
