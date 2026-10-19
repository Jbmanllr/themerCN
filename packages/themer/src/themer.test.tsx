// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
// The public <Themer> as a Host app mounts it: one component beside the
// Host's tree, configured by flat props.
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EDITOR_STATE_VERSION, PREFERENCES_VERSION } from "./config/constants"
import { defaultThemeState } from "./config/defaults"
import type { ThemeStyles } from "./types"
import { useEditorStore } from "./stores/editor-store"
import { useThemerUIStore } from "./stores/themer-ui-store"
import { usePreferencesStore } from "./stores/preferences-store"
import { THEMER_CSS } from "./generated/themer-css"
import { getThemerHeadScript } from "./head-script"
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

// Stands in for localStorage, recording each write's key; `write` runs
// before the real write (and can throw instead). A spy on the localStorage
// instance itself would be stored as an item.
function stubLocalStorage(write: (key: string) => void = () => {}) {
  const real = localStorage
  const writes: string[] = []
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => real.getItem(key),
    setItem: (key: string, value: string) => {
      writes.push(key)
      write(key)
      real.setItem(key, value)
    },
    removeItem: (key: string) => real.removeItem(key),
  })
  return writes
}

// The stores are module singletons: start every test from a fresh Themer.
beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  usePreferencesStore.setState(usePreferencesStore.getInitialState(), true)
  useThemerUIStore.setState(useThemerUIStore.getInitialState(), true)
  localStorage.clear()
  document.getElementById("themercn-restore")?.remove()
  document.documentElement.className = ""
  document.documentElement.removeAttribute("style")
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  document.body.innerHTML = ""
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
          version: EDITOR_STATE_VERSION,
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

    describe("switching storageNamespace", () => {
      // Their own namespaces: <Themer> hydrates once per namespace.
      async function rerender(props: ThemerProps) {
        await act(async () => root?.render(<Themer {...props} />))
      }

      // Mounts on `from`'s Host default Preset, then edits the Theme so the
      // undo history is not empty before the switch.
      async function mountWithHistory(from: string) {
        await mount({ defaultPreset: "violet-bloom", storageNamespace: from })
        const violetPrimary = rootVar("--primary")
        await act(async () =>
          useEditorStore.getState().applyThemePreset("default")
        )
        expect(useEditorStore.getState().canUndo()).toBe(true)
        return violetPrimary
      }

      it("shows a populated namespace's Theme and leaves its entry as stored", async () => {
        seedEditor("switch-populated-b:editor", "rgb(6, 6, 6)")
        const stored = localStorage.getItem("switch-populated-b:editor")
        await mountWithHistory("switch-populated-a")

        await rerender({
          defaultPreset: "violet-bloom",
          storageNamespace: "switch-populated-b",
        })

        expect(rootVar("--primary")).toBe("rgb(6, 6, 6)")
        expect(localStorage.getItem("switch-populated-b:editor")).toBe(stored)
        expect(useEditorStore.getState().canUndo()).toBe(false)
      })

      it("starts an empty namespace on the Host's default Preset with no history, and leaves the previous key alone", async () => {
        const violetPrimary = await mountWithHistory("switch-empty-a")
        const previous = localStorage.getItem("switch-empty-a:editor")

        await rerender({
          defaultPreset: "violet-bloom",
          storageNamespace: "switch-empty-b",
        })

        expect(rootVar("--primary")).toBe(violetPrimary)
        expect(persistedPreset("switch-empty-b:editor")).toBe("violet-bloom")
        expect(useEditorStore.getState().canUndo()).toBe(false)
        expect(localStorage.getItem("switch-empty-a:editor")).toBe(previous)
      })
    })

    describe("an entry saved at another version", () => {
      const STALE_EDITOR_VERSION = EDITOR_STATE_VERSION - 1
      const STALE_PREFERENCES_VERSION = PREFERENCES_VERSION - 1
      // Its own namespace: <Themer> hydrates once per namespace.
      const namespace = "stale"

      function seedStaleEditor() {
        seedEditor(`${namespace}:editor`, "rgb(4, 4, 4)")
        const editor = JSON.parse(localStorage.getItem(`${namespace}:editor`)!)
        localStorage.setItem(
          `${namespace}:editor`,
          JSON.stringify({ ...editor, version: STALE_EDITOR_VERSION })
        )
      }

      function seedStalePreferences() {
        localStorage.setItem(
          `${namespace}:preferences`,
          JSON.stringify({
            state: { themeOverrideEnabled: false },
            version: STALE_PREFERENCES_VERSION,
          })
        )
      }

      function storedVersion(key: string) {
        return JSON.parse(localStorage.getItem(key)!).version
      }

      it("is ignored by the head script, which writes no theme style", () => {
        seedStaleEditor()

        new Function(getThemerHeadScript({ storageNamespace: namespace }))()

        expect(document.getElementById("themercn-restore")).toBeNull()
      })

      it("lets the head script restore a current Theme despite stale preferences", () => {
        seedEditor(`${namespace}:editor`, "rgb(5, 5, 5)")
        seedStalePreferences()

        new Function(getThemerHeadScript({ storageNamespace: namespace }))()

        expect(
          document.getElementById("themercn-restore")?.textContent
        ).toContain("--primary: rgb(5, 5, 5);")
      })

      it("is dropped on mount without an error, and rewritten at the current version", async () => {
        seedStaleEditor()
        seedStalePreferences()
        const error = vi.spyOn(console, "error")

        await mount({ storageNamespace: namespace })

        expect(error).not.toHaveBeenCalled()
        expect(rootVar("--primary")).toBe(LIGHT_PRIMARY)
        expect(storedVersion(`${namespace}:editor`)).toBe(EDITOR_STATE_VERSION)
        expect(storedVersion(`${namespace}:preferences`)).toBe(
          PREFERENCES_VERSION
        )
      })
    })

    describe("writes", () => {
      it("leave editing working when storage throws on write, with one warning", async () => {
        const writes = stubLocalStorage(() => {
          throw new DOMException("full", "QuotaExceededError")
        })
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        await mount({ storageNamespace: "full" })

        await act(async () =>
          useEditorStore.getState().updateCommonStyle("radius", "1.25rem")
        )
        await act(async () =>
          useEditorStore.getState().updateCommonStyle("radius", "0.25rem")
        )

        expect(writes).toContain("full:editor")
        expect(useEditorStore.getState().themeState.styles.light.radius).toBe(
          "0.25rem"
        )
        expect(rootVar("--radius")).toBe("0.25rem")
        expect(warn).toHaveBeenCalledTimes(1)
      })

      it("skip a change that leaves the persisted slice as it was", async () => {
        await mount({ storageNamespace: "history-only" })
        await act(async () =>
          useEditorStore.getState().applyThemePreset("violet-bloom")
        )
        const writes = stubLocalStorage()

        // Clears the undo history only: the Theme, its checkpoint and its
        // baseline are untouched.
        await act(async () => useEditorStore.setState({ history: [] }))

        expect(useEditorStore.getState().canUndo()).toBe(false)
        expect(writes).toEqual([])

        // A Theme change still writes.
        await act(async () =>
          useEditorStore.getState().updateCommonStyle("radius", "1.25rem")
        )
        expect(writes).toEqual(["history-only:editor"])
      })

      it("store the checkpoint and baseline only when they differ from the Theme", async () => {
        await mount({ storageNamespace: "slice" })
        await act(async () =>
          useEditorStore.getState().applyThemePreset("violet-bloom")
        )
        const onPreset = JSON.parse(localStorage.getItem("slice:editor")!).state

        expect(Object.keys(onPreset)).toEqual(["themeState"])

        await act(async () =>
          useEditorStore.getState().updateCommonStyle("radius", "1.25rem")
        )
        const edited = JSON.parse(localStorage.getItem("slice:editor")!).state

        expect(edited.themeState.styles.light.radius).toBe("1.25rem")
        expect(edited.themeCheckpoint.preset).toBe("violet-bloom")
        expect(edited.themeCheckpoint.styles.light.radius).not.toBe("1.25rem")
        expect(edited.presetBaseline.preset).toBe("violet-bloom")
      })

      function seedThemeOnly(key: string, radius: string) {
        const themeState = {
          ...defaultThemeState,
          styles: {
            ...defaultThemeState.styles,
            light: { ...defaultThemeState.styles.light, radius },
          },
        }
        localStorage.setItem(
          key,
          JSON.stringify({
            state: { themeState },
            version: EDITOR_STATE_VERSION,
          })
        )
        return themeState
      }

      it("restore a checkpoint left out as the Theme", async () => {
        const themeState = seedThemeOnly(
          "checkpoint-restore:editor",
          defaultThemeState.styles.light.radius
        )

        await mount({ storageNamespace: "checkpoint-restore" })

        expect(useEditorStore.getState().themeCheckpoint).toEqual(themeState)
      })

      // A baseline equal to the Theme marks an untouched Preset, which
      // follows the Preset's current source.
      it("restore a baseline left out as the Theme", async () => {
        seedThemeOnly("baseline-restore:editor", "0.75rem")

        await mount({ storageNamespace: "baseline-restore" })

        expect(rootVar("--radius")).toBe(defaultThemeState.styles.light.radius)
      })
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

    it("shows the new mode on its control before the page is themed for it", async () => {
      await mount()
      await openThemer()
      // Records arrive in the order the DOM changed: the control's label
      // must change no later than the commit that themes the Host page, not
      // one commit behind it.
      const records: MutationRecord[] = []
      const observer = new MutationObserver((batch) => records.push(...batch))
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style", "aria-label"],
        subtree: true,
      })

      await act(async () => document.documentElement.classList.add("dark"))

      records.push(...observer.takeRecords())
      const changes = records
        .filter(
          (record) =>
            record.target === document.documentElement ||
            record.attributeName === "aria-label"
        )
        .map((record) =>
          record.attributeName === "aria-label"
            ? (record.target as Element).getAttribute("aria-label")
            : "page themed"
        )
      observer.disconnect()
      expect(rootVar("--primary")).toBe(DARK_PRIMARY)
      expect(changes[0]).toBe("Switch to light mode")
      expect(changes).toContain("page themed")
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

    describe("in a right-to-left Host", () => {
      beforeEach(() => {
        document.documentElement.dir = "rtl"
      })
      afterEach(() => {
        document.documentElement.removeAttribute("dir")
      })

      it("lays its UI out left-to-right and Host preview tabs in the Host's direction", async () => {
        await mount({ previewTabs: HOST_TABS })
        await openThemer()
        const direction = (element: Element | null | undefined) =>
          element?.closest("[dir]")?.getAttribute("dir")

        expect(
          direction(document.querySelector('[data-testid="themer-ui"]'))
        ).toBe("ltr")

        const hostTab = [
          ...document.querySelectorAll<HTMLElement>('[role="tab"]'),
        ].find((tab) => tab.textContent === "Host tab")
        await act(async () => hostTab?.click())

        expect(
          direction(document.querySelector('[data-testid="host-tab-content"]'))
        ).toBe("rtl")
      })
    })
  })

  describe("Host sidebar isolation", () => {
    function themerSidebarState() {
      return document
        .querySelector('[data-testid="themer-ui"] [data-slot="sidebar"]')
        ?.getAttribute("data-state")
    }

    it("collapses its sidebar without writing the Host's sidebar cookie", async () => {
      await mount()
      await openThemer()
      const cookieBefore = document.cookie

      await act(async () =>
        document
          .querySelector<HTMLElement>(
            '[data-testid="themer-ui"] [data-sidebar="trigger"]'
          )
          ?.click()
      )

      expect(themerSidebarState()).toBe("collapsed")
      expect(document.cookie).toBe(cookieBefore)
    })

    it("leaves Ctrl/Cmd+B in a Host textarea to the Host", async () => {
      const textarea = document.createElement("textarea")
      document.body.append(textarea)
      await mount()
      await openThemer()
      expect(themerSidebarState()).toBe("expanded")

      for (const modifier of ["metaKey", "ctrlKey"]) {
        const event = new KeyboardEvent("keydown", {
          key: "b",
          [modifier]: true,
          bubbles: true,
          cancelable: true,
        })
        await act(async () => textarea.dispatchEvent(event))

        expect(themerSidebarState()).toBe("expanded")
        expect(event.defaultPrevented).toBe(false)
      }
    })
  })

  describe("Sidebar Sync", () => {
    // violet-bloom's sidebar colours differ from their base twins, so the
    // sync changes it.
    const UNSYNCED_PRESET = "violet-bloom"

    function saveSidebarSync(namespace: string) {
      localStorage.setItem(
        `${namespace}:preferences`,
        JSON.stringify({
          state: { sidebarColorSync: true },
          version: PREFERENCES_VERSION,
        })
      )
    }

    function sidebarsOnBase(styles: ThemeStyles) {
      return (["light", "dark"] as const).every(
        (mode) =>
          styles[mode].sidebar === styles[mode].background &&
          styles[mode]["sidebar-primary"] === styles[mode].primary
      )
    }

    function presetTriggerLabel() {
      return document
        .querySelector('[data-testid="themer-preset-trigger"]')
        ?.textContent?.trim()
    }

    function resetButton() {
      const button = document.querySelector<HTMLButtonElement>(
        '[data-testid="themer-ui"] [aria-label="Reset to preset"]'
      )
      if (!button) throw new Error("Reset not rendered")
      return button
    }

    it("puts a Preset on in sync, with no unsaved mark and Reset disabled", async () => {
      saveSidebarSync("sync-preset")
      await mount({ storageNamespace: "sync-preset" })
      await openThemer()

      await act(async () =>
        useEditorStore.getState().applyThemePreset(UNSYNCED_PRESET)
      )

      expect(sidebarsOnBase(useEditorStore.getState().themeState.styles)).toBe(
        true
      )
      expect(presetTriggerLabel()).toBe("Violet Bloom")
      expect(resetButton().disabled).toBe(true)
    })

    it("saves a Preset put on in sync with one storage write", async () => {
      saveSidebarSync("sync-write")
      await mount({ storageNamespace: "sync-write" })
      const writes = stubLocalStorage()

      await act(async () =>
        useEditorStore.getState().applyThemePreset(UNSYNCED_PRESET)
      )

      expect(writes).toEqual(["sync-write:editor"])
      const saved = JSON.parse(localStorage.getItem("sync-write:editor")!)
      expect(sidebarsOnBase(saved.state.themeState.styles)).toBe(true)
    })

    it("keeps the checkpoint aligned with the Theme after an undo", async () => {
      await mount({ storageNamespace: "sync-undo" })
      await openThemer()
      await act(async () =>
        useEditorStore.getState().applyThemePreset(UNSYNCED_PRESET)
      )
      const toggle = document.querySelector<HTMLElement>(
        '[aria-label="Sync sidebar colors"]'
      )
      if (!toggle) throw new Error("Sidebar Sync toggle not rendered")
      await act(async () => toggle.click())

      // Back to the Preset as it was before the toggle: sync puts it on its
      // base colours again, and the HSL base (the checkpoint) with it.
      await act(async () => useEditorStore.getState().undo())

      const { themeState, themeCheckpoint } = useEditorStore.getState()
      expect(sidebarsOnBase(themeState.styles)).toBe(true)
      expect(themeCheckpoint?.styles).toEqual(themeState.styles)
      // A checkpoint equal to the Theme is not stored.
      expect(
        JSON.parse(localStorage.getItem("sync-undo:editor")!).state
      ).not.toHaveProperty("themeCheckpoint")
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
