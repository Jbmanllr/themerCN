// The body of the pre-paint <head> script, as a string. Public as
// getThemerHeadScript (../head-script.ts, the `themercn/head-script` entry).
//
// Contract: the string runs raw in the browser before React and cannot see
// this module's scope, so values from here (storage keys, font lists) are
// embedded with JSON.stringify. It reads what the editor persists
// (getStorageKeys), so a change to that persisted shape changes the script,
// and it ignores an entry saved at another version than the stores persist
// (EDITOR_STATE_VERSION, PREFERENCES_VERSION), as the stores drop it.
// Its imports are constants only, so the head-script entry stays small and
// reaches no Themer code (scripts/check-entries.mjs).

import { COMMON_STYLE_KEYS } from "../types/theme"
import {
  EDITOR_STATE_VERSION,
  PREFERENCES_VERSION,
  RESTORE_STYLE_ID,
  getStorageKeys,
} from "../config/constants"
import { GENERIC_FONT_FAMILIES, LOCAL_FONT_FAMILY_NAMES } from "./font-loader"

/**
 * The script that runs before hydration so the first paint already shows the saved Theme
 * in the right mode.
 * - Mode: when an uncontrolled Themer saved its mode (`<ns>:color-mode`), it sets the `.dark`
 *   class on <html> to match. Otherwise the Host app owns the class (next-themes or its
 *   own script, which may run after this one) and the class is left alone.
 * - Theme: with nothing saved (or the Theme override off) it writes nothing and the Host's
 *   CSS shows. A stored entry saved at another version counts as nothing saved, and
 *   stored preferences of another version leave the override on. Otherwise it writes both modes of the saved Theme into one
 *   `<style id="themercn-restore">`, keyed on whether <html> has `.dark`, so the page shows
 *   the tokens of whichever mode it is in, whenever the class is set. The rules outrank the
 *   Host's `:root` and `.dark` rules; ThemerProvider removes the sheet once it applies the
 *   Theme. A saved value that could end its declaration is dropped.
 * It writes every saved variable but not the shadow override sheet or the tracking
 * variables, and preloads Google fonts for the sans, serif and mono slots only
 * (DynamicFontLoader loads the heading font after hydration).
 */
export function generateThemeScript({
  storageNamespace,
}: { storageNamespace?: string } = {}) {
  const storageKeys = getStorageKeys(storageNamespace)
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
      var colorModeStorageKey = ${JSON.stringify(storageKeys.colorMode)};
      var editorVersion = ${JSON.stringify(EDITOR_STATE_VERSION)};
      var preferencesVersion = ${JSON.stringify(PREFERENCES_VERSION)};
      var styleId = ${JSON.stringify(RESTORE_STYLE_ID)};
      var root = document.documentElement;

      var themeState = null;
      var themeOverrideEnabled = true;
      var colorMode = null;
      try {
        // An entry saved at another version is ignored: the store drops it.
        var persisted = JSON.parse(localStorage.getItem(storageKey));
        if (persisted && persisted.version === editorVersion) {
          themeState = persisted.state && persisted.state.themeState;
        }

        var persistedPreferences = JSON.parse(localStorage.getItem(preferencesStorageKey));
        if (persistedPreferences && persistedPreferences.version === preferencesVersion) {
          themeOverrideEnabled = !persistedPreferences.state || persistedPreferences.state.themeOverrideEnabled !== false;
        }

        colorMode = localStorage.getItem(colorModeStorageKey);
      } catch (e) {
        console.warn("ThemeScript: Failed to read localStorage:", e);
      }

      // Only an uncontrolled Themer saves its mode; a Host-controlled class is left alone.
      if (colorMode === "dark" || colorMode === "light") {
        root.classList.toggle("dark", colorMode === "dark");
      }

      var styles = themeState && themeState.styles;
      if (!styles || !themeOverrideEnabled) {
        return;
      }

      // Typography is shared: both modes take the light fonts.
      var light = Object.assign({}, styles.light);
      var dark = Object.assign({}, styles.dark);
      var fontKeys = ${JSON.stringify(COMMON_STYLE_KEYS.filter((key) => key.startsWith("font-")))};
      fontKeys.forEach(function(key) {
        if (light[key] !== undefined) dark[key] = light[key];
      });

      // One declaration per line; a key or value that could leave it is dropped.
      function declarations(values) {
        var css = "";
        for (var key in values) {
          if (!Object.prototype.hasOwnProperty.call(values, key)) continue;
          var value = values[key];
          if (value === undefined || value === null) continue;
          value = String(value);
          if (!/^[a-zA-Z0-9-]+$/.test(key)) continue;
          if (/[{};<>\\\\\\r\\n\\f]|\\/\\*|\\*\\//.test(value)) continue;
          css += "  --" + key + ": " + value + ";\\n";
        }
        return css;
      }

      var style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent =
        "html:root:not(.dark) {\\n" + declarations(light) + "}\\n" +
        "html:root.dark {\\n" + declarations(dark) + "}\\n";

      // Load Google Fonts immediately
      try {
        var fontSans = extractFontFamily(light["font-sans"]);
        var fontSerif = extractFontFamily(light["font-serif"]);
        var fontMono = extractFontFamily(light["font-mono"]);
        if (fontSans) loadGoogleFont(fontSans);
        if (fontSerif) loadGoogleFont(fontSerif);
        if (fontMono) loadGoogleFont(fontMono);
      } catch (e) {
        console.warn("ThemeScript: Failed to load fonts:", e);
      }
    })();
  `
}
