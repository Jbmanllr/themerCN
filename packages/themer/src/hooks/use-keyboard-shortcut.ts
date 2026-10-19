"use client"

// Global keyboard shortcuts for the editor (the toggle, undo, redo; the
// preview area registers its inspector shortcut through the same hook).
//
// Rules the editor relies on:
// - A shortcut never fires while focus is in an input, a textarea or a
//   contenteditable element, so typing (and the field's own Ctrl+Z) is left
//   alone.
// - Shortcut strings are parsed by parseShortcut: modifier aliases are
//   mapped, and anything unknown makes the whole shortcut invalid (null).
// - "ctrl" also matches Cmd on macOS; a modifier that is pressed but not part
//   of the shortcut rejects the match (Ctrl+Shift+Z is not Ctrl+Z).
// - The window listener is added once per (shortcut, enabled) pair. Callers
//   pass fresh `modifiers` arrays and inline callbacks on every render (the
//   provider re-renders on every theme edit), so the effect is keyed on a
//   canonical signature string and the callback is read through
//   useEffectEvent instead of being a dependency.

import { useEffect, useEffectEvent } from "react"
import { SHORTCUTS } from "../config/constants"

type KeyModifier = "ctrl" | "alt" | "shift" | "meta"

const MODIFIER_ORDER: readonly KeyModifier[] = ["ctrl", "alt", "shift", "meta"]

// Hoisted constant to avoid recreation on each render
const EMPTY_MODIFIERS: KeyModifier[] = []

interface ShortcutOptions {
  /** Key to listen for (e.g., 't', 'z', 's') */
  key: string
  /** Modifiers required (e.g., ['ctrl', 'shift']) */
  modifiers?: readonly KeyModifier[]
  /** Callback to execute */
  callback: () => void
  /** Whether the shortcut is enabled */
  enabled?: boolean
  /** Prevent default browser behavior */
  preventDefault?: boolean
}

export interface ParsedShortcut {
  key: string
  modifiers: KeyModifier[]
}

/** The parts of a KeyboardEvent the matcher reads. */
export interface ShortcutKeyEvent {
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  target: EventTarget | null
}

/** Modifier names a shortcut string may use, and the modifier each means. */
const MODIFIER_NAMES: Readonly<Record<string, KeyModifier>> = {
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  shift: "shift",
  meta: "meta",
  cmd: "meta",
  command: "meta",
}

/**
 * Parse a shortcut string like "ctrl+shift+t" (case-insensitive) into key and
 * modifiers. `cmd`/`command` mean meta, `control` ctrl and `option` alt.
 * Returns null when the key is missing or any modifier is unknown, so a typo
 * can never leave a bare key behind.
 */
export function parseShortcut(shortcut: string): ParsedShortcut | null {
  const parts = shortcut.toLowerCase().split("+")
  const key = parts[parts.length - 1] ?? ""
  if (!key) return null

  const modifiers: KeyModifier[] = []
  for (const name of parts.slice(0, -1)) {
    const modifier = Object.hasOwn(MODIFIER_NAMES, name)
      ? MODIFIER_NAMES[name]
      : undefined
    if (!modifier) return null
    modifiers.push(modifier)
  }

  return { key, modifiers }
}

/**
 * Canonical string for a shortcut: lower-case, modifiers in a fixed order,
 * duplicates removed. Equal shortcuts give equal strings whatever array
 * identity or modifier order the caller used.
 */
export function shortcutSignature(
  key: string,
  modifiers: readonly KeyModifier[] = EMPTY_MODIFIERS
): string {
  const present = new Set(modifiers.map((m) => m.toLowerCase()))
  const ordered = MODIFIER_ORDER.filter((m) => present.has(m))
  return [...ordered, key.toLowerCase()].join("+")
}

function detectMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/u.test(navigator.platform)
  )
}

/** Whether the event comes from a field the user is typing in. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false
  const element = target as { tagName?: string; isContentEditable?: boolean }
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable === true
  )
}

/**
 * Whether a key event triggers the shortcut (key, required modifiers, and no
 * extra modifiers). Typing targets are rejected here too.
 */
