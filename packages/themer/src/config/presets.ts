// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified by Banter.
//
// The preset registry and its single resolution rule. Every reader of a
// preset's colours (applying, resetting, the "unsaved" indicator, the picker
// swatches) goes through resolvePresetStyles, tweakcn's
// mergePresetWithDefaults (utils/theme-preset-helper.ts): a preset only lists
// the keys it changes, and dark inherits the preset's light values before
// its own dark ones. Reading `preset.styles` directly shows stale or default
// dark colours for presets that only define light.
//
// Registry order: "default", tweakcn's catalog, this package's local presets
// (renamed `themer-*` where tweakcn has the same id, so both stay
// selectable), then host presets from ThemerConfig.presets, which win on an
// id clash. Host specifics (a host's own brand preset) live in the host. The
// picker's order is not this one: getPresetIds lists "default" first, then
// sorts by label.
//
// Contract: migratePresetId runs only in migrateEditorState's v0 step
// (editor-store.ts), so a LEGACY_PRESET_IDS entry alone does not reach a
// state persisted at a later version: renaming a built-in id again also
// needs an EDITOR_STATE_VERSION bump whose migration step applies it.
// configurePresets mutates `themePresets` in place and clears the
// resolved-styles cache; no other code may write to either.
//
// See: packages/themer/ARCHITECTURE.md (EditorStore)

import type { ThemePreset, ThemeStyleProps, ThemeStyles } from "../types";
import { defaultLightStyles, defaultDarkStyles } from "./defaults";
import { tweakcnThemePresets } from "./tweakcn-presets";

/** The registry's "default" preset: tweakcn's default theme (defaults.ts). */
const tweakcnDefaultThemePreset: ThemePreset = {
  id: "default",
  label: "Default",
  description: "The default tweakcn theme",
  source: "BUILT_IN",
  styles: {
    light: defaultLightStyles,
    dark: defaultDarkStyles,
  },
};

