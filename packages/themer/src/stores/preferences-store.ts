"use client";

// The editor's user preferences (colour format, Tailwind version, preview tab,
// sidebar and section states, theme override and more), persisted in this
// browser's localStorage under `<storageNamespace>:preferences`
// (getStorageKeys; `<Themer>` hydrates it through stores/hydrate.ts).
//
// Contract:
// - The whole state persists (no partialize), versioned by
//   PREFERENCES_VERSION: when a persisted field changes meaning, bump it and
//   add a step to migratePreferences.
// - utils/theme-script.ts reads `state.themeOverrideEnabled` from this entry
//   before hydration (absent means on): keep that path and the storage key.
// - colorFormat is always one of getAvailableColorFormats(): Tailwind 3 has
//   no oklch, so setColorFormat ignores a format the current version lacks
//   and setTailwindVersion("3") turns oklch into hsl.
//
// See: packages/themer/ARCHITECTURE.md (PreferencesStore)

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PreferencesStore } from "../types";
import { getStorageKeys } from "../config/constants";

/** Version of the persisted preferences (zustand persist `version`). */
export const PREFERENCES_VERSION = 2;

/**
 * Upgrade persisted preferences to PREFERENCES_VERSION.
 * v0 -> v1: the "custom" preview tab merged into "live". Other unknown tab
 * ids are left as stored; the preview tabs fall back to their first tab.
 */
export function migratePreferences(
  persistedState: unknown,
  version: number,
): Partial<PreferencesStore> {
  let state = (persistedState ?? {}) as Partial<PreferencesStore>;
  if (version < 1 && state.previewTab === "custom") {
    state = { ...state, previewTab: "live" };
  }
  return state;
}

const colorFormatsByVersion = {
  "3": ["hex", "rgb", "hsl"],
  "4": ["hex", "rgb", "hsl", "oklch"],
} as const;

/**
 * User preferences store. `sectionStates` holds each ControlSection's open
 * state by section id; `setSectionOpen` leaves the state untouched when the
 * value is already set, so nothing re-renders.
 */
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // State
      colorFormat: "oklch",
      tailwindVersion: "4",
      packageManager: "pnpm",
      showContrastWarnings: true,
      previewTab: "cards",
      sidebarCollapsed: false,
      themeOverrideEnabled: true,
      sidebarColorSync: false,
      colorSelectorTab: "list",
      sectionStates: {},

      // Actions
      setColorFormat: (format) => {
        if (get().getAvailableColorFormats().includes(format)) {
          set({ colorFormat: format });
        }
      },
      setTailwindVersion: (version) => {
        const next: Partial<PreferencesStore> = { tailwindVersion: version };
        if (version === "3" && get().colorFormat === "oklch") {
          next.colorFormat = "hsl";
        }
        set(next);
      },
      setPackageManager: (packageManager) => set({ packageManager }),
      setShowContrastWarnings: (show) => set({ showContrastWarnings: show }),
      setPreviewTab: (tab) => set({ previewTab: tab }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setThemeOverrideEnabled: (enabled) =>
        set({ themeOverrideEnabled: enabled }),
      setSidebarColorSync: (enabled) => set({ sidebarColorSync: enabled }),
      setColorSelectorTab: (tab) => set({ colorSelectorTab: tab }),
      setSectionOpen: (id, open) =>
        set((state) =>
          state.sectionStates[id] === open
            ? state
            : { sectionStates: { ...state.sectionStates, [id]: open } },
        ),
      getAvailableColorFormats: () =>
        colorFormatsByVersion[get().tailwindVersion],
    }),
    {
      name: getStorageKeys().preferences,
      // <Themer> names the namespace and hydrates (stores/hydrate.ts).
      skipHydration: true,
      version: PREFERENCES_VERSION,
      migrate: (persistedState, version) =>
        migratePreferences(persistedState, version) as PreferencesStore,
    },
  ),
);
