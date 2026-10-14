// @vitest-environment happy-dom

// The script ThemeScript puts in <head> runs before React, on whatever the
// host page already has. It must read the keys the editor really writes, do
// nothing without a saved edit (the host's own CSS stays), leave the `.dark`
// class to the host's next-themes, and ask Google only for families Google
// serves. The text is run here the way a browser runs it.
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
    JSON.stringify({ state: { themeState }, version: 1 }),
  );
}

function savePreferences(state: unknown) {
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify({ state }));
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
  it("applies the saved edit's styles for the saved mode", () => {
    saveEditor({ currentMode: "dark", styles });
    runScript();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "#eeeeee",
    );

    document.documentElement.removeAttribute("style");
    saveEditor({ currentMode: "light", styles });
    runScript();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "#111111",
    );
  });

  it("leaves the host's own CSS alone when nothing is saved", () => {
    document.documentElement.style.setProperty("--primary", "hotpink");
    runScript();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "hotpink",
    );
    expect(fontLinks()).toEqual([]);
  });

  it("leaves the host's own CSS alone when the theme override is off", () => {
    saveEditor({ currentMode: "light", styles });
    savePreferences({ themeOverrideEnabled: false });
    runScript();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "",
    );
    expect(fontLinks()).toEqual([]);
  });

  it("applies the edit when preferences say nothing about the override", () => {
    saveEditor({ currentMode: "light", styles });
    savePreferences({});
    runScript();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "#111111",
    );
  });

  it("never touches the dark class, which the host's theme switcher owns", () => {
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
    expect(document.documentElement.getAttribute("style")).toBeNull();
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
