// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
// The public <Themer> as a Host app mounts it: one component beside the
// Host's tree, configured by flat props.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { defaultThemeState } from "./config/defaults"
import { useEditorStore } from "./stores/editor-store"
import { useThemerUIStore } from "./stores/themer-ui-store"
import {
  PREFERENCES_VERSION,
  usePreferencesStore,
} from "./stores/preferences-store"
import { THEMER_CSS } from "./generated/themer-css"
import { Themer, type ThemerProps } from "./index"

// happy-dom applies injected sheets to getComputedStyle but resolves custom
// properties without cycle detection, and overflows on the real sheet's
// `[--radius:var(--radius-xl)]` (fine in browsers, where `--radius-xl` is
// computed on the scope root). The real sheet is covered by
// styles/themer-css.test.ts; here a stand-in proves what gets injected.
vi.mock("./generated/themer-css", () => ({
  THEMER_CSS:
    "@scope ([data-themer]) to ([data-themer-host]) { .stand-in { color: red } }",
}))

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLElement

async function mount(props: ThemerProps = {}) {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<Themer {...props} />))
}

function trigger() {
  return document.querySelector('[data-testid="themer-trigger"]')
}

function rootVar(name: string) {
  return document.documentElement.style.getPropertyValue(name)
}

const LIGHT_PRIMARY = defaultThemeState.styles.light.primary
const DARK_PRIMARY = defaultThemeState.styles.dark.primary

// Opens the desktop Themer UI (the mobile drawer has no mode toggle).
async function openThemer() {
  ;(
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void }
    }
  ).happyDOM.setViewport({ width: 1440, height: 900 })
  await act(async () => (trigger() as HTMLElement).click())
}

async function clickModeToggle() {
  const toggle = document.querySelector<HTMLElement>(
    '[aria-label="Switch to dark mode"], [aria-label="Switch to light mode"]'
  )
  if (!toggle) throw new Error("mode toggle not rendered")
  await act(async () => toggle.click())
}

// The stores are module singletons: start every test from a fresh Themer.
beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true)
  useThemerUIStore.setState(useThemerUIStore.getInitialState(), true)
  localStorage.clear()
  document.documentElement.className = ""
  document.documentElement.removeAttribute("style")
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

