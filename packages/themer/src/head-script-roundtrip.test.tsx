// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }

// The round trip of a saved Theme: what the editor and preferences stores and
// the colour-mode provider save is what the head script restores on reload.
// Each test saves through the stores' public actions and the provider, as a
// Host app's page does, then runs the head script built for a namespace on a
// fresh document sharing that localStorage, as the browser does on reload,
// and checks what that page shows: its restore sheet, `.dark` class and font
// links. A store or the provider changing the shape, key or version it saves
// without the head script following fails here. Hand-built entries (malformed
// data, other versions) stay in utils/theme-script.test.ts.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it } from "vitest"

import { ColorModeProvider } from "./components/color-mode"
import {
  COLOR_MODE_RECORD,
  colorModeRecordHost,
  getStorageKeys,
  HEAD_FONT_LINK_ATTRIBUTE,
  RESTORE_STYLE_ID,
} from "./config/constants"
import { getThemerHeadScript } from "./head-script"
import { useColorMode } from "./hooks/use-color-mode"
import { useEditorStore } from "./stores/editor-store"
import { hydrateThemerStores } from "./stores/hydrate"
import { usePreferencesStore } from "./stores/preferences-store"
import type { ThemerColorMode } from "./types"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

beforeEach(() => {
  localStorage.clear()
  delete colorModeRecordHost()[COLOR_MODE_RECORD]
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  document.body.innerHTML = ""
  document.documentElement.className = ""
})

// The stores hydrate once per namespace, so each test saves under its own.
let namespaceCount = 0
const nextNamespace = (name: string) => `${name}-${++namespaceCount}`

/** Switches an uncontrolled colour mode through the provider, as the Themer's
 *  toggle does, and lets the provider save it. */
async function saveColorMode(namespace: string, mode: ThemerColorMode) {
  let setMode: ((mode: ThemerColorMode) => void) | undefined
  function Switch() {
    setMode = useColorMode().setMode
    return null
  }
  await act(async () => root?.unmount())
  const container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <ColorModeProvider storageKey={getStorageKeys(namespace).colorMode}>
        <Switch />
      </ColorModeProvider>
    )
  )
  await act(async () => setMode?.(mode))
}

interface SavedTheme {
  namespace: string
  primary: { light: string; dark: string }
  mode: ThemerColorMode
  themeOverrideEnabled?: boolean
}

/** Saves a Theme the way a Host app's page does: through the stores' public
 *  actions and the colour-mode provider. */
async function saveTheme({
  namespace,
  primary,
  mode,
  themeOverrideEnabled = true,
}: SavedTheme) {
  hydrateThemerStores(namespace, "light")
  usePreferencesStore.getState().setThemeOverrideEnabled(themeOverrideEnabled)
  useEditorStore.getState().importThemeStyles({
    light: {
      primary: primary.light,
      background: "oklch(1 0 0)",
      "font-sans": "Inter, sans-serif",
      "font-heading": "Playfair Display, serif",
      "font-serif": "Lora, serif",
      "font-mono": "JetBrains Mono, monospace",
      "shadow-color": "hsl(240 10% 20%)",
      "shadow-blur": "12px",
    },
    dark: {
      primary: primary.dark,
      background: "oklch(0.15 0 0)",
      "shadow-color": "hsl(240 10% 2%)",
    },
  })
  await saveColorMode(namespace, mode)
}

/** Reloads: runs the head script built for `namespace` on a fresh document
 *  that shares this page's localStorage, and returns that document. */
function reload(namespace: string): Document {
  const fresh = document.implementation.createHTMLDocument("")
  new Function(
    "document",
    "window",
    getThemerHeadScript({ storageNamespace: namespace })
  )(fresh, {})
  return fresh
}

/** The custom properties the restore sheet's rule for `selector` declares. */
function restoredTokens(page: Document, selector: string) {
  const css = page.getElementById(RESTORE_STYLE_ID)?.textContent ?? ""
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return {}
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start))
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+): ([^;]*);/g)].map(([, key, value]) => [
      key,
      value,
    ])
  )
}

const LIGHT_RULE = "html:root:not(.dark)"
const DARK_RULE = "html:root.dark"

const linkedFamilies = (page: Document) =>
  [...page.head.querySelectorAll(`link[${HEAD_FONT_LINK_ATTRIBUTE}]`)].map(
    (link) => link.getAttribute(HEAD_FONT_LINK_ATTRIBUTE)
  )

it("restores the saved Theme's tokens for both modes", async () => {
  const namespace = nextNamespace("shop")
  await saveTheme({
    namespace,
    primary: { light: "#123456", dark: "#abcdef" },
    mode: "light",
  })

  const page = reload(namespace)

  expect(restoredTokens(page, LIGHT_RULE)).toMatchObject({
    primary: "#123456",
    background: "oklch(1 0 0)",
    "font-sans": "Inter, sans-serif",
    "shadow-color": "hsl(240 10% 20%)",
    "shadow-blur": "12px",
  })
  expect(restoredTokens(page, DARK_RULE)).toMatchObject({
    primary: "#abcdef",
    background: "oklch(0.15 0 0)",
    "font-sans": "Inter, sans-serif",
    "shadow-color": "hsl(240 10% 2%)",
    "shadow-blur": "12px",
  })
  expect(page.documentElement.classList.contains("dark")).toBe(false)
})

it("restores a Theme saved in dark mode with the .dark class before first paint", async () => {
  const namespace = nextNamespace("dark")
  await saveTheme({
    namespace,
    primary: { light: "#123456", dark: "#abcdef" },
    mode: "dark",
  })

  const page = reload(namespace)

  expect(page.documentElement.classList.contains("dark")).toBe(true)
})

it("links each of the saved Theme's Google font families once, the heading font included", async () => {
  const namespace = nextNamespace("fonts")
  await saveTheme({
    namespace,
    primary: { light: "#123456", dark: "#abcdef" },
    mode: "light",
  })

  const page = reload(namespace)

  expect(linkedFamilies(page).sort()).toEqual([
    "Inter",
    "JetBrains Mono",
    "Lora",
    "Playfair Display",
  ])
})

it("restores nothing for a Theme saved with the theme override off", async () => {
  const namespace = nextNamespace("off")
  await saveTheme({
    namespace,
    primary: { light: "#123456", dark: "#abcdef" },
    mode: "light",
    themeOverrideEnabled: false,
  })

  const page = reload(namespace)

  expect(page.getElementById(RESTORE_STYLE_ID)).toBeNull()
  expect(linkedFamilies(page)).toEqual([])
})

it("keeps a second storage namespace's Theme and colour mode separate", async () => {
  const first = nextNamespace("first")
  const second = nextNamespace("second")
  await saveTheme({
    namespace: first,
    primary: { light: "#111111", dark: "#222222" },
    mode: "dark",
  })
  await saveTheme({
    namespace: second,
    primary: { light: "#333333", dark: "#444444" },
    mode: "light",
  })

  const firstPage = reload(first)
  const secondPage = reload(second)

  expect(restoredTokens(firstPage, LIGHT_RULE).primary).toBe("#111111")
  expect(restoredTokens(firstPage, DARK_RULE).primary).toBe("#222222")
  expect(firstPage.documentElement.classList.contains("dark")).toBe(true)
  expect(restoredTokens(secondPage, LIGHT_RULE).primary).toBe("#333333")
  expect(restoredTokens(secondPage, DARK_RULE).primary).toBe("#444444")
  expect(secondPage.documentElement.classList.contains("dark")).toBe(false)
})
