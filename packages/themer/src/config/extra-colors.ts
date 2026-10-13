// The host extra-colour registry (ThemerConfig.extraColors): colour tokens a
// host has beyond the 32 shadcn colours, which the editor lists, edits,
// applies, HSL-adjusts, imports and exports like the built-in ones.
//
// A registry rather than props for the same reason as the preset registry
// (config/presets.ts): pure helpers far from React (the colour-group search,
// focusColor, the inspector's class regex, the apply fallback) need the list,
// and ThemerProvider registers it during render so it is complete before any
// child reads it. Idempotent for the same array; hosts pass a module-level
// constant.
//
// Values live in the same per-mode `styles` objects as the built-in keys (a
// host key `signal` is `styles.light.signal`), so persistence, undo/redo,
// "unsaved" and apply need no extra code. An extra a theme does not set stays
// absent: the host's own CSS value shows and nothing is written for it.
//
// Normalisation: keys must be kebab-case custom property names without
// `--`; keys naming a built-in style key (colour or not) or starting with
// `shadow-` (apply-theme reserves that prefix) are dropped, duplicates keep
// their first occurrence, and groups left empty are dropped.

import type { ThemerExtraColorGroup } from "../types";
import { COLOR_STYLE_KEYS, defaultLightStyles } from "./defaults";

const EXTRA_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Every built-in style key; an extra colour may not reuse one. */
const BUILT_IN_STYLE_KEYS: ReadonlySet<string> = new Set<string>([
  ...COLOR_STYLE_KEYS,
  ...Object.keys(defaultLightStyles),
  "spacing",
]);

/** Whether a key can be a host extra colour (valid and not built in). */
export function isValidExtraColorKey(key: string): boolean {
  return (
    EXTRA_KEY_PATTERN.test(key) &&
    !BUILT_IN_STYLE_KEYS.has(key) &&
    !key.startsWith("shadow-")
  );
}

/** Pure normalisation of a host's groups (see the header for the rules). */
export function normalizeExtraColorGroups(
  groups: readonly ThemerExtraColorGroup[],
): readonly ThemerExtraColorGroup[] {
  const seen = new Set<string>();
  const normalized: ThemerExtraColorGroup[] = [];
  for (const group of groups) {
    const colors = group.colors.filter((color) => {
      if (!isValidExtraColorKey(color.key) || seen.has(color.key)) {
        return false;
      }
      seen.add(color.key);
      return true;
    });
    if (colors.length > 0) normalized.push({ ...group, colors });
  }
  return normalized;
}

const NO_EXTRA_COLORS: readonly ThemerExtraColorGroup[] = [];
const NO_KEYS: readonly string[] = [];

let registeredSource: readonly ThemerExtraColorGroup[] = NO_EXTRA_COLORS;
let registeredGroups: readonly ThemerExtraColorGroup[] = NO_EXTRA_COLORS;
let registeredKeys: readonly string[] = NO_KEYS;

/**
 * Register the host's extra colours (ThemerConfig.extraColors). Idempotent
 * for the same array; a new array replaces the previous registration, and
 * none clears it.
 */
export function configureExtraColors(
  groups: readonly ThemerExtraColorGroup[] = NO_EXTRA_COLORS,
): void {
  if (groups === registeredSource) return;
  registeredSource = groups;
  registeredGroups =
    groups.length > 0 ? normalizeExtraColorGroups(groups) : NO_EXTRA_COLORS;
  registeredKeys =
    registeredGroups.length > 0
      ? registeredGroups.flatMap((group) => group.colors.map((c) => c.key))
      : NO_KEYS;
}

/**
 * The registered extra-colour groups, normalised. The identity changes only
 * when the registration does, so callers may memoise on it.
 */
export function getExtraColorGroups(): readonly ThemerExtraColorGroup[] {
  return registeredGroups;
}

/** Every registered extra-colour key, in list order (stable identity). */
export function getExtraColorKeys(): readonly string[] {
  return registeredKeys;
}