// Presets this package defines itself. The `themer-*` ids are the ones
// renamed from tweakcn ids they would otherwise shadow (LEGACY_PRESET_IDS).
const localThemePresets: Record<string, ThemePreset> = {
  "custom-1": {
    id: "custom-1",
    label: "Custom #1",
    description: "The previous Themer default theme",
    source: "BUILT_IN",
    styles: {
      light: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.145 0 0)",
        card: "oklch(1 0 0)",
        "card-foreground": "oklch(0.145 0 0)",
        popover: "oklch(1 0 0)",
        "popover-foreground": "oklch(0.145 0 0)",
        primary: "oklch(0.205 0 0)",
        "primary-foreground": "oklch(0.985 0 0)",
        secondary: "oklch(0.97 0 0)",
        "secondary-foreground": "oklch(0.205 0 0)",
        muted: "oklch(0.97 0 0)",
        "muted-foreground": "oklch(0.556 0 0)",
        accent: "oklch(0.97 0 0)",
        "accent-foreground": "oklch(0.205 0 0)",
        destructive: "oklch(0.577 0.245 27.325)",
        "destructive-foreground": "oklch(0.985 0 0)",
        border: "oklch(0.922 0 0)",
        input: "oklch(0.922 0 0)",
        ring: "oklch(0.708 0 0)",
        "chart-1": "oklch(0.646 0.222 41.116)",
        "chart-2": "oklch(0.6 0.118 184.704)",
        "chart-3": "oklch(0.398 0.07 227.392)",
        "chart-4": "oklch(0.828 0.189 84.429)",
        "chart-5": "oklch(0.769 0.188 70.08)",
        sidebar: "oklch(0.985 0 0)",
        "sidebar-foreground": "oklch(0.145 0 0)",
        "sidebar-primary": "oklch(0.205 0 0)",
        "sidebar-primary-foreground": "oklch(0.985 0 0)",
        "sidebar-accent": "oklch(0.97 0 0)",
        "sidebar-accent-foreground": "oklch(0.205 0 0)",
        "sidebar-border": "oklch(0.922 0 0)",
        "sidebar-ring": "oklch(0.708 0 0)",
        "font-sans":
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        "font-serif":
          'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        "font-mono":
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        "shadow-color": "oklch(0 0 0)",
        "shadow-opacity": "0.1",
        "shadow-blur": "3px",
        "shadow-spread": "0",
        "shadow-offset-x": "0",
        "shadow-offset-y": "1px",
        radius: "0.625rem",
        spacing: "0.25rem",
        "letter-spacing": "0em",
      },
      dark: {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(0.985 0 0)",
        card: "oklch(0.145 0 0)",
        "card-foreground": "oklch(0.985 0 0)",
        popover: "oklch(0.145 0 0)",
        "popover-foreground": "oklch(0.985 0 0)",
        primary: "oklch(0.985 0 0)",
        "primary-foreground": "oklch(0.205 0 0)",
        secondary: "oklch(0.269 0 0)",
        "secondary-foreground": "oklch(0.985 0 0)",
        muted: "oklch(0.269 0 0)",
        "muted-foreground": "oklch(0.708 0 0)",
        accent: "oklch(0.269 0 0)",
        "accent-foreground": "oklch(0.985 0 0)",
        destructive: "oklch(0.704 0.191 22.216)",
        "destructive-foreground": "oklch(0.985 0 0)",
        border: "oklch(0.269 0 0)",
        input: "oklch(0.269 0 0)",
        ring: "oklch(0.556 0 0)",
        "chart-1": "oklch(0.488 0.243 264.376)",
        "chart-2": "oklch(0.696 0.17 162.48)",
        "chart-3": "oklch(0.769 0.188 70.08)",
        "chart-4": "oklch(0.627 0.265 303.9)",
        "chart-5": "oklch(0.645 0.246 16.439)",
        sidebar: "oklch(0.145 0 0)",
        "sidebar-foreground": "oklch(0.985 0 0)",
        "sidebar-primary": "oklch(0.488 0.243 264.376)",
        "sidebar-primary-foreground": "oklch(0.985 0 0)",
        "sidebar-accent": "oklch(0.269 0 0)",
        "sidebar-accent-foreground": "oklch(0.985 0 0)",
        "sidebar-border": "oklch(0.269 0 0)",
        "sidebar-ring": "oklch(0.556 0 0)",
        "font-sans":
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        "font-serif":
          'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        "font-mono":
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        "shadow-color": "oklch(0 0 0)",
        "shadow-opacity": "0.25",
        "shadow-blur": "4px",
        "shadow-spread": "0",
        "shadow-offset-x": "0",
        "shadow-offset-y": "2px",
        radius: "0.625rem",
        spacing: "0.25rem",
        "letter-spacing": "0em",
      },
    },
  },

  "themer-violet-bloom": {
    id: "themer-violet-bloom",
    label: "Violet Bloom (Themer)",
    description: "A vibrant purple theme with warm accents",
    styles: {
      light: {
        "font-sans": "Plus Jakarta Sans, sans-serif",
        "font-serif": "Lora, serif",
        "font-mono": "IBM Plex Mono, monospace",
        background: "oklch(0.99 0.005 290)",
        foreground: "oklch(0.2 0.02 290)",
        primary: "oklch(0.55 0.25 290)",
        "primary-foreground": "oklch(0.98 0.01 290)",
        secondary: "oklch(0.95 0.02 290)",
        "secondary-foreground": "oklch(0.25 0.05 290)",
        muted: "oklch(0.95 0.015 290)",
        "muted-foreground": "oklch(0.5 0.03 290)",
        accent: "oklch(0.85 0.15 330)",
        "accent-foreground": "oklch(0.2 0.05 330)",
        destructive: "oklch(0.6 0.22 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.9 0.02 290)",
        input: "oklch(0.9 0.02 290)",
        ring: "oklch(0.55 0.25 290)",
      },
      dark: {
        background: "oklch(0.15 0.02 290)",
        foreground: "oklch(0.95 0.01 290)",
        primary: "oklch(0.7 0.2 290)",
        "primary-foreground": "oklch(0.15 0.02 290)",
        secondary: "oklch(0.25 0.03 290)",
        "secondary-foreground": "oklch(0.95 0.01 290)",
        muted: "oklch(0.25 0.025 290)",
        "muted-foreground": "oklch(0.65 0.03 290)",
        accent: "oklch(0.5 0.15 330)",
        "accent-foreground": "oklch(0.95 0 0)",
        destructive: "oklch(0.65 0.2 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.3 0.03 290)",
        input: "oklch(0.3 0.03 290)",
        ring: "oklch(0.7 0.2 290)",
      },
    },
  },

  "themer-ocean-breeze": {
    id: "themer-ocean-breeze",
    label: "Ocean Breeze (Themer)",
    description: "A calming blue-green palette inspired by the sea",
    styles: {
      light: {
        "font-sans": "DM Sans, sans-serif",
        "font-serif": "Lora, serif",
        "font-mono": "IBM Plex Mono, monospace",
        background: "oklch(0.99 0.005 200)",
        foreground: "oklch(0.2 0.03 200)",
        primary: "oklch(0.55 0.15 200)",
        "primary-foreground": "oklch(0.98 0.01 200)",
        secondary: "oklch(0.95 0.02 180)",
        "secondary-foreground": "oklch(0.25 0.05 180)",
        muted: "oklch(0.94 0.015 200)",
        "muted-foreground": "oklch(0.5 0.04 200)",
        accent: "oklch(0.75 0.12 170)",
        "accent-foreground": "oklch(0.2 0.05 170)",
        destructive: "oklch(0.6 0.2 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.9 0.02 200)",
        input: "oklch(0.9 0.02 200)",
        ring: "oklch(0.55 0.15 200)",
      },
      dark: {
        background: "oklch(0.15 0.025 200)",
        foreground: "oklch(0.95 0.01 200)",
        primary: "oklch(0.65 0.12 200)",
        "primary-foreground": "oklch(0.15 0.02 200)",
        secondary: "oklch(0.25 0.03 180)",
        "secondary-foreground": "oklch(0.95 0.01 180)",
        muted: "oklch(0.25 0.025 200)",
        "muted-foreground": "oklch(0.65 0.03 200)",
        accent: "oklch(0.5 0.1 170)",
        "accent-foreground": "oklch(0.95 0 0)",
        destructive: "oklch(0.65 0.18 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.3 0.03 200)",
        input: "oklch(0.3 0.03 200)",
        ring: "oklch(0.65 0.12 200)",
      },
    },
  },

  "themer-mocha-mousse": {
    id: "themer-mocha-mousse",
    label: "Mocha Mousse (Themer)",
    description: "Warm brown tones with creamy highlights",
    styles: {
      light: {
        "font-sans": "DM Sans, sans-serif",
        "font-serif": "Georgia, serif",
        "font-mono": "Menlo, monospace",
        background: "oklch(0.98 0.01 60)",
        foreground: "oklch(0.25 0.04 40)",
        primary: "oklch(0.45 0.1 40)",
        "primary-foreground": "oklch(0.98 0.01 60)",
        secondary: "oklch(0.94 0.02 50)",
        "secondary-foreground": "oklch(0.3 0.05 40)",
        muted: "oklch(0.93 0.015 55)",
        "muted-foreground": "oklch(0.5 0.04 45)",
        accent: "oklch(0.7 0.08 70)",
        "accent-foreground": "oklch(0.25 0.04 40)",
        destructive: "oklch(0.6 0.2 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.88 0.025 50)",
        input: "oklch(0.88 0.025 50)",
        ring: "oklch(0.45 0.1 40)",
      },
      dark: {
        background: "oklch(0.18 0.03 40)",
        foreground: "oklch(0.95 0.015 60)",
        primary: "oklch(0.7 0.08 50)",
        "primary-foreground": "oklch(0.18 0.03 40)",
        secondary: "oklch(0.28 0.035 45)",
        "secondary-foreground": "oklch(0.95 0.015 60)",
        muted: "oklch(0.28 0.03 45)",
        "muted-foreground": "oklch(0.65 0.035 55)",
        accent: "oklch(0.5 0.06 65)",
        "accent-foreground": "oklch(0.95 0 0)",
        destructive: "oklch(0.65 0.18 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.35 0.035 45)",
        input: "oklch(0.35 0.035 45)",
        ring: "oklch(0.7 0.08 50)",
      },
    },
  },

  "themer-nature": {
    id: "themer-nature",
    label: "Nature (Themer)",
    description: "Fresh greens and earthy tones",
    styles: {
      light: {
        "font-sans": "Montserrat, sans-serif",
        "font-serif": "Merriweather, serif",
        "font-mono": "Source Code Pro, monospace",
        background: "oklch(0.99 0.008 140)",
        foreground: "oklch(0.2 0.04 140)",
        primary: "oklch(0.5 0.15 145)",
        "primary-foreground": "oklch(0.98 0.01 140)",
        secondary: "oklch(0.94 0.025 130)",
        "secondary-foreground": "oklch(0.25 0.05 140)",
        muted: "oklch(0.94 0.02 140)",
        "muted-foreground": "oklch(0.5 0.04 140)",
        accent: "oklch(0.75 0.1 90)",
        "accent-foreground": "oklch(0.25 0.04 90)",
        destructive: "oklch(0.6 0.2 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.9 0.025 140)",
        input: "oklch(0.9 0.025 140)",
        ring: "oklch(0.5 0.15 145)",
      },
      dark: {
        background: "oklch(0.15 0.025 140)",
        foreground: "oklch(0.95 0.015 140)",
        primary: "oklch(0.65 0.12 145)",
        "primary-foreground": "oklch(0.15 0.025 140)",
        secondary: "oklch(0.25 0.035 130)",
        "secondary-foreground": "oklch(0.95 0.015 140)",
        muted: "oklch(0.25 0.03 140)",
        "muted-foreground": "oklch(0.65 0.035 140)",
        accent: "oklch(0.55 0.08 90)",
        "accent-foreground": "oklch(0.95 0 0)",
        destructive: "oklch(0.65 0.18 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.3 0.035 140)",
        input: "oklch(0.3 0.035 140)",
        ring: "oklch(0.65 0.12 145)",
      },
    },
  },

  "themer-cyberpunk": {
    id: "themer-cyberpunk",
    label: "Cyberpunk (Themer)",
    description: "Neon colors on dark backgrounds",
    styles: {
      light: {
        "font-sans": "Outfit, sans-serif",
        "font-mono": "Fira Code, monospace",
        background: "oklch(0.95 0.01 280)",
        foreground: "oklch(0.15 0.05 280)",
        primary: "oklch(0.7 0.25 330)",
        "primary-foreground": "oklch(0.15 0.03 330)",
        secondary: "oklch(0.9 0.03 280)",
        "secondary-foreground": "oklch(0.2 0.05 280)",
        muted: "oklch(0.9 0.025 280)",
        "muted-foreground": "oklch(0.45 0.04 280)",
        accent: "oklch(0.75 0.2 190)",
        "accent-foreground": "oklch(0.15 0.03 190)",
        destructive: "oklch(0.65 0.25 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.85 0.04 280)",
        input: "oklch(0.85 0.04 280)",
        ring: "oklch(0.7 0.25 330)",
      },
      dark: {
        background: "oklch(0.1 0.03 280)",
        foreground: "oklch(0.95 0.015 280)",
        primary: "oklch(0.75 0.25 330)",
        "primary-foreground": "oklch(0.1 0.03 330)",
        secondary: "oklch(0.2 0.04 280)",
        "secondary-foreground": "oklch(0.95 0.015 280)",
        muted: "oklch(0.2 0.035 280)",
        "muted-foreground": "oklch(0.6 0.04 280)",
        accent: "oklch(0.7 0.2 190)",
        "accent-foreground": "oklch(0.1 0.03 190)",
        destructive: "oklch(0.7 0.22 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.3 0.05 280)",
        input: "oklch(0.3 0.05 280)",
        ring: "oklch(0.75 0.25 330)",
      },
    },
  },

  "themer-sunset-horizon": {
    id: "themer-sunset-horizon",
    label: "Sunset Horizon (Themer)",
    description: "Warm oranges and pinks fading to purple",
    styles: {
      light: {
        "font-sans": "Montserrat, sans-serif",
        "font-serif": "Merriweather, serif",
        "font-mono": "Ubuntu Mono, monospace",
        background: "oklch(0.99 0.008 40)",
        foreground: "oklch(0.2 0.04 350)",
        primary: "oklch(0.65 0.2 25)",
        "primary-foreground": "oklch(0.98 0.01 40)",
        secondary: "oklch(0.95 0.025 350)",
        "secondary-foreground": "oklch(0.25 0.05 350)",
        muted: "oklch(0.95 0.02 40)",
        "muted-foreground": "oklch(0.5 0.04 350)",
        accent: "oklch(0.7 0.18 320)",
        "accent-foreground": "oklch(0.2 0.04 320)",
        destructive: "oklch(0.55 0.22 15)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.9 0.025 40)",
        input: "oklch(0.9 0.025 40)",
        ring: "oklch(0.65 0.2 25)",
      },
      dark: {
        background: "oklch(0.15 0.03 350)",
        foreground: "oklch(0.95 0.015 40)",
        primary: "oklch(0.7 0.18 30)",
        "primary-foreground": "oklch(0.15 0.03 30)",
        secondary: "oklch(0.25 0.04 350)",
        "secondary-foreground": "oklch(0.95 0.015 40)",
        muted: "oklch(0.25 0.035 350)",
        "muted-foreground": "oklch(0.65 0.04 40)",
        accent: "oklch(0.6 0.15 320)",
        "accent-foreground": "oklch(0.95 0 0)",
        destructive: "oklch(0.6 0.2 15)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.3 0.04 350)",
        input: "oklch(0.3 0.04 350)",
        ring: "oklch(0.7 0.18 30)",
      },
    },
  },

  "themer-graphite": {
    id: "themer-graphite",
    label: "Graphite (Themer)",
    description: "Sophisticated neutral grays with subtle blue undertones",
    styles: {
      light: {
        "font-sans": "Montserrat, sans-serif",
        "font-serif": "Georgia, serif",
        "font-mono": "Fira Code, monospace",
        background: "oklch(0.98 0.003 240)",
        foreground: "oklch(0.2 0.01 240)",
        primary: "oklch(0.35 0.02 240)",
        "primary-foreground": "oklch(0.98 0.003 240)",
        secondary: "oklch(0.94 0.006 240)",
        "secondary-foreground": "oklch(0.25 0.015 240)",
        muted: "oklch(0.94 0.005 240)",
        "muted-foreground": "oklch(0.5 0.01 240)",
        accent: "oklch(0.9 0.008 240)",
        "accent-foreground": "oklch(0.25 0.015 240)",
        destructive: "oklch(0.6 0.2 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.88 0.008 240)",
        input: "oklch(0.88 0.008 240)",
        ring: "oklch(0.5 0.015 240)",
      },
      dark: {
        "font-sans": "Inter, sans-serif",
        background: "oklch(0.15 0.01 240)",
        foreground: "oklch(0.95 0.005 240)",
        primary: "oklch(0.9 0.008 240)",
        "primary-foreground": "oklch(0.15 0.01 240)",
        secondary: "oklch(0.25 0.012 240)",
        "secondary-foreground": "oklch(0.95 0.005 240)",
        muted: "oklch(0.25 0.01 240)",
        "muted-foreground": "oklch(0.65 0.01 240)",
        accent: "oklch(0.3 0.012 240)",
        "accent-foreground": "oklch(0.95 0.005 240)",
        destructive: "oklch(0.65 0.18 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.3 0.012 240)",
        input: "oklch(0.3 0.012 240)",
        ring: "oklch(0.6 0.015 240)",
      },
    },
  },

  "rose-gold": {
    id: "rose-gold",
    label: "Rose Gold",
    description: "Elegant pinks with golden accents",
    styles: {
      light: {
        background: "oklch(0.99 0.008 350)",
        foreground: "oklch(0.25 0.04 350)",
        primary: "oklch(0.65 0.15 350)",
        "primary-foreground": "oklch(0.98 0.01 350)",
        secondary: "oklch(0.95 0.02 40)",
        "secondary-foreground": "oklch(0.3 0.05 40)",
        muted: "oklch(0.95 0.015 350)",
        "muted-foreground": "oklch(0.5 0.04 350)",
        accent: "oklch(0.8 0.1 70)",
        "accent-foreground": "oklch(0.25 0.04 70)",
        destructive: "oklch(0.6 0.22 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.9 0.02 350)",
        input: "oklch(0.9 0.02 350)",
        ring: "oklch(0.65 0.15 350)",
      },
      dark: {
        background: "oklch(0.15 0.025 350)",
        foreground: "oklch(0.95 0.015 350)",
        primary: "oklch(0.75 0.12 350)",
        "primary-foreground": "oklch(0.15 0.025 350)",
        secondary: "oklch(0.25 0.03 40)",
        "secondary-foreground": "oklch(0.95 0.015 40)",
        muted: "oklch(0.25 0.025 350)",
        "muted-foreground": "oklch(0.65 0.035 350)",
        accent: "oklch(0.6 0.08 70)",
        "accent-foreground": "oklch(0.95 0 0)",
        destructive: "oklch(0.65 0.2 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.3 0.03 350)",
        input: "oklch(0.3 0.03 350)",
        ring: "oklch(0.75 0.12 350)",
      },
    },
  },

  "midnight-blue": {
    id: "midnight-blue",
    label: "Midnight Blue",
    description: "Deep navy with bright blue accents",
    styles: {
      light: {
        background: "oklch(0.99 0.005 250)",
        foreground: "oklch(0.2 0.03 250)",
        primary: "oklch(0.45 0.2 250)",
        "primary-foreground": "oklch(0.98 0.01 250)",
        secondary: "oklch(0.95 0.015 250)",
        "secondary-foreground": "oklch(0.25 0.05 250)",
        muted: "oklch(0.94 0.012 250)",
        "muted-foreground": "oklch(0.5 0.03 250)",
        accent: "oklch(0.7 0.15 220)",
        "accent-foreground": "oklch(0.2 0.04 220)",
        destructive: "oklch(0.6 0.22 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.9 0.015 250)",
        input: "oklch(0.9 0.015 250)",
        ring: "oklch(0.45 0.2 250)",
      },
      dark: {
        background: "oklch(0.12 0.04 250)",
        foreground: "oklch(0.95 0.01 250)",
        primary: "oklch(0.65 0.18 250)",
        "primary-foreground": "oklch(0.12 0.04 250)",
        secondary: "oklch(0.22 0.05 250)",
        "secondary-foreground": "oklch(0.95 0.01 250)",
        muted: "oklch(0.22 0.04 250)",
        "muted-foreground": "oklch(0.6 0.03 250)",
        accent: "oklch(0.55 0.12 220)",
        "accent-foreground": "oklch(0.95 0 0)",
        destructive: "oklch(0.65 0.2 25)",
        "destructive-foreground": "oklch(0.98 0 0)",
        border: "oklch(0.28 0.05 250)",
        input: "oklch(0.28 0.05 250)",
        ring: "oklch(0.65 0.18 250)",
      },
    },
  },
};

