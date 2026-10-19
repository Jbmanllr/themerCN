"use client"

// Who owns light/dark. `<Themer>` passes its `colorMode` and
// `onColorModeChange` props here.
//
// Contract:
// - Controlled (either prop set): the mode is `colorMode` and a switch calls
//   `onColorModeChange`; the Host sets the `.dark` class. Until the Host
//   knows its mode (`colorMode` undefined), the mode is read from the class.
// - Uncontrolled: the `.dark` class on <html> is the mode. A switch toggles
//   it, and a MutationObserver follows toggles made by the Host app or anyone
//   else. The mode is saved under `storageKey` (`<ns>:color-mode`) so the
//   head script restores the class before the first paint of a reload.
// - Controlled: nothing is saved and a saved mode is removed, so the head
//   script leaves the Host app's class alone.
// - Outside a provider, useColorMode (hooks/use-color-mode.ts) behaves as
//   uncontrolled.

import * as React from "react"

import {
  ColorModeContext,
  setRootClassMode,
  useRootClassMode,
} from "../hooks/use-color-mode"
import type { ThemerColorMode } from "../types"

const noop = () => {}

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
  const controlled = colorMode !== undefined || onColorModeChange !== undefined
  const mode = controlled ? (colorMode ?? rootClassMode) : rootClassMode
  const setMode = controlled ? (onColorModeChange ?? noop) : setRootClassMode

  React.useEffect(() => {
    if (!storageKey) return
    try {
      if (controlled) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, rootClassMode)
    } catch {
      // Storage unavailable: the reload paints the Host's own mode.
    }
  }, [controlled, rootClassMode, storageKey])

  const value = React.useMemo(() => ({ mode, setMode }), [mode, setMode])

  return <ColorModeContext value={value}>{children}</ColorModeContext>
}
