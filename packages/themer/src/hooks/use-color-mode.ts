"use client"

// The light/dark mode, read from ColorModeProvider (components/color-mode.tsx,
// which holds the ownership contract). Kept here, below the components, so
// hooks read the mode without importing a component.
// - Outside a provider, useColorMode behaves as uncontrolled: the `.dark`
//   class on <html> is the mode, and a switch toggles it.

import * as React from "react"

import type { ThemeMode } from "../types"

export interface ColorModeValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const ColorModeContext = React.createContext<ColorModeValue | null>(null)

function subscribeToRootClass(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

function getRootClassMode(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function getServerMode(): ThemeMode {
  return "light"
}

/** Switch the mode by toggling the `.dark` class on <html>. */
export function setRootClassMode(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark")
}

/** The mode the `.dark` class on <html> says, following every toggle. */
export function useRootClassMode(): ThemeMode {
  return React.useSyncExternalStore(
    subscribeToRootClass,
    getRootClassMode,
    getServerMode
  )
}

/** The current light/dark mode and the function that switches it. */
export function useColorMode(): ColorModeValue {
  const context = React.use(ColorModeContext)
  const rootClassMode = useRootClassMode()
  return context ?? { mode: rootClassMode, setMode: setRootClassMode }
}
