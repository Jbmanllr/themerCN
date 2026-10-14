// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// Shadow scale from the six shadow parameters, with tweakcn's getShadowMap
// semantics (utils/shadows.ts): every size uses the user's offset, blur and
// spread verbatim; sizes differ only in opacity (x0.5 for 2xs/xs, x1 for
// sm..xl, x2.5 for 2xl) and, for sm..xl, a second layer with a fixed offset
// and blur and the spread minus 1px (`shadow` equals `shadow-sm`). Never scale
// the user's offset, blur or spread per size: that made a preset's shadows
// (e.g. neo-brutalism's hard offset) look unlike tweakcn's; shadows.test.ts pins
// tweakcn's strings. Banter changes: the map is computed for an explicit mode
// (export writes both), and getShadowVariables adds this package's raw
// parameter keys to its result (apply-theme ignores them and writes only the
// per-size scale).
//
// See: packages/themer/docs/API.md ("CSS Import, Sidebar Sync, Shadows, Colour
// Groups").

import type { ThemeEditorState, ThemeMode, ThemeStyleProps } from "../types";
import { defaultThemeState } from "../config/defaults";
import { colorFormatter } from "./color-converter";
import { parseLength } from "./length";

/** The shadow scale keys, in Tailwind order (`shadow` is the base size). */
export const SHADOW_SCALE_KEYS = [
  "shadow-2xs",
  "shadow-xs",
  "shadow-sm",
  "shadow",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
] as const;

export type ShadowScaleKey = (typeof SHADOW_SCALE_KEYS)[number];

export type ShadowMap = Record<ShadowScaleKey, string>;

/**
 * The shadow scale for one mode (defaults to the state's current mode).
 * Missing parameters fall back to the default theme, as tweakcn does.
 */
export function getShadowMap(
  themeState: ThemeEditorState,
  mode: ThemeMode = themeState.currentMode,
): ShadowMap {
  const styles: ThemeStyleProps = {
    ...defaultThemeState.styles[mode],
    ...themeState.styles[mode],
  };

  const hsl = colorFormatter(styles["shadow-color"], "hsl", "3");
  const offsetX = styles["shadow-offset-x"];
  const offsetY = styles["shadow-offset-y"];
  const blur = styles["shadow-blur"];
  const spread = styles["shadow-spread"];
  const opacity = parseFloat(styles["shadow-opacity"]);
  const color = (opacityMultiplier: number) =>
    `hsl(${hsl} / ${(opacity * opacityMultiplier).toFixed(2)})`;

  const firstLayer = (opacityMultiplier: number) =>
    `${offsetX} ${offsetY} ${blur} ${spread} ${color(opacityMultiplier)}`;

  // Same offset X and colour as the first layer, a fixed offset Y and blur
  // per size, and the first layer's spread minus one pixel.
  const secondLayer = (fixedOffsetY: string, fixedBlur: string): string => {
    const spread2 = `${parseFloat(spread.replace("px", "")) - 1}px`;
    return `${offsetX} ${fixedOffsetY} ${fixedBlur} ${spread2} ${color(1.0)}`;
  };

  return {
    "shadow-2xs": firstLayer(0.5),
    "shadow-xs": firstLayer(0.5),
    "shadow-sm": `${firstLayer(1.0)}, ${secondLayer("1px", "2px")}`,
    shadow: `${firstLayer(1.0)}, ${secondLayer("1px", "2px")}`,
    "shadow-md": `${firstLayer(1.0)}, ${secondLayer("2px", "4px")}`,
    "shadow-lg": `${firstLayer(1.0)}, ${secondLayer("4px", "6px")}`,
    "shadow-xl": `${firstLayer(1.0)}, ${secondLayer("8px", "10px")}`,
    "shadow-2xl": firstLayer(2.5),
  };
}

/**
 * The shadow scale plus this package's raw parameter variables
 * (`--shadow-x`, `--shadow-y`, `--shadow-*-raw`), for the current mode.
 */
export function getShadowVariables(
  themeState: ThemeEditorState,
  mode: ThemeMode = themeState.currentMode,
): Record<string, string> {
  const modeStyles = themeState.styles[mode];
  const defaults = defaultThemeState.styles[mode];

  return {
    ...getShadowMap(themeState, mode),
    "shadow-x": modeStyles["shadow-offset-x"] || defaults["shadow-offset-x"],
    "shadow-y": modeStyles["shadow-offset-y"] || defaults["shadow-offset-y"],
    "shadow-blur-raw": modeStyles["shadow-blur"] || defaults["shadow-blur"],
    "shadow-spread-raw":
      modeStyles["shadow-spread"] || defaults["shadow-spread"],
    "shadow-opacity-raw":
      modeStyles["shadow-opacity"] || defaults["shadow-opacity"],
    "shadow-color-raw": modeStyles["shadow-color"] || defaults["shadow-color"],
  };
}

/**
 * The six shadow parameters as numbers (lengths in px, whichever unit they
 * were stored in). A missing or unreadable number, or a missing colour, falls
 * back on its own to the soft default shadow (opacity 0.1, blur 3, spread 0,
 * offsets 0 and 1, colour `oklch(0 0 0)`), not the whole shadow. The shadow
 * controls read their starting values from here.
 */
export function getShadowParams(
  styles: Partial<
    Pick<
      ThemeStyleProps,
      | "shadow-color"
      | "shadow-opacity"
      | "shadow-blur"
      | "shadow-spread"
      | "shadow-offset-x"
      | "shadow-offset-y"
    >
  >,
): {
  color: string;
  opacity: number;
  blur: number;
  spread: number;
  offsetX: number;
  offsetY: number;
} {
  const opacity = parseFloat(styles["shadow-opacity"] || "0.1");
  return {
    color: styles["shadow-color"] || "oklch(0 0 0)",
    opacity: Number.isFinite(opacity) ? opacity : 0.1,
    blur: parseLength(styles["shadow-blur"], "px", 3),
    spread: parseLength(styles["shadow-spread"], "px", 0),
    offsetX: parseLength(styles["shadow-offset-x"], "px", 0),
    offsetY: parseLength(styles["shadow-offset-y"], "px", 1),
  };
}

/**
 * A single-layer `shadow` value from explicit parameters (px lengths).
 */
export function createCustomShadow(
  color: string,
  opacity: number,
  blur: number,
  spread: number,
  offsetX: number,
  offsetY: number,
): Record<string, string> {
  const hsl = colorFormatter(color, "hsl", "3");
  return {
    shadow: `${offsetX}px ${offsetY}px ${blur}px ${spread}px hsl(${hsl} / ${opacity.toFixed(2)})`,
  };
}
