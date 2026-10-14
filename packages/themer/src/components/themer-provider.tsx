"use client";

// The editor's context root, mounted beside the host's tree by
// ThemerDevShell (host/gate.tsx renders the shell after the page, never
// around it): registers host presets and extra colours, applies the edited
// theme to the host document, and binds the keyboard shortcuts.
//
// Contract:
// - Registration (configurePresets, configureExtraColors) happens during
//   render, before any child reads the registries; hosts pass `presets` and
//   `extraColors` as module-level constants.
// - The host's next-themes owns the root light/dark class: this provider
//   mirrors its resolved mode into the editor store and writes CSS variables
//   (and the shadow override sheet), not the class. It sets the class itself
//   only while next-themes reports no resolved mode (`updateClass`).
// - The CSS variables, the shadow override sheet and the theme's font links
//   are removed when the theme override preference goes off or the provider
//   unmounts; a class set through `updateClass` is not.
//
// See: packages/themer/docs/API.md ("ThemerProvider").

import * as React from "react";
import { useTheme } from "next-themes";
import { useShallow } from "zustand/react/shallow";
import type {
  ThemerConfig,
  ThemerContextValue,
  ThemeMode,
} from "../types";
import {
  useKeyboardShortcut,
  parseShortcut,
  themerShortcuts,
} from "../hooks/use-keyboard-shortcut";
import { useOverlayStore } from "../stores/overlay-store";
import { useEditorStore } from "../stores/editor-store";
import { usePreferencesStore } from "../stores/preferences-store";
import {
  applyThemeToElement,
  removeThemeFromElement,
} from "../utils/apply-theme";
import { DEFAULT_FONT_CATALOG_ENDPOINT } from "../utils/font-loader";
import { DynamicFontLoader } from "./dynamic-font-loader";
import { useSidebarSyncAlignment } from "../hooks/use-sidebar-sync-alignment";
import { SHORTCUTS } from "../config/constants";
import { configurePresets } from "../config/presets";
import { configureExtraColors } from "../config/extra-colors";

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

function toThemeMode(value: string | undefined): ThemeMode | null {
  return value === "dark" || value === "light" ? value : null;
}

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
  const config = React.useMemo<ThemerConfig>(
    () => ({
      showTrigger: true,
      shortcut: SHORTCUTS.toggle,
      // No zIndex default: the overlay and the trigger fall back to their own
      // Z_INDEX layers (config/constants.ts); a host value applies to both.
      fontCatalogEndpoint: DEFAULT_FONT_CATALOG_ENDPOINT,
      ...userConfig,
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

  // A fresh store (nothing persisted) starts on the host's default preset.
  const adoptDefaultPreset = useEditorStore(
    (state) => state.adoptDefaultPreset,
  );
  const refreshUntouchedPreset = useEditorStore(
    (state) => state.refreshUntouchedPreset,
  );
  // A layout effect, so a first visit never paints the library default
  // before the host preset replaces it. Then a restored, unedited preset is
  // brought up to its current source (host tokens may have changed since it
  // was stored); this must run after configurePresets above, never at
  // module-load hydration, when host presets are not registered yet.
  React.useLayoutEffect(() => {
    if (config.defaultPreset) adoptDefaultPreset(config.defaultPreset);
    refreshUntouchedPreset();
  }, [
    adoptDefaultPreset,
    refreshUntouchedPreset,
    config.defaultPreset,
    config.presets,
  ]);

  // Client-side ready check
  const isClientReady = React.useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  );

  // isReady when client is ready (theme from localStorage is available immediately)
  const isReady = isClientReady;

  const { resolvedTheme } = useTheme();
  const nextThemeMode = toThemeMode(resolvedTheme);

  // Apply live editor variables, but let next-themes own the root light/dark class.
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
    () =>
      nextThemeMode
        ? { ...themeState, currentMode: nextThemeMode }
        : themeState,
    [nextThemeMode, themeState],
  );

  React.useEffect(() => {
    if (nextThemeMode && themeState.currentMode !== nextThemeMode) {
      setCurrentMode(nextThemeMode);
    }
  }, [nextThemeMode, setCurrentMode, themeState.currentMode]);

  // Re-applying on every change is enough to drop properties the new theme no
  // longer sets (applyThemeToElement diffs against its previous call), so the
  // page never flashes between edits. Everything it wrote, the shadow override
  // sheet included, is removed only when the override goes off or the editor
  // unmounts.
  React.useEffect(() => {
    if (!themeOverrideEnabled) return;
    applyThemeToElement(appliedThemeState, document.documentElement, {
      updateClass: nextThemeMode === null,
    });
  }, [appliedThemeState, nextThemeMode, themeOverrideEnabled]);

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
  const toggle = useOverlayStore((state) => state.toggle);
  const isOpen = useOverlayStore((state) => state.isOpen);
  const { key, modifiers } = parseShortcut(config.shortcut ?? SHORTCUTS.toggle);

  useKeyboardShortcut({
    key,
    modifiers,
    callback: toggle,
    enabled: isReady,
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
    enabled: isReady && isOpen,
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
    enabled: isReady && isOpen,
  });

  const contextValue = React.useMemo<ThemerContextValue>(
    () => ({
      config,
      isReady,
    }),
    [config, isReady],
  );

  return (
    <ThemerContext.Provider value={contextValue}>
      <DynamicFontLoader />
      {children}
    </ThemerContext.Provider>
  );
}