export function matchesShortcut(
  event: ShortcutKeyEvent,
  shortcut: ParsedShortcut,
  isMac: boolean = detectMac()
): boolean {
  if (isEditableTarget(event.target)) return false
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false

  const ctrlRequired = shortcut.modifiers.includes("ctrl")
  const altRequired = shortcut.modifiers.includes("alt")
  const shiftRequired = shortcut.modifiers.includes("shift")
  const metaRequired = shortcut.modifiers.includes("meta")

  // On Mac, Cmd stands in for Ctrl.
  const ctrlOrMeta = isMac ? event.metaKey || event.ctrlKey : event.ctrlKey

  if (ctrlRequired && !ctrlOrMeta) return false
  if (altRequired && !event.altKey) return false
  if (shiftRequired && !event.shiftKey) return false
  if (metaRequired && !event.metaKey) return false

  // Extra modifiers that weren't required. Meta is not extra when the
  // shortcut asks for it, or on macOS when it stands in for ctrl.
  if (!ctrlRequired && event.ctrlKey) return false
  if (event.metaKey && !metaRequired && !(isMac && ctrlRequired)) {
    return false
  }
  if (!altRequired && event.altKey) return false
  if (!shiftRequired && event.shiftKey) return false

  return true
}

/**
 * Format a shortcut for display (platform-aware). On macOS "ctrl" shows as
 * ⌘, the key people press (Cmd matches "ctrl", see matchesShortcut).
 */
export function formatShortcut(shortcut: string): string {
  const isMac = detectMac()

  const symbols: Record<string, string> = {
    ctrl: isMac ? "⌘" : "Ctrl",
    alt: isMac ? "⌥" : "Alt",
    shift: isMac ? "⇧" : "Shift",
    meta: isMac ? "⌘" : "Win",
  }

  const parsed = parseShortcut(shortcut)
  if (!parsed) return shortcut
  const { key, modifiers } = parsed
  const modifierStr = modifiers
    .map((m) => symbols[m] || m)
    .join(isMac ? "" : "+")
  const keyStr = key.length === 1 ? key.toUpperCase() : key

  if (!modifierStr) return keyStr
  return isMac ? `${modifierStr}${keyStr}` : `${modifierStr}+${keyStr}`
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcut({
  key,
  modifiers = EMPTY_MODIFIERS,
  callback,
  enabled = true,
  preventDefault = true,
}: ShortcutOptions): void {
  const signature = shortcutSignature(key, modifiers)

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (preventDefault) event.preventDefault()
    callback()
  })

  useEffect(() => {
    // The signature only holds known modifier names, so it parses back.
    const shortcut = parseShortcut(signature)
    if (!enabled || !shortcut) return undefined

    const isMac = detectMac()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, shortcut, isMac)) onShortcut(event)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [signature, enabled])
}

/**
 * Hook for registering multiple keyboard shortcuts. The listener is re-added
 * whenever `shortcuts` changes identity: pass a memoised array.
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutOptions[],
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return undefined

    const isMac = detectMac()
    const parsed = shortcuts.map((options) => ({
      options,
      shortcut: {
        key: options.key,
        modifiers: [...(options.modifiers ?? EMPTY_MODIFIERS)],
      },
    }))

    const masterHandler = (event: KeyboardEvent) => {
      for (const { options, shortcut } of parsed) {
        if (options.enabled === false) continue
        if (!matchesShortcut(event, shortcut, isMac)) continue
        if (options.preventDefault !== false) event.preventDefault()
        options.callback()
      }
    }

    window.addEventListener("keydown", masterHandler)
    return () => window.removeEventListener("keydown", masterHandler)
  }, [shortcuts, enabled])
}

/**
 * Key and modifiers of every shortcut in SHORTCUTS (config/constants.ts),
 * the single definition. The provider registers `undo` and `redo` from here
 * and the preview registers `inspector`; the toggle the provider binds is
 * ThemerConfig.shortcut, whose default is `toggle`.
 */
export const themerShortcuts = parseDefinitions(SHORTCUTS)

function parseDefinitions<T extends Record<string, string>>(
  definitions: T
): { readonly [Name in keyof T]: ParsedShortcut } {
  const parsed = {} as { [Name in keyof T]: ParsedShortcut }
  for (const [name, definition] of Object.entries(definitions)) {
    const shortcut = parseShortcut(definition)
    if (!shortcut) throw new Error(`Invalid shortcut definition: ${name}`)
    parsed[name as keyof T] = shortcut
  }
  return parsed
}
