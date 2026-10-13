"use client";

// The editor's user preferences (colour format, Tailwind version, preview tab,
// sidebar and section states, theme override and more), persisted in this
// browser's localStorage under STORAGE_KEYS.preferences
// ("villa-themer-preferences").
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
import { STORAGE_KEYS } from "../config/constants";

/** Version of the persisted preferences (zustand persist `version`). */
export const PREFERENCES_VERSION = 2;

/**
 * Pre-v2 ControlSection kept its open states under its own localStorage key;
 * v2 moves them into `sectionStates`. The old key is read once by the
 * migration and left in place (harmless, never read again).
 */
export const LEGACY_SECTION_STATES_KEY = "themer-section-states";

function readLegacySectionStates(): Record<string, boolean> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = window.localStorage.getItem(LEGACY_SECTION_STATES_KEY);
    if (!stored) return undefined;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return undefined;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
      ),
    );
  } catch {
    return undefined;
  }
}

/**
 * Upgrade persisted preferences to PREFERENCES_VERSION.
 * v0 -> v1: the "custom" preview tab merged into "live". Other unknown tab
 * ids are left as stored; the preview tabs fall back to their first tab.
 * v1 -> v2: section open states move from the legacy localStorage key into
 * `sectionStates` (new keys get their defaults from the store); stored
 * `sectionStates` win over the legacy key. `readLegacy` is injectable so tests
 * need no localStorage.
 */
export function migratePreferences(
  persistedState: unknown,
  version: number,
  readLegacy: () =>
    Record<string, boolean> | undefined = readLegacySectionStates,
): Partial<PreferencesStore> {
  let state = (persistedState ?? {}) as Partial<PreferencesStore>;
  if (version < 1 && state.previewTab === "custom") {
    state = { ...state, previewTab: "live" };
  }
  if (version < 2 && state.sectionStates === undefined) {
    const legacy = readLegacy();
    if (legacy) state = { ...state, sectionStates: legacy };
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
      aiProvider: undefined,
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
      setAIProvider: (provider) => set({ aiProvider: provider }),
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
      name: STORAGE_KEYS.preferences,
      version: PREFERENCES_VERSION,
      migrate: (persistedState, version) =>
        migratePreferences(persistedState, version) as PreferencesStore,
    },
  ),
);
