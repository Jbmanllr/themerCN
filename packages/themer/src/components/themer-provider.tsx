"use client";

// The editor's context root, mounted by <Themer> (components/themer.tsx)
// beside the Host app's tree: registers Host Presets and extra colours, applies
// the edited theme to the Host app's document, and binds the keyboard shortcuts.
//
// Contract:
// - Registration (configurePresets, configureExtraColors) happens during
//   render, before any child reads the registries; hosts pass `presets` and
//   `extraColors` as module-level constants.
// - The light/dark mode comes from useColorMode (components/color-mode.tsx:
//   the Host's controlled `colorMode`, or the `.dark` class on <html>). This
//   provider mirrors it into the editor store and writes CSS variables (and
//   the shadow override sheet), never the class.
// - The CSS variables, the shadow override sheet and the theme's font links
//   are removed when the theme override preference goes off or the provider
//   unmounts.
// - The head script's restore sheet (RESTORE_STYLE_ID) is removed in the same
//   effect that first applies the Theme, or at once when the override is off,
//   so the page never shows a stale copy of the Theme.
//
// See: packages/themer/ARCHITECTURE.md ("Core Entry Points").

import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import type {
  ThemerConfig,
  ThemerContextValue,
} from "../types";
import {
  useKeyboardShortcut,
  parseShortcut,
  themerShortcuts,
} from "../hooks/use-keyboard-shortcut";
import { useThemerUIStore } from "../stores/themer-ui-store";
import { useEditorStore } from "../stores/editor-store";
import { usePreferencesStore } from "../stores/preferences-store";
import {
  applyThemeToElement,
  removeThemeFromElement,
} from "../utils/apply-theme";
import { useColorMode } from "./color-mode";
import { DynamicFontLoader } from "./dynamic-font-loader";
import { useSidebarSyncAlignment } from "../hooks/use-sidebar-sync-alignment";
import { RESTORE_STYLE_ID, SHORTCUTS } from "../config/constants";
import { configurePresets, getDefaultPresetId } from "../config/presets";
import { configureExtraColors } from "../config/extra-colors";

/**
 * Themer context
 */
const ThemerContext = React.createContext<ThemerContextValue | null>(null);

export function useThemerContext() {
  const context = React.useContext(ThemerContext);
  if (!context) {
    throw new Error("useThemerContext must be used within a ThemerProvider");
  }
  return context;
}

export function useOptionalThemerContext() {
  return React.useContext(ThemerContext);
}

interface ThemerProviderProps {
  children: React.ReactNode;
  config?: ThemerConfig;
}

/**
 * Provider for the themer package
 * Sets up keyboard shortcuts and theme application
 */
export function ThemerProvider({
  children,
  config: userConfig,
}: ThemerProviderProps) {
  // Merge user config with defaults
  // Unset (undefined) props keep the defaults. No zIndex default: the
  // Themer UI and the trigger fall back to their own Z_INDEX layers
  // (config/constants.ts); a Host value applies to both. No font endpoint
  // default: without one the picker searches the bundled list.
  const config = React.useMemo<ThemerConfig>(
    () => ({
      ...userConfig,
      showTrigger: userConfig?.showTrigger ?? true,
      shortcut: userConfig?.shortcut ?? SHORTCUTS.toggle,
    }),
    [userConfig],
  );

  // Host presets must be in the registry before any child (preset picker,
  // store actions) reads it, so register during render. Idempotent for the
  // same `presets` array, which hosts pass as a module-level constant.
  configurePresets({
    presets: config.presets,
    defaultPreset: config.defaultPreset,
  });
  // Host extra colours likewise (colour list, search, inspector, apply).
  configureExtraColors(config.extraColors);

  // A fresh store (nothing persisted) starts on the Host app's default preset.
  const adoptDefaultPreset = useEditorStore(
    (state) => state.adoptDefaultPreset,
  );
  const refreshUntouchedPreset = useEditorStore(
    (state) => state.refreshUntouchedPreset,
  );
  // A layout effect, so a first visit never paints the library default
  // before the Host Preset replaces it. Then a restored, unedited preset is
  // brought up to its current source (host tokens may have changed since it
  // was stored); this must run after configurePresets above, never at
  // module-load hydration, when Host Presets are not registered yet.
  React.useLayoutEffect(() => {
    adoptDefaultPreset(getDefaultPresetId());
    refreshUntouchedPreset();
  }, [
    adoptDefaultPreset,
    refreshUntouchedPreset,
    config.defaultPreset,
    config.presets,
  ]);

  const { mode } = useColorMode();

  // Apply live editor variables; the root light/dark class is not ours.
  const themeState = useEditorStore((state) => state.themeState);
  const { undo, redo, canUndo, canRedo, setCurrentMode } = useEditorStore(
    useShallow((state) => ({
      undo: state.undo,
      redo: state.redo,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      setCurrentMode: state.setCurrentMode,
    })),
  );
  const themeOverrideEnabled = usePreferencesStore(
    (state) => state.themeOverrideEnabled,
  );
  const appliedThemeState = React.useMemo(
    () => ({ ...themeState, currentMode: mode }),
    [mode, themeState],
  );

  React.useEffect(() => {
    if (themeState.currentMode !== mode) setCurrentMode(mode);
  }, [mode, setCurrentMode, themeState.currentMode]);

  // Re-applying on every change is enough to drop properties the new theme no
  // longer sets (applyThemeToElement diffs against its previous call), so the
  // page never flashes between edits. Everything it wrote, the shadow override
  // sheet included, is removed only when the override goes off or the editor
  // unmounts.
  React.useEffect(() => {
    if (themeOverrideEnabled) {
      applyThemeToElement(appliedThemeState, document.documentElement, {
        updateClass: false,
      });
    }
    document.getElementById(RESTORE_STYLE_ID)?.remove();
  }, [appliedThemeState, themeOverrideEnabled]);

  React.useEffect(() => {
    if (!themeOverrideEnabled) return undefined;
    return () => removeThemeFromElement(document.documentElement);
  }, [themeOverrideEnabled]);

  // Sidebar Sync re-aligns the sidebar colours after a preset, undo or
  // import even while the Colors panel (which owns the toggle) is unmounted.
  useSidebarSyncAlignment();

  // Keyboard shortcuts. useKeyboardShortcut keys its listener on the
  // shortcut string, so the fresh arrays and inline callbacks below do not
  // re-add listeners on every theme edit.
  const toggle = useThemerUIStore((state) => state.toggle);
  const isOpen = useThemerUIStore((state) => state.isOpen);
  const { key, modifiers } = parseShortcut(config.shortcut ?? SHORTCUTS.toggle);

  useKeyboardShortcut({
    key,
    modifiers,
    callback: toggle,
  });

  // Undo keyboard shortcut (Ctrl+Z / Cmd+Z)
  useKeyboardShortcut({
    key: themerShortcuts.undo.key,
    modifiers: themerShortcuts.undo.modifiers,
    callback: () => {
      if (canUndo()) {
        undo();
      }
    },
    enabled: isOpen,
  });

  // Redo keyboard shortcut (Ctrl+Shift+Z / Cmd+Shift+Z)
  useKeyboardShortcut({
    key: themerShortcuts.redo.key,
    modifiers: themerShortcuts.redo.modifiers,
    callback: () => {
      if (canRedo()) {
        redo();
      }
    },
    enabled: isOpen,
  });

  const contextValue = React.useMemo<ThemerContextValue>(
    () => ({ config }),
    [config],
  );

  return (
    <ThemerContext.Provider value={contextValue}>
      <DynamicFontLoader />
      {children}
    </ThemerContext.Provider>
  );
}
