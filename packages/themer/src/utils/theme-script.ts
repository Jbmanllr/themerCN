// The body of ThemeScript's inline <head> script, as a string. Kept out of
// components/theme-script.tsx so that file exports only its component.
//
// Contract: the string runs raw in the browser before React and cannot see
// this module's scope, so values from here (storage keys, font lists) are
// embedded with JSON.stringify. It reads what the editor persists
// (getStorageKeys), so a change to that persisted shape changes the script.
// Banter's hosts run it from ../host/head-script.tsx (a raw <script> through
// their alias-gated mount module), not from ThemeScript.
//
// See: packages/themer/docs/API.md ("ThemeScript").

import { COMMON_STYLE_KEYS } from "../types/theme";
import { getStorageKeys } from "../config/constants";
import { GENERIC_FONT_FAMILIES, LOCAL_FONT_FAMILY_NAMES } from "./font-loader";

/**
 * The script that runs before hydration to apply persisted theme variables without a flash.
 * With nothing persisted (or the theme override off) it does nothing: the host CSS already
 * shows the unedited theme. It never touches the `.dark` class, which the host's next-themes
 * owns; it picks the style set from the persisted `currentMode`, which ThemerProvider keeps
 * in step with next-themes. It writes every saved variable but not the shadow override sheet
 * or the tracking variables, and preloads Google fonts for the sans, serif and mono slots
 * only (DynamicFontLoader loads the heading font after hydration).
 */
export function generateThemeScript({
  storageNamespace,
}: { storageNamespace?: string } = {}) {
  const storageKeys = getStorageKeys(storageNamespace);
  return `
    // ----- FONT LOADING UTILITIES -----
    // The Google family a font value starts with; null for a host font
    // (var(--font-x), already loaded by the host), a generic family, or a
    // family the OS ships (Google would answer 400). Mirrors font-loader's
    // extractFontFamily and isLocalFontFamily, with the same generic and
    // local lists embedded below.
    function extractFontFamily(fontFamilyValue) {
      if (!fontFamilyValue) return null;
      var firstFont = fontFamilyValue.split(",")[0].trim();
      if (firstFont.indexOf("var(") === 0) return null;
      var cleanFont = firstFont.replace(/['"]/g, "");
      var systemFonts = ${JSON.stringify([...GENERIC_FONT_FAMILIES])};
      var localFonts = ${JSON.stringify(LOCAL_FONT_FAMILY_NAMES)};
      if (systemFonts.indexOf(cleanFont.toLowerCase()) !== -1) return null;
      if (localFonts.indexOf(cleanFont.toLowerCase()) !== -1) return null;
      return cleanFont;
    }

    function loadGoogleFont(family, weights) {
      weights = weights || ["400","500","600","700"];
      var href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(family) + ":wght@" + weights.join(";") + "&display=swap";
      if (document.querySelector('link[href="' + href + '"]')) return;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }

    // ----- THEME INITIALIZATION -----
    (function() {
      var storageKey = ${JSON.stringify(storageKeys.editor)};
      var preferencesStorageKey = ${JSON.stringify(storageKeys.preferences)};
      var root = document.documentElement;

      var themeState = null;
      var themeOverrideEnabled = true;
      try {
        var persisted = localStorage.getItem(storageKey);
        if (persisted) {
          themeState = JSON.parse(persisted)?.state?.themeState;
        }

        var persistedPreferences = localStorage.getItem(preferencesStorageKey);
        if (persistedPreferences) {
          themeOverrideEnabled = JSON.parse(persistedPreferences)?.state?.themeOverrideEnabled !== false;
        }
      } catch (e) {
        console.warn("ThemeScript: Failed to read localStorage:", e);
      }

      if (!themeState || !themeOverrideEnabled) {
        return;
      }

      var activeStyles = themeState.currentMode === "dark"
        ? themeState.styles?.dark
        : themeState.styles?.light;
      if (!activeStyles) {
        return;
      }

      // Match restored editor typography before hydration, including old saved themes.
      activeStyles = Object.assign({}, activeStyles);
      var fontKeys = ${JSON.stringify(COMMON_STYLE_KEYS.filter((key) => key.startsWith("font-")))};
      fontKeys.forEach(function(key) {
        var value = themeState.styles?.light?.[key];
        if (value !== undefined) activeStyles[key] = value;
      });

      // Apply all CSS variables
      for (var key in activeStyles) {
        if (activeStyles.hasOwnProperty(key) && activeStyles[key] !== undefined) {
          root.style.setProperty("--" + key, activeStyles[key]);
        }
      }

      // Load Google Fonts immediately
      try {
        var fontSans = extractFontFamily(activeStyles["font-sans"]);
        var fontSerif = extractFontFamily(activeStyles["font-serif"]);
        var fontMono = extractFontFamily(activeStyles["font-mono"]);
        if (fontSans) loadGoogleFont(fontSans);
        if (fontSerif) loadGoogleFont(fontSerif);
        if (fontMono) loadGoogleFont(fontMono);
      } catch (e) {
        console.warn("ThemeScript: Failed to load fonts:", e);
      }
    })();
  `;
}