const tweakcnThemePresetsWithIds = Object.fromEntries(
  Object.entries(tweakcnThemePresets).map(([id, preset]) => {
    const themePreset = preset as typeof preset &
      Partial<Pick<ThemePreset, "label" | "source">>;

    return [
      id,
      {
        id,
        source: themePreset.source ?? "BUILT_IN",
        ...themePreset,
        label: themePreset.label ?? id,
      },
    ];
  }),
) as Record<string, ThemePreset>;

const builtInThemePresets: Readonly<Record<string, ThemePreset>> = {
  default: tweakcnDefaultThemePreset,
  ...tweakcnThemePresetsWithIds,
  ...localThemePresets,
};

/** The preset every unknown id resolves to. */
export const FALLBACK_PRESET_ID = "default";

/**
 * Live preset registry: built-ins plus registered host presets. The object
 * identity is stable (callers may hold it); `configurePresets` adds and
 * removes host entries in place.
 */
export const themePresets: Record<string, ThemePreset> = {
  ...builtInThemePresets,
};

const NO_HOST_PRESETS: readonly ThemePreset[] = [];
let registeredHostPresets: readonly ThemePreset[] = NO_HOST_PRESETS;
let configuredDefaultPresetId: string = FALLBACK_PRESET_ID;
const resolvedStylesCache = new Map<string, ThemeStyles>();

