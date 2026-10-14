"use client";

// The public consumer hook: theme state, actions and preferences in one
// object. It subscribes to the fields it returns only (useShallow per store),
// so history, prefs or overlay fields it does not expose never re-render its
// callers. It still returns `themeState`, so a caller re-renders on every
// theme edit: components that need one value should select it from the store
// directly (see selectors/editor-selectors.ts) instead of calling this.
//
// Light/dark: useColorMode (components/color-mode.tsx) owns the mode and
// ThemerProvider keeps themeState.currentMode in sync with it; this hook only
// issues the change.

import { useCallback } from "react";
import { useColorMode } from "../components/color-mode";
import { useShallow } from "zustand/react/shallow";
import { getExtraColorKeys } from "../config/extra-colors";
import { useEditorStore } from "../stores/editor-store";
import { useOverlayStore } from "../stores/overlay-store";
import { usePreferencesStore } from "../stores/preferences-store";
import {
  selectCanUndo,
  selectCanRedo,
  selectHasUnsavedChanges,
} from "../selectors";
import {
  generateThemeCode,
  generateTailwindConfigCode,
  generateLayoutCode,
} from "../utils/theme-generator";
import {
  runThemeTransition,
  type TransitionOrigin,
} from "../utils/theme-transition";
import type {
  ThemeMode,
  ThemeStyleProps,
  ThemeStyleKey,
  ColorFormat,
  TailwindVersion,
} from "../types";

/** A point, or a pointer event (`onClick={toggleMode}` works as is). */
export type ToggleModeOrigin =
  TransitionOrigin | { clientX: number; clientY: number };

/**
 * A usable click point, or undefined (centre). A keyboard-activated click
 * reports (0, 0), which would start the reveal from the corner.
 */
function toOrigin(
  origin: ToggleModeOrigin | undefined,
): TransitionOrigin | undefined {
  if (!origin || typeof origin !== "object") return undefined;
  const x = "clientX" in origin ? origin.clientX : origin.x;
  const y = "clientY" in origin ? origin.clientY : origin.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  if (x === 0 && y === 0) return undefined;
  return { x, y };
}

/**
 * Toggle light/dark with the circular reveal from `origin` (a pointer
 * position, e.g. the click event) or from the centre. Call from event
 * handlers only (the transition commits the change with flushSync).
 */
export function useToggleMode(): (origin?: ToggleModeOrigin) => void {
  const { setMode } = useColorMode();
  const setCurrentMode = useEditorStore((state) => state.setCurrentMode);

  return useCallback(
    (origin?: ToggleModeOrigin) => {
      const newMode: ThemeMode =
        useEditorStore.getState().themeState.currentMode === "light"
          ? "dark"
          : "light";
      runThemeTransition(() => {
        setMode(newMode);
        setCurrentMode(newMode);
      }, toOrigin(origin));
    },
    [setMode, setCurrentMode],
  );
}

/**
 * Main consumer hook for the themer
 * Provides access to theme state, controls, and utilities
 */
