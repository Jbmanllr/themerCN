"use client"

// Who owns light/dark. `<Themer>` passes its `colorMode` and
// `onColorModeChange` props here.
//
// Contract:
// - Controlled (either prop set): the mode is `colorMode` and a switch calls
//   `onColorModeChange`; the Host sets the `.dark` class. Until the Host
//   knows its mode (`colorMode` undefined), the mode is read from the class.
// - Uncontrolled: the `.dark` class on <html> is the mode. A switch toggles
//   it and re-renders the provider at once; a MutationObserver follows
//   toggles made by the Host app or anyone else. The mode is saved under `storageKey` (`<ns>:color-mode`) so the
//   head script restores the class before the first paint of a reload.
// - Controlled: nothing is saved and a saved mode is removed, so the head
//   script leaves the Host app's class alone.
// - The key is written only when the mode differs from what is stored, and
//   removed only when an entry exists. What is stored comes from the head
//   script's record on `window[COLOR_MODE_RECORD]` (no storage read), kept
//   current by each write here; with no record (no head script, or a
//   namespace it never saw) the key is written or removed once.
// - Outside a provider, useColorMode (hooks/use-color-mode.ts) behaves as
//   uncontrolled.

import * as React from "react"

import { COLOR_MODE_RECORD } from "../config/constants"
import {
  ColorModeContext,
  setRootClassMode,
  useRootClassMode,
} from "../hooks/use-color-mode"
import type { ThemerColorMode } from "../types"

const noop = () => {}

/** The stored colour mode per key, as the head script read it (null when
 *  nothing is saved) and as this provider wrote it since. */
function colourModeRecord(): Record<string, string | null> {
  const host = window as unknown as Record<
    string,
    Record<string, string | null> | undefined
  >
  return (host[COLOR_MODE_RECORD] ??= {})
}

export function ColorModeProvider({
  children,
  colorMode,
  onColorModeChange,
  storageKey,
}: {
  children: React.ReactNode
  colorMode?: ThemerColorMode
  onColorModeChange?: (mode: ThemerColorMode) => void
  /** Where an uncontrolled mode is saved for the head script. */
  storageKey?: string
}) {
  const rootClassMode = useRootClassMode()
  // An uncontrolled switch re-renders this provider at once, rather than on
  // the class observer's later callback, so the mode reaches its readers in
  // the same commit as the switch (inside the reveal's synchronous update).
  const [, rerender] = React.useReducer((count: number) => count + 1, 0)
  const switchRootClassMode = React.useCallback((next: ThemerColorMode) => {
    setRootClassMode(next)
    rerender()
  }, [])
  const controlled = colorMode !== undefined || onColorModeChange !== undefined
  const mode = controlled ? (colorMode ?? rootClassMode) : rootClassMode
  const setMode = controlled ? (onColorModeChange ?? noop) : switchRootClassMode

  React.useEffect(() => {
    if (!storageKey) return
    const record = colourModeRecord()
    const next = controlled ? null : rootClassMode
    if (record[storageKey] === next) return
    try {
      if (next === null) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, next)
      record[storageKey] = next
    } catch {
      // Storage unavailable: the reload paints the Host's own mode.
    }
  }, [controlled, rootClassMode, storageKey])

  const value = React.useMemo(() => ({ mode, setMode }), [mode, setMode])

  return <ColorModeContext value={value}>{children}</ColorModeContext>
}