export interface PresetRegistryConfig {
  /** Host presets (ThemerConfig.presets). Host wins on an id clash. */
  presets?: readonly ThemePreset[];
  /** Host default preset id (ThemerConfig.defaultPreset). */
  defaultPreset?: string;
}

/**
 * Register host presets and the default preset id. Idempotent for the same
 * array; a new array replaces the previous host presets (restoring any
 * built-in a host preset had shadowed). Called by ThemerProvider during
 * render so the registry is complete before any child reads it.
 */
export function configurePresets({
  presets = NO_HOST_PRESETS,
  defaultPreset,
}: PresetRegistryConfig): void {
  if (presets !== registeredHostPresets) {
    for (const preset of registeredHostPresets) {
      const builtIn = builtInThemePresets[preset.id];
      if (builtIn) {
        themePresets[preset.id] = builtIn;
      } else {
        Reflect.deleteProperty(themePresets, preset.id);
      }
    }
    for (const preset of presets) {
      themePresets[preset.id] = preset;
    }
    registeredHostPresets = presets;
    resolvedStylesCache.clear();
  }

  configuredDefaultPresetId =
    defaultPreset && hasPreset(defaultPreset)
      ? defaultPreset
      : FALLBACK_PRESET_ID;
}

/** Whether a preset id is registered (built-in or host). */
export function hasPreset(presetId: string): boolean {
  return Object.hasOwn(themePresets, presetId);
}

