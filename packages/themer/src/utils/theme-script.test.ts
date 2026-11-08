// @vitest-environment happy-dom

// The pre-paint script (getThemerHeadScript) runs before React, on whatever the
// Host app's page already has. It must read the keys the editor really writes,
// do nothing without a saved edit (the Host's own CSS stays), paint the saved
// Theme in whichever mode the page is in (a Host-controlled `.dark` class may
// be set after it runs), restore the `.dark` class only when an uncontrolled
// Themer saved one, and ask Google only for families Google serves. The text
// is run here the way a browser runs it. Valid saved entries are written by
// the editor and preferences stores and the colour-mode provider
// (saved-entries.test-helper.tsx). Entries are built by hand only for
// unreadable content, preferences without the override, and hostile keys and
// values that the head script must drop itself (the editor store's import
// action does not filter them).
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  DEFAULT_STORAGE_NAMESPACE,
  EDITOR_STATE_VERSION,
  HEAD_FONT_LINK_ATTRIBUTE,
  PREFERENCES_VERSION,
  getStorageKeys,
} from "../config/constants"
import {
  saveColorMode as saveColorModeOf,
  saveThemeOverride,
  saveThemeStyles,
} from "../saved-entries.test-helper"
import { useEditorStore } from "../stores/editor-store"
import type { ImportedThemeStyles } from "../types/editor"
import type { ThemeFontKey, ThemeMode } from "../types/theme"

const STORAGE_KEYS = getStorageKeys()
import {
  acquireGoogleFont,
  clearThemeFonts,
  buildFontCssUrl,
  setThemeFonts,
} from "./font-links"
import { getThemeFonts } from "./font-names"
import { generateThemeScript } from "./theme-script"

/** Saves `styles` as the Theme, with `mode` as the editor's mode, through
 *  the editor store. */
function saveTheme(styles: ImportedThemeStyles, mode: ThemeMode = "light") {
  saveThemeStyles(DEFAULT_STORAGE_NAMESPACE, styles, mode)
}

/** Saves an uncontrolled colour mode through the colour-mode provider. */
const saveColorMode = (mode: ThemeMode) =>
  saveColorModeOf(DEFAULT_STORAGE_NAMESPACE, mode)

/** Writes an editor entry by hand, to inject hostile data the head script
 *  must drop. */
function saveEditorByHand(themeState: unknown) {
  localStorage.setItem(
    STORAGE_KEYS.editor,
    JSON.stringify({ state: { themeState }, version: EDITOR_STATE_VERSION })
  )
}

/** A variable of the page, as the cascade resolves it on <html>. */
function rootVar(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

const primary = () => rootVar("--primary")

function setDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark)
}

function runScript() {
  new Function(generateThemeScript())()
}

function fontLinks() {
  return [...document.head.querySelectorAll("link")].map((link) =>
    decodeURIComponent(link.getAttribute("href") ?? "")
  )
}

const styles = {
  light: { primary: "#111111", "font-sans": "Inter, sans-serif" },
  dark: { primary: "#eeeeee", "font-sans": "Inter, sans-serif" },
}

