// The editor's provider re-renders on every theme edit and passes a fresh
// `modifiers` array and inline callbacks each time. These tests pin that the
// window listener is not re-added for that, that the latest callback still
// runs, and the matching rules (typing targets, extra modifiers, Cmd on Mac).
//
// This file runs in vitest's default node environment (no DOM), so a tiny
// hook runner stands in for React: it runs effects when their deps change
// (cleanup first) and gives useEffectEvent the latest function, like React
// does.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Cleanup = (() => void) | undefined
const runner = vi.hoisted(() => {
  const state = {
    slot: 0,
    effects: [] as { deps: unknown[]; cleanup: Cleanup }[],
    events: [] as { current: (...args: never[]) => unknown }[],
  }
  return state
})

vi.mock("react", () => ({
  useEffect(effect: () => Cleanup, deps: unknown[]) {
    const index = runner.slot++
    const previous = runner.effects[index]
    if (
      previous &&
      previous.deps.length === deps.length &&
      previous.deps.every((dep, i) => Object.is(dep, deps[i]))
    ) {
      return
    }
    if (typeof previous?.cleanup === "function") previous.cleanup()
    runner.effects[index] = { deps, cleanup: effect() ?? undefined }
  },
  useEffectEvent<T extends (...args: never[]) => unknown>(fn: T) {
    const index = runner.slot++
    const ref = (runner.events[index] ??= { current: fn })
    ref.current = fn
    return ((...args: Parameters<T>) => ref.current(...args)) as T
  },
}))

import { SHORTCUTS } from "../config/constants"
import {
  matchesShortcut,
  parseShortcut,
  themerShortcuts,
  shortcutSignature,
  useKeyboardShortcut,
  type ShortcutKeyEvent,
} from "./use-keyboard-shortcut"

type Listener = (event: KeyboardEvent) => void
let listeners: Set<Listener>
let added: number

// Called outside React on purpose (the runner above plays React's part).
const callHook = useKeyboardShortcut

function render(props: Parameters<typeof useKeyboardShortcut>[0]) {
  runner.slot = 0
  callHook(props)
}

function unmount() {
  for (const effect of runner.effects) {
    if (typeof effect?.cleanup === "function") effect.cleanup()
  }
  runner.effects = []
  runner.events = []
}

function press(event: Partial<ShortcutKeyEvent>) {
  const full = {
    key: "",
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    target: null,
    preventDefault: vi.fn(),
    ...event,
  }
  for (const listener of listeners) listener(full as unknown as KeyboardEvent)
  return full
}

beforeEach(() => {
  listeners = new Set()
  added = 0
  vi.stubGlobal("navigator", { platform: "Linux x86_64" })
  vi.stubGlobal("window", {
    addEventListener: (_type: string, listener: Listener) => {
      added++
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: Listener) => {
      listeners.delete(listener)
    },
  })
})

afterEach(() => {
  unmount()
  vi.unstubAllGlobals()
})

describe("useKeyboardShortcut listener", () => {
  it("adds one listener across re-renders with fresh arrays and callbacks", () => {
    const calls: string[] = []
    for (let i = 0; i < 5; i++) {
      render({
        key: "t",
        modifiers: ["ctrl", "shift"],
        callback: () => calls.push(`render ${i}`),
      })
    }
    expect(added).toBe(1)
    expect(listeners.size).toBe(1)

    press({ key: "T", ctrlKey: true, shiftKey: true })
    expect(calls).toEqual(["render 4"])
  })

  it("removes the listener while disabled and re-adds it when enabled", () => {
    const callback = vi.fn()
    render({ key: "z", modifiers: ["ctrl"], callback, enabled: true })
    render({ key: "z", modifiers: ["ctrl"], callback, enabled: false })
    expect(listeners.size).toBe(0)
    press({ key: "z", ctrlKey: true })
    expect(callback).not.toHaveBeenCalled()

    render({ key: "z", modifiers: ["ctrl"], callback, enabled: true })
    expect(listeners.size).toBe(1)
    const event = press({ key: "z", ctrlKey: true })
    expect(callback).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it("swaps the listener when the shortcut itself changes", () => {
    const callback = vi.fn()
    render({ key: "t", modifiers: ["ctrl", "shift"], callback })
    render({ key: "k", modifiers: ["ctrl"], callback })
    expect(listeners.size).toBe(1)
    press({ key: "t", ctrlKey: true, shiftKey: true })
    expect(callback).not.toHaveBeenCalled()
    press({ key: "k", ctrlKey: true })
    expect(callback).toHaveBeenCalledOnce()
  })
})

describe("shortcut matching", () => {
  const undo = parseShortcut("ctrl+z")
  const redo = parseShortcut("ctrl+shift+z")
  const base = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    target: null,
  }

  it("gives equal signatures for equal shortcuts", () => {
    expect(shortcutSignature("T", ["shift", "ctrl"])).toBe(
      shortcutSignature("t", ["ctrl", "shift"])
    )
  })

  it("ignores typing targets", () => {
    for (const target of [
      { tagName: "INPUT" },
      { tagName: "TEXTAREA" },
      { tagName: "DIV", isContentEditable: true },
    ]) {
      expect(
        matchesShortcut(
          { ...base, key: "z", ctrlKey: true, target: target as never },
          undo,
          false
        )
      ).toBe(false)
    }
  })

  it("rejects extra modifiers, so redo is not undo", () => {
    const event = { ...base, key: "z", ctrlKey: true, shiftKey: true }
    expect(matchesShortcut(event, undo, false)).toBe(false)
    expect(matchesShortcut(event, redo, false)).toBe(true)
  })

  it("accepts Cmd for ctrl on macOS only", () => {
    const event = { ...base, key: "z", metaKey: true }
    expect(matchesShortcut(event, undo, true)).toBe(true)
    expect(matchesShortcut(event, undo, false)).toBe(false)
  })

  it("matches a meta shortcut on every platform", () => {
    const event = { ...base, key: "k", metaKey: true }
    expect(matchesShortcut(event, parseShortcut("meta+k"), true)).toBe(true)
    expect(matchesShortcut(event, parseShortcut("meta+k"), false)).toBe(true)
  })

  it("rejects an extra Meta off macOS", () => {
    const event = { ...base, key: "z", ctrlKey: true, metaKey: true }
    expect(matchesShortcut(event, undo, false)).toBe(false)
  })
})

describe("the default toggle shortcut", () => {
  // Combinations Chrome, Safari and Edge handle before the page sees them (or
  // that open a window or tab), on macOS with Cmd standing in for ctrl and on
  // Windows or Linux with Ctrl.
  const RESERVED = [
    "ctrl+t",
    "ctrl+n",
    "ctrl+w",
    "ctrl+q",
    "ctrl+shift+t",
    "ctrl+shift+n",
    "ctrl+shift+w",
    "ctrl+shift+q",
    "ctrl+shift+tab",
    "ctrl+tab",
  ]

  it("is not browser-reserved and uses no Option or Alt", () => {
    const toggle = parseShortcut(SHORTCUTS.toggle)
    expect(RESERVED).not.toContain(
      shortcutSignature(toggle.key, toggle.modifiers)
    )
    expect(toggle.modifiers).not.toContain("alt")
    expect(toggle.modifiers.length).toBeGreaterThan(0)
  })

  it("is the one the provider registers", () => {
    expect(themerShortcuts.toggle).toEqual(parseShortcut(SHORTCUTS.toggle))
  })
})