/**
 * The host's default preset id (ThemerConfig.defaultPreset when registered,
 * otherwise "default").
 */
export function getDefaultPresetId(): string {
  return hasPreset(configuredDefaultPresetId)
    ? configuredDefaultPresetId
    : FALLBACK_PRESET_ID;
}

/**
 * Whether the id names a theme from tweakcn's catalog, so tweakcn's registry
 * (`tweakcn.com/r/themes/<id>.json`) has it. Local, host and renamed
 * `themer-*` presets are not there.
 */
export function isTweakcnPreset(presetId: string): boolean {
  return Object.hasOwn(tweakcnThemePresets, presetId);
}

function resolveModeHeading(
  resolved: ThemeStyleProps,
  ...declared: (Partial<ThemeStyleProps> | undefined)[]
): ThemeStyleProps {
  // A preset without a heading font uses its own serif for headings, not
  // the default heading stack (tweakcn presets have no heading slot).
  const declaresHeading = declared.some(
    (styles) => styles?.["font-heading"] !== undefined,
  );
  return declaresHeading
    ? resolved
    : { ...resolved, "font-heading": resolved["font-serif"] };
}

/**
 * Full light and dark styles for a preset: defaults, then the preset's light
 * values, then (for dark) its dark values on top of its light ones, as
 * tweakcn's mergePresetWithDefaults. When neither the mode's own values nor
 * (for dark) the preset's light values declare `font-heading`, the mode's
 * resolved `font-serif` is its heading font (Banter addition; tweakcn presets
 * have no heading slot). Unknown ids resolve to "default". The result is
 * cached per id and shared: treat it as read-only.
 */