describe("Themer", () => {
  it("mounts its trigger beside the Host tree", async () => {
    await mount()

    expect(trigger()).not.toBeNull()
  })

  it("renders nothing inside an iframe", async () => {
    vi.spyOn(window, "top", "get").mockReturnValue({} as Window)

    await mount()

    expect(trigger()).toBeNull()
    expect(container.innerHTML).toBe("")
  })

  describe("storage", () => {
    function persistedPreset(key: string) {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw).state.themeState.preset : null
    }

    function seedEditor(key: string, primary: string) {
      const themeState = {
        ...defaultThemeState,
        styles: {
          ...defaultThemeState.styles,
          light: { ...defaultThemeState.styles.light, primary },
        },
      }
      localStorage.setItem(
        key,
        JSON.stringify({
          state: {
            themeState,
            themeCheckpoint: themeState,
            presetBaseline: null,
          },
          version: 0,
        })
      )
    }

    it("saves the Theme under themercn:editor by default", async () => {
      await mount({ defaultPreset: "violet-bloom" })

      expect(persistedPreset("themercn:editor")).toBe("violet-bloom")
    })

    it("saves the Theme under <storageNamespace>:editor", async () => {
      await mount({ defaultPreset: "violet-bloom", storageNamespace: "acme" })

      expect(persistedPreset("acme:editor")).toBe("violet-bloom")
      expect(localStorage.getItem("themercn:editor")).toBeNull()
    })

    it("restores the Theme saved under its namespace", async () => {
      seedEditor("themercn:editor", "rgb(1, 1, 1)")
      seedEditor("restore:editor", "rgb(2, 2, 2)")

      await mount({ storageNamespace: "restore" })

      expect(rootVar("--primary")).toBe("rgb(2, 2, 2)")
    })

    it("reads preferences from <storageNamespace>:preferences", async () => {
      seedEditor("prefs:editor", "rgb(3, 3, 3)")
      localStorage.setItem(
        "prefs:preferences",
        JSON.stringify({
          state: { themeOverrideEnabled: false },
          version: PREFERENCES_VERSION,
        })
      )

      await mount({ storageNamespace: "prefs" })

      expect(rootVar("--primary")).toBe("")
    })

    function addHeadScriptRestore() {
      const style = document.createElement("style")
      style.id = "themercn-restore"
      document.head.append(style)
    }

    it("takes over from the head script's restore once it applies the Theme", async () => {
      addHeadScriptRestore()

      await mount()

      expect(rootVar("--primary")).toBe(LIGHT_PRIMARY)
      expect(document.getElementById("themercn-restore")).toBeNull()
    })

    it("drops the head script's restore when the Theme override is off", async () => {
      addHeadScriptRestore()
      localStorage.setItem(
        "themercn:preferences",
        JSON.stringify({
          state: { themeOverrideEnabled: false },
          version: PREFERENCES_VERSION,
        })
      )

      await mount()

      expect(document.getElementById("themercn-restore")).toBeNull()
    })
  })

  describe("colour mode, uncontrolled", () => {
    it("toggles .dark on <html> when the user switches mode", async () => {
      await mount()
      await openThemer()

      await clickModeToggle()

      expect(document.documentElement.classList.contains("dark")).toBe(true)
      expect(rootVar("--primary")).toBe(DARK_PRIMARY)
    })

    it("saves the mode for the head script to restore on reload", async () => {
      await mount({ storageNamespace: "acme" })
      await openThemer()

      await clickModeToggle()
      expect(localStorage.getItem("acme:color-mode")).toBe("dark")

      await clickModeToggle()
      expect(localStorage.getItem("acme:color-mode")).toBe("light")
    })

    it("follows a .dark toggle made outside the Themer", async () => {
      await mount()
      expect(rootVar("--primary")).toBe(LIGHT_PRIMARY)

      await act(async () => document.documentElement.classList.add("dark"))

      expect(rootVar("--primary")).toBe(DARK_PRIMARY)
    })
  })

  describe("colour mode, controlled", () => {
    it("saves no mode, so the head script leaves the Host's class alone", async () => {
      localStorage.setItem("themercn:color-mode", "dark")

      await mount({ colorMode: "light", onColorModeChange: () => {} })

      expect(localStorage.getItem("themercn:color-mode")).toBeNull()
    })

    it("applies the mode the Host passes, whatever the class says", async () => {
      await mount({ colorMode: "dark", onColorModeChange: () => {} })

      expect(rootVar("--primary")).toBe(DARK_PRIMARY)
      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("asks the Host to switch instead of touching the class", async () => {
      const onColorModeChange = vi.fn()
      await mount({ colorMode: "light", onColorModeChange })
      await openThemer()

      await clickModeToggle()

      expect(onColorModeChange).toHaveBeenCalledExactlyOnceWith("dark")
      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("follows the Host's new mode", async () => {
      const onColorModeChange = vi.fn()
      await mount({ colorMode: "light", onColorModeChange })

      await act(async () =>
        root?.render(
          <Themer colorMode="dark" onColorModeChange={onColorModeChange} />
        )
      )

      expect(rootVar("--primary")).toBe(DARK_PRIMARY)
    })
  })

  describe("props", () => {
    it("lets a Host Preset with id default replace the built-in default", async () => {
      await mount({
        presets: [
          {
            id: "default",
            label: "Brand",
            styles: {
              light: {
                ...defaultThemeState.styles.light,
                primary: "rgb(9, 9, 9)",
              },
              dark: defaultThemeState.styles.dark,
            },
          },
        ],
      })

      expect(rootVar("--primary")).toBe("rgb(9, 9, 9)")
    })

    it("hides the trigger when showTrigger is false", async () => {
      await mount({ showTrigger: false })

      expect(trigger()).toBeNull()
    })

    it("opens on the Host's shortcut, in the Host's z-index layer", async () => {
      await mount({ shortcut: "ctrl+shift+k", zIndex: 42 })
      ;(
        window as unknown as {
          happyDOM: {
            setViewport(size: { width: number; height: number }): void
          }
        }
      ).happyDOM.setViewport({ width: 1440, height: 900 })

      await act(async () =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            ctrlKey: true,
            shiftKey: true,
          })
        )
      )

      const themerUI = document.querySelector<HTMLElement>(
        '[data-testid="themer-ui"]'
      )
      expect(themerUI?.style.zIndex).toBe("42")
    })
  })

  describe("toggle shortcut", () => {
    function themerUI() {
      return document.querySelector('[data-testid="themer-ui"]')
    }

    async function press(init: KeyboardEventInit) {
      await act(async () =>
        window.dispatchEvent(new KeyboardEvent("keydown", init))
      )
    }

    beforeEach(() => {
      ;(
        window as unknown as {
          happyDOM: {
            setViewport(size: { width: number; height: number }): void
          }
        }
      ).happyDOM.setViewport({ width: 1440, height: 900 })
    })

    it("reads cmd as Meta, so a bare k leaves the Themer closed", async () => {
      await mount({ shortcut: "cmd+k" })

      await press({ key: "k" })
      expect(themerUI()).toBeNull()

      await press({ key: "k", metaKey: true })
      expect(themerUI()).not.toBeNull()
    })

    it("warns once about an invalid shortcut and keeps the default toggle", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      await mount({ shortcut: "hyper+k" })

      await press({ key: "k" })
      expect(themerUI()).toBeNull()

      await press({ key: "e", ctrlKey: true, shiftKey: true })
      expect(themerUI()).not.toBeNull()
      const shortcutWarnings = warn.mock.calls.filter((args) =>
        String(args[0]).includes("hyper+k")
      )
      expect(shortcutWarnings).toHaveLength(1)
    })
  })

  describe("CSS isolation", () => {
    function themerStyles() {
      return document.head.querySelectorAll("style[data-themer-style]")
    }

    it("injects its scoped CSS while mounted, and removes it after", async () => {
      await mount()

      expect(themerStyles()).toHaveLength(1)
      expect(themerStyles()[0]?.textContent).toBe(THEMER_CSS)

      await act(async () => root?.unmount())
      root = null

      expect(themerStyles()).toHaveLength(0)
    })

    it("renders its UI under an unstyled [data-themer] root", async () => {
      await mount()
      const triggerRoot = trigger()?.closest("[data-themer]")
      await openThemer()

      const scopeRoot = document
        .querySelector('[data-testid="themer-ui"]')
        ?.closest("[data-themer]")
      expect(scopeRoot).toBeInstanceOf(HTMLElement)
      expect(triggerRoot).toBe(scopeRoot)
      expect(scopeRoot?.getAttribute("class")).toBeNull()
      expect(scopeRoot?.getAttribute("style")).toBeNull()
    })

    it("mounts its popups inside its root, above the Themer UI", async () => {
      await mount({ zIndex: 42 })
      await openThemer()

      await act(async () =>
        document
          .querySelector<HTMLElement>('[data-testid="themer-preset-trigger"]')
          ?.click()
      )

      const popup = document.querySelector('[data-slot="popover-content"]')
      const portals = popup?.closest<HTMLElement>("[data-themer-portals]")
      expect(portals?.closest("[data-themer]")).not.toBeNull()
      expect(Number(portals?.style.zIndex)).toBeGreaterThan(42)
    })

    it("leaves Host preview tabs outside its scope", async () => {
      await mount({ previewTabs: HOST_TABS })
      await openThemer()

      const hostTab = [
        ...document.querySelectorAll<HTMLElement>('[role="tab"]'),
      ].find((tab) => tab.textContent === "Host tab")
      await act(async () => hostTab?.click())

      const content = document.querySelector('[data-testid="host-tab-content"]')
      expect(content?.closest("[data-themer-host]")).not.toBeNull()
    })
  })
})

const HOST_TABS = [
  {
    id: "host-tab",
    label: "Host tab",
    component: () => <p data-testid="host-tab-content">Host content</p>,
  },
]
