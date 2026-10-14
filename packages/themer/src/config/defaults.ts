// The package's built-in default theme and the key lists derived for it. This
// is tweakcn's default; a Host's own brand reaches the editor as a Host
// Preset (`<Themer presets>`, README "`<Themer>` props").
//
// Contract: defaultLightStyles and defaultDarkStyles are the base that
// resolvePresetStyles (presets.ts) merges every preset over, so each style
// key is defined here and a preset may list only the keys it changes. A key
// added to ThemeStyleProps needs a value in both objects.
// COLOR_STYLE_KEYS lists the 32 shadcn colours and `shadow-color`; host extra
// colours are not in it (extra-colors.ts).

import { COMMON_STYLE_KEYS } from "../types/theme";
import type {
  ThemeStyleProps,
  ThemeStyles,
  ThemeEditorState,
  HSLAdjustments,
} from "../types";

/**
 * Default HSL adjustments (no changes)
 */
export const defaultHSLAdjustments: HSLAdjustments = {
  hueShift: 0,
  saturationScale: 1,
  lightnessScale: 1,
};

/**
 * Default light theme styles (OKLch format)
 * Based on tweakcn's default theme
 */
export const defaultLightStyles: ThemeStyleProps = {
  // Base colors
  background: "oklch(1 0 0)",
  foreground: "oklch(0.145 0 0)",
  card: "oklch(1 0 0)",
  "card-foreground": "oklch(0.145 0 0)",
  popover: "oklch(1 0 0)",
  "popover-foreground": "oklch(0.145 0 0)",

  // Semantic colors
  primary: "oklch(0.205 0 0)",
  "primary-foreground": "oklch(0.985 0 0)",
  secondary: "oklch(0.97 0 0)",
  "secondary-foreground": "oklch(0.205 0 0)",
  muted: "oklch(0.97 0 0)",
  "muted-foreground": "oklch(0.556 0 0)",
  accent: "oklch(0.97 0 0)",
  "accent-foreground": "oklch(0.205 0 0)",
  destructive: "oklch(0.577 0.245 27.325)",
  "destructive-foreground": "oklch(1 0 0)",

  // UI colors
  border: "oklch(0.922 0 0)",
  input: "oklch(0.922 0 0)",
  ring: "oklch(0.708 0 0)",

  // Chart colors
  "chart-1": "oklch(0.81 0.10 252)",
  "chart-2": "oklch(0.62 0.19 260)",
  "chart-3": "oklch(0.55 0.22 263)",
  "chart-4": "oklch(0.49 0.22 264)",
  "chart-5": "oklch(0.42 0.18 266)",

  // Sidebar colors
  sidebar: "oklch(0.985 0 0)",
  "sidebar-foreground": "oklch(0.145 0 0)",
  "sidebar-primary": "oklch(0.205 0 0)",
  "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.97 0 0)",
  "sidebar-accent-foreground": "oklch(0.205 0 0)",
  "sidebar-border": "oklch(0.922 0 0)",
  "sidebar-ring": "oklch(0.708 0 0)",

  // Typography
  "font-sans":
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  "font-heading": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  "font-serif": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  "font-mono":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

  // Shadows
  "shadow-color": "oklch(0 0 0)",
  "shadow-opacity": "0.1",
  "shadow-blur": "3px",
  "shadow-spread": "0px",
  "shadow-offset-x": "0",
  "shadow-offset-y": "1px",

  // Spacing
  radius: "0.625rem",
  spacing: "0.25rem",
  "letter-spacing": "0em",
};

/**
 * Default dark theme styles (OKLch format)
 */
export const defaultDarkStyles: ThemeStyleProps = {
  // Base colors
  background: "oklch(0.145 0 0)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.205 0 0)",
  "card-foreground": "oklch(0.985 0 0)",
  popover: "oklch(0.269 0 0)",
  "popover-foreground": "oklch(0.985 0 0)",

  // Semantic colors
  primary: "oklch(0.922 0 0)",
  "primary-foreground": "oklch(0.205 0 0)",
  secondary: "oklch(0.269 0 0)",
  "secondary-foreground": "oklch(0.985 0 0)",
  muted: "oklch(0.269 0 0)",
  "muted-foreground": "oklch(0.708 0 0)",
  accent: "oklch(0.371 0 0)",
  "accent-foreground": "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  "destructive-foreground": "oklch(0.985 0 0)",

  // UI colors
  border: "oklch(0.275 0 0)",
  input: "oklch(0.325 0 0)",
  ring: "oklch(0.556 0 0)",

  // Chart colors
  "chart-1": "oklch(0.81 0.10 252)",
  "chart-2": "oklch(0.62 0.19 260)",
  "chart-3": "oklch(0.55 0.22 263)",
  "chart-4": "oklch(0.49 0.22 264)",
  "chart-5": "oklch(0.42 0.18 266)",

  // Sidebar colors
  sidebar: "oklch(0.205 0 0)",
  "sidebar-foreground": "oklch(0.985 0 0)",
  "sidebar-primary": "oklch(0.488 0.243 264.376)",
  "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.269 0 0)",
  "sidebar-accent-foreground": "oklch(0.985 0 0)",
  "sidebar-border": "oklch(0.275 0 0)",
  "sidebar-ring": "oklch(0.439 0 0)",

  // Typography (same as light)
  "font-sans":
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  "font-heading": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  "font-serif": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  "font-mono":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

  // Shadows
  "shadow-color": "oklch(0 0 0)",
  "shadow-opacity": "0.1",
  "shadow-blur": "3px",
  "shadow-spread": "0px",
  "shadow-offset-x": "0",
  "shadow-offset-y": "1px",

  // Spacing (same as light)
  radius: "0.625rem",
  spacing: "0.25rem",
  "letter-spacing": "0em",
};

/**
 * Default theme styles containing both modes
 */
export const defaultThemeStyles: ThemeStyles = {
  light: defaultLightStyles,
  dark: defaultDarkStyles,
};

/**
 * Default theme editor state
 */
export const defaultThemeState: ThemeEditorState = {
  styles: defaultThemeStyles,
  currentMode: "light",
  preset: "default",
  hslAdjustments: defaultHSLAdjustments,
};

/**
 * Style keys shared by both modes (see COMMON_STYLE_KEYS in types/theme.ts,
 * the typed source). Kept as a plain string list because callers test
 * arbitrary keys with `includes`.
 */
export const COMMON_STYLES: readonly string[] = COMMON_STYLE_KEYS;

/**
 * Color-only style keys (excludes non-color values)
 */
export const COLOR_STYLE_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "shadow-color",
] as const;
