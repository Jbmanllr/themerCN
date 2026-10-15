"use client";

// Renders nothing; ThemerProvider mounts it so a host gets the edited theme's
// Google fonts without mounting anything else. The link bookkeeping lives in
// utils/font-loader.ts, not here.

import { useEffect } from "react";
import { useEditorStore } from "../stores/editor-store";
import { usePreferencesStore } from "../stores/preferences-store";
import {
  clearThemeFonts,
  getThemeFontFamilies,
  setThemeFonts,
} from "../utils/font-loader";

/**
 * Loads the active theme's Google fonts into the Host app's document after
 * hydration and keeps them in step with the editor.
 *
 * The document's theme-font slot (utils/font-loader.ts) holds one reference
 * per family: a replaced family is released (its link goes once nothing else
 * holds it), and turning the override off or unmounting releases them all.
 * Host stacks such as `var(--font-dm-sans), sans-serif` load nothing; the
 * host already ships them.
 */
export function DynamicFontLoader() {
  // Both modes, joined into one stable string: a font change in either mode
  // re-runs the effect, an unrelated colour change does not.
  const familiesKey = useEditorStore((state) =>
    getThemeFontFamilies(
      state.themeState.styles.light,
      state.themeState.styles.dark,
    ).join("\n"),
  );
  const themeOverrideEnabled = usePreferencesStore(
    (state) => state.themeOverrideEnabled,
  );

  useEffect(() => {
    if (!themeOverrideEnabled) {
      clearThemeFonts(document);
      return;
    }
    setThemeFonts(document, familiesKey ? familiesKey.split("\n") : []);
  }, [familiesKey, themeOverrideEnabled]);

  useEffect(() => () => clearThemeFonts(document), []);

  return null;
}