export function useThemer() {
  const {
    themeState,
    setThemeState,
    applyThemePreset,
    undo,
    redo,
    resetToCurrentPreset,
    updateCommonStyle,
  } = useEditorStore(
    useShallow((state) => ({
      themeState: state.themeState,
      setThemeState: state.setThemeState,
      applyThemePreset: state.applyThemePreset,
      undo: state.undo,
      redo: state.redo,
      resetToCurrentPreset: state.resetToCurrentPreset,
      updateCommonStyle: state.updateCommonStyle,
    })),
  );

  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);
  const hasUnsavedChanges = useEditorStore(selectHasUnsavedChanges);

  const {
    isOpen,
    open,
    close,
    toggle,
    activePanel,
    setActivePanel,
    inspectorMode,
    toggleInspector,
    fullscreenPreview,
    toggleFullscreen,
  } = useOverlayStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      open: state.open,
      close: state.close,
      toggle: state.toggle,
      activePanel: state.activePanel,
      setActivePanel: state.setActivePanel,
      inspectorMode: state.inspectorMode,
      toggleInspector: state.toggleInspector,
      fullscreenPreview: state.fullscreenPreview,
      toggleFullscreen: state.toggleFullscreen,
    })),
  );

  const {
    colorFormat,
    tailwindVersion,
    showContrastWarnings,
    themeOverrideEnabled,
    setColorFormat,
    setTailwindVersion,
    setShowContrastWarnings,
    setThemeOverrideEnabled,
  } = usePreferencesStore(
    useShallow((state) => ({
      colorFormat: state.colorFormat,
      tailwindVersion: state.tailwindVersion,
      showContrastWarnings: state.showContrastWarnings,
      themeOverrideEnabled: state.themeOverrideEnabled,
      setColorFormat: state.setColorFormat,
      setTailwindVersion: state.setTailwindVersion,
      setShowContrastWarnings: state.setShowContrastWarnings,
      setThemeOverrideEnabled: state.setThemeOverrideEnabled,
    })),
  );

  const toggleMode = useToggleMode();

  /**
   * Update a single style property
   * Uses functional setState to avoid stale closure issues
   */
  const setStyleProperty = useCallback(
    (key: ThemeStyleKey, value: string, mode?: ThemeMode) => {
      setThemeState((prev) => {
        const targetMode = mode ?? prev.currentMode;
        return {
          ...prev,
          styles: {
            ...prev.styles,
            [targetMode]: {
              ...prev.styles[targetMode],
              [key]: value,
            },
          },
        };
      });
    },
    [setThemeState],
  );

  /**
   * Update multiple style properties at once
   * Uses functional setState to avoid stale closure issues
   */
  const setStyleProperties = useCallback(
    (properties: Partial<ThemeStyleProps>, mode?: ThemeMode) => {
      setThemeState((prev) => {
        const targetMode = mode ?? prev.currentMode;
        return {
          ...prev,
          styles: {
            ...prev.styles,
            [targetMode]: {
              ...prev.styles[targetMode],
              ...properties,
            },
          },
        };
      });
    },
    [setThemeState],
  );

  /**
   * Generate CSS code for export: the built-in keys plus the host's extra
   * colours the theme sets (getExtraColorKeys()), as the Code dialog does.
   */
  const exportCSS = useCallback(
    (format?: ColorFormat, version?: TailwindVersion) => {
      return generateThemeCode(
        themeState,
        format ?? colorFormat,
        version ?? tailwindVersion,
        getExtraColorKeys(),
      );
    },
    [themeState, colorFormat, tailwindVersion],
  );

  /**
   * Generate the Tailwind config for export. Always the v3 JS config:
   * generateTailwindConfigCode ignores its version argument. Like exportCSS,
   * it includes the host's extra colours the theme sets.
   */
  const exportTailwindConfig = useCallback(
    (format?: ColorFormat) => {
      return generateTailwindConfigCode(
        themeState,
        format ?? colorFormat,
        "3",
        getExtraColorKeys(),
      );
    },
    [themeState, colorFormat],
  );

  /**
   * Generate Next.js layout code for selected font variables.
   */
  const exportLayout = useCallback(() => {
    return generateLayoutCode(themeState);
  }, [themeState]);

  /**
   * Reset the theme to its preset. ThemerProvider re-applies the preset's
   * variables over the current ones in one pass (applyThemeToElement diffs),
   * so nothing is removed first and the page does not flash unstyled.
   */
  const reset = resetToCurrentPreset;

  /**
   * Get current styles for the active mode
   */
  const currentStyles = themeState.styles[themeState.currentMode];

  return {
    // State
    themeState,
    currentStyles,
    currentMode: themeState.currentMode,
    preset: themeState.preset,
    isOpen,
    activePanel,
    inspectorMode,
    fullscreenPreview,

    // Preferences
    colorFormat,
    tailwindVersion,
    showContrastWarnings,
    themeOverrideEnabled,

    // Theme actions
    setStyleProperty,
    setStyleProperties,
    /** Write a style shared by both modes (fonts, radius, spacing, shadows). */
    updateCommonStyle,
    applyPreset: applyThemePreset,
    /** Toggle light/dark; pass the click event (or a point) as the origin. */
    toggleMode,
    reset,

    // History actions
    undo,
    redo,
    canUndo,
    canRedo,
    hasUnsavedChanges,

    // Overlay actions
    open,
    close,
    toggle,
    setActivePanel,
    toggleInspector,
    toggleFullscreen,

    // Preference actions
    setColorFormat,
    setTailwindVersion,
    setShowContrastWarnings,
    setThemeOverrideEnabled,

    // Export utilities
    exportCSS,
    exportTailwindConfig,
    exportLayout,
  };
}
