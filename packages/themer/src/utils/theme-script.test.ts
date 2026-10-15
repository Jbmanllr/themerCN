// @vitest-environment happy-dom

// The pre-paint script (getThemerHeadScript) runs before React, on whatever the
// Host app's page already has. It must read the keys the editor really writes,
// do nothing without a saved edit (the Host's own CSS stays), paint the saved
// Theme in whichever mode the page is in (a Host-controlled `.dark` class may
// be set after it runs), restore the `.dark` class only when an uncontrolled
// Themer saved one, and ask Google only for families Google serves. The text
// is run here the way a browser runs it.
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getStorageKeys } from "../config/constants";

const STORAGE_KEYS = getStorageKeys();
import { generateThemeScript } from "./theme-script";

function saveEditor(themeState: unknown) {
  localStorage.setItem(
    STORAGE_KEYS.editor,
    JSON.stringify({ state: { themeState }, version: 0 }),
  );
}

function savePreferences(state: unknown) {
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify({ state }));
}

function saveColorMode(mode: string) {
  localStorage.setItem(STORAGE_KEYS.colorMode, mode);
}

/** A variable of the page, as the cascade resolves it on <html>. */
function rootVar(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

const primary = () => rootVar("--primary");

function setDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

function runScript() {
  new Function(generateThemeScript())();
}

function fontLinks() {
  return [...document.head.querySelectorAll("link")].map((link) =>
    decodeURIComponent(link.getAttribute("href") ?? ""),
  );
}

const styles = {
  light: { primary: "#111111", "font-sans": "Inter, sans-serif" },
  dark: { primary: "#eeeeee", "font-sans": "Inter, sans-serif" },
};

beforeAll(() => {
  // The test reads the <link> the script adds; it must not fetch Google.
  const { settings } = (
    window as unknown as {
      happyDOM: {
        settings: {
          disableCSSFileLoading: boolean;
          handleDisabledFileLoadingAsSuccess: boolean;
        };
      };
    }
  ).happyDOM;
  settings.disableCSSFileLoading = true;
  settings.handleDisabledFileLoadingAsSuccess = true;
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
  document.documentElement.className = "";
  document.head.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateThemeScript", () => {
  it("paints the saved Theme in the mode the page is in, whatever mode was saved", () => {
    saveEditor({ currentMode: "dark", styles });
    runScript();
    expect(primary()).toBe("#111111");

    // A Host's theme switcher (next-themes) sets the class after this script.
    setDark(true);
    expect(primary()).toBe("#eeeeee");

    setDark(false);
    expect(primary()).toBe("#111111");
  });

  it("paints the dark tokens on a page that is already dark", () => {
    setDark(true);
    saveEditor({ currentMode: "light", styles });
    runScript();
    expect(primary()).toBe("#eeeeee");
  });

  it("restores the mode an uncontrolled Themer saved", () => {
    saveColorMode("dark");
    runScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    saveColorMode("light");
    runScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("restores the saved mode even without a saved Theme", () => {
    saveColorMode("dark");
    runScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(primary()).toBe("");
  });

  it("runs again without stacking a second restore", () => {
    saveEditor({ currentMode: "light", styles });
    runScript();
    saveEditor({
      currentMode: "light",
      styles: { light: { primary: "#222222" }, dark: {} },
    });
    runScript();
    expect(primary()).toBe("#222222");
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });

  it("leaves the host's own CSS alone when nothing is saved", () => {
    document.documentElement.style.setProperty("--primary", "hotpink");
    runScript();
    expect(primary()).toBe("hotpink");
    expect(document.head.querySelector("style")).toBeNull();
    expect(fontLinks()).toEqual([]);
  });

  it("leaves the host's own CSS alone when the theme override is off", () => {
    saveEditor({ currentMode: "light", styles });
    savePreferences({ themeOverrideEnabled: false });
    runScript();
    expect(primary()).toBe("");
    expect(fontLinks()).toEqual([]);
  });

  it("applies the edit when preferences say nothing about the override", () => {
    saveEditor({ currentMode: "light", styles });
    savePreferences({});
    runScript();
    expect(primary()).toBe("#111111");
  });

  it("leaves the dark class alone when no mode is saved (a Host-controlled mode)", () => {
    document.documentElement.classList.add("dark");
    saveEditor({ currentMode: "light", styles });
    runScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    document.documentElement.classList.remove("dark");
    saveEditor({ currentMode: "dark", styles });
    runScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("survives unreadable storage content without touching the page", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEYS.editor, "{not json");
    expect(runScript).not.toThrow();
    expect(primary()).toBe("");
    expect(document.documentElement.className).toBe("");
  });

  it("loads only the families Google serves, once each", () => {
    saveEditor({
      currentMode: "light",
      styles: {
        light: {
          "font-sans": "DM Sans, sans-serif",
          // The host's next/font families, already on the page.
          "font-serif": "var(--font-fraunces), serif",
          // OS families: Google would answer 400.
          "font-mono": "Menlo, monospace",
        },
        dark: {},
      },
    });
    runScript();
    runScript();
    expect(fontLinks()).toEqual([
      "https://fonts.googleapis.com/css2?family=DM Sans:wght@400;500;600;700&display=swap",
    ]);

    document.head.innerHTML = "";
    saveEditor({
      currentMode: "light",
      styles: {
        light: { "font-sans": "Georgia, serif", "font-mono": "ui-monospace" },
        dark: {},
      },
    });
    runScript();
    expect(fontLinks()).toEqual([]);
  });

  it("drops a saved value that would break out of its declaration", () => {
    saveEditor({
      currentMode: "light",
      styles: {
        light: { primary: "red} body{display:none", accent: "#123456" },
        dark: {},
      },
    });
    runScript();
    expect(primary()).toBe("");
    expect(rootVar("--accent")).toBe("#123456");
    expect(getComputedStyle(document.body).display).not.toBe("none");
  });

  it("skips the generic and CSS-wide values the font loader skips", () => {
    saveEditor({
      currentMode: "light",
      styles: {
        light: {
          "font-sans": "inherit",
          "font-serif": "emoji, serif",
          "font-mono": "fangsong",
        },
        dark: {},
      },
    });
    runScript();
    expect(fontLinks()).toEqual([]);
  });
});