beforeAll(() => {
  // The test reads the <link> the script adds; it must not fetch Google.
  const { settings } = (
    window as unknown as {
      happyDOM: {
        settings: {
          disableCSSFileLoading: boolean
          handleDisabledFileLoadingAsSuccess: boolean
        }
      }
    }
  ).happyDOM
  settings.disableCSSFileLoading = true
  settings.handleDisabledFileLoadingAsSuccess = true
})

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("style")
  document.documentElement.className = ""
  document.head.innerHTML = ""
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("generateThemeScript", () => {
  it("paints the saved Theme in the mode the page is in, whatever mode was saved", () => {
    saveTheme(styles, "dark")
    runScript()
    expect(primary()).toBe("#111111")

    // A Host's theme switcher (next-themes) sets the class after this script.
    setDark(true)
    expect(primary()).toBe("#eeeeee")

    setDark(false)
    expect(primary()).toBe("#111111")
  })

  it("paints the dark tokens on a page that is already dark", () => {
    setDark(true)
    saveTheme(styles)
    runScript()
    expect(primary()).toBe("#eeeeee")
  })

  it("restores the mode an uncontrolled Themer saved", async () => {
    await saveColorMode("dark")
    runScript()
    expect(document.documentElement.classList.contains("dark")).toBe(true)

    await saveColorMode("light")
    runScript()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("restores the saved mode even without a saved Theme", async () => {
    await saveColorMode("dark")
    runScript()
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(primary()).toBe("")
  })

  it("runs again without stacking a second restore", () => {
    saveTheme(styles)
    runScript()
    saveTheme({ light: { primary: "#222222" }, dark: {} })
    runScript()
    expect(primary()).toBe("#222222")
    expect(document.head.querySelectorAll("style")).toHaveLength(1)
  })

  it("leaves the host's own CSS alone when nothing is saved", () => {
    document.documentElement.style.setProperty("--primary", "hotpink")
    runScript()
    expect(primary()).toBe("hotpink")
    expect(document.head.querySelector("style")).toBeNull()
    expect(fontLinks()).toEqual([])
  })

  it("leaves the host's own CSS alone when the theme override is off", () => {
    saveTheme(styles)
    saveThemeOverride(DEFAULT_STORAGE_NAMESPACE, false)
    runScript()
    expect(primary()).toBe("")
    expect(fontLinks()).toEqual([])
  })

  it("applies the edit when preferences say nothing about the override", () => {
    saveTheme(styles)
    // Hand-built: the preferences store always saves the override.
    localStorage.setItem(
      STORAGE_KEYS.preferences,
      JSON.stringify({ state: {}, version: PREFERENCES_VERSION })
    )
    runScript()
    expect(primary()).toBe("#111111")
  })

  it("leaves the dark class alone when no mode is saved (a Host-controlled mode)", () => {
    document.documentElement.classList.add("dark")
    saveTheme(styles)
    runScript()
    expect(document.documentElement.classList.contains("dark")).toBe(true)

    document.documentElement.classList.remove("dark")
    saveTheme(styles, "dark")
    runScript()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("survives unreadable storage content without touching the page", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    // Hand-built: no store writes unreadable content.
    localStorage.setItem(STORAGE_KEYS.editor, "{not json")
    expect(runScript).not.toThrow()
    expect(primary()).toBe("")
    expect(document.documentElement.className).toBe("")
  })

  it("switches a font link to the family's default weight once, on error", () => {
    saveTheme(styles)
    runScript()
    const [link] = document.head.querySelectorAll("link")
    link?.dispatchEvent(new Event("error"))
    expect(link?.getAttribute("href")).toBe(
      "https://fonts.googleapis.com/css2?family=Inter&display=swap"
    )
    link?.setAttribute("href", "kept")
    link?.dispatchEvent(new Event("error"))
    expect(link?.getAttribute("href")).toBe("kept")
    link?.setAttribute(
      "href",
      "https://fonts.googleapis.com/css2?family=Inter&display=swap"
    )

    // The registry recognises the fallback href too.
    const release = acquireGoogleFont("Inter", { doc: document })
    expect(document.head.querySelectorAll("link")).toHaveLength(1)
    release()
  })

  it("drops a saved value that would break out of its declaration", () => {
    // Hand-built to inject a hostile value the head script must drop: the
    // editor store's import (fed by the CSS import dialog) can save one.
    saveEditorByHand({
      currentMode: "light",
      styles: {
        light: { primary: "red} body{display:none", accent: "#123456" },
        dark: {},
      },
    })
    runScript()
    expect(primary()).toBe("")
    expect(rootVar("--accent")).toBe("#123456")
    expect(getComputedStyle(document.body).display).not.toBe("none")
  })

  it("drops each unsafe key and value in both modes, keeping the rest", () => {
    // Hand-built to inject hostile keys and values the head script must
    // drop: the editor store's import action checks neither, and the CSS
    // import dialog can feed it such a value.
    saveEditorByHand({
      currentMode: "light",
      styles: {
        light: {
          primary: "red} body{display:none",
          secondary: "blue/* x */",
          accent: "#123456",
          "bad key": "#000000",
          muted: "#222222",
        },
        dark: { primary: "#eeeeee", border: "x;y", ring: "#333333" },
      },
    })
    runScript()
    expect([primary(), rootVar("--secondary"), rootVar("--accent")]).toEqual([
      "",
      "",
      "#123456",
    ])
    expect(rootVar("--muted")).toBe("#222222")

    setDark(true)
    expect([primary(), rootVar("--border"), rootVar("--ring")]).toEqual([
      "#eeeeee",
      "",
      "#333333",
    ])
  })
})

// The head script keeps its own ES5 family extractor (it cannot import Themer
// code), so each row runs the real script on a saved Theme and the Theme fonts
// module over the same font values: both must name the row's families, and
// the script must link the URLs the font link registry builds, which the
// registry then adopts (one link per family). Each row saves its fonts in
// light through the editor store, which keeps the dark fonts equal to them
// and fills the unset slots with the default Preset's system families.
type FontRow = {
  name: string
  fonts: Partial<Record<ThemeFontKey, string>>
  families: string[]
}

const FONT_ROWS: FontRow[] = [
  {
    name: "links the URL the font link registry builds",
    fonts: { "font-sans": "Inter, sans-serif" },
    families: ["Inter"],
  },
  {
    name: "a quoted name",
    fonts: { "font-sans": '"DM Sans", sans-serif' },
    families: ["DM Sans"],
  },
  {
    name: "a quoted name with inner spaces, trimmed after removing its quotes",
    fonts: {
      "font-sans": '" Inter ", sans-serif',
      "font-mono": "' Fira Code'",
    },
    families: ["Inter", "Fira Code"],
  },
  {
    name: "system families",
    fonts: {
      "font-sans": "ui-sans-serif, system-ui",
      "font-serif": "Georgia, serif",
      "font-mono": "Menlo, monospace",
      "font-heading": "inherit",
    },
    families: [],
  },
  {
    name: "upper-case generic keywords",
    fonts: {
      "font-sans": "SYSTEM-UI, sans-serif",
      "font-serif": "Serif",
      "font-mono": "MONOSPACE",
      "font-heading": "Sans-Serif",
    },
    families: [],
  },
  {
    name: "a var(...) stack",
    fonts: { "font-sans": "var(--font-dm-sans), sans-serif" },
    families: [],
  },
  {
    name: "empty values",
    fonts: { "font-sans": "", "font-heading": "", "font-mono": '""' },
    families: [],
  },
  {
    name: "mixed stacks",
    fonts: {
      "font-sans": "DM Sans, sans-serif",
      "font-serif": "var(--font-fraunces), serif",
      "font-mono": "fangsong",
      "font-heading": "emoji, serif",
    },
    families: ["DM Sans"],
  },
  {
    name: "the heading font set",
    fonts: {
      "font-sans": "Inter, sans-serif",
      "font-heading": "Playfair Display, serif",
      "font-serif": "Lora, serif",
      "font-mono": "Fira Code, monospace",
    },
    families: ["Inter", "Playfair Display", "Lora", "Fira Code"],
  },
  {
    name: "the heading font unset",
    fonts: { "font-sans": "Inter, sans-serif", "font-serif": "Lora, serif" },
    families: ["Inter", "Lora"],
  },
  {
    name: "the heading font naming the sans family, linked once",
    fonts: { "font-sans": "Inter, sans-serif", "font-heading": "Inter" },
    families: ["Inter"],
  },
]

describe("head script font links match the Theme fonts module", () => {
  afterEach(() => {
    clearThemeFonts(document)
  })

  it.each(FONT_ROWS)("$name", ({ fonts, families }) => {
    saveTheme({ light: fonts })
    runScript()
    runScript()

    const links = [...document.head.querySelectorAll("link")]
    const linked = links.map((link) => ({
      family: link.getAttribute(HEAD_FONT_LINK_ATTRIBUTE),
      href: link.getAttribute("href"),
    }))
    const themeFonts = getThemeFonts(
      useEditorStore.getState().themeState.styles
    ).families
    expect(themeFonts).toEqual(families)
    expect(linked).toEqual(
      themeFonts.map((family) => ({ family, href: buildFontCssUrl(family) }))
    )

    // The Themer loads: the registry adopts every head-script link.
    setThemeFonts(document, themeFonts)
    const adopted = [...document.head.querySelectorAll("link")]
    expect(adopted).toHaveLength(links.length)
    adopted.forEach((link, index) => expect(link).toBe(links[index]))
  })
})