export function resolvePresetStyles(presetId: string): ThemeStyles {
  const id = hasPreset(presetId) ? presetId : FALLBACK_PRESET_ID;
  const cached = resolvedStylesCache.get(id);
  if (cached) return cached;

  const presetStyles = themePresets[id]?.styles;
  const light = presetStyles?.light;
  const dark = presetStyles?.dark;

  const resolved: ThemeStyles = {
    light: resolveModeHeading({ ...defaultLightStyles, ...light }, light),
    dark: resolveModeHeading(
      { ...defaultDarkStyles, ...light, ...dark },
      light,
      dark,
    ),
  };
  resolvedStylesCache.set(id, resolved);
  return resolved;
}

/**
 * Preset ids persisted by earlier editor versions and their current ids:
 * the local presets that shadowed tweakcn ids became `themer-*`. Host
 * presets are the host's business; this package maps no host ids.
 */
export const LEGACY_PRESET_IDS: Readonly<Record<string, string>> = {
  "violet-bloom": "themer-violet-bloom",
  "ocean-breeze": "themer-ocean-breeze",
  "mocha-mousse": "themer-mocha-mousse",
  nature: "themer-nature",
  cyberpunk: "themer-cyberpunk",
  "sunset-horizon": "themer-sunset-horizon",
  graphite: "themer-graphite",
};

