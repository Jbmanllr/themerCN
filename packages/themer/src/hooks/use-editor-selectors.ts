// One-line hooks over selectors/editor-selectors.ts: each subscribes to a
// single slice of the editor store, so a component re-renders only when that
// slice changes. Exported through the package root; inside the package only
// usePreset and useApplyThemePreset are called (overlay/mobile-drawer.tsx).
// A new hook's selector follows the contract in selectors/editor-selectors.ts.

import { useEditorStore } from "../stores/editor-store";
import {
  selectCanUndo,
  selectCanRedo,
  selectHasUnsavedChanges,
  selectCurrentStyles,
  selectCurrentMode,
  selectPreset,
  selectThemeState,
  selectSetThemeState,
  selectApplyThemePreset,
  selectUndo,
  selectRedo,
  selectResetToCurrentPreset,
  selectSetCurrentMode,
  selectUpdateCommonStyle,
  selectImportThemeStyles,
  selectStyleProperty,
} from "../selectors";
import type { ThemeStyleProps } from "../types";

/** Hook for undo/redo availability */
export const useCanUndo = () => useEditorStore(selectCanUndo);
export const useCanRedo = () => useEditorStore(selectCanRedo);

/** Hook for unsaved changes status */
export const useHasUnsavedChanges = () =>
  useEditorStore(selectHasUnsavedChanges);

/** Hook for current styles only (re-renders when current mode styles change) */
export const useCurrentStyles = () => useEditorStore(selectCurrentStyles);

/** Hook for current mode */
export const useCurrentMode = () => useEditorStore(selectCurrentMode);

/** Hook for current preset */
export const usePreset = () => useEditorStore(selectPreset);

/** Hook for full theme state (use with caution - re-renders on any change) */
export const useThemeState = () => useEditorStore(selectThemeState);

/** Hook for setThemeState action */
export const useSetThemeState = () => useEditorStore(selectSetThemeState);

/** Hook for applyThemePreset action */
export const useApplyThemePreset = () => useEditorStore(selectApplyThemePreset);

/** Hook for undo action */
export const useUndo = () => useEditorStore(selectUndo);

/** Hook for redo action */
export const useRedo = () => useEditorStore(selectRedo);

/** Hook for resetToCurrentPreset action */
export const useResetToCurrentPreset = () =>
  useEditorStore(selectResetToCurrentPreset);

/** Hook for setCurrentMode action */
export const useSetCurrentMode = () => useEditorStore(selectSetCurrentMode);

/** Hook for updateCommonStyle (writes a shared style to both modes) */
export const useUpdateCommonStyle = () =>
  useEditorStore(selectUpdateCommonStyle);

/** Hook for importThemeStyles (CSS import: history, checkpoint, HSL reset) */
export const useImportThemeStyles = () =>
  useEditorStore(selectImportThemeStyles);

/**
 * One style value for the current mode; re-renders only when that value or
 * the mode changes.
 */
export const useStyleProperty = (key: keyof ThemeStyleProps) =>
  useEditorStore(selectStyleProperty(key));