/** Map a persisted preset id to its current id (unchanged when current). */
export function migratePresetId(presetId: string): string;
export function migratePresetId(
  presetId: string | undefined,
): string | undefined;
export function migratePresetId(presetId: string | undefined) {
  if (presetId === undefined) return undefined;
  return Object.hasOwn(LEGACY_PRESET_IDS, presetId)
    ? LEGACY_PRESET_IDS[presetId]
    : presetId;
}

/** The quick-pick presets of the HSL adjustment controls. */
export const hslPresets = [
  // Hue adjustments
  {
    label: "Hue (-120°)",
    hueShift: -120,
    saturationScale: 1,
    lightnessScale: 1,
  },
  { label: "Hue (-60°)", hueShift: -60, saturationScale: 1, lightnessScale: 1 },
  { label: "Hue (+60°)", hueShift: 60, saturationScale: 1, lightnessScale: 1 },
  {
    label: "Hue (+120°)",
    hueShift: 120,
    saturationScale: 1,
    lightnessScale: 1,
  },
  { label: "Hue Invert", hueShift: 180, saturationScale: 1, lightnessScale: 1 },

  // Saturation adjustments
  { label: "Grayscale", hueShift: 0, saturationScale: 0, lightnessScale: 1 },
  { label: "Muted", hueShift: 0, saturationScale: 0.6, lightnessScale: 1 },
  { label: "Vibrant", hueShift: 0, saturationScale: 1.4, lightnessScale: 1 },

  // Lightness adjustments
  { label: "Dimmer", hueShift: 0, saturationScale: 1, lightnessScale: 0.8 },
  { label: "Brighter", hueShift: 0, saturationScale: 1, lightnessScale: 1.2 },

  // Combined adjustments
  {
    label: "Warm Muted",
    hueShift: 30,
    saturationScale: 0.5,
    lightnessScale: 0.95,
  },
  {
    label: "Cool Vivid",
    hueShift: -20,
    saturationScale: 1.2,
    lightnessScale: 1.05,
  },
  { label: "Pastel", hueShift: 20, saturationScale: 0.7, lightnessScale: 1.1 },
  {
    label: "Vintage",
    hueShift: -10,
    saturationScale: 0.75,
    lightnessScale: 0.95,
  },
  { label: "Neon", hueShift: 60, saturationScale: 1.5, lightnessScale: 1.1 },
] as const;

/**
 * Get preset theme styles by ID, fully resolved (see resolvePresetStyles).
 */
export function getPresetThemeStyles(presetId: string): ThemeStyles {
  return resolvePresetStyles(presetId);
}

/** Every registered preset id: "default" first, then by label. */
export function getPresetIds(): string[] {
  return Object.keys(themePresets).sort((a, b) => {
    if (a === FALLBACK_PRESET_ID) {
      return -1;
    }
    if (b === FALLBACK_PRESET_ID) {
      return 1;
    }
    return getPresetLabel(a).localeCompare(getPresetLabel(b));
  });
}

/**
 * Get preset label by ID
 */
export function getPresetLabel(presetId: string): string {
  return themePresets[presetId]?.label ?? presetId;
}
